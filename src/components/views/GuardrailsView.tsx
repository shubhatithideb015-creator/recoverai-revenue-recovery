/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AtRiskTransaction } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Building2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface GuardrailsViewProps {
  transactions: AtRiskTransaction[];
  onSelectTransaction: (txn: AtRiskTransaction) => void;
  onApproveHumanGate: (txn: AtRiskTransaction) => void;
}

interface PaymentRailItem {
  id: string;
  name: string;
  code: 'UPI' | 'CARD' | 'NETBANKING' | 'SUBSCRIPTION_MANDATE';
  status: 'HEALTHY' | 'DEGRADED';
  latency: string;
}

const PAYMENT_RAILS: PaymentRailItem[] = [
  {
    id: 'rail-upi',
    name: 'UPI',
    code: 'UPI',
    status: 'HEALTHY',
    latency: '142ms',
  },
  {
    id: 'rail-card',
    name: 'CARD',
    code: 'CARD',
    status: 'HEALTHY',
    latency: '285ms',
  },
  {
    id: 'rail-netbanking',
    name: 'NETBANKING',
    code: 'NETBANKING',
    status: 'HEALTHY',
    latency: '410ms',
  },
  {
    id: 'rail-mandate',
    name: 'SUBSCRIPTION_MANDATE',
    code: 'SUBSCRIPTION_MANDATE',
    status: 'DEGRADED',
    latency: '820ms',
  },
];

interface GuardrailTableRow {
  policy: string;
  category: string;
  configuration: string;
  enforcement: 'DETERMINISTIC_HARD_BLOCK' | 'HUMAN_INTERVENTION_GATE' | 'RATE_LIMITER';
  status: 'ACTIVE' | 'ENFORCED' | 'HEALTHY';
}

const GUARDRAIL_POLICIES: GuardrailTableRow[] = [
  {
    policy: 'Autonomous Recovery Ceiling',
    category: 'EXPOSURE_CONTROL',
    configuration: '₹50,000 threshold. Transactions exceeding require dual-factor operator authorization.',
    enforcement: 'HUMAN_INTERVENTION_GATE',
    status: 'ENFORCED',
  },
  {
    policy: 'Maximum Retries Policy',
    category: 'RAIL_HEALTH',
    configuration: 'Hard limit 3 automated retry attempts per transaction life cycle.',
    enforcement: 'DETERMINISTIC_HARD_BLOCK',
    status: 'ENFORCED',
  },
  {
    policy: 'Terminal Decline Protection',
    category: 'COMPLIANCE',
    configuration: 'Immediate zero-retry halt on CARD_EXPIRED, ACCOUNT_CLOSED, or FRAUD_SUSPECT.',
    enforcement: 'DETERMINISTIC_HARD_BLOCK',
    status: 'ACTIVE',
  },
  {
    policy: 'Discount Incentive Ceiling',
    category: 'COMMERCIAL',
    configuration: 'AI recovery discounts strictly clamped to 15.0% maximum.',
    enforcement: 'DETERMINISTIC_HARD_BLOCK',
    status: 'ENFORCED',
  },
  {
    policy: 'Velocity Throttling',
    category: 'CUSTOMER_FATIGUE',
    configuration: 'Maximum 1 SMS/WhatsApp and 2 push notifications per 24-hour cycle per customer.',
    enforcement: 'RATE_LIMITER',
    status: 'ACTIVE',
  },
  {
    policy: 'Autonomous Circuit Breaker',
    category: 'SYSTEM_RESILIENCY',
    configuration: 'Halts autonomous dispatch if rail timeout rate exceeds 25% over 5-minute sliding window.',
    enforcement: 'DETERMINISTIC_HARD_BLOCK',
    status: 'HEALTHY',
  },
];

export const GuardrailsView: React.FC<GuardrailsViewProps> = ({
  transactions,
  onSelectTransaction,
  onApproveHumanGate,
}) => {
  // Identify high-value gated transaction (specifically txn_rec_80193 or any ≥ ₹50,000)
  const gatedTransaction =
    transactions.find((t) => t.id === 'txn_rec_80193') ||
    transactions.find((t) => t.amount >= 50000) ||
    transactions[0];

  const pendingHumanGatedTxns = transactions.filter(
    (t) => t.amount >= 50000 && !t.humanApproved && t.status !== 'RECOVERED'
  );

  const getRailIcon = (code: PaymentRailItem['code']) => {
    switch (code) {
      case 'UPI':
        return <Smartphone className="h-3.5 w-3.5 text-[#4edea3]" />;
      case 'CARD':
        return <CreditCard className="h-3.5 w-3.5 text-[#4edea3]" />;
      case 'NETBANKING':
        return <Building2 className="h-3.5 w-3.5 text-[#4edea3]" />;
      case 'SUBSCRIPTION_MANDATE':
        return <RefreshCw className="h-3.5 w-3.5 text-[#f59e0b]" />;
    }
  };

  return (
    <div id="network-policy-page" className="space-y-6 pb-12 font-hanken">
      {/* ========================================================================= */}
      {/* 1. HEADER                                                                 */}
      {/* ========================================================================= */}
      <div className="border-b border-[#2b2a2a] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-garamond text-3xl font-medium tracking-tight text-[#ffffff]">
            Network &amp; Policy
          </h1>
          <p className="text-xs text-[#8e9192] font-jetbrains mt-1">
            Operational controls for safe AI recovery
          </p>
        </div>

        {/* Three compact status indicators */}
        <div className="flex flex-wrap items-center gap-2 font-jetbrains text-xs">
          <div className="px-3 py-1.5 bg-[#141313] border border-[#2b2a2a] flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-[#4edea3] inline-block animate-pulse" />
            <span className="text-[#8e9192]">Deterministic Enforcement:</span>
            <span className="text-[#4edea3] font-bold">HEALTHY</span>
          </div>

          <div className="px-3 py-1.5 bg-[#141313] border border-[#2b2a2a] flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-[#4edea3] inline-block" />
            <span className="text-[#8e9192]">Rails:</span>
            <span className="text-[#ffffff] font-bold">4/4 HEALTHY</span>
          </div>

          <div className="px-3 py-1.5 bg-[#16130e] border border-[#f59e0b]/40 flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b] inline-block animate-pulse" />
            <span className="text-[#8e9192]">Human Gates:</span>
            <span className="text-[#f59e0b] font-bold">
              {pendingHumanGatedTxns.length > 0
                ? `${pendingHumanGatedTxns.length} PENDING`
                : '1 PENDING'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SINGLE VISUAL EXPLANATION: PROPOSED → EVALUATE → DISPATCH               */}
      {/* ========================================================================= */}
      <div className="px-4 py-3 bg-[#141313] border border-[#2b2a2a] flex flex-col sm:flex-row items-center justify-between gap-3 font-jetbrains text-xs">
        <div className="text-[11px] text-[#8e9192] uppercase font-bold tracking-wider flex items-center space-x-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#4edea3]" />
          <span className="text-[#c4c7c5]">SAFETY PIPELINE:</span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] font-medium">
            AI PROPOSES
          </span>
          <span className="text-[#8e9192]">→</span>
          <span className="px-2.5 py-1 bg-[#0e0e0e] border border-[#4edea3]/40 text-[#4edea3] font-bold">
            GUARDRAILS EVALUATE
          </span>
          <span className="text-[#8e9192]">→</span>
          <span className="px-2.5 py-1 bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] font-bold">
            SAFE ACTION DISPATCHED
          </span>
        </div>

        <div className="text-[10px] text-[#8e9192] hidden lg:block">
          Deterministic execution // Sub-millisecond validation
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GATEWAY & RAIL HEALTH (4 compact cards in one row)                     */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-garamond text-xl font-medium text-[#ffffff]">
            Gateway &amp; Rail Health
          </h2>
          <span className="text-[10px] font-jetbrains text-[#8e9192] uppercase tracking-wider">
            SETTLEMENT RAILS TELEMETRY
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-jetbrains">
          {PAYMENT_RAILS.map((rail) => {
            const isHealthy = rail.status === 'HEALTHY';

            return (
              <div
                key={rail.id}
                id={`rail-card-${rail.code.toLowerCase()}`}
                className="p-3.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#ffffff] flex items-center space-x-1.5">
                    {getRailIcon(rail.code)}
                    <span>{rail.code}</span>
                  </div>
                  <div className="text-[11px] text-[#8e9192]">{rail.latency}</div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isHealthy ? 'bg-[#4edea3] animate-pulse' : 'bg-[#f59e0b] animate-pulse'
                    }`}
                  />
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold border tracking-wider ${
                      isHealthy
                        ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                        : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30'
                    }`}
                  >
                    {rail.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE GUARDRAILS (Compact Policy Table / Card)                        */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-garamond text-xl font-medium text-[#ffffff]">
            Active Guardrails
          </h2>
          <span className="text-[10px] font-jetbrains text-[#8e9192] uppercase tracking-wider">
            POLICY ENFORCEMENT CONFIGURATION
          </span>
        </div>

        <div className="border border-[#2b2a2a] bg-[#141313] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-jetbrains text-xs">
              <thead>
                <tr className="border-b border-[#2b2a2a] bg-[#0e0e0e] text-[10px] uppercase text-[#8e9192] tracking-wider">
                  <th className="py-2.5 px-4 font-bold">POLICY &amp; SCOPE</th>
                  <th className="py-2.5 px-4 font-bold">ENFORCEMENT MODE</th>
                  <th className="py-2.5 px-4 font-bold">THRESHOLD / CONFIGURATION</th>
                  <th className="py-2.5 px-4 font-bold text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b2a2a]">
                {GUARDRAIL_POLICIES.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#181717] transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-[#ffffff] font-medium">{row.policy}</div>
                      <div className="text-[9px] text-[#8e9192] uppercase mt-0.5">{row.category}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border tracking-wider uppercase ${
                        row.enforcement === 'HUMAN_INTERVENTION_GATE'
                          ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
                          : 'bg-[#1c1b1b] text-[#c4c7c5] border-[#2b2a2a]'
                      }`}>
                        {row.enforcement.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#c4c7c5] max-w-md">
                      {row.configuration}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30 tracking-wider">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BLOCKED ACTIONS & POLICY ENFORCEMENTS                                   */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-garamond text-xl font-medium text-[#ffffff]">
            Blocked Actions &amp; Intercepts
          </h2>
          <span className="text-[10px] font-jetbrains text-[#ffb4ab] uppercase tracking-wider font-bold">
            ZERO-TRUST POLICY INTERCEPTS
          </span>
        </div>

        <div className="border border-[#2b2a2a] bg-[#0e0e0e] divide-y divide-[#2b2a2a] font-jetbrains text-xs">
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#141313]">
            <div className="flex items-center space-x-2.5">
              <span className="px-1.5 py-0.5 bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 text-[10px] font-bold">
                BLOCKED
              </span>
              <span className="text-[#ffffff] font-bold">CARD_EXPIRED_RETRY_HALTED</span>
              <span className="text-[#8e9192]">•</span>
              <span className="text-[#c4c7c5]">Rule: Terminal Decline Protection</span>
            </div>
            <div className="text-[#8e9192] text-[10px]">
              AI retry rejected; routed to Card Update link instead.
            </div>
          </div>

          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#141313]">
            <div className="flex items-center space-x-2.5">
              <span className="px-1.5 py-0.5 bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 text-[10px] font-bold">
                HELD
              </span>
              <span className="text-[#ffffff] font-bold">TXN_REC_80193_HIGH_VALUE_HELD</span>
              <span className="text-[#8e9192]">•</span>
              <span className="text-[#c4c7c5]">Rule: Autonomous Recovery Ceiling (₹1,45,000 &gt; ₹50,000)</span>
            </div>
            <div className="text-[#8e9192] text-[10px]">
              Autonomous dispatch paused pending operator authorization.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. HUMAN REVIEW (One Prominent Card for txn_rec_80193)                     */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-garamond text-xl font-medium text-[#ffffff]">
            Human Review
          </h2>
          <span className="text-[10px] font-jetbrains text-[#f59e0b] uppercase tracking-wider font-bold">
            {pendingHumanGatedTxns.length > 0
              ? `${pendingHumanGatedTxns.length} TRANSACTION REQUIRING ATTENTION`
              : 'HUMAN GATES REVIEW'}
          </span>
        </div>

        {gatedTransaction ? (
          <div
            id="gated-human-review-card"
            className="border border-[#f59e0b]/50 bg-[#16130e] p-5 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 font-jetbrains">
              {/* Left Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#ffffff] font-bold text-sm">
                    Transaction: {gatedTransaction.id}
                  </span>
                  <span className="text-[#8e9192]">•</span>
                  <span className="text-[#c4c7c5]">
                    Customer:{' '}
                    <strong className="text-white font-semibold">
                      {gatedTransaction.customerName || 'Vikramaditya Rao'}
                    </strong>
                  </span>
                  {gatedTransaction.merchantName && (
                    <>
                      <span className="text-[#8e9192]">•</span>
                      <span className="text-[#8e9192]">({gatedTransaction.merchantName})</span>
                    </>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <div className="text-[#ffb4ab] flex items-center space-x-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b] flex-shrink-0" />
                    <span>Reason: Amount exceeds autonomous recovery threshold</span>
                  </div>

                  <div className="text-[#8e9192] text-[11px] flex flex-wrap items-center gap-3 pt-0.5">
                    <span>
                      AI Recommendation:{' '}
                      <strong className="text-[#e6e1e1]">
                        {gatedTransaction.diagnosis?.proposedIntervention?.title ||
                          'Enterprise Account Recovery'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Guardrail Decision:{' '}
                      <span className="text-[#f59e0b] font-bold bg-[#f59e0b]/15 px-1.5 py-0.5 border border-[#f59e0b]/30">
                        HUMAN REVIEW
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action & Amount */}
              <div className="flex items-center space-x-5 self-end lg:self-center">
                <div className="text-right">
                  <div className="text-[10px] text-[#8e9192] uppercase">AMOUNT</div>
                  <div className="font-garamond text-3xl font-medium text-[#f59e0b]">
                    ₹{gatedTransaction.amount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="view-inspector-btn"
                    onClick={() => onSelectTransaction(gatedTransaction)}
                    className="px-4 py-2.5 bg-[#1c1b1b] hover:bg-[#2b2a2a] text-[#ffffff] border border-[#2b2a2a] text-xs font-bold uppercase transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>VIEW INSPECTOR</span>
                    <ExternalLink className="h-3 w-3 text-[#8e9192]" />
                  </button>

                  {!gatedTransaction.humanApproved && (
                    <button
                      type="button"
                      id="authorize-human-gate-btn"
                      onClick={() => onApproveHumanGate(gatedTransaction)}
                      className="px-4 py-2.5 bg-[#4edea3] hover:bg-[#3ec48e] text-[#0e0e0e] text-xs font-bold uppercase transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>AUTHORIZE</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between font-jetbrains text-xs text-[#8e9192]">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-[#4edea3]" />
              <span>All high-value transactions cleared. Zero human gates currently pending.</span>
            </div>
            <span className="text-[10px] text-[#4edea3] font-bold">ALL GATES CLEARED</span>
          </div>
        )}
      </div>
    </div>
  );
};


