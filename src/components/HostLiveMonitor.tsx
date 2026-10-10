import React, { useEffect, useState } from 'react';
import { Users, Clock, StopCircle, Trophy, Award, Flame, CheckCircle2, ChevronRight } from 'lucide-react';
import { ClientQuestionPayload, Player } from '../types/quiz.js';
import { ParticipantAvatar } from './ParticipantAvatar.js';

interface HostLiveMonitorProps {
  question: ClientQuestionPayload;
  roomCode: string;
  totalAnsweredCount: number;
  totalContestantsCount: number;
  players: Partial<Player>[];
  roundResult?: any;
  onEndGame: () => void;
  isLastRound: boolean;
}

export const HostLiveMonitor: React.FC<HostLiveMonitorProps> = ({
  question,
  roomCode,
  totalAnsweredCount,
  totalContestantsCount,
  players,
  roundResult,
  onEndGame,
  isLastRound,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(question.timeLimitSec);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - question.startTimeServerMs;
      const totalMs = question.timeLimitSec * 1000;
      const leftSec = Math.max(0, (totalMs - elapsedMs) / 1000);
      setSecondsRemaining(Number(leftSec.toFixed(1)));
    }, 100);

    return () => clearInterval(interval);
  }, [question.startTimeServerMs, question.timeLimitSec]);

  const percentageTime = Math.max(0, Math.min(100, (secondsRemaining / question.timeLimitSec) * 100));

  const answeredPercent = totalContestantsCount > 0
    ? Math.round((totalAnsweredCount / totalContestantsCount) * 100)
    : 0;

  // Filter contestants (excluding host) sorted by score
  const contestants = players
    .filter(p => !p.isHost)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // Option distribution percentages from roundResult if in feedback period
  const totalSubmissions = roundResult?.totalAnswers || totalAnsweredCount || 1;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Refined Host Control Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 text-cyan-300 border border-indigo-500/20 text-xs font-mono font-bold">
            FACULTY CONSOLE • ROOM {roomCode}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Round {question.roundIndex} of {question.totalRounds}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-semibold">
            Automated Progression Engine
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const ok = window.confirm(
                'End this quiz match early?\n\n• The match will finalize authoritatively.\n• Standings will be computed from rounds completed so far.\n• All participants transition to the final podium results.'
              );
              if (ok) {
                onEndGame();
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="End quiz early and calculate final standings"
          >
            <StopCircle className="w-4 h-4 text-rose-400" />
            <span>End Quiz Early</span>
          </button>
        </div>
      </div>

      {/* TWO-COLUMN INSTRUCTOR ACTIVE QUIZ DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Current Question, Options, Timer, Distribution */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider">
                {question.topic.replace('_', ' ')} • {question.difficulty}
              </span>

              {/* Authoritative Server Countdown */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-400 font-mono">Timer:</span>
                <span className={`font-mono text-2xl font-black ${secondsRemaining < 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                  {secondsRemaining.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Question Statement */}
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
              {question.questionText}
            </h3>

            {/* Tabular data if present */}
            {question.tableData && (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-900/90 text-cyan-400 border-b border-slate-800 font-mono">
                    <tr>
                      {question.tableData.headers.map((h, i) => (
                        <th key={i} className="px-4 py-2.5 uppercase font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {question.tableData.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2 text-slate-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Four Answer Options Display with Live Selection Counts */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                Answer Options
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {question.options.map((opt, idx) => {
                  const optLetter = String.fromCharCode(65 + idx);
                  const count = roundResult?.optionCounts?.[opt.id] || 0;
                  const isCorrect = roundResult?.correctOptionId === opt.id;
                  const pct = Math.round((count / totalSubmissions) * 100);

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                          : 'bg-slate-950/80 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isCorrect ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-cyan-300'
                          }`}>
                            {optLetter}
                          </span>
                          <span className="font-medium text-slate-200">{opt.text}</span>
                        </div>
                        {roundResult && (
                          <span className="font-mono text-xs text-slate-400">
                            {count} votes ({pct}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submission Rate Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Contestants Answered
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {totalAnsweredCount} of {totalContestantsCount} ({answeredPercent}%)
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${answeredPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Live Participant Rankings, Avatars, Cumulative Scores, Round Points */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Participant Rankings
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {contestants.length} Active
              </span>
            </div>

            {/* Contestant Leaderboard Cards */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {contestants.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Waiting for contestant submissions...
                </div>
              ) : (
                contestants.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-bold text-xs text-slate-400 w-5 text-right">
                        #{idx + 1}
                      </span>
                      <ParticipantAvatar id={p.id} name={p.name || 'Student'} size="sm" />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-white truncate block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {p.college || 'Independent'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-sm text-cyan-400">
                        {(p.score || 0).toLocaleString()} pts
                      </div>
                      {(p.currentRoundScore !== undefined && p.currentRoundScore > 0) && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          +{p.currentRoundScore}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
