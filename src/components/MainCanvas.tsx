import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Project,
  LayerItem,
  CanvasItem,
  StrokeItem,
  FillItem,
  ShapeItem,
  ImageItem,
  CurveItem,
  BezierPoint,
  ToolType,
  BrushSettings,
  FillSettings,
  ShapeSettings,
  CurveSettings,
  Point,
  TransformState,
} from '../types/canvas';
import {
  renderCanvas,
  renderStroke,
  renderShape,
  renderFill,
  renderImageItem,
  renderCurve,
  renderLayerToBuffer,
} from '../utils/canvasRenderer';
import { performFloodFill } from '../utils/floodFill';
import {
  isPointInPolygon,
  getBoundingBox,
  rotateAroundPivot,
  scaleAroundPivot,
  calculateSmoothCurvePoints,
  distanceToCurve,
} from '../utils/geometry';
import { rgbToHex } from '../utils/color';
import {
  CameraState,
  calculateAutoFitCamera,
  screenToDocument,
  zoomAroundScreenPoint,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../utils/cameraViewport';
import { Check, X, RotateCcw, Pipette, Move, RotateCw, Maximize2, Trash2, Copy, Lock } from 'lucide-react';
import { getEffectiveLayerItems, updateLayerArtworkAtFrame, transformLayerItemsAtFrame } from '../utils/frameAnimationEngine';

interface MainCanvasProps {
  project: Project;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  eraserSize: number;
  eraserOpacity: number;
  activeRuler?: string;
  fillSettings: FillSettings;
  shapeSettings: ShapeSettings;
  curveSettings: CurveSettings;
  curveMode?: 'bezier' | 'freehand';
  currentColor: string;
  onSelectColor: (color: string) => void;
  onUpdateProjectLayers: (newLayers: LayerItem[], pushHistory?: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenReferenceModal: () => void;
  selectedItemIds: string[];
  setSelectedItemIds: React.Dispatch<React.SetStateAction<string[]>>;
  transformMode: 'all' | 'move' | 'scale' | 'rotate' | 'perspective' | 'mesh';
  pivotPoint: { x: number; y: number } | null;
  setPivotPoint: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  canvasRotation: number;
  setCanvasRotation: React.Dispatch<React.SetStateAction<number>>;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  canvasPan: { x: number; y: number };
  setCanvasPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  animationStates?: Map<string, { worldMatrix: [number, number, number, number, number, number]; opacity: number; visibility: boolean }>;
  currentFrame?: number;
  onTransformDragStart?: () => void;
  onTransformDragEnd?: () => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  project,
  activeTool,
  brushSettings,
  eraserSize,
  eraserOpacity,
  activeRuler = 'off',
  fillSettings,
  shapeSettings,
  curveSettings,
  curveMode = 'bezier',
  currentColor,
  onSelectColor,
  onUpdateProjectLayers,
  onUndo,
  onRedo,
  onOpenReferenceModal,
  selectedItemIds,
  setSelectedItemIds,
  transformMode,
  pivotPoint,
  setPivotPoint,
  canvasRotation,
  setCanvasRotation,
  canvasZoom,
  setCanvasZoom,
  canvasPan,
  setCanvasPan,
  animationStates,
  currentFrame,
  onTransformDragStart,
  onTransformDragEnd,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [lockedNotice, setLockedNotice] = useState<boolean>(false);

  // Drawing state
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  const lassoPointsRef = useRef<Point[]>([]);

  // Freehand curve points
  const freehandCurvePointsRef = useRef<Point[]>([]);

  // Bezier curve points & interactive node/line dragging
  const [curveRawPoints, setCurveRawPoints] = useState<Point[]>([]);
  const [draggedNodeIndex, setDraggedNodeIndex] = useState<number | null>(null);

  const draggedNodeIndexRef = useRef<number | null>(null);
  const isDraggingCurveLineRef = useRef<boolean>(false);
  const curveDragStartPosRef = useRef<Point | null>(null);
  const curveDragStartNodesRef = useRef<Point[] | null>(null);
  const pendingNewNodeRef = useRef<{ point: Point; startClientX: number; startClientY: number } | null>(null);

  const activeCurvePoints = React.useMemo(
    () => calculateSmoothCurvePoints(curveRawPoints),
    [curveRawPoints]
  );

  // Long-press Eyedropper state
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartPosRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [eyedropperFeedback, setEyedropperFeedback] = useState<{ color: string; x: number; y: number } | null>(null);
  const [pointerPosition, setPointerPosition] = useState<Point | null>(null);

  // Multi-touch gestures (Pinch Zoom & 2-Finger Pan)
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchAngleRef = useRef<number | null>(null);
  const initialPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const initialZoomRef = useRef<number>(1);
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialRotationRef = useRef<number>(0);

  // Single-finger Hand Pan state
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialSinglePanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Transform dragging state
  const isDraggingTransformRef = useRef<boolean>(false);
  const isDraggingPivotRef = useRef<boolean>(false);
  const transformStartPointerRef = useRef<Point | null>(null);
  const transformActionTypeRef = useRef<'move' | 'rotate' | 'scale' | 'pivot' | null>(null);
  const scaleHandleIndexRef = useRef<number | null>(null);

  // Stable transform dragging refs to prevent runaway scaling & position drift
  const dragStartPointerRef = useRef<Point | null>(null);
  const dragStartPivotRef = useRef<Point | null>(null);
  const dragStartDistRef = useRef<number | null>(null);
  const initialItemTransformsRef = useRef<Map<string, TransformState> | null>(null);

  const activeLayer = project.layers.find((l) => l.id === project.activeLayerId) || project.layers[0];

  // Auto-fit canvas camera to viewport on mount, resize, or orientation change
  const autoFitCanvas = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const camera = calculateAutoFitCamera(
      project.width,
      project.height,
      { width: rect.width, height: rect.height },
      0.95
    );

    setCanvasZoom(camera.zoom);
    setCanvasPan({ x: camera.panX, y: camera.panY });
    setCanvasRotation(camera.rotation);
  }, [project.width, project.height, setCanvasZoom, setCanvasPan, setCanvasRotation]);

  useEffect(() => {
    autoFitCanvas();
    const handleResize = () => autoFitCanvas();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [autoFitCanvas]);

  // Convert Screen Space coordinates to Document Space coordinates via Camera System
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const camera: CameraState = {
        panX: canvasPan.x,
        panY: canvasPan.y,
        zoom: canvasZoom,
        rotation: canvasRotation,
      };
      return screenToDocument(clientX, clientY, rect, project.width, project.height, camera);
    },
    [canvasPan.x, canvasPan.y, canvasRotation, canvasZoom, project.width, project.height]
  );

  // Re-render main canvas when layers, project background, animationStates, or currentFrame changes
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    renderCanvas(
      ctx,
      project.width,
      project.height,
      project.layers,
      project.backgroundColor,
      project.referenceImage,
      true,
      animationStates,
      currentFrame
    );
  }, [project, animationStates, currentFrame]);

  // Compute Selection Bounding Box & Transformed Box (Supports move, scale, and rotation)
  const selectionBBox = React.useMemo(() => {
    if (!activeLayer) return null;

    const layerItems = currentFrame !== undefined ? getEffectiveLayerItems(activeLayer, currentFrame) : activeLayer.items;
    let targetItems = layerItems.filter((item) => selectedItemIds.includes(item.id));
    if (targetItems.length === 0 && activeTool === 'transform') {
      targetItems = layerItems;
    }

    if (targetItems.length === 0) return null;

    if (targetItems.length === 1) {
      const item = targetItems[0];
      if (!item.boundingBox) return null;

      const { minX, minY, maxX, maxY } = item.boundingBox;
      const tf = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: (minX + maxX) / 2, pivotY: (minY + maxY) / 2 };

      const pivotX = tf.pivotX ?? (minX + maxX) / 2;
      const pivotY = tf.pivotY ?? (minY + maxY) / 2;
      const scaleX = tf.scaleX ?? 1;
      const scaleY = tf.scaleY ?? 1;
      const rotation = tf.rotation ?? 0;
      const tx = tf.x ?? 0;
      const ty = tf.y ?? 0;

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      const transformPt = (px: number, py: number): Point => {
        const rx = (px - pivotX) * scaleX;
        const ry = (py - pivotY) * scaleY;
        return {
          x: rx * cos - ry * sin + pivotX + tx,
          y: rx * sin + ry * cos + pivotY + ty,
        };
      };

      const topLeft = transformPt(minX, minY);
      const topRight = transformPt(maxX, minY);
      const bottomRight = transformPt(maxX, maxY);
      const bottomLeft = transformPt(minX, maxY);
      const cx = (topLeft.x + topRight.x + bottomRight.x + bottomLeft.x) / 4;
      const cy = (topLeft.y + topRight.y + bottomRight.y + bottomLeft.y) / 4;
      const topMid = { x: (topLeft.x + topRight.x) / 2, y: (topLeft.y + topRight.y) / 2 };
      const bottomMid = { x: (bottomLeft.x + bottomRight.x) / 2, y: (bottomLeft.y + bottomRight.y) / 2 };
      const leftMid = { x: (topLeft.x + bottomLeft.x) / 2, y: (topLeft.y + bottomLeft.y) / 2 };
      const rightMid = { x: (topRight.x + bottomRight.x) / 2, y: (topRight.y + bottomRight.y) / 2 };

      const allX = [topLeft.x, topRight.x, bottomRight.x, bottomLeft.x];
      const allY = [topLeft.y, topRight.y, bottomRight.y, bottomLeft.y];

      return {
        minX: Math.min(...allX),
        minY: Math.min(...allY),
        maxX: Math.max(...allX),
        maxY: Math.max(...allY),
        cx,
        cy,
        topLeft,
        topRight,
        bottomRight,
        bottomLeft,
        topMid,
        bottomMid,
        leftMid,
        rightMid,
        rotation,
        pivotPoint: { x: pivotX + tx, y: pivotY + ty },
      };
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let found = false;

      for (const item of targetItems) {
        if (item.boundingBox) {
          const tf = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
          const px = tf.pivotX ?? (item.boundingBox.minX + item.boundingBox.maxX) / 2;
          const py = tf.pivotY ?? (item.boundingBox.minY + item.boundingBox.maxY) / 2;
          const sx = tf.scaleX ?? 1;
          const sy = tf.scaleY ?? 1;
          const rot = tf.rotation ?? 0;
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);

          const pts = [
            { x: item.boundingBox.minX, y: item.boundingBox.minY },
            { x: item.boundingBox.maxX, y: item.boundingBox.minY },
            { x: item.boundingBox.maxX, y: item.boundingBox.maxY },
            { x: item.boundingBox.minX, y: item.boundingBox.maxY },
          ];

          for (const p of pts) {
            const rx = (p.x - px) * sx;
            const ry = (p.y - py) * sy;
            const wx = rx * cos - ry * sin + px + tf.x;
            const wy = rx * sin + ry * cos + py + tf.y;
            minX = Math.min(minX, wx);
            minY = Math.min(minY, wy);
            maxX = Math.max(maxX, wx);
            maxY = Math.max(maxY, wy);
            found = true;
          }
        }
      }

      if (!found) return null;

      const topLeft = { x: minX, y: minY };
      const topRight = { x: maxX, y: minY };
      const bottomRight = { x: maxX, y: maxY };
      const bottomLeft = { x: minX, y: maxY };
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const topMid = { x: cx, y: minY };
      const bottomMid = { x: cx, y: maxY };
      const leftMid = { x: minX, y: cy };
      const rightMid = { x: maxX, y: cy };

      return {
        minX,
        minY,
        maxX,
        maxY,
        cx,
        cy,
        topLeft,
        topRight,
        bottomRight,
        bottomLeft,
        topMid,
        bottomMid,
        leftMid,
        rightMid,
        rotation: 0,
        pivotPoint: { x: cx, y: cy },
      };
    }
  }, [selectedItemIds, activeLayer, activeTool, currentFrame]);

  // Render Overlay (Curve Construction, Transform Bounding Box, Pivot Point, Lasso, Rulers)
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // 0. Draw Active Ruler Guide Overlay
    if (activeRuler && activeRuler !== 'off') {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 4]);

      const cx = project.width / 2;
      const cy = project.height / 2;

      if (activeRuler === 'parallel') {
        for (let y = 0; y < project.height; y += 50) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(project.width, y);
          ctx.stroke();
        }
      } else if (activeRuler === 'concentric') {
        for (let r = 40; r < Math.max(project.width, project.height); r += 45) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (activeRuler === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(cx, cy, project.width * 0.35, project.height * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeRuler === 'radial') {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * project.width, cy + Math.sin(angle) * project.height);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 1. Draw Active Bezier Curve construction preview (Ibis Paint X style smooth spline & Red/Blue interactive nodes)
    if (activeTool === 'curve' && curveMode === 'bezier' && curveRawPoints.length > 0) {
      ctx.save();

      const smoothPts = calculateSmoothCurvePoints(curveRawPoints);

      // Continuous smooth spline stroke
      if (smoothPts.length >= 2) {
        ctx.strokeStyle = curveSettings.strokeColor;
        ctx.lineWidth = curveSettings.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(smoothPts[0].x, smoothPts[0].y);
        for (let i = 1; i < smoothPts.length; i++) {
          const pt = smoothPts[i];
          if (pt.cp1x !== undefined && pt.cp1y !== undefined && pt.cp2x !== undefined && pt.cp2y !== undefined) {
            ctx.bezierCurveTo(pt.cp1x, pt.cp1y, pt.cp2x, pt.cp2y, pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        if (curveSettings.closed && smoothPts.length > 2) {
          ctx.closePath();
          if (curveSettings.fillColor && curveSettings.fillColor !== 'none') {
            ctx.fillStyle = curveSettings.fillColor;
            ctx.fill();
          }
        }
        ctx.stroke();
      }

      // Draw Red Dot for start node P0 and Blue Dots for control nodes P1..PN with white border rings
      for (let i = 0; i < curveRawPoints.length; i++) {
        const pt = curveRawPoints[i];
        const isStart = i === 0;
        const isDragged = i === draggedNodeIndex;

        // Outer glow highlight when actively dragging node
        if (isDragged) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = isStart ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';
          ctx.fill();
        }

        // Outer white border ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isDragged ? 9 : 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner colored dot (Red for start point 0, Blue for control points)
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isDragged ? 6.5 : 5.5, 0, Math.PI * 2);
        ctx.fillStyle = isStart ? '#ef4444' : '#3b82f6';
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Draw Lasso Marching Ants
    if (lassoPointsRef.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(lassoPointsRef.current[0].x, lassoPointsRef.current[0].y);
      for (let i = 1; i < lassoPointsRef.current.length; i++) {
        ctx.lineTo(lassoPointsRef.current[i].x, lassoPointsRef.current[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Transform Bounding Box & Movable Pivot Point
    if (selectionBBox && (selectedItemIds.length > 0 || activeTool === 'transform')) {
      ctx.save();
      const { topLeft, topRight, bottomRight, bottomLeft, topMid, cx, cy, rotation } = selectionBBox;

      // Draw rotated transform box outline
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(bottomLeft.x, bottomLeft.y);
      ctx.closePath();
      ctx.stroke();

      // 8 Handle boxes (4 corners + 4 mid-edges)
      const cornerSize = Math.max(12, Math.min(20, 14 / canvasZoom));
      const edgeSize = Math.max(9, Math.min(16, 11 / canvasZoom));
      const corners = [topLeft, topRight, bottomLeft, bottomRight];
      const edges = [
        selectionBBox.topMid,
        selectionBBox.rightMid,
        selectionBBox.bottomMid,
        selectionBBox.leftMid,
      ];

      // Draw 4 Corner Handles (Primary Zoom / Scale Grips)
      for (const c of corners) {
        ctx.save();
        ctx.translate(c.x, c.y);
        if (rotation !== 0) ctx.rotate(rotation);
        ctx.beginPath();
        ctx.rect(-cornerSize / 2, -cornerSize / 2, cornerSize, cornerSize);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Draw 4 Edge Handles (Mid-Edge Zoom / Scale Grips)
      for (const e of edges) {
        if (!e) continue;
        ctx.save();
        ctx.translate(e.x, e.y);
        if (rotation !== 0) ctx.rotate(rotation);
        ctx.beginPath();
        ctx.arc(0, 0, edgeSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }

      // Rotate handle offset perpendicular to top edge
      const angle = rotation || 0;
      const rotHandleOffset = 30;
      const rotX = topMid.x - Math.sin(angle) * rotHandleOffset;
      const rotY = topMid.y - Math.cos(angle) * rotHandleOffset;

      ctx.beginPath();
      ctx.moveTo(topMid.x, topMid.y);
      ctx.lineTo(rotX, rotY);
      ctx.strokeStyle = '#3b82f6';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rotX, rotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Movable Pivot Point (Small Black Dot Marker - Alight Motion / ibisPaint X style)
      const px = pivotPoint ? pivotPoint.x : selectionBBox.pivotPoint.x;
      const py = pivotPoint ? pivotPoint.y : selectionBBox.pivotPoint.y;

      // Dashed guide line from object center to pivot point if moved
      if (Math.hypot(px - cx, py - cy) > 2) {
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Translucent touch target ring for easy finger dragging
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fill();

      // Small Black Dot Marker
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tiny white center dot
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
  }, [selectionBBox, selectedItemIds, pivotPoint, activeCurvePoints, curveSettings, activeTool, curveMode]);

  // Handle Finish Bezier Curve (Bakes smooth spline onto active layer)
  const handleFinishCurve = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (curveRawPoints.length < 2) {
      setCurveRawPoints([]);
      return;
    }

    const smoothPoints = calculateSmoothCurvePoints(curveRawPoints);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of smoothPoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const newCurve: CurveItem = {
      id: `curve_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'curve',
      layerId: project.activeLayerId,
      curveMode: 'bezier',
      points: smoothPoints,
      strokeColor: curveSettings.strokeColor,
      strokeWidth: curveSettings.strokeWidth,
      opacity: curveSettings.opacity,
      closed: curveSettings.closed,
      fillColor: curveSettings.closed ? curveSettings.fillColor : 'none',
      isAlphaLocked: Boolean(activeLayer?.isAlphaLocked),
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

    const updatedLayers = project.layers.map((layer) => {
      if (layer.id === project.activeLayerId) {
        if (currentFrame !== undefined) {
          return updateLayerArtworkAtFrame(layer, currentFrame, [
            ...getEffectiveLayerItems(layer, currentFrame),
            newCurve,
          ]);
        }
        return { ...layer, items: [...layer.items, newCurve] };
      }
      return layer;
    });

    onUpdateProjectLayers(updatedLayers, true);
    setCurveRawPoints([]);
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeLayer?.locked && activeTool !== 'hand') {
      setLockedNotice(true);
      setTimeout(() => setLockedNotice(false), 1600);
      return;
    }

    // Hand tool / Canvas Pan
    if (activeTool === 'hand') {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      initialSinglePanRef.current = { ...canvasPan };
      return;
    }

    const coords = clientToCanvasCoords(e.clientX, e.clientY);
    startPointRef.current = coords;

    // Start Long-Press detection for Auto Eyedropper on Brush/Pencil/Pen
    if (['brush', 'pencil', 'pen', 'marker'].includes(activeTool)) {
      longPressStartPosRef.current = { clientX: e.clientX, clientY: e.clientY };
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      longPressTimerRef.current = setTimeout(() => {
        const mainCanvas = mainCanvasRef.current;
        if (!mainCanvas) return;
        const ctx = mainCanvas.getContext('2d');
        if (!ctx) return;
        const px = Math.floor(coords.x);
        const py = Math.floor(coords.y);
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        if (pixel[3] > 0) {
          const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
          onSelectColor(hex);
          setEyedropperFeedback({ color: hex, x: e.clientX, y: e.clientY });
          try {
            if ('vibrate' in navigator) navigator.vibrate(35);
          } catch (_) {}
          // Cancel drawing gesture
          isDrawingRef.current = false;
          currentPointsRef.current = [];
          const scratch = scratchCanvasRef.current;
          if (scratch) {
            scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
          }
          setTimeout(() => setEyedropperFeedback(null), 1200);
        }
      }, 420);
    }

    // Direct Object Selection Tool
    if (activeTool === 'select') {
      const items = activeLayer?.items || [];
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item.boundingBox) {
          const { minX, minY, maxX, maxY } = item.boundingBox;
          if (coords.x >= minX - 10 && coords.x <= maxX + 10 && coords.y >= minY - 10 && coords.y <= maxY + 10) {
            setSelectedItemIds([item.id]);
            return;
          }
        }
      }
      setSelectedItemIds([]);
      return;
    }

    // Curve Tool (Freehand vs Bezier)
    if (activeTool === 'curve') {
      if (curveMode === 'freehand') {
        isDrawingRef.current = true;
        freehandCurvePointsRef.current = [coords];
        return;
      } else {
        // Ibis Paint X Bezier Curve interaction
        const nodeHitRadius = 22 / canvasZoom;
        let hitNodeIdx: number | null = null;
        let minDist = Infinity;

        for (let i = 0; i < curveRawPoints.length; i++) {
          const pt = curveRawPoints[i];
          const d = Math.hypot(coords.x - pt.x, coords.y - pt.y);
          if (d <= nodeHitRadius && d < minDist) {
            minDist = d;
            hitNodeIdx = i;
          }
        }

        if (hitNodeIdx !== null) {
          draggedNodeIndexRef.current = hitNodeIdx;
          setDraggedNodeIndex(hitNodeIdx);
          return;
        }

        if (curveRawPoints.length >= 2) {
          const smoothPts = calculateSmoothCurvePoints(curveRawPoints);
          const lineHitRadius = 18 / canvasZoom;
          const distToLine = distanceToCurve(coords, smoothPts);

          if (distToLine <= lineHitRadius) {
            isDraggingCurveLineRef.current = true;
            curveDragStartPosRef.current = coords;
            curveDragStartNodesRef.current = [...curveRawPoints];
            return;
          }
        }

        pendingNewNodeRef.current = {
          point: coords,
          startClientX: e.clientX,
          startClientY: e.clientY,
        };
        return;
      }
    }

    // Transform Tool
    if (activeTool === 'transform' && selectionBBox) {
      const px = pivotPoint ? pivotPoint.x : selectionBBox.pivotPoint.x;
      const py = pivotPoint ? pivotPoint.y : selectionBBox.pivotPoint.y;

      const effectiveItems =
        currentFrame !== undefined && activeLayer
          ? getEffectiveLayerItems(activeLayer, currentFrame)
          : activeLayer?.items || [];

      const targetIds =
        selectedItemIds.length > 0
          ? selectedItemIds
          : effectiveItems.map((i) => i.id);

      const targetItems = effectiveItems.filter((i) => targetIds.includes(i.id));

      // 1. Pivot Hit Test
      const distToPivot = Math.hypot(coords.x - px, coords.y - py);
      if (distToPivot < Math.max(28, 28 / canvasZoom)) {
        isDraggingPivotRef.current = true;
        transformActionTypeRef.current = 'pivot';
        transformStartPointerRef.current = coords;
        onTransformDragStart?.();
        return;
      }

      // 2. Rotate Handle Hit Test
      const angle = selectionBBox.rotation || 0;
      const rotHandleOffset = 30;
      const rotX = selectionBBox.topMid.x - Math.sin(angle) * rotHandleOffset;
      const rotY = selectionBBox.topMid.y - Math.cos(angle) * rotHandleOffset;

      const distToRot = Math.hypot(coords.x - rotX, coords.y - rotY);
      if (distToRot < Math.max(24, 24 / canvasZoom) || transformMode === 'rotate') {
        isDraggingTransformRef.current = true;
        transformActionTypeRef.current = 'rotate';
        transformStartPointerRef.current = coords;
        dragStartPointerRef.current = coords;
        dragStartPivotRef.current = { x: px, y: py };
        initialItemTransformsRef.current = new Map(
          targetItems.map((it) => [it.id, { ...it.transform }])
        );
        onTransformDragStart?.();
        return;
      }

      // 3. Scale Handles Hit Test (4 Corners + 4 Mid-Edges)
      const handles = [
        selectionBBox.topLeft,
        selectionBBox.topRight,
        selectionBBox.bottomRight,
        selectionBBox.bottomLeft,
        selectionBBox.topMid,
        selectionBBox.rightMid,
        selectionBBox.bottomMid,
        selectionBBox.leftMid,
      ];

      const handleHitRadius = Math.max(26, 26 / canvasZoom);
      for (let i = 0; i < handles.length; i++) {
        const h = handles[i];
        if (h && Math.hypot(coords.x - h.x, coords.y - h.y) < handleHitRadius) {
          isDraggingTransformRef.current = true;
          transformActionTypeRef.current = 'scale';
          scaleHandleIndexRef.current = i;
          transformStartPointerRef.current = coords;
          dragStartPointerRef.current = coords;
          dragStartPivotRef.current = { x: px, y: py };
          dragStartDistRef.current = Math.hypot(coords.x - px, coords.y - py);
          initialItemTransformsRef.current = new Map(
            targetItems.map((it) => [it.id, { ...it.transform }])
          );
          onTransformDragStart?.();
          return;
        }
      }

      // 4. Object Body Dragging: Scale / Zoom Mode vs Move Mode
      if (transformMode === 'scale') {
        isDraggingTransformRef.current = true;
        transformActionTypeRef.current = 'scale';
        transformStartPointerRef.current = coords;
        dragStartPointerRef.current = coords;
        dragStartPivotRef.current = { x: px, y: py };
        dragStartDistRef.current = Math.hypot(coords.x - px, coords.y - py);
        initialItemTransformsRef.current = new Map(
          targetItems.map((it) => [it.id, { ...it.transform }])
        );
        onTransformDragStart?.();
        return;
      }

      // Default: Move Mode (Direct Finger / Mouse Dragging of object)
      isDraggingTransformRef.current = true;
      transformActionTypeRef.current = 'move';
      transformStartPointerRef.current = coords;
      onTransformDragStart?.();
      return;
    }

    // Eyedropper Tool
    if (activeTool === 'eyedropper') {
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return;
      const ctx = mainCanvas.getContext('2d');
      if (!ctx) return;
      const pixel = ctx.getImageData(Math.floor(coords.x), Math.floor(coords.y), 1, 1).data;
      const sampledHex = rgbToHex(pixel[0], pixel[1], pixel[2]);
      onSelectColor(sampledHex);
      setEyedropperFeedback({ color: sampledHex, x: e.clientX, y: e.clientY });
      setTimeout(() => setEyedropperFeedback(null), 1000);
      return;
    }

    // Bucket Fill Tool
    if (activeTool === 'fill') {
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return;
      const ctx = mainCanvas.getContext('2d');
      if (!ctx) return;

      const fillItem = performFloodFill(
        ctx,
        coords.x,
        coords.y,
        fillSettings.fillColor,
        fillSettings.tolerance,
        fillSettings.contiguous
      );

      if (fillItem) {
        fillItem.layerId = project.activeLayerId;
        fillItem.isAlphaLocked = Boolean(activeLayer?.isAlphaLocked);
        const updatedLayers = project.layers.map((layer) => {
          if (layer.id === project.activeLayerId) {
            if (currentFrame !== undefined) {
              return updateLayerArtworkAtFrame(layer, currentFrame, [
                ...getEffectiveLayerItems(layer, currentFrame),
                fillItem,
              ]);
            }
            return {
              ...layer,
              items: [...layer.items, fillItem],
            };
          }
          return layer;
        });
        onUpdateProjectLayers(updatedLayers, true);
      }
      return;
    }

    // Lasso Tool
    if (activeTool === 'lasso') {
      isDrawingRef.current = true;
      lassoPointsRef.current = [coords];
      return;
    }

    // Shape Tool
    if (activeTool === 'shape') {
      isDrawingRef.current = true;
      return;
    }

    // Brush / Pencil / Pen / Marker / Eraser
    if (['brush', 'pencil', 'pen', 'marker', 'eraser'].includes(activeTool)) {
      isDrawingRef.current = true;
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.7;
      currentPointsRef.current = [{ ...coords, pressure }];
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Hand tool pan
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setCanvasPan({
        x: initialSinglePanRef.current.x + dx,
        y: initialSinglePanRef.current.y + dy,
      });
      return;
    }

    // Check if movement exceeds threshold to cancel long-press eyedropper
    if (longPressStartPosRef.current && longPressTimerRef.current) {
      const dx = Math.abs(e.clientX - longPressStartPosRef.current.clientX);
      const dy = Math.abs(e.clientY - longPressStartPosRef.current.clientY);
      if (dx > 12 || dy > 12) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    let coords = clientToCanvasCoords(e.clientX, e.clientY);
    if (activeRuler && activeRuler !== 'off') {
      const cx = project.width / 2;
      const cy = project.height / 2;
      if (activeRuler === 'parallel') {
        coords = { ...coords, y: Math.round(coords.y / 25) * 25 };
      } else if (activeRuler === 'concentric') {
        const dx = coords.x - cx;
        const dy = coords.y - cy;
        const dist = Math.hypot(dx, dy);
        const snappedR = Math.round(dist / 25) * 25;
        const angle = Math.atan2(dy, dx);
        coords = { x: cx + Math.cos(angle) * snappedR, y: cy + Math.sin(angle) * snappedR };
      } else if (activeRuler === 'radial') {
        const dx = coords.x - cx;
        const dy = coords.y - cy;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const step = Math.PI / 8;
        const snappedAngle = Math.round(angle / step) * step;
        coords = { x: cx + Math.cos(snappedAngle) * dist, y: cy + Math.sin(snappedAngle) * dist };
      }
    }

    // Bezier Curve node dragging or line translation
    if (activeTool === 'curve' && curveMode === 'bezier') {
      if (draggedNodeIndexRef.current !== null) {
        const idx = draggedNodeIndexRef.current;
        setCurveRawPoints((prev) => {
          const next = [...prev];
          next[idx] = coords;
          return next;
        });
        return;
      }

      if (isDraggingCurveLineRef.current && curveDragStartPosRef.current && curveDragStartNodesRef.current) {
        const dx = coords.x - curveDragStartPosRef.current.x;
        const dy = coords.y - curveDragStartPosRef.current.y;
        setCurveRawPoints(
          curveDragStartNodesRef.current.map((pt) => ({
            x: pt.x + dx,
            y: pt.y + dy,
          }))
        );
        return;
      }

      if (pendingNewNodeRef.current) {
        const dx = Math.abs(e.clientX - pendingNewNodeRef.current.startClientX);
        const dy = Math.abs(e.clientY - pendingNewNodeRef.current.startClientY);
        if (dx > 6 || dy > 6) {
          pendingNewNodeRef.current = null;
        }
      }
    }

    // Dragging Pivot Point
    if (isDraggingPivotRef.current) {
      setPivotPoint({ x: coords.x, y: coords.y });
      return;
    }

    // Dragging Transform (Move, Rotate, Scale)
    if (isDraggingTransformRef.current && transformStartPointerRef.current && selectionBBox) {
      const start = transformStartPointerRef.current;
      const dx = coords.x - start.x;
      const dy = coords.y - start.y;

      const px = pivotPoint ? pivotPoint.x : selectionBBox.pivotPoint.x;
      const py = pivotPoint ? pivotPoint.y : selectionBBox.pivotPoint.y;

      const effectiveItems =
        currentFrame !== undefined && activeLayer
          ? getEffectiveLayerItems(activeLayer, currentFrame)
          : activeLayer?.items || [];

      const targetIds =
        selectedItemIds.length > 0
          ? selectedItemIds
          : effectiveItems.map((i) => i.id);

      if (transformActionTypeRef.current === 'move') {
        const updatedLayers = project.layers.map((layer) => {
          if (layer.id === project.activeLayerId) {
            if (currentFrame !== undefined) {
              return transformLayerItemsAtFrame(layer, currentFrame, targetIds, (item) => ({
                ...item,
                transform: {
                  ...item.transform,
                  x: item.transform.x + dx,
                  y: item.transform.y + dy,
                },
              }));
            }
            return {
              ...layer,
              items: layer.items.map((item) => {
                if (targetIds.includes(item.id)) {
                  return {
                    ...item,
                    transform: {
                      ...item.transform,
                      x: item.transform.x + dx,
                      y: item.transform.y + dy,
                    },
                  };
                }
                return item;
              }),
            };
          }
          return layer;
        });
        onUpdateProjectLayers(updatedLayers, false);
        if (pivotPoint) {
          setPivotPoint({ x: pivotPoint.x + dx, y: pivotPoint.y + dy });
        }
        transformStartPointerRef.current = coords;
      } else if (transformActionTypeRef.current === 'rotate') {
        const pivot = dragStartPivotRef.current || { x: px, y: py };
        const startPt = dragStartPointerRef.current || start;
        const initialAngle = Math.atan2(startPt.y - pivot.y, startPt.x - pivot.x);
        const currentAngle = Math.atan2(coords.y - pivot.y, coords.x - pivot.x);
        const angleDelta = currentAngle - initialAngle;

        const updatedLayers = project.layers.map((layer) => {
          if (layer.id === project.activeLayerId) {
            if (currentFrame !== undefined) {
              return transformLayerItemsAtFrame(layer, currentFrame, targetIds, (item) => {
                const initTf = initialItemTransformsRef.current?.get(item.id) || item.transform;
                return {
                  ...item,
                  transform: {
                    ...item.transform,
                    rotation: initTf.rotation + angleDelta,
                  },
                };
              });
            }
            return {
              ...layer,
              items: layer.items.map((item) => {
                if (targetIds.includes(item.id)) {
                  const initTf = initialItemTransformsRef.current?.get(item.id) || item.transform;
                  return {
                    ...item,
                    transform: {
                      ...item.transform,
                      rotation: initTf.rotation + angleDelta,
                    },
                  };
                }
                return item;
              }),
            };
          }
          return layer;
        });
        onUpdateProjectLayers(updatedLayers, false);
      } else if (transformActionTypeRef.current === 'scale') {
        const pivot = dragStartPivotRef.current || { x: px, y: py };
        const initialDist = dragStartDistRef.current || 50;
        const currentDist = Math.hypot(coords.x - pivot.x, coords.y - pivot.y);

        let scaleMultiplier = 1;
        if (initialDist > 10) {
          scaleMultiplier = currentDist / initialDist;
        } else if (dragStartPointerRef.current) {
          const deltaX = coords.x - dragStartPointerRef.current.x;
          scaleMultiplier = Math.max(0.1, 1 + deltaX / 120);
        }

        const updatedLayers = project.layers.map((layer) => {
          if (layer.id === project.activeLayerId) {
            if (currentFrame !== undefined) {
              return transformLayerItemsAtFrame(layer, currentFrame, targetIds, (item) => {
                const initTf = initialItemTransformsRef.current?.get(item.id) || item.transform;
                const newScaleX = Math.max(0.05, Math.min(20, initTf.scaleX * scaleMultiplier));
                const newScaleY = Math.max(0.05, Math.min(20, initTf.scaleY * scaleMultiplier));
                return {
                  ...item,
                  transform: {
                    ...item.transform,
                    scaleX: newScaleX,
                    scaleY: newScaleY,
                  },
                };
              });
            }
            return {
              ...layer,
              items: layer.items.map((item) => {
                if (targetIds.includes(item.id)) {
                  const initTf = initialItemTransformsRef.current?.get(item.id) || item.transform;
                  const newScaleX = Math.max(0.05, Math.min(20, initTf.scaleX * scaleMultiplier));
                  const newScaleY = Math.max(0.05, Math.min(20, initTf.scaleY * scaleMultiplier));
                  return {
                    ...item,
                    transform: {
                      ...item.transform,
                      scaleX: newScaleX,
                      scaleY: newScaleY,
                    },
                  };
                }
                return item;
              }),
            };
          }
          return layer;
        });
        onUpdateProjectLayers(updatedLayers, false);
      }
      return;
    }

    if (!isDrawingRef.current) return;

    // Drawing Freehand Curve
    if (activeTool === 'curve' && curveMode === 'freehand') {
      freehandCurvePointsRef.current.push(coords);
      const scratch = scratchCanvasRef.current;
      if (!scratch) return;
      const sCtx = scratch.getContext('2d');
      if (!sCtx) return;
      sCtx.clearRect(0, 0, scratch.width, scratch.height);

      const previewCurve: CurveItem = {
        id: 'live_curve',
        type: 'curve',
        curveMode: 'freehand',
        points: freehandCurvePointsRef.current.map((p) => ({ x: p.x, y: p.y })),
        strokeColor: curveSettings.strokeColor,
        strokeWidth: curveSettings.strokeWidth,
        opacity: curveSettings.opacity,
        closed: false,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 },
      };
      renderCurve(sCtx, previewCurve);
      return;
    }

    // Drawing Lasso path
    if (activeTool === 'lasso') {
      lassoPointsRef.current.push(coords);
      return;
    }

    // Drawing Shape preview
    if (activeTool === 'shape' && startPointRef.current) {
      const scratch = scratchCanvasRef.current;
      if (!scratch) return;
      const sCtx = scratch.getContext('2d');
      if (!sCtx) return;
      sCtx.clearRect(0, 0, scratch.width, scratch.height);

      const previewShape: ShapeItem = {
        id: 'preview',
        type: 'shape',
        shapeType: shapeSettings.shapeType,
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        endX: coords.x,
        endY: coords.y,
        strokeColor: shapeSettings.strokeColor,
        fillColor: shapeSettings.fillColor,
        strokeWidth: shapeSettings.strokeWidth,
        opacity: shapeSettings.opacity,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 },
      };
      renderShape(sCtx, previewShape);
      return;
    }

    // Drawing Active Brush / Eraser Stroke with 60fps scratchpad
    if (['brush', 'pencil', 'pen', 'marker', 'eraser'].includes(activeTool)) {
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.7;
      currentPointsRef.current.push({ ...coords, pressure });

      const scratch = scratchCanvasRef.current;
      if (!scratch) return;
      const sCtx = scratch.getContext('2d');
      if (!sCtx) return;
      sCtx.clearRect(0, 0, scratch.width, scratch.height);

      const isEraser = activeTool === 'eraser';
      const liveStroke: StrokeItem = {
        id: 'live',
        type: 'stroke',
        layerId: project.activeLayerId,
        brushType: isEraser ? 'brush' : brushSettings.type,
        points: currentPointsRef.current,
        strokeColor: isEraser ? 'rgba(0,0,0,1)' : currentColor,
        strokeWidth: isEraser ? eraserSize * 1.4 : brushSettings.size,
        opacity: isEraser ? eraserOpacity : brushSettings.opacity,
        hardness: brushSettings.hardness,
        smoothing: brushSettings.smoothing,
        pressureSensitivity: brushSettings.pressureSensitivity,
        isEraser,
        isAlphaLocked: Boolean(activeLayer?.isAlphaLocked),
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 0, pivotY: 0 },
      };

      if (isEraser) {
        // Real-time instant erasing directly on main canvas offscreen layer buffer
        const mainCanvas = mainCanvasRef.current;
        if (mainCanvas) {
          const ctx = mainCanvas.getContext('2d');
          if (ctx) {
            renderCanvas(
              ctx,
              project.width,
              project.height,
              project.layers,
              project.backgroundColor,
              project.referenceImage,
              true,
              animationStates,
              currentFrame,
              liveStroke
            );
          }
        }
      } else {
        // If active layer has Alpha Lock enabled: live preview clips to existing layer pixels
        if (activeLayer?.isAlphaLocked) {
          const layerBuf = renderLayerToBuffer(activeLayer, project.width, project.height);
          sCtx.drawImage(layerBuf, 0, 0);
          sCtx.globalCompositeOperation = 'source-atop';
          renderStroke(sCtx, liveStroke);
        } else {
          renderStroke(sCtx, liveStroke);
        }
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDraggingPivotRef.current || isDraggingTransformRef.current) {
      onTransformDragEnd?.();
    }
    isDraggingPivotRef.current = false;
    isDraggingTransformRef.current = false;
    transformActionTypeRef.current = null;
    scaleHandleIndexRef.current = null;
    dragStartPointerRef.current = null;
    dragStartPivotRef.current = null;
    dragStartDistRef.current = null;
    initialItemTransformsRef.current = null;

    // Handle Bezier Curve node/line drag release & tap point placement
    if (activeTool === 'curve' && curveMode === 'bezier') {
      if (draggedNodeIndexRef.current !== null) {
        draggedNodeIndexRef.current = null;
        setDraggedNodeIndex(null);
      }
      if (isDraggingCurveLineRef.current) {
        isDraggingCurveLineRef.current = false;
        curveDragStartPosRef.current = null;
        curveDragStartNodesRef.current = null;
      }

      if (pendingNewNodeRef.current) {
        const newPt = pendingNewNodeRef.current.point;
        setCurveRawPoints((prev) => [...prev, newPt]);
        pendingNewNodeRef.current = null;
      }
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const coords = clientToCanvasCoords(e.clientX, e.clientY);

    // Finalize Freehand Curve
    if (activeTool === 'curve' && curveMode === 'freehand') {
      const scratch = scratchCanvasRef.current;
      if (scratch) {
        scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
      }

      if (freehandCurvePointsRef.current.length > 1) {
        const bbox = getBoundingBox(freehandCurvePointsRef.current);
        const newCurve: CurveItem = {
          id: `curve_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'curve',
          layerId: project.activeLayerId,
          curveMode: 'freehand',
          points: freehandCurvePointsRef.current.map((p) => ({ x: p.x, y: p.y })),
          strokeColor: curveSettings.strokeColor,
          strokeWidth: curveSettings.strokeWidth,
          opacity: curveSettings.opacity,
          closed: false,
          isAlphaLocked: Boolean(activeLayer?.isAlphaLocked),
          transform: {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            pivotX: (bbox.minX + bbox.maxX) / 2,
            pivotY: (bbox.minY + bbox.maxY) / 2,
          },
          boundingBox: bbox,
        };

        const updatedLayers = project.layers.map((layer) => {
          if (layer.id === project.activeLayerId) {
            if (currentFrame !== undefined) {
              return updateLayerArtworkAtFrame(layer, currentFrame, [
                ...getEffectiveLayerItems(layer, currentFrame),
                newCurve,
              ]);
            }
            return { ...layer, items: [...layer.items, newCurve] };
          }
          return layer;
        });
        onUpdateProjectLayers(updatedLayers, true);
        freehandCurvePointsRef.current = [];
      }
      return;
    }

    // Finalize Lasso Selection
    if (activeTool === 'lasso') {
      if (lassoPointsRef.current.length > 2) {
        const hitItemIds: string[] = [];
        const layerItems = currentFrame !== undefined && activeLayer ? getEffectiveLayerItems(activeLayer, currentFrame) : (activeLayer?.items || []);
        for (const item of layerItems) {
          if (item.boundingBox) {
            const center: Point = {
              x: (item.boundingBox.minX + item.boundingBox.maxX) / 2,
              y: (item.boundingBox.minY + item.boundingBox.maxY) / 2,
            };
            if (isPointInPolygon(center, lassoPointsRef.current)) {
              hitItemIds.push(item.id);
            }
          }
        }
        setSelectedItemIds(hitItemIds);
        lassoPointsRef.current = [];
      }
      return;
    }

    // Finalize Shape
    if (activeTool === 'shape' && startPointRef.current) {
      const scratch = scratchCanvasRef.current;
      if (scratch) {
        scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
      }

      const minX = Math.min(startPointRef.current.x, coords.x);
      const minY = Math.min(startPointRef.current.y, coords.y);
      const maxX = Math.max(startPointRef.current.x, coords.x);
      const maxY = Math.max(startPointRef.current.y, coords.y);

      const newShape: ShapeItem = {
        id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'shape',
        layerId: project.activeLayerId,
        shapeType: shapeSettings.shapeType,
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        endX: coords.x,
        endY: coords.y,
        strokeColor: shapeSettings.strokeColor,
        fillColor: shapeSettings.fillColor,
        strokeWidth: shapeSettings.strokeWidth,
        opacity: shapeSettings.opacity,
        isAlphaLocked: Boolean(activeLayer?.isAlphaLocked),
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

      const updatedLayers = project.layers.map((layer) => {
        if (layer.id === project.activeLayerId) {
          if (currentFrame !== undefined) {
            return updateLayerArtworkAtFrame(layer, currentFrame, [
              ...getEffectiveLayerItems(layer, currentFrame),
              newShape,
            ]);
          }
          return { ...layer, items: [...layer.items, newShape] };
        }
        return layer;
      });
      onUpdateProjectLayers(updatedLayers, true);
      startPointRef.current = null;
      return;
    }

    // Finalize Brush or Real Eraser Stroke
    if (['brush', 'pencil', 'pen', 'marker', 'eraser'].includes(activeTool)) {
      const scratch = scratchCanvasRef.current;
      if (scratch) {
        scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
      }

      if (currentPointsRef.current.length > 0) {
        const bbox = getBoundingBox(currentPointsRef.current);
        const isEraser = activeTool === 'eraser';

        const newStroke: StrokeItem = {
          id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'stroke',
          layerId: project.activeLayerId,
          brushType: isEraser ? 'brush' : brushSettings.type,
          points: [...currentPointsRef.current],
          strokeColor: isEraser ? 'rgba(0,0,0,1)' : currentColor,
          strokeWidth: isEraser ? eraserSize * 1.4 : brushSettings.size,
          opacity: isEraser ? eraserOpacity : brushSettings.opacity,
          hardness: brushSettings.hardness,
          smoothing: brushSettings.smoothing,
          pressureSensitivity: brushSettings.pressureSensitivity,
          isEraser,
          isAlphaLocked: Boolean(activeLayer?.isAlphaLocked),
          transform: {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            pivotX: (bbox.minX + bbox.maxX) / 2,
            pivotY: (bbox.minY + bbox.maxY) / 2,
          },
          boundingBox: bbox,
        };

        const updatedLayers = project.layers.map((layer) => {
          if (layer.id === project.activeLayerId) {
            if (currentFrame !== undefined) {
              return updateLayerArtworkAtFrame(layer, currentFrame, [
                ...getEffectiveLayerItems(layer, currentFrame),
                newStroke,
              ]);
            }
            return {
              ...layer,
              items: [...layer.items, newStroke],
            };
          }
          return layer;
        });
        onUpdateProjectLayers(updatedLayers, true);
        currentPointsRef.current = [];
      }
    }
  };

  // Multi-Touch Gestures (2-Finger Pan in all directions, Pinch Zoom, 2-Finger Rotation, 2/3 Tap Undo/Redo)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      initialPinchDistRef.current = dist;
      initialPinchAngleRef.current = angle;
      initialPinchCenterRef.current = { x: midX, y: midY };
      initialZoomRef.current = canvasZoom;
      initialPanRef.current = { ...canvasPan };
      initialRotationRef.current = canvasRotation;

      if (activeTool === 'transform' && selectionBBox) {
        const effectiveItems =
          currentFrame !== undefined && activeLayer
            ? getEffectiveLayerItems(activeLayer, currentFrame)
            : activeLayer?.items || [];
        const targetIds =
          selectedItemIds.length > 0
            ? selectedItemIds
            : effectiveItems.map((i) => i.id);
        const targetItems = effectiveItems.filter((i) => targetIds.includes(i.id));
        initialItemTransformsRef.current = new Map(
          targetItems.map((it) => [it.id, { ...it.transform }])
        );
      }

      // Cancel drawing gesture while multi-touch navigating
      isDrawingRef.current = false;
      currentPointsRef.current = [];
      scratchCanvasRef.current?.getContext('2d')?.clearRect(0, 0, project.width, project.height);
    } else if (e.touches.length === 3) {
      onRedo();
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (
      e.touches.length === 2 &&
      initialPinchDistRef.current !== null &&
      initialPinchCenterRef.current !== null
    ) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      // In Transform mode: 2-finger pinch directly scales the selected object smoothly
      if (
        activeTool === 'transform' &&
        selectionBBox &&
        initialItemTransformsRef.current &&
        initialItemTransformsRef.current.size > 0
      ) {
        const scaleMultiplier = dist / initialPinchDistRef.current;
        const effectiveItems =
          currentFrame !== undefined && activeLayer
            ? getEffectiveLayerItems(activeLayer, currentFrame)
            : activeLayer?.items || [];
        const targetIds =
          selectedItemIds.length > 0
            ? selectedItemIds
            : effectiveItems.map((i) => i.id);

        const updatedLayers = project.layers.map((layer) => {
          if (layer.id === project.activeLayerId) {
            if (currentFrame !== undefined) {
              return transformLayerItemsAtFrame(layer, currentFrame, targetIds, (item) => {
                const initTf = initialItemTransformsRef.current?.get(item.id) || item.transform;
                return {
                  ...item,
                  transform: {
                    ...item.transform,
                    scaleX: Math.max(0.05, Math.min(20, initTf.scaleX * scaleMultiplier)),
                    scaleY: Math.max(0.05, Math.min(20, initTf.scaleY * scaleMultiplier)),
                  },
                };
              });
            }
            return {
              ...layer,
              items: layer.items.map((item) => {
                if (targetIds.includes(item.id)) {
                  const initTf = initialItemTransformsRef.current?.get(item.id) || item.transform;
                  return {
                    ...item,
                    transform: {
                      ...item.transform,
                      scaleX: Math.max(0.05, Math.min(20, initTf.scaleX * scaleMultiplier)),
                      scaleY: Math.max(0.05, Math.min(20, initTf.scaleY * scaleMultiplier)),
                    },
                  };
                }
                return item;
              }),
            };
          }
          return layer;
        });
        onUpdateProjectLayers(updatedLayers, false);
        return;
      }

      // 1. Smooth Canvas Pinch Zoom anchored around finger midpoint (focal point)
      const scaleDelta = dist / initialPinchDistRef.current;
      const targetZoom = initialZoomRef.current * scaleDelta;

      const currentCamera: CameraState = {
        panX: initialPanRef.current.x + (midX - initialPinchCenterRef.current.x),
        panY: initialPanRef.current.y + (midY - initialPinchCenterRef.current.y),
        zoom: initialZoomRef.current,
        rotation: initialRotationRef.current,
      };

      const updatedCamera = zoomAroundScreenPoint(
        targetZoom,
        midX,
        midY,
        rect,
        project.width,
        project.height,
        currentCamera
      );

      // 2. 2-Finger Rotation
      const deltaAngle = angle - (initialPinchAngleRef.current || 0);
      let newRotation = updatedCamera.rotation;
      if (Math.abs(deltaAngle) > 0.08) {
        newRotation = initialRotationRef.current + deltaAngle;
      }

      setCanvasZoom(updatedCamera.zoom);
      setCanvasPan({ x: updatedCamera.panX, y: updatedCamera.panY });
      setCanvasRotation(newRotation);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      initialPinchDistRef.current = null;
      initialPinchAngleRef.current = null;
      initialPinchCenterRef.current = null;
    }
  };

  // Wheel & Trackpad Pinch Zoom & Pan Listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();

      // In Transform mode: scrolling the mouse wheel smoothly scales/zooms the selected object around its pivot!
      if (activeTool === 'transform' && selectionBBox) {
        const zoomDelta = e.deltaY < 0 ? 1.05 : 0.95;
        const effectiveItems =
          currentFrame !== undefined && activeLayer
            ? getEffectiveLayerItems(activeLayer, currentFrame)
            : activeLayer?.items || [];
        const targetIds =
          selectedItemIds.length > 0
            ? selectedItemIds
            : effectiveItems.map((i) => i.id);

        if (targetIds.length > 0) {
          const updatedLayers = project.layers.map((layer) => {
            if (layer.id === project.activeLayerId) {
              if (currentFrame !== undefined) {
                return transformLayerItemsAtFrame(layer, currentFrame, targetIds, (item) => ({
                  ...item,
                  transform: {
                    ...item.transform,
                    scaleX: Math.max(0.05, Math.min(20, item.transform.scaleX * zoomDelta)),
                    scaleY: Math.max(0.05, Math.min(20, item.transform.scaleY * zoomDelta)),
                  },
                }));
              }
              return {
                ...layer,
                items: layer.items.map((item) => {
                  if (targetIds.includes(item.id)) {
                    return {
                      ...item,
                      transform: {
                        ...item.transform,
                        scaleX: Math.max(0.05, Math.min(20, item.transform.scaleX * zoomDelta)),
                        scaleY: Math.max(0.05, Math.min(20, item.transform.scaleY * zoomDelta)),
                      },
                    };
                  }
                  return item;
                }),
              };
            }
            return layer;
          });
          onUpdateProjectLayers(updatedLayers, false);
          return;
        }
      }

      // Smooth Canvas Zoom around mouse pointer (for mouse wheel or trackpad pinch)
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const currentCamera: CameraState = {
        panX: canvasPan.x,
        panY: canvasPan.y,
        zoom: canvasZoom,
        rotation: canvasRotation,
      };

      const updatedCamera = zoomAroundScreenPoint(
        Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentCamera.zoom * zoomFactor)),
        e.clientX,
        e.clientY,
        rect,
        project.width,
        project.height,
        currentCamera
      );

      setCanvasZoom(updatedCamera.zoom);
      setCanvasPan({ x: updatedCamera.panX, y: updatedCamera.panY });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [
    canvasPan.x,
    canvasPan.y,
    canvasZoom,
    canvasRotation,
    project.width,
    project.height,
    setCanvasZoom,
    setCanvasPan,
    activeTool,
    selectionBBox,
    activeLayer,
    currentFrame,
    selectedItemIds,
    project.layers,
    onUpdateProjectLayers,
  ]);

  // Check if active layer contains any image items
  const activeLayerImageItem = activeLayer?.items.find((item) => item.type === 'image') as ImageItem | undefined;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        handlePointerMove(e);
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        setPointerPosition(coords);
      }}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => setPointerPosition(null)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative flex-1 w-full h-full overflow-hidden bg-[#111622] cursor-none touch-none select-none flex items-center justify-center overscroll-none"
    >
      {/* Aspect Ratio & Zoom Floating Badge */}
      <div className="absolute bottom-3 left-3 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-full text-[11px] font-mono font-medium text-slate-300 shadow-xl flex items-center gap-2 pointer-events-auto">
        <span className="text-blue-400 font-bold">{project.aspectRatio || '1:1'}</span>
        <span className="text-slate-600">•</span>
        <span>{project.width}×{project.height}</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-200">{Math.round(canvasZoom * 100)}%</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            autoFitCanvas();
          }}
          className="ml-1 text-[10px] font-sans font-bold bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 px-2 py-0.5 rounded-md transition-colors"
          title="Fit to screen"
        >
          Fit
        </button>
      </div>

      {/* Eyedropper Live Loupe Feedback */}
      {eyedropperFeedback && (
        <div
          style={{ left: eyedropperFeedback.x, top: eyedropperFeedback.y - 70 }}
          className="fixed z-50 -translate-x-1/2 pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-90 duration-150"
        >
          <div
            className="w-14 h-14 rounded-full border-4 border-white shadow-2xl flex items-center justify-center ring-4 ring-black/30"
            style={{ backgroundColor: eyedropperFeedback.color }}
          >
            <Pipette className="w-5 h-5 text-white drop-shadow-md" />
          </div>
          <div className="bg-slate-900/90 text-[10px] font-mono text-white px-2 py-0.5 rounded-md mt-1 border border-slate-700 shadow-md">
            {eyedropperFeedback.color}
          </div>
        </div>
      )}

      {/* Floating Active Layer Reference Badge */}
      {activeLayerImageItem && (
        <div
          onClick={onOpenReferenceModal}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-3 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-full text-xs font-semibold text-slate-200 shadow-xl cursor-pointer hover:bg-slate-800 transition-all flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Layer Reference: {Math.round(activeLayerImageItem.opacity * 100)}%</span>
        </div>
      )}

      {/* Locked Layer Notice Badge */}
      {lockedNotice && (
        <div className="absolute top-14 z-50 bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-xs animate-bounce pointer-events-none">
          <Lock className="w-3.5 h-3.5 fill-current" />
          <span>Active layer is locked! Unlock to draw or edit.</span>
        </div>
      )}



      {/* Bottom Floating Curve Action Bar (Ibis Paint X Trash & Green Checkmark Pill) */}
      {activeTool === 'curve' && curveMode === 'bezier' && curveRawPoints.length > 0 && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-6 text-white">
            {/* Trash Icon: Delete last placed point */}
            <button
              onClick={() => setCurveRawPoints((prev) => prev.slice(0, -1))}
              className="p-2.5 rounded-full bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700/50 hover:border-red-500/50 transition-all flex items-center justify-center active:scale-95"
              title="Delete last point"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Green Checkmark Icon: Confirm & Bake curve onto active layer */}
            <button
              onClick={handleFinishCurve}
              disabled={curveRawPoints.length < 2}
              className={`p-2.5 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                curveRawPoints.length >= 2
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/40'
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-800'
              }`}
              title="Confirm & bake curve"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Transformed Canvas Viewport with Pan, Zoom, and Rotation */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom}) rotate(${canvasRotation}rad)`,
          transformOrigin: 'center center',
          width: project.width,
          height: project.height,
        }}
        className="shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] ring-1 ring-slate-700/60 rounded-[2px] transition-transform duration-75 bg-white overflow-hidden pointer-events-auto"
      >
        <canvas
          ref={mainCanvasRef}
          width={project.width}
          height={project.height}
          className="absolute inset-0 w-full h-full"
        />

        <canvas
          ref={scratchCanvasRef}
          width={project.width}
          height={project.height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        <canvas
          ref={overlayCanvasRef}
          width={project.width}
          height={project.height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        {/* Brush Size Cursor Overlay */}
        {pointerPosition && ['brush', 'pencil', 'pen', 'marker', 'eraser', 'curve', 'shape'].includes(activeTool) && (
          <div
            className="pointer-events-none absolute z-50 rounded-full border border-white mix-blend-difference shadow-[0_0_0_1px_black]"
            style={{
              left: `${pointerPosition.x}px`,
              top: `${pointerPosition.y}px`,
              width: `${(activeTool === 'eraser' ? eraserSize : brushSettings.size) * 2}px`,
              height: `${(activeTool === 'eraser' ? eraserSize : brushSettings.size) * 2}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>
    </div>
  );
};
