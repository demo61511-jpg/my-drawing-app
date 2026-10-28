import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2, Palette, Eye, BookOpen } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface AiAssistantModalProps {
  onClose: () => void;
  getCanvasSnapshot?: () => string | null;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  onClose,
  getCanvasSnapshot,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'model',
      text: "Hello artist! I'm your ArtFlow Creative Mentor powered by Gemini. Whether you need anatomy advice, color palette ideas, lineart tips, or a critique of your canvas, I'm here to help. What are you working on today?",
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Role selector
  const [role, setRole] = useState<'mentor' | 'color' | 'critique'>('mentor');
  // Model selector: gemini-4-argon for complex, gemini-3.8-flash for general, gemini-3.1-flash-lite for fast
  const [model, setModel] = useState<string>('gemini-3.8-flash');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const roles = [
    {
      id: 'mentor',
      title: 'Art Mentor',
      icon: BookOpen,
      instruction:
        'You are ArtFlow Mentor, an expert digital art instructor. Provide practical, step-by-step advice on anatomy, perspective, sketching, line weight, shading, and digital painting techniques. Be encouraging, concise, and constructive.',
    },
    {
      id: 'color',
      title: 'Color Theorist',
      icon: Palette,
      instruction:
        'You are a Master Color Theorist and digital lighting specialist. Suggest complementary, analogous, and triadic color schemes, provide hex codes for shading/highlights, and explain ambient lighting and color moods.',
    },
    {
      id: 'critique',
      title: 'Art Critique',
      icon: Eye,
      instruction:
        'You are a professional art director giving gentle, structured artistic critiques. Focus on composition, silhouette readability, focal points, values, and depth, offering specific actionable improvements.',
    },
  ];

  const currentRole = roles.find((r) => r.id === role) || roles[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userText = inputValue.trim();
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setLoading(true);

    try {
      // Format messages history for Gemini API
      const formattedHistory = newMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedHistory,
          systemInstruction: currentRole.instruction,
          model,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const modelMessage: ChatMessage = {
        id: `model_${Date.now()}`,
        role: 'model',
        text: data.text || 'Keep drawing and experimenting!',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Chat API Error:', err);
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: `ArtFlow Mentor Note: ${err.message || 'Could not connect. Please check your network or try again.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                ArtFlow Mentor
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300">
                  Gemini
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">{currentRole.title} Mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role & Model Selector Strip */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex flex-col gap-2">
          {/* Roles */}
          <div className="flex gap-1.5">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id as any)}
                  className={`flex-1 py-1 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{r.title}</span>
                </button>
              );
            })}
          </div>

          {/* Model Switcher: gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Model Engine:</span>
            <div className="flex gap-1">
              {[
                { id: 'gemini-3.8-flash', label: 'Flash (Balanced)' },
                { id: 'gemini-4-argon', label: 'Argon (Deep Reasoning)' },
                { id: 'gemini-3.1-flash-lite', label: 'Lite (Fast)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    model === m.id ? 'bg-purple-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-6 h-6 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed select-text ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white font-medium rounded-tr-xs shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-xs'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-xs text-purple-400">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Thinking with {model}...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-800/60 bg-slate-900/40">
          {[
            'Anatomy tips for anime faces',
            'Complementary colors for dark blue',
            'How to ink smooth lineart without jitter',
            'Shading metallic highlights',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => setInputValue(prompt)}
              className="text-[10px] text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Ask your art mentor anything..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || loading}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white shadow-md shadow-purple-500/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
