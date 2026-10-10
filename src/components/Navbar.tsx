import React from 'react';
import { Trophy, Shield, Volume2, VolumeX, LayoutDashboard, Swords, Radio } from 'lucide-react';
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

const tabs = [
  { id: 'student', label: 'Play', icon: Swords },
  { id: 'league', label: 'League', icon: Trophy },
  { id: 'host', label: 'Faculty', icon: LayoutDashboard },
] as const;

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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#09090b]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="rounded-xl text-left focus-visible:outline-offset-4"
          onClick={() => setCurrentTab('student')}
          aria-label="AptiQuiz home"
        >
          <AptiQuizLogo size="sm" subBadge={isHostActive ? 'LIVE HOST' : undefined} />
        </button>

        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentTab(id)}
              aria-pressed={currentTab === id}
              className={`relative flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-colors focus-visible:outline-offset-2 ${
                currentTab === id
                  ? 'bg-[#c6ff00] text-[#09090b] shadow-[0_0_24px_rgba(198,255,0,0.12)]'
                  : 'text-[#92929f] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {roomCode && (
            <div className="flex items-center gap-2 rounded-xl border border-[#c6ff00]/25 bg-[#c6ff00]/[0.07] px-2.5 py-2 text-[10px] font-bold tracking-wider text-[#d5ff65] sm:px-3 sm:text-[11px]">
              <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
              <span className="hidden sm:inline">ROOM</span>
              <span className="font-mono">{roomCode}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onOpenRules}
            title="Scoring Rules & Anti-Cheat Protection"
            aria-label="Open scoring rules and anti-cheat information"
            className="arena-control flex h-9 items-center justify-center gap-2 rounded-xl px-2.5 text-[#b9b9c3] hover:border-white/20 hover:bg-white/[0.07] hover:text-white sm:px-3"
          >
            <Shield className="h-4 w-4 text-[#52e5ff]" aria-hidden="true" />
            <span className="hidden lg:inline text-[11px] font-semibold">Rules</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
            aria-pressed={!isMuted}
            className="arena-control flex h-9 w-9 items-center justify-center rounded-xl text-[#b9b9c3] hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-[#92929f]" aria-hidden="true" /> : <Volume2 className="h-4 w-4 text-[#c6ff00]" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav aria-label="Main navigation" className="grid grid-cols-3 border-t border-white/[0.06] bg-[#0e0e12] px-2 py-1.5 md:hidden">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCurrentTab(id)}
            aria-pressed={currentTab === id}
            className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition-colors focus-visible:outline-offset-1 ${
              currentTab === id ? 'bg-white/[0.06] text-[#c6ff00]' : 'text-[#92929f] hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
};
