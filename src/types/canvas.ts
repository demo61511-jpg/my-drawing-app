export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface TransformState {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // in radians
  pivotX: number; // custom pivot relative to item center or absolute
  pivotY: number;
}

export type BrushType = 'pencil' | 'brush' | 'pen' | 'marker' | 'airbrush' | 'calligraphy';

export interface StrokeItem {
  id: string;
  type: 'stroke';
  layerId?: string;
  brushType: BrushType;
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  hardness: number;
  smoothing: number;
  pressureSensitivity: boolean;
  isEraser?: boolean; // When true, cuts holes through layer using destination-out
  isAlphaLocked?: boolean; // When true, clipped to layer's existing alpha via source-atop
  transform: TransformState;
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface FillItem {
  id: string;
  type: 'fill';
  layerId?: string;
  seedPoint: Point;
  fillColor: string;
  opacity: number;
  tolerance: number;
  contiguous: boolean;
  maskDataUrl?: string;
  regionPoints?: Point[];
  isAlphaLocked?: boolean;
  transform: TransformState;
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
}

export type ShapeType = 'line' | 'circle' | 'rectangle' | 'rounded-rect' | 'star' | 'polygon';

export interface ShapeItem {
  id: string;
  type: 'shape';
  layerId?: string;
  shapeType: ShapeType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  fillColor: string; // 'none' or hex/rgba
  strokeWidth: number;
  opacity: number;
  cornerRadius?: number;
  points?: Point[];
  isAlphaLocked?: boolean;
  transform: TransformState;
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface ImageItem {
  id: string;
  type: 'image';
  layerId?: string;
  url: string;
  opacity: number; // 0 to 1
  width: number;
  height: number;
  isReference?: boolean;
  isAlphaLocked?: boolean;
  transform: TransformState;
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface BezierPoint {
  x: number;
  y: number;
  cp1x?: number; // control point 1
  cp1y?: number;
  cp2x?: number; // control point 2
  cp2y?: number;
}

export interface CurveItem {
  id: string;
  type: 'curve';
  layerId?: string;
  curveMode?: 'bezier' | 'freehand';
  points: BezierPoint[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  closed?: boolean;
  fillColor?: string;
  isAlphaLocked?: boolean;
  transform: TransformState;
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
}

export type CanvasItem = StrokeItem | FillItem | ShapeItem | ImageItem | CurveItem;

export type AnimProperty = 'positionX' | 'positionY' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity' | 'visibility';

export interface Keyframe {
  id: string;
  frame: number; // 0, 1, 2, ...
  value: number; // position in px, scale in factor, rotation in rad/deg, opacity 0-1, visibility 0/1
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'cubic';
}

export interface AnimationTrack {
  id: string;
  layerId: string; // references layer or group ID
  property: AnimProperty;
  keyframes: Keyframe[];
}

export interface LayerGroup {
  id: string;
  name: string;
  parentId?: string; // group inside another group
  expanded?: boolean;
  layerIds: string[]; // IDs of layers inside this group
}

export interface ParentRelationship {
  childLayerId: string;
  parentLayerId: string; // ID of parent layer or group
}

export interface AnimationProjectData {
  fps: number; // 12, 24, 30, 60
  durationFrames: number; // e.g. 120 (5 seconds at 24fps)
  currentFrame: number;
  isPlaying: boolean;
  loop: boolean;
  tracks: AnimationTrack[];
  groups: LayerGroup[];
  parentRelationships: ParentRelationship[];
}

export interface LayerFrame {
  id: string;
  frame: number; // 0, 1, 2, ...
  type: 'keyframe' | 'blank' | 'extended';
  items?: CanvasItem[]; // Specific artwork items for this frame
  hasClassicTween?: boolean; // Classic motion tween between this keyframe and the next keyframe
  transform?: TransformState;
}

export interface LayerItem {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: GlobalCompositeOperation;
  isAlphaLocked?: boolean; // Alpha lock feature
  items: CanvasItem[];
  thumbnailUrl?: string;
  parentId?: string; // Optional ID of parent layer
  groupId?: string; // Optional ID of containing group
  frames?: Record<number, LayerFrame>; // Frame-by-frame artwork and keyframe structure
}

export interface ReferenceImage {
  id: string;
  url: string;
  visible: boolean;
  opacity: number; // 0 to 1
  x: number;
  y: number;
  scale: number;
  rotation: number;
  width: number;
  height: number;
  layerId?: string;
}

export interface Project {
  id: string;
  name: string;
  aspectRatio: string;
  quality: string;
  width: number;
  height: number;
  layers: LayerItem[];
  activeLayerId: string;
  referenceImage?: ReferenceImage | null;
  backgroundColor: string; // e.g. '#ffffff' or 'transparent'
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string;
  animation?: AnimationProjectData; // Animation timeline state
}

export type ToolType =
  | 'pencil'
  | 'brush'
  | 'pen'
  | 'marker'
  | 'eraser'
  | 'fill'
  | 'lasso'
  | 'transform'
  | 'shape'
  | 'curve'
  | 'select'
  | 'eyedropper'
  | 'hand';

export type ActiveModal =
  | 'none'
  | 'new-project'
  | 'brush-settings'
  | 'color-picker'
  | 'layers'
  | 'reference'
  | 'shape-settings'
  | 'curve-settings'
  | 'find-replace'
  | 'fill-properties'
  | 'save-project'
  | 'export-image'
  | 'project-settings'
  | 'ai-chat'
  | 'ai-image-gen'
  | 'animation-settings';

export interface BrushSettings {
  type: BrushType;
  size: number;
  opacity: number;
  hardness: number;
  spacing: number;
  smoothing: number;
  pressureSensitivity: boolean;
}

export interface FillSettings {
  fillColor: string;
  tolerance: number;
  contiguous: boolean;
  antiAliasing: boolean;
}

export interface ShapeSettings {
  shapeType: ShapeType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface CurveSettings {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  closed: boolean;
}

export interface HistoryState {
  layers: LayerItem[];
  activeLayerId: string;
}
