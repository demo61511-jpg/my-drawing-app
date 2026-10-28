import React, { useState } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Image as ImageIcon,
  Film,
  Pencil,
  Save,
  MoreVertical,
  Download,
  Settings,
  Search,
  Trash2,
  Maximize2,
  RotateCcw,
  Sparkles,
  Minus,
  Plus,
  X,
} from 'lucide-react';

export const FingerIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={`${className} transform rotate-180`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Pointing index finger (downward when rotated 180) */}
    <path d="M11 2v13.5a1.5 1.5 0 0 0 3 0V9a1.5 1.5 0 0 1 3 0v4.5c0 4.14-3.36 7.5-7.5 7.5S2 17.64 2 13.5V9a1.5 1.5 0 0 1 3 0v3a1.5 1.5 0 0 0 3 0V2a1.5 1.5 0 0 1 3 0z" />
  </svg>
);

interface TopBarProps {
  projectName: string;
  canUndo: boolean;
  canRedo: boolean;
  appMode?: 'drawing' | 'animation';
  isToolbarOpen?: boolean;
  activePanel?: string;
  isFingerMenuOpen?: boolean;
  onToggleFingerMenu?: () => void;
  currentToolSize?: number;
  currentToolOpacity?: number;
  activeToolName?: string;
  onUpdateToolSize?: (size: number) => void;
  onUpdateToolOpacity?: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBackToHome: () => void;
  onToggleReferenceModal: () => void;
  onToggleAnimationMode?: () => void;
  onToggleFloatingToolbar?: () => void;
  onOpenSaveModal: () => void;
  onOpenExportModal: () => void;
  onOpenProjectSettings: () => void;
  onOpenFindReplace: () => void;
  onOpenAiAssistant: () => void;
  onClearActiveLayer: () => void;
  onFitToScreen: () => void;
  onResetRotation: () => void;
  hasReferenceImage: boolean;
  canvasRotation: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  canUndo,
  canRedo,
  appMode = 'drawing',
  isToolbarOpen = false,
  activePanel = 'none',
  isFingerMenuOpen = false,
  onToggleFingerMenu,
  currentToolSize = 5,
  currentToolOpacity = 1,
  activeToolName = 'brush',
  onUpdateToolSize,
  onUpdateToolOpacity,
  onUndo,
  onRedo,
  onBackToHome,
  onToggleReferenceModal,
  onToggleAnimationMode,
  onToggleFloatingToolbar,
  onOpenSaveModal,
  onOpenExportModal,
  onOpenProjectSettings,
  onOpenFindReplace,
  onOpenAiAssistant,
  onClearActiveLayer,
  onFitToScreen,
  onResetRotation,
  hasReferenceImage,
  canvasRotation,
}) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  return (
    <header className="h-14 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 flex items-center justify-between z-30 select-none">
      {/* Left side: Back arrow & Project title */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBackToHome}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          title="Back to Projects"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold text-white max-w-[120px] sm:max-w-[180px] truncate">
          {projectName}
        </span>
      </div>

      {/* Middle: Finger Button, Floating Toolbar Toggle (Pencil Icon) & Undo/Redo */}
      <div className="flex items-center gap-1.5">
        {/* Finger Quick Size & Opacity Button */}
        {onToggleFingerMenu && (
          <button
            onClick={onToggleFingerMenu}
            className={`p-2 rounded-xl transition-all flex items-center justify-center text-xs ${
              isFingerMenuOpen
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
            title="Stroke Width & Opacity Settings"
          >
            <FingerIcon className="w-4 h-4" />
          </button>
        )}

        {/* Floating Toolbar Toggle Pencil Button */}
        {onToggleFloatingToolbar && (
          <button
            onClick={onToggleFloatingToolbar}
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 font-medium text-xs ${
              isToolbarOpen || activePanel !== 'none'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
            title="Toggle Floating Toolbar"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">Tools</span>
          </button>
        )}

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Undo (or 2-finger tap)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Redo (or 3-finger tap)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {Math.abs(canvasRotation) > 0.05 && (
          <button
            onClick={onResetRotation}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-semibold"
            title="Reset Canvas Angle"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{Math.round((canvasRotation * 180) / Math.PI)}°</span>
          </button>
        )}
      </div>

      {/* Right side: Reference, Save, AI Mentor, More Menu */}
      <div className="flex items-center gap-1.5">
        {/* Reference Image Button */}
        <button
          onClick={onToggleReferenceModal}
          className={`p-2 rounded-xl transition-all relative ${
            hasReferenceImage
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
          title="Reference Image / Gallery"
        >
          <ImageIcon className="w-4 h-4" />
          {hasReferenceImage && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </button>

        {/* Animation Mode Icon Button (Immediately to the right of Image icon) */}
        <button
          onClick={onToggleAnimationMode}
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            appMode === 'animation'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
          title="Toggle 2D Animation Timeline Mode"
        >
          <Film className="w-4 h-4" />
        </button>



        {/* Save Project */}
        <button
          onClick={onOpenSaveModal}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          title="Save Project"
        >
          <Save className="w-4 h-4" />
        </button>

        {/* More Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-1.5 z-50 text-xs text-slate-200"
              onClick={() => setMenuOpen(false)}
            >
              <button
                onClick={onOpenExportModal}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-blue-400 font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Export Artwork</span>
              </button>

              <button
                onClick={onOpenFindReplace}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-emerald-400 font-semibold"
              >
                <Search className="w-4 h-4" />
                <span>Find & Replace Color</span>
              </button>

              <button
                onClick={onFitToScreen}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-800"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Fit Canvas to Screen</span>
              </button>

              <button
                onClick={onResetRotation}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-800"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Rotation</span>
              </button>

              <div className="h-px bg-slate-800 my-1" />

              <button
                onClick={onOpenProjectSettings}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-800"
              >
                <Settings className="w-4 h-4" />
                <span>Project Settings</span>
              </button>

              <button
                onClick={onClearActiveLayer}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-red-500/20 text-red-400 font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Active Layer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Size & Opacity Layout (Finger Tool Quick Popover) */}
      {isFingerMenuOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[85vw] max-w-[260px] bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 rounded-xl shadow-2xl p-3 text-white animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Header row with Tool mode label and Close button */}
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800 text-[10px]">
            <div className="flex items-center gap-1">
              <FingerIcon className="w-3 h-3 text-blue-400" />
              <span className="font-bold text-slate-200">
                {activeToolName === 'eraser' ? 'Eraser' : 'Stroke'}
              </span>
            </div>
            <button
              onClick={onToggleFingerMenu}
              className="p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Upper Section: Stroke Width / Size */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1 text-[10px]">
              <span className="text-slate-300 font-semibold">
                {activeToolName === 'eraser' ? 'Size' : 'Width'}
              </span>
              <span className="font-mono font-bold text-slate-100">{currentToolSize ?? 5}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateToolSize && onUpdateToolSize(Math.max(1, (currentToolSize ?? 5) - 1))}
                className="w-5 h-5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
                title="Decrease"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <input
                type="range"
                min="1"
                max="100"
                value={currentToolSize ?? 5}
                onChange={(e) => onUpdateToolSize && onUpdateToolSize(Number(e.target.value))}
                className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <button
                onClick={() => onUpdateToolSize && onUpdateToolSize(Math.min(100, (currentToolSize ?? 5) + 1))}
                className="w-5 h-5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
                title="Increase"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Lower Section: Opacity */}
          <div>
            <div className="flex justify-between items-center mb-1 text-[10px]">
              <span className="text-slate-300 font-semibold">Opacity</span>
              <span className="font-mono font-bold text-slate-100">
                {Math.round((currentToolOpacity ?? 1) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  onUpdateToolOpacity &&
                  onUpdateToolOpacity(Math.max(0.01, (currentToolOpacity ?? 1) - 0.05))
                }
                className="w-5 h-5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
                title="Decrease"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <input
                type="range"
                min="1"
                max="100"
                value={Math.round((currentToolOpacity ?? 1) * 100)}
                onChange={(e) => onUpdateToolOpacity && onUpdateToolOpacity(Number(e.target.value) / 100)}
                className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <button
                onClick={() =>
                  onUpdateToolOpacity &&
                  onUpdateToolOpacity(Math.min(1, (currentToolOpacity ?? 1) + 0.05))
                }
                className="w-5 h-5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
                title="Increase"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
