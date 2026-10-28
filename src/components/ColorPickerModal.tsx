import React, { useState, useRef, useEffect } from 'react';
import { X, Pipette, Plus, Check } from 'lucide-react';
import { hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, HSV, RGB } from '../utils/color';

interface ColorPickerModalProps {
  color: string;
  onColorChange: (newColor: string) => void;
  onClose: () => void;
  onEyedropperClick?: () => void;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  color,
  onColorChange,
  onClose,
  onEyedropperClick,
}) => {
  const [activeTab, setActiveTab] = useState<'wheel' | 'rgb' | 'hex'>('wheel');
  const rgb = hexToRgb(color);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const [hue, setHue] = useState<number>(hsv.h);
  const [sat, setSat] = useState<number>(hsv.s);
  const [val, setVal] = useState<number>(hsv.v);

  const [hexInput, setHexInput] = useState<string>(color);

  // Recent and favorite colors
  const [recentColors, setRecentColors] = useState<string[]>([
    '#EF4444', '#F97316', '#FBBF24', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#000000',
  ]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>([
    '#FFFFFF', '#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
  ]);

  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync internal state when external color changes
  useEffect(() => {
    const currentRgb = hexToRgb(color);
    const currentHsv = rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b);
    setHue(currentHsv.h);
    setSat(currentHsv.s);
    setVal(currentHsv.v);
    setHexInput(color);
  }, [color]);

  const updateColorFromHsv = (h: number, s: number, v: number) => {
    setHue(h);
    setSat(s);
    setVal(v);
    const newRgb = hsvToRgb(h, s, v);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(newHex);
    onColorChange(newHex);

    // Add to recent colors if not duplicate
    if (!recentColors.includes(newHex)) {
      setRecentColors((prev) => [newHex, ...prev.slice(0, 9)]);
    }
  };

  const updateColorFromRgb = (r: number, g: number, b: number) => {
    const newHex = rgbToHex(r, g, b);
    const newHsv = rgbToHsv(r, g, b);
    setHue(newHsv.h);
    setSat(newHsv.s);
    setVal(newHsv.v);
    setHexInput(newHex);
    onColorChange(newHex);
  };

  const addFavorite = () => {
    if (!favoriteColors.includes(color)) {
      setFavoriteColors((prev) => [...prev, color]);
    }
  };

  // Draw HSV Color Wheel
  useEffect(() => {
    if (activeTab !== 'wheel') return;
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const outerRadius = size / 2 - 6;
    const innerRadius = outerRadius - 16;

    ctx.clearRect(0, 0, size, size);

    // Draw outer Hue ring
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(center, center, (outerRadius + innerRadius) / 2, startAngle, endAngle);
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.lineWidth = outerRadius - innerRadius;
      ctx.stroke();
    }

    // Draw Hue ring selector notch
    const hueRad = (hue * Math.PI) / 180;
    const hueX = center + ((outerRadius + innerRadius) / 2) * Math.cos(hueRad);
    const hueY = center + ((outerRadius + innerRadius) / 2) * Math.sin(hueRad);
    ctx.beginPath();
    ctx.arc(hueX, hueY, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fill();
    ctx.stroke();

    // Draw central Saturation / Value square
    const boxSize = innerRadius * 1.15;
    const boxX = center - boxSize / 2;
    const boxY = center - boxSize / 2;

    // Saturation gradient (white to pure hue)
    const satGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxSize, boxY);
    satGrad.addColorStop(0, '#ffffff');
    satGrad.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = satGrad;
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    // Value gradient (transparent to black)
    const valGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxSize);
    valGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    valGrad.addColorStop(1, '#000000');
    ctx.fillStyle = valGrad;
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    // SV handle
    const svX = boxX + (sat / 100) * boxSize;
    const svY = boxY + (1 - val / 100) * boxSize;
    ctx.beginPath();
    ctx.arc(svX, svY, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hue, sat, val, activeTab]);

  // Handle interaction with wheel canvas
  const handleWheelClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = canvas.width;
    const center = size / 2;
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const outerRadius = size / 2 - 6;
    const innerRadius = outerRadius - 16;
    const boxSize = innerRadius * 1.15;

    // Outer hue ring click
    if (dist >= innerRadius - 8 && dist <= outerRadius + 8) {
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      updateColorFromHsv(Math.round(angle), sat, val);
    } else if (Math.abs(dx) <= boxSize / 2 && Math.abs(dy) <= boxSize / 2) {
      // Inner SV box click
      const newSat = Math.max(0, Math.min(100, Math.round(((dx + boxSize / 2) / boxSize) * 100)));
      const newVal = Math.max(0, Math.min(100, Math.round((1 - (dy + boxSize / 2) / boxSize) * 100)));
      updateColorFromHsv(hue, newSat, newVal);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">Color</h2>
            <div
              className="w-5 h-5 rounded-full border-2 border-white/40 shadow-xs"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="flex items-center gap-2">
            {onEyedropperClick && (
              <button
                onClick={() => {
                  onEyedropperClick();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Eyedropper"
              >
                <Pipette className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800/80 px-5 pt-2">
          {(['wheel', 'rgb', 'hex'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'wheel' && (
            <div className="flex flex-col items-center">
              <canvas
                ref={wheelCanvasRef}
                width={200}
                height={200}
                onClick={handleWheelClick}
                className="cursor-crosshair rounded-full shadow-inner"
              />

              {/* H, S, V Live Sliders */}
              <div className="w-full space-y-2 mt-4">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>Hue (H)</span>
                    <span className="font-mono text-white">{hue}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => updateColorFromHsv(parseInt(e.target.value), sat, val)}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
                    }}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>Saturation (S)</span>
                    <span className="font-mono text-white">{sat}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sat}
                    onChange={(e) => updateColorFromHsv(hue, parseInt(e.target.value), val)}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>Value (V)</span>
                    <span className="font-mono text-white">{val}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={val}
                    onChange={(e) => updateColorFromHsv(hue, sat, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rgb' && (
            <div className="space-y-3">
              {(['r', 'g', 'b'] as const).map((channel) => (
                <div key={channel}>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span className="uppercase">{channel}</span>
                    <span className="font-mono text-white">{rgb[channel]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb[channel]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const newR = channel === 'r' ? val : rgb.r;
                      const newG = channel === 'g' ? val : rgb.g;
                      const newB = channel === 'b' ? val : rgb.b;
                      updateColorFromRgb(newR, newG, newB);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hex' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 block">HEX Color Code</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => {
                    setHexInput(e.target.value);
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      onColorChange(e.target.value);
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <div
                  className="w-10 h-10 rounded-xl border border-slate-700 shadow-xs shrink-0"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          )}

          {/* Recent Colors Grid */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Recent Colors</span>
            <div className="flex flex-wrap gap-2">
              {recentColors.map((c, i) => (
                <button
                  key={`${c}_${i}`}
                  onClick={() => onColorChange(c)}
                  className="w-6 h-6 rounded-lg border border-slate-700/80 shadow-xs hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Favorite Colors Grid */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Favorite Colors</span>
              <button
                onClick={addFavorite}
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {favoriteColors.map((c, i) => (
                <button
                  key={`fav_${c}_${i}`}
                  onClick={() => onColorChange(c)}
                  className="w-6 h-6 rounded-lg border border-slate-700/80 shadow-xs hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                onClick={addFavorite}
                className="w-6 h-6 rounded-lg border border-dashed border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs font-bold"
              >
                +
              </button>
            </div>
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
