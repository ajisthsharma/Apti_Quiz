import React, { useEffect, useState } from 'react';
import {
  Users,
  Clock,
  StopCircle,
  Trophy,
  Award,
  Flame,
  CheckCircle2,
  ChevronRight,
  Play,
  Sparkles,
  Check,
  HelpCircle,
} from 'lucide-react';
import { ClientQuestionPayload, Player, RoundResultPayload } from '../types/quiz.js';
import { ParticipantAvatar } from './ParticipantAvatar.js';

interface HostLiveMonitorProps {
  question: ClientQuestionPayload;
  roomCode: string;
  totalAnsweredCount: number;
  totalContestantsCount: number;
  players: Partial<Player>[];
  roundResult?: RoundResultPayload | null;
  liveOptionCounts?: Record<string, number>;
  onEndGame: () => void;
  onNextQuestion?: () => void;
  isLastRound: boolean;
}

export const HostLiveMonitor: React.FC<HostLiveMonitorProps> = ({
  question,
  roomCode,
  totalAnsweredCount,
  totalContestantsCount,
  players,
  roundResult,
  liveOptionCounts,
  onEndGame,
  onNextQuestion,
  isLastRound,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(question.timeLimitSec);
  const [feedbackSecondsLeft, setFeedbackSecondsLeft] = useState<number>(roundResult?.autoAdvanceSec || 5);
  const [mobileTab, setMobileTab] = useState<'question' | 'leaderboard'>('question');

  const isFeedbackPhase = !!roundResult;

  // Active question countdown timer
  useEffect(() => {
    if (isFeedbackPhase) return;
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - question.startTimeServerMs;
      const totalMs = question.timeLimitSec * 1000;
      const leftSec = Math.max(0, (totalMs - elapsedMs) / 1000);
      setSecondsRemaining(Number(leftSec.toFixed(1)));
    }, 100);

    return () => clearInterval(interval);
  }, [question.startTimeServerMs, question.timeLimitSec, isFeedbackPhase]);

  // Feedback phase 5-second auto progression countdown
  useEffect(() => {
    if (!isFeedbackPhase) return;
    setFeedbackSecondsLeft(roundResult?.autoAdvanceSec || 5);
    const interval = setInterval(() => {
      setFeedbackSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isFeedbackPhase, roundResult?.roundIndex, roundResult?.autoAdvanceSec]);

  // Answer distribution source: roundResult takes precedence, then liveOptionCounts
  const effectiveOptionCounts = roundResult?.optionCounts || liveOptionCounts || {};
  const totalSubmissions = roundResult?.totalAnswers ?? totalAnsweredCount;
  const safeTotalSubmissions = Math.max(1, totalSubmissions);

  const answeredPercent = totalContestantsCount > 0
    ? Math.round((totalAnsweredCount / totalContestantsCount) * 100)
    : 0;

  // Authoritative contestant sorting: score desc, then correct count desc
  const contestants = players
    .filter(p => !p.isHost)
    .sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return (b.stats?.totalCorrect || 0) - (a.stats?.totalCorrect || 0);
    });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Refined Host Control Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 text-cyan-300 border border-indigo-500/20 text-xs font-mono font-bold">
            FACULTY CONSOLE • ROOM {roomCode}
          </div>
          <span className="text-xs text-slate-300 font-mono font-semibold">
            Question {question.roundIndex} of {question.totalRounds}
          </span>
          {isFeedbackPhase ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              <span>Feedback Review ({feedbackSecondsLeft}s)</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-semibold">
              Live Question Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Skip Wait button during review phase */}
          {isFeedbackPhase && onNextQuestion && (
            <button
              onClick={onNextQuestion}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-400/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Skip remaining feedback wait and advance immediately"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLastRound ? 'Show Final Podium' : 'Next Question Now'}</span>
            </button>
          )}

          <button
            onClick={() => {
              const ok = window.confirm(
                'End this quiz match early?\n\n• The match will finalize authoritatively on the server.\n• Standings will be computed from rounds completed so far.\n• All participants transition directly to the final podium results.'
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

      {/* Mobile Tab Switcher (Visible on screens smaller than lg) */}
      <div className="lg:hidden flex items-center bg-[#080D1B] p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setMobileTab('question')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            mobileTab === 'question'
              ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Question & Distribution</span>
          {isFeedbackPhase && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setMobileTab('leaderboard')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            mobileTab === 'leaderboard'
              ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Live Rankings ({contestants.length})</span>
        </button>
      </div>

      {/* TWO-COLUMN INSTRUCTOR ACTIVE QUIZ DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN (7 cols): Current Question, Options, Timer, Live Distribution
            ======================================================== */}
        <div className={`lg:col-span-7 space-y-6 ${mobileTab === 'leaderboard' ? 'hidden lg:block' : 'block'}`}>
          <div className="p-6 sm:p-8 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between gap-3">
              <span className="px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider">
                {question.topic.replace('_', ' ')} • {question.difficulty}
              </span>

              {/* Authoritative Server Countdown or Feedback Indicator */}
              <div className="flex items-center gap-2.5">
                {isFeedbackPhase ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
                    <span>Auto-Next in:</span>
                    <span className="text-sm font-black text-emerald-400">{feedbackSecondsLeft}s</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">Timer:</span>
                    <span className={`font-mono text-2xl font-black ${secondsRemaining < 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                      {secondsRemaining.toFixed(1)}s
                    </span>
                  </div>
                )}
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

            {/* Four Answer Options Display with Live Selection Counts & Distribution */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase text-slate-400 font-bold">
                  Answer Options & Live Distribution
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {totalSubmissions} of {totalContestantsCount} submitted
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {question.options.map((opt, idx) => {
                  const optLetter = String.fromCharCode(65 + idx);
                  const count = effectiveOptionCounts[opt.id] || 0;
                  const isCorrect = isFeedbackPhase && roundResult?.correctOptionId === opt.id;
                  const pct = totalSubmissions > 0 ? Math.round((count / safeTotalSubmissions) * 100) : 0;

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                        isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-100 shadow-lg shadow-emerald-900/20'
                          : 'bg-slate-950/80 border-slate-800 text-slate-200'
                      }`}
                    >
                      {/* Live visual fill bar */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 opacity-15 pointer-events-none transition-all duration-300 ${
                          isCorrect ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />

                      <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isCorrect ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-cyan-300'
                          }`}>
                            {optLetter}
                          </span>
                          <span className="font-medium text-slate-200 truncate">
                            {opt.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono shrink-0">
                          {isCorrect && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                              Correct Answer
                            </span>
                          )}
                          <span className="text-xs text-slate-300 font-bold">
                            {count} {count === 1 ? 'vote' : 'votes'}
                          </span>
                          <span className="text-[11px] text-cyan-400 font-bold">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation box during feedback phase */}
            {isFeedbackPhase && roundResult?.explanation && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1 animate-in fade-in">
                <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] block">
                  Authoritative Solution:
                </span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {roundResult.explanation}
                </p>
              </div>
            )}

            {/* Submission Rate Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Contestants Answered
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {totalContestantsCount > 0
                    ? `${totalAnsweredCount} of ${totalContestantsCount} (${answeredPercent}%)`
                    : `${totalAnsweredCount} answers received`}
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 transition-all duration-300"
                  style={{ width: `${answeredPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN (5 cols): Live Participant Leaderboard
            ======================================================== */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'question' ? 'hidden lg:block' : 'block'}`}>
          <div className="p-6 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Participant Leaderboard
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {contestants.length} Eligible
              </span>
            </div>

            {/* Contestant Leaderboard Cards */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {contestants.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Waiting for contestant submissions...
                </div>
              ) : (
                contestants.map((p, idx) => {
                  const currentRoundScore = p.currentRoundScore;
                  const totalAnswered = p.stats?.totalAnswered || 0;
                  const totalCorrect = p.stats?.totalCorrect || 0;
                  const accuracy = totalAnswered > 0
                    ? Math.round((totalCorrect / totalAnswered) * 100)
                    : 0;

                  return (
                    <div
                      key={p.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-mono font-bold text-xs w-5 text-right ${
                          idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'
                        }`}>
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

                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="font-mono font-black text-sm text-cyan-400">
                          {(p.score || 0).toLocaleString()} pts
                        </div>
                        <div className="flex items-center justify-end gap-1.5 font-mono text-[10px]">
                          {currentRoundScore !== undefined && currentRoundScore > 0 ? (
                            <span className="text-emerald-400 font-bold">
                              +{currentRoundScore}
                            </span>
                          ) : null}
                          <span className="text-slate-400">
                            {totalCorrect}/{totalAnswered} ({accuracy}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
