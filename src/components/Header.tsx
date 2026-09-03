/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, BookOpen, Activity, Sparkles, PlusCircle } from 'lucide-react';

interface HeaderProps {
  onOpenAuditLogs: () => void;
  onOpenLearningHub: () => void;
  onOpenCustomInjector: () => void;
  auditCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuditLogs,
  onOpenLearningHub,
  onOpenCustomInjector,
  auditCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Track Info */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  RecoverAI
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Razorpay Buildathon 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI Revenue Recovery Agent • Zero-Trust Guardrails
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center space-x-3">
            <button
              id="btn-learning-hub"
              onClick={onOpenLearningHub}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-medium transition"
            >
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span className="hidden sm:inline">First-Principles Guide</span>
            </button>

            <button
              id="btn-inject-failure"
              onClick={onOpenCustomInjector}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <PlusCircle className="h-4 w-4 text-teal-400" />
              <span className="hidden sm:inline">Simulate Failure</span>
            </button>

            <button
              id="btn-view-audit-logs"
              onClick={onOpenAuditLogs}
              className="relative flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Audit Trail</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-[10px] font-bold text-emerald-200">
                {auditCount}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
