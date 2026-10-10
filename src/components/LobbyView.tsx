import React, { useState } from 'react';
import { Copy, Check, Users, Play, ShieldAlert, Sparkles, Clock, BookOpen, School, Smartphone, ArrowRight } from 'lucide-react';
import { Player } from '../types/quiz.js';
import { RoomQrCode } from './RoomQrCode.js';
import { ParticipantAvatar } from './ParticipantAvatar.js';

interface LobbyViewProps {
  roomCode: string;
  isHost: boolean;
  questionSetTitle: string;
  totalQuestions: number;
  roundDurationSec: number;
  players: Partial<Player>[];
  onStartGame: () => void;
  currentPlayerId: string;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomCode,
  isHost,
  questionSetTitle,
  totalQuestions,
  roundDurationSec,
  players,
  onStartGame,
  currentPlayerId,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contestants = players.filter(p => !p.isHost);
  const myPlayer = players.find(p => p.id === currentPlayerId);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Room Overview */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isHost ? 'FACULTY HOST LOBBY' : 'STUDENT WAITING LOBBY'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {questionSetTitle || 'Aptitude Placement Arena'}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                {totalQuestions} Rounds
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                {roundDurationSec}s Authoritative Round
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <strong className="text-white">{contestants.length}</strong> Students Connected
              </span>
            </div>
          </div>

          {/* Quick Room Code Box */}
          <div className="flex flex-col items-start lg:items-end">
            <span className="text-[11px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
              6-Digit Join Code
            </span>
            <div className="flex items-center gap-2">
              <div className="px-5 py-2.5 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 text-2xl sm:text-3xl font-mono font-black text-cyan-400 tracking-widest shadow-inner">
                {roomCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <span className="text-[11px] text-emerald-400 mt-1 font-medium">Code copied to clipboard!</span>}
          </div>
        </div>

        {/* Host action / Student Status bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {isHost ? (
              <span className="text-cyan-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Project the QR code on screen. When contestants are in, click Start Match!
              </span>
            ) : (
              <div className="flex items-center gap-2 text-slate-300">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-.15s]"></div>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-.3s]"></div>
                </div>
                <span>
                  Connected as <strong className="text-white">{myPlayer?.name || 'Student'}</strong> ({myPlayer?.college || 'College'}). Waiting for host to start...
                </span>
              </div>
            )}
          </div>

          {isHost && (
            <button
              onClick={onStartGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Match for All ({contestants.length} Players)</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: QR Code (for Host) & Live Contestants Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* If Host, show Prominent QR Code Panel (5 cols) */}
        {isHost && (
          <div className="lg:col-span-5">
            <RoomQrCode roomCode={roomCode} />
          </div>
        )}

        {/* Contestants Roster (Full width for student, 7 cols for host) */}
        <div className={`${isHost ? 'lg:col-span-7' : 'lg:col-span-12'} bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Joined Contestants ({contestants.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500">Live Capacity: 60 Students</span>
          </div>

          {contestants.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <p className="text-slate-400 text-sm">
                No students joined yet.
              </p>
              <p className="text-xs text-slate-500">
                Students can scan the QR code or enter code <strong className="font-mono text-cyan-400">{roomCode}</strong> at the join page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {contestants.map((p, idx) => {
                const isMe = p.id === currentPlayerId;
                return (
                  <div
                    key={p.id || idx}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                      isMe
                        ? 'bg-indigo-950/40 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <ParticipantAvatar id={p.id} name={p.name || 'Student'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {p.name}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <School className="w-3 h-3 text-slate-500 shrink-0" />
                        {p.college || 'Independent'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
