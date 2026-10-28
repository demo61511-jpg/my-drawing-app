import React, { useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { BrushSettings, BrushType } from '../types/canvas';

interface BrushSettingsModalProps {
  settings: BrushSettings;
  currentColor: string;
  onUpdateSettings: (newSettings: Partial<BrushSettings>) => void;
  onClose: () => void;
}

export const BrushSettingsModal: React.FC<BrushSettingsModalProps> = ({
  settings,
  currentColor,
  onUpdateSettings,
  onClose,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const brushTypes: { id: BrushType; name: string; desc: string }[] = [
    { id: 'brush', name: 'Basic Brush', desc: 'Smooth, versatile round brush' },
    { id: 'pencil', name: 'Pencil', desc: 'Light, textured graphite tip' },
    { id: 'pen', name: 'Ink Pen', desc: 'Crisp, bold comic inking pen' },
    { id: 'marker', name: 'Marker', desc: 'Semi-transparent layering marker' },
    { id: 'airbrush', name: 'Airbrush', desc: 'Soft gradient spray' },
    { id: 'calligraphy', name: 'Calligraphy', desc: 'Chiseled angle stroke' },
  ];

  // Draw dynamic preview stroke
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = settings.size;
    ctx.lineCap = settings.type === 'marker' ? 'square' : 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = settings.opacity;

    if (settings.type === 'pencil') {
      ctx.shadowBlur = 1;
      ctx.shadowColor = currentColor;
    } else if (settings.type === 'airbrush') {
      ctx.shadowBlur = settings.size * 0.7;
      ctx.shadowColor = currentColor;
    }

    // Draw S-curve preview
    ctx.beginPath();
    const w = canvas.width;
    const h = canvas.height;
    ctx.moveTo(30, h * 0.65);
    ctx.bezierCurveTo(w * 0.35, h * 0.15, w * 0.65, h * 0.85, w - 30, h * 0.35);
    ctx.stroke();

    ctx.restore();
  }, [settings, currentColor]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Brush Settings</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Stroke Card */}
        <div className="px-5 pt-4">
          <div className="h-20 w-full rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              width={300}
              height={80}
              className="w-full h-full object-contain"
            />
            <span className="absolute bottom-1.5 right-2 text-[10px] font-mono text-slate-500">
              Preview
            </span>
          </div>
        </div>

        {/* Settings Sliders */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Brush Type Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Brush Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {brushTypes.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onUpdateSettings({ type: b.id })}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                    settings.type === b.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Size</span>
              <span className="font-mono text-white">{settings.size} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={settings.size}
              onChange={(e) => onUpdateSettings({ size: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Opacity */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Opacity</span>
              <span className="font-mono text-white">{Math.round(settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={Math.round(settings.opacity * 100)}
              onChange={(e) => onUpdateSettings({ opacity: parseInt(e.target.value) / 100 })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Hardness */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Hardness</span>
              <span className="font-mono text-white">{settings.hardness}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.hardness}
              onChange={(e) => onUpdateSettings({ hardness: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Smoothing / Stabilizer */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Smoothing (Stabilizer)</span>
              <span className="font-mono text-white">{settings.smoothing}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={settings.smoothing}
              onChange={(e) => onUpdateSettings({ smoothing: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Pressure Sensitivity */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-slate-300">Pressure Sensitivity</span>
            <button
              onClick={() => onUpdateSettings({ pressureSensitivity: !settings.pressureSensitivity })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.pressureSensitivity ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
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
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
