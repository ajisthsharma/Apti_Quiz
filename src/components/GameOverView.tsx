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
} from 'lucide-react';
import { FinalResultsPayload, Topic } from '../types/quiz.js';
import { sound } from '../utils/sound.js';
import { ParticipantAvatar } from './ParticipantAvatar.js';

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

  const myRecord = results.leaderboard.find(p => p.id === currentPlayerId);
  const podium = results.leaderboard.slice(0, 3);

  const filteredLeaderboard = results.leaderboard.filter(p =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.college && p.college.toLowerCase().includes(searchFilter.toLowerCase()))
  );

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
          <Trophy className="w-4 h-4 text-amber-400" /> Match Completed • Official Rankings
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Campus Placement Arena Podium
        </h2>
        <p className="text-sm text-slate-400">
          Match Room: <span className="font-mono text-cyan-400 font-bold">{results.roomCode}</span> • {results.totalRounds} Placement Rounds • {results.leaderboard.length} Contestants
        </p>
      </div>

      {/* COMPETITION PODIUM: 2nd (Left, Medium) | 1st (Center, Tallest, Gold) | 3rd (Right, Shorter, Bronze) */}
      {podium.length > 0 ? (
        <div className="p-6 sm:p-10 rounded-3xl bg-[#141419]/90 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-6">
            {/* 2nd Place: Left, Medium height */}
            {podium[1] ? (
              <div className="order-2 md:order-1 flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <ParticipantAvatar
                    id={podium[1].id}
                    name={podium[1].name}
                    size="lg"
                    className="ring-4 ring-slate-300/60 shadow-lg shadow-slate-300/20"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-300 text-slate-950 font-black text-[10px] uppercase shadow-sm">
                    🥈 2nd
                  </span>
                </div>

                <div className="space-y-0.5 w-full">
                  <h4 className="font-extrabold text-slate-100 text-base truncate">{podium[1].name}</h4>
                  <p className="text-xs text-slate-400 truncate">{podium[1].college || 'Independent'}</p>
                </div>

                {/* Medium Height Podium Base */}
                <div className="w-full pt-6 pb-5 px-4 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/80 shadow-xl space-y-1 min-h-[140px] flex flex-col justify-center items-center">
                  <span className="font-mono text-xs uppercase text-slate-400 font-bold">Runner Up</span>
                  <div className="font-mono text-2xl font-black text-cyan-400">{podium[1].score.toLocaleString()} pts</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {podium[1].accuracyPercent}% Acc • {podium[1].averageTimeSec}s avg
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-2 md:order-1 hidden md:block" />
            )}

            {/* 1st Place: Center, Tallest, Gold Accent */}
            {podium[0] ? (
              <div className="order-1 md:order-2 flex flex-col items-center text-center space-y-3.5 -mt-6">
                <div className="relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-amber-500/30 animate-bounce">
                    <Sparkles className="w-3.5 h-3.5" /> CHAMPION
                  </div>
                  <ParticipantAvatar
                    id={podium[0].id}
                    name={podium[0].name}
                    size="xl"
                    className="ring-4 ring-amber-400 shadow-2xl shadow-amber-500/30"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase shadow-md">
                    🥇 1st Place
                  </span>
                </div>

                <div className="space-y-0.5 w-full">
                  <h3 className="font-black text-white text-lg sm:text-xl truncate">{podium[0].name}</h3>
                  <p className="text-xs text-amber-300 font-semibold truncate">{podium[0].college || 'Independent'}</p>
                </div>

                {/* Tallest Podium Base */}
                <div className="w-full pt-8 pb-6 px-4 rounded-3xl bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/20 space-y-1.5 min-h-[180px] flex flex-col justify-center items-center">
                  <span className="font-mono text-xs uppercase tracking-wider text-amber-300 font-extrabold">Match Winner</span>
                  <div className="font-mono text-3xl font-black text-amber-400">{podium[0].score.toLocaleString()} pts</div>
                  <div className="text-xs text-slate-300 font-mono font-medium">
                    {podium[0].accuracyPercent}% Accuracy • {podium[0].averageTimeSec}s avg
                  </div>
                </div>
              </div>
            ) : null}

            {/* 3rd Place: Right, Shorter, Bronze Accent */}
            {podium[2] ? (
              <div className="order-3 md:order-3 flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <ParticipantAvatar
                    id={podium[2].id}
                    name={podium[2].name}
                    size="lg"
                    className="ring-4 ring-amber-700/60 shadow-lg shadow-amber-700/20"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-700 text-white font-black text-[10px] uppercase shadow-sm">
                    🥉 3rd
                  </span>
                </div>

                <div className="space-y-0.5 w-full">
                  <h4 className="font-extrabold text-slate-100 text-base truncate">{podium[2].name}</h4>
                  <p className="text-xs text-slate-400 truncate">{podium[2].college || 'Independent'}</p>
                </div>

                {/* Shorter Height Podium Base */}
                <div className="w-full pt-5 pb-4 px-4 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-900/40 shadow-xl space-y-1 min-h-[115px] flex flex-col justify-center items-center">
                  <span className="font-mono text-xs uppercase text-slate-400 font-bold">3rd Place</span>
                  <div className="font-mono text-xl font-black text-cyan-400">{podium[2].score.toLocaleString()} pts</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {podium[2].accuracyPercent}% Acc • {podium[2].averageTimeSec}s avg
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-3 md:order-3 hidden md:block" />
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-[#141419] border border-slate-800 text-center text-slate-400">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No participants completed this match</h3>
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
            onPlayAgain();
          }}
          disabled={isNavigating}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Play Another Match</span>
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
