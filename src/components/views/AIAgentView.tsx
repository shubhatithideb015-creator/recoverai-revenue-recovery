/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AtRiskTransaction, AIDiagnosisResult } from '../../types';
import {
  Cpu,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Activity,
  Terminal,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  CreditCard,
  Building,
} from 'lucide-react';

interface AIAgentViewProps {
  transactions: AtRiskTransaction[];
  onSelectTransaction: (txn: AtRiskTransaction) => void;
  onRunBatchDiagnose: () => void;
  onDiagnoseTransaction?: (txn: AtRiskTransaction) => void;
  isDiagnosingBatch: boolean;
  isProcessing?: boolean;
}

export const AIAgentView: React.FC<AIAgentViewProps> = ({
  transactions,
  onSelectTransaction,
  onRunBatchDiagnose,
  onDiagnoseTransaction,
  isDiagnosingBatch,
  isProcessing = false,
}) => {
  const diagnosedTxns = useMemo(
    () => transactions.filter((t) => t.diagnosis),
    [transactions]
  );

  const [activeTraceId, setActiveTraceId] = useState<string | null>(() => {
    return diagnosedTxns.length > 0 ? diagnosedTxns[0].id : transactions.length > 0 ? transactions[0].id : null;
  });

  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('ALL');

  // Selected trace transaction
  const activeTraceTxn = useMemo(() => {
    if (!activeTraceId) return diagnosedTxns[0] || transactions[0] || null;
    return (
      transactions.find(
        (t) => t.id === activeTraceId || t.transactionId === activeTraceId
      ) ||
      diagnosedTxns[0] ||
      transactions[0] ||
      null
    );
  }, [activeTraceId, transactions, diagnosedTxns]);

  // Telemetry Metrics
  const metrics = useMemo(() => {
    const totalAnalyzed = diagnosedTxns.length;
    const totalCount = transactions.length;
    const avgWinProb =
      totalAnalyzed > 0
        ? Math.round(
            diagnosedTxns.reduce(
              (acc, t) => acc + (t.diagnosis?.recoveryProbability || 0),
              0
            ) / totalAnalyzed
          )
        : 0;

    const recoverableRevenue = transactions
      .filter((t) => (t.diagnosis?.recoveryProbability || 0) >= 50)
      .reduce((acc, t) => acc + t.amount, 0);

    const activeFormulations = diagnosedTxns.filter(
      (t) => t.status !== 'RECOVERED' && t.status !== 'EXHAUSTED'
    ).length;

    const undiagnosedCount = transactions.filter((t) => !t.diagnosis).length;

    return {
      totalAnalyzed,
      totalCount,
      avgWinProb,
      recoverableRevenue,
      activeFormulations,
      undiagnosedCount,
    };
  }, [transactions, diagnosedTxns]);

  // Root Cause Taxonomy Analysis Breakdown
  const taxonomyStats = useMemo(() => {
    const categories: Record<
      string,
      {
        code: string;
        title: string;
        description: string;
        count: number;
        volume: number;
        avgProb: number;
        primaryStrategy: string;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'TERMINAL';
      }
    > = {
      TRANSIENT_SOFT_DECLINE: {
        code: 'TRANSIENT_SOFT_DECLINE',
        title: 'Transient Soft Decline',
        description: 'Temporary bank gateway timeouts, switch throttling, and network latency drops.',
        count: 0,
        volume: 0,
        avgProb: 0,
        primaryStrategy: 'Dynamic Gateway Switch & Off-Peak Smart Retry',
        riskLevel: 'LOW',
      },
      TERMINAL_HARD_DECLINE: {
        code: 'TERMINAL_HARD_DECLINE',
        title: 'Terminal Hard Decline',
        description: 'Permanently expired card, closed bank accounts, and hard issuer rejections.',
        count: 0,
        volume: 0,
        avgProb: 0,
        primaryStrategy: 'Zero-Retry Policy + Instant Payment Method Update Link',
        riskLevel: 'TERMINAL',
      },
      BEHAVIORAL_FRICTION: {
        code: 'BEHAVIORAL_FRICTION',
        title: 'Behavioral Drop-off',
        description: 'Customer abandoned checkout, OTP entry timeout, or multi-app switch fatigue.',
        count: 0,
        volume: 0,
        avgProb: 0,
        primaryStrategy: '1-Click WhatsApp Pay Nudge with Dynamic Pre-filled UPI',
        riskLevel: 'MEDIUM',
      },
      FINANCIAL_CONSTRAINT: {
        code: 'FINANCIAL_CONSTRAINT',
        title: 'Liquidity & Limits',
        description: 'Temporary insufficient funds, daily UPI transaction caps, or issuer balance holds.',
        count: 0,
        volume: 0,
        avgProb: 0,
        primaryStrategy: 'Payday-aligned Re-schedule & Split Method Alternative',
        riskLevel: 'HIGH',
      },
    };

    transactions.forEach((t) => {
      let nature = t.diagnosis?.failureNature;
      if (!nature) {
        if (t.failureCategory === 'SOFT_DECLINE_NETWORK') nature = 'TRANSIENT_SOFT_DECLINE';
        else if (t.failureCategory === 'HARD_DECLINE_CARD_EXPIRED') nature = 'TERMINAL_HARD_DECLINE';
        else if (t.failureCategory === 'CHECKOUT_ABANDONED' || t.failureCategory === 'AUTH_FAILED_OTP') nature = 'BEHAVIORAL_FRICTION';
        else nature = 'FINANCIAL_CONSTRAINT';
      }

      if (categories[nature]) {
        categories[nature].count += 1;
        categories[nature].volume += t.amount;
        categories[nature].avgProb += t.diagnosis?.recoveryProbability || 75;
      }
    });

    Object.keys(categories).forEach((k) => {
      if (categories[k].count > 0) {
        categories[k].avgProb = Math.round(categories[k].avgProb / categories[k].count);
      } else {
        categories[k].avgProb = k === 'TERMINAL_HARD_DECLINE' ? 25 : 85;
      }
    });

    return Object.values(categories);
  }, [transactions]);

  // Filtered Decision Stream
  const filteredDecisionStream = useMemo(() => {
    return transactions.filter((t) => {
      if (taxonomyFilter === 'ALL') return true;
      if (taxonomyFilter === 'DIAGNOSED_ONLY') return !!t.diagnosis;
      if (taxonomyFilter === 'HIGH_PROB') return (t.diagnosis?.recoveryProbability || 0) >= 70;
      if (taxonomyFilter === 'HARD_DECLINE')
        return (
          t.diagnosis?.failureNature === 'TERMINAL_HARD_DECLINE' ||
          t.failureCategory === 'HARD_DECLINE_CARD_EXPIRED'
        );
      return true;
    });
  }, [transactions, taxonomyFilter]);

  const getMethodIcon = (method: AtRiskTransaction['paymentMethod']) => {
    switch (method) {
      case 'UPI':
        return <Smartphone className="h-3 w-3 text-[#4edea3]" />;
      case 'CARD':
        return <CreditCard className="h-3 w-3 text-[#c4c7c5]" />;
      case 'SUBSCRIPTION_MANDATE':
        return <RotateCcw className="h-3 w-3 text-[#f59e0b]" />;
      default:
        return <Building className="h-3 w-3 text-[#8e9192]" />;
    }
  };

  return (
    <div className="space-y-0 pb-16 font-hanken">
      {/* ========================================================================= */}
      {/* 1. EDITORIAL HEADER SECTION (AI INTELLIGENCE CONTROL ROOM)                */}
      {/* ========================================================================= */}
      <div className="pb-6 border-b border-[#2b2a2a]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="font-jetbrains text-[10px] font-bold tracking-[0.2em] text-[#8e9192] uppercase flex items-center space-x-2">
              <span>RECOVERAI TERMINAL</span>
              <span className="text-[#2b2a2a]">//</span>
              <span className="text-[#ffffff]">COGNITIVE RECOVERY LAYER</span>
            </div>
            <h1 className="font-garamond text-4xl sm:text-5xl font-medium tracking-tight text-[#ffffff] mt-1.5">
              AI Intelligence &amp; Diagnostics
            </h1>
            <p className="font-hanken text-xs sm:text-sm text-[#8e9192] max-w-2xl mt-1 leading-relaxed">
              Real-time cognitive diagnostic engine. Deconstructs raw gateway switch errors, estimates statistical recovery probability, and formulates high-conversion interventions bounded by zero-trust merchant guardrails.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex items-center space-x-3">
            {metrics.undiagnosedCount > 0 ? (
              <button
                onClick={onRunBatchDiagnose}
                disabled={isDiagnosingBatch}
                className="flex items-center space-x-2 px-4 py-2.5 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-40 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {isDiagnosingBatch
                    ? 'INFERENCING DIAGNOSES...'
                    : `DIAGNOSE PENDING (${metrics.undiagnosedCount})`}
                </span>
              </button>
            ) : (
              <div className="px-3.5 py-2 bg-[#141313] border border-[#2b2a2a] font-jetbrains text-[10px] text-[#4edea3] flex items-center space-x-2">
                <span className="h-1.5 w-1.5 bg-[#4edea3]" />
                <span className="tracking-wider uppercase">ALL TELEMETRY SYNCHRONIZED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. AI DECISION OVERVIEW STRIP                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#2b2a2a] bg-[#0e0e0e] divide-y sm:divide-y-0 sm:divide-x divide-[#2b2a2a]">
        {/* Metric 1: Analyzed Traces */}
        <div className="p-4">
          <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
            ANALYZED TRACES
          </div>
          <div className="font-garamond text-2xl sm:text-3xl font-medium text-[#ffffff] mt-1">
            {metrics.totalAnalyzed}{' '}
            <span className="font-jetbrains text-xs text-[#8e9192] font-normal">
              / {metrics.totalCount}
            </span>
          </div>
          <div className="font-jetbrains text-[10px] text-[#8e9192] mt-1">
            {Math.round((metrics.totalAnalyzed / (metrics.totalCount || 1)) * 100)}% COVERAGE
          </div>
        </div>

        {/* Metric 2: Average Win Probability */}
        <div className="p-4">
          <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
            AVG WIN PROBABILITY
          </div>
          <div className="font-garamond text-2xl sm:text-3xl font-medium text-[#4edea3] mt-1">
            {metrics.avgWinProb}%
          </div>
          <div className="font-jetbrains text-[10px] text-[#8e9192] mt-1">
            CALIBRATED CONFIDENCE
          </div>
        </div>

        {/* Metric 3: Recoverable Revenue */}
        <div className="p-4">
          <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
            RECOVERABLE REVENUE
          </div>
          <div className="font-garamond text-2xl sm:text-3xl font-medium text-[#ffffff] mt-1">
            ₹{metrics.recoverableRevenue.toLocaleString('en-IN')}
          </div>
          <div className="font-jetbrains text-[10px] text-[#4edea3] mt-1">
            PROBABILITY &ge; 50%
          </div>
        </div>

        {/* Metric 4: Active Formulations */}
        <div className="p-4">
          <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
            ACTIVE FORMULATIONS
          </div>
          <div className="font-garamond text-2xl sm:text-3xl font-medium text-[#ffffff] mt-1">
            {metrics.activeFormulations}
          </div>
          <div className="font-jetbrains text-[10px] text-[#8e9192] mt-1">
            BOUNDED INTERVENTIONS
          </div>
        </div>

        {/* Metric 5: Model Engine Status */}
        <div className="p-4 col-span-2 sm:col-span-1">
          <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
            INFERENCE ENGINE
          </div>
          <div className="font-jetbrains text-xs font-bold text-[#ffffff] mt-1 flex items-center space-x-1.5">
            <span className="h-1.5 w-1.5 bg-[#4edea3]" />
            <span className="tracking-wider">GEMINI 2.5 FLASH</span>
          </div>
          <div className="font-jetbrains text-[10px] text-[#4edea3] mt-1">
            ONLINE / LOW LATENCY
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DENSE COGNITIVE DECISION STREAM (STREAM OF EVALUATED CASES)             */}
      {/* ========================================================================= */}
      <div className="pt-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-garamond text-2xl font-normal text-[#ffffff]">
              Cognitive Decision Stream
            </h2>
            <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase">
              LIVE INFERENCE TRACES &amp; PROPOSED INTERVENTIONS
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTaxonomyFilter('ALL')}
              className={`px-2.5 py-1 font-jetbrains text-[10px] uppercase tracking-wider transition ${
                taxonomyFilter === 'ALL'
                  ? 'bg-[#ffffff] text-[#0e0e0e] font-bold'
                  : 'bg-[#141313] text-[#8e9192] border border-[#2b2a2a] hover:text-[#ffffff]'
              }`}
            >
              ALL ({transactions.length})
            </button>
            <button
              onClick={() => setTaxonomyFilter('DIAGNOSED_ONLY')}
              className={`px-2.5 py-1 font-jetbrains text-[10px] uppercase tracking-wider transition ${
                taxonomyFilter === 'DIAGNOSED_ONLY'
                  ? 'bg-[#ffffff] text-[#0e0e0e] font-bold'
                  : 'bg-[#141313] text-[#8e9192] border border-[#2b2a2a] hover:text-[#ffffff]'
              }`}
            >
              DIAGNOSED ({diagnosedTxns.length})
            </button>
            <button
              onClick={() => setTaxonomyFilter('HIGH_PROB')}
              className={`px-2.5 py-1 font-jetbrains text-[10px] uppercase tracking-wider transition ${
                taxonomyFilter === 'HIGH_PROB'
                  ? 'bg-[#ffffff] text-[#0e0e0e] font-bold'
                  : 'bg-[#141313] text-[#8e9192] border border-[#2b2a2a] hover:text-[#ffffff]'
              }`}
            >
              HIGH WIN (&ge;70%)
            </button>
          </div>
        </div>

        {/* Dense Table */}
        <div className="border border-[#2b2a2a] bg-[#0e0e0e] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2b2a2a] bg-[#141313] font-jetbrains text-[10px] text-[#8e9192] uppercase tracking-wider select-none">
                <th className="py-2.5 px-4 font-semibold">TXN ID / TRACE</th>
                <th className="py-2.5 px-4 font-semibold">CUSTOMER</th>
                <th className="py-2.5 px-4 font-semibold">FAILURE TAXONOMY</th>
                <th className="py-2.5 px-4 font-semibold text-right">AMOUNT</th>
                <th className="py-2.5 px-4 font-semibold text-center">WIN PROB</th>
                <th className="py-2.5 px-4 font-semibold">PREDICTED INTERVENTION</th>
                <th className="py-2.5 px-4 font-semibold text-center">CONFIDENCE</th>
                <th className="py-2.5 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b2a2a]/70 text-[#e6e1e1] font-hanken">
              {filteredDecisionStream.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8e9192] font-jetbrains text-xs">
                    NO ACTIVE DIAGNOSTIC TRACES MATCHING CRITERIA
                  </td>
                </tr>
              ) : (
                filteredDecisionStream.map((txn) => {
                  const isSelected = activeTraceId === txn.id;
                  const prob = txn.diagnosis?.recoveryProbability ?? null;

                  return (
                    <tr
                      key={txn.id}
                      onClick={() => {
                        setActiveTraceId(txn.id);
                        onSelectTransaction(txn);
                      }}
                      className={`cursor-pointer transition-colors group select-none ${
                        isSelected ? 'bg-[#1c1b1b]' : 'hover:bg-[#141313]'
                      }`}
                    >
                      {/* 1. Txn ID */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center space-x-2">
                          {isSelected && <span className="h-1.5 w-1.5 bg-[#4edea3] flex-shrink-0" />}
                          <span className="font-jetbrains font-bold text-xs text-[#ffffff] group-hover:text-[#4edea3] transition-colors">
                            {txn.id}
                          </span>
                        </div>
                        <div className="font-jetbrains text-[9px] text-[#8e9192] mt-0.5">
                          {txn.paymentMethod} • RETRY {txn.retryCount}/{txn.maxRetries}
                        </div>
                      </td>

                      {/* 2. Customer */}
                      <td className="py-2.5 px-4">
                        <div className="text-xs font-medium text-[#ffffff]">
                          {txn.customerName}
                        </div>
                        <div className="font-jetbrains text-[9px] text-[#8e9192] uppercase mt-0.5">
                          {txn.customerTier}
                        </div>
                      </td>

                      {/* 3. Failure Taxonomy */}
                      <td className="py-2.5 px-4">
                        <div className="inline-block font-jetbrains text-[10px] font-bold px-1.5 py-0.5 bg-[#141313] border border-[#2b2a2a] text-[#ffb4ab]">
                          {txn.gatewayErrorCode}
                        </div>
                        <div className="font-jetbrains text-[9px] text-[#8e9192] mt-0.5 uppercase truncate max-w-[150px]">
                          {txn.diagnosis?.failureNature || txn.failureCategory}
                        </div>
                      </td>

                      {/* 4. Amount */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="font-garamond text-base font-medium text-[#ffffff]">
                          ₹{txn.amount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* 5. Win Probability */}
                      <td className="py-2.5 px-4 text-center">
                        {prob !== null ? (
                          <span
                            className={`font-jetbrains font-bold text-xs ${
                              prob >= 70
                                ? 'text-[#4edea3]'
                                : prob >= 40
                                ? 'text-[#f59e0b]'
                                : 'text-[#ffb4ab]'
                            }`}
                          >
                            {prob}%
                          </span>
                        ) : (
                          <span className="font-jetbrains text-[10px] text-[#8e9192]">PENDING</span>
                        )}
                      </td>

                      {/* 6. Predicted Intervention */}
                      <td className="py-2.5 px-4">
                        {txn.diagnosis ? (
                          <div>
                            <div className="font-jetbrains text-[11px] text-[#ffffff] font-medium truncate max-w-[220px]">
                              {txn.diagnosis.proposedIntervention.title}
                            </div>
                            <div className="font-jetbrains text-[9px] text-[#8e9192] uppercase">
                              CHANNEL: {txn.diagnosis.proposedIntervention.channel}
                            </div>
                          </div>
                        ) : (
                          <span className="font-jetbrains text-[10px] text-[#8e9192]">AWAITING INFERENCE</span>
                        )}
                      </td>

                      {/* 7. Confidence / Urgency */}
                      <td className="py-2.5 px-4 text-center">
                        {txn.diagnosis ? (
                          <span className="font-jetbrains text-[9px] font-bold px-1.5 py-0.5 bg-[#141313] border border-[#2b2a2a] text-[#ffffff] uppercase">
                            {txn.diagnosis.urgencyLevel}
                          </span>
                        ) : (
                          <span className="font-jetbrains text-[9px] text-[#8e9192]">--</span>
                        )}
                      </td>

                      {/* 8. Action Link */}
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          id={`btn-inspect-${txn.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTraceId(txn.id);
                            onSelectTransaction(txn);
                          }}
                          className="font-jetbrains text-[10px] text-[#8e9192] hover:text-[#ffffff] group-hover:text-[#ffffff] inline-flex items-center space-x-1 cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                        >
                          <span>INSPECT</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DUAL-COLUMN: ROOT CAUSE TAXONOMY & MODEL REASONING TERMINAL            */}
      {/* ========================================================================= */}
      <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Root Cause Taxonomy (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div>
            <h2 className="font-garamond text-2xl font-normal text-[#ffffff]">
              Root Cause Taxonomy
            </h2>
            <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase">
              CATEGORICAL FAILURE MODELS &amp; STRATEGY
            </div>
          </div>

          <div className="border border-[#2b2a2a] divide-y divide-[#2b2a2a] bg-[#0e0e0e]">
            {taxonomyStats.map((item) => (
              <div key={item.code} className="p-4 space-y-2 hover:bg-[#141313] transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] tracking-wider uppercase">
                      {item.code}
                    </div>
                    <div className="font-garamond text-lg font-medium text-[#ffffff]">
                      {item.title}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-jetbrains text-[10px] font-bold px-2 py-0.5 border uppercase ${
                        item.riskLevel === 'TERMINAL'
                          ? 'bg-[#1c1b1b] border-[#ffb4ab]/50 text-[#ffb4ab]'
                          : item.riskLevel === 'HIGH'
                          ? 'bg-[#1c1b1b] border-[#f59e0b]/50 text-[#f59e0b]'
                          : 'bg-[#141313] border-[#2b2a2a] text-[#4edea3]'
                      }`}
                    >
                      {item.avgProb}% AVG YIELD
                    </span>
                  </div>
                </div>

                <p className="font-hanken text-xs text-[#c4c7c5] leading-relaxed">
                  {item.description}
                </p>

                <div className="pt-2 border-t border-[#2b2a2a]/60 grid grid-cols-2 gap-2 text-xs font-jetbrains">
                  <div>
                    <div className="text-[9px] text-[#8e9192] uppercase">VOLUME AT RISK</div>
                    <div className="text-[#ffffff] font-bold text-[11px] mt-0.5">
                      ₹{item.volume.toLocaleString('en-IN')} ({item.count} txns)
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-[#8e9192] uppercase">PRIMARY STRATEGY</div>
                    <div className="text-[#4edea3] text-[10px] truncate mt-0.5" title={item.primaryStrategy}>
                      {item.primaryStrategy}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Model Reasoning Terminal Trace (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-garamond text-2xl font-normal text-[#ffffff]">
                AI Decision Process &amp; Cognitive Trace
              </h2>
              <div className="font-jetbrains text-[10px] font-bold tracking-widest text-[#8e9192] uppercase">
                6-STAGE GOVERNED PIPELINE: AI ADVISORY → DETERMINISTIC ENFORCEMENT
              </div>
            </div>

            {activeTraceTxn && (
              <button
                onClick={() => onSelectTransaction(activeTraceTxn)}
                className="px-3 py-1 bg-[#1c1b1b] hover:bg-[#2b2a2a] text-[#ffffff] border border-[#2b2a2a] font-jetbrains text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5"
              >
                <span>OPEN INSPECTOR</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Explicit Governance Callout Strip */}
          <div className="p-3 bg-[#141313] border border-[#2b2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-jetbrains text-xs">
            <div className="flex items-center space-x-2">
              <Shield className="h-3.5 w-3.5 text-[#4edea3] flex-shrink-0" />
              <span className="text-[10px] text-[#c4c7c5] uppercase font-bold tracking-wider">
                GOVERNANCE PRINCIPLE:
              </span>
              <span className="text-[10px] text-[#8e9192]">
                Gemini proposes recommendations; deterministic policy engine executes payment actions.
              </span>
            </div>
            <span className="px-2 py-0.5 bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] text-[9px] font-bold uppercase tracking-wider self-start sm:self-auto">
              NON-AUTONOMOUS AI SAFETY
            </span>
          </div>

          {activeTraceTxn && (
            /* 6-Stage Visual Decision Pipeline */
            <div className="bg-[#0e0e0e] border border-[#2b2a2a] p-4 space-y-3 font-jetbrains">
              <div className="text-[10px] font-bold text-[#8e9192] uppercase tracking-wider flex items-center justify-between">
                <span>ACTIVE DECISION PIPELINE // {activeTraceTxn.id}</span>
                <span className="text-[#ffffff]">AMOUNT: ₹{activeTraceTxn.amount.toLocaleString('en-IN')}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {/* 1. DETECTED */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
                  <div className="text-[9px] text-[#8e9192] uppercase font-bold">1. DETECTED</div>
                  <div className="text-[#ffb4ab] font-bold text-[11px] mt-1 truncate">
                    {activeTraceTxn.gatewayErrorCode}
                  </div>
                  <div className="text-[9px] text-[#8e9192] mt-0.5">
                    {activeTraceTxn.paymentMethod} • Rail Event
                  </div>
                </div>

                {/* 2. DIAGNOSED */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
                  <div className="text-[9px] text-[#8e9192] uppercase font-bold">2. DIAGNOSED</div>
                  <div className="text-[#ffffff] font-bold text-[11px] mt-1 truncate">
                    {activeTraceTxn.diagnosis?.failureNature || 'PENDING'}
                  </div>
                  <div className="text-[9px] text-[#8e9192] mt-0.5">
                    Gemini Flash Model
                  </div>
                </div>

                {/* 3. RECOMMENDED INTERVENTION */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
                  <div className="text-[9px] text-[#8e9192] uppercase font-bold">3. RECOMMENDATION</div>
                  <div className="text-[#4edea3] font-bold text-[11px] mt-1 truncate">
                    {activeTraceTxn.diagnosis?.proposedIntervention?.channel || 'AWAITING'}
                  </div>
                  <div className="text-[9px] text-[#8e9192] mt-0.5">
                    AI Advisory Only
                  </div>
                </div>

                {/* 4. CONFIDENCE */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
                  <div className="text-[9px] text-[#8e9192] uppercase font-bold">4. CONFIDENCE</div>
                  <div className="text-[#ffffff] font-bold text-[11px] mt-1">
                    {activeTraceTxn.diagnosis ? `${activeTraceTxn.diagnosis.recoveryProbability}% WIN` : '--'}
                  </div>
                  <div className="text-[9px] text-[#8e9192] mt-0.5 uppercase">
                    {activeTraceTxn.diagnosis?.urgencyLevel || 'PENDING'}
                  </div>
                </div>

                {/* 5. GUARDRAIL EVALUATION */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
                  <div className="text-[9px] text-[#8e9192] uppercase font-bold">5. GUARDRAILS</div>
                  <div className={`font-bold text-[11px] mt-1 ${activeTraceTxn.amount >= 50000 && !activeTraceTxn.humanApproved ? 'text-[#f59e0b]' : 'text-[#4edea3]'}`}>
                    {activeTraceTxn.amount >= 50000 && !activeTraceTxn.humanApproved ? 'HUMAN GATED' : 'PASS (5/5)'}
                  </div>
                  <div className="text-[9px] text-[#8e9192] mt-0.5">
                    Deterministic Policy
                  </div>
                </div>

                {/* 6. FINAL ACTION */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
                  <div className="text-[9px] text-[#8e9192] uppercase font-bold">6. FINAL ACTION</div>
                  <div className="text-[#ffffff] font-bold text-[11px] mt-1">
                    {activeTraceTxn.status === 'RECOVERED' ? (
                      <span className="text-[#4edea3]">SETTLED</span>
                    ) : activeTraceTxn.status === 'ACTION_SCHEDULED' ? (
                      <span className="text-[#ffffff]">DISPATCHED</span>
                    ) : activeTraceTxn.amount >= 50000 && !activeTraceTxn.humanApproved ? (
                      <span className="text-[#f59e0b]">HELD</span>
                    ) : (
                      <span className="text-[#8e9192]">READY</span>
                    )}
                  </div>
                  <div className="text-[9px] text-[#8e9192] mt-0.5">
                    Authoritative Output
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTraceTxn ? (
            <div className="bg-[#0e0e0e] border border-[#2b2a2a]">
              {/* Terminal Title Bar */}
              <div className="p-3 bg-[#141313] border-b border-[#2b2a2a] flex items-center justify-between font-jetbrains text-[10px]">
                <div className="flex items-center space-x-2 text-[#ffffff]">
                  <Terminal className="h-3.5 w-3.5 text-[#8e9192]" />
                  <span className="font-bold">TRACE ID: {activeTraceTxn.id}</span>
                  <span className="text-[#2b2a2a]">|</span>
                  <span className="text-[#8e9192]">ORDER: {activeTraceTxn.orderId}</span>
                </div>
                <div className="text-[#4edea3] font-bold">
                  {activeTraceTxn.diagnosis
                    ? `WIN PROB: ${activeTraceTxn.diagnosis.recoveryProbability}%`
                    : 'AWAITING AI'}
                </div>
              </div>

              {/* Terminal Raw Console Output */}
              <div className="p-5 font-jetbrains text-xs space-y-3 bg-[#0a0a0a] text-[#e6e1e1] leading-relaxed">
                <div className="text-[#8e9192]">
                  &gt; [SYSTEM] INGESTION TIMESTAMP: {activeTraceTxn.createdAt || '2026-08-28T09:20:00Z'}
                </div>
                <div className="text-[#8e9192]">
                  &gt; [GATEWAY_TELEMETRY] CODE: <span className="text-[#ffb4ab]">{activeTraceTxn.gatewayErrorCode}</span> | ERROR: "{activeTraceTxn.gatewayErrorMessage || 'Card network decline'}"
                </div>

                {activeTraceTxn.diagnosis ? (
                  <>
                    <div className="pt-2 border-t border-[#2b2a2a]/80 text-[#ffffff]">
                      &gt; [CLASSIFICATION] <span className="text-[#4edea3] font-bold">{activeTraceTxn.diagnosis.failureNature}</span>
                    </div>

                    <div className="text-[#c4c7c5]">
                      &gt; [DIAGNOSTIC_ROOT_CAUSE]: {activeTraceTxn.diagnosis.rootCauseSummary}
                    </div>

                    <div className="text-[#ffffff]">
                      &gt; [FORMULATED_ACTION]: <span className="text-[#4edea3] font-bold">{activeTraceTxn.diagnosis.proposedIntervention.title}</span>
                    </div>

                    <div className="text-[#8e9192]">
                      &gt; [ROUTING_CHANNEL]: {activeTraceTxn.diagnosis.proposedIntervention.channel} | DELAY: {activeTraceTxn.diagnosis.proposedIntervention.delayMinutes}m | EXPIRY: {activeTraceTxn.diagnosis.proposedIntervention.expiryHours}h
                    </div>

                    {activeTraceTxn.diagnosis.proposedIntervention.recommendedDiscountPercent > 0 && (
                      <div className="text-[#f59e0b]">
                        &gt; [DISCOUNT_INCENTIVE]: {activeTraceTxn.diagnosis.proposedIntervention.recommendedDiscountPercent}% (Bounded by 15% ceiling)
                      </div>
                    )}

                    {activeTraceTxn.diagnosis.reasoningChain && activeTraceTxn.diagnosis.reasoningChain.length > 0 && (
                      <div className="pt-2 border-t border-[#2b2a2a]/80 space-y-1.5">
                        <div className="text-[10px] text-[#8e9192] uppercase font-bold tracking-wider">
                          &gt; [COGNITIVE_REASONING_CHAIN]:
                        </div>
                        {activeTraceTxn.diagnosis.reasoningChain.map((step, idx) => (
                          <div key={idx} className="text-[#c4c7c5] pl-4 text-[11px]">
                            <span className="text-[#8e9192]">[{String(idx + 1).padStart(2, '0')}]</span> {step}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-[#8e9192] space-y-2">
                    <div>NO INFERENCE TRACE GENERATED FOR THIS RECORD YET</div>
                    <button
                      onClick={() => {
                        if (onDiagnoseTransaction) {
                          onDiagnoseTransaction(activeTraceTxn);
                        } else {
                          onSelectTransaction(activeTraceTxn);
                        }
                      }}
                      disabled={isProcessing || isDiagnosingBatch}
                      className="px-4 py-2 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains text-[10px] font-bold uppercase tracking-wider inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {isProcessing ? 'DIAGNOSING RECORD...' : 'GENERATE GEMINI DIAGNOSIS'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Terminal Bottom Controls */}
              <div className="p-3 bg-[#141313] border-t border-[#2b2a2a] flex items-center justify-between text-xs font-jetbrains text-[#8e9192]">
                <div>CUSTOMER: {activeTraceTxn.customerName} ({activeTraceTxn.customerTier})</div>
                <div className="text-[#ffffff] font-bold">
                  AMOUNT: ₹{activeTraceTxn.amount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 border border-[#2b2a2a] bg-[#0e0e0e] text-center font-jetbrains text-xs text-[#8e9192]">
              SELECT A TRANSACTION IN THE DECISION STREAM TO INSPECT RAW COGNITIVE TRACE
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
