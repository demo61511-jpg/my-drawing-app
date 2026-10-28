import React from 'react';
import { X, PaintBucket, Brush as BrushIcon } from 'lucide-react';
import { FillSettings } from '../types/canvas';

interface FillPropertiesModalProps {
  settings: FillSettings;
  onUpdateSettings: (newSettings: Partial<FillSettings>) => void;
  onClose: () => void;
  onOpenColorPicker: () => void;
  onSwitchToBrushSettings: () => void;
}

export const FillPropertiesModal: React.FC<FillPropertiesModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onOpenColorPicker,
  onSwitchToBrushSettings,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Tabs (Brush / Fill) */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-2 gap-2">
          <button
            onClick={() => {
              onClose();
              onSwitchToBrushSettings();
            }}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <BrushIcon className="w-3.5 h-3.5" />
            <span>Brush</span>
          </button>
          <button className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center gap-1.5 shadow-xs">
            <PaintBucket className="w-3.5 h-3.5" />
            <span>Fill</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Fill Color */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Fill Color</span>
              <span className="text-xs font-mono text-white mt-0.5 block">{settings.fillColor}</span>
            </div>
            <button
              onClick={onOpenColorPicker}
              className="w-9 h-9 rounded-xl border border-slate-700 shadow-xs hover:scale-105 transition-transform"
              style={{ backgroundColor: settings.fillColor }}
            />
          </div>

          {/* Tolerance */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Fill Tolerance</span>
              <span className="font-mono text-white">{settings.tolerance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.tolerance}
              onChange={(e) => onUpdateSettings({ tolerance: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Higher tolerance expands fill into anti-aliased edges and line shadows.
            </p>
          </div>

          {/* Contiguous Fill */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-semibold text-slate-300 block">Contiguous Fill</span>
              <span className="text-[10px] text-slate-500 block">Fill only connected enclosed areas</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ contiguous: !settings.contiguous })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.contiguous ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Anti-aliasing */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-semibold text-slate-300 block">Anti-aliasing</span>
              <span className="text-[10px] text-slate-500 block">Smooth fill boundary edges</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ antiAliasing: !settings.antiAliasing })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.antiAliasing ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
