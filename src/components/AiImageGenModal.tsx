import React, { useState } from 'react';
import { X, Sparkles, Download, Layers, Image as ImageIcon, Loader2 } from 'lucide-react';

interface AiImageGenModalProps {
  onAddAsReference: (imageUrl: string) => void;
  onAddAsLayer: (imageUrl: string) => void;
  onClose: () => void;
}

export const AiImageGenModal: React.FC<AiImageGenModalProps> = ({
  onAddAsReference,
  onAddAsLayer,
  onClose,
}) => {
  const [prompt, setPrompt] = useState<string>('Anime girl portrait with vibrant red hair, dramatic hoodie lighting, studio anime digital art');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          imageSize,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMsg(err.message || 'Error communicating with Gemini');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white">AI Art & Reference Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Prompt */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Art Prompt</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the reference character, pose, landscape, or color palette..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none font-medium"
            />
          </div>

          {/* Image Size Affordance (1K, 2K, 4K) as required */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Resolution Size</label>
              <span className="text-[10px] text-purple-400 font-mono">gemini-3-pro-image-preview</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['1K', '2K', '4K'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setImageSize(sz)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    imageSize === sz
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sz} {sz === '1K' ? '(Standard)' : sz === '2K' ? '(High Res)' : '(Ultra 4K)'}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Aspect Ratio</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    aspectRatio === r
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Preview or Result */}
          {generatedImage && (
            <div className="relative aspect-square w-full rounded-2xl bg-slate-950 border border-purple-500/30 overflow-hidden flex items-center justify-center shadow-lg">
              <img src={generatedImage} alt="Generated Artwork" className="w-full h-full object-contain" />
              <div className="absolute top-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded-md text-[10px] font-mono text-purple-300 border border-purple-500/30">
                {imageSize}
              </div>
            </div>
          )}

          {/* Action on Generated Result */}
          {generatedImage && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  onAddAsReference(generatedImage);
                  onClose();
                }}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Use as Reference (30%)</span>
              </button>
              <button
                onClick={() => {
                  onAddAsLayer(generatedImage);
                  onClose();
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Add to Canvas Layer</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating {imageSize} Art with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate High-Quality Image ({imageSize})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
