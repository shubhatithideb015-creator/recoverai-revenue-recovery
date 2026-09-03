/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AtRiskTransaction, FailureCategory, TransactionStatus } from '../types';
import {
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Phone,
  Mail,
  UserCheck,
  Zap,
} from 'lucide-react';

interface TransactionQueueProps {
  transactions: AtRiskTransaction[];
  selectedTransaction: AtRiskTransaction | null;
  onSelectTransaction: (txn: AtRiskTransaction) => void;
  onRunBatchDiagnose: () => void;
  isDiagnosingBatch: boolean;
}

export const TransactionQueue: React.FC<TransactionQueueProps> = ({
  transactions,
  selectedTransaction,
  onSelectTransaction,
  onRunBatchDiagnose,
  isDiagnosingBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.gatewayErrorCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || txn.failureCategory === selectedCategory;

    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'PENDING' && txn.status !== 'RECOVERED') ||
      txn.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'DETECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Detected
          </span>
        );
      case 'DIAGNOSING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
            <Sparkles className="w-3 h-3 mr-1" />
            Diagnosing
          </span>
        );
      case 'REQUIRES_HUMAN_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <UserCheck className="w-3 h-3 mr-1" />
            Human Approval Req.
          </span>
        );
      case 'ACTION_SCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Zap className="w-3 h-3 mr-1" />
            Intervention Live
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Recovered ₹
          </span>
        );
      case 'REJECTED_GUARDRAIL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Guardrail Block
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getFailureLabel = (cat: FailureCategory) => {
    switch (cat) {
      case 'SOFT_DECLINE_NETWORK':
        return { label: 'Network Timeout (Soft)', color: 'text-amber-400 bg-amber-400/10' };
      case 'HARD_DECLINE_CARD_EXPIRED':
        return { label: 'Card Expired (Terminal)', color: 'text-purple-400 bg-purple-400/10' };
      case 'CHECKOUT_ABANDONED':
        return { label: 'Checkout Dropout', color: 'text-blue-400 bg-blue-400/10' };
      case 'INSUFFICIENT_FUNDS':
        return { label: 'Insufficient Balance', color: 'text-orange-400 bg-orange-400/10' };
      case 'AUTH_FAILED_OTP':
        return { label: '3DS OTP Timeout', color: 'text-rose-400 bg-rose-400/10' };
      case 'UPI_LIMIT_EXCEEDED':
        return { label: 'UPI Limit Cap', color: 'text-teal-400 bg-teal-400/10' };
      default:
        return { label: cat, color: 'text-slate-400 bg-slate-400/10' };
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>At-Risk Revenue Stream</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
              {filteredTransactions.length} events
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time webhook queue of failed payments and abandoned carts
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-batch-diagnose"
            onClick={onRunBatchDiagnose}
            disabled={isDiagnosingBatch}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isDiagnosingBatch ? 'animate-spin' : ''}`} />
            <span>{isDiagnosingBatch ? 'Agent Diagnosing All...' : 'Diagnose All with AI'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            id="input-search-transactions"
            type="text"
            placeholder="Search order, customer, error..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          <span className="text-slate-500 text-[11px] font-medium mr-1 flex items-center">
            <Filter className="h-3 w-3 mr-1" /> Type:
          </span>
          {['ALL', 'SOFT_DECLINE_NETWORK', 'HARD_DECLINE_CARD_EXPIRED', 'CHECKOUT_ABANDONED', 'INSUFFICIENT_FUNDS'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Failures' : cat.replace(/_/g, ' ').slice(0, 16)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-slate-800/80 max-h-[580px] overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/40 mb-2" />
            <p className="text-sm font-medium text-slate-400">No matching transactions found</p>
            <p className="text-xs text-slate-600 mt-1">Try resetting search filters or inject a test failure.</p>
          </div>
        ) : (
          filteredTransactions.map((txn) => {
            const isSelected = selectedTransaction?.id === txn.id;
            const failureInfo = getFailureLabel(txn.failureCategory);

            return (
              <div
                key={txn.id}
                id={`txn-row-${txn.id}`}
                onClick={() => onSelectTransaction(txn)}
                className={`p-4 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-950/20 border-l-4 border-emerald-500'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Left: Customer & Merchant Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {txn.customerName}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {txn.customerTier.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 truncate">{txn.merchantName}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-[11px] text-slate-500">{txn.orderId}</span>
                    <span className="text-slate-600">•</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${failureInfo.color}`}>
                      {failureInfo.label}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {txn.paymentMethod} • {txn.gatewayErrorCode}
                    </span>
                  </div>

                  {/* AI Quick Insight if diagnosed */}
                  {txn.diagnosis && (
                    <div className="mt-2 text-xs text-emerald-300/90 flex items-center space-x-1.5 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40">
                      <Sparkles className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        <strong>AI Strategy:</strong> {txn.diagnosis.proposedIntervention.title} ({txn.diagnosis.recoveryProbability}% win prob.)
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Amount & Status Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-bold text-white tracking-tight">
                      ₹{txn.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5">{getStatusBadge(txn.status)}</div>
                  </div>

                  <button
                    id={`inspect-btn-${txn.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTransaction(txn);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
