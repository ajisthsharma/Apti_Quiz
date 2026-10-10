import React, { useEffect, useState } from 'react';
import { Trophy, School, Medal, Users, TrendingUp, Search, RefreshCw, Flame, Award, HelpCircle, ArrowLeft, Play } from 'lucide-react';
import { CollegeLeaderboardEntry, PlayerLeaderboardEntry } from '../types/quiz.js';
import { ParticipantAvatar } from './ParticipantAvatar.js';

interface CollegeLeagueViewProps {
  onBackToResults?: () => void;
  onJoinQuiz?: () => void;
}

export const CollegeLeagueView: React.FC<CollegeLeagueViewProps> = ({
  onBackToResults,
  onJoinQuiz,
}) => {
  const [colleges, setColleges] = useState<CollegeLeaderboardEntry[]>([]);
  const [topPlayers, setTopPlayers] = useState<PlayerLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'colleges' | 'players'>('colleges');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchLeague = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/league');
      if (res.ok) {
        const data = await res.json();
        setColleges(data.colleges || []);
        setTopPlayers(data.topPlayers || []);
      } else {
        setError('Failed to fetch real-time league standings.');
      }
    } catch (err) {
      console.error('Failed to load league standings:', err);
      setError('Network error fetching league results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeague();
  }, []);

  const filteredColleges = colleges.filter(c =>
    c.college.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPlayers = topPlayers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.college.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* League Header */}
      <div className="p-8 rounded-3xl bg-[#111A2E] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-2">
              <Trophy className="w-3.5 h-3.5" /> INTER-COLLEGE APTITUDE LEAGUE
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Collegiate Rankings & Hall of Fame
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Real rankings computed strictly from genuine completed quiz matches. No unparticipating colleges or sample students appear.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onBackToResults && (
              <button
                onClick={onBackToResults}
                className="px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Scorecard</span>
              </button>
            )}

            {onJoinQuiz && (
              <button
                onClick={onJoinQuiz}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Join New Room</span>
              </button>
            )}

            <button
              onClick={fetchLeague}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Standings</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('colleges')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'colleges'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <School className="w-4 h-4" />
            Top Colleges & Universities
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'players'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            Top Campus Performers
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'colleges' ? 'Filter colleges...' : 'Filter candidates...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111A2E] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {activeTab === 'colleges' ? filteredColleges.length : filteredPlayers.length} Ranked Entries
        </span>
      </div>

      {/* College Standings Table */}
      {activeTab === 'colleges' ? (
        <div className="bg-[#111A2E] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Rank</th>
                  <th className="px-5 py-3.5 font-semibold">College / University</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Cumulative Points</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Matches</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Player Attempts</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Top Score</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Avg / Player</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      Loading persistent collegiate standings...
                    </td>
                  </tr>
                ) : filteredColleges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-sans">
                      <div className="max-w-md mx-auto space-y-2">
                        <Award className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                        <h4 className="font-bold text-white text-sm">No college rankings available yet.</h4>
                        <p className="text-xs text-slate-500">
                          Complete a genuine match as host or student to appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredColleges.map((c, idx) => (
                    <tr key={c.college} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          {idx === 0 && <span className="text-amber-400 text-sm">🥇</span>}
                          {idx === 1 && <span className="text-slate-300 text-sm">🥈</span>}
                          {idx === 2 && <span className="text-amber-600 text-sm">🥉</span>}
                          <span>#{idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-sans font-bold text-white text-sm">
                        {c.college}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-cyan-400 text-sm">
                        {c.totalScore.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400">{c.matchesPlayed}</td>
                      <td className="px-5 py-3.5 text-right text-slate-300">{c.attemptsCount || c.totalPlayers}</td>
                      <td className="px-5 py-3.5 text-right text-amber-400 font-bold">{c.topScore.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-slate-400">{c.averageScore.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Top Players Hall of Fame */
        <div className="bg-[#111A2E] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Rank</th>
                  <th className="px-5 py-3.5 font-semibold">Candidate</th>
                  <th className="px-5 py-3.5 font-semibold">Institution</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Cumulative Points</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Matches</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Wins</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Avg Accuracy</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Avg Response Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      Loading player rankings...
                    </td>
                  </tr>
                ) : filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 font-sans">
                      <div className="max-w-md mx-auto space-y-2">
                        <Flame className="w-8 h-8 text-cyan-400/50 mx-auto mb-2" />
                        <h4 className="font-bold text-white text-sm">No completed quizzes yet. Complete a quiz to appear in the rankings.</h4>
                        <p className="text-xs text-slate-500">
                          Complete a live quiz match to earn placement points and appear in the campus hall of fame.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p, idx) => (
                    <tr key={`${p.name}_${idx}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold">
                        {idx === 0 && <span className="text-amber-400 mr-1">🥇</span>}
                        {idx === 1 && <span className="text-slate-300 mr-1">🥈</span>}
                        {idx === 2 && <span className="text-amber-600 mr-1">🥉</span>}
                        #{idx + 1}
                      </td>
                      <td className="px-5 py-3.5 font-sans font-bold text-white text-sm">
                        <div className="flex items-center gap-2.5">
                          <ParticipantAvatar id={p.playerId} name={p.name} size="xs" />
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-sans text-slate-400">{p.college}</td>
                      <td className="px-5 py-3.5 text-right font-black text-cyan-400 text-sm">
                        {p.totalScore.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400">{p.matchesPlayed}</td>
                      <td className="px-5 py-3.5 text-right text-amber-400 font-bold">{p.winCount}</td>
                      <td className="px-5 py-3.5 text-right text-slate-300">{p.accuracyPercent}%</td>
                      <td className="px-5 py-3.5 text-right text-slate-400">{p.averageTimeSec ? `${p.averageTimeSec}s` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
