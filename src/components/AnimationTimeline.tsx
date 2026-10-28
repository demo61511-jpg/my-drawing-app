import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  ClipboardPaste,
  Diamond,
  Circle,
  CircleDot,
  ArrowRight,
  Pencil,
  Repeat,
  PlusSquare,
  MinusSquare,
  MoveRight,
} from 'lucide-react';
import {
  Project,
  LayerItem,
  AnimationProjectData,
  LayerFrame,
} from '../types/canvas';
import {
  ensureLayerFrames,
  insertKeyframeAt,
  insertBlankKeyframeAt,
  insertFrameAt,
  deleteFrameAt,
  deleteKeyframeAt,
  copyFrameAt,
  pasteFrameAt,
  toggleClassicTweenAt,
  getEffectiveLayerItems,
} from '../utils/frameAnimationEngine';

interface AnimationTimelineProps {
  project: Project;
  animationData: AnimationProjectData;
  activeLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onUpdateAnimationData: (newAnimData: AnimationProjectData) => void;
  onUpdateProjectLayers: (newLayers: LayerItem[], pushHistory?: boolean) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock?: (layerId: string) => void;
  onSwitchToDrawingMode: () => void;
}

export const AnimationTimeline: React.FC<AnimationTimelineProps> = ({
  project,
  animationData,
  activeLayerId,
  onSelectLayer,
  onUpdateAnimationData,
  onUpdateProjectLayers,
  onAddLayer,
  onDeleteLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onSwitchToDrawingMode,
}) => {
  const [drawerHeight, setDrawerHeight] = useState<number>(340);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [copiedFrame, setCopiedFrame] = useState<LayerFrame | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const rulerRef = useRef<HTMLDivElement | null>(null);
  const tracksRef = useRef<HTMLDivElement | null>(null);

  const { fps, durationFrames, currentFrame, isPlaying, loop } = animationData;

  const CELL_WIDTH = 15; // Width in px for each frame cell (standard Adobe Animate grid width)

  // Status message popup helper
  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 1800);
  };

  // Active layer helper
  const activeLayer = useMemo(() => {
    return project.layers.find((l) => l.id === activeLayerId) || project.layers[0];
  }, [project.layers, activeLayerId]);

  // Check if current active layer frame has classic tween
  const isCurrentFrameClassicTween = useMemo(() => {
    if (!activeLayer || !activeLayer.frames) return false;
    const kfs = Object.values(activeLayer.frames)
      .filter((f) => f.type === 'keyframe')
      .sort((a, b) => a.frame - b.frame);
    const targetKf = kfs.filter((f) => f.frame <= currentFrame).pop();
    return Boolean(targetKf?.hasClassicTween);
  }, [activeLayer, currentFrame]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    onUpdateAnimationData({
      ...animationData,
      isPlaying: !isPlaying,
    });
  };

  // Reset to Frame 0
  const handleReset = () => {
    onUpdateAnimationData({
      ...animationData,
      isPlaying: false,
      currentFrame: 0,
    });
  };

  // Step Frame
  const handleStepFrame = (delta: number) => {
    const nextFrame = Math.max(0, Math.min(durationFrames - 1, currentFrame + delta));
    onUpdateAnimationData({
      ...animationData,
      isPlaying: false,
      currentFrame: nextFrame,
    });
  };

  // Toggle Loop
  const handleToggleLoop = () => {
    onUpdateAnimationData({
      ...animationData,
      loop: !loop,
    });
  };

  // Change FPS
  const handleChangeFPS = (newFps: number) => {
    onUpdateAnimationData({
      ...animationData,
      fps: newFps,
    });
  };

  // Layer Lock Toggle
  const handleToggleLock = (layerId: string) => {
    if (onToggleLayerLock) {
      onToggleLayerLock(layerId);
    } else {
      const updated = project.layers.map((l) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      );
      onUpdateProjectLayers(updated, true);
    }
  };

  // Layer Rename Finish
  const handleFinishRename = (layerId: string) => {
    if (!editingLayerName.trim()) {
      setEditingLayerId(null);
      return;
    }
    const updated = project.layers.map((l) =>
      l.id === layerId ? { ...l, name: editingLayerName.trim() } : l
    );
    onUpdateProjectLayers(updated, true);
    setEditingLayerId(null);
  };

  // --- Frame by Frame & Keyframe Operations ---

  // 1. Insert Keyframe (F6) - copies artwork from prior keyframe
  const handleInsertKeyframe = () => {
    if (!activeLayer) return;
    if (activeLayer.locked) {
      showNotice('Cannot edit locked layer');
      return;
    }
    const updatedLayer = insertKeyframeAt(activeLayer, currentFrame);
    const updatedLayers = project.layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
    onUpdateProjectLayers(updatedLayers, true);
    showNotice(`Keyframe added at frame ${currentFrame}`);
  };

  // 2. Insert Blank Keyframe (F7) - blank canvas for frame-by-frame drawing
  const handleInsertBlankKeyframe = () => {
    if (!activeLayer) return;
    if (activeLayer.locked) {
      showNotice('Cannot edit locked layer');
      return;
    }
    const updatedLayer = insertBlankKeyframeAt(activeLayer, currentFrame);
    const updatedLayers = project.layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
    onUpdateProjectLayers(updatedLayers, true);
    showNotice(`Blank Keyframe added at frame ${currentFrame}`);
  };

  // 3. Insert Frame (F5) - extends frame exposure
  const handleInsertFrame = () => {
    if (!activeLayer) return;
    if (activeLayer.locked) {
      showNotice('Cannot edit locked layer');
      return;
    }
    const updatedLayer = insertFrameAt(activeLayer, currentFrame);
    const updatedLayers = project.layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
    onUpdateProjectLayers(updatedLayers, true);
    showNotice(`Frame inserted at ${currentFrame}`);
  };

  // 4. Delete Keyframe / Clear Keyframe (Shift+F6)
  const handleDeleteKeyframe = () => {
    if (!activeLayer) return;
    if (activeLayer.locked) {
      showNotice('Cannot edit locked layer');
      return;
    }
    const updatedLayer = deleteKeyframeAt(activeLayer, currentFrame);
    const updatedLayers = project.layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
    onUpdateProjectLayers(updatedLayers, true);
    showNotice(`Keyframe cleared at frame ${currentFrame}`);
  };

  // 5. Delete Frame (Shift+F5)
  const handleDeleteFrame = () => {
    if (!activeLayer) return;
    if (activeLayer.locked) {
      showNotice('Cannot edit locked layer');
      return;
    }
    const updatedLayer = deleteFrameAt(activeLayer, currentFrame);
    const updatedLayers = project.layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
    onUpdateProjectLayers(updatedLayers, true);
    showNotice(`Frame deleted at ${currentFrame}`);
  };

  // 6. Copy Frame
  const handleCopyFrame = () => {
    if (!activeLayer) return;
    const copied = copyFrameAt(activeLayer, currentFrame);
    setCopiedFrame(copied);
    showNotice(`Copied frame ${currentFrame}`);
  };

  // 7. Paste Frame
  const handlePasteFrame = () => {
    if (!activeLayer || !copiedFrame) {
      showNotice('No frame copied');
      return;
    }
    if (activeLayer.locked) {
      showNotice('Cannot edit locked layer');
      return;
    }
    const updatedLayer = pasteFrameAt(activeLayer, currentFrame, copiedFrame);
    const updatedLayers = project.layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
    onUpdateProjectLayers(updatedLayers, true);
    showNotice(`Pasted to frame ${currentFrame}`);
  };

  // 8. Classic Tween (Classic Twine) Add / Delete
  const handleToggleClassicTween = () => {
    if (!activeLayer) return;
    if (activeLayer.locked) {
      showNotice('Cannot edit locked layer');
      return;
    }
    const updatedLayer = toggleClassicTweenAt(activeLayer, currentFrame);
    const updatedLayers = project.layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
    onUpdateProjectLayers(updatedLayers, true);
    showNotice(
      !isCurrentFrameClassicTween ? 'Classic Tween Created ●────>○' : 'Classic Tween Removed'
    );
  };

  // Calculate frame from clientX coordinate
  const getFrameFromClientX = useCallback(
    (clientX: number): number => {
      if (!tracksRef.current) return 0;
      const rect = tracksRef.current.getBoundingClientRect();
      const scrollLeft = tracksRef.current.scrollLeft || 0;
      const offsetX = clientX - rect.left + scrollLeft;
      const frame = Math.max(0, Math.min(durationFrames - 1, Math.floor(offsetX / CELL_WIDTH)));
      return frame;
    },
    [durationFrames, CELL_WIDTH]
  );

  // Auto-scroll timeline to keep playhead in view during playback or scrubbing
  useEffect(() => {
    if (!tracksRef.current) return;
    const container = tracksRef.current;
    const playheadX = currentFrame * CELL_WIDTH;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;

    if (playheadX < scrollLeft + 20) {
      container.scrollLeft = Math.max(0, playheadX - 40);
    } else if (playheadX > scrollLeft + clientWidth - 60) {
      container.scrollLeft = playheadX - clientWidth + 80;
    }
  }, [currentFrame, CELL_WIDTH]);

  // Track pan/scroll state for mouse dragging on timeline grid
  const isPanDraggingRef = useRef<boolean>(false);
  const panStartClientXRef = useRef<number>(0);
  const panStartScrollLeftRef = useRef<number>(0);

  // Smooth Mouse/Touch Drag-to-Scroll Timeline Grid (Swipe Left/Right to see remaining frames 6 to 10+)
  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest('.ruler-header, .playhead-handle')) {
      return;
    }

    isPanDraggingRef.current = true;
    panStartClientXRef.current = e.clientX;
    panStartScrollLeftRef.current = tracksRef.current?.scrollLeft || 0;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!isPanDraggingRef.current || !tracksRef.current) return;
      const dx = moveEvt.clientX - panStartClientXRef.current;
      tracksRef.current.scrollLeft = panStartScrollLeftRef.current - dx;
    };

    const handlePointerUp = () => {
      isPanDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Direct Touch and Pointer Scrubbing on Frame Ruler and Playhead Handle
  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isPlaying) {
      onUpdateAnimationData({ ...animationData, isPlaying: false });
    }
    const frame = getFrameFromClientX(e.clientX);
    onUpdateAnimationData({ ...animationData, isPlaying: false, currentFrame: frame });

    const handlePointerMove = (moveEvt: PointerEvent) => {
      moveEvt.preventDefault();
      const nextFrame = getFrameFromClientX(moveEvt.clientX);
      onUpdateAnimationData({ ...animationData, isPlaying: false, currentFrame: nextFrame });

      // Auto-scroll timeline while scrubbing near edges
      if (tracksRef.current) {
        const rect = tracksRef.current.getBoundingClientRect();
        if (moveEvt.clientX > rect.right - 50) {
          tracksRef.current.scrollLeft += 12;
        } else if (moveEvt.clientX < rect.left + 50) {
          tracksRef.current.scrollLeft -= 12;
        }
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleScrubTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    if (isPlaying) {
      onUpdateAnimationData({ ...animationData, isPlaying: false });
    }
    const frame = getFrameFromClientX(e.touches[0].clientX);
    onUpdateAnimationData({ ...animationData, isPlaying: false, currentFrame: frame });

    const handleTouchMove = (moveEvt: TouchEvent) => {
      if (moveEvt.touches.length !== 1) return;
      moveEvt.preventDefault();
      const nextFrame = getFrameFromClientX(moveEvt.touches[0].clientX);
      onUpdateAnimationData({ ...animationData, isPlaying: false, currentFrame: nextFrame });

      // Auto-scroll timeline while scrubbing near edges
      if (tracksRef.current) {
        const rect = tracksRef.current.getBoundingClientRect();
        if (moveEvt.touches[0].clientX > rect.right - 50) {
          tracksRef.current.scrollLeft += 12;
        } else if (moveEvt.touches[0].clientX < rect.left + 50) {
          tracksRef.current.scrollLeft -= 12;
        }
      }
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
  };

  // Keyboard Shortcuts (F5, F6, F7, Shift+F5, Shift+F6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'F6' && !e.shiftKey) {
        e.preventDefault();
        handleInsertKeyframe();
      } else if (e.key === 'F6' && e.shiftKey) {
        e.preventDefault();
        handleDeleteKeyframe();
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleInsertBlankKeyframe();
      } else if (e.key === 'F5' && !e.shiftKey) {
        e.preventDefault();
        handleInsertFrame();
      } else if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        handleDeleteFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Drawer Resizing Handler
  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      const newH = window.innerHeight - e.clientY;
      setDrawerHeight(Math.max(220, Math.min(window.innerHeight * 0.8, newH)));
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing]);

  // Sync scroll position between ruler and tracks
  const handleTracksScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rulerRef.current) {
      rulerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Format Timecode
  const formatTimecode = (frame: number, fpsVal: number) => {
    const totalSecs = frame / fpsVal;
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const frames = Math.floor(frame % fpsVal);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  const totalGridWidth = Math.max(900, (durationFrames + 10) * CELL_WIDTH);

  return (
    <div
      style={{ height: `${drawerHeight}px` }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#161B26] border-t border-[#2A3447] shadow-[0_-12px_45px_rgba(0,0,0,0.9)] flex flex-col text-slate-200 select-none touch-none font-sans"
    >
      {/* 1. Drawer Drag Resizer Handle */}
      <div
        onPointerDown={() => setIsResizing(true)}
        className="w-full h-2.5 cursor-ns-resize hover:bg-blue-500/20 flex items-center justify-center border-b border-[#222B3D] transition-colors group"
      >
        <div className="w-12 h-1 bg-slate-600 group-hover:bg-blue-400 rounded-full transition-colors" />
      </div>

      {/* 2. Adobe Animate / Illustrator CC Main Timeline Toolbar */}
      <div className="px-3 py-1.5 bg-[#1B2232] border-b border-[#263147] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
        {/* Left: Playback Controls & Frame Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleReset}
            className="p-1 rounded-md bg-[#232C3F] hover:bg-[#2F3B54] text-slate-300 active:scale-95 transition-all"
            title="Rewind to Frame 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStepFrame(-1)}
            className="p-1 rounded-md bg-[#232C3F] hover:bg-[#2F3B54] text-slate-300 active:scale-95 transition-all"
            title="Previous Frame (Left Arrow)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleTogglePlay}
            className={`px-2.5 py-1 rounded-md font-bold text-white shadow-md active:scale-95 transition-all flex items-center gap-1 ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            )}
            <span className="font-mono text-[11px]">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={() => handleStepFrame(1)}
            className="p-1 rounded-md bg-[#232C3F] hover:bg-[#2F3B54] text-slate-300 active:scale-95 transition-all"
            title="Next Frame (Right Arrow)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleLoop}
            className={`p-1 rounded-md active:scale-95 transition-all ${
              loop ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'bg-[#232C3F] text-slate-400 hover:text-white'
            }`}
            title={loop ? 'Looping Enabled' : 'Looping Disabled'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Time & Frame Counter */}
          <div className="flex items-center gap-1.5 bg-[#121722] border border-[#263147] px-2 py-0.5 rounded-md font-mono text-[11px]">
            <span className="text-blue-400 font-bold">F{currentFrame}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{durationFrames}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">{formatTimecode(currentFrame, fps)}</span>
          </div>

          {/* FPS selector */}
          <select
            value={fps}
            onChange={(e) => handleChangeFPS(parseInt(e.target.value))}
            className="bg-[#121722] border border-[#263147] text-slate-300 text-[11px] font-semibold rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
          >
            <option value={12}>12 fps</option>
            <option value={24}>24 fps</option>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </div>

        {/* Center: Adobe Illustrator CC / Animate Frame Operations Toolbar */}
        <div className="flex items-center gap-1 bg-[#121722] p-1 rounded-lg border border-[#263147] shrink-0">
          {/* Keyframe Add (F6) */}
          <button
            onClick={handleInsertKeyframe}
            className="px-2 py-1 rounded bg-[#1F2739] hover:bg-[#2A354E] hover:text-white text-slate-200 font-medium text-[11px] flex items-center gap-1 active:scale-95 transition-all"
            title="Insert Keyframe (F6) - copies artwork from previous frame"
          >
            <CircleDot className="w-3 h-3 text-blue-400 fill-blue-400" />
            <span>+ Keyframe (F6)</span>
          </button>

          {/* Blank Keyframe Add (F7) */}
          <button
            onClick={handleInsertBlankKeyframe}
            className="px-2 py-1 rounded bg-[#1F2739] hover:bg-[#2A354E] hover:text-white text-slate-200 font-medium text-[11px] flex items-center gap-1 active:scale-95 transition-all"
            title="Insert Blank Keyframe (F7) - creates blank frame to draw on"
          >
            <Circle className="w-3 h-3 text-amber-400" />
            <span>+ Blank (F7)</span>
          </button>

          {/* Insert Frame (F5) */}
          <button
            onClick={handleInsertFrame}
            className="px-2 py-1 rounded bg-[#1F2739] hover:bg-[#2A354E] hover:text-white text-slate-200 font-medium text-[11px] flex items-center gap-1 active:scale-95 transition-all"
            title="Insert Frame (F5) - extends frame exposure"
          >
            <PlusSquare className="w-3 h-3 text-emerald-400" />
            <span>+ Frame (F5)</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-700/60 mx-0.5" />

          {/* Clear Keyframe (Shift+F6) */}
          <button
            onClick={handleDeleteKeyframe}
            className="px-2 py-1 rounded bg-[#1F2739] hover:bg-[#2A354E] hover:text-red-300 text-slate-300 font-medium text-[11px] flex items-center gap-1 active:scale-95 transition-all"
            title="Clear Keyframe (Shift+F6)"
          >
            <MinusSquare className="w-3 h-3 text-rose-400" />
            <span>Clear Keyframe</span>
          </button>

          {/* Delete Frame (Shift+F5) */}
          <button
            onClick={handleDeleteFrame}
            className="px-2 py-1 rounded bg-[#1F2739] hover:bg-[#2A354E] hover:text-red-300 text-slate-300 font-medium text-[11px] flex items-center gap-1 active:scale-95 transition-all"
            title="Delete Frame (Shift+F5)"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
            <span>Delete Frame</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-700/60 mx-0.5" />

          {/* Copy Frame */}
          <button
            onClick={handleCopyFrame}
            className="px-2 py-1 rounded bg-[#1F2739] hover:bg-[#2A354E] text-slate-200 font-medium text-[11px] flex items-center gap-1 active:scale-95 transition-all"
            title="Copy Frame (Ctrl+Alt+C)"
          >
            <Copy className="w-3 h-3 text-sky-400" />
            <span>Copy</span>
          </button>

          {/* Paste Frame */}
          <button
            onClick={handlePasteFrame}
            disabled={!copiedFrame}
            className={`px-2 py-1 rounded font-medium text-[11px] flex items-center gap-1 active:scale-95 transition-all ${
              copiedFrame
                ? 'bg-[#1F2739] hover:bg-[#2A354E] text-slate-200'
                : 'bg-transparent text-slate-600 cursor-not-allowed'
            }`}
            title="Paste Frame (Ctrl+Alt+V)"
          >
            <ClipboardPaste className="w-3 h-3 text-sky-400" />
            <span>Paste</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-700/60 mx-0.5" />

          {/* Classic Tween (Classic Twine) Button */}
          <button
            onClick={handleToggleClassicTween}
            className={`px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1.5 active:scale-95 transition-all border ${
              isCurrentFrameClassicTween
                ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                : 'bg-[#1F2739] hover:bg-[#2A354E] text-cyan-400 border-cyan-500/30'
            }`}
            title="Create or Remove Classic Motion Tween between keyframes (●────────>○)"
          >
            <MoveRight className="w-3.5 h-3.5" />
            <span>{isCurrentFrameClassicTween ? 'Classic Tween: ON' : 'Classic Tween'}</span>
          </button>
        </div>

        {/* Right: Auto Keyframe Status & Switch to Drawing Canvas */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="px-2 py-0.5 rounded bg-[#182030] border border-[#2D3A52] text-[10px] font-mono text-slate-300 flex items-center gap-1.5"
            title="Auto-Keyframe is disabled. Use + Keyframe (F6) or + Blank (F7) to manually set keyframes."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Auto-Keyframe: <strong className="text-amber-400 font-bold">OFF</strong></span>
          </div>
          <button
            onClick={onSwitchToDrawingMode}
            className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-sm shadow-purple-600/30 active:scale-95 transition-all flex items-center gap-1"
            title="Return to Full Drawing Canvas"
          >
            <Pencil className="w-3 h-3" />
            <span>Drawing Canvas</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Notice Toast */}
      {statusMessage && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg pointer-events-none animate-fade-in">
          {statusMessage}
        </div>
      )}

      {/* 3. Adobe Illustrator / Animate Timeline Grid Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Adobe Illustrator Style Layers Panel */}
        <div className="w-[110px] bg-[#141A26] border-r border-[#263147] flex flex-col shrink-0 z-20 shadow-lg">
          {/* Layer Headers Bar: '+' moved to left, 'eye' removed, compact layout without empty right space */}
          <div className="h-7 px-1.5 border-b border-[#263147] flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-[#101520]">
            <button
              onClick={onAddLayer}
              className="p-0.5 rounded hover:bg-blue-600/30 text-blue-400 hover:text-white shrink-0"
              title="Add New Layer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <span className="w-3.5 text-center shrink-0 text-slate-500" title="Lock column">🔒</span>
            <span className="truncate">Layers ({project.layers.length})</span>
          </div>

          {/* Layer Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1D2536]">
            {project.layers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              const isLocked = Boolean(layer.locked);
              const isVisible = layer.visible !== false;

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`h-9 px-1.5 flex items-center justify-between gap-1 cursor-pointer text-xs transition-colors ${
                    isActive
                      ? 'bg-[#1D4ED8]/30 text-white border-l-4 border-blue-500'
                      : 'text-slate-300 hover:bg-[#1A2233]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                    {/* Layer Visibility Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerVisibility(layer.id);
                      }}
                      className="p-0.5 hover:text-white text-slate-400 shrink-0"
                      title={isVisible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>

                    {/* Layer Lock Toggle (Adobe Illustrator Style Lock) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLock(layer.id);
                      }}
                      className="p-0.5 hover:text-white text-slate-400 shrink-0"
                      title={isLocked ? 'Layer Locked (click to unlock)' : 'Lock Layer'}
                    >
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>

                    {/* Layer Name (Double click to rename) */}
                    {editingLayerId === layer.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingLayerName}
                        onChange={(e) => setEditingLayerName(e.target.value)}
                        onBlur={() => handleFinishRename(layer.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(layer.id);
                          if (e.key === 'Escape') setEditingLayerId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0B0F19] border border-blue-500 rounded px-1 text-xs text-white outline-none w-14"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingLayerId(layer.id);
                          setEditingLayerName(layer.name);
                        }}
                        className={`truncate text-xs select-none ${
                          isLocked ? 'text-slate-400 line-through-none' : 'font-medium'
                        }`}
                        title="Double-click to rename"
                      >
                        {layer.name}
                      </span>
                    )}
                  </div>

                  {/* Layer Delete Button */}
                  {project.layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      title="Delete Layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Area: Horizontally Scrollable Frame Grid & Timeline */}
        <div
          ref={tracksRef}
          onScroll={handleTracksScroll}
          onPointerDown={handleGridPointerDown}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0D121D] flex flex-col select-none touch-pan-x cursor-grab active:cursor-grabbing"
        >
          {/* Main Timeline Grid Wrapper (Ensures Playhead spans from Ruler Header through Layer Rows) */}
          <div className="relative min-h-full flex flex-col" style={{ width: `${totalGridWidth}px` }}>

            {/* Red Adobe Playhead Needle spanning full height (Ruler Header + Layer Rows) */}
            <div
              style={{
                left: `${currentFrame * CELL_WIDTH + CELL_WIDTH / 2}px`,
              }}
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.9)]"
            >
              {/* Playhead Scrub Diamond Handle sitting directly on the Frame Ruler */}
              <div
                onPointerDown={handleScrubPointerDown}
                onTouchStart={handleScrubTouchStart}
                className="playhead-handle w-6 h-7 -translate-x-1/2 top-0 absolute pointer-events-auto cursor-ew-resize flex items-center justify-center touch-none z-40 group"
                title={`Playhead Frame ${currentFrame} (Drag left/right with mouse or finger)`}
              >
                <div className="w-3.5 h-3.5 bg-red-500 rotate-45 rounded-xs shadow-md border-2 border-white group-hover:scale-125 transition-transform" />
              </div>
            </div>

            {/* Frame Number Ruler Header */}
            <div
              ref={rulerRef}
              onPointerDown={handleScrubPointerDown}
              onTouchStart={handleScrubTouchStart}
              className="ruler-header h-7 border-b border-[#263147] bg-[#111724] sticky top-0 z-20 flex items-center touch-none select-none cursor-ew-resize"
              style={{ width: `${totalGridWidth}px` }}
            >
              {Array.from({ length: durationFrames }).map((_, fIdx) => {
                const isMajor = fIdx % 5 === 0;
                return (
                  <div
                    key={fIdx}
                    style={{ width: `${CELL_WIDTH}px` }}
                    className="h-full flex flex-col justify-end items-center relative border-r border-[#1C2538]"
                  >
                    {isMajor && (
                      <span className="text-[9px] font-mono text-slate-400 absolute top-0.5">
                        {fIdx}
                      </span>
                    )}
                    <div
                      className={`w-0.5 ${
                        isMajor ? 'bg-slate-500 h-2' : 'bg-slate-700/60 h-1'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Timeline Layer Rows Grid */}
            <div
              className="flex-1 flex flex-col divide-y divide-[#1D2536] relative"
              style={{ width: `${totalGridWidth}px` }}
            >

            {project.layers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              const framesMap = layer.frames || ensureLayerFrames(layer);
              const keyframesList = Object.values(framesMap)
                .filter((f) => f.type === 'keyframe' || f.type === 'blank')
                .sort((a, b) => a.frame - b.frame);

              return (
                <div
                  key={layer.id}
                  className={`h-9 flex items-center relative transition-colors ${
                    isActive ? 'bg-blue-900/10' : ''
                  }`}
                >
                  {/* Frame Cells */}
                  {Array.from({ length: durationFrames }).map((_, fIdx) => {
                    const isCurrent = fIdx === currentFrame;
                    const frameData = framesMap[fIdx];
                    const isExplicitKf = frameData && (frameData.type === 'keyframe' || frameData.type === 'blank');
                    const isBlank = frameData && frameData.type === 'blank';

                    // Find if inside classic tween span
                    let isInClassicTween = false;
                    let isTweenStart = false;
                    let isTweenEnd = false;

                    const prevKf = keyframesList.filter((k) => k.frame <= fIdx).pop();
                    if (prevKf && prevKf.hasClassicTween) {
                      const nextKf = keyframesList.find((k) => k.frame > prevKf.frame);
                      if (nextKf && fIdx <= nextKf.frame) {
                        isInClassicTween = true;
                        if (fIdx === prevKf.frame) isTweenStart = true;
                        if (fIdx === nextKf.frame) isTweenEnd = true;
                      }
                    }

                    // Background styling for cell
                    let cellBg = 'bg-[#121824] hover:bg-[#1A2335]';
                    if (isInClassicTween) {
                      cellBg = 'bg-[#0E3554]/70 border-y border-cyan-500/30';
                    }

                    return (
                      <div
                        key={fIdx}
                        style={{ width: `${CELL_WIDTH}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLayer(layer.id);
                          onUpdateAnimationData({
                            ...animationData,
                            isPlaying: false,
                            currentFrame: fIdx,
                          });
                        }}
                        className={`h-full flex items-center justify-center border-r border-[#1C2538] relative cursor-pointer ${cellBg}`}
                        title={`Frame ${fIdx} ${
                          isExplicitKf
                            ? isBlank
                              ? '(Blank Keyframe)'
                              : '(Keyframe)'
                            : isInClassicTween
                            ? '(Classic Tween Span)'
                            : ''
                        }`}
                      >
                        {/* Classic Tween Connecting Arrow line */}
                        {isInClassicTween && !isTweenStart && (
                          <div className="absolute inset-y-1/2 -translate-y-1/2 left-0 right-0 h-[1.5px] bg-cyan-400 z-0">
                            {isTweenEnd && (
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-3 border-y-transparent border-l-4 border-l-cyan-400" />
                            )}
                          </div>
                        )}

                        {/* Keyframe Icon Indicators */}
                        {isExplicitKf && (
                          <div className="z-10 flex items-center justify-center">
                            {isBlank ? (
                              // Hollow circle for Blank Keyframe (F7)
                              <div
                                className={`w-2.5 h-2.5 rounded-full border-2 bg-transparent ${
                                  isCurrent
                                    ? 'border-amber-400'
                                    : 'border-slate-300'
                                }`}
                              />
                            ) : (
                              // Solid circle for Keyframe (F6)
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                  isInClassicTween
                                    ? 'bg-cyan-400 border border-white'
                                    : isCurrent
                                    ? 'bg-amber-400 shadow-md'
                                    : 'bg-slate-200'
                                }`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
