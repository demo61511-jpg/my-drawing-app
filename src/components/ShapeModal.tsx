import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { ShapeSettings, ShapeType } from '../types/canvas';

interface ShapeModalProps {
  settings: ShapeSettings;
  curveMode?: 'bezier' | 'freehand';
  initialIsCurve?: boolean;
  onUpdateSettings: (newSettings: Partial<ShapeSettings>) => void;
  onApplyShape: (settings: ShapeSettings) => void;
  onSelectCurveMode?: (mode: 'bezier' | 'freehand') => void;
  onClose: () => void;
  onOpenColorPicker: (target: 'stroke' | 'fill') => void;
}

export const ShapeModal: React.FC<ShapeModalProps> = ({
  settings,
  curveMode = 'bezier',
  initialIsCurve = false,
  onUpdateSettings,
  onApplyShape,
  onSelectCurveMode,
  onClose,
  onOpenColorPicker,
}) => {
  const [isCurveSelected, setIsCurveSelected] = useState<boolean>(initialIsCurve);
  const [curveSubMode, setCurveSubMode] = useState<'freehand' | 'bezier'>(curveMode);

  const shapes: { id: ShapeType | 'curve'; label: string; icon: string }[] = [
    { id: 'line', label: 'Line', icon: '╱' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'rectangle', label: 'Rectangle', icon: '□' },
    { id: 'rounded-rect', label: 'Round Rect', icon: '▢' },
    { id: 'star', label: 'Star', icon: '★' },
    { id: 'curve', label: 'Curve', icon: '⤹' },
    { id: 'polygon', label: 'Polygon', icon: '⬡' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">
            {isCurveSelected ? 'Curve Tool' : 'Shape Tool'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Shape Selection Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Select Tool / Shape</label>
            <div className="grid grid-cols-7 gap-1.5">
              {shapes.map((s) => {
                const isSelected = s.id === 'curve' ? isCurveSelected : !isCurveSelected && settings.shapeType === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id === 'curve') {
                        setIsCurveSelected(true);
                        if (onSelectCurveMode) onSelectCurveMode(curveSubMode);
                      } else {
                        setIsCurveSelected(false);
                        onUpdateSettings({ shapeType: s.id as ShapeType });
                      }
                    }}
                    className={`h-11 flex flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600/25 border-blue-500 text-blue-400 shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                    title={s.label}
                  >
                    <span>{s.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* If Curve is Selected: show Freehand Curve vs Bezier Curve sub-options */}
          {isCurveSelected && (
            <div className="p-3 bg-slate-900/90 border border-blue-500/30 rounded-2xl animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold text-blue-400 block mb-2">Curve Mode</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setCurveSubMode('freehand');
                    if (onSelectCurveMode) onSelectCurveMode('freehand');
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    curveSubMode === 'freehand'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>⤹</span>
                  <span>Freehand Curve</span>
                </button>
                <button
                  onClick={() => {
                    setCurveSubMode('bezier');
                    if (onSelectCurveMode) onSelectCurveMode('bezier');
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    curveSubMode === 'bezier'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>⤳</span>
                  <span>Bezier Curve</span>
                </button>
              </div>
            </div>
          )}

          {/* Color Swatches */}
          <div className="grid grid-cols-2 gap-3">
            {/* Fill Color */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Fill Color</span>
                <span className="text-xs font-mono text-white mt-0.5 block">{settings.fillColor}</span>
              </div>
              <button
                onClick={() => onOpenColorPicker('fill')}
                className="w-8 h-8 rounded-xl border border-slate-700 shadow-xs hover:scale-105 transition-transform"
                style={{
                  backgroundColor: settings.fillColor === 'none' ? '#1e293b' : settings.fillColor,
                  backgroundImage:
                    settings.fillColor === 'none'
                      ? 'linear-gradient(45deg, #ef4444 48%, #ef4444 52%, transparent 52%)'
                      : 'none',
                }}
              />
            </div>

            {/* Stroke Color */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Stroke Color</span>
                <span className="text-xs font-mono text-white mt-0.5 block">{settings.strokeColor}</span>
              </div>
              <button
                onClick={() => onOpenColorPicker('stroke')}
                className="w-8 h-8 rounded-xl border border-slate-700 shadow-xs hover:scale-105 transition-transform"
                style={{ backgroundColor: settings.strokeColor }}
              />
            </div>
          </div>

          {/* Stroke Width Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Stroke Width</span>
              <span className="font-mono text-white">{settings.strokeWidth} px</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={settings.strokeWidth}
              onChange={(e) => onUpdateSettings({ strokeWidth: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Opacity Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Opacity</span>
              <span className="font-mono text-white">{Math.round(settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={Math.round(settings.opacity * 100)}
              onChange={(e) => onUpdateSettings({ opacity: parseInt(e.target.value) / 100 })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Footer Actions (Cancel and Apply) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (isCurveSelected) {
                if (onSelectCurveMode) onSelectCurveMode(curveSubMode);
              } else {
                onApplyShape(settings);
              }
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isCurveSelected ? 'Apply Curve' : 'Apply Shape'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
