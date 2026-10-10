import React from 'react';
import { X, ShieldCheck, Zap, Server, RefreshCw, Cpu, Award } from 'lucide-react';
import { SCORING_RULES } from '../utils/scoring.js';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Scoring Rules & Fairness Engine</h2>
              <p className="text-xs text-slate-400">How AptiQuiz guarantees competitive placement integrity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm text-slate-300">
          {/* Scoring Formula */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Scoring Mechanics (Speed & Accuracy)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCORING_RULES.map((rule, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-semibold text-white text-xs">{rule.title}</span>
                    <span className="font-mono text-xs font-bold text-cyan-400">{rule.value}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Network Delay Handling */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1.5">
              <Server className="w-4 h-4" /> Fair Under Network Delay: How It Works
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              In real placement arenas, students connect from diverse campus Wi-Fi and mobile hotspots. To prevent local clock manipulation,
              <strong> the server is the sole authoritative referee</strong>.
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Authoritative Server Timestamps:</strong> Round start is recorded by the server at <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">roundStartTimeMs</code>.
              </li>
              <li>
                <strong>Grace Window Buffer:</strong> A 600ms network buffer is added to the round duration. Submissions sent right at zero seconds are not penalized by minor packet transit delay.
              </li>
              <li>
                <strong>Equalized RTT Consideration:</strong> Speed bonus is bounded between 0 and 500 ms using server receipt minus authoritative round start.
              </li>
            </ul>
          </div>

          {/* Anti-Cheating & Integrity */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Anti-Cheating Defenses
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <span><strong>Per-Player Option Shuffling:</strong> The server shuffles the order of options independently for each player. Whispering "Option B" to a student next to you fails because Option B is different on their device.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <span><strong>Zero Pre-Revealed Keys:</strong> Correct answer IDs and explanations never exist on the client browser until the round timer closes on the server. Inspecting network payloads yields no answers.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <span><strong>Cryptographic Session Tokens:</strong> Unique session tokens prevent impersonation. Duplicate submissions within a round are rejected authoritatively.</span>
              </div>
            </div>
          </div>

          {/* Reconnection */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-1.5 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-cyan-400" /> Seamless Reconnection
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If your Wi-Fi flickers or you accidentally refresh the tab, AptiQuiz automatically resumes your existing score, current round status, and question countdown without disturbing other participants.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
          >
            Understood, Let's Compete
          </button>
        </div>
      </div>
    </div>
  );
};
