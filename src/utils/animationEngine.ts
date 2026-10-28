import {
  LayerItem,
  Project,
  Keyframe,
  AnimationTrack,
  AnimProperty,
  AnimationProjectData,
  ParentRelationship,
  LayerGroup,
} from '../types/canvas';

export interface InterpolatedLayerState {
  layerId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // in radians
  opacity: number; // 0 to 1
  visibility: boolean;
  worldMatrix: [number, number, number, number, number, number]; // 2D Affine Matrix [a, b, c, d, e, f]
}

/**
 * Calculate natural center pivot for a layer based on its drawn artwork bounding boxes
 */
export function getLayerPivot(layer?: LayerItem): { x: number; y: number } {
  if (!layer || !layer.items || layer.items.length === 0) {
    return { x: 0, y: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const item of layer.items) {
    if (item.boundingBox) {
      const tfX = item.transform ? item.transform.x : 0;
      const tfY = item.transform ? item.transform.y : 0;
      minX = Math.min(minX, item.boundingBox.minX + tfX);
      minY = Math.min(minY, item.boundingBox.minY + tfY);
      maxX = Math.max(maxX, item.boundingBox.maxX + tfX);
      maxY = Math.max(maxY, item.boundingBox.maxY + tfY);
    }
  }
  if (minX !== Infinity && maxX !== -Infinity) {
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }
  return { x: 0, y: 0 };
}

/**
 * Interpolate value between two keyframes
 */
export function interpolateValue(
  k1: Keyframe,
  k2: Keyframe,
  frame: number
): number {
  if (k1.frame === k2.frame) return k1.value;
  const range = k2.frame - k1.frame;
  const progress = Math.max(0, Math.min(1, (frame - k1.frame) / range));

  // Easing calculations
  let t = progress;
  if (k1.easing === 'easeIn') {
    t = progress * progress;
  } else if (k1.easing === 'easeOut') {
    t = progress * (2 - progress);
  } else if (k1.easing === 'easeInOut') {
    t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
  } else if (k1.easing === 'cubic') {
    t = progress * progress * (3 - 2 * progress);
  }

  return k1.value + (k2.value - k1.value) * t;
}

/**
 * Evaluate property value at specific frame
 */
export function getPropertyValueAtFrame(
  keyframes: Keyframe[],
  frame: number,
  defaultValue: number
): number {
  if (!keyframes || keyframes.length === 0) return defaultValue;

  // Sort keyframes by frame number
  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);

  if (frame <= sorted[0].frame) return sorted[0].value;
  if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (frame >= k1.frame && frame <= k2.frame) {
      return interpolateValue(k1, k2, frame);
    }
  }

  return defaultValue;
}

/**
 * Compute local animated transform properties for a layer at given frame
 */
export function getLocalLayerStateAtFrame(
  layer: LayerItem,
  tracks: AnimationTrack[],
  frame: number
): {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  visibility: boolean;
} {
  const layerTracks = tracks.filter((t) => t.layerId === layer.id);

  const posXTrack = layerTracks.find((t) => t.property === 'positionX');
  const posYTrack = layerTracks.find((t) => t.property === 'positionY');
  const scaleXTrack = layerTracks.find((t) => t.property === 'scaleX');
  const scaleYTrack = layerTracks.find((t) => t.property === 'scaleY');
  const rotTrack = layerTracks.find((t) => t.property === 'rotation');
  const opacityTrack = layerTracks.find((t) => t.property === 'opacity');
  const visTrack = layerTracks.find((t) => t.property === 'visibility');

  const x = getPropertyValueAtFrame(posXTrack?.keyframes || [], frame, 0);
  const y = getPropertyValueAtFrame(posYTrack?.keyframes || [], frame, 0);
  const scaleX = getPropertyValueAtFrame(scaleXTrack?.keyframes || [], frame, 1);
  const scaleY = getPropertyValueAtFrame(scaleYTrack?.keyframes || [], frame, 1);
  const rotation = getPropertyValueAtFrame(rotTrack?.keyframes || [], frame, 0);
  const opacity = Math.max(0, Math.min(1, getPropertyValueAtFrame(opacityTrack?.keyframes || [], frame, layer.opacity)));
  const visVal = getPropertyValueAtFrame(visTrack?.keyframes || [], frame, layer.visible ? 1 : 0);
  const visibility = visVal > 0.5 && layer.visible;

  return { x, y, scaleX, scaleY, rotation, opacity, visibility };
}

/**
 * Combine local 2D affine transform matrix with parent matrix
 */
export function multiplyMatrices(
  m1: [number, number, number, number, number, number],
  m2: [number, number, number, number, number, number]
): [number, number, number, number, number, number] {
  // m1 * m2
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/**
 * Build 2D affine matrix for local transform around a pivot point
 */
export function createLocalMatrix(
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  rotation: number,
  pivotX: number = 0,
  pivotY: number = 0
): [number, number, number, number, number, number] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const a = cos * scaleX;
  const b = sin * scaleX;
  const c = -sin * scaleY;
  const d = cos * scaleY;

  const e = x + pivotX - (a * pivotX + c * pivotY);
  const f = y + pivotY - (b * pivotX + d * pivotY);

  return [a, b, c, d, e, f];
}

/**
 * Compute final world transform matrix for all layers at current frame considering parent-child hierarchy
 */
export function computeAllLayerStatesAtFrame(
  layers: LayerItem[],
  animationData: AnimationProjectData,
  targetFrame?: number
): Map<string, InterpolatedLayerState> {
  const resultMap = new Map<string, InterpolatedLayerState>();
  const frame = targetFrame !== undefined ? targetFrame : animationData.currentFrame;
  const tracks = animationData.tracks || [];
  const parents = animationData.parentRelationships || [];

  // Map parent relationships
  const parentMap = new Map<string, string>();
  for (const rel of parents) {
    parentMap.set(rel.childLayerId, rel.parentLayerId);
  }

  // Compute local states
  const localStates = new Map<string, ReturnType<typeof getLocalLayerStateAtFrame>>();
  for (const layer of layers) {
    localStates.set(layer.id, getLocalLayerStateAtFrame(layer, tracks, frame));
  }

  // Recursive matrix resolution
  function getWorldMatrix(layerId: string): [number, number, number, number, number, number] {
    const layer = layers.find((l) => l.id === layerId);
    const local = localStates.get(layerId) || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, visibility: true };
    const pivot = getLayerPivot(layer);
    const localMatrix = createLocalMatrix(local.x, local.y, local.scaleX, local.scaleY, local.rotation, pivot.x, pivot.y);

    const parentId = parentMap.get(layerId) || layer?.parentId;
    if (!parentId || parentId === layerId) {
      return localMatrix;
    }

    const parentWorldMatrix = getWorldMatrix(parentId);
    return multiplyMatrices(parentWorldMatrix, localMatrix);
  }

  // Populate results
  for (const layer of layers) {
    const local = localStates.get(layer.id) || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, visibility: true };
    const worldMatrix = getWorldMatrix(layer.id);

    resultMap.set(layer.id, {
      layerId: layer.id,
      x: local.x,
      y: local.y,
      scaleX: local.scaleX,
      scaleY: local.scaleY,
      rotation: local.rotation,
      opacity: local.opacity,
      visibility: local.visibility,
      worldMatrix,
    });
  }

  return resultMap;
}

/**
 * Add or update a keyframe for a layer property at a specific frame
 */
export function setKeyframeValue(
  tracks: AnimationTrack[],
  layerId: string,
  property: AnimProperty,
  frame: number,
  value: number,
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'cubic' = 'easeInOut'
): AnimationTrack[] {
  const track = tracks.find((t) => t.layerId === layerId && t.property === property);
  if (track) {
    const existingIndex = track.keyframes.findIndex((k) => k.frame === frame);
    let newKeyframes: Keyframe[];
    if (existingIndex >= 0) {
      newKeyframes = track.keyframes.map((k, idx) =>
        idx === existingIndex ? { ...k, value, easing } : k
      );
    } else {
      newKeyframes = [
        ...track.keyframes,
        {
          id: `kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          frame,
          value,
          easing,
        },
      ].sort((a, b) => a.frame - b.frame);
    }
    return tracks.map((t) => (t.id === track.id ? { ...t, keyframes: newKeyframes } : t));
  } else {
    const newTrack: AnimationTrack = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      layerId,
      property,
      keyframes: [
        {
          id: `kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          frame,
          value,
          easing,
        },
      ],
    };
    return [...tracks, newTrack];
  }
}

/**
 * Remove keyframe from a layer property at a specific frame
 */
export function removeKeyframeAtFrame(
  tracks: AnimationTrack[],
  layerId: string,
  property: AnimProperty,
  frame: number
): AnimationTrack[] {
  return tracks.map((t) => {
    if (t.layerId === layerId && t.property === property) {
      return {
        ...t,
        keyframes: t.keyframes.filter((k) => k.frame !== frame),
      };
    }
    return t;
  });
}

/**
 * Query if a keyframe exists at a specific frame
 */
export function getKeyframeAtFrame(
  tracks: AnimationTrack[],
  layerId: string,
  property: AnimProperty,
  frame: number
): Keyframe | undefined {
  const track = tracks.find((t) => t.layerId === layerId && t.property === property);
  return track?.keyframes.find((k) => k.frame === frame);
}
