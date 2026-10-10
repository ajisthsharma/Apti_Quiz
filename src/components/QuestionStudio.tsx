import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, BookOpen, Layers, Check, AlertCircle, Edit2, Upload } from 'lucide-react';
import { Question, QuestionSet, Topic, Difficulty } from '../types/quiz.js';
import { QuestionBankUpload } from './QuestionBankUpload.js';

interface QuestionStudioProps {
  onSetCreated?: () => void;
}

export const QuestionStudio: React.FC<QuestionStudioProps> = ({ onSetCreated }) => {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'create' | 'upload'>('list');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Question Set State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Partial<Question>[]>([
    {
      id: 'q_1',
      topic: 'quantitative',
      difficulty: 'medium',
      questionText: 'A car covers a distance of 450 km in 5 hours. What is its speed in meters per second?',
      options: [
        { id: 'opt_1', text: '20 m/s' },
        { id: 'opt_2', text: '25 m/s' },
        { id: 'opt_3', text: '30 m/s' },
        { id: 'opt_4', text: '15 m/s' },
      ],
      correctOptionId: 'opt_2',
      explanation: 'Speed in km/h = 450 / 5 = 90 km/h. To convert to m/s, multiply by 5/18: 90 × (5/18) = 25 m/s.',
      timeLimitSec: 20,
    },
  ]);

  const fetchSets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/question-sets');
      if (res.ok) {
        const data = await res.json();
        setSets(data);
      }
    } catch (err) {
      console.error('Failed to load sets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleAddQuestion = () => {
    const newQ: Partial<Question> = {
      id: `q_${Date.now()}`,
      topic: 'quantitative',
      difficulty: 'medium',
      questionText: '',
      options: [
        { id: 'opt_1', text: '' },
        { id: 'opt_2', text: '' },
        { id: 'opt_3', text: '' },
        { id: 'opt_4', text: '' },
      ],
      correctOptionId: 'opt_1',
      explanation: '',
      timeLimitSec: 20,
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    setQuestions(reordered);
  };

  const handleSaveSet = async () => {
    if (!title.trim()) {
      alert('Please enter a Title for this Question Set.');
      return;
    }

    const invalidQ = questions.find(
      q => !q.questionText?.trim() || q.options?.some(o => !o.text.trim())
    );
    if (invalidQ) {
      alert('Please complete the question text and all four options for every question.');
      return;
    }

    try {
      const res = await fetch('/api/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          topicTags: Array.from(new Set(questions.map(q => q.topic || 'quantitative'))),
          questions,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        setMode('list');
        setTitle('');
        setDescription('');
        fetchSets();
        if (onSetCreated) onSetCreated();
      }
    } catch (err) {
      console.error('Failed to save set:', err);
      alert('Error saving question set.');
    }
  };

  const handleDeleteSet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom question set?')) return;
    try {
      const res = await fetch(`/api/question-sets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSets();
      }
    } catch (err) {
      console.error('Failed to delete set:', err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-2">
            <BookOpen className="w-3.5 h-3.5" /> FACULTY QUESTION STUDIO
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Author & Manage Question Sets
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create, reorder, and configure custom aptitude rounds or import existing CSV / JSON test banks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMode(mode === 'upload' ? 'list' : 'upload')}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              mode === 'upload'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-md'
                : 'bg-slate-950 border-slate-800 text-cyan-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{mode === 'upload' ? 'Browse Sets' : 'Upload Questions'}</span>
          </button>

          <button
            onClick={() => setMode(mode === 'create' ? 'list' : 'create')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {mode === 'create' ? <Layers className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{mode === 'create' ? 'View Sets' : 'Create New Set'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" /> Question Set published successfully! It is now available to choose in room setup.
        </div>
      )}

      {/* Mode 1: Upload CSV/JSON Question Bank */}
      {mode === 'upload' && (
        <QuestionBankUpload
          onSuccess={() => {
            fetchSets();
            if (onSetCreated) onSetCreated();
            setMode('list');
          }}
          onCancel={() => setMode('list')}
        />
      )}

      {/* Mode 2: Creating New Question Set */}
      {mode === 'create' && (
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Set Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Set Title *</label>
                <input
                  type="text"
                  placeholder="e.g. TCS Ninja Quantitative Aptitude Mock 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 5 fast-paced quantitative problem questions on work, pipes, and ratios."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Questions ({questions.length})
              </h3>
              <button
                onClick={handleAddQuestion}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={q.id || idx} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-300">Question #{idx + 1}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveQuestion(idx)}
                      disabled={questions.length <= 1}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                      title="Remove Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Configuration row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Topic</label>
                    <select
                      value={q.topic}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[idx].topic = e.target.value as Topic;
                        setQuestions(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    >
                      <option value="quantitative">Quantitative Aptitude</option>
                      <option value="logical">Logical Reasoning</option>
                      <option value="verbal">Verbal Ability</option>
                      <option value="data_interpretation">Data Interpretation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Difficulty</label>
                    <select
                      value={q.difficulty}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[idx].difficulty = e.target.value as Difficulty;
                        setQuestions(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Time Limit (Sec)</label>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      value={q.timeLimitSec || 20}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[idx].timeLimitSec = Number(e.target.value);
                        setQuestions(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Question Prompt *</label>
                  <textarea
                    rows={2}
                    placeholder="Enter the aptitude question text..."
                    value={q.questionText}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx].questionText = e.target.value;
                      setQuestions(updated);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Options & Correct Answer Radio */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-2 block">
                    Options & Correct Answer Selection *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options?.map((opt, oIdx) => {
                      const isCorrect = q.correctOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                            isCorrect ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${idx}`}
                            checked={isCorrect}
                            onChange={() => {
                              const updated = [...questions];
                              updated[idx].correctOptionId = opt.id;
                              setQuestions(updated);
                            }}
                            className="text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                            title="Mark as correct answer"
                          />
                          <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                            Opt {oIdx + 1}:
                          </span>
                          <input
                            type="text"
                            placeholder={`Option ${oIdx + 1} text`}
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...questions];
                              if (updated[idx].options) {
                                updated[idx].options![oIdx].text = e.target.value;
                                setQuestions(updated);
                              }
                            }}
                            className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder-slate-600"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Step-by-step Solution</label>
                  <input
                    type="text"
                    placeholder="Explain the mathematical shortcut or formula used..."
                    value={q.explanation}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx].explanation = e.target.value;
                      setQuestions(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 placeholder-slate-600"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => setMode('list')}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSet}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Question Set
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Browse Existing Question Sets */}
      {mode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sets.map((set) => (
            <div
              key={set.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {set.topicTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-950 border border-slate-800 text-cyan-400 font-mono"
                      >
                        {tag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  {set.isCustom && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                      CUSTOM
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white">{set.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{set.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>{set.questions.length} Questions</span>
                {set.isCustom && (
                  <button
                    onClick={() => handleDeleteSet(set.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Custom Set"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
