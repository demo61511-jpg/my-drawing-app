import React, { useState } from 'react';
import { X, Search, Check, RefreshCw } from 'lucide-react';
import { isColorMatch } from '../utils/color';

interface FindReplaceModalProps {
  initialFindColor?: string;
  initialReplaceColor?: string;
  onExecuteReplace: (
    findColor: string,
    replaceColor: string,
    target: 'stroke' | 'fill' | 'both',
    tolerance: number,
    scope: 'layer' | 'selected'
  ) => void;
  onClose: () => void;
  onOpenColorPickerForTarget?: (field: 'find' | 'replace') => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  initialFindColor = '#000000',
  initialReplaceColor = '#FFFFFF',
  onExecuteReplace,
  onClose,
  onOpenColorPickerForTarget,
}) => {
  const [findColor, setFindColor] = useState<string>(initialFindColor);
  const [replaceColor, setReplaceColor] = useState<string>(initialReplaceColor);
  const [target, setTarget] = useState<'stroke' | 'fill' | 'both'>('stroke');
  const [tolerance, setTolerance] = useState<number>(20);
  const [scope, setScope] = useState<'layer' | 'selected'>('layer');
  const [pickerField, setPickerField] = useState<'find' | 'replace' | null>(null);

  const presetColors = [
    '#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  ];

  const handleApply = () => {
    onExecuteReplace(findColor, replaceColor, target, tolerance, scope);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-white">Find & Replace Color</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Find Color */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400">Find Color</span>
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-xl border border-slate-700 shadow-xs cursor-pointer"
                  style={{ backgroundColor: findColor }}
                  onClick={() => setPickerField(pickerField === 'find' ? null : 'find')}
                />
                <span className="font-mono text-xs text-white uppercase">{findColor}</span>
              </div>
              <div className="flex gap-1">
                {presetColors.slice(0, 4).map((c) => (
                  <button
                    key={`find_${c}`}
                    onClick={() => setFindColor(c)}
                    className="w-5 h-5 rounded-md border border-slate-700 shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {pickerField === 'find' && (
              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2">
                {presetColors.map((c) => (
                  <button
                    key={`p_find_${c}`}
                    onClick={() => {
                      setFindColor(c);
                      setPickerField(null);
                    }}
                    className="w-6 h-6 rounded-lg border border-slate-700"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Replace With Color */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400">Replace With</span>
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-xl border border-slate-700 shadow-xs cursor-pointer"
                  style={{ backgroundColor: replaceColor }}
                  onClick={() => setPickerField(pickerField === 'replace' ? null : 'replace')}
                />
                <span className="font-mono text-xs text-white uppercase">{replaceColor}</span>
              </div>
              <div className="flex gap-1">
                {presetColors.slice(0, 4).map((c) => (
                  <button
                    key={`repl_${c}`}
                    onClick={() => setReplaceColor(c)}
                    className="w-5 h-5 rounded-md border border-slate-700 shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {pickerField === 'replace' && (
              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2">
                {presetColors.map((c) => (
                  <button
                    key={`p_repl_${c}`}
                    onClick={() => {
                      setReplaceColor(c);
                      setPickerField(null);
                    }}
                    className="w-6 h-6 rounded-lg border border-slate-700"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Target Buttons (Stroke | Fill | Both) */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1.5">Target</span>
            <div className="grid grid-cols-3 gap-2">
              {(['stroke', 'fill', 'both'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-bold capitalize transition-all ${
                    target === t
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Tolerance Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-400">Tolerance</span>
              <span className="font-mono text-white">{tolerance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={tolerance}
              onChange={(e) => setTolerance(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Scope Buttons (Current Layer | Selected Objects) */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1.5">Scope</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setScope('layer')}
                className={`py-2 px-2 text-center rounded-xl border text-xs font-bold transition-all ${
                  scope === 'layer'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Current Layer
              </button>
              <button
                onClick={() => setScope('selected')}
                className={`py-2 px-2 text-center rounded-xl border text-xs font-bold transition-all ${
                  scope === 'selected'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Selected Objects
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Replace All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
