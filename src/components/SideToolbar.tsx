import React from 'react';
import {
  Pencil,
  Paintbrush,
  PenTool,
  Highlighter,
  Eraser,
  PaintBucket,
  Pipette,
  Shapes,
  LassoSelect,
  Move,
  Spline,
  MousePointer,
  Hand,
} from 'lucide-react';
import { ToolType } from '../types/canvas';

interface SideToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onOpenToolSettings: (tool: ToolType) => void;
}

export const SideToolbar: React.FC<SideToolbarProps> = ({
  activeTool,
  onSelectTool,
  onOpenToolSettings,
}) => {
  const tools: { id: ToolType; label: string; icon: React.ElementType }[] = [
    { id: 'brush', label: 'Brush', icon: Paintbrush },
    { id: 'pencil', label: 'Pencil', icon: Pencil },
    { id: 'pen', label: 'Pen', icon: PenTool },
    { id: 'curve', label: 'Curve Tool', icon: Spline },
    { id: 'marker', label: 'Marker', icon: Highlighter },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'fill', label: 'Bucket Fill', icon: PaintBucket },
    { id: 'eyedropper', label: 'Eyedropper', icon: Pipette },
    { id: 'shape', label: 'Shapes', icon: Shapes },
    { id: 'select', label: 'Select Object', icon: MousePointer },
    { id: 'lasso', label: 'Lasso Select', icon: LassoSelect },
    { id: 'transform', label: 'Transform', icon: Move },
    { id: 'hand', label: 'Pan Canvas', icon: Hand },
  ];

  return (
    <aside className="absolute left-3 top-16 z-20 hidden md:flex flex-col bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-1.5 shadow-xl gap-1 select-none">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;

        return (
          <button
            key={t.id}
            onClick={() => {
              if (isActive && ['brush', 'pencil', 'pen', 'marker', 'fill', 'shape', 'curve'].includes(t.id)) {
                onOpenToolSettings(t.id);
              } else {
                onSelectTool(t.id);
              }
            }}
            className={`p-2 rounded-xl transition-all relative group ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title={`${t.label} (Double tap for settings)`}
          >
            <Icon className="w-4 h-4" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 shadow-lg">
              {t.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
