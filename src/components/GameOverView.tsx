import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Medal,
  Download,
  RefreshCw,
  BarChart2,
  CheckCircle,
  Clock,
  Award,
  Shield,
  FileSpreadsheet,
  Play,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  FileText,
  AlertCircle,
  FileCheck,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react';
import { FinalResultsPayload, Topic } from '../types/quiz.js';
import { sound } from '../utils/sound.js';
import { ParticipantAvatar } from './ParticipantAvatar.js';
import { MatchPodium } from './MatchPodium.js';
import {
  downloadLearningReportPDF,
  downloadLearningReportDOCX,
  LearningReportData,
} from '../utils/learningReportGenerator.js';

interface GameOverViewProps {
  results: FinalResultsPayload;
  currentPlayerId: string;
  isHost?: boolean;
  onJoinQuiz?: () => void;
  onPlayAgain: () => void;
  onViewLeague: () => void;
  onHostPortal?: () => void;
}

export const GameOverView: React.FC<GameOverViewProps> = ({
  results,
  currentPlayerId,
  isHost,
  onJoinQuiz,
  onPlayAgain,
  onViewLeague,
  onHostPortal,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'docx' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    sound.playFanfare();

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
        });
      }, 350);
    } catch {
      // Ignore confetti error if unsupported
    }
  }, []);

  const myRecord = results.leaderboard.find(p => p.id === currentPlayerId || (p as any).participantId === currentPlayerId);
  const myReviews = (results.questionReviews?.[currentPlayerId] ||
    (myRecord && results.questionReviews?.[(myRecord as any).participantId]) ||
    []) as any[];

  const mistakes = myReviews.filter(q => !q.isCorrect);
  const hasAnsweredAny = myReviews.some(q => q.hasAnswered);

  const filteredLeaderboard = results.leaderboard.filter(p =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.college && p.college.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleDownloadReport = async (format: 'pdf' | 'docx') => {
    if (!myRecord) return;
    setDownloadFormat(format);
    setDownloadError(null);

    try {
      let reviews = myReviews;
      if (reviews.length === 0) {
        try {
          const res = await fetch(`/api/matches/${results.roomCode}/reviews/${currentPlayerId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.reviews && data.reviews.length > 0) {
              reviews = data.reviews;
            }
          }
        } catch {
          // fallback to client results
        }
      }

      const reportData: LearningReportData = {
        roomCode: results.roomCode,
        completedAt: results.completedAt,
        questionSetTitle: results.questionSetTitle,
        participantName: myRecord.name,
        college: myRecord.college,
        finalScore: myRecord.score,
        finalRank: myRecord.rank,
        totalParticipants: results.leaderboard.length,
        totalQuestions: results.totalRounds,
        correctCount: myRecord.correctCount,
        incorrectCount: Math.max(0, results.totalRounds - myRecord.correctCount),
        accuracyPercent: myRecord.accuracyPercent,
        averageTimeSec: myRecord.averageTimeSec,
        questionReviews: reviews,
      };

      if (format === 'pdf') {
        await downloadLearningReportPDF(reportData);
      } else {
        await downloadLearningReportDOCX(reportData);
      }
    } catch (err: any) {
      console.error('Failed to generate learning report:', err);
      setDownloadError(err?.message || 'Failed to generate mistake review report. Please try again.');
    } finally {
      setDownloadFormat(null);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Rank',
      'Player Name',
      'College',
      'Score',
      'Accuracy (%)',
      'Avg Time (s)',
      'Quant Correct',
      'Logic Correct',
      'Verbal Correct',
      'DI Correct',
    ];
    const rows = results.leaderboard.map(p => [
      p.rank,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.college || 'Independent').replace(/"/g, '""')}"`,
      p.score,
      `${p.accuracyPercent}%`,
      p.averageTimeSec,
      `${p.topicBreakdown.quantitative.correct}/${p.topicBreakdown.quantitative.total}`,
      `${p.topicBreakdown.logical.correct}/${p.topicBreakdown.logical.total}`,
      `${p.topicBreakdown.verbal.correct}/${p.topicBreakdown.verbal.total}`,
      `${p.topicBreakdown.data_interpretation.correct}/${p.topicBreakdown.data_interpretation.total}`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AptiQuiz_${results.roomCode}_Final_Standings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topicLabels: Record<Topic, string> = {
    quantitative: 'Quantitative Aptitude',
    logical: 'Logical Reasoning',
    verbal: 'Verbal Ability',
    data_interpretation: 'Data Interpretation',
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>{isHost ? 'Faculty Host Console • Official Match Results' : 'Match Completed • Official Rankings'}</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Campus Placement Arena Podium
        </h2>
        <p className="text-sm text-slate-400">
          Match Room: <span className="font-mono text-cyan-400 font-bold">{results.roomCode}</span> • {results.totalRounds} Placement Rounds • {results.leaderboard.length} Contestants
        </p>
      </div>

      {/* REUSABLE AUTHORITATIVE MATCH PODIUM COMPONENT (Desktop & Mobile) */}
      <MatchPodium
        leaderboard={results.leaderboard}
        currentPlayerId={currentPlayerId}
        isHost={isHost}
      />

      {/* Faculty Host Match Analytics Card (Only shown to Host) */}
      {isHost && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Host Analytics & Faculty Summary
              </span>
              <h3 className="text-lg font-black text-white">Quiz Match Overview</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Full CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Contestants</span>
              <span className="text-xl font-black text-white">{results.leaderboard.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Rounds Completed</span>
              <span className="text-xl font-black text-cyan-400">{results.totalRounds}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Top Score</span>
              <span className="text-xl font-black text-amber-400">{results.leaderboard[0]?.score?.toLocaleString() || 0}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Winning College</span>
              <span className="text-xs font-bold text-slate-200 truncate block mt-1">{results.leaderboard[0]?.college || 'Independent'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Current Student's Personal Performance Card */}
      {myRecord && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#141419] border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3.5">
              <ParticipantAvatar id={myRecord.id} name={myRecord.name} size="lg" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Your Placement Scorecard</span>
                <h3 className="text-xl font-black text-white">{myRecord.name}</h3>
                <p className="text-xs text-slate-400">{myRecord.college || 'Independent'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Final Rank</span>
                <span className="font-mono text-lg font-black text-white">#{myRecord.rank}</span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 text-center">
                <span className="text-[10px] text-indigo-300 uppercase font-bold block">Total Score</span>
                <span className="font-mono text-lg font-black text-cyan-400">{myRecord.score.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Accuracy Rate
              </span>
              <div className="font-mono text-xl font-bold text-white">{myRecord.accuracyPercent}%</div>
              <span className="text-[11px] text-slate-500">{myRecord.correctCount} of {results.totalRounds} correct</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Average Speed
              </span>
              <div className="font-mono text-xl font-bold text-white">{myRecord.averageTimeSec}s</div>
              <span className="text-[11px] text-slate-500">Per question response</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Readiness Status
              </span>
              <div className="font-mono text-xl font-bold text-amber-400">
                {myRecord.accuracyPercent >= 80 ? 'Tier 1 Top Pick' : myRecord.accuracyPercent >= 50 ? 'Strong Candidate' : 'Practicing'}
              </div>
              <span className="text-[11px] text-slate-500">Campus benchmark</span>
            </div>
          </div>

          {/* Topic-Wise Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-cyan-400" /> Sectional Mastery Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(myRecord.topicBreakdown) as Topic[]).map((topic) => {
                const stat = myRecord.topicBreakdown[topic];
                if (!stat || stat.total === 0) return null;
                const pct = Math.round((stat.correct / stat.total) * 100);

                return (
                  <div key={topic} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-200">{topicLabels[topic]}</span>
                      <span className="font-mono text-slate-400">
                        {stat.correct} / {stat.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
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
      )}

      {/* Review Your Mistakes Section for Participants */}
      {myRecord && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-2">
                <FileCheck className="w-3.5 h-3.5" /> POST-MATCH STUDY REPORT
              </div>
              <h3 className="text-xl font-black text-white">Review Your Mistakes</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Download personalized wrong-answer reports or review full explanations to boost your placement score.
              </p>
            </div>

            {/* Two Download Options: PDF and Word Document (.docx) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleDownloadReport('pdf')}
                disabled={downloadFormat !== null}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-900/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                title="Download personalized mistake review in PDF format"
              >
                <FileText className="w-4 h-4" />
                <span>{downloadFormat === 'pdf' ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>

              <button
                onClick={() => handleDownloadReport('docx')}
                disabled={downloadFormat !== null}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                title="Download personalized mistake review in Word (.docx) format"
              >
                <FileText className="w-4 h-4" />
                <span>{downloadFormat === 'docx' ? 'Generating Word...' : 'Download Word Document (.docx)'}</span>
              </button>
            </div>
          </div>

          {/* Download Error Banner if any */}
          {downloadError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{downloadError}</span>
              </div>
              <button
                onClick={() => handleDownloadReport('pdf')}
                className="text-xs font-bold text-cyan-300 underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Mistakes Content Breakdown */}
          {!hasAnsweredAny && myReviews.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-400 space-y-1">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-1" />
              <h4 className="font-bold text-sm text-slate-200">No Answers Submitted</h4>
              <p className="text-xs text-slate-500">There are no submitted answers available for review from this session.</p>
            </div>
          ) : mistakes.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Flawless Performance! Zero Mistakes Recorded</h4>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  You scored 100% accuracy on all questions in this match. Download your official certificate of perfection above.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Identified {mistakes.length} Question{mistakes.length === 1 ? '' : 's'} to Learn From</span>
                <span className="font-mono text-[11px] text-rose-400 font-bold">Needs Review</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {mistakes.map((q: any, mIdx: number) => (
                  <div
                    key={q.questionId || mIdx}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[11px] font-bold">
                        Question #{q.roundIndex} • {topicLabels[q.topic as Topic] || q.topic} [{String(q.difficulty).toUpperCase()}]
                      </span>
                      <span className="text-[10px] text-rose-400 font-mono font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-relaxed">
                      {q.questionText}
                    </h4>

                    {/* Table Data if question had a table */}
                    {q.tableData && (
                      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-1">
                        <table className="w-full text-[11px] text-slate-300">
                          <thead className="bg-slate-900 text-cyan-400 border-b border-slate-800 font-mono">
                            <tr>
                              {q.tableData.headers.map((h: string, i: number) => (
                                <th key={i} className="px-3 py-1.5 font-semibold text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-mono">
                            {q.tableData.rows.map((row: string[], rIdx: number) => (
                              <tr key={rIdx}>
                                {row.map((cell: string, cIdx: number) => (
                                  <td key={cIdx} className="px-3 py-1 text-slate-300">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-rose-200">
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-0.5">
                          Your Selected Answer:
                        </span>
                        <span className="font-semibold">{q.selectedOptionText || '(Unanswered / Timed Out)'}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-emerald-200">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-0.5">
                          Authoritative Correct Answer:
                        </span>
                        <span className="font-semibold">{q.correctOptionText}</span>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">
                          Conceptual Explanation:
                        </span>
                        <p className="text-slate-300 leading-relaxed font-sans text-[11px]">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table with Consistent Avatars, Search, and CSV Export */}
      <div className="p-6 rounded-3xl bg-[#141419] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Full Match Standings ({results.leaderboard.length})</h3>
            <p className="text-xs text-slate-400">Authoritative server calculated ranks & statistics</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search contestant or college..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download results as CSV for faculty"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">College</th>
                <th className="px-4 py-3 font-semibold text-right">Score</th>
                <th className="px-4 py-3 font-semibold text-right">Accuracy</th>
                <th className="px-4 py-3 font-semibold text-right">Avg Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLeaderboard.map((p) => {
                const isMe = p.id === currentPlayerId;
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${isMe ? 'bg-indigo-950/40 text-white font-bold' : 'hover:bg-slate-800/30'}`}
                  >
                    <td className="px-4 py-3 font-bold">
                      {p.rank === 1 && <span className="text-amber-400 mr-1">🥇</span>}
                      {p.rank === 2 && <span className="text-slate-300 mr-1">🥈</span>}
                      {p.rank === 3 && <span className="text-amber-600 mr-1">🥉</span>}
                      #{p.rank}
                    </td>
                    <td className="px-4 py-3 font-sans font-medium text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <ParticipantAvatar id={p.id} name={p.name} size="xs" />
                        <span>
                          {p.name} {isMe && <span className="text-[10px] text-cyan-400 font-mono">(YOU)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-400">{p.college || 'Independent'}</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-400">{p.score.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{p.accuracyPercent}%</td>
                    <td className="px-4 py-3 text-right text-slate-400">{p.averageTimeSec}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Action Buttons: Play Another Match & View Leaderboard */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-slate-800">
        <button
          onClick={() => {
            if (isNavigating) return;
            setIsNavigating(true);
            if (isHost && onHostPortal) {
              onHostPortal();
            } else {
              onPlayAgain();
            }
          }}
          disabled={isNavigating}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{isHost ? 'Launch Another Quiz Room' : 'Play Another Match'}</span>
        </button>

        <button
          onClick={() => {
            if (isNavigating) return;
            setIsNavigating(true);
            onViewLeague();
          }}
          disabled={isNavigating}
          className="px-6 py-3 rounded-2xl bg-[#141419] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>View Leaderboard</span>
        </button>

        {onHostPortal && (
          <button
            onClick={() => {
              if (isNavigating) return;
              setIsNavigating(true);
              onHostPortal();
            }}
            disabled={isNavigating}
            className="px-6 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            <span>Faculty Host Portal</span>
          </button>
        )}
      </div>
    </div>
  );
};
