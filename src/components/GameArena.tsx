import React, { useEffect, useState, useMemo } from 'react';
import { Clock, Shield, Sparkles, CheckCircle2, XCircle, Zap, AlertTriangle, Users, HelpCircle, Check, Award } from 'lucide-react';
import { ClientQuestionPayload, QuestionOption } from '../types/quiz.js';
import { sound } from '../utils/sound.js';

export interface AnswerEvaluationState {
  isCorrect: boolean;
  scoreAwarded: number;
  correctOptionId: string;
  explanation?: string;
  currentScore?: number;
}

interface GameArenaProps {
  question: ClientQuestionPayload;
  onSubmitAnswer: (optionId: string) => void;
  onUse5050: () => void;
  hasAnswered: boolean;
  selectedOptionId?: string;
  serverElapsedSec?: number;
  totalAnsweredCount: number;
  totalPlayersCount: number;
  powerUp5050Used: boolean;
  eliminatedOptionIds: string[];
  answerEvaluation?: AnswerEvaluationState | null;
  playerScore?: number;
}

const SHAPES = [
  { label: 'A', symbol: '▲', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { label: 'B', symbol: '■', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  { label: 'C', symbol: '◆', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { label: 'D', symbol: '★', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
];

export const GameArena: React.FC<GameArenaProps> = ({
  question,
  onSubmitAnswer,
  onUse5050,
  hasAnswered,
  selectedOptionId,
  serverElapsedSec,
  totalAnsweredCount,
  totalPlayersCount,
  powerUp5050Used,
  eliminatedOptionIds,
  answerEvaluation,
  playerScore = 0,
}) => {
  // Synchronized countdown calculated from server startTime
  const [secondsRemaining, setSecondsRemaining] = useState<number>(question.timeLimitSec);
  const [showFloatingBubble, setShowFloatingBubble] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - question.startTimeServerMs;
      const totalMs = question.timeLimitSec * 1000;
      const leftSec = Math.max(0, (totalMs - elapsedMs) / 1000);
      setSecondsRemaining(Number(leftSec.toFixed(1)));

      if (leftSec <= 5 && leftSec > 0 && Math.floor(leftSec * 10) % 10 === 0 && !hasAnswered) {
        sound.playTick();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [question.startTimeServerMs, question.timeLimitSec, hasAnswered]);

  // Trigger floating bubble and sound effects when answer evaluation arrives
  useEffect(() => {
    if (answerEvaluation) {
      setShowFloatingBubble(true);
      if (answerEvaluation.isCorrect) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }
      const timer = setTimeout(() => {
        setShowFloatingBubble(false);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [answerEvaluation]);

  // Keyboard shortcut listener (1-4 and A-D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasAnswered) return;
      const key = e.key.toUpperCase();
      let index = -1;

      if (key === '1' || key === 'A') index = 0;
      else if (key === '2' || key === 'B') index = 1;
      else if (key === '3' || key === 'C') index = 2;
      else if (key === '4' || key === 'D') index = 3;

      if (index >= 0 && index < question.options.length) {
        const opt = question.options[index];
        if (!eliminatedOptionIds.includes(opt.id)) {
          sound.playSelect();
          onSubmitAnswer(opt.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAnswered, question.options, eliminatedOptionIds, onSubmitAnswer]);

  const percentageTime = Math.max(0, Math.min(100, (secondsRemaining / question.timeLimitSec) * 100));

  const timerColor = useMemo(() => {
    if (percentageTime > 50) return 'text-emerald-400 stroke-emerald-500';
    if (percentageTime > 25) return 'text-amber-400 stroke-amber-500';
    return 'text-rose-400 stroke-rose-500 animate-pulse';
  }, [percentageTime]);

  const topicBadgeColor: Record<string, string> = {
    quantitative: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    logical: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    verbal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    data_interpretation: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  const topicLabels: Record<string, string> = {
    quantitative: 'Quantitative Aptitude',
    logical: 'Logical Reasoning',
    verbal: 'Verbal Ability',
    data_interpretation: 'Data Interpretation',
  };

  const displayedScore = answerEvaluation?.currentScore !== undefined
    ? answerEvaluation.currentScore
    : playerScore;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-in fade-in duration-300 relative">
      {/* Floating Animated Score Bubble */}
      {showFloatingBubble && answerEvaluation && (
        <div
          className={`floating-score-bubble fixed z-50 pointer-events-none top-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full font-mono font-black text-sm sm:text-base border-2 shadow-2xl backdrop-blur-md flex items-center gap-2 ${
            answerEvaluation.isCorrect
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/80 shadow-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-400/80 shadow-rose-500/30'
          }`}
        >
          {answerEvaluation.isCorrect ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>+{answerEvaluation.scoreAwarded} PTS</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>+0 PTS</span>
            </>
          )}
        </div>
      )}

      {/* Header Bar: Round info, Live Score, Timer, Answers counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative">
        {/* Round & Topic Tag */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-white">
            ROUND {question.roundIndex} / {question.totalRounds}
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${topicBadgeColor[question.topic] || 'bg-slate-800 text-slate-300'}`}>
            {topicLabels[question.topic] || question.topic}
          </span>
          <span className="text-[11px] font-medium uppercase text-slate-500 hidden sm:inline">
            [{question.difficulty}]
          </span>
        </div>

        {/* Live Score Counter */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-700/50 text-xs font-mono font-bold text-cyan-300">
          <Award className="w-4 h-4 text-amber-400" />
          <span>SCORE: {displayedScore} PTS</span>
        </div>

        {/* Big Authoritative Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Time Left</span>
            <span className={`font-mono text-2xl font-black ${timerColor.split(' ')[0]}`}>
              {secondsRemaining.toFixed(1)}s
            </span>
          </div>

          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-11 h-11 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-slate-800"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${timerColor.split(' ')[1]} transition-all duration-100`}
                strokeDasharray={`${percentageTime}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <p className="text-lg sm:text-xl font-bold text-slate-100 leading-relaxed">
          {question.questionText}
        </p>

        {/* Tabular Data for Data Interpretation Questions */}
        {question.tableData && (
          <div className="my-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900/90 text-slate-200 border-b border-slate-800">
                <tr>
                  {question.tableData.headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-cyan-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {question.tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 text-slate-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 50/50 Power-Up Option */}
        <div className="flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              <strong className="text-white">{totalAnsweredCount}</strong> / {totalPlayersCount || '50'} contestants answered
            </span>
          </div>

          <button
            onClick={() => {
              if (!powerUp5050Used && !hasAnswered) {
                sound.playSelect();
                onUse5050();
              }
            }}
            disabled={powerUp5050Used || hasAnswered}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              powerUp5050Used
                ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                : hasAnswered
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500'
                : 'bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border-indigo-700/60 shadow-sm cursor-pointer'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>50:50 Power-Up {powerUp5050Used ? '(Used)' : '(1 per match)'}</span>
          </button>
        </div>

        {/* Shuffled Options Grid with In-Place Answer Evaluation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((option, idx) => {
            const isEliminated = eliminatedOptionIds.includes(option.id);
            const isSelected = selectedOptionId === option.id;
            const shape = SHAPES[idx % SHAPES.length];

            // Evaluate states based on authoritative server response
            const isEvaluated = !!answerEvaluation;
            const isCorrectOption = isEvaluated && option.id === answerEvaluation?.correctOptionId;
            const isSelectedCorrect = isEvaluated && isSelected && answerEvaluation?.isCorrect;
            const isSelectedIncorrect = isEvaluated && isSelected && !answerEvaluation?.isCorrect;

            let cardStyles = 'bg-slate-950/80 hover:bg-slate-900/90 border-slate-800 hover:border-cyan-500 active:scale-[0.98]';

            if (isEliminated) {
              cardStyles = 'opacity-25 bg-slate-950 border-slate-900 cursor-not-allowed pointer-events-none line-through';
            } else if (isSelectedCorrect) {
              // Highlight green when user answered correctly
              cardStyles = 'bg-emerald-950/90 border-emerald-400 text-white shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400';
            } else if (isSelectedIncorrect) {
              // Highlight red when user answered incorrectly
              cardStyles = 'bg-rose-950/90 border-rose-400 text-white shadow-xl shadow-rose-500/20 ring-2 ring-rose-400/80';
            } else if (isCorrectOption) {
              // Reveal correct option in green if user missed it
              cardStyles = 'bg-emerald-950/70 border-emerald-400/80 text-emerald-100 ring-2 ring-emerald-400/50 shadow-md shadow-emerald-500/10';
            } else if (isSelected) {
              // Selected but waiting for evaluation
              cardStyles = 'bg-indigo-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/40';
            } else if (hasAnswered) {
              cardStyles = 'opacity-40 bg-slate-950/60 border-slate-800 cursor-default';
            }

            return (
              <button
                key={option.id}
                disabled={hasAnswered || isEliminated}
                onClick={() => {
                  sound.playSelect();
                  onSubmitAnswer(option.id);
                }}
                className={`relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3.5 group cursor-pointer ${cardStyles}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Shape / Key Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 font-black text-xs font-mono transition-transform group-hover:scale-105 ${shape.color}`}
                  >
                    <span className="mr-0.5">{shape.symbol}</span>
                    <span className="text-[10px] text-slate-400">{shape.label}</span>
                  </div>

                  {/* Option Text */}
                  <div className="text-sm font-semibold text-slate-100 leading-snug">
                    {option.text}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {isSelectedCorrect && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Correct
                    </span>
                  )}

                  {isSelectedIncorrect && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[11px] font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}

                  {isCorrectOption && !isSelected && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Correct Answer
                    </span>
                  )}

                  {isSelected && !isEvaluated && (
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 animate-in zoom-in-50" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* In-Place Explanation Card (Revealed after answer evaluation) */}
        {answerEvaluation && (
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/50 text-xs text-slate-200 leading-relaxed animate-in fade-in space-y-1">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" /> Step-by-Step Aptitude Logic:
            </div>
            <p className="text-slate-300 text-xs">
              {answerEvaluation.explanation || question.options.find(o => o.id === answerEvaluation.correctOptionId)?.text}
            </p>
          </div>
        )}
      </div>

      {/* Answer Locked Status Banner */}
      {hasAnswered && !answerEvaluation && (
        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-700/50 flex items-center justify-between text-xs text-cyan-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>
              <strong>Answer Locked In!</strong> Elapsed: {serverElapsedSec ? `${serverElapsedSec}s` : 'measuring...'}
            </span>
          </div>
          <span className="text-slate-400">Evaluating against server authority...</span>
        </div>
      )}

      <style>{`
        @keyframes floatUpFade {
          0% {
            transform: translate(-50%, 10px) scale(0.9);
            opacity: 0;
          }
          15% {
            transform: translate(-50%, -6px) scale(1.08);
            opacity: 1;
          }
          75% {
            transform: translate(-50%, -24px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -40px) scale(0.95);
            opacity: 0;
          }
        }

        .floating-score-bubble {
          animation: floatUpFade 2.4s ease-out forwards;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .floating-score-bubble {
            animation: none !important;
            transform: translate(-50%, 0) !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};
