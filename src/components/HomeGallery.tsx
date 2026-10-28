import React, { useState } from 'react';
import { Project } from '../types/canvas';
import {
  Plus,
  Settings as SettingsIcon,
  Crown,
  ImageIcon,
  LayoutGrid,
  Download,
  Cloud,
  FolderOpen,
  Sparkles,
  Trash2,
  Copy,
  Edit2,
  MoreVertical,
  ChevronRight,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface HomeGalleryProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onNewProjectClick: (initialRatio?: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: Project) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onOpenAiGen: () => void;
  onOpenAiAssistant: () => void;
}

export const HomeGallery: React.FC<HomeGalleryProps> = ({
  projects,
  onOpenProject,
  onNewProjectClick,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onOpenAiGen,
  onOpenAiAssistant,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'templates' | 'settings'>('home');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Default sample showcase items if no projects exist
  const showcaseDefaults = [
    {
      id: 'demo_char_anim',
      name: 'Character_Anim',
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      aspectRatio: '9:16',
      width: 1080,
      height: 1920,
      thumbnailUrl: '/assets/aistudio/Screenshot_2026-10-23-10-47-47-33_04f9e94cdbfe1c319ba6e180ab0fbd55_9340ee48.jpg',
    },
    {
      id: 'demo_landscape',
      name: 'Landscape',
      updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000, // 4 days ago
      aspectRatio: '16:9',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/assets/aistudio/Screenshot_2026-10-23-10-49-36-61_84c9ef400ab248a2e4a3b31139e21163_c31f3315.jpg',
    },
    {
      id: 'demo_sketch01',
      name: 'Sketch_01',
      updatedAt: Date.now() - 6 * 24 * 60 * 60 * 1000, // 6 days ago
      aspectRatio: '1:1',
      width: 1080,
      height: 1080,
      thumbnailUrl: '',
    },
  ];

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const displayProjects = projects.length > 0 ? projects : (showcaseDefaults as unknown as Project[]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070B14] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-3 z-10 border-b border-slate-900/60 bg-[#070B14]">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
            <span>Frenza</span>
            <Crown className="w-5 h-5 text-amber-400 fill-amber-400 ml-0.5 shrink-0" />
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiAssistant}
            className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="AI Mentor"
          >
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="hidden sm:inline">AI Mentor</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 transition-all"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 max-w-2xl mx-auto w-full">
        {activeTab === 'settings' ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white">App Settings & Downloads</h2>
              <p className="text-xs text-slate-400">Manage your workspace and install the latest Android build</p>
            </div>

            <div className="bg-[#121929] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Latest Android App (APK)</h4>
                  <p className="text-xs text-slate-400">Download the newly updated debug build</p>
                </div>
                <a
                  href="/api/download-apk"
                  download="ArtFlow-debug.apk"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download APK</span>
                </a>
              </div>

              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">App Version</h4>
                  <p className="text-xs text-slate-400">Frenza Art Studio v2.5 (Ibis Paint X Edition)</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">Up to Date</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'projects' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white">All Projects</h2>
              <button
                onClick={() => onNewProjectClick()}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {displayProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="group relative flex flex-col rounded-2xl bg-[#121929] border border-slate-800/80 hover:border-blue-500/50 overflow-hidden transition-all shadow-md"
                >
                  <div
                    onClick={() => onOpenProject(proj)}
                    className="relative aspect-square w-full bg-[#0B101D] cursor-pointer overflow-hidden flex items-center justify-center"
                  >
                    {proj.thumbnailUrl ? (
                      <img src={proj.thumbnailUrl} alt={proj.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-900">
                        <Layers className="w-7 h-7 text-slate-600 mb-1" />
                        <span className="text-[10px] font-mono text-slate-500">{proj.aspectRatio || '1:1'}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h4 onClick={() => onOpenProject(proj)} className="text-xs font-bold text-white truncate cursor-pointer hover:text-blue-400">
                      {proj.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">{formatTimeAgo(proj.updatedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 1. Hero Card: New Project */}
            <div
              onClick={() => onNewProjectClick()}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 p-5 shadow-xl shadow-blue-600/20 cursor-pointer group active:scale-[0.99] transition-transform"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>New Project</span>
                  </h2>
                  <p className="text-xs font-medium text-blue-100/90 max-w-[240px]">
                    Start drawing or animate your ideas
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                  <Plus className="w-7 h-7 stroke-[3]" />
                </div>
              </div>
            </div>



            {/* 2. Quick Action Grid (4 items) */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={onOpenAiGen}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121929] border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all mb-2">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Gallery</span>
              </button>

              <button
                onClick={() => onNewProjectClick()}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121929] border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-2">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Templates</span>
              </button>

              <button
                onClick={() => onNewProjectClick()}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121929] border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all mb-2">
                  <Download className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Import</span>
              </button>

              <button
                onClick={() => onNewProjectClick()}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121929] border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition-all mb-2">
                  <Cloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Cloud</span>
              </button>
            </div>

            {/* 3. Recent Projects Section */}
            <div className="space-y-3 pb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white tracking-tight">Recent Projects</h3>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-400 flex items-center gap-0.5 transition-colors"
                >
                  <span>See All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {displayProjects.slice(0, 3).map((proj) => (
                  <div
                    key={proj.id}
                    className="group relative flex flex-col rounded-2xl bg-[#121929] border border-slate-800/80 hover:border-blue-500/50 overflow-hidden transition-all shadow-md hover:shadow-xl hover:shadow-black/50"
                  >
                    {/* Thumbnail Banner */}
                    <div
                      onClick={() => onOpenProject(proj)}
                      className="relative aspect-square w-full bg-[#0B101D] cursor-pointer overflow-hidden flex items-center justify-center"
                    >
                      {proj.thumbnailUrl ? (
                        <img
                          src={proj.thumbnailUrl}
                          alt={proj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-slate-900 to-slate-950">
                          <Layers className="w-7 h-7 text-slate-600 mb-1" />
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{proj.aspectRatio || '1:1'}</span>
                        </div>
                      )}
                    </div>

                    {/* Project Metadata */}
                    <div className="p-2.5 flex flex-col justify-between">
                      <div className="min-w-0">
                        {editingId === proj.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim()) onRenameProject(proj.id, editingName.trim());
                              setEditingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editingName.trim()) onRenameProject(proj.id, editingName.trim());
                                setEditingId(null);
                              }
                            }}
                            autoFocus
                            className="w-full bg-slate-800 text-xs px-1 py-0.5 rounded text-white outline-none border border-blue-500"
                          />
                        ) : (
                          <h4
                            onClick={() => onOpenProject(proj)}
                            className="text-xs font-bold text-white truncate cursor-pointer hover:text-blue-400 transition-colors"
                          >
                            {proj.name}
                          </h4>
                        )}
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {formatTimeAgo(proj.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed Bottom Navigation Bar (4 destinations: Home, Projects, Templates, Settings) */}
      <nav className="border-t border-slate-800/80 bg-[#070B14]/95 backdrop-blur-lg px-6 py-2.5 flex items-center justify-around z-10 shrink-0">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 min-w-[56px] ${
            activeTab === 'home' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'home' ? 'bg-blue-500/10' : ''}`}>
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center gap-1 min-w-[56px] ${
            activeTab === 'projects' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'projects' ? 'bg-blue-500/10' : ''}`}>
            <FolderOpen className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Projects</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex flex-col items-center gap-1 min-w-[56px] ${
            activeTab === 'templates' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'templates' ? 'bg-blue-500/10' : ''}`}>
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 min-w-[56px] ${
            activeTab === 'settings' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'settings' ? 'bg-blue-500/10' : ''}`}>
            <SettingsIcon className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </nav>
    </div>
  );
};
