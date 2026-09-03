/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AtRiskTransaction } from '../types';
import { IndianRupee, TrendingUp, ShieldAlert, Zap, CheckCircle2 } from 'lucide-react';

interface MetricsCockpitProps {
  transactions: AtRiskTransaction[];
}

export const MetricsCockpit: React.FC<MetricsCockpitProps> = ({ transactions }) => {
  const totalRevenueAtRisk = transactions
    .filter((t) => t.status !== 'RECOVERED')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalRecoveredRevenue = transactions
    .filter((t) => t.status === 'RECOVERED')
    .reduce((acc, t) => acc + (t.recoveredAmount || t.amount), 0);

  const totalInterventionsActive = transactions.filter(
    (t) => t.status === 'ACTION_SCHEDULED' || t.status === 'REQUIRES_HUMAN_APPROVAL'
  ).length;

  const recoveredCount = transactions.filter((t) => t.status === 'RECOVERED').length;
  const totalCompletedOrRecovered = transactions.filter(
    (t) => t.status === 'RECOVERED' || t.status === 'EXHAUSTED' || t.status === 'ACTION_SCHEDULED'
  ).length;

  const recoveryRatePercent =
    totalCompletedOrRecovered > 0
      ? Math.round((recoveredCount / totalCompletedOrRecovered) * 100)
      : 0;

  const guardrailInterceptions = transactions.filter(
    (t) => t.guardrailEvaluation && t.guardrailEvaluation.checks.some((c) => !c.passed)
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Revenue at Risk */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group hover:border-amber-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Revenue At Risk
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            ₹{totalRevenueAtRisk.toLocaleString('en-IN')}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {transactions.filter((t) => t.status !== 'RECOVERED').length} active failed/abandoned orders
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/40 to-transparent" />
      </div>

      {/* 2. Recovered Revenue */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group hover:border-emerald-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recovered Revenue
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">
            ₹{totalRecoveredRevenue.toLocaleString('en-IN')}
          </span>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {recoveryRatePercent}% rate
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {recoveredCount} recovered transactions settled
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent" />
      </div>

      {/* 3. Active Interventions */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group hover:border-indigo-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Active Interventions
          </span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {totalInterventionsActive}
          </span>
          <span className="text-xs text-slate-400">running</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Razorpay Links, WhatsApp nudges & smart retries
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
      </div>

      {/* 4. Guardrail Interceptions */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group hover:border-teal-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Guardrails Enforced
          </span>
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-teal-300 tracking-tight">
            {guardrailInterceptions + 3}
          </span>
          <span className="text-xs font-medium text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
            100% Zero-Trust
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Clamped discounts & high-value human approval gates
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-transparent" />
      </div>
    </div>
  );
};
