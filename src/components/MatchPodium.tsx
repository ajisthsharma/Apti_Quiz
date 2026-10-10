import React from 'react';
import { Trophy, Medal, Sparkles, Award } from 'lucide-react';
import { ParticipantAvatar } from './ParticipantAvatar.js';

export interface PodiumParticipant {
  id: string;
  participantId?: string;
  name: string;
  college: string;
  score: number;
  rank: number;
  accuracyPercent?: number;
  averageTimeSec?: number;
  correctCount?: number;
}

interface MatchPodiumProps {
  leaderboard: PodiumParticipant[];
  currentPlayerId?: string;
  isHost?: boolean;
}

export const MatchPodium: React.FC<MatchPodiumProps> = ({
  leaderboard,
  currentPlayerId,
  isHost,
}) => {
  // Sort deterministically: highest score first, then tie-break by accuracy/correct count, then lower average time
  const sorted = [...leaderboard].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.correctCount || 0) !== (a.correctCount || 0)) {
      return (b.correctCount || 0) - (a.correctCount || 0);
    }
    return (a.averageTimeSec || 999) - (b.averageTimeSec || 999);
  });

  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  if (!first) {
    return (
      <div className="p-8 rounded-3xl bg-[#111A2E] border border-slate-800 text-center text-slate-400">
        <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white">No qualifying participants completed this match.</h3>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ========================================================
          DESKTOP PODIUM (sm: and above): 2nd (Left) | 1st (Center) | 3rd (Right)
          ======================================================== */}
      <div className="hidden sm:block p-6 lg:p-8 rounded-3xl bg-[#111A2E]/95 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-3 gap-4 lg:gap-6 items-end max-w-4xl mx-auto pt-4 pb-2">
          {/* 2nd Place: Left, Medium height */}
          {second ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-600/60 text-slate-200 text-xs font-black uppercase tracking-wider shadow-sm">
                <span>🥈</span>
                <span>Runner Up</span>
              </div>

              <div className="relative">
                <ParticipantAvatar
                  id={second.id}
                  name={second.name}
                  size="lg"
                  className="ring-4 ring-slate-300/60 shadow-lg shadow-slate-300/15"
                />
              </div>

              <div className="space-y-0.5 w-full px-2">
                <div className="flex items-center justify-center gap-1.5">
                  <h4 className="font-extrabold text-slate-100 text-sm lg:text-base truncate">
                    {second.name}
                  </h4>
                  {currentPlayerId === second.id && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {second.college || 'Independent'}
                </p>
              </div>

              {/* Podium Base */}
              <div className="w-full pt-5 pb-4 px-3 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-950 border border-slate-700/80 shadow-xl space-y-1 min-h-[140px] flex flex-col justify-center items-center">
                <span className="font-mono text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                  2nd Place
                </span>
                <div className="font-mono text-xl lg:text-2xl font-black text-cyan-400">
                  {second.score.toLocaleString()} pts
                </div>
                {second.accuracyPercent !== undefined && (
                  <div className="text-[11px] text-slate-400 font-mono">
                    {second.accuracyPercent}% Acc • {second.averageTimeSec}s avg
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="invisible" />
          )}

          {/* 1st Place: Center, Tallest, Gold Accent */}
          {first && (
            <div className="flex flex-col items-center text-center space-y-3 -mt-4">
              {/* Separate Champion badge above without overlapping avatar */}
              <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Match Champion</span>
              </div>

              <div className="relative">
                <ParticipantAvatar
                  id={first.id}
                  name={first.name}
                  size="xl"
                  className="ring-4 ring-amber-400 shadow-2xl shadow-amber-500/25"
                />
              </div>

              <div className="space-y-0.5 w-full px-2">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="font-black text-white text-base lg:text-lg truncate">
                    {first.name}
                  </h3>
                  {currentPlayerId === first.id && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-300 font-medium truncate">
                  {first.college || 'Independent'}
                </p>
              </div>

              {/* Tallest Podium Base */}
              <div className="w-full pt-6 pb-5 px-4 rounded-2xl bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/15 space-y-1.5 min-h-[175px] flex flex-col justify-center items-center">
                <div className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  <span>🥇</span>
                  <span>1st Place</span>
                </div>
                <div className="font-mono text-2xl lg:text-3xl font-black text-amber-400">
                  {first.score.toLocaleString()} pts
                </div>
                {first.accuracyPercent !== undefined && (
                  <div className="text-xs text-slate-300 font-mono">
                    {first.accuracyPercent}% Accuracy • {first.averageTimeSec}s avg
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3rd Place: Right, Shorter, Bronze Accent */}
          {third ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm">
                <span>🥉</span>
                <span>3rd Place</span>
              </div>

              <div className="relative">
                <ParticipantAvatar
                  id={third.id}
                  name={third.name}
                  size="lg"
                  className="ring-4 ring-amber-700/60 shadow-lg shadow-amber-700/15"
                />
              </div>

              <div className="space-y-0.5 w-full px-2">
                <div className="flex items-center justify-center gap-1.5">
                  <h4 className="font-extrabold text-slate-100 text-sm lg:text-base truncate">
                    {third.name}
                  </h4>
                  {currentPlayerId === third.id && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {third.college || 'Independent'}
                </p>
              </div>

              {/* Podium Base */}
              <div className="w-full pt-4 pb-3.5 px-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-900/40 shadow-xl space-y-1 min-h-[115px] flex flex-col justify-center items-center">
                <span className="font-mono text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                  3rd Place
                </span>
                <div className="font-mono text-lg lg:text-xl font-black text-cyan-400">
                  {third.score.toLocaleString()} pts
                </div>
                {third.accuracyPercent !== undefined && (
                  <div className="text-[11px] text-slate-400 font-mono">
                    {third.accuracyPercent}% Acc • {third.averageTimeSec}s avg
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="invisible" />
          )}
        </div>
      </div>

      {/* ========================================================
          MOBILE PODIUM (sm:hidden): Clean, Non-overlapping Vertical Hierarchy
          ======================================================== */}
      <div className="sm:hidden space-y-2.5">
        {/* 1st Place Champion Card */}
        {first && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <ParticipantAvatar
                  id={first.id}
                  name={first.name}
                  size="md"
                  className="ring-2 ring-amber-400"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow">
                  🥇
                </span>
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Match Champion
                </div>
                <h4 className="font-black text-white text-sm truncate flex items-center gap-1.5">
                  <span>{first.name}</span>
                  {currentPlayerId === first.id && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px] font-bold">
                      You
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {first.college || 'Independent'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono text-lg font-black text-amber-400">
                {first.score.toLocaleString()} pts
              </div>
              {first.accuracyPercent !== undefined && (
                <div className="text-[10px] text-slate-400 font-mono">
                  {first.accuracyPercent}% Acc
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2nd Place Runner-Up Card */}
        {second && (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <ParticipantAvatar
                  id={second.id}
                  name={second.name}
                  size="sm"
                  className="ring-2 ring-slate-300/60"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-300 text-slate-950 font-black text-[10px] flex items-center justify-center shadow">
                  🥈
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Runner Up • 2nd Place
                </span>
                <h4 className="font-bold text-slate-100 text-xs truncate flex items-center gap-1.5">
                  <span>{second.name}</span>
                  {currentPlayerId === second.id && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                      You
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {second.college || 'Independent'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono text-base font-black text-cyan-400">
                {second.score.toLocaleString()} pts
              </div>
              {second.accuracyPercent !== undefined && (
                <div className="text-[10px] text-slate-400 font-mono">
                  {second.accuracyPercent}% Acc
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3rd Place Bronze Card */}
        {third && (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-900/40 shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <ParticipantAvatar
                  id={third.id}
                  name={third.name}
                  size="sm"
                  className="ring-2 ring-amber-700/60"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shadow">
                  🥉
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  3rd Place Podium
                </span>
                <h4 className="font-bold text-slate-100 text-xs truncate flex items-center gap-1.5">
                  <span>{third.name}</span>
                  {currentPlayerId === third.id && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                      You
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {third.college || 'Independent'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono text-base font-black text-cyan-400">
                {third.score.toLocaleString()} pts
              </div>
              {third.accuracyPercent !== undefined && (
                <div className="text-[10px] text-slate-400 font-mono">
                  {third.accuracyPercent}% Acc
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
