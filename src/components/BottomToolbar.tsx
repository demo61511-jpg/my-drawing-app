import React from 'react';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  LassoSelect,
  Move,
  Shapes,
  Layers,
  Spline,
  Pipette,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ToolType, BrushSettings, CurveSettings, ShapeSettings, BrushType } from '../types/canvas';

interface BottomToolbarProps {
  activeTool: ToolType;
  currentColor: string;
  onSelectColor: (color: string) => void;
  layerCount: number;
  brushSettings: BrushSettings;
  onUpdateBrushSettings: (settings: Partial<BrushSettings>) => void;
  eraserSize: number;
  onUpdateEraserSize: (size: number) => void;
  eraserOpacity: number;
  onUpdateEraserOpacity: (opacity: number) => void;
  curveSettings: CurveSettings;
  onUpdateCurveSettings: (settings: Partial<CurveSettings>) => void;
  shapeSettings: ShapeSettings;
  onUpdateShapeSettings: (settings: Partial<ShapeSettings>) => void;
  onSelectTool: (tool: ToolType) => void;
  onOpenBrushSettings: () => void;
  onOpenColorPicker: () => void;
  onOpenLayersModal: () => void;
  onOpenShapeModal: () => void;
  onOpenFillProperties: () => void;
  onOpenCurveSettings: () => void;
  onActivateEyedropper: () => void;
}

const QUICK_COLORS = [
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#22C55E', // Green
  '#EAB308', // Yellow
  '#A855F7', // Purple
  '#000000', // Black
  '#FFFFFF', // White
];

const BRUSH_TYPES: BrushType[] = ['brush', 'pencil', 'pen', 'marker', 'airbrush', 'calligraphy'];

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  activeTool,
  currentColor,
  onSelectColor,
  layerCount,
  brushSettings,
  onUpdateBrushSettings,
  eraserSize,
  onUpdateEraserSize,
  eraserOpacity,
  onUpdateEraserOpacity,
  curveSettings,
  onUpdateCurveSettings,
  shapeSettings,
  onUpdateShapeSettings,
  onSelectTool,
  onOpenBrushSettings,
  onOpenColorPicker,
  onOpenLayersModal,
  onOpenShapeModal,
  onOpenFillProperties,
  onOpenCurveSettings,
  onActivateEyedropper,
}) => {
  // Determine current active tool settings for the tool size & opacity strip
  const isEraser = activeTool === 'eraser';
  const isCurve = activeTool === 'curve';
  const isShape = activeTool === 'shape';
  const isBrushLike = ['brush', 'pencil', 'pen', 'marker'].includes(activeTool);

  const showSettingsStrip = isBrushLike || isEraser || isCurve || isShape;

  // Active Size and Opacity values
  let currentSize = brushSettings.size;
  let currentOpacity = brushSettings.opacity;
  let toolLabel = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);

  if (isEraser) {
    currentSize = eraserSize;
    currentOpacity = eraserOpacity;
    toolLabel = 'Eraser';
  } else if (isCurve) {
    currentSize = curveSettings.strokeWidth;
    currentOpacity = curveSettings.opacity;
    toolLabel = 'Curve';
  } else if (isShape) {
    currentSize = shapeSettings.strokeWidth;
    currentOpacity = shapeSettings.opacity;
    toolLabel = `Shape (${shapeSettings.shapeType})`;
  } else if (isBrushLike) {
    toolLabel = brushSettings.type.charAt(0).toUpperCase() + brushSettings.type.slice(1);
  }

  const handleSizeChange = (val: number) => {
    if (isEraser) {
      onUpdateEraserSize(val);
    } else {
      onUpdateBrushSettings({ size: val });
      onUpdateCurveSettings({ strokeWidth: val });
      onUpdateShapeSettings({ strokeWidth: val });
    }
  };

  const handleOpacityChange = (val: number) => {
    if (isEraser) {
      onUpdateEraserOpacity(val);
    } else {
      onUpdateBrushSettings({ opacity: val });
      onUpdateCurveSettings({ opacity: val });
      onUpdateShapeSettings({ opacity: val });
    }
  };

  const cycleBrushType = (direction: 'prev' | 'next') => {
    const curIdx = BRUSH_TYPES.indexOf(brushSettings.type);
    const nextIdx =
      direction === 'next'
        ? (curIdx + 1) % BRUSH_TYPES.length
        : (curIdx - 1 + BRUSH_TYPES.length) % BRUSH_TYPES.length;
    onUpdateBrushSettings({ type: BRUSH_TYPES[nextIdx] });
  };

  return (
    <div
      className="flex flex-col w-full z-30 select-none bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-2xl"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >


      {/* 2. Main Navigation Bar (Mockup Items: Brush, Eraser, Fill, Curve, Lasso, Transform, Shape, Layers) */}
      <nav className="h-16 pb-[env(safe-area-inset-bottom)] px-1 sm:px-4 flex items-center justify-around overflow-x-auto no-scrollbar">
        {/* 1. Brush */}
        <button
          onClick={() => {
            if (activeTool === 'brush') {
              onOpenBrushSettings();
            } else {
              onSelectTool('brush');
            }
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
            ['brush', 'pencil', 'pen', 'marker'].includes(activeTool)
              ? 'text-blue-500 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Paintbrush className="w-5 h-5" />
          <span className="text-[10px]">Brush</span>
        </button>

        {/* 2. Eraser */}
        <button
          onClick={() => onSelectTool('eraser')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'eraser' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eraser className="w-5 h-5" />
          <span className="text-[10px]">Eraser</span>
        </button>

        {/* 3. Fill */}
        <button
          onClick={() => {
            if (activeTool === 'fill') {
              onOpenFillProperties();
            } else {
              onSelectTool('fill');
            }
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'fill' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PaintBucket className="w-5 h-5" />
          <span className="text-[10px]">Fill</span>
        </button>

        {/* 4. Curve Tool */}
        <button
          onClick={() => {
            if (activeTool === 'curve') {
              onOpenCurveSettings();
            } else {
              onSelectTool('curve');
            }
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'curve' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Spline className="w-5 h-5" />
          <span className="text-[10px]">Curve</span>
        </button>

        {/* 5. Lasso */}
        <button
          onClick={() => onSelectTool('lasso')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'lasso' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LassoSelect className="w-5 h-5" />
          <span className="text-[10px]">Lasso</span>
        </button>

        {/* 6. Transform */}
        <button
          onClick={() => onSelectTool('transform')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'transform' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Move className="w-5 h-5" />
          <span className="text-[10px]">Transform</span>
        </button>

        {/* 7. Shape */}
        <button
          onClick={() => {
            onSelectTool('shape');
            onOpenShapeModal();
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'shape' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shapes className="w-5 h-5" />
          <span className="text-[10px]">Shape</span>
        </button>

        {/* 8. Layers Panel Button */}
        <button
          onClick={onOpenLayersModal}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-slate-400 hover:text-white transition-all relative shrink-0"
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {layerCount}
            </span>
          </div>
          <span className="text-[10px]">Layers</span>
        </button>
      </nav>
    </div>
  );
};
