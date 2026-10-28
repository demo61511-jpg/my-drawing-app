import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Move,
  Maximize2,
  RotateCw,
  Crop,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { ImageItem } from '../types/canvas';

interface ReferenceModalProps {
  activeLayerName: string;
  activeLayerImageItem: ImageItem | undefined;
  onUpdateLayerImage: (update: Partial<ImageItem> | null) => void;
  onImportImageToLayer: (dataUrl: string, width: number, height: number) => void;
  onOpenAiGen: () => void;
  onClose: () => void;
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({
  activeLayerName,
  activeLayerImageItem,
  onUpdateLayerImage,
  onImportImageToLayer,
  onOpenAiGen,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting the same file triggers change
    e.target.value = '';
    setErrorMessage(null);
    setIsProcessing(true);

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (!file.type.startsWith('image/') && !validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Unsupported file format. Please choose a JPG, PNG, or WebP image.');
      setIsProcessing(false);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMessage('Failed to read image from device storage. Please check permissions.');
      setIsProcessing(false);
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        setErrorMessage('Failed to decode image data.');
        setIsProcessing(false);
      };
      img.onload = () => {
        onImportImageToLayer(dataUrl, img.width, img.height);
        setIsProcessing(false);
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Reference on {activeLayerName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4">
          {activeLayerImageItem && activeLayerImageItem.url ? (
            <>
              {/* Image Preview */}
              <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                <img
                  src={activeLayerImageItem.url}
                  alt="Reference"
                  className="w-full h-full object-contain"
                  style={{ opacity: activeLayerImageItem.opacity }}
                />
                <div className="absolute top-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded-md text-[10px] font-mono text-white border border-white/10">
                  {Math.round(activeLayerImageItem.opacity * 100)}%
                </div>
              </div>

              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-400">Opacity (Trace Mode)</span>
                  <span className="font-mono text-white">
                    {Math.round(activeLayerImageItem.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={Math.round(activeLayerImageItem.opacity * 100)}
                  onChange={(e) => onUpdateLayerImage({ opacity: parseInt(e.target.value) / 100 })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Scale Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-400">Scale</span>
                  <span className="font-mono text-white">
                    {Math.round((activeLayerImageItem.transform.scaleX || 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={Math.round((activeLayerImageItem.transform.scaleX || 1) * 100)}
                  onChange={(e) => {
                    const s = parseInt(e.target.value) / 100;
                    onUpdateLayerImage({
                      transform: { ...activeLayerImageItem.transform, scaleX: s, scaleY: s },
                    });
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() =>
                    onUpdateLayerImage({
                      transform: {
                        ...activeLayerImageItem.transform,
                        rotation: (activeLayerImageItem.transform.rotation + Math.PI / 2) % (Math.PI * 2),
                      },
                    })
                  }
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold gap-1 transition-all"
                >
                  <RotateCw className="w-4 h-4 text-blue-400" />
                  <span>Rotate</span>
                </button>
                <button
                  onClick={() =>
                    onUpdateLayerImage({
                      transform: {
                        ...activeLayerImageItem.transform,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                      },
                    })
                  }
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold gap-1 transition-all"
                >
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={() => onUpdateLayerImage(null)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[10px] font-semibold gap-1 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">No Reference on {activeLayerName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Import an image into this layer to trace, draw over, or transform.
                </p>
              </div>
            </div>
          )}

          {/* Upload and AI Buttons */}
          <div className="flex gap-2 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/jpg,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>{isProcessing ? 'Importing...' : 'Device Gallery'}</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenAiGen();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Generate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
