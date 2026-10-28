import React, { useState } from 'react';
import { X, Download, Film, Image as ImageIcon, Check } from 'lucide-react';
import { Project } from '../types/canvas';

interface ExportModalProps {
  project: Project;
  onExport: (
    format: 'png' | 'jpeg' | 'webp',
    quality: number,
    transparentBg: boolean,
    cropToObjects: boolean
  ) => string | null | void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  onExport,
  onClose,
}) => {
  const [exportType, setExportType] = useState<'MP4' | 'GIF' | 'PNG'>('MP4');
  const [resolution, setResolution] = useState<string>('1080p (Full HD)');
  const [fps, setFps] = useState<number>(24);
  const [quality, setQuality] = useState<number>(96);
  const [transparentBg, setTransparentBg] = useState<boolean>(true);
  const [cropToObjects, setCropToObjects] = useState<boolean>(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  const handleExport = () => {
    const isTransparent = exportType === 'PNG' ? transparentBg : false;
    const url = onExport('png', quality / 100, isTransparent, cropToObjects);
    if (url && typeof url === 'string') {
      setExportedUrl(url);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-white">
              {exportedUrl ? 'Artwork Exported!' : 'Export'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {exportedUrl ? (
          /* Exported Success View */
          <div className="p-5 flex flex-col items-center text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>

            <p className="text-xs text-slate-300 font-medium">
              Export generated successfully!
            </p>

            {/* Exported Preview Box */}
            <div className="w-full max-h-56 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-3 flex items-center justify-center">
              <img
                src={exportedUrl}
                alt="Exported Artwork"
                className="max-h-48 w-auto object-contain rounded-lg shadow-md"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              💡 Long-press or tap below to save directly to Gallery.
            </p>

            <div className="w-full flex gap-2 pt-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.png`;
                  link.href = exportedUrl;
                  link.click();
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save to Gallery</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Export Options View (Matching Screen 10 in Showcase) */
          <>
            <div className="p-5 space-y-4">
              {/* Export Format Selector Tabs */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Format</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => setExportType('MP4')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                      exportType === 'MP4'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    MP4 (Video)
                  </button>
                  <button
                    onClick={() => setExportType('GIF')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                      exportType === 'GIF'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    GIF
                  </button>
                  <button
                    onClick={() => setExportType('PNG')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                      exportType === 'PNG'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Image Seq
                  </button>
                </div>
              </div>

              {/* Resolution Dropdown */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500"
                >
                  <option value="1080p (Full HD)">1080p (Full HD)</option>
                  <option value="720p (HD)">720p (HD)</option>
                  <option value="4K (Ultra HD)">4K (Ultra HD)</option>
                </select>
              </div>

              {/* Frame Rate Dropdown */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Frame Rate</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500"
                >
                  <option value={12}>12 FPS</option>
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>

              {/* Additional Options for Image/PNG Export */}
              {exportType === 'PNG' && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Transparent Background</span>
                      <span className="text-[10px] text-slate-400 block">Save without background color</span>
                    </div>
                    <button
                      onClick={() => setTransparentBg(!transparentBg)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        transparentBg ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Save Drawn Object Only</span>
                      <span className="text-[10px] text-slate-400 block">Crop image tightly around object</span>
                    </div>
                    <button
                      onClick={() => setCropToObjects(!cropToObjects)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        cropToObjects ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <button
                onClick={handleExport}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Export</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
