import React, { useState } from 'react';
import { X, Save, Check, HardDrive } from 'lucide-react';
import { Project } from '../types/canvas';

interface SaveProjectModalProps {
  project: Project;
  onSave: (newName: string, saveToDevice: boolean) => void;
  onClose: () => void;
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  project,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState<string>(project.name);
  const [saveToDevice, setSaveToDevice] = useState<boolean>(true);

  const handleSave = () => {
    onSave(name.trim() || 'Untitled Artwork', saveToDevice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-white">Save Project</h2>
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
          {/* Project Name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          {/* Canvas Size */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Canvas Size</span>
            <span className="text-xs font-mono font-bold text-white">
              {project.width} × {project.height} ({project.aspectRatio})
            </span>
          </div>

          {/* Resolution */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Resolution</span>
            <span className="text-xs font-mono font-bold text-blue-400 uppercase">
              {project.quality}
            </span>
          </div>

          {/* Save to Device Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Save to Device</span>
                <span className="text-[10px] text-slate-500 block">IndexedDB offline persistent storage</span>
              </div>
            </div>
            <button
              onClick={() => setSaveToDevice(!saveToDevice)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                saveToDevice ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
