import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowUp, ArrowDown, Minus, Play, Clock, BarChart3, HelpCircle, Trophy, StopCircle } from 'lucide-react';
import { RoundResultPayload } from '../types/quiz.js';
import { sound } from '../utils/sound.js';

interface RoundReviewProps {
  roundResult: RoundResultPayload;
  currentPlayerId: string;
  isHost: boolean;
  onNextQuestion: () => void;
  onEndGame?: () => void;
  isLastRound: boolean;
}

export const RoundReview: React.FC<RoundReviewProps> = ({
  roundResult,
  currentPlayerId,
  isHost,
  onNextQuestion,
  onEndGame,
  isLastRound,
}) => {
  const myEntry = roundResult.playersLeaderboard.find(p => p.id === currentPlayerId);
  const [secondsLeft, setSecondsLeft] = React.useState<number>(roundResult.autoAdvanceSec || 5);

  useEffect(() => {
    setSecondsLeft(roundResult.autoAdvanceSec || 5);
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roundResult.roundIndex, roundResult.autoAdvanceSec]);

  useEffect(() => {
    if (myEntry) {
      if (myEntry.correct) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }
    }
  }, [myEntry]);

  // Compute percentages for option choices
  const totalSubmissions = roundResult.totalAnswers || 1;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 5-Second Answer Feedback Countdown Banner */}
      <div className="p-4 rounded-2xl bg-indigo-950/70 border-2 border-indigo-500/40 shadow-lg shadow-indigo-950/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-800"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-cyan-400 transition-all duration-1000"
                strokeDasharray={`${(secondsLeft / 5) * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-black text-cyan-300">
              {secondsLeft}s
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                {isLastRound ? 'Wrapping Up Quiz' : 'Automatic Question Progression'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold animate-pulse">
                Auto-Advancing
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {isLastRound
                ? `Calculating final college standings and podium in ${secondsLeft}s...`
                : `Next question starts automatically in ${secondsLeft}s without host intervention.`}
            </p>
          </div>
        </div>

        {isHost && (
          <button
            onClick={onNextQuestion}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-400/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Skip Wait ({isLastRound ? 'Show Results' : 'Next Question'})</span>
          </button>
        )}
      </div>
      {/* Player Personal Round Feedback Card */}
      {myEntry && (
        <div
          className={`p-6 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
            myEntry.correct
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-emerald-900/20'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-rose-900/20'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl ${
                myEntry.correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {myEntry.correct ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider opacity-75">
                {myEntry.correct ? 'Correct Answer!' : 'Incorrect Choice'}
              </span>
              <h3 className="text-2xl font-black">
                {myEntry.correct ? `+${myEntry.roundScore} Points` : '+0 Points'}
              </h3>
              {myEntry.answerTimeMs && (
                <p className="text-xs opacity-80 mt-0.5">
                  Server recorded response time: {(myEntry.answerTimeMs / 1000).toFixed(2)}s
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/60 px-5 py-3 rounded-2xl border border-slate-800">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Score</span>
              <span className="font-mono text-xl font-black text-cyan-400">{myEntry.totalScore}</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Rank</span>
              <div className="flex items-center justify-center gap-1">
                <span className="font-mono text-xl font-black text-white">#{myEntry.rank}</span>
                {myEntry.rankDelta > 0 && (
                  <span className="text-emerald-400 text-xs font-bold flex items-center">
                    <ArrowUp className="w-3 h-3" />+{myEntry.rankDelta}
                  </span>
                )}
                {myEntry.rankDelta < 0 && (
                  <span className="text-rose-400 text-xs font-bold flex items-center">
                    <ArrowDown className="w-3 h-3" />{myEntry.rankDelta}
                  </span>
                )}
                {myEntry.rankDelta === 0 && (
                  <span className="text-slate-500 text-xs">
                    <Minus className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Solution & Explanation */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Round {roundResult.roundIndex} Solution Breakdown
          </span>
          <span className="text-xs text-slate-400">{roundResult.totalAnswers} Contestants Answered</span>
        </div>

        <p className="text-base font-semibold text-slate-200">
          {roundResult.questionText}
        </p>

        {/* Detailed Explanation */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-slate-300 leading-relaxed">
          <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-400" /> Step-by-Step Aptitude Logic:
          </div>
          {roundResult.explanation}
        </div>

        {/* Option Distribution Bars */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Room Selection Distribution
          </h4>
          <div className="space-y-2">
            {Object.entries(roundResult.optionCounts).map(([optId, count]) => {
              const pct = Math.round((count / totalSubmissions) * 100);
              const isCorrectOpt = optId === roundResult.correctOptionId;

              return (
                <div key={optId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={`font-medium ${isCorrectOpt ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {isCorrectOpt && '✓ '}Option {optId.replace('opt_', '')} {isCorrectOpt ? '(Correct)' : ''}
                    </span>
                    <span className="font-mono text-slate-400">
                      {count} votes ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCorrectOpt ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Standings (Top 5) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Current Leaderboard Standings
          </h3>
          <span className="text-xs text-slate-400">Top Performers</span>
        </div>

        <div className="space-y-2">
          {roundResult.playersLeaderboard.slice(0, 6).map((p) => {
            const isMe = p.id === currentPlayerId;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl flex items-center justify-between transition-all ${
                  isMe
                    ? 'bg-indigo-950/60 border border-indigo-500/40 text-white'
                    : 'bg-slate-950/60 border border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      p.rank === 1
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : p.rank === 2
                        ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                        : p.rank === 3
                        ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                        : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    #{p.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      {isMe && (
                        <span className="px-1 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">{p.college}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {p.roundScore > 0 ? (
                    <span className="text-xs text-emerald-400 font-semibold font-mono">
                      +{p.roundScore}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600 font-mono">+0</span>
                  )}
                  <div className="text-right min-w-[70px]">
                    <span className="font-mono text-sm font-black text-cyan-400">{p.totalScore}</span>
                    <span className="text-[10px] text-slate-500 block">pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Control Bar */}
      {isHost && (
        <div className="p-4 rounded-2xl bg-indigo-950/50 border border-indigo-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-indigo-300">
            {isLastRound ? 'This was the final round!' : 'Ready for the next round?'}
          </span>
          <div className="flex items-center gap-2">
            {onEndGame && (
              <button
                onClick={() => {
                  const ok = window.confirm(
                    'End this quiz match now?\n\n• The quiz will terminate immediately for all connected students.\n• Final standings will be computed from completed questions.\n• All participants will transition to the final results screen.'
                  );
                  if (ok) {
                    onEndGame();
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="End quiz early and calculate final standings"
              >
                <StopCircle className="w-4 h-4 text-rose-400" />
                <span>End Quiz Early</span>
              </button>
            )}

            <button
              onClick={onNextQuestion}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {isLastRound ? 'View Final Results' : 'Next Question Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
