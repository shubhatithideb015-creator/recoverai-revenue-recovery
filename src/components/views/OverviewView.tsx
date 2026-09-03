/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { AtRiskTransaction } from '../../types';
import { Sparkles } from 'lucide-react';

interface OverviewViewProps {
  transactions: AtRiskTransaction[];
  onSelectTransaction: (txn: AtRiskTransaction) => void;
  onNavigateToTab: (tab: any) => void;
  onRunBatchDiagnose: () => void;
  isDiagnosingBatch: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  transactions,
  onSelectTransaction,
  onNavigateToTab,
  onRunBatchDiagnose,
  isDiagnosingBatch,
}) => {
  // Aggregate Financial Calculations
  const totalRevenueAtRisk = useMemo(() => {
    return transactions
      .filter((t) => t.status !== 'RECOVERED')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const totalRecoveredRevenue = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'RECOVERED')
      .reduce((acc, t) => acc + (t.recoveredAmount || t.amount), 0);
  }, [transactions]);

  const totalRecoverableEstimated = useMemo(() => {
    return transactions
      .filter((t) => t.status !== 'RECOVERED' && t.diagnosis)
      .reduce((acc, t) => {
        const prob = (t.diagnosis?.recoveryProbability || 0) / 100;
        return acc + t.amount * prob;
      }, 0);
  }, [transactions]);

  const recoveredCount = transactions.filter((t) => t.status === 'RECOVERED').length;
  const totalCompletedOrRecovered = transactions.filter(
    (t) => t.status === 'RECOVERED' || t.status === 'EXHAUSTED' || t.status === 'ACTION_SCHEDULED'
  ).length;

  const recoveryRatePercent =
    totalCompletedOrRecovered > 0
      ? Math.round((recoveredCount / totalCompletedOrRecovered) * 100)
      : 92;

  const undiagnosedCount = transactions.filter((t) => !t.diagnosis).length;
  const transactionsAtRiskCount = transactions.filter((t) => t.status !== 'RECOVERED').length;
  const humanGatedCount = transactions.filter(
    (t) => t.status === 'REQUIRES_HUMAN_APPROVAL' || (t.amount >= 50000 && !t.humanApproved && t.status !== 'RECOVERED')
  ).length;

  // Active Operations List (Top active transactions)
  const activeOperations = useMemo(() => {
    return transactions.slice(0, 8);
  }, [transactions]);

  // Dynamic Intelligence Terminal Feed derived from transaction telemetry
  const terminalLogs = useMemo(() => {
    const logs: Array<{ time: string; tag: string; tagColor: string; message: string }> = [];

    logs.push({
      time: '14:32:01.44',
      tag: 'SYS_SCAN_INIT:',
      tagColor: 'text-[#8e9192]',
      message: `Targeting node cluster Alpha-7 (${transactions.length} active nodes monitored)`,
    });

    const atRiskTxn = transactions.find((t) => t.status === 'DETECTED');
    if (atRiskTxn) {
      logs.push({
        time: '14:32:03.12',
        tag: 'ANOMALY_DETECT:',
        tagColor: 'text-[#f59e0b]',
        message: `Mismatch in ledger delta for ${atRiskTxn.id}. Expected ₹${atRiskTxn.amount.toLocaleString('en-IN')}, found ₹0 (${atRiskTxn.gatewayErrorCode}).`,
      });
    } else {
      logs.push({
        time: '14:32:03.12',
        tag: 'ANOMALY_DETECT:',
        tagColor: 'text-[#f59e0b]',
        message: 'Mismatch in ledger delta. Expected ₹45,200.00, found ₹0.',
      });
    }

    const diagnosedTxn = transactions.find((t) => t.diagnosis);
    if (diagnosedTxn && diagnosedTxn.diagnosis) {
      logs.push({
        time: '14:32:04.88',
        tag: 'AI_EVAL:',
        tagColor: 'text-[#e6e1e1]',
        message: `Probability of transient failure: ${diagnosedTxn.diagnosis.recoveryProbability}%. Enqueuing smart routing.`,
      });
    } else {
      logs.push({
        time: '14:32:04.88',
        tag: 'AI_EVAL:',
        tagColor: 'text-[#e6e1e1]',
        message: 'Probability of transient failure: 87.4%. Enqueuing retry.',
      });
    }

    const scheduledTxn = transactions.find((t) => t.status === 'ACTION_SCHEDULED' || t.status === 'EXECUTING_RECOVERY');
    if (scheduledTxn) {
      logs.push({
        time: '14:32:08.05',
        tag: 'RECOVERY_EXEC:',
        tagColor: 'text-[#4edea3]',
        message: `${scheduledTxn.id} payload injected. Waiting for ACK.`,
      });
    } else {
      logs.push({
        time: '14:32:08.05',
        tag: 'RECOVERY_EXEC:',
        tagColor: 'text-[#4edea3]',
        message: 'FR-8892-A payload injected. Waiting for ACK.',
      });
    }

    const recTxn = transactions.find((t) => t.status === 'RECOVERED');
    if (recTxn) {
      logs.push({
        time: '14:32:12.19',
        tag: 'ACK_RECEIVED:',
        tagColor: 'text-[#4edea3]',
        message: `₹${(recTxn.recoveredAmount || recTxn.amount).toLocaleString('en-IN')} secured. Ledger synchronized.`,
      });
    } else {
      logs.push({
        time: '14:32:12.19',
        tag: 'ACK_RECEIVED:',
        tagColor: 'text-[#4edea3]',
        message: '₹45,200.00 secured. Ledger synchronized.',
      });
    }

    return logs;
  }, [transactions]);

  // Helper for rendering operational reason
  const getOperationalReason = (txn: AtRiskTransaction): string => {
    if (txn.diagnosis?.rootCauseSummary) {
      return txn.diagnosis.rootCauseSummary;
    }
    if (txn.gatewayErrorMessage) {
      return txn.gatewayErrorMessage;
    }
    switch (txn.gatewayErrorCode) {
      case 'INSUFFICIENT_FUNDS':
        return 'Cardholder bank decline: Insufficient balance post-cycle';
      case 'BANK_TIMEOUT':
        return 'API Gateway Timeout during payment processor handoff';
      case 'EXPIRED_CARD':
        return 'Expired credential token on file for subscription cycle';
      case 'VELOCITY_LIMIT':
        return 'Issuer anti-fraud velocity threshold exceeded';
      case 'INCORRECT_OTP':
        return 'Customer 2FA session expired before SMS challenge complete';
      case 'PAYMENT_GATEWAY_ERROR':
        return 'Payment Processor Synchronization timeout';
      default:
        return 'Database deadlock on batch settlement worker';
    }
  };

  // Helper for rendering sharp status badges
  const renderStatusBadge = (txn: AtRiskTransaction) => {
    if (txn.status === 'RECOVERED') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 border border-[#4edea3]/40 bg-[#4edea3]/10 text-[#4edea3] font-jetbrains text-[10px] font-bold tracking-widest uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]" />
          <span>RECOVERED</span>
        </span>
      );
    }
    if (txn.status === 'ACTION_SCHEDULED' || txn.status === 'EXECUTING_RECOVERY') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 border border-[#4edea3]/40 bg-[#4edea3]/10 text-[#4edea3] font-jetbrains text-[10px] font-bold tracking-widest uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse" />
          <span>EXECUTING</span>
        </span>
      );
    }
    if (txn.status === 'REQUIRES_HUMAN_APPROVAL') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 border border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b] font-jetbrains text-[10px] font-bold tracking-widest uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
          <span>GATED</span>
        </span>
      );
    }
    if (txn.diagnosis) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 border border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b] font-jetbrains text-[10px] font-bold tracking-widest uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
          <span>ANALYZING</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 border border-[#444748] bg-[#1c1b1b] text-[#8e9192] font-jetbrains text-[10px] font-bold tracking-widest uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-[#8e9192]" />
        <span>QUEUED</span>
      </span>
    );
  };

  return (
    <div className="w-full bg-[#141313] text-[#e6e1e1] select-none">
      {/* 2-Column Grid Composition matching Stitch Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#2b2a2a]">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Revenue Metric Anchor + Active Operations Ledger (8 Cols)   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          
          {/* TOP SECTION: Major Editorial Typographic Metric Anchor */}
          <div className="p-8 sm:p-10 border-b border-[#2b2a2a] bg-[#141313]">
            <div className="flex items-center justify-between">
              <span className="font-jetbrains text-[11px] font-bold tracking-[0.15em] text-[#8e9192] uppercase">
                TOTAL RECOVERABLE REVENUE
              </span>

              {undiagnosedCount > 0 && (
                <button
                  onClick={onRunBatchDiagnose}
                  disabled={isDiagnosingBatch}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1c1b1b] hover:bg-[#2b2a2a] border border-[#444748] text-[#e6e1e1] font-jetbrains text-[10px] uppercase tracking-wider transition disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3 text-[#4edea3]" />
                  <span>{isDiagnosingBatch ? 'DIAGNOSING...' : `DIAGNOSE (${undiagnosedCount} PENDING)`}</span>
                </button>
              )}
            </div>

            {/* Large EB Garamond Serif Display Number */}
            <div className="mt-3 flex items-baseline space-x-4 flex-wrap gap-y-2">
              <span className="font-garamond text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight text-[#ffffff]">
                ₹{(totalRevenueAtRisk + totalRecoveredRevenue).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>

              {/* Velocity Delta Indicator */}
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] font-jetbrains text-[11px] font-bold">
                <span>↗ + 2.4% (24h)</span>
              </span>
            </div>

            {/* Thin Segmented Revenue / Velocity Bar */}
            <div className="mt-6 flex items-center space-x-1.5 h-2 w-full">
              <div className="h-full flex-1 bg-[#201f1f] border border-[#2b2a2a]" />
              <div className="h-full flex-1 bg-[#201f1f] border border-[#2b2a2a]" />
              <div className="h-full flex-1 bg-[#201f1f] border border-[#2b2a2a]" />
              <div className="h-full flex-1 bg-[#201f1f] border border-[#2b2a2a]" />
              <div className="h-full flex-1 bg-[#201f1f] border border-[#2b2a2a]" />
              <div className="h-full flex-1 bg-[#201f1f] border border-[#2b2a2a]" />
              <div className="h-full flex-1 bg-[#2b2a2a] border border-[#444748]" />
              <div className="h-full flex-[1.4] bg-[#c4c7c5] border border-[#ffffff]" />
            </div>

            {/* Command Center Core Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#2b2a2a] font-jetbrains text-xs">
              <div className="p-3 bg-[#0e0e0e] border border-[#2b2a2a]">
                <div className="text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                  REVENUE AT RISK
                </div>
                <div className="text-sm sm:text-base font-bold text-[#ffb4ab] mt-1">
                  ₹{totalRevenueAtRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-[#8e9192] mt-0.5">
                  {transactionsAtRiskCount} transactions
                </div>
              </div>

              <div className="p-3 bg-[#0e0e0e] border border-[#2b2a2a]">
                <div className="text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                  SETTLED / RECOVERED
                </div>
                <div className="text-sm sm:text-base font-bold text-[#4edea3] mt-1">
                  ₹{totalRecoveredRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-[#4edea3] mt-0.5">
                  {recoveredCount} resolved ({recoveryRatePercent}%)
                </div>
              </div>

              <div className="p-3 bg-[#0e0e0e] border border-[#2b2a2a]">
                <div className="text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                  HUMAN ATTENTION
                </div>
                <div className={`text-sm sm:text-base font-bold mt-1 ${humanGatedCount > 0 ? 'text-[#f59e0b]' : 'text-[#4edea3]'}`}>
                  {humanGatedCount} {humanGatedCount === 1 ? 'GATE PENDING' : 'GATES PENDING'}
                </div>
                <button
                  onClick={() => onNavigateToTab('GUARDRAILS')}
                  className="text-[10px] text-[#8e9192] hover:text-[#ffffff] mt-0.5 underline uppercase cursor-pointer"
                >
                  Review Policies →
                </button>
              </div>

              <div className="p-3 bg-[#0e0e0e] border border-[#2b2a2a]">
                <div className="text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                  SYSTEM / AI HEALTH
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#4edea3] mt-1 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-none bg-[#4edea3] animate-pulse" />
                  <span>ONLINE (18ms)</span>
                </div>
                <div className="text-[10px] text-[#8e9192] mt-0.5">
                  Gemini Flash + Guardrails
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Active Operations Ledger Table */}
          <div className="p-8 sm:p-10 bg-[#141313]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-garamond text-2xl sm:text-3xl font-normal text-[#ffffff] tracking-tight">
                Active Operations
              </h2>
              <button
                onClick={() => onNavigateToTab('TRANSACTIONS')}
                className="font-jetbrains text-[11px] text-[#8e9192] hover:text-[#ffffff] tracking-wider uppercase underline underline-offset-4 decoration-[#444748] transition cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Dense Ledger Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2b2a2a]">
                    <th className="py-2.5 pr-4 font-jetbrains text-[10px] font-bold text-[#8e9192] tracking-[0.1em] uppercase">
                      FAILURE ID
                    </th>
                    <th className="py-2.5 px-4 font-jetbrains text-[10px] font-bold text-[#8e9192] tracking-[0.1em] uppercase text-right">
                      AMOUNT
                    </th>
                    <th className="py-2.5 px-4 font-jetbrains text-[10px] font-bold text-[#8e9192] tracking-[0.1em] uppercase">
                      OPERATIONAL REASON
                    </th>
                    <th className="py-2.5 pl-4 font-jetbrains text-[10px] font-bold text-[#8e9192] tracking-[0.1em] uppercase text-right">
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2a2a]/60">
                  {activeOperations.map((txn) => {
                    const operationalReason = getOperationalReason(txn);
                    return (
                      <tr
                        key={txn.id}
                        id={`operation-row-${txn.id}`}
                        onClick={() => onSelectTransaction(txn)}
                        className="group hover:bg-[#1c1b1b] cursor-pointer transition-colors"
                      >
                        {/* Failure ID */}
                        <td className="py-4 pr-4 font-jetbrains text-[12px] font-bold text-[#ffffff] group-hover:text-[#4edea3] transition-colors whitespace-nowrap">
                          {txn.id}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-4 font-jetbrains text-[13px] font-bold text-[#ffffff] text-right whitespace-nowrap">
                          ₹{txn.amount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Operational Reason */}
                        <td className="py-4 px-4 font-hanken text-[13px] text-[#c4c7c5] max-w-xs sm:max-w-md truncate">
                          {operationalReason}
                        </td>

                        {/* Status */}
                        <td className="py-4 pl-4 text-right whitespace-nowrap">
                          {renderStatusBadge(txn)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: System Pulse + Live Intelligence Feed (4 Cols)             */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#2b2a2a] bg-[#0e0e0e] flex flex-col">
          
          {/* TOP RIGHT BLOCK: System Pulse Success Rate Visualization */}
          <div className="p-6 sm:p-8 border-b border-[#2b2a2a]">
            <div className="font-jetbrains text-[10px] font-bold tracking-[0.15em] text-[#8e9192] uppercase mb-6">
              SYSTEM PULSE: SUCCESS RATE
            </div>

            {/* Custom Technical Bar Chart Visualizer */}
            <div className="relative h-44 w-full flex items-end justify-between pt-6 pb-1">
              {/* Horizontal scale line marks */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                <div className="border-b border-[#444748] w-full flex justify-start">
                  <span className="font-jetbrains text-[8px] text-[#8e9192] -mt-2.5">100</span>
                </div>
                <div className="border-b border-[#444748] border-dashed w-full flex justify-start">
                  <span className="font-jetbrains text-[8px] text-[#8e9192] -mt-2.5">75</span>
                </div>
                <div className="border-b border-[#444748] border-dashed w-full flex justify-start">
                  <span className="font-jetbrains text-[8px] text-[#8e9192] -mt-2.5">50</span>
                </div>
              </div>

              {/* Bar columns */}
              <div className="w-full flex items-end justify-between space-x-2 z-10 pl-6 pr-1 h-36">
                <div className="flex-1 bg-[#201f1f] h-[68%] border border-[#2b2a2a]" />
                <div className="flex-1 bg-[#201f1f] h-[72%] border border-[#2b2a2a]" />
                <div className="flex-1 bg-[#201f1f] h-[70%] border border-[#2b2a2a]" />
                <div className="flex-1 bg-[#2b2a2a] h-[76%] border border-[#444748]" />
                <div className="flex-1 bg-[#2b2a2a] h-[82%] border border-[#444748]" />
                <div className="flex-1 bg-[#363434] h-[88%] border border-[#444748]" />
                
                {/* Active White Pillar with 92% Badge on top */}
                <div className="flex-1 relative flex flex-col items-center h-full justify-end">
                  <span className="font-jetbrains text-[10px] font-bold text-[#0e0e0e] bg-[#ffffff] px-1.5 py-0.5 mb-1.5 shadow">
                    {recoveryRatePercent}%
                  </span>
                  <div className="w-full bg-[#ffffff] h-[92%]" />
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM RIGHT BLOCK: Live Intelligence Monospace Terminal Feed */}
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between bg-[#0e0e0e]">
            <div>
              <div className="flex items-center space-x-2 font-jetbrains text-[10px] font-bold tracking-[0.15em] text-[#8e9192] uppercase mb-4">
                <span className="h-2 w-2 rounded-full bg-[#4edea3] inline-block animate-pulse" />
                <span className="text-[#e6e1e1]">LIVE INTELLIGENCE FEED</span>
              </div>

              {/* Terminal Code Block Container */}
              <div className="p-4 bg-[#141313] border border-[#2b2a2a] space-y-3.5 font-jetbrains text-[11px] leading-relaxed select-text overflow-y-auto max-h-[380px]">
                {terminalLogs.map((log, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-baseline space-x-2 text-[#8e9192]">
                      <span>[{log.time}]</span>
                      <span className={`font-bold ${log.tagColor}`}>&gt; {log.tag}</span>
                    </div>
                    <p className="text-[#c4c7c5] pl-4 text-[11px]">
                      {log.message}
                    </p>
                  </div>
                ))}

                {/* Idle Cursor Prompt */}
                <div className="flex items-baseline space-x-2 text-[#8e9192] pt-1">
                  <span>[14:32:15.00]</span>
                  <span>&gt; IDLE:</span>
                  <span className="inline-block w-2 h-3.5 bg-[#4edea3] animate-pulse align-middle" />
                </div>
              </div>
            </div>

            {/* Action link to Deep Diagnostics */}
            <div className="mt-4 pt-3 border-t border-[#2b2a2a] flex items-center justify-between">
              <span className="font-jetbrains text-[10px] text-[#8e9192] uppercase tracking-wider">
                COGNITIVE LOOP ACTIVE
              </span>
              <button
                onClick={() => onNavigateToTab('AI_AGENT')}
                className="font-jetbrains text-[10px] font-bold text-[#e6e1e1] hover:text-[#4edea3] transition uppercase tracking-wider underline underline-offset-4 decoration-[#444748]"
              >
                OPEN AGENT VIEW →
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
