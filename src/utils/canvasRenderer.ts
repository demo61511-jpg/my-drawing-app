import {
  LayerItem,
  CanvasItem,
  StrokeItem,
  FillItem,
  ShapeItem,
  ImageItem,
  CurveItem,
  ReferenceImage,
  Point,
} from '../types/canvas';
import { getSmoothedPoints } from './geometry';
import { getEffectiveLayerItems } from './frameAnimationEngine';

// Draw transparent checkerboard pattern
export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  size: number = 20
) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#e2e8f0';
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 1) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
  ctx.restore();
}

// Draw a single stroke item
export function renderStroke(ctx: CanvasRenderingContext2D, stroke: StrokeItem) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();

  // If this is an eraser stroke, use real destination-out cutting!
  if (stroke.isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else if (stroke.isAlphaLocked) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = stroke.strokeColor;
    ctx.fillStyle = stroke.strokeColor;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = stroke.strokeColor;
    ctx.fillStyle = stroke.strokeColor;
  }

  // Apply object transformation around pivot
  const tf = stroke.transform;
  if (tf.x !== 0 || tf.y !== 0 || tf.rotation !== 0 || tf.scaleX !== 1 || tf.scaleY !== 1) {
    ctx.translate(tf.pivotX + tf.x, tf.pivotY + tf.y);
    ctx.rotate(tf.rotation);
    ctx.scale(tf.scaleX, tf.scaleY);
    ctx.translate(-tf.pivotX, -tf.pivotY);
  }

  ctx.lineWidth = stroke.strokeWidth;
  ctx.lineCap = stroke.brushType === 'marker' ? 'square' : 'round';
  ctx.lineJoin = 'round';

  if (!stroke.isEraser) {
    if (stroke.brushType === 'pencil') {
      ctx.shadowBlur = 1;
      ctx.shadowColor = stroke.strokeColor;
      ctx.globalAlpha = stroke.opacity * 0.85;
    } else if (stroke.brushType === 'airbrush') {
      ctx.shadowBlur = stroke.strokeWidth * 1.2;
      ctx.shadowColor = stroke.strokeColor;
      ctx.globalAlpha = stroke.opacity * 0.35;
    } else if (stroke.brushType === 'marker') {
      ctx.globalAlpha = stroke.opacity * 0.65;
    } else if (stroke.brushType === 'calligraphy') {
      ctx.shadowBlur = 0.5;
      ctx.shadowColor = stroke.strokeColor;
    }
  }

  const smoothed = getSmoothedPoints(stroke.points, (stroke.smoothing || 30) / 100);

  if (smoothed.length === 1) {
    const p = smoothed[0];
    const r = (stroke.strokeWidth * (stroke.pressureSensitivity ? p.pressure || 0.5 : 1)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Airbrush spray particle effect
    if (!stroke.isEraser && stroke.brushType === 'airbrush') {
      const radius = stroke.strokeWidth;
      for (const p of smoothed) {
        const dots = Math.floor(radius * 1.5);
        for (let d = 0; d < dots; d++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          const px = p.x + Math.cos(angle) * r;
          const py = p.y + Math.sin(angle) * r;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, Math.random() * 1.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(smoothed[0].x, smoothed[0].y);

      for (let i = 1; i < smoothed.length - 1; i++) {
        const xc = (smoothed[i].x + smoothed[i + 1].x) / 2;
        const yc = (smoothed[i].y + smoothed[i + 1].y) / 2;
        ctx.quadraticCurveTo(smoothed[i].x, smoothed[i].y, xc, yc);
      }

      if (smoothed.length > 1) {
        const last = smoothed[smoothed.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Draw a single shape item
export function renderShape(ctx: CanvasRenderingContext2D, shape: ShapeItem) {
  ctx.save();
  ctx.globalAlpha = shape.opacity;
  if (shape.isAlphaLocked) {
    ctx.globalCompositeOperation = 'source-atop';
  }

  const tf = shape.transform;
  if (tf.x !== 0 || tf.y !== 0 || tf.rotation !== 0 || tf.scaleX !== 1 || tf.scaleY !== 1) {
    ctx.translate(tf.pivotX + tf.x, tf.pivotY + tf.y);
    ctx.rotate(tf.rotation);
    ctx.scale(tf.scaleX, tf.scaleY);
    ctx.translate(-tf.pivotX, -tf.pivotY);
  }

  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = shape.strokeWidth;
  ctx.fillStyle = shape.fillColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const x = Math.min(shape.startX, shape.endX);
  const y = Math.min(shape.startY, shape.endY);
  const w = Math.abs(shape.endX - shape.startX);
  const h = Math.abs(shape.endY - shape.startY);

  ctx.beginPath();

  if (shape.shapeType === 'line') {
    ctx.moveTo(shape.startX, shape.startY);
    ctx.lineTo(shape.endX, shape.endY);
  } else if (shape.shapeType === 'rectangle') {
    ctx.rect(x, y, w, h);
  } else if (shape.shapeType === 'rounded-rect') {
    const r = Math.min(20, w / 4, h / 4);
    ctx.roundRect(x, y, w, h, r);
  } else if (shape.shapeType === 'circle') {
    const rx = w / 2;
    const ry = h / 2;
    const cx = x + rx;
    const cy = y + ry;
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  } else if (shape.shapeType === 'star') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const outerR = Math.max(w, h) / 2;
    const innerR = outerR * 0.45;
    const spikes = 5;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  } else if (shape.shapeType === 'polygon') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.max(w, h) / 2;
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  if (shape.fillColor && shape.fillColor !== 'none') {
    ctx.fill();
  }
  if (shape.strokeWidth > 0 && shape.strokeColor && shape.strokeColor !== 'none') {
    ctx.stroke();
  }

  ctx.restore();
}

// Draw a fill item
const cachedMaskImages = new Map<string, HTMLImageElement>();

export function renderFill(ctx: CanvasRenderingContext2D, fill: FillItem) {
  if (!fill.maskDataUrl) return;

  ctx.save();
  ctx.globalAlpha = fill.opacity;

  const tf = fill.transform;
  if (tf.x !== 0 || tf.y !== 0 || tf.rotation !== 0 || tf.scaleX !== 1 || tf.scaleY !== 1) {
    ctx.translate(tf.pivotX + tf.x, tf.pivotY + tf.y);
    ctx.rotate(tf.rotation);
    ctx.scale(tf.scaleX, tf.scaleY);
    ctx.translate(-tf.pivotX, -tf.pivotY);
  }

  let img = cachedMaskImages.get(fill.maskDataUrl);
  if (!img) {
    img = new Image();
    img.src = fill.maskDataUrl;
    cachedMaskImages.set(fill.maskDataUrl, img);
  }

  if (img.complete && img.naturalWidth > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(img, 0, 0);
      tCtx.globalCompositeOperation = 'source-in';
      tCtx.fillStyle = fill.fillColor;
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  ctx.restore();
}

// Draw an Image item (Belongs directly to Layer)
const cachedLayerImages = new Map<string, HTMLImageElement>();

export function renderImageItem(ctx: CanvasRenderingContext2D, item: ImageItem) {
  if (!item.url) return;

  let img = cachedLayerImages.get(item.url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = item.url;
    cachedLayerImages.set(item.url, img);
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = item.opacity;

    const tf = item.transform;
    ctx.translate(tf.pivotX + tf.x, tf.pivotY + tf.y);
    ctx.rotate(tf.rotation);
    ctx.scale(tf.scaleX, tf.scaleY);

    const w = item.width || img.naturalWidth;
    const h = item.height || img.naturalHeight;

    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

// Draw a Bezier Curve item
export function renderCurve(ctx: CanvasRenderingContext2D, curve: CurveItem) {
  if (!curve.points || curve.points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = curve.opacity;
  if (curve.isAlphaLocked) {
    ctx.globalCompositeOperation = 'source-atop';
  }

  const tf = curve.transform;
  if (tf.x !== 0 || tf.y !== 0 || tf.rotation !== 0 || tf.scaleX !== 1 || tf.scaleY !== 1) {
    ctx.translate(tf.pivotX + tf.x, tf.pivotY + tf.y);
    ctx.rotate(tf.rotation);
    ctx.scale(tf.scaleX, tf.scaleY);
    ctx.translate(-tf.pivotX, -tf.pivotY);
  }

  ctx.strokeStyle = curve.strokeColor;
  ctx.lineWidth = curve.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(curve.points[0].x, curve.points[0].y);

  for (let i = 1; i < curve.points.length; i++) {
    const prev = curve.points[i - 1];
    const curr = curve.points[i];

    if (curr.cp1x !== undefined && curr.cp1y !== undefined && curr.cp2x !== undefined && curr.cp2y !== undefined) {
      ctx.bezierCurveTo(curr.cp1x, curr.cp1y, curr.cp2x, curr.cp2y, curr.x, curr.y);
    } else if (curr.cp1x !== undefined && curr.cp1y !== undefined) {
      ctx.quadraticCurveTo(curr.cp1x, curr.cp1y, curr.x, curr.y);
    } else {
      ctx.lineTo(curr.x, curr.y);
    }
  }

  if (curve.closed) {
    ctx.closePath();
    if (curve.fillColor && curve.fillColor !== 'none') {
      ctx.fillStyle = curve.fillColor;
      ctx.fill();
    }
  }

  if (curve.strokeWidth > 0 && curve.strokeColor && curve.strokeColor !== 'none') {
    ctx.stroke();
  }

  ctx.restore();
}

// Render layer onto its own offscreen canvas buffer
const layerCanvasCache = new Map<string, HTMLCanvasElement>();

export function renderLayerToBuffer(
  layer: LayerItem,
  width: number,
  height: number,
  currentFrame?: number,
  liveStroke?: StrokeItem | null
): HTMLCanvasElement {
  let canvas = layerCanvasCache.get(layer.id);
  if (!canvas || canvas.width !== width || canvas.height !== height) {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    layerCanvasCache.set(layer.id, canvas);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, width, height);

  const items = currentFrame !== undefined ? getEffectiveLayerItems(layer, currentFrame) : layer.items;

  for (const item of items) {
    if (item.type === 'fill') {
      renderFill(ctx, item);
    } else if (item.type === 'shape') {
      renderShape(ctx, item);
    } else if (item.type === 'image') {
      renderImageItem(ctx, item);
    } else if (item.type === 'curve') {
      renderCurve(ctx, item);
    } else if (item.type === 'stroke') {
      renderStroke(ctx, item);
    }
  }

  if (liveStroke && (liveStroke.layerId === layer.id || !liveStroke.layerId)) {
    renderStroke(ctx, liveStroke);
  }

  return canvas;
}

// Render complete project layers with genuine per-layer buffer isolation & animation support
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: LayerItem[],
  backgroundColor: string = '#ffffff',
  legacyReferenceImage?: ReferenceImage | null,
  drawCheckerboardIfTransparent: boolean = true,
  animationStates?: Map<string, { worldMatrix: [number, number, number, number, number, number]; opacity: number; visibility: boolean }>,
  currentFrame?: number,
  liveStroke?: StrokeItem | null
) {
  ctx.clearRect(0, 0, width, height);

  // Background
  if (backgroundColor !== 'transparent' && backgroundColor !== 'none') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  } else if (drawCheckerboardIfTransparent) {
    drawCheckerboard(ctx, width, height);
  }

  // Draw legacy reference image if present
  if (legacyReferenceImage && legacyReferenceImage.visible && legacyReferenceImage.url) {
    renderReference(ctx, legacyReferenceImage);
  }

  // Draw layers from bottom to top using isolated offscreen layer buffers
  // Apply Clipping Mask
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();

  for (const layer of layers) {
    const animState = animationStates?.get(layer.id);
    const isVisible = animState ? animState.visibility : layer.visible;
    if (!isVisible) continue;

    const layerBuffer = renderLayerToBuffer(layer, width, height, currentFrame, liveStroke);

    ctx.save();
    const finalOpacity = animState ? layer.opacity * animState.opacity : layer.opacity;
    ctx.globalAlpha = Math.max(0, Math.min(1, finalOpacity));
    ctx.globalCompositeOperation = layer.blendMode || 'source-over';

    if (animState && animState.worldMatrix) {
      const [a, b, c, d, e, f] = animState.worldMatrix;
      ctx.transform(a, b, c, d, e, f);
    }

    ctx.drawImage(layerBuffer, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// Render legacy reference image
const cachedRefImages = new Map<string, HTMLImageElement>();

export function renderReference(ctx: CanvasRenderingContext2D, ref: ReferenceImage) {
  let img = cachedRefImages.get(ref.url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = ref.url;
    cachedRefImages.set(ref.url, img);
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = ref.opacity;
    ctx.translate(ref.x, ref.y);
    ctx.rotate(ref.rotation);
    ctx.scale(ref.scale, ref.scale);
    ctx.drawImage(img, -ref.width / 2, -ref.height / 2, ref.width, ref.height);
    ctx.restore();
  }
}
