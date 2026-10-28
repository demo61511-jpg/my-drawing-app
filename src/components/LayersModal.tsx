import React, { useState } from 'react';
import {
  X,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Sliders,
  Layers as LayersIcon,
  Search,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import { LayerItem } from '../types/canvas';

interface LayersModalProps {
  layers: LayerItem[];
  activeLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onToggleAlphaLock: (layerId: string) => void;
  onChangeOpacity: (layerId: string, opacity: number) => void;
  onMergeDown: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
  onFlipLayer: (layerId: string, axis: 'h' | 'v') => void;
  onOpenFindReplace: () => void;
  onClose: () => void;
}

export const LayersModal: React.FC<LayersModalProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleVisibility,
  onToggleLock,
  onToggleAlphaLock,
  onChangeOpacity,
  onMergeDown,
  onMoveLayer,
  onFlipLayer,
  onOpenFindReplace,
  onClose,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <LayersIcon className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-white">Layers</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {layers.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddLayer}
              className="p-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all flex items-center gap-1 text-xs font-semibold"
              title="Add New Layer"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Layer Opacity & Alpha Lock Slider Strip */}
        {activeLayer && (
          <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2.5">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(activeLayer.opacity * 100)}
              onChange={(e) => onChangeOpacity(activeLayer.id, parseInt(e.target.value) / 100)}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs font-mono font-bold text-white w-8 text-right">
              {Math.round(activeLayer.opacity * 100)}%
            </span>

            {/* Alpha Lock Quick Toggle Button */}
            <button
              onClick={() => onToggleAlphaLock(activeLayer.id)}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 ${
                activeLayer.isAlphaLocked
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
              title="Alpha Lock: Clip drawing strictly to existing non-transparent layer pixels"
            >
              <span className="text-xs">α</span>
              <span>{activeLayer.isAlphaLocked ? 'Lock' : 'Alpha'}</span>
            </button>
          </div>
        )}

        {/* Layer List (Top layer first, matching Photoshop / Ibis Paint) */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {[...layers].reverse().map((layer, reverseIndex) => {
            const index = layers.length - 1 - reverseIndex;
            const isSelected = layer.id === activeLayerId;
            const isBackground = layer.name.toLowerCase() === 'background';

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500 shadow-sm shadow-blue-500/15'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                {/* Left: Thumbnail & Layer Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail */}
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                    {layer.thumbnailUrl ? (
                      <img src={layer.thumbnailUrl} alt={layer.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                        <span className="text-[10px] font-mono text-slate-500">{layer.items.length} items</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                      {layer.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {Math.round(layer.opacity * 100)}% {layer.locked ? '• Locked' : ''}
                    </p>
                  </div>
                </div>

                {/* Right: Quick Controls */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleAlphaLock(layer.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all ${
                      layer.isAlphaLocked
                        ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-xs'
                        : 'text-slate-600 hover:text-slate-300'
                    }`}
                    title={layer.isAlphaLocked ? 'Alpha Lock is ON (Clipping active)' : 'Toggle Alpha Lock'}
                  >
                    α
                  </button>

                  <button
                    onClick={() => onToggleVisibility(layer.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      layer.visible ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-400'
                    }`}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                    {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => onToggleLock(layer.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      layer.locked ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300'
                    }`}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                    {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>

                  {/* 3-dots Context Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === layer.id ? null : layer.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpenId === layer.id && (
                      <div
                        className="absolute right-0 bottom-full mb-1 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-30 text-xs text-slate-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            onToggleAlphaLock(layer.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3.5 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 text-blue-400 font-semibold"
                        >
                          <span>Alpha Lock</span>
                          <span className="text-[10px] font-mono">{layer.isAlphaLocked ? 'ON' : 'OFF'}</span>
                        </button>
                        <button
                          onClick={() => {
                            onDuplicateLayer(layer.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800"
                        >
                          <Copy className="w-3.5 h-3.5" /> Duplicate
                        </button>
                        {index > 0 && (
                          <button
                            onClick={() => {
                              onMergeDown(layer.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800"
                          >
                            <Sliders className="w-3.5 h-3.5" /> Merge Down
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onFlipLayer(layer.id, 'h');
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800"
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" /> Flip Horizontal
                        </button>
                        <button
                          onClick={() => {
                            onFlipLayer(layer.id, 'v');
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800"
                        >
                          <FlipVertical className="w-3.5 h-3.5" /> Flip Vertical
                        </button>
                        <button
                          onClick={() => {
                            onOpenFindReplace();
                            setMenuOpenId(null);
                            onClose();
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-blue-600/20 text-blue-400 font-semibold"
                        >
                          <Search className="w-3.5 h-3.5" /> Find & Replace Color
                        </button>
                        {!isBackground && layers.length > 1 && (
                          <>
                            <div className="h-px bg-slate-800 my-1" />
                            <button
                              onClick={() => {
                                onDeleteLayer(layer.id);
                                setMenuOpenId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-500/20 text-red-400 font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Bar (matching showcase Screen 6: Hide, Lock, Duplicate, Delete) */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-around">
          <button
            onClick={() => onToggleVisibility(activeLayerId)}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white"
          >
            <Eye className="w-4 h-4" />
            <span>Hide</span>
          </button>
          <button
            onClick={() => onToggleLock(activeLayerId)}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white"
          >
            <Lock className="w-4 h-4" />
            <span>Lock</span>
          </button>
          <button
            onClick={() => onDuplicateLayer(activeLayerId)}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white"
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={() => {
              if (layers.length > 1) onDeleteLayer(activeLayerId);
            }}
            disabled={layers.length <= 1}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              layers.length > 1 ? 'text-red-400 hover:text-red-300' : 'text-slate-600'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
