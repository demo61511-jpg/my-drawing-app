import { Point } from '../types/canvas';

// Check if a point is inside a polygon (Ray-casting algorithm for Lasso)
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// Rotate point around arbitrary pivot
export function rotateAroundPivot(
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  angleRad: number
): { x: number; y: number } {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = x - pivotX;
  const dy = y - pivotY;
  return {
    x: pivotX + dx * cos - dy * sin,
    y: pivotY + dx * sin + dy * cos,
  };
}

// Scale point around arbitrary pivot
export function scaleAroundPivot(
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  scaleX: number,
  scaleY: number
): { x: number; y: number } {
  return {
    x: pivotX + (x - pivotX) * scaleX,
    y: pivotY + (y - pivotY) * scaleY,
  };
}

// Compute bounding box for array of points
export function getBoundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  return { minX, minY, maxX, maxY };
}

// Stroke smoothing with quadratic bezier midpoints
export function getSmoothedPoints(points: Point[], smoothingFactor: number = 0.5): Point[] {
  if (points.length <= 2 || smoothingFactor <= 0) return points;

  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    // Simple moving average based on smoothing factor
    const sx = p1.x * (1 - smoothingFactor) + ((p0.x + p2.x) / 2) * smoothingFactor;
    const sy = p1.y * (1 - smoothingFactor) + ((p0.y + p2.y) / 2) * smoothingFactor;
    const pressure = p1.pressure;

    result.push({ x: sx, y: sy, pressure });
  }
  result.push(points[points.length - 1]);
  return result;
}

// Convert control points P0..PN into Catmull-Rom / Cardinal Spline smooth Bezier control points
export function calculateSmoothCurvePoints(points: Point[], tension: number = 0.5): { x: number; y: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }[] {
  if (!points || points.length === 0) return [];
  if (points.length === 1) {
    return [{ x: points[0].x, y: points[0].y }];
  }
  if (points.length === 2) {
    return [
      { x: points[0].x, y: points[0].y },
      { x: points[1].x, y: points[1].y },
    ];
  }

  const n = points.length;
  const tangents: Point[] = [];

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      tangents.push({
        x: (points[1].x - points[0].x) * tension,
        y: (points[1].y - points[0].y) * tension,
      });
    } else if (i === n - 1) {
      tangents.push({
        x: (points[n - 1].x - points[n - 2].x) * tension,
        y: (points[n - 1].y - points[n - 2].y) * tension,
      });
    } else {
      tangents.push({
        x: (points[i + 1].x - points[i - 1].x) * 0.5 * tension,
        y: (points[i + 1].y - points[i - 1].y) * 0.5 * tension,
      });
    }
  }

  const result: { x: number; y: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }[] = [
    { x: points[0].x, y: points[0].y },
  ];

  for (let i = 1; i < n; i++) {
    const prevPt = points[i - 1];
    const currPt = points[i];
    const prevTan = tangents[i - 1];
    const currTan = tangents[i];

    result.push({
      x: currPt.x,
      y: currPt.y,
      cp1x: prevPt.x + prevTan.x / 3,
      cp1y: prevPt.y + prevTan.y / 3,
      cp2x: currPt.x - currTan.x / 3,
      cp2y: currPt.y - currTan.y / 3,
    });
  }

  return result;
}

// Compute distance from query point q to cubic Bezier curve segments
export function distanceToCurve(
  q: Point,
  bezierPoints: { x: number; y: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }[],
  samplesPerSegment: number = 20
): number {
  if (!bezierPoints || bezierPoints.length < 2) return Infinity;

  let minSqDist = Infinity;

  for (let i = 1; i < bezierPoints.length; i++) {
    const p0 = bezierPoints[i - 1];
    const p1 = bezierPoints[i];

    const cp1x = p1.cp1x !== undefined ? p1.cp1x : p0.x;
    const cp1y = p1.cp1y !== undefined ? p1.cp1y : p0.y;
    const cp2x = p1.cp2x !== undefined ? p1.cp2x : p1.x;
    const cp2y = p1.cp2y !== undefined ? p1.cp2y : p1.y;

    for (let step = 0; step <= samplesPerSegment; step++) {
      const t = step / samplesPerSegment;
      const mt = 1 - t;

      const mt3 = mt * mt * mt;
      const mt2t3 = 3 * mt * mt * t;
      const mtt23 = 3 * mt * t * t;
      const t3 = t * t * t;

      const sx = mt3 * p0.x + mt2t3 * cp1x + mtt23 * cp2x + t3 * p1.x;
      const sy = mt3 * p0.y + mt2t3 * cp1y + mtt23 * cp2y + t3 * p1.y;

      const dx = q.x - sx;
      const dy = q.y - sy;
      const sqDist = dx * dx + dy * dy;

      if (sqDist < minSqDist) {
        minSqDist = sqDist;
      }
    }
  }

  return Math.sqrt(minSqDist);
}

