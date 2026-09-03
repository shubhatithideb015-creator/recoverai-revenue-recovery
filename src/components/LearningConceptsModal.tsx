/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookOpen, CheckCircle2, ShieldCheck, Zap, HelpCircle } from 'lucide-react';

interface LearningConceptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONCEPTS = [
  {
    id: 1,
    title: '1. Revenue & Revenue Leakage',
    summary: 'Revenue is earned top-line funds; revenue leakage is the unintended loss of captured/ready funds due to payment friction, gateway dropouts, or expired mandates.',
    fintechExample: 'A SaaS subscriber’s card expires; payment fails and MRR drops unnoticed.',
  },
  {
    id: 2,
    title: '2. Failed Payments (Soft vs. Hard Declines)',
    summary: 'Soft declines (network timeout, OTP delay) are transient and retryable. Hard declines (expired card, stolen card flag) are terminal and require an alternate payment method.',
    fintechExample: 'NPCI UPI switch timeout (Soft) vs. Expired Debit Card (Hard).',
  },
  {
    id: 3,
    title: '3. Involuntary Churn vs. Voluntary Churn',
    summary: 'Involuntary churn happens when a loyal customer loses access solely due to a passive payment instrument failure, making it the highest-ROI revenue to recover.',
    fintechExample: 'Spotify auto-debit fails when customer changes bank card.',
  },
  {
    id: 4,
    title: '4. Revenue at Risk',
    summary: 'The estimated monetary sum of all failed, delinquent, or abandoned transactions currently in an unrecovered state awaiting intervention.',
    fintechExample: '₹4,20,000 in failed checkouts accumulated over the last 24 hours.',
  },
  {
    id: 5,
    title: '5. The AI Agent Cognitive Cycle: Detect → Decide → Act',
    summary: 'Autonomous 3-stage loop: Ingest webhook events (Detect) → Analyze context, predict probability & formulate intervention (Decide) → Dispatch bounded tool calls (Act).',
    fintechExample: 'Ingest UPI timeout → Select WhatsApp link + 5% discount → Generate Razorpay link.',
  },
  {
    id: 6,
    title: '6. Zero-Trust AI Safety & Guardrails',
    summary: 'LLMs are probabilistic and must NEVER have unchecked financial authority. Deterministic guardrails enforce discount ceilings (≤15%), anti-spam caps (≤2/day), and circuit breakers (≤3 retries).',
    fintechExample: 'Preventing prompt injections or hallucinations from issuing 90% discounts.',
  },
  {
    id: 7,
    title: '7. Human-in-the-Loop High-Value Safety Gates',
    summary: 'High-value transactions (e.g. ≥ ₹50,000) must pause autonomous execution and require verified human operator sign-off.',
    fintechExample: 'An enterprise ₹1,20,000 invoice recovery requires account manager approval.',
  },
  {
    id: 8,
    title: '8. Immutable Audit Trail & Stopping Rules',
    summary: 'Every reasoning trace, policy check, and action is logged into a tamper-evident audit record. Stopping rules break infinite retry loops after 3 attempts.',
    fintechExample: 'Recording full trace ID and JSON payload for compliance and dispute review.',
  },
];

export const LearningConceptsModal: React.FC<LearningConceptsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                RecoverAI First-Principles Handbook (Day 1 & Day 2)
              </h3>
              <p className="text-xs text-slate-400">
                Core Fintech, AI Agent Safety & Revenue Recovery Mechanics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-indigo-200">
            <div className="font-bold mb-1 flex items-center space-x-1.5 text-indigo-300">
              <Zap className="h-4 w-4 text-indigo-400" />
              <span>Razorpay AI Buildathon 2026 • AI Revenue Recovery Track</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              This interactive reference summarizes the first-principles engineering foundations of RecoverAI. Every module in the live dashboard directly maps to one of these core concepts.
            </p>
          </div>

          <div className="space-y-3">
            {CONCEPTS.map((concept) => (
              <div
                key={concept.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
              >
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>{concept.title}</span>
                </h4>
                <p className="text-slate-300 leading-relaxed mb-2">
                  {concept.summary}
                </p>
                <div className="p-2 bg-slate-900 rounded border border-slate-800/80 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Fintech Context:</strong> {concept.fintechExample}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
