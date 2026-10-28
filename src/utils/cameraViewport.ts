import { Point } from '../types/canvas';

export interface CameraState {
  panX: number; // Translation X in screen pixels relative to viewport center
  panY: number; // Translation Y in screen pixels relative to viewport center
  zoom: number; // Scale factor (e.g., 0.05 = 5%, 1.0 = 100%, 10.0 = 1000%)
  rotation: number; // Angle in radians
}

export interface ViewportRect {
  width: number;
  height: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
}

export const MIN_ZOOM = 0.05; // 5% minimum zoom out
export const MAX_ZOOM = 10.0; // 1000% maximum zoom in

/**
 * Calculate optimal initial fit-to-viewport camera transform
 */
export function calculateAutoFitCamera(
  docWidth: number,
  docHeight: number,
  viewport: ViewportRect,
  paddingFactor: number = 0.95
): CameraState {
  const safeW = Math.max(100, viewport.width - (viewport.paddingLeft || 0) - (viewport.paddingRight || 0));
  const safeH = Math.max(100, viewport.height - (viewport.paddingTop || 0) - (viewport.paddingBottom || 0));

  const scaleX = (safeW * paddingFactor) / docWidth;
  const scaleY = (safeH * paddingFactor) / docHeight;
  const fitZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY)));

  return {
    panX: 0,
    panY: 0,
    zoom: fitZoom,
    rotation: 0,
  };
}

/**
 * Convert Screen/Client space coordinates to Document space coordinates
 */
export function screenToDocument(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  docWidth: number,
  docHeight: number,
  camera: CameraState
): Point {
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  // Subtract container origin & center offset & camera pan
  const relX = screenX - containerRect.left - centerX - camera.panX;
  const relY = screenY - containerRect.top - centerY - camera.panY;

  // Inverse rotation matrix
  const cos = Math.cos(-camera.rotation);
  const sin = Math.sin(-camera.rotation);
  const rx = relX * cos - relY * sin;
  const ry = relX * sin + relY * cos;

  // Divide by zoom scale and shift from document center
  const docX = rx / camera.zoom + docWidth / 2;
  const docY = ry / camera.zoom + docHeight / 2;

  return { x: docX, y: docY };
}

/**
 * Convert Document space coordinates to Screen/Client space coordinates
 */
export function documentToScreen(
  docX: number,
  docY: number,
  containerRect: DOMRect,
  docWidth: number,
  docHeight: number,
  camera: CameraState
): Point {
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  // Shift relative to document center and apply camera zoom
  const unrotX = (docX - docWidth / 2) * camera.zoom;
  const unrotY = (docY - docHeight / 2) * camera.zoom;

  // Forward rotation matrix
  const cos = Math.cos(camera.rotation);
  const sin = Math.sin(camera.rotation);
  const rx = unrotX * cos - unrotY * sin;
  const ry = unrotX * sin + unrotY * cos;

  // Add camera pan & container center & container origin
  const screenX = rx + camera.panX + centerX + containerRect.left;
  const screenY = ry + camera.panY + centerY + containerRect.top;

  return { x: screenX, y: screenY };
}

/**
 * Calculate camera zoom anchored around a specific screen focal point (cursor or touch midpoint)
 */
export function zoomAroundScreenPoint(
  targetZoom: number,
  focalScreenX: number,
  focalScreenY: number,
  containerRect: DOMRect,
  docWidth: number,
  docHeight: number,
  currentCamera: CameraState
): CameraState {
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
  if (clampedZoom === currentCamera.zoom) return currentCamera;

  // 1. Get document coordinate under focal screen point before zoom
  const docPoint = screenToDocument(
    focalScreenX,
    focalScreenY,
    containerRect,
    docWidth,
    docHeight,
    currentCamera
  );

  // 2. Compute new pan so docPoint remains under focalScreenX, focalScreenY after zoom
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  const relX = focalScreenX - containerRect.left - centerX;
  const relY = focalScreenY - containerRect.top - centerY;

  const unrotX = (docPoint.x - docWidth / 2) * clampedZoom;
  const unrotY = (docPoint.y - docHeight / 2) * clampedZoom;

  const cos = Math.cos(currentCamera.rotation);
  const sin = Math.sin(currentCamera.rotation);
  const rx = unrotX * cos - unrotY * sin;
  const ry = unrotX * sin + unrotY * cos;

  const newPanX = relX - rx;
  const newPanY = relY - ry;

  return {
    ...currentCamera,
    panX: newPanX,
    panY: newPanY,
    zoom: clampedZoom,
  };
}
