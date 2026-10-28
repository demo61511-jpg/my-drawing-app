import React, { useState, useRef } from 'react';
import {
  FlipHorizontal,
  FlipVertical,
  Crosshair,
  Check,
  X,
  Copy,
  Trash2,
  Minus,
  Plus,
  GripHorizontal,
} from 'lucide-react';

export interface TransformToolbarProps {
  translateX: number;
  translateY: number;
  scalePercent: number;
  rotationDeg: number;
  pivotValue?: number;
  transformMode?: 'all' | 'move' | 'scale' | 'rotate' | 'perspective' | 'mesh';
  onChangeMode?: (mode: 'all' | 'move' | 'scale' | 'rotate' | 'perspective' | 'mesh') => void;
  onChangeTranslateX: (val: number) => void;
  onChangeTranslateY: (val: number) => void;
  onChangeScale: (val: number) => void;
  onChangeRotation: (val: number) => void;
  onChangePivot?: (val: number) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onResetPivot: () => void;
  onApply: () => void;
  onCancel: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export const TransformToolbar: React.FC<TransformToolbarProps> = ({
  translateX,
  translateY,
  scalePercent,
  rotationDeg,
  pivotValue = 0,
  onChangeTranslateX,
  onChangeTranslateY,
  onChangeScale,
  onChangeRotation,
  onChangePivot,
  onFlipHorizontal,
  onFlipVertical,
  onResetPivot,
  onApply,
  onCancel,
  onDuplicate,
  onDelete,
}) => {
  // Height configuration for drag handle
  const MIN_HEIGHT = 160;
  const DEFAULT_HEIGHT = 380;
  const [panelHeight, setPanelHeight] = useState<number>(DEFAULT_HEIGHT);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(DEFAULT_HEIGHT);

  // Handle pointer down on top drag bar to resize panel height
  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
    setIsDragging(true);

    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaY = startYRef.current - moveEv.clientY;
      const maxHeight = Math.min(window.innerHeight * 0.85, 650);
      const newHeight = Math.max(MIN_HEIGHT, Math.min(startHeightRef.current + deltaY, maxHeight));
      setPanelHeight(newHeight);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleDoubleClickHandle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (panelHeight < 320) {
      setPanelHeight(450);
    } else {
      setPanelHeight(DEFAULT_HEIGHT);
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0b1329]/95 border-t border-slate-800/90 backdrop-blur-xl rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.9)] text-slate-100 flex flex-col select-none animate-in slide-in-from-bottom duration-200"
      style={{
        height: `${panelHeight}px`,
        transition: isDragging ? 'none' : 'height 0.15s ease-out',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* TOP HEADER BAR: Cancel on Left, Drag handle in Middle, Apply on Right */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 shrink-0">
        {/* Cancel Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="py-1.5 px-3 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Cancel transform"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
          <span>Cancel</span>
        </button>

        {/* Center Drag Handle Bar */}
        <div
          onPointerDown={handleDragStart}
          onDoubleClick={handleDoubleClickHandle}
          className="flex items-center gap-1.5 px-3 py-1 cursor-ns-resize touch-none group hover:bg-slate-800/40 rounded-full transition-colors"
          title="Drag up or down to adjust panel height"
        >
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
          <div className="w-10 h-1 bg-slate-600 group-hover:bg-blue-400 rounded-full transition-colors" />
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        </div>

        {/* Apply Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="py-1.5 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          title="Confirm transform"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>Apply</span>
        </button>
      </div>

      {/* SCROLLABLE CONTENT CONTAINER */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar">
        {/* ACTION BUTTONS ROW: Reset Pivot | Flip H | Flip V | Copy | Delete */}
        <div className="grid grid-cols-5 gap-2">
          {/* 1. Reset Pivot */}
          <button
            onClick={onResetPivot}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-400 hover:bg-amber-900/40 active:scale-95 transition-all cursor-pointer"
            title="Reset pivot to bounding box center"
          >
            <Crosshair className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-bold tracking-tight">Reset Pivot</span>
          </button>

          {/* 2. Flip H */}
          <button
            onClick={onFlipHorizontal}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-4 h-4 text-slate-300" />
            <span className="text-[10px] font-bold tracking-tight">Flip H</span>
          </button>

          {/* 3. Flip V */}
          <button
            onClick={onFlipVertical}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            title="Flip Vertical"
          >
            <FlipVertical className="w-4 h-4 text-slate-300" />
            <span className="text-[10px] font-bold tracking-tight">Flip V</span>
          </button>

          {/* 4. Copy */}
          <button
            onClick={onDuplicate}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-400 hover:bg-blue-900/40 active:scale-95 transition-all cursor-pointer"
            title="Copy selected object"
          >
            <Copy className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold tracking-tight">Copy</span>
          </button>

          {/* 5. Delete */}
          <button
            onClick={onDelete}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/40 active:scale-95 transition-all cursor-pointer"
            title="Delete selected object"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-bold tracking-tight">Delete</span>
          </button>
        </div>

        {/* SLIDERS LIST (Vertical Stack strictly matching reference layout) */}

        {/* 1. Scale */}
        <div className="bg-[#101728]/80 border border-slate-800/80 rounded-xl px-3 py-2">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-300">Scale</span>
            <span className="font-mono text-[#38bdf8] font-bold bg-[#0d2342] px-2 py-0.5 rounded border border-blue-500/30 text-[11px]">
              {scalePercent}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeScale(Math.max(10, scalePercent - 5))}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={10}
              max={500}
              value={scalePercent}
              onChange={(e) => onChangeScale(parseInt(e.target.value) || 100)}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <button
              onClick={() => onChangeScale(Math.min(500, scalePercent + 5))}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Rotation */}
        <div className="bg-[#101728]/80 border border-slate-800/80 rounded-xl px-3 py-2">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-300">Rotation</span>
            <span className="font-mono text-[#38bdf8] font-bold bg-[#0d2342] px-2 py-0.5 rounded border border-blue-500/30 text-[11px]">
              {rotationDeg}°
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeRotation(rotationDeg - 1)}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={-180}
              max={180}
              value={rotationDeg}
              onChange={(e) => onChangeRotation(parseInt(e.target.value) || 0)}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <button
              onClick={() => onChangeRotation(rotationDeg + 1)}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Translation X */}
        <div className="bg-[#101728]/80 border border-slate-800/80 rounded-xl px-3 py-2">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-300">Translation X</span>
            <span className="font-mono text-[#38bdf8] font-bold bg-[#0d2342] px-2 py-0.5 rounded border border-blue-500/30 text-[11px]">
              {translateX >= 0 ? `+${translateX}` : translateX} px
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeTranslateX(translateX - 1)}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={-500}
              max={500}
              value={translateX}
              onChange={(e) => onChangeTranslateX(parseInt(e.target.value) || 0)}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <button
              onClick={() => onChangeTranslateX(translateX + 1)}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4. Translation Y */}
        <div className="bg-[#101728]/80 border border-slate-800/80 rounded-xl px-3 py-2">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-300">Translation Y</span>
            <span className="font-mono text-[#38bdf8] font-bold bg-[#0d2342] px-2 py-0.5 rounded border border-blue-500/30 text-[11px]">
              {translateY >= 0 ? `+${translateY}` : translateY} px
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeTranslateY(translateY - 1)}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={-500}
              max={500}
              value={translateY}
              onChange={(e) => onChangeTranslateY(parseInt(e.target.value) || 0)}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <button
              onClick={() => onChangeTranslateY(translateY + 1)}
              className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
