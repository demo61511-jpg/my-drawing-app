import React, { useState } from 'react';
import {
  Paintbrush,
  Eraser,
  Palette,
  Move,
  X,
  Check,
  PaintBucket,
  LassoSelect,
  Minus,
  Plus,
  MinusCircle,
  PlusCircle,
  Shapes,
  Ruler,
  Slash,
  Square,
  Circle,
  Spline,
  Activity,
  Maximize2,
  Wand2,
} from 'lucide-react';
import { ToolType, BrushSettings, BrushType } from '../types/canvas';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '../utils/color';

export type FloatingPanelType = 'none' | 'brush' | 'eraser' | 'color' | 'transform';

interface FloatingToolsOverlayProps {
  isToolbarOpen: boolean;
  activePanel: FloatingPanelType;
  activeTool: ToolType;
  currentColor: string;
  brushSettings: BrushSettings;
  eraserSize: number;
  eraserOpacity: number;
  activeRuler: string;
  activeShape: string;
  selectedEraserModel: string;
  // Transform values
  translateX: number;
  translateY: number;
  scalePercent: number;
  rotationDeg: number;
  // Handlers
  onCloseToolbar: () => void;
  onOpenPanel: (panel: FloatingPanelType) => void;
  onClosePanel: () => void;
  onSelectTool: (tool: ToolType) => void;
  onUpdateBrushSettings: (settings: Partial<BrushSettings>) => void;
  onUpdateEraserSize: (size: number) => void;
  onUpdateEraserOpacity: (opacity: number) => void;
  onSelectRuler: (rulerId: string) => void;
  onSelectShape: (shapeId: string) => void;
  onSelectEraserModel: (modelId: string) => void;
  onSelectColor: (color: string) => void;
  onChangeTranslateX: (val: number) => void;
  onChangeTranslateY: (val: number) => void;
  onChangeScale: (val: number) => void;
  onChangeRotation: (val: number) => void;
  isTransformDragging?: boolean;
}

const BRUSH_TYPES_LIST: { id: BrushType; key: string; label: string; desc: string; previewSvgPath: string }[] = [
  { id: 'pen', key: 'pen', label: 'Dip Pen (Soft)', desc: 'Soft pressure ink stroke', previewSvgPath: 'M 4 16 Q 40 8 116 14' },
  { id: 'brush', key: 'brush', label: 'Dip Pen (Hard)', desc: 'Clean, solid digital ink lines', previewSvgPath: 'M 4 16 Q 40 4 116 16' },
  { id: 'marker', key: 'marker', label: 'Dip Pen (Bleed)', desc: 'Textured bleeding ink edge', previewSvgPath: 'M 4 15 Q 40 2 116 15' },
  { id: 'pencil', key: 'pencil', label: 'Felt Tip Pen (Soft)', desc: 'Textured graphite feel', previewSvgPath: 'M 4 16 Q 40 12 116 16' },
  { id: 'calligraphy', key: 'calligraphy', label: 'Felt Tip Pen (Hard)', desc: 'Consistent marker stroke', previewSvgPath: 'M 4 16 Q 40 10 116 16' },
  { id: 'airbrush', key: 'airbrush_20', label: 'Airbrush (Trapezoid 20%)', desc: 'Light gradient spray', previewSvgPath: 'M 4 16 Q 40 10 116 16' },
  { id: 'airbrush', key: 'airbrush_40', label: 'Airbrush (Trapezoid 40%)', desc: 'Medium gradient spray', previewSvgPath: 'M 4 16 Q 40 10 116 16' },
  { id: 'airbrush', key: 'airbrush_60', label: 'Airbrush (Trapezoid 60%)', desc: 'Heavy gradient spray', previewSvgPath: 'M 4 16 Q 40 10 116 16' },
];

const ERASER_MODELS: { id: string; label: string }[] = [
  { id: 'hard', label: 'Hard Eraser' },
  { id: 'soft', label: 'Soft Eraser' },
  { id: 'vector', label: 'Vector Line Eraser' },
  { id: 'block', label: 'Block Eraser' },
];

const DRAWING_SHAPES = [
  { id: 'off', label: 'Off', icon: Slash },
  { id: 'line', label: 'Straight Line', icon: Slash },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'oval', label: 'Oval', icon: Circle },
  { id: 'polygon', label: 'Polygon', icon: Shapes },
  { id: 'bezier', label: 'Bezier Curve', icon: Spline },
  { id: 'wave', label: 'Wave', icon: Activity },
];

const RULER_MODELS = [
  { id: 'off', label: 'Off' },
  { id: 'parallel', label: 'Parallel Ruler' },
  { id: 'concentric', label: 'Concentric Circles' },
  { id: 'ellipse', label: 'Ellipse Ruler' },
  { id: 'radial', label: 'Radial Starburst' },
];

const PALETTE_SWATCHES = [
  '#000000', '#FFFFFF', '#EF4444', '#F97316',
  '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#EC4899', '#64748B',
  '#78350F', '#047857', '#1E3A8A', '#581C87',
];

export const FloatingToolsOverlay: React.FC<FloatingToolsOverlayProps> = ({
  isToolbarOpen,
  activePanel,
  activeTool,
  currentColor,
  brushSettings,
  eraserSize,
  eraserOpacity,
  activeRuler,
  activeShape,
  selectedEraserModel,
  translateX,
  translateY,
  scalePercent,
  rotationDeg,
  onCloseToolbar,
  onOpenPanel,
  onClosePanel,
  onSelectTool,
  onUpdateBrushSettings,
  onUpdateEraserSize,
  onUpdateEraserOpacity,
  onSelectRuler,
  onSelectShape,
  onSelectEraserModel,
  onSelectColor,
  onChangeTranslateX,
  onChangeTranslateY,
  onChangeScale,
  onChangeRotation,
  isTransformDragging = false,
}) => {
  const [colorTab, setColorTab] = useState<'palette' | 'rgb' | 'hsb'>('palette');
  const [brushSubTab, setBrushSubTab] = useState<'brushType' | 'drawingTools'>('brushType');
  const [isSheetMinimized, setIsSheetMinimized] = useState<boolean>(false);

  // Color RGB & HSB calculations
  const rgb = hexToRgb(currentColor);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const newRgb = { ...rgb, [channel]: val };
    onSelectColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleHsbChange = (channel: 'h' | 's' | 'b', val: number) => {
    let newH = hsv.h;
    let newS = hsv.s;
    let newV = hsv.v;
    if (channel === 'h') newH = val;
    if (channel === 's') newS = val;
    if (channel === 'b') newV = val;

    const newRgb = hsvToRgb(newH, newS, newV);
    onSelectColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  return (
    <>
      {/* ========================================================== */}
      {/* ========================================================== */}
      {/* PANEL 1: FLOATING TOOLBAR OVERLAY OVER CANVAS (COMPACT)     */}
      {/* ========================================================== */}
      {isToolbarOpen && activePanel === 'none' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-16px)] animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl px-1.5 py-1 sm:px-2 sm:py-1.5 flex items-center gap-0.5 sm:gap-1 text-white">
            {/* Brush Button */}
            <button
              onClick={() => {
                onSelectTool('brush');
                onOpenPanel('brush');
              }}
              className={`px-1.5 sm:px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-[34px] sm:min-w-[40px] transition-all ${
                activeTool === 'brush'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Brush Tools"
            >
              <Paintbrush className="w-4 h-4" />
              <span className="text-[9px] font-semibold tracking-tight leading-none">Brush</span>
            </button>

            {/* Eraser Button */}
            <button
              onClick={() => {
                onSelectTool('eraser');
                onOpenPanel('eraser');
              }}
              className={`px-1.5 sm:px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-[34px] sm:min-w-[40px] transition-all ${
                activeTool === 'eraser'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Eraser Tools"
            >
              <Eraser className="w-4 h-4" />
              <span className="text-[9px] font-semibold tracking-tight leading-none">Eraser</span>
            </button>

            {/* Lasso Tool Button */}
            <button
              onClick={() => {
                onSelectTool('lasso');
                onCloseToolbar();
              }}
              className={`px-1.5 sm:px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-[34px] sm:min-w-[40px] transition-all ${
                activeTool === 'lasso'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Lasso Selection"
            >
              <LassoSelect className="w-4 h-4" />
              <span className="text-[9px] font-semibold tracking-tight leading-none">Lasso</span>
            </button>

            {/* Transform Button */}
            <button
              onClick={() => {
                onSelectTool('transform');
                onOpenPanel('transform');
              }}
              className={`px-1.5 sm:px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-[34px] sm:min-w-[40px] transition-all ${
                activeTool === 'transform'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Transform Object"
            >
              <Move className="w-4 h-4" />
              <span className="text-[9px] font-semibold tracking-tight leading-none">Transform</span>
            </button>

            {/* MagicWand / Curve Button */}
            <button
              onClick={() => {
                onSelectTool('curve');
                onCloseToolbar();
              }}
              className={`px-1.5 sm:px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-[34px] sm:min-w-[40px] transition-all ${
                activeTool === 'curve'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Magic Wand / Curve"
            >
              <Wand2 className="w-4 h-4" />
              <span className="text-[9px] font-semibold tracking-tight leading-none">MagicWand</span>
            </button>

            {/* Bucket / Fill Button */}
            <button
              onClick={() => {
                onSelectTool('fill');
                onCloseToolbar();
              }}
              className={`px-1.5 sm:px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-[34px] sm:min-w-[40px] transition-all ${
                activeTool === 'fill'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Bucket Fill Color"
            >
              <PaintBucket className="w-4 h-4" />
              <span className="text-[9px] font-semibold tracking-tight leading-none">Bucket</span>
            </button>

            {/* Color Button */}
            <button
              onClick={() => {
                onOpenPanel('color');
              }}
              className="px-1.5 sm:px-2 py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 min-w-[34px] sm:min-w-[40px] transition-all hover:bg-slate-800/80 text-slate-300 hover:text-white"
              title="Color Palette"
            >
              <div
                className="w-4 h-4 rounded-md border border-white/80 shadow-sm"
                style={{ backgroundColor: currentColor }}
              />
              <span className="text-[9px] font-semibold tracking-tight leading-none">Color</span>
            </button>

            {/* Divider & Dismiss */}
            <div className="w-px h-5 bg-slate-800 mx-0.5" />
            <button
              onClick={onCloseToolbar}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Close Toolbar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* PANEL 2: BRUSH TOOL LAYOUT (FLOATING PANEL OVER CANVAS)    */}
      {/* ========================================================== */}
      {activePanel === 'brush' && (
        <div className="absolute top-4 left-4 sm:left-6 z-40 w-84 max-w-[calc(100vw-32px)] bg-slate-950/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold tracking-wide">Brush Panel</span>
            </div>
            <button
              onClick={onClosePanel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Top Sub-tabs: [ Brush Type | Drawing Tools ] */}
          <div className="flex bg-slate-900 rounded-xl p-1 gap-1 mb-3 border border-slate-800">
            <button
              onClick={() => setBrushSubTab('brushType')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                brushSubTab === 'brushType'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Brush Type
            </button>
            <button
              onClick={() => setBrushSubTab('drawingTools')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                brushSubTab === 'drawingTools'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Drawing Tools
            </button>
          </div>

          {/* SUB-TAB 1: BRUSH TYPE */}
          {brushSubTab === 'brushType' && (
            <>
              {/* Stroke Visualizer */}
              <div className="w-full h-12 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-center mb-3 overflow-hidden relative">
                <div
                  className="rounded-full bg-blue-500 transition-all shadow-md"
                  style={{
                    width: `${Math.min(48, Math.max(4, brushSettings.size * 0.7))}px`,
                    height: `${Math.min(48, Math.max(4, brushSettings.size * 0.7))}px`,
                    opacity: brushSettings.opacity,
                    backgroundColor: currentColor,
                  }}
                />
              </div>

              {/* Brush Types Selection with Stroke Thumbnails */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Brush Type
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {BRUSH_TYPES_LIST.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => onUpdateBrushSettings({ type: item.id })}
                      className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        brushSettings.type === item.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm ring-1 ring-blue-500'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Stroke Thumbnail Preview with White Background */}
                      <div className="w-full h-7 bg-white rounded-lg border border-slate-300 shadow-xs flex items-center justify-center overflow-hidden px-1">
                        <svg className="w-full h-full" viewBox="0 0 120 24">
                          <path
                            d={item.previewSvgPath}
                            fill="none"
                            stroke={currentColor === '#FFFFFF' ? '#000000' : currentColor}
                            strokeWidth={item.id === 'airbrush' ? 5 : item.id === 'marker' ? 4 : 2.5}
                            strokeLinecap="round"
                            opacity={item.id === 'airbrush' ? 0.45 : item.id === 'marker' ? 0.85 : 1}
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{item.label}</span>
                        <span className="text-[9px] text-slate-400 truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </>
          )}

          {/* SUB-TAB 2: DRAWING TOOLS / SHAPES & RULERS */}
          {brushSubTab === 'drawingTools' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Shapes className="w-3.5 h-3.5 text-blue-400" />
                  <span>Shape Models</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DRAWING_SHAPES.map((shape) => {
                    const IconComp = shape.icon;
                    return (
                      <button
                        key={shape.id}
                        onClick={() => onSelectShape(shape.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          activeShape === shape.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] font-semibold text-center truncate w-full">{shape.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ruler Modes</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RULER_MODELS.map((ruler) => (
                    <button
                      key={ruler.id}
                      onClick={() => onSelectRuler(ruler.id)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        activeRuler === ruler.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {ruler.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* PANEL 3: ERASER TOOL LAYOUT (FLOATING PANEL OVER CANVAS)    */}
      {/* ========================================================== */}
      {activePanel === 'eraser' && (
        <div className="absolute top-4 left-4 sm:left-6 z-40 w-84 max-w-[calc(100vw-32px)] bg-slate-950/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Eraser className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-bold tracking-wide">Eraser</span>
            </div>
            <button
              onClick={onClosePanel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Eraser Tool Selector: Off (Freehand) | Bezier Curve */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Eraser Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'off', label: 'Off (Freehand)' },
                { id: 'bezier', label: 'Bezier Curve' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onSelectShape(mode.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                    activeShape === mode.id
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* PANEL 4: COLOR LAYOUT (FLOATING PANEL OVER CANVAS)         */}
      {/* ========================================================== */}
      {activePanel === 'color' && (
        <div className="absolute top-4 left-4 sm:left-6 z-40 w-80 max-w-[calc(100vw-32px)] bg-slate-950/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-white/60"
                style={{ backgroundColor: currentColor }}
              />
              <span className="text-sm font-bold tracking-wide">Color Palette</span>
            </div>
            <button
              onClick={onClosePanel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Color Tabs: Palette | RGB | HSB */}
          <div className="flex bg-slate-900 rounded-xl p-1 gap-1 mb-4 border border-slate-800">
            <button
              onClick={() => setColorTab('palette')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                colorTab === 'palette'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Palette
            </button>
            <button
              onClick={() => setColorTab('rgb')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                colorTab === 'rgb'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RGB
            </button>
            <button
              onClick={() => setColorTab('hsb')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                colorTab === 'hsb'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              HSB
            </button>
          </div>

          {/* TAB 1: PALETTE GRID & QUICK SLIDER */}
          {colorTab === 'palette' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Color Swatches
              </label>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {PALETTE_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => onSelectColor(hex)}
                    className={`h-9 rounded-xl border transition-all relative ${
                      currentColor.toLowerCase() === hex.toLowerCase()
                        ? 'ring-2 ring-blue-500 border-white scale-105 shadow-md'
                        : 'border-slate-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>

              {/* Quick Hue Bar */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Hue Spectrum
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hsv.h}
                  onChange={(e) => handleHsbChange('h', Number(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background:
                      'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: RGB SLIDERS */}
          {colorTab === 'rgb' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400 font-semibold">Red (R)</span>
                  <span className="font-mono font-bold">{rgb.r}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400 font-semibold">Green (G)</span>
                  <span className="font-mono font-bold">{rgb.g}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400 font-semibold">Blue (B)</span>
                  <span className="font-mono font-bold">{rgb.b}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Hex:</span>
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      onSelectColor(e.target.value);
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono uppercase text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 3: HSB SLIDERS */}
          {colorTab === 'hsb' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Hue</span>
                  <span className="font-mono font-bold">{hsv.h}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hsv.h}
                  onChange={(e) => handleHsbChange('h', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Saturation</span>
                  <span className="font-mono font-bold">{hsv.s}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsv.s}
                  onChange={(e) => handleHsbChange('s', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Brightness</span>
                  <span className="font-mono font-bold">{hsv.v}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsv.v}
                  onChange={(e) => handleHsbChange('b', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* PANEL 5: TRANSFORM BOTTOM SHEET (AUTO-HIDES ON DRAG)       */}
      {/* UI Specs: Exclusively contains 4 controls: Translation X,  */}
      {/* Translation Y, Scale, and Rotation.                         */}
      {/* ========================================================== */}
      {activePanel === 'transform' && (
        <>
          {/* Floating Pill when Bottom Sheet is auto-hidden during finger drag or minimized */}
          {(isTransformDragging || isSheetMinimized) && (
            <button
              onClick={() => setIsSheetMinimized(false)}
              className="fixed bottom-6 right-5 z-50 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-2xl font-bold text-xs flex items-center gap-1.5 transition-all animate-in fade-in zoom-in-95 active:scale-95 border border-blue-400/50"
            >
              <Move className="w-4 h-4" />
              <span>Show Sliders</span>
            </button>
          )}

          <div
            className={`fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 p-5 rounded-t-3xl shadow-2xl select-none text-white transition-all duration-200 ease-out ${
              isTransformDragging || isSheetMinimized
                ? 'translate-y-full opacity-0 pointer-events-none'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Move className="w-5 h-5 text-blue-400" />
                  <span className="text-base font-bold">Transform Layout</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSheetMinimized(true)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    title="Hide Bottom Sheet"
                  >
                    Hide
                  </button>
                  <button
                    onClick={onClosePanel}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>

            {/* Exclusively 4 Controls: Translation X, Translation Y, Scale, Rotation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Control 1: Translation X */}
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-300">
                  <span>Translation X</span>
                  <span className="font-mono font-bold text-blue-400">{Math.round(translateX)}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChangeTranslateX(translateX - 5)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    value={translateX}
                    onChange={(e) => onChangeTranslateX(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <button
                    onClick={() => onChangeTranslateX(translateX + 5)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Control 2: Translation Y */}
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-300">
                  <span>Translation Y</span>
                  <span className="font-mono font-bold text-blue-400">{Math.round(translateY)}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChangeTranslateY(translateY - 5)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    value={translateY}
                    onChange={(e) => onChangeTranslateY(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <button
                    onClick={() => onChangeTranslateY(translateY + 5)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Control 3: Scale */}
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-300">
                  <span>Scale</span>
                  <span className="font-mono font-bold text-blue-400">{Math.round(scalePercent)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChangeScale(Math.max(10, scalePercent - 5))}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={scalePercent}
                    onChange={(e) => onChangeScale(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <button
                    onClick={() => onChangeScale(Math.min(300, scalePercent + 5))}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Control 4: Rotation */}
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-300">
                  <span>Rotation</span>
                  <span className="font-mono font-bold text-blue-400">{Math.round(rotationDeg)}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChangeRotation(rotationDeg - 5)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={rotationDeg}
                    onChange={(e) => onChangeRotation(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <button
                    onClick={() => onChangeRotation(rotationDeg + 5)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
};

