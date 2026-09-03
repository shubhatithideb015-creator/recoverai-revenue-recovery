/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AtRiskTransaction } from '../../types';
import {
  Search,
  Sparkles,
  ArrowUpDown,
  Smartphone,
  CreditCard,
  Building,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: AtRiskTransaction[];
  onSelectTransaction: (txn: AtRiskTransaction) => void;
  onRunBatchDiagnose: () => void;
  isDiagnosingBatch: boolean;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onSelectTransaction,
  onRunBatchDiagnose,
  isDiagnosingBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'time' | 'amount' | 'probability'>('time');

  // Summary Ledger Metrics
  const metrics = useMemo(() => {
    const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);
    const recoveredVolume = transactions
      .filter((t) => t.status === 'RECOVERED')
      .reduce((acc, t) => acc + (t.recoveredAmount || t.amount), 0);
    const atRiskVolume = transactions
      .filter((t) => t.status !== 'RECOVERED')
      .reduce((acc, t) => acc + t.amount, 0);
    const gatedCount = transactions.filter(
      (t) => t.status === 'REQUIRES_HUMAN_APPROVAL' || (t.amount >= 50000 && !t.humanApproved)
    ).length;
    const undiagnosedCount = transactions.filter((t) => !t.diagnosis).length;

    return {
      totalVolume,
      recoveredVolume,
      atRiskVolume,
      gatedCount,
      undiagnosedCount,
      totalCount: transactions.length,
    };
  }, [transactions]);

  // Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.gatewayErrorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (txn.gatewayErrorMessage &&
          txn.gatewayErrorMessage.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'RECOVERED' && txn.status === 'RECOVERED') ||
        (statusFilter === 'REQUIRES_HUMAN_APPROVAL' &&
          (txn.status === 'REQUIRES_HUMAN_APPROVAL' || (txn.amount >= 50000 && !txn.humanApproved))) ||
        (statusFilter === 'ACTION_SCHEDULED' &&
          (txn.status === 'ACTION_SCHEDULED' || txn.status === 'EXECUTING_RECOVERY')) ||
        (statusFilter === 'PENDING' && txn.status !== 'RECOVERED');

      const matchesCategory =
        categoryFilter === 'ALL' || txn.failureCategory === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [transactions, searchTerm, statusFilter, categoryFilter]);

  // Sorting
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'probability') {
        const probA = a.diagnosis?.recoveryProbability ?? -1;
        const probB = b.diagnosis?.recoveryProbability ?? -1;
        return probB - probA;
      }
      const dateA = new Date(a.createdAt || a.lastAttemptAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.lastAttemptAt || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredTransactions, sortBy]);

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

  const formatTimestamp = (rawDate?: string) => {
    if (!rawDate) return '--:--:--';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return '--:--:--';
      return d.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '--:--:--';
    }
  };

  return (
    <div className="space-y-0 pb-16 font-hanken">
      {/* ========================================================================= */}
      {/* 1. EDITORIAL HEADER SECTION (EXECUTIVE ASSET LEDGER)                      */}
      {/* ========================================================================= */}
      <div className="pb-6 border-b border-[#2b2a2a]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="font-jetbrains text-[10px] font-bold tracking-[0.2em] text-[#8e9192] uppercase flex items-center space-x-2">
              <span>RECOVERAI TERMINAL</span>
              <span className="text-[#2b2a2a]">//</span>
              <span className="text-[#ffffff]">ASSET LEDGER</span>
            </div>
            <h1 className="font-garamond text-4xl sm:text-5xl font-medium tracking-tight text-[#ffffff] mt-1.5">
              Active Operations &amp; Ledger
            </h1>
            <p className="font-hanken text-xs sm:text-sm text-[#8e9192] max-w-2xl mt-1 leading-relaxed">
              Institutional order flow, real-time gateway telemetry, deterministic policy evaluations, and AI-directed recovery settlements.
            </p>
          </div>

          {/* Quick Ledger Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0e0e0e] border border-[#2b2a2a] p-3 text-left">
            <div>
              <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                TOTAL VOLUME
              </div>
              <div className="font-jetbrains text-xs sm:text-sm font-bold text-[#ffffff] mt-0.5">
                ₹{metrics.totalVolume.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="border-l border-[#2b2a2a] pl-3">
              <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                RECOVERED
              </div>
              <div className="font-jetbrains text-xs sm:text-sm font-bold text-[#4edea3] mt-0.5">
                ₹{metrics.recoveredVolume.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="border-l border-[#2b2a2a] pl-3">
              <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                AT RISK
              </div>
              <div className="font-jetbrains text-xs sm:text-sm font-bold text-[#ffb4ab] mt-0.5">
                ₹{metrics.atRiskVolume.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="border-l border-[#2b2a2a] pl-3">
              <div className="font-jetbrains text-[9px] font-bold text-[#8e9192] uppercase tracking-wider">
                HUMAN GATES
              </div>
              <div className="font-jetbrains text-xs sm:text-sm font-bold text-[#f59e0b] mt-0.5">
                {metrics.gatedCount} PENDING
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT TERMINAL CONTROLS & FILTER BAR                                  */}
      {/* ========================================================================= */}
      <div className="py-3 bg-[#0e0e0e] border-b border-[#2b2a2a] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Monospace Search Input */}
        <div className="relative flex-1 max-w-lg flex items-center bg-[#141313] border border-[#2b2a2a] px-3 py-1.5 focus-within:border-[#ffffff] transition">
          <span className="font-jetbrains text-[11px] text-[#8e9192] mr-2 flex-shrink-0">&gt;</span>
          <Search className="h-3.5 w-3.5 text-[#8e9192] mr-2 flex-shrink-0" />
          <input
            type="text"
            id="input-transaction-search"
            placeholder="FILTER BY ID, CUSTOMER, MERCHANT, ERROR CODE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-[#ffffff] placeholder-[#8e9192] text-xs font-jetbrains focus:outline-none uppercase"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#8e9192] hover:text-[#ffffff] ml-1.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter & Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-[#141313] border border-[#2b2a2a] px-2 py-1">
            <span className="font-jetbrains text-[9px] text-[#8e9192] uppercase mr-1.5">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[#ffffff] font-jetbrains text-[11px] uppercase focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#141313] text-[#ffffff]">ALL ({transactions.length})</option>
              <option value="PENDING" className="bg-[#141313] text-[#ffffff]">PENDING RECOVERY</option>
              <option value="REQUIRES_HUMAN_APPROVAL" className="bg-[#141313] text-[#ffffff]">HUMAN GATED</option>
              <option value="ACTION_SCHEDULED" className="bg-[#141313] text-[#ffffff]">ACTION DISPATCHED</option>
              <option value="RECOVERED" className="bg-[#141313] text-[#ffffff]">SETTLED / RECOVERED</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center bg-[#141313] border border-[#2b2a2a] px-2 py-1">
            <span className="font-jetbrains text-[9px] text-[#8e9192] uppercase mr-1.5">TAXONOMY:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-[#ffffff] font-jetbrains text-[11px] uppercase focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL" className="bg-[#141313] text-[#ffffff]">ALL CATEGORIES</option>
              <option value="SOFT_DECLINE_NETWORK" className="bg-[#141313] text-[#ffffff]">NETWORK TIMEOUT</option>
              <option value="HARD_DECLINE_CARD_EXPIRED" className="bg-[#141313] text-[#ffffff]">EXPIRED CARD</option>
              <option value="UPI_LIMIT_EXCEEDED" className="bg-[#141313] text-[#ffffff]">UPI DAILY LIMIT</option>
              <option value="CHECKOUT_ABANDONED" className="bg-[#141313] text-[#ffffff]">CART DROPOUT</option>
              <option value="INSUFFICIENT_FUNDS" className="bg-[#141313] text-[#ffffff]">INSUFFICIENT FUNDS</option>
            </select>
          </div>

          {/* Sort Switcher */}
          <button
            onClick={() =>
              setSortBy((prev) =>
                prev === 'time' ? 'amount' : prev === 'amount' ? 'probability' : 'time'
              )
            }
            className="flex items-center space-x-1 px-3 py-1 bg-[#141313] hover:bg-[#1c1b1b] text-[#ffffff] border border-[#2b2a2a] font-jetbrains text-[11px] uppercase tracking-wider transition cursor-pointer"
            title="Toggle Sorting Strategy"
          >
            <ArrowUpDown className="h-3 w-3 text-[#8e9192]" />
            <span>SORT: {sortBy}</span>
          </button>

          {/* Batch Diagnose Action */}
          {metrics.undiagnosedCount > 0 && (
            <button
              onClick={onRunBatchDiagnose}
              disabled={isDiagnosingBatch}
              className="flex items-center space-x-1.5 px-3 py-1 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {isDiagnosingBatch ? 'ANALYZING...' : `DIAGNOSE (${metrics.undiagnosedCount})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DENSE INSTITUTIONAL TRADING TERMINAL TABLE                              */}
      {/* ========================================================================= */}
      <div className="border border-[#2b2a2a] border-t-0 bg-[#0e0e0e] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#2b2a2a] bg-[#141313] font-jetbrains text-[10px] text-[#8e9192] uppercase tracking-wider select-none">
              <th className="py-2.5 px-4 font-semibold">TRANSACTION / TIME</th>
              <th className="py-2.5 px-4 font-semibold">CUSTOMER &amp; TIER</th>
              <th className="py-2.5 px-4 font-semibold">MERCHANT &amp; RAIL</th>
              <th className="py-2.5 px-4 font-semibold">GATEWAY TELEMETRY</th>
              <th className="py-2.5 px-4 font-semibold text-right">AMOUNT (INR)</th>
              <th className="py-2.5 px-4 font-semibold text-center">AI WIN PROB</th>
              <th className="py-2.5 px-4 font-semibold text-center">GUARDRAIL</th>
              <th className="py-2.5 px-4 font-semibold text-right">SETTLEMENT STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b2a2a]/70 text-[#e6e1e1] font-hanken">
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-[#8e9192] font-jetbrains text-xs">
                  <div className="space-y-1">
                    <div>NO TRANSACTIONS MATCHING CRITERIA</div>
                    <div className="text-[10px] text-[#8e9192]/60">Adjust active filters or clear search term</div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedTransactions.map((txn) => {
                const isHighValueGated = txn.amount >= 50000 && !txn.humanApproved;
                const isRecovered = txn.status === 'RECOVERED';
                const isDispatched =
                  txn.status === 'ACTION_SCHEDULED' || txn.status === 'EXECUTING_RECOVERY';

                return (
                  <tr
                    key={txn.id}
                    id={`txn-row-${txn.id}`}
                    onClick={() => onSelectTransaction(txn)}
                    className="hover:bg-[#1c1b1b] cursor-pointer transition-colors group select-none"
                  >
                    {/* 1. Txn ID & Timestamp */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-jetbrains font-bold text-xs text-[#ffffff] group-hover:text-[#4edea3] transition-colors">
                          {txn.id}
                        </span>
                      </div>
                      <div className="font-jetbrains text-[10px] text-[#8e9192] mt-0.5">
                        {formatTimestamp(txn.createdAt || txn.lastAttemptAt)}
                      </div>
                    </td>

                    {/* 2. Customer & Tier */}
                    <td className="py-2.5 px-4">
                      <div className="text-xs font-medium text-[#ffffff]">
                        {txn.customerName}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span
                          className={`font-jetbrains text-[9px] px-1 py-0.2 border uppercase ${
                            txn.customerTier === 'HIGH_VALUE'
                              ? 'bg-[#1c1b1b] border-[#f59e0b]/50 text-[#f59e0b]'
                              : 'bg-[#141313] border-[#2b2a2a] text-[#8e9192]'
                          }`}
                        >
                          {txn.customerTier}
                        </span>
                        <span className="font-jetbrains text-[10px] text-[#8e9192] truncate max-w-[100px]">
                          {txn.customerId}
                        </span>
                      </div>
                    </td>

                    {/* 3. Merchant & Rail */}
                    <td className="py-2.5 px-4">
                      <div className="text-xs text-[#e6e1e1] truncate max-w-[130px]">
                        {txn.merchantName}
                      </div>
                      <div className="flex items-center space-x-1 font-jetbrains text-[10px] text-[#8e9192] mt-0.5">
                        {getMethodIcon(txn.paymentMethod)}
                        <span>{txn.paymentMethod}</span>
                      </div>
                    </td>

                    {/* 4. Gateway Telemetry & Error Code */}
                    <td className="py-2.5 px-4">
                      <div className="inline-block font-jetbrains text-[10px] font-bold px-1.5 py-0.5 bg-[#141313] border border-[#2b2a2a] text-[#ffb4ab]">
                        {txn.gatewayErrorCode}
                      </div>
                      <div className="text-[11px] text-[#8e9192] mt-0.5 truncate max-w-[170px]">
                        {txn.gatewayErrorMessage || 'Card network decline'}
                      </div>
                    </td>

                    {/* 5. Amount (Prominent & Right-aligned) */}
                    <td className="py-2.5 px-4 text-right">
                      <div className="font-garamond text-base font-medium text-[#ffffff]">
                        ₹{txn.amount.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="font-jetbrains text-[9px] text-[#8e9192]">
                        RETRIES: {txn.retryCount}/{txn.maxRetries}
                      </div>
                    </td>

                    {/* 6. AI Recovery Probability */}
                    <td className="py-2.5 px-4 text-center">
                      {txn.diagnosis ? (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-jetbrains font-bold text-xs ${
                              txn.diagnosis.recoveryProbability >= 70
                                ? 'text-[#4edea3]'
                                : txn.diagnosis.recoveryProbability >= 40
                                ? 'text-[#f59e0b]'
                                : 'text-[#ffb4ab]'
                            }`}
                          >
                            {txn.diagnosis.recoveryProbability}%
                          </span>
                          <span className="font-jetbrains text-[9px] text-[#8e9192] truncate max-w-[100px]">
                            {txn.diagnosis.proposedIntervention.channel}
                          </span>
                        </div>
                      ) : (
                        <span className="font-jetbrains text-[10px] px-2 py-0.5 bg-[#141313] border border-[#2b2a2a] text-[#8e9192]">
                          PENDING AI
                        </span>
                      )}
                    </td>

                    {/* 7. Guardrail Status */}
                    <td className="py-2.5 px-4 text-center">
                      {isHighValueGated ? (
                        <span className="font-jetbrains text-[10px] font-bold px-2 py-0.5 bg-[#1c1b1b] border border-[#f59e0b]/50 text-[#f59e0b] inline-block">
                          HUMAN REVIEW
                        </span>
                      ) : txn.guardrailEvaluation?.allPassed !== false ? (
                        <span className="font-jetbrains text-[10px] px-2 py-0.5 bg-[#141313] border border-[#2b2a2a] text-[#4edea3] inline-block">
                          PASS (5/5)
                        </span>
                      ) : (
                        <span className="font-jetbrains text-[10px] font-bold px-2 py-0.5 bg-[#1c1b1b] border border-[#ffb4ab]/50 text-[#ffb4ab] inline-block">
                          BLOCKED
                        </span>
                      )}
                    </td>

                    {/* 8. Settlement / Recovery Status */}
                    <td className="py-2.5 px-4 text-right">
                      {isRecovered ? (
                        <div className="inline-flex items-center space-x-1.5 text-[#4edea3] font-jetbrains text-[11px] font-bold">
                          <span className="h-1.5 w-1.5 rounded-none bg-[#4edea3]" />
                          <span>RECOVERED</span>
                        </div>
                      ) : isHighValueGated ? (
                        <div className="inline-flex items-center space-x-1.5 text-[#f59e0b] font-jetbrains text-[11px] font-bold">
                          <span className="h-1.5 w-1.5 rounded-none bg-[#f59e0b]" />
                          <span>GATED</span>
                        </div>
                      ) : isDispatched ? (
                        <div className="inline-flex items-center space-x-1.5 text-[#ffffff] font-jetbrains text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-none bg-[#ffffff]" />
                          <span>DISPATCHED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1.5 text-[#8e9192] font-jetbrains text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-none bg-[#8e9192]" />
                          <span>DETECTED</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ========================================================================= */}
        {/* 4. MONOSPACE FORENSIC TELEMETRY FOOTER                                    */}
        {/* ========================================================================= */}
        <div className="p-3 bg-[#141313] border-t border-[#2b2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-jetbrains text-[#8e9192] select-none">
          <div className="flex items-center space-x-3">
            <span>SHOWING {sortedTransactions.length} OF {transactions.length} RECORDS</span>
            <span>|</span>
            <span>SORT: {sortBy.toUpperCase()}</span>
            <span>|</span>
            <span>FILTER: {statusFilter}</span>
          </div>
          <div className="text-[10px] text-[#8e9192]">
            SELECT ANY ROW TO ENGAGE COGNITIVE RECOVERY INSPECTOR
          </div>
        </div>
      </div>
    </div>
  );
};
