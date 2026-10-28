import React, { useState } from 'react';
import { X, Settings as SettingsIcon, Check } from 'lucide-react';
import { Project } from '../types/canvas';

interface ProjectSettingsModalProps {
  project: Project;
  onUpdateBackgroundColor: (color: string) => void;
  onOpenLayers: () => void;
  onClose: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  project,
  onUpdateBackgroundColor,
  onOpenLayers,
  onClose,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(
    `${project.width} x ${project.height} (${project.aspectRatio})`
  );
  const [bgType, setBgType] = useState<'transparent' | 'solid'>(
    project.backgroundColor === 'transparent' ? 'transparent' : 'solid'
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    project.backgroundColor === 'transparent' ? '#ffffff' : project.backgroundColor
  );

  const canvasPresets = [
    { label: '1080 x 1920 (9:16)', w: 1080, h: 1920, ratio: '9:16' },
    { label: '1080 x 1080 (1:1)', w: 1080, h: 1080, ratio: '1:1' },
    { label: '1920 x 1080 (16:9)', w: 1920, h: 1080, ratio: '16:9' },
    { label: '1440 x 1080 (4:3)', w: 1440, h: 1080, ratio: '4:3' },
  ];

  const colorSwatches = ['#ffffff', '#1e293b', '#000000', '#2563eb', '#ef4444', '#10b981', '#f59e0b'];

  const handleApply = () => {
    if (bgType === 'transparent') {
      onUpdateBackgroundColor('transparent');
    } else {
      onUpdateBackgroundColor(selectedColor);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-white">Canvas Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-5 space-y-4">
          {/* Canvas Size */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Canvas Size</label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-blue-500"
            >
              {canvasPresets.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Background Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Background</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBgType('transparent')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  bgType === 'transparent'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Transparent
              </button>
              <button
                onClick={() => setBgType('solid')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  bgType === 'solid'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Solid Color
              </button>
            </div>
          </div>

          {/* Fill Color Swatches (When Solid Color is selected) */}
          {bgType === 'solid' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Fill Color</label>
              <div className="flex items-center gap-2">
                {colorSwatches.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                      selectedColor === color ? 'border-blue-500 scale-110 shadow-md' : 'border-slate-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {selectedColor === color && (
                      <Check className={`w-3.5 h-3.5 ${color === '#ffffff' ? 'text-black' : 'text-white'}`} />
                    )}
                  </button>
                ))}
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-7 h-7 rounded-full border border-slate-700 bg-transparent cursor-pointer overflow-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleApply}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 active:scale-[0.99] transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
