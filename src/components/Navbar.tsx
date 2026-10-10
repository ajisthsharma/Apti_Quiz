import React from 'react';
import { Trophy, Shield, Volume2, VolumeX, Sparkles, LayoutDashboard } from 'lucide-react';
import { AptiQuizLogo } from './AptiQuizLogo.js';

interface NavbarProps {
  currentTab: 'student' | 'host' | 'league';
  setCurrentTab: (tab: 'student' | 'host' | 'league') => void;
  onOpenRules: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  roomCode?: string;
  isHostActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenRules,
  isMuted,
  onToggleMute,
  roomCode,
  isHostActive,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand with Original Logo */}
        <div
          className="cursor-pointer"
          onClick={() => setCurrentTab('student')}
        >
          <AptiQuizLogo size="md" subBadge={isHostActive ? 'HOST CONSOLE' : undefined} />
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1.5 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setCurrentTab('student')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'student'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>Student Join</span>
          </button>

          <button
            onClick={() => setCurrentTab('league')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'league'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Campus League</span>
          </button>

          <button
            onClick={() => setCurrentTab('host')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'host'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Faculty Portal</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2.5">
          {roomCode && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ROOM: {roomCode}</span>
            </div>
          )}

          <button
            onClick={onOpenRules}
            title="Scoring Rules & Anti-Cheat Protection"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Rules & Delay</span>
          </button>

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Submenu Bar */}
      <div className="flex md:hidden border-t border-slate-800/60 bg-slate-950 px-2 py-1.5 justify-around text-xs">
        <button
          onClick={() => setCurrentTab('student')}
          className={`py-1 px-3 font-semibold rounded-lg ${currentTab === 'student' ? 'text-cyan-400 bg-slate-900' : 'text-slate-400'}`}
        >
          Join Quiz
        </button>
        <button
          onClick={() => setCurrentTab('league')}
          className={`py-1 px-3 font-semibold rounded-lg ${currentTab === 'league' ? 'text-cyan-400 bg-slate-900' : 'text-slate-400'}`}
        >
          League
        </button>
        <button
          onClick={() => setCurrentTab('host')}
          className={`py-1 px-3 font-semibold rounded-lg ${currentTab === 'host' ? 'text-cyan-400 bg-slate-900' : 'text-slate-400'}`}
        >
          Faculty Portal
        </button>
      </div>
    </header>
  );
};
