/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AtRiskTransaction } from '../types';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
  Terminal,
  Cpu,
  Shield,
  Play,
  Check,
} from 'lucide-react';

interface AgentDrawerProps {
  transaction: AtRiskTransaction | null;
  onClose: () => void;
  onDiagnose: (txn: AtRiskTransaction) => void;
  onExecuteAction: (txn: AtRiskTransaction) => void;
  onApproveHumanGate: (txn: AtRiskTransaction) => void;
  onSettlePayment: (txn: AtRiskTransaction) => void;
  isProcessing: boolean;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  transaction,
  onClose,
  onDiagnose,
  onExecuteAction,
  onApproveHumanGate,
  onSettlePayment,
  isProcessing,
}) => {
  if (!transaction) return null;

  const isHighValue = transaction.amount >= 50000;
  const isHumanApproved = !!transaction.humanApproved;
  const isActionDispatched =
    transaction.status === 'ACTION_SCHEDULED' ||
    transaction.status === 'EXECUTING_RECOVERY' ||
    transaction.status === 'RECOVERED';
  const isRecovered = transaction.status === 'RECOVERED';

  // Format timestamp safely for forensic payload
  const rawDate = transaction.createdAt || transaction.lastAttemptAt;
  const formattedTimestamp = (() => {
    try {
      if (!rawDate) return new Date().toISOString();
      const parsed = new Date(rawDate);
      return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    } catch {
      return new Date().toISOString();
    }
  })();
  const traceId = `trc_${transaction.id.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div
      id="agent-inspector-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-[#0e0e0e]/85 flex justify-end animate-in fade-in duration-150 select-none"
    >
      <div
        id="agent-inspector-blade"
        className="w-full max-w-2xl bg-[#141313] border-l border-[#2b2a2a] h-full flex flex-col shadow-2xl overflow-hidden font-hanken"
      >
        {/* ========================================================================= */}
        {/* TOP BRAND BAR (STITCH COMPLIANT)                                          */}
        {/* ========================================================================= */}
        <div className="px-6 py-3 border-b border-[#2b2a2a] bg-[#0e0e0e] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-[#ffffff] text-[#0e0e0e] flex items-center justify-center font-jetbrains font-black text-[9px]">
                R
              </div>
              <span className="font-jetbrains text-xs font-bold tracking-[0.2em] text-[#ffffff] uppercase">
                RECOVERAI
              </span>
            </div>
            <div className="hidden sm:flex items-center space-x-4 font-jetbrains text-[10px] text-[#8e9192] tracking-wider">
              <span className="text-[#8e9192]">COMMAND</span>
              <span className="text-[#8e9192]">ANALYSIS</span>
              <span className="text-[#8e9192]">GUARDRAILS</span>
              <span className="text-[#ffffff] border-b border-[#ffffff] pb-0.5">INSPECTOR</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="font-jetbrains text-[9px] text-[#8e9192] hidden sm:inline-block">
              SYSTEM OPERATOR
            </span>
            <button
              id="btn-close-inspector"
              onClick={onClose}
              className="p-1 text-[#8e9192] hover:text-[#ffffff] hover:bg-[#1c1b1b] border border-transparent hover:border-[#2b2a2a] transition cursor-pointer"
              title="Close Inspector"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. HEADER SECTION                                                         */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-8 border-b border-[#2b2a2a] bg-[#141313] flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-3.5 w-3.5 text-[#8e9192]" />
              <span className="font-jetbrains text-[10px] font-bold tracking-[0.15em] text-[#8e9192] uppercase">
                AI RECOVERY AGENT INSPECTOR
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-jetbrains text-[10px] font-bold text-[#8e9192] uppercase">
                FAILURE ID:
              </span>
              <span className="font-jetbrains text-[11px] font-bold px-2 py-0.5 bg-[#1c1b1b] border border-[#2b2a2a] text-[#ffffff]">
                {transaction.id}
              </span>
            </div>
          </div>

          {/* Large Typographic Financial Display Amount */}
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <div className="font-jetbrains text-[9px] text-[#8e9192] uppercase tracking-wider">
                TRANSACTION AMOUNT
              </div>
              <h1 className="font-garamond text-4xl sm:text-5xl font-medium tracking-tight text-[#ffffff] mt-0.5">
                ₹{transaction.amount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h1>
            </div>

            <div className="text-right">
              <div className="font-jetbrains text-[9px] text-[#8e9192] uppercase tracking-wider">
                CUSTOMER &amp; PAYMENT RAIL
              </div>
              <div className="font-jetbrains text-xs text-[#ffffff] font-medium mt-0.5">
                {transaction.customerName}
              </div>
              <div className="font-jetbrains text-[10px] text-[#8e9192]">
                {transaction.paymentMethod} • {transaction.customerTier}
              </div>
            </div>
          </div>

          {/* Forensic Diagnostic Metadata Badges Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#2b2a2a]/80 font-jetbrains text-[10px]">
            <div className="p-2 bg-[#0e0e0e] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">GATEWAY ERROR</div>
              <div className="text-[#ffb4ab] font-bold mt-0.5 truncate" title={transaction.gatewayErrorCode}>
                {transaction.gatewayErrorCode}
              </div>
            </div>

            <div className="p-2 bg-[#0e0e0e] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">FAILURE TAXONOMY</div>
              <div className="text-[#ffffff] font-bold mt-0.5 truncate" title={transaction.diagnosis?.failureNature || transaction.failureCategory}>
                {transaction.diagnosis?.failureNature || transaction.failureCategory}
              </div>
            </div>

            <div className="p-2 bg-[#0e0e0e] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">AI WIN PROBABILITY</div>
              <div className="mt-0.5 font-bold">
                {transaction.diagnosis ? (
                  <span className={transaction.diagnosis.recoveryProbability >= 70 ? 'text-[#4edea3]' : transaction.diagnosis.recoveryProbability >= 40 ? 'text-[#f59e0b]' : 'text-[#ffb4ab]'}>
                    {transaction.diagnosis.recoveryProbability}%
                  </span>
                ) : (
                  <span className="text-[#8e9192]">PENDING</span>
                )}
              </div>
            </div>

            <div className="p-2 bg-[#0e0e0e] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">CONFIDENCE LEVEL</div>
              <div className="text-[#ffffff] font-bold mt-0.5 uppercase">
                {transaction.diagnosis ? transaction.diagnosis.urgencyLevel : 'UNRATED'}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. THE 5-STAGE VERTICAL DECISION PIPELINE (DETECT -> RECOVERED)          */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-[#141313]">
          
          {/* --------------------------------------------------------------------- */}
          {/* 1. DETECT (Event Ingestion & Metadata)                                */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative flex items-start space-x-4">
            {/* Left Connecting Node */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-[#1c1b1b] border border-[#2b2a2a] flex items-center justify-center text-[#e6e1e1] flex-shrink-0">
                <Terminal className="h-4 w-4 text-[#8e9192]" />
              </div>
              <div className="w-[1px] h-full min-h-[140px] bg-[#2b2a2a] mt-2" />
            </div>

            {/* Stage Body */}
            <div className="flex-1 space-y-2 pb-6">
              <div>
                <h3 className="font-garamond text-xl font-normal text-[#ffffff]">Detect</h3>
                <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase">
                  EVENT INGESTION &amp; METADATA
                </div>
              </div>

              {/* Raw Monospace Evidence Block */}
              <div className="p-4 bg-[#0e0e0e] border border-[#2b2a2a] font-jetbrains text-[11px] leading-relaxed text-[#c4c7c5] space-y-1 select-text">
                <div className="text-[#8e9192]">
                  &gt; [{formattedTimestamp}] EVENT: WEBHOOK_RECEIVED
                </div>
                <div>&gt; PARSING PAYLOAD... <span className="text-[#4edea3]">OK</span></div>
                <div className="text-[#8e9192] pt-1">&gt; EXTRACTING METADATA:</div>
                <div className="pl-4 space-y-0.5 text-[#e6e1e1]">
                  <div>CUSTOMER_ID: <span className="text-[#ffffff]">{transaction.customerId}</span> ({transaction.customerTier})</div>
                  <div>GATEWAY: <span className="text-[#ffffff]">RAZORPAY_INDIA</span></div>
                  <div>ATTEMPT_COUNT: <span className="text-[#ffffff]">{transaction.retryCount} / {transaction.maxRetries}</span></div>
                  <div>ERROR_CODE: <span className="text-[#ffb4ab]">{transaction.gatewayErrorCode}</span></div>
                  <div>MERCHANT: <span className="text-[#ffffff]">{transaction.merchantName}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 2. DECIDE (AI Intelligence Layer)                                     */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative flex items-start space-x-4">
            {/* Left Connecting Node */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-[#1c1b1b] border border-[#2b2a2a] flex items-center justify-center text-[#e6e1e1] flex-shrink-0">
                <Cpu className="h-4 w-4 text-[#8e9192]" />
              </div>
              <div className="w-[1px] h-full min-h-[140px] bg-[#2b2a2a] mt-2" />
            </div>

            {/* Stage Body */}
            <div className="flex-1 space-y-2 pb-6">
              <div>
                <h3 className="font-garamond text-2xl font-normal text-[#ffffff]">Decide</h3>
                <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase">
                  AI INTELLIGENCE LAYER
                </div>
              </div>

              {!transaction.diagnosis ? (
                /* Unformulated State -> Action to run Gemini */
                <div className="p-6 bg-[#0e0e0e] border border-dashed border-[#2b2a2a] text-center space-y-3">
                  <div className="font-garamond text-lg text-[#ffffff]">
                    No AI Diagnosis Formulated
                  </div>
                  <p className="font-hanken text-[12px] text-[#8e9192] max-w-sm mx-auto">
                    Engage Gemini Flash to classify root cause, formulate cognitive reasoning, and generate recovery strategy.
                  </p>
                  <button
                    id="btn-run-diagnosis"
                    onClick={() => onDiagnose(transaction)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains text-[10px] font-bold tracking-widest uppercase transition disabled:opacity-50 inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isProcessing ? 'ANALYZING...' : 'RUN GEMINI DIAGNOSIS'}</span>
                  </button>
                </div>
              ) : (
                /* Formulated AI Box closely matching Stitch */
                <div className="p-5 bg-[#0e0e0e] border border-[#2b2a2a] space-y-4">
                  {/* Top Row: Probability Anchor & Recommendation Block */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-jetbrains text-[10px] font-bold text-[#8e9192] uppercase tracking-wider">
                        RECOVERY PROBABILITY
                      </div>
                      <div
                        className={`font-garamond text-5xl font-medium tracking-tight mt-1 ${
                          transaction.diagnosis.recoveryProbability >= 70
                            ? 'text-[#4edea3]'
                            : transaction.diagnosis.recoveryProbability >= 40
                            ? 'text-[#f59e0b]'
                            : 'text-[#ffb4ab]'
                        }`}
                      >
                        {transaction.diagnosis.recoveryProbability}%
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <div className="font-jetbrains text-[10px] font-bold text-[#8e9192] uppercase tracking-wider mb-1.5">
                        RECOMMENDATION
                      </div>
                      <div className="font-jetbrains text-[11px] font-medium px-3 py-1.5 bg-[#1c1b1b] border border-[#2b2a2a] text-[#4edea3] text-left">
                        {transaction.diagnosis.proposedIntervention.title ||
                          `${transaction.diagnosis.proposedIntervention.channel}: Smart Retry`}
                      </div>
                    </div>
                  </div>

                  {/* Reasoning Engine Narrative */}
                  <div className="pt-3.5 border-t border-[#2b2a2a] space-y-1.5">
                    <div className="font-jetbrains text-[10px] font-bold text-[#8e9192] uppercase tracking-wider">
                      REASONING ENGINE
                    </div>
                    <p className="font-hanken text-[13px] text-[#c4c7c5] leading-relaxed">
                      {transaction.diagnosis.rootCauseSummary}
                    </p>

                    {/* Step-by-step diagnostic chain */}
                    {transaction.diagnosis.reasoningChain && transaction.diagnosis.reasoningChain.length > 0 && (
                      <ul className="pt-2 space-y-1 border-t border-[#2b2a2a]/60">
                        {transaction.diagnosis.reasoningChain.map((step, idx) => (
                          <li key={idx} className="font-jetbrains text-[11px] text-[#8e9192] flex items-start space-x-2">
                            <span className="text-[#4edea3]">&gt;</span>
                            <span className="text-[#c4c7c5]">{step}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 3. GUARDRAILS (Zero-Trust Policy Engine)                              */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative flex items-start space-x-4">
            {/* Left Connecting Node */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-[#1c1b1b] border border-[#2b2a2a] flex items-center justify-center text-[#e6e1e1] flex-shrink-0">
                <Shield className="h-4 w-4 text-[#8e9192]" />
              </div>
              <div className="w-[1px] h-full min-h-[160px] bg-[#2b2a2a] mt-2" />
            </div>

            {/* Stage Body */}
            <div className="flex-1 space-y-2.5 pb-6">
              <div>
                <h3 className="font-garamond text-2xl font-normal text-[#ffffff]">Guardrails</h3>
                <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase flex items-center space-x-2">
                  <span>ZERO-TRUST POLICY ENGINE</span>
                  <span className="text-[#2b2a2a]">|</span>
                  <span className="text-[#8e9192]/80">AI PROPOSES → EVALUATE → DECISION</span>
                </div>
              </div>

              {/* High-Value Gate Warning & Operator Sign-off Callout */}
              {isHighValue && !isHumanApproved && (
                <div className="p-4 bg-[#1c1b1b] border border-[#f59e0b]/60 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[#f59e0b]">
                      <AlertTriangle className="h-4 w-4 text-[#f59e0b] flex-shrink-0" />
                      <span className="font-jetbrains text-[11px] font-bold uppercase tracking-wider">
                        HUMAN REVIEW REQUIRED (₹{transaction.amount.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <span className="font-jetbrains text-[9px] font-bold px-2 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
                      GATED
                    </span>
                  </div>
                  <p className="font-hanken text-[12px] text-[#c4c7c5] leading-relaxed">
                    Order amount exceeds ₹50,000 threshold (`GR-HIGH-VALUE-HUMAN-GATE`). Policy engine holds autonomous dispatch until verified by system operator.
                  </p>
                  <button
                    id="btn-approve-human-gate"
                    onClick={() => onApproveHumanGate(transaction)}
                    className="w-full sm:w-auto px-4 py-2 bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-[#0e0e0e] font-jetbrains text-[10px] font-bold tracking-widest uppercase transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>AUTHORIZE HIGH-VALUE SIGN-OFF</span>
                  </button>
                </div>
              )}

              {/* Dense Deterministic Policy Check List */}
              <div className="border border-[#2b2a2a] divide-y divide-[#2b2a2a] bg-[#0e0e0e]">
                {/* Rule 1: Max Retries / Retry Frequency */}
                <div className="p-3 flex items-center justify-between hover:bg-[#141313] transition">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#4edea3] flex-shrink-0" />
                    <span className="font-jetbrains text-[11px] text-[#e6e1e1]">
                      Max Retries Policy (Limit: {transaction.maxRetries})
                    </span>
                  </div>
                  <span className="font-jetbrains text-[10px] font-bold text-[#4edea3] uppercase">
                    PASS ({transaction.retryCount}/{transaction.maxRetries})
                  </span>
                </div>

                {/* Rule 2: Amount Threshold / High-Value Gate */}
                <div className="p-3 flex items-center justify-between hover:bg-[#141313] transition">
                  <div className="flex items-center space-x-2.5">
                    {isHighValue && !isHumanApproved ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b] flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#4edea3] flex-shrink-0" />
                    )}
                    <span className="font-jetbrains text-[11px] text-[#e6e1e1]">
                      Amount Threshold (Max: ₹50,000)
                    </span>
                  </div>
                  <span
                    className={`font-jetbrains text-[10px] font-bold uppercase ${
                      isHighValue && !isHumanApproved
                        ? 'text-[#f59e0b]'
                        : isHighValue && isHumanApproved
                        ? 'text-[#4edea3]'
                        : 'text-[#4edea3]'
                    }`}
                  >
                    {isHighValue
                      ? isHumanApproved
                        ? `PASS (APPROVED ₹${transaction.amount.toLocaleString('en-IN')})`
                        : `HUMAN REVIEW (₹${transaction.amount.toLocaleString('en-IN')})`
                      : `PASS (VERIFIED ₹${transaction.amount.toLocaleString('en-IN')})`}
                  </span>
                </div>

                {/* Rule 3: Terminal Decline Protection */}
                <div className="p-3 flex items-center justify-between hover:bg-[#141313] transition">
                  <div className="flex items-center space-x-2.5">
                    {transaction.failureCategory === 'HARD_DECLINE_CARD_EXPIRED' &&
                    transaction.diagnosis?.proposedIntervention.type === 'SMART_RETRY_SCHEDULE' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-[#ffb4ab] flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#4edea3] flex-shrink-0" />
                    )}
                    <span className="font-jetbrains text-[11px] text-[#e6e1e1]">
                      Terminal Decline Protection
                    </span>
                  </div>
                  <span
                    className={`font-jetbrains text-[10px] font-bold uppercase ${
                      transaction.failureCategory === 'HARD_DECLINE_CARD_EXPIRED' &&
                      transaction.diagnosis?.proposedIntervention.type === 'SMART_RETRY_SCHEDULE'
                        ? 'text-[#ffb4ab]'
                        : 'text-[#4edea3]'
                    }`}
                  >
                    {transaction.failureCategory === 'HARD_DECLINE_CARD_EXPIRED' &&
                    transaction.diagnosis?.proposedIntervention.type === 'SMART_RETRY_SCHEDULE'
                      ? 'BLOCK (TERMINAL CARD)'
                      : 'PASS (CLEAR)'}
                  </span>
                </div>

                {/* Rule 4: Discount Ceiling (Max 15%) */}
                <div className="p-3 flex items-center justify-between hover:bg-[#141313] transition">
                  <div className="flex items-center space-x-2.5">
                    {(transaction.diagnosis?.proposedIntervention.recommendedDiscountPercent || 0) > 15 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-[#ffb4ab] flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#4edea3] flex-shrink-0" />
                    )}
                    <span className="font-jetbrains text-[11px] text-[#e6e1e1]">
                      Discount Ceiling Policy (Max: 15%)
                    </span>
                  </div>
                  <span
                    className={`font-jetbrains text-[10px] font-bold uppercase ${
                      (transaction.diagnosis?.proposedIntervention.recommendedDiscountPercent || 0) > 15
                        ? 'text-[#ffb4ab]'
                        : 'text-[#4edea3]'
                    }`}
                  >
                    {(transaction.diagnosis?.proposedIntervention.recommendedDiscountPercent || 0) > 15
                      ? 'BLOCK (CLAMPED)'
                      : `PASS (${transaction.diagnosis?.proposedIntervention.recommendedDiscountPercent || 0}%)`}
                  </span>
                </div>

                {/* Rule 5: Circuit Breaker */}
                <div className="p-3 flex items-center justify-between hover:bg-[#141313] transition">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#4edea3] flex-shrink-0" />
                    <span className="font-jetbrains text-[11px] text-[#e6e1e1]">
                      Autonomous Circuit Breaker
                    </span>
                  </div>
                  <span className="font-jetbrains text-[10px] font-bold text-[#4edea3] uppercase">
                    PASS (HEALTHY)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 4. ACT (Execution Routing)                                            */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative flex items-start space-x-4">
            {/* Left Connecting Node */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-[#1c1b1b] border border-[#2b2a2a] flex items-center justify-center text-[#e6e1e1] flex-shrink-0">
                <Play className="h-3.5 w-3.5 text-[#8e9192] fill-current" />
              </div>
              <div className="w-[1px] h-full min-h-[120px] bg-[#2b2a2a] mt-2" />
            </div>

            {/* Stage Body */}
            <div className="flex-1 space-y-2.5 pb-6">
              <div>
                <h3 className="font-garamond text-2xl font-normal text-[#ffffff]">Act</h3>
                <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase">
                  EXECUTION ROUTING
                </div>
              </div>

              {/* Execution Routing Technical Table */}
              <div className="bg-[#0e0e0e] border border-[#2b2a2a]">
                <div className="grid grid-cols-3 gap-2 p-3 border-b border-[#2b2a2a] text-left">
                  <div>
                    <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                      ACTION
                    </div>
                    <div className="font-jetbrains text-[11px] font-medium text-[#ffffff] mt-1 truncate">
                      {transaction.diagnosis?.proposedIntervention.title || 'Scheduled Smart Retry'}
                    </div>
                  </div>

                  <div>
                    <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                      ROUTING
                    </div>
                    <div className="font-jetbrains text-[11px] font-medium text-[#ffffff] mt-1 truncate">
                      Primary Gateway (Razorpay)
                    </div>
                  </div>

                  <div>
                    <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                      STATUS
                    </div>
                    <div className="font-jetbrains text-[11px] font-bold mt-1">
                      {isRecovered ? (
                        <span className="text-[#4edea3]">EXECUTED</span>
                      ) : isActionDispatched ? (
                        <span className="text-[#4edea3]">DISPATCHED</span>
                      ) : isHighValue && !isHumanApproved ? (
                        <span className="text-[#f59e0b]">BLOCKED (GATED)</span>
                      ) : (
                        <span className="text-[#8e9192]">PENDING EXECUTION</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dispatch Trigger CTA or Active Link */}
                <div className="p-3">
                  {!isActionDispatched ? (
                    <button
                      id="btn-dispatch-action"
                      onClick={() => onExecuteAction(transaction)}
                      disabled={!transaction.diagnosis || (isHighValue && !isHumanApproved) || isProcessing}
                      className="w-full py-2.5 px-4 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains text-[10px] font-bold tracking-widest uppercase transition disabled:opacity-30 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isProcessing ? 'DISPATCHING...' : 'DISPATCH RECOVERY ACTION'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-2 bg-[#141313] border border-[#2b2a2a] font-jetbrains text-[11px]">
                      <div className="flex items-center space-x-2 text-[#4edea3] truncate">
                        <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {transaction.simulatedPaymentLink || `https://rzp.io/i/recov_${transaction.id.replace(/[^a-zA-Z0-9]/g, '')}`}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-[#8e9192] flex-shrink-0 ml-2" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 5. RECOVERED (Final Result)                                           */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative flex items-start space-x-4">
            {/* Left Connecting Node */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 border flex items-center justify-center flex-shrink-0 ${
                  isRecovered
                    ? 'bg-[#4edea3]/20 border-[#4edea3] text-[#4edea3]'
                    : 'bg-[#1c1b1b] border-[#2b2a2a] text-[#8e9192]'
                }`}
              >
                <Check className="h-4 w-4" />
              </div>
            </div>

            {/* Stage Body */}
            <div className="flex-1 space-y-2.5">
              <div>
                <h3 className={`font-garamond text-2xl font-normal ${isRecovered ? 'text-[#ffffff]' : 'text-[#8e9192]'}`}>
                  Recovered
                </h3>
                <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase">
                  FINAL RESULT
                </div>
              </div>

              {/* Settlement Technical Block */}
              <div
                className={`border bg-[#0e0e0e] ${
                  isRecovered ? 'border-[#4edea3]/40' : 'border-[#2b2a2a]'
                }`}
              >
                <div className="grid grid-cols-2 divide-x divide-[#2b2a2a] p-4 border-b border-[#2b2a2a]">
                  <div>
                    <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                      STATUS
                    </div>
                    <div className="font-jetbrains text-[12px] font-bold mt-1">
                      {isRecovered ? (
                        <span className="text-[#4edea3]">RECOVERED</span>
                      ) : isActionDispatched ? (
                        <span className="text-[#ffffff]">AWAITING SETTLEMENT</span>
                      ) : (
                        <span className="text-[#8e9192]">PENDING ACTION</span>
                      )}
                    </div>
                  </div>

                  <div className="pl-4">
                    <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                      AMOUNT
                    </div>
                    <div className="font-garamond text-2xl sm:text-3xl font-medium tracking-tight text-[#ffffff] mt-0.5">
                      {isRecovered
                        ? `₹${(transaction.recoveredAmount || transaction.amount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : `₹0.00`}
                    </div>
                  </div>
                </div>

                <div className="p-4 text-center">
                  {!isRecovered ? (
                    <div className="space-y-2">
                      <button
                        id="btn-simulate-settlement"
                        onClick={() => onSettlePayment(transaction)}
                        disabled={!isActionDispatched || isProcessing}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains text-[10px] font-bold tracking-widest uppercase transition disabled:opacity-30 inline-flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          SIMULATE SETTLEMENT (₹{transaction.amount.toLocaleString('en-IN')})
                        </span>
                      </button>
                      <p className="font-jetbrains text-[9px] text-[#8e9192]">
                        {isActionDispatched
                          ? 'Simulates customer payment completion via 1-click link on device.'
                          : 'Dispatch recovery action above to enable settlement.'}
                      </p>
                    </div>
                  ) : (
                    <div className="font-jetbrains text-[11px] text-[#4edea3] flex items-center justify-center space-x-2 py-1">
                      <Check className="h-3.5 w-3.5" />
                      <span className="tracking-wider uppercase">LEDGER SYNCHRONIZED &amp; CREDITED</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. FORENSIC FOOTER CONTROLS                                               */}
        {/* ========================================================================= */}
        <div className="p-4 border-t border-[#2b2a2a] bg-[#0e0e0e] flex items-center justify-between text-xs font-jetbrains text-[#8e9192] flex-shrink-0">
          <span>TRACE ID: {traceId}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#1c1b1b] hover:bg-[#2b2a2a] border border-[#2b2a2a] text-[#e6e1e1] font-jetbrains text-[10px] uppercase tracking-wider transition cursor-pointer"
          >
            CLOSE INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
};
