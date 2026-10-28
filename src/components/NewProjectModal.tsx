import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, Sliders } from 'lucide-react';
import { Project, LayerItem } from '../types/canvas';

interface NewProjectModalProps {
  initialRatio?: string;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  initialRatio = '1:1',
  onClose,
  onCreateProject,
}) => {
  const [ratio, setRatio] = useState<string>(initialRatio);
  const [quality, setQuality] = useState<string>('1080p');
  const [width, setWidth] = useState<number>(1080);
  const [height, setHeight] = useState<number>(1080);
  const [projectName, setProjectName] = useState<string>('Untitled Artwork');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');

  const ratioOptions = [
    { id: '1:1', label: '1:1', baseW: 1080, baseH: 1080 },
    { id: '16:9', label: '16:9', baseW: 1920, baseH: 1080 },
    { id: '9:16', label: '9:16', baseW: 1080, baseH: 1920 },
    { id: '4:3', label: '4:3', baseW: 1440, baseH: 1080 },
    { id: '3:4', label: '3:4', baseW: 1080, baseH: 1440 },
    { id: '3:2', label: '3:2', baseW: 1620, baseH: 1080 },
    { id: '2:3', label: '2:3', baseW: 1080, baseH: 1620 },
    { id: 'custom', label: 'Custom', baseW: 1080, baseH: 1080 },
  ];

  const qualityOptions = [
    { id: '720p', label: '720p', sub: '1280×720', mult: 0.67 },
    { id: '1080p', label: '1080p', sub: '1920×1080', mult: 1.0 },
    { id: '2K', label: '2K', sub: '2560×1440', mult: 1.33 },
    { id: '4K', label: '4K', sub: '3840×2160', mult: 2.0 },
  ];

  // Recalculate dimensions based on selected ratio & quality
  useEffect(() => {
    if (ratio === 'custom') return;
    const selectedRatio = ratioOptions.find((r) => r.id === ratio) || ratioOptions[0];
    const selectedQual = qualityOptions.find((q) => q.id === quality) || qualityOptions[1];

    let w = Math.round(selectedRatio.baseW * selectedQual.mult);
    let h = Math.round(selectedRatio.baseH * selectedQual.mult);

    // Keep within reasonable device boundaries
    setWidth(w);
    setHeight(h);
  }, [ratio, quality]);

  // Estimated memory in MB: width * height * 4 bytes * 2 buffers / (1024 * 1024)
  const estimatedMB = ((width * height * 4 * 2) / (1024 * 1024)).toFixed(1);
  const isHighRAM = width >= 2560 || height >= 2560;

  const handleCreate = () => {
    const defaultLayer: LayerItem = {
      id: `layer_${Date.now()}_1`,
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      items: [],
    };

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: projectName.trim() || 'Untitled Artwork',
      aspectRatio: ratio,
      quality,
      width,
      height,
      backgroundColor,
      activeLayerId: defaultLayer.id,
      layers: [defaultLayer],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreateProject(newProject);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Project Name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Anime Sketch, Character Design"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Canvas Aspect Ratio */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Canvas Ratio</label>
            <div className="grid grid-cols-4 gap-2">
              {ratioOptions.map((opt) => {
                const isSelected = ratio === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setRatio(opt.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm shadow-blue-500/20'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`border-2 rounded-xs mb-1.5 ${
                        isSelected ? 'border-blue-400' : 'border-slate-600'
                      } ${
                        opt.id === '1:1'
                          ? 'w-5 h-5'
                          : opt.id === '16:9'
                          ? 'w-6 h-3.5'
                          : opt.id === '9:16'
                          ? 'w-3.5 h-6'
                          : opt.id === '4:3'
                          ? 'w-5.5 h-4'
                          : opt.id === '3:4'
                          ? 'w-4 h-5.5'
                          : opt.id === '3:2'
                          ? 'w-5.5 h-3.5'
                          : opt.id === '2:3'
                          ? 'w-3.5 h-5.5'
                          : 'w-5 h-5 border-dashed'
                      }`}
                    />
                    <span className="text-[11px] font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality / Resolution */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Quality / Resolution</label>
            <div className="grid grid-cols-4 gap-2">
              {qualityOptions.map((opt) => {
                const isSelected = quality === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setQuality(opt.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm shadow-blue-500/20'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Resolution Inputs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Custom Resolution</label>
              <span className="text-[10px] text-slate-500">pixels</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <span className="text-[10px] font-mono text-slate-500 mr-2 uppercase">Width</span>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => {
                    setWidth(Math.max(100, Math.min(8192, parseInt(e.target.value) || 1080)));
                    setRatio('custom');
                  }}
                  className="w-full bg-transparent text-sm font-mono text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <span className="text-[10px] font-mono text-slate-500 mr-2 uppercase">Height</span>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    setHeight(Math.max(100, Math.min(8192, parseInt(e.target.value) || 1080)));
                    setRatio('custom');
                  }}
                  className="w-full bg-transparent text-sm font-mono text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Canvas Background Color */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Background Color</label>
            <div className="flex items-center gap-3">
              {[
                { label: 'White', color: '#ffffff' },
                { label: 'Dark', color: '#0f172a' },
                { label: 'Cream', color: '#fef3c7' },
                { label: 'Transparent', color: 'transparent' },
              ].map((bg) => (
                <button
                  key={bg.label}
                  onClick={() => setBackgroundColor(bg.color)}
                  className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                    backgroundColor === bg.color
                      ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-600 shadow-xs"
                    style={{
                      backgroundColor: bg.color === 'transparent' ? '#fff' : bg.color,
                      backgroundImage:
                        bg.color === 'transparent'
                          ? 'repeating-conic-gradient(#808080 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
                          : 'none',
                    }}
                  />
                  <span>{bg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Size & RAM Warning */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
              isHighRAM
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-400'
            }`}
          >
            {isHighRAM ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Sliders className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-white">
                Estimated size: <span className="text-blue-400">{estimatedMB} MB</span>
              </p>
              <p className="text-[11px] mt-0.5 text-slate-400">
                {isHighRAM
                  ? 'High resolution requires more RAM and GPU memory. Best for high-end devices.'
                  : 'Optimized for smooth, lag-free drawing on mobile and tablet devices.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <button
            onClick={handleCreate}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Create Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
