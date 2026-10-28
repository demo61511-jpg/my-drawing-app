import { LayerItem, LayerFrame, CanvasItem, TransformState } from '../types/canvas';

/**
 * Ensures a layer has a properly structured frames dictionary.
 * If empty, frame 0 is automatically initialized as a keyframe containing the layer's current items.
 */
export function ensureLayerFrames(layer: LayerItem): Record<number, LayerFrame> {
  if (layer.frames && Object.keys(layer.frames).length > 0) {
    return { ...layer.frames };
  }

  const initialItems: CanvasItem[] = layer.items ? JSON.parse(JSON.stringify(layer.items)) : [];
  return {
    0: {
      id: `kf_0_${Date.now()}`,
      frame: 0,
      type: 'keyframe',
      items: initialItems,
      hasClassicTween: false,
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        pivotX: 0,
        pivotY: 0,
      },
    },
  };
}

/**
 * Returns the effective items to render for a given layer at a given frame,
 * accounting for keyframe spans, blank frames, and classic tween interpolation.
 */
export function getEffectiveLayerItems(layer: LayerItem, frame: number): CanvasItem[] {
  if (!layer.frames || Object.keys(layer.frames).length === 0) {
    return layer.items || [];
  }

  const allFrames = Object.values(layer.frames).sort((a, b) => a.frame - b.frame);
  if (allFrames.length === 0) {
    return layer.items || [];
  }

  // Keyframes and Blank keyframes at or before current frame
  const preceding = allFrames.filter((f) => f.frame <= frame && (f.type === 'keyframe' || f.type === 'blank'));
  
  // If frame is before the first keyframe, return blank
  if (preceding.length === 0) {
    // If the first frame is at 0 or later
    const first = allFrames.find((f) => f.type === 'keyframe' || f.type === 'blank');
    if (first && first.frame === 0) {
      return first.type === 'blank' ? [] : (first.items || []);
    }
    return [];
  }

  const activeKf = preceding[preceding.length - 1];

  // If blank keyframe, no artwork is drawn
  if (activeKf.type === 'blank') {
    return [];
  }

  const baseItems = activeKf.items || [];

  // Check for Classic Tween
  if (activeKf.hasClassicTween) {
    // Find the next keyframe
    const nextKf = allFrames.find((f) => f.frame > activeKf.frame && (f.type === 'keyframe' || f.type === 'blank'));
    if (nextKf && nextKf.frame > activeKf.frame) {
      const totalSpan = nextKf.frame - activeKf.frame;
      const progress = Math.max(0, Math.min(1, (frame - activeKf.frame) / totalSpan));

      const nextItems = nextKf.items || [];

      const startTf: TransformState = activeKf.transform || {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        pivotX: 0,
        pivotY: 0,
      };

      const endTf: TransformState = nextKf.transform || {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        pivotX: 0,
        pivotY: 0,
      };

      const kfDeltaX = (endTf.x - startTf.x) * progress;
      const kfDeltaY = (endTf.y - startTf.y) * progress;
      const kfDeltaScaleX = 1 + (endTf.scaleX - startTf.scaleX) * progress;
      const kfDeltaScaleY = 1 + (endTf.scaleY - startTf.scaleY) * progress;
      const kfDeltaRot = (endTf.rotation - startTf.rotation) * progress;

      // Apply smooth interpolation between items of activeKf (e.g. default keyframe) and nextKf (transformed keyframe)
      return baseItems.map((itemA, idx) => {
        const itemB = nextItems.find((it) => it.id === itemA.id) || nextItems[idx];
        const tfA = itemA.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 };
        const tfB = itemB ? itemB.transform || tfA : tfA;

        const interX = tfA.x + (tfB.x - tfA.x) * progress + kfDeltaX;
        const interY = tfA.y + (tfB.y - tfA.y) * progress + kfDeltaY;
        const interScaleX = (tfA.scaleX + (tfB.scaleX - tfA.scaleX) * progress) * (kfDeltaScaleX || 1);
        const interScaleY = (tfA.scaleY + (tfB.scaleY - tfA.scaleY) * progress) * (kfDeltaScaleY || 1);
        const interRot = tfA.rotation + (tfB.rotation - tfA.rotation) * progress + kfDeltaRot;

        let interpolatedBoundingBox = itemA.boundingBox;
        if (itemA.boundingBox && itemB?.boundingBox) {
          interpolatedBoundingBox = {
            minX: itemA.boundingBox.minX + (itemB.boundingBox.minX - itemA.boundingBox.minX) * progress + kfDeltaX,
            minY: itemA.boundingBox.minY + (itemB.boundingBox.minY - itemA.boundingBox.minY) * progress + kfDeltaY,
            maxX: itemA.boundingBox.maxX + (itemB.boundingBox.maxX - itemA.boundingBox.maxX) * progress + kfDeltaX,
            maxY: itemA.boundingBox.maxY + (itemB.boundingBox.maxY - itemA.boundingBox.maxY) * progress + kfDeltaY,
          };
        }

        return {
          ...itemA,
          transform: {
            ...tfA,
            x: interX,
            y: interY,
            scaleX: interScaleX,
            scaleY: interScaleY,
            rotation: interRot,
          },
          boundingBox: interpolatedBoundingBox,
        };
      });
    }
  }

  return baseItems;
}

/**
 * Insert Keyframe (F6 in Adobe Animate):
 * Duplicates artwork from previous keyframe and places an explicit keyframe at target frame.
 */
export function insertKeyframeAt(layer: LayerItem, frame: number): LayerItem {
  const frames = ensureLayerFrames(layer);
  const effectiveItems = getEffectiveLayerItems(layer, frame);
  const clonedItems: CanvasItem[] = JSON.parse(JSON.stringify(effectiveItems));

  frames[frame] = {
    id: `kf_${frame}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    frame,
    type: 'keyframe',
    items: clonedItems,
    hasClassicTween: false,
    transform: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      pivotX: 0,
      pivotY: 0,
    },
  };

  return {
    ...layer,
    frames,
    items: clonedItems,
  };
}

/**
 * Insert Blank Keyframe (F7 in Adobe Animate):
 * Creates an empty keyframe where new artwork can be drawn from scratch.
 */
export function insertBlankKeyframeAt(layer: LayerItem, frame: number): LayerItem {
  const frames = ensureLayerFrames(layer);

  frames[frame] = {
    id: `bkf_${frame}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    frame,
    type: 'blank',
    items: [],
    hasClassicTween: false,
    transform: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      pivotX: 0,
      pivotY: 0,
    },
  };

  return {
    ...layer,
    frames,
    items: [],
  };
}

/**
 * Insert Frame (F5 in Adobe Animate):
 * Extends exposure of previous keyframe and shifts all subsequent keyframes to the right by 1.
 */
export function insertFrameAt(layer: LayerItem, frame: number): LayerItem {
  const frames = ensureLayerFrames(layer);
  const newFrames: Record<number, LayerFrame> = {};

  // Shift any keyframes at or after frame to the right
  Object.keys(frames)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((f) => {
      const kf = frames[f];
      if (f >= frame) {
        newFrames[f + 1] = {
          ...kf,
          frame: f + 1,
        };
      } else {
        newFrames[f] = kf;
      }
    });

  // Create an extended frame marker at target frame
  newFrames[frame] = {
    id: `ext_${frame}_${Date.now()}`,
    frame,
    type: 'extended',
  };

  return {
    ...layer,
    frames: newFrames,
  };
}

/**
 * Delete Frame (Shift+F5 in Adobe Animate):
 * Deletes frame cell and shifts subsequent frames to the left by 1.
 */
export function deleteFrameAt(layer: LayerItem, frame: number): LayerItem {
  const frames = ensureLayerFrames(layer);
  const newFrames: Record<number, LayerFrame> = {};

  Object.keys(frames)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((f) => {
      const kf = frames[f];
      if (f === frame) {
        // Drop this frame
      } else if (f > frame) {
        newFrames[f - 1] = {
          ...kf,
          frame: f - 1,
        };
      } else {
        newFrames[f] = kf;
      }
    });

  // Ensure frame 0 always exists
  if (!newFrames[0]) {
    newFrames[0] = {
      id: `kf_0_${Date.now()}`,
      frame: 0,
      type: 'keyframe',
      items: [],
      hasClassicTween: false,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 },
    };
  }

  const updatedLayer = { ...layer, frames: newFrames };
  updatedLayer.items = getEffectiveLayerItems(updatedLayer, frame);
  return updatedLayer;
}

/**
 * Delete / Clear Keyframe (Shift+F6 in Adobe Animate):
 * Converts keyframe at target frame into an extended frame, inheriting from previous keyframe.
 */
export function deleteKeyframeAt(layer: LayerItem, frame: number): LayerItem {
  const frames = ensureLayerFrames(layer);

  if (frame === 0) {
    // If clearing frame 0, empty its artwork
    frames[0] = {
      ...frames[0],
      items: [],
      type: 'blank',
      hasClassicTween: false,
    };
  } else {
    // Remove the keyframe, so it reverts to an extended frame
    delete frames[frame];
  }

  const updatedLayer = { ...layer, frames };
  updatedLayer.items = getEffectiveLayerItems(updatedLayer, frame);
  return updatedLayer;
}

/**
 * Copy Frame (Ctrl+Alt+C in Adobe Animate):
 * Deep clones the keyframe or effective artwork at target frame.
 */
export function copyFrameAt(layer: LayerItem, frame: number): LayerFrame {
  const effectiveItems = getEffectiveLayerItems(layer, frame);
  const clonedItems: CanvasItem[] = JSON.parse(JSON.stringify(effectiveItems));

  const existingKf = layer.frames ? layer.frames[frame] : undefined;

  return {
    id: `copied_frame_${Date.now()}`,
    frame,
    type: existingKf ? existingKf.type : 'keyframe',
    items: clonedItems,
    hasClassicTween: Boolean(existingKf?.hasClassicTween),
    transform: existingKf?.transform
      ? { ...existingKf.transform }
      : { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 },
  };
}

/**
 * Paste Frame (Ctrl+Alt+V in Adobe Animate):
 * Pastes clipboard frame into target frame as a new keyframe.
 */
export function pasteFrameAt(layer: LayerItem, frame: number, copiedFrame: LayerFrame): LayerItem {
  const frames = ensureLayerFrames(layer);
  const clonedItems: CanvasItem[] = JSON.parse(JSON.stringify(copiedFrame.items || []));

  frames[frame] = {
    id: `kf_${frame}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    frame,
    type: copiedFrame.type === 'blank' ? 'blank' : 'keyframe',
    items: clonedItems,
    hasClassicTween: Boolean(copiedFrame.hasClassicTween),
    transform: copiedFrame.transform
      ? { ...copiedFrame.transform }
      : { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 },
  };

  return {
    ...layer,
    frames,
    items: clonedItems,
  };
}

/**
 * Toggle Classic Tween (Classic Twine):
 * Toggles classic tween on the keyframe spanning at or before target frame.
 */
export function toggleClassicTweenAt(layer: LayerItem, frame: number): LayerItem {
  const frames = ensureLayerFrames(layer);
  const allKfs = Object.values(frames)
    .filter((f) => f.type === 'keyframe')
    .sort((a, b) => a.frame - b.frame);

  // Find preceding keyframe
  const targetKf = allKfs.filter((f) => f.frame <= frame).pop();
  if (!targetKf) return layer;

  const newTweenState = !targetKf.hasClassicTween;

  frames[targetKf.frame] = {
    ...targetKf,
    hasClassicTween: newTweenState,
  };

  // If turning ON classic tween and no next keyframe exists, create an end keyframe 12 frames later
  if (newTweenState) {
    const nextKf = allKfs.find((f) => f.frame > targetKf.frame);
    if (!nextKf) {
      const endFrameNum = targetKf.frame + 12;
      const endClonedItems: CanvasItem[] = JSON.parse(JSON.stringify(targetKf.items || []));
      // Give the end keyframe a noticeable default offset so the user immediately sees the motion!
      frames[endFrameNum] = {
        id: `kf_${endFrameNum}_${Date.now()}`,
        frame: endFrameNum,
        type: 'keyframe',
        items: endClonedItems,
        hasClassicTween: false,
        transform: {
          x: 60,
          y: 0,
          scaleX: 1.1,
          scaleY: 1.1,
          rotation: 0.1,
          pivotX: 0,
          pivotY: 0,
        },
      };
    }
  }

  const updatedLayer = { ...layer, frames };
  updatedLayer.items = getEffectiveLayerItems(updatedLayer, frame);
  return updatedLayer;
}

/**
 * Commits drawing / erasing items on active layer at current frame.
 * AUTO-KEYFRAME IS OFF: Only updates existing explicit keyframe if present at target frame,
 * or updates the preceding active keyframe spanning this frame without auto-inserting a new keyframe.
 */
export function updateLayerArtworkAtFrame(
  layer: LayerItem,
  frame: number,
  newItems: CanvasItem[]
): LayerItem {
  // If layer is locked, cannot modify!
  if (layer.locked) {
    return layer;
  }

  const frames = ensureLayerFrames(layer);

  // If there's an existing explicit keyframe at this exact frame, update it
  if (frames[frame] && (frames[frame].type === 'keyframe' || frames[frame].type === 'blank')) {
    frames[frame] = {
      ...frames[frame],
      type: 'keyframe',
      items: newItems,
    };
  } else {
    // AUTO-KEYFRAME IS OFF:
    // Do NOT automatically insert an F6 keyframe at target frame.
    // Instead, update the preceding active keyframe that controls this frame span.
    const allFrames = Object.values(frames)
      .filter((f) => f.type === 'keyframe' || f.type === 'blank')
      .sort((a, b) => a.frame - b.frame);

    const precedingKfs = allFrames.filter((f) => f.frame <= frame);
    const targetKf = precedingKfs.length > 0 ? precedingKfs[precedingKfs.length - 1] : allFrames[0];

    if (targetKf) {
      frames[targetKf.frame] = {
        ...targetKf,
        type: 'keyframe',
        items: newItems,
      };
    } else {
      frames[0] = {
        id: `kf_0_${Date.now()}`,
        frame: 0,
        type: 'keyframe',
        items: newItems,
        hasClassicTween: false,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 },
      };
    }
  }

  const updatedLayer: LayerItem = {
    ...layer,
    frames,
  };
  updatedLayer.items = getEffectiveLayerItems(updatedLayer, frame);
  return updatedLayer;
}

/**
 * Transforms items specifically on active layer at current frame.
 * AUTO-KEYFRAME IS OFF: Transforms the active keyframe spanning this frame without auto-creating a keyframe.
 */
export function transformLayerItemsAtFrame(
  layer: LayerItem,
  frame: number,
  targetItemIds: string[],
  transformFn: (item: CanvasItem) => CanvasItem
): LayerItem {
  if (layer.locked) return layer;

  const frames = ensureLayerFrames(layer);

  // Find target keyframe: either at this exact frame if explicit, or the preceding active keyframe
  let targetKfFrame = frame;

  if (!frames[frame] || (frames[frame].type !== 'keyframe' && frames[frame].type !== 'blank')) {
    const allFrames = Object.values(frames)
      .filter((f) => f.type === 'keyframe' || f.type === 'blank')
      .sort((a, b) => a.frame - b.frame);
    const precedingKfs = allFrames.filter((f) => f.frame <= frame);
    const targetKf = precedingKfs.length > 0 ? precedingKfs[precedingKfs.length - 1] : allFrames[0];
    targetKfFrame = targetKf ? targetKf.frame : 0;
  }

  const currentKf = frames[targetKfFrame] || frames[0];
  if (!currentKf) return layer;

  const itemsToTransform = currentKf.items || [];

  const updatedKfItems = itemsToTransform.map((item) => {
    if (targetItemIds.length === 0 || targetItemIds.includes(item.id)) {
      return transformFn(item);
    }
    return item;
  });

  frames[targetKfFrame] = {
    ...currentKf,
    type: 'keyframe',
    items: updatedKfItems,
  };

  const updatedLayer: LayerItem = {
    ...layer,
    frames,
  };
  updatedLayer.items = getEffectiveLayerItems(updatedLayer, frame);
  return updatedLayer;
}
