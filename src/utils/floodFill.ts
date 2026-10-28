import { hexToRgb } from './color';
import { FillItem, Point } from '../types/canvas';

export function performFloodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerancePercent: number = 30,
  contiguous: boolean = true
): FillItem | null {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  startX = Math.floor(startX);
  startY = Math.floor(startY);

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return null;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const targetIdx = (startY * width + startX) * 4;
  const targetR = data[targetIdx];
  const targetG = data[targetIdx + 1];
  const targetB = data[targetIdx + 2];
  const targetA = data[targetIdx + 3];

  const fillRgb = hexToRgb(fillColorHex);
  const fillR = fillRgb.r;
  const fillG = fillRgb.g;
  const fillB = fillRgb.b;
  const fillA = Math.round((fillRgb.a ?? 1) * 255);

  // If already the same color, return
  if (
    Math.abs(targetR - fillR) < 2 &&
    Math.abs(targetG - fillG) < 2 &&
    Math.abs(targetB - fillB) < 2 &&
    Math.abs(targetA - fillA) < 2
  ) {
    return null;
  }

  const maxToleranceDistance = (tolerancePercent / 100) * 441.67;

  function colorMatches(idx: number): boolean {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // If both are transparent
    if (targetA === 0 && a === 0) return true;

    const dist = Math.sqrt(
      Math.pow(r - targetR, 2) +
      Math.pow(g - targetG, 2) +
      Math.pow(b - targetB, 2) +
      Math.pow(a - targetA, 2)
    );
    return dist <= maxToleranceDistance;
  }

  // Create a mask canvas to isolate the fill object
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return null;
  const maskData = maskCtx.createImageData(width, height);
  const mData = maskData.data;

  const visited = new Uint8Array(width * height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  if (contiguous) {
    // Breadth-First Flood Fill
    const queue: number[] = [startX + startY * width];
    visited[startX + startY * width] = 1;

    while (queue.length > 0) {
      const pos = queue.pop()!;
      const cx = pos % width;
      const cy = Math.floor(pos / width);

      const pIdx = (cy * width + cx) * 4;
      mData[pIdx] = 255;
      mData[pIdx + 1] = 255;
      mData[pIdx + 2] = 255;
      mData[pIdx + 3] = 255;

      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;

      const neighbors = [
        cx > 0 ? pos - 1 : -1,
        cx < width - 1 ? pos + 1 : -1,
        cy > 0 ? pos - width : -1,
        cy < height - 1 ? pos + width : -1,
      ];

      for (const nPos of neighbors) {
        if (nPos >= 0 && !visited[nPos]) {
          const nIdx = nPos * 4;
          if (colorMatches(nIdx)) {
            visited[nPos] = 1;
            queue.push(nPos);
          }
        }
      }
    }
  } else {
    // Non-contiguous: replace everywhere in the layer
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      if (colorMatches(idx)) {
        mData[idx] = 255;
        mData[idx + 1] = 255;
        mData[idx + 2] = 255;
        mData[idx + 3] = 255;

        const cx = i % width;
        const cy = Math.floor(i / width);
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return null;
  }

  maskCtx.putImageData(maskData, 0, 0);

  const fillItem: FillItem = {
    id: `fill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'fill',
    seedPoint: { x: startX, y: startY },
    fillColor: fillColorHex,
    opacity: 1,
    tolerance: tolerancePercent,
    contiguous,
    maskDataUrl: maskCanvas.toDataURL(),
    transform: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      pivotX: (minX + maxX) / 2,
      pivotY: (minY + maxY) / 2,
    },
    boundingBox: { minX, minY, maxX, maxY },
  };

  return fillItem;
}
