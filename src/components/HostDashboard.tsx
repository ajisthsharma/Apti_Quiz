import React, { useState } from 'react';
import { Layers, BookOpen, Clock, Play, Sparkles, AlertCircle, HelpCircle, Hash } from 'lucide-react';
import { QuestionSet } from '../types/quiz.js';
import { QuestionStudio } from './QuestionStudio.js';

interface HostDashboardProps {
  questionSetsList: QuestionSet[];
  onCreateRoom: (config: {
    hostName: string;
    questionSetId: string;
    roundDurationSec: number;
    questionLimit?: number;
  }) => Promise<void>;
  onRefreshSets: () => void;
  isCreating: boolean;
  errorMessage: string | null;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  questionSetsList,
  onCreateRoom,
  onRefreshSets,
  isCreating,
  errorMessage,
}) => {
  // Exactly TWO primary navigation tabs: 'create' | 'studio'
  const [activeHostTab, setActiveHostTab] = useState<'create' | 'studio'>('create');
  const [hostName, setHostName] = useState(() => localStorage.getItem('apti_host_name') || 'Placement Coordinator');
  const [selectedSetId, setSelectedSetId] = useState(() => questionSetsList[0]?.id || '');

  // Time Limit Per Question State: Preset (15, 20, 30) or custom numeric input (5 to 120s)
  const [durationPreset, setDurationPreset] = useState<15 | 20 | 30 | 'custom'>(20);
  const [customDurationInput, setCustomDurationInput] = useState<string>('20');

  // Question Limit State: 'all' questions vs 'custom' numeric input
  const [questionLimitMode, setQuestionLimitMode] = useState<'all' | 'custom'>('all');
  const [customQuestionCountInput, setCustomQuestionCountInput] = useState<string>('10');

  // Active chosen set information
  const currentSet = questionSetsList.find(s => s.id === (selectedSetId || questionSetsList[0]?.id)) || questionSetsList[0];
  const availableQuestionCount = currentSet?.questions?.length || 0;

  // Validation
  const effectiveDuration = durationPreset === 'custom' ? parseInt(customDurationInput, 10) : durationPreset;
  const isDurationValid = !isNaN(effectiveDuration) && effectiveDuration >= 5 && effectiveDuration <= 120;

  const effectiveCount = questionLimitMode === 'custom' ? parseInt(customQuestionCountInput, 10) : undefined;
  const isCountValid = questionLimitMode === 'all' || (!isNaN(effectiveCount!) && effectiveCount! >= 1 && effectiveCount! <= availableQuestionCount);

  let validationError = '';
  if (!isDurationValid) {
    validationError = 'Question duration must be between 5 and 120 seconds.';
  } else if (!isCountValid) {
    validationError = `Question count must be between 1 and ${availableQuestionCount} (available in this set).`;
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;

    localStorage.setItem('apti_host_name', hostName);
    await onCreateRoom({
      hostName: hostName.trim() || 'Faculty Lead',
      questionSetId: selectedSetId || (questionSetsList[0]?.id || ''),
      roundDurationSec: effectiveDuration,
      questionLimit: questionLimitMode === 'custom' ? effectiveCount : undefined,
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Host Portal Header */}
      <div className="p-8 rounded-3xl bg-[#141419] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-cyan-300 text-xs font-bold mb-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> FACULTY & COORDINATOR PORTAL
            </div>
            <h2 className="text-3xl font-black text-[#F8FAFC] tracking-tight">
              AptiQuiz Host Dashboard
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-xl">
              Launch synchronized test arenas for campus placements. Project the room QR code on a screen, monitor live student answer rates, and review campus standings.
            </p>
          </div>

          {/* EXACTLY TWO Primary Navigation Options: Launch Room & Question Studio */}
          <div className="flex items-center gap-2 bg-[#09090B] p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveHostTab('create')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeHostTab === 'create'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Room</span>
            </button>
            <button
              onClick={() => setActiveHostTab('studio')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeHostTab === 'studio'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Question Studio</span>
            </button>
          </div>
        </div>
      </div>

      {(errorMessage || validationError) && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage || validationError}</span>
        </div>
      )}

      {/* Mode 1: Create & Configure Quiz Room */}
      {activeHostTab === 'create' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Room Configuration Form (7 cols) */}
          <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#141419] border border-slate-800 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Create a New Live Match</h3>
              <p className="text-xs text-slate-400">
                A unique 6-character room code and QR code will be generated immediately.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Host / Coordinator Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. R. K. Sharma"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Select Question Bank *
                  </label>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">
                    {availableQuestionCount} Questions Available
                  </span>
                </div>
                <select
                  value={selectedSetId || (questionSetsList[0]?.id || '')}
                  onChange={(e) => setSelectedSetId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {questionSetsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.questions.length} questions) {s.isCustom ? '• [Custom Set]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Limit Per Question with Presets + Custom Numeric Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Time Limit Per Question *
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Active: <strong className="text-cyan-400">{effectiveDuration}s</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[15, 20, 30].map((sec) => (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => {
                        setDurationPreset(sec as 15 | 20 | 30);
                        setCustomDurationInput(String(sec));
                      }}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        durationPreset === sec
                          ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-cyan-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setDurationPreset('custom')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      durationPreset === 'custom'
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Custom</span>
                  </button>
                </div>

                {/* Custom duration numeric input */}
                {durationPreset === 'custom' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 animate-in fade-in duration-200">
                    <span className="text-xs text-slate-400">Custom Duration:</span>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={customDurationInput}
                      onChange={(e) => setCustomDurationInput(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-xs text-slate-400">seconds (5–120s)</span>
                  </div>
                )}
              </div>

              {/* Question Limit with All vs Custom Segmented Control */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Question Limit *
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Will use:{' '}
                    <strong className="text-cyan-400">
                      {questionLimitMode === 'all' ? `All ${availableQuestionCount}` : `${effectiveCount} questions`}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionLimitMode('all')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      questionLimitMode === 'all'
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All in Bank ({availableQuestionCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuestionLimitMode('custom');
                      if (!customQuestionCountInput || Number(customQuestionCountInput) > availableQuestionCount) {
                        setCustomQuestionCountInput(String(Math.min(10, availableQuestionCount)));
                      }
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      questionLimitMode === 'custom'
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Custom Count</span>
                  </button>
                </div>

                {questionLimitMode === 'custom' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 animate-in fade-in duration-200">
                    <span className="text-xs text-slate-400">Questions to Play:</span>
                    <input
                      type="number"
                      min={1}
                      max={availableQuestionCount}
                      value={customQuestionCountInput}
                      onChange={(e) => setCustomQuestionCountInput(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-xs text-slate-400">questions (max {availableQuestionCount})</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isCreating || !!validationError}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isCreating ? 'Registering Room...' : 'Generate Room Code & QR'}</span>
              </button>
            </form>
          </div>

          {/* Quick Guide Card (5 cols) */}
          <div className="md:col-span-5 p-6 rounded-3xl bg-[#141419] border border-slate-800 shadow-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> How Live Hosting Works
            </h4>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">1. Instant Room Registration</span>
                <p className="text-slate-400">
                  Your room is authoritatively registered in server state with its question bank before the join code is shown.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">2. Projector QR Code</span>
                <p className="text-slate-400">
                  Students point their phones at your screen. The QR code opens AptiQuiz and automatically fills the room code.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">3. Automated Quiz Progression</span>
                <p className="text-slate-400">
                  The quiz engine runs automatically. Each round shows 5 seconds of answer feedback then cleanly transitions without referee intervention.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Question Studio (with Upload Questions button inside) */}
      {activeHostTab === 'studio' && (
        <QuestionStudio onSetCreated={onRefreshSets} />
      )}
    </div>
  );
};
