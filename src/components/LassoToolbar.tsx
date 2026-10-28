import React from 'react';
import { Move, Copy, Scissors, ClipboardPaste, Trash2, X } from 'lucide-react';

interface LassoToolbarProps {
  onTransform: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDeselect: () => void;
  canPaste: boolean;
}

export const LassoToolbar: React.FC<LassoToolbarProps> = ({
  onTransform,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  onDeselect,
  canPaste,
}) => {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl shadow-2xl px-2.5 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-3 duration-200 select-none overflow-x-auto max-w-[95vw]">
      <button
        onClick={onTransform}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl hover:bg-slate-800 text-blue-400 font-semibold text-[10px] transition-colors shrink-0"
      >
        <Move className="w-3.5 h-3.5" />
        <span>Transform</span>
      </button>

      <button
        onClick={onCopy}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold text-[10px] transition-colors shrink-0"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>Copy</span>
      </button>

      <button
        onClick={onCut}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold text-[10px] transition-colors shrink-0"
      >
        <Scissors className="w-3.5 h-3.5" />
        <span>Cut</span>
      </button>

      {canPaste && (
        <button
          onClick={onPaste}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold text-[10px] transition-colors shrink-0"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>Paste</span>
        </button>
      )}

      <button
        onClick={onDuplicate}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold text-[10px] transition-colors shrink-0"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>Duplicate</span>
      </button>

      <button
        onClick={onDelete}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl hover:bg-red-500/20 text-red-400 font-semibold text-[10px] transition-colors shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete</span>
      </button>

      <div className="w-px h-5 bg-slate-800 mx-0.5" />

      <button
        onClick={onDeselect}
        className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title="Deselect"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
