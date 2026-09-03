/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AtRiskTransaction, AIDiagnosisResult, GuardrailEvaluation } from '../types';
import {
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
  MessageSquare,
  Lock,
  UserCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  Bot,
  AlertCircle
} from 'lucide-react';

interface AgentInspectorModalProps {
  transaction: AtRiskTransaction | null;
  onClose: () => void;
  onDiagnose: (txn: AtRiskTransaction) => Promise<void>;
  onExecuteAction: (txn: AtRiskTransaction) => Promise<void>;
  onApproveHumanGate: (txn: AtRiskTransaction) => void;
  onSettlePayment: (txn: AtRiskTransaction) => void;
  isProcessing: boolean;
}

export const AgentInspectorModal: React.FC<AgentInspectorModalProps> = ({
  transaction,
  onClose,
  onDiagnose,
  onExecuteAction,
  onApproveHumanGate,
  onSettlePayment,
  isProcessing,
}) => {
  if (!transaction) return null;

  const [activeTab, setActiveTab] = useState<'COGNITION' | 'GUARDRAILS' | 'SIMULATOR'>('COGNITION');
  const [copiedLink, setCopiedLink] = useState(false);

  const diagnosis = transaction.diagnosis;
  const guardrails = transaction.guardrailEvaluation;
  const isHighValue = transaction.amount >= 50000;
  const needsHumanApproval = isHighValue && !transaction.humanApproved;

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Agent Inspector • {transaction.customerName}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {transaction.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {transaction.merchantName} • Amount: ₹{transaction.amount.toLocaleString('en-IN')} • {transaction.paymentMethod}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-close-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 4-Phase Progress Bar */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 grid grid-cols-4 gap-2 text-xs">
          {/* Phase 1 */}
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              1
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Detect</div>
              <div className="font-semibold text-slate-300 truncate">Webhook Ingested</div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="flex items-center space-x-2">
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                diagnosis ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'
              }`}
            >
              2
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Decide</div>
              <div className="font-semibold text-slate-300 truncate">
                {diagnosis ? `${diagnosis.recoveryProbability}% Prob.` : 'Pending AI'}
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="flex items-center space-x-2">
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                guardrails ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-500'
              }`}
            >
              3
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Guardrails</div>
              <div className="font-semibold text-slate-300 truncate">
                {needsHumanApproval ? 'Human Sign-off' : guardrails ? 'Passed (5/5)' : 'Awaiting'}
              </div>
            </div>
          </div>

          {/* Phase 4 */}
          <div className="flex items-center space-x-2">
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                transaction.status === 'RECOVERED'
                  ? 'bg-emerald-500 text-slate-950'
                  : transaction.status === 'ACTION_SCHEDULED'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              4
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Act</div>
              <div className="font-semibold text-slate-300 truncate">
                {transaction.status === 'RECOVERED'
                  ? 'Settled ₹'
                  : transaction.status === 'ACTION_SCHEDULED'
                  ? 'Link Active'
                  : 'Ready to Run'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 border-b border-slate-800 flex space-x-6 text-xs bg-slate-900">
          <button
            onClick={() => setActiveTab('COGNITION')}
            className={`py-3 font-semibold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'COGNITION'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Reasoning & Diagnosis</span>
          </button>

          <button
            onClick={() => setActiveTab('GUARDRAILS')}
            className={`py-3 font-semibold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'GUARDRAILS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Deterministic Guardrails ({guardrails ? guardrails.checks.length : 5})</span>
          </button>

          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`py-3 font-semibold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'SIMULATOR'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Simulated Delivery & Razorpay Link</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: COGNITION & DIAGNOSIS */}
          {activeTab === 'COGNITION' && (
            <div className="space-y-4">
              {/* Event Perception Summary */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Perception: Ingested Webhook Payload</span>
                  <span className="font-mono text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                    {transaction.gatewayErrorCode}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono bg-slate-900 p-2.5 rounded border border-slate-800">
                  {transaction.gatewayErrorMessage}
                </p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">Customer:</span>
                    <p className="font-medium text-slate-200">{transaction.customerName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Contact:</span>
                    <p className="font-medium text-slate-200">{transaction.customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Payment Rails:</span>
                    <p className="font-medium text-slate-200">{transaction.paymentMethod}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Retry Count:</span>
                    <p className="font-medium text-slate-200">
                      {transaction.retryCount} of {transaction.maxRetries}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnosis Details */}
              {!diagnosis ? (
                <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
                  <Sparkles className="h-8 w-8 text-emerald-400/50 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white mb-1">
                    AI Diagnosis Not Run Yet
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                    Trigger the Gemini Flash diagnostic model to analyze the failure root cause, compute recovery probability, and formulate a bounded intervention strategy.
                  </p>
                  <button
                    id="btn-run-diagnosis"
                    onClick={() => onDiagnose(transaction)}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isProcessing ? 'Agent Reasoning...' : 'Run AI Diagnosis Now'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Diagnosis Card */}
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                        <h4 className="text-sm font-bold text-indigo-200">
                          AI Root Cause Analysis & Prediction
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                          {diagnosis.recoveryProbability}% Recovery Probability
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                          {diagnosis.failureNature.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      {diagnosis.rootCauseSummary}
                    </p>

                    {/* Reasoning Chain */}
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-2">
                        Agent Reasoning Trace:
                      </div>
                      <ul className="space-y-1.5">
                        {diagnosis.reasoningChain.map((step, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-300 flex items-start space-x-2"
                          >
                            <span className="text-indigo-400 font-mono text-[11px]">
                              [{idx + 1}]
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Proposed Strategy Card */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Proposed Intervention Strategy
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        Channel: {diagnosis.proposedIntervention.channel}
                      </span>
                    </div>

                    <h5 className="text-sm font-bold text-white mb-1">
                      {diagnosis.proposedIntervention.title}
                    </h5>
                    <p className="text-xs text-slate-300 mb-3">
                      {diagnosis.proposedIntervention.description}
                    </p>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Drafted Message Copy:
                      </div>
                      <p className="text-slate-200 italic font-mono text-[11px]">
                        "{diagnosis.proposedIntervention.messageCopy}"
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <span>
                        Recommended Discount:{' '}
                        <strong className="text-emerald-400">
                          {diagnosis.proposedIntervention.recommendedDiscountPercent}%
                        </strong>
                      </span>
                      <span>
                        Fallback Plan:{' '}
                        <span className="text-slate-300">
                          {diagnosis.proposedIntervention.fallbackStrategy}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETERMINISTIC GUARDRAILS */}
          {activeTab === 'GUARDRAILS' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center space-x-2 mb-1 text-emerald-400 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Zero-Trust Financial Policy Engine</span>
                </div>
                <p>
                  Every AI recommendation is intercepted and verified by deterministic, hardcoded rules before any recovery action is dispatched. Unrestricted LLM execution is strictly prohibited.
                </p>
              </div>

              {/* High-Value Gate Notice if applicable */}
              {isHighValue && (
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    transaction.humanApproved
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold">
                        {transaction.humanApproved
                          ? 'Human-in-the-Loop Approval Granted'
                          : 'High-Value Safety Gate Active (Amount ≥ ₹50,000)'}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {transaction.humanApproved
                          ? 'Authorized by senior merchant operator. Autonomous execution unlocked.'
                          : 'Orders above ₹50,000 cannot be autonomously messaged or discounted without operator sign-off.'}
                      </p>
                    </div>
                  </div>

                  {!transaction.humanApproved ? (
                    <button
                      id="btn-approve-human-gate"
                      onClick={() => onApproveHumanGate(transaction)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shrink-0 shadow-lg shadow-rose-600/30"
                    >
                      Approve Order ₹{transaction.amount.toLocaleString('en-IN')}
                    </button>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/40 shrink-0">
                      Approved ✓
                    </span>
                  )}
                </div>
              )}

              {/* Guardrails Check List */}
              <div className="space-y-2.5">
                {guardrails?.checks.map((check) => (
                  <div
                    key={check.ruleId}
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
                      check.passed
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="mt-0.5">
                      {check.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{check.ruleName}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            check.passed
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {check.ruleId}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1">{check.reason}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center p-6 text-slate-500 text-xs">
                    Run AI Diagnosis to evaluate active guardrail policies against this transaction.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SIMULATED DELIVERY & RAZORPAY LINK */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-4">
              {/* WhatsApp / SMS Preview */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">
                      Simulated Customer Communication Channel
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                    WhatsApp Business API
                  </span>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="max-w-md mx-auto bg-emerald-950/40 p-4 rounded-2xl border border-emerald-800/40 text-xs shadow-lg">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400/80 mb-2 font-semibold">
                    <span>{transaction.merchantName} (Verified Merchant)</span>
                    <span className="text-slate-500">Just now</span>
                  </div>
                  <p className="text-slate-100 leading-relaxed">
                    {diagnosis?.proposedIntervention.messageCopy ||
                      `Hi ${transaction.customerName}, we noticed a glitch with your order of ₹${transaction.amount.toLocaleString('en-IN')}. Tap below to complete with 1-click:`}
                  </p>

                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white text-xs">
                        Razorpay Smart Checkout
                      </div>
                      <div className="text-[11px] text-emerald-300">
                        ₹{transaction.amount.toLocaleString('en-IN')} • Instant UPI / Card
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-[11px]">
                      Pay Now →
                    </span>
                  </div>
                </div>
              </div>

              {/* Razorpay Payment Link Emulator */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
                  <span>Generated Razorpay Recovery Link</span>
                  {transaction.simulatedPaymentLink && (
                    <button
                      onClick={() => handleCopyLink(transaction.simulatedPaymentLink!)}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      {copiedLink ? 'Copied to Clipboard!' : 'Copy Link'}
                    </button>
                  )}
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-300 truncate">
                    {transaction.simulatedPaymentLink ||
                      `https://rzp.io/i/plink_${transaction.id.replace('txn_', '')}`}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 ml-2">
                    Simulated Razorpay Link
                  </span>
                </div>
              </div>

              {/* Simulate Successful Customer Payment Settlement */}
              {transaction.status !== 'RECOVERED' && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      Customer Simulation: Customer Completes Payment
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Simulate the customer opening the recovery link and settling the payment on Razorpay.
                    </p>
                  </div>
                  <button
                    id="btn-settle-payment"
                    onClick={() => onSettlePayment(transaction)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition shrink-0"
                  >
                    Simulate Payment Success (₹{transaction.amount.toLocaleString('en-IN')})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Current State:{' '}
            <strong className="text-white font-mono">{transaction.status}</strong>
          </div>

          <div className="flex items-center space-x-2">
            {!diagnosis ? (
              <button
                id="btn-footer-diagnose"
                onClick={() => onDiagnose(transaction)}
                disabled={isProcessing}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-600/20"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isProcessing ? 'Agent Working...' : 'Run AI Diagnosis'}</span>
              </button>
            ) : transaction.status !== 'RECOVERED' && transaction.status !== 'ACTION_SCHEDULED' ? (
              <button
                id="btn-footer-execute"
                onClick={() => onExecuteAction(transaction)}
                disabled={isProcessing || needsHumanApproval}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  needsHumanApproval
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20'
                }`}
              >
                <Send className="h-4 w-4" />
                <span>
                  {needsHumanApproval
                    ? 'Approval Required First'
                    : 'Execute Bounded Recovery Action'}
                </span>
              </button>
            ) : transaction.status === 'RECOVERED' ? (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Revenue Successfully Recovered</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold">
                <Clock className="h-4 w-4 text-sky-400" />
                <span>Intervention Dispatched & Monitored</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
