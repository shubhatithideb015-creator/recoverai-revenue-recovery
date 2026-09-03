/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AtRiskTransaction, SimulationPreset, AuditLogEntry } from '../../types';
import { CANONICAL_PRESETS } from '../../data/transactionStore';
import {
  Terminal,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  ExternalLink,
  Cpu,
  Layers,
  ChevronRight,
  Check,
  Activity,
} from 'lucide-react';

interface SimulationLabViewProps {
  onSelectPreset: (preset: SimulationPreset) => void;
  onOpenCustomInjector: () => void;
  transactions: AtRiskTransaction[];
  onSelectTransaction: (txn: AtRiskTransaction) => void;
  onDiagnose?: (txn: AtRiskTransaction) => Promise<void>;
  onApproveHumanGate?: (txn: AtRiskTransaction) => void;
  onExecuteAction?: (txn: AtRiskTransaction) => Promise<void>;
  onSettlePayment?: (txn: AtRiskTransaction) => void;
  auditLogs?: AuditLogEntry[];
  isProcessing?: boolean;
}

export const SimulationLabView: React.FC<SimulationLabViewProps> = ({
  onSelectPreset,
  onOpenCustomInjector,
  transactions,
  onSelectTransaction,
  onDiagnose,
  onApproveHumanGate,
  onExecuteAction,
  onSettlePayment,
  auditLogs = [],
  isProcessing = false,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    CANONICAL_PRESETS[0]?.id || 'sim_upi_timeout'
  );
  const [activeInjectedTxnId, setActiveInjectedTxnId] = useState<string | null>(null);
  const [isExecutingSimulation, setIsExecutingSimulation] = useState(false);

  const activePreset = useMemo(() => {
    return CANONICAL_PRESETS.find((p) => p.id === selectedPresetId) || CANONICAL_PRESETS[0];
  }, [selectedPresetId]);

  // Find the active transaction in the centralized state
  const activeTransaction = useMemo(() => {
    if (activeInjectedTxnId) {
      const found = transactions.find(
        (t) => t.id === activeInjectedTxnId || t.transactionId === activeInjectedTxnId
      );
      if (found) return found;
    }
    // Try matching by preset template id or transactionId
    const tplId = activePreset.transactionTemplate.id || activePreset.transactionTemplate.transactionId;
    if (tplId) {
      const found = transactions.find((t) => t.id === tplId || t.transactionId === tplId);
      if (found) return found;
    }
    // Match by failure code and rail
    const matched = transactions.find(
      (t) =>
        (t.failureCode === activePreset.transactionTemplate.failureCode ||
         t.gatewayErrorCode === activePreset.transactionTemplate.gatewayErrorCode) &&
        (t.paymentRail === activePreset.transactionTemplate.paymentRail ||
         t.paymentMethod === activePreset.transactionTemplate.paymentMethod)
    );
    return matched || null;
  }, [activeInjectedTxnId, transactions, activePreset]);

  // Derive scenario expected strategy & risk profile
  const getScenarioMetadata = (preset: SimulationPreset) => {
    switch (preset.id) {
      case 'sim_upi_timeout':
        return {
          strategy: 'Smart retry schedule or instant WhatsApp UPI link',
          riskLevel: 'LOW',
          riskLabel: 'LOW (Autonomous Permitted)',
          riskColor: 'text-[#4edea3] border-[#4edea3]/30 bg-[#4edea3]/10',
        };
      case 'sim_card_expired':
        return {
          strategy: 'Payment method update portal via Email (zero retries)',
          riskLevel: 'LOW',
          riskLabel: 'LOW (Zero-Retry Enforced)',
          riskColor: 'text-[#4edea3] border-[#4edea3]/30 bg-[#4edea3]/10',
        };
      case 'sim_high_val_guardrail':
        return {
          strategy: 'High-touch recovery link with operator sign-off',
          riskLevel: 'CRITICAL',
          riskLabel: 'CRITICAL (Human Approval Required ≥₹50k)',
          riskColor: 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10',
        };
      case 'sim_insufficient_funds':
        return {
          strategy: 'Delayed retry on salary cycle + alternate rail link',
          riskLevel: 'LOW',
          riskLabel: 'LOW (Autonomous Permitted)',
          riskColor: 'text-[#4edea3] border-[#4edea3]/30 bg-[#4edea3]/10',
        };
      case 'sim_upi_limit':
        return {
          strategy: 'Pivot from blocked UPI rail to Netbanking/Card link',
          riskLevel: 'LOW',
          riskLabel: 'LOW (Rail-Switch Strategy)',
          riskColor: 'text-[#4edea3] border-[#4edea3]/30 bg-[#4edea3]/10',
        };
      default:
        return {
          strategy: 'Deterministic AI recovery formulation',
          riskLevel: 'LOW',
          riskLabel: 'STANDARD',
          riskColor: 'text-[#8e9192] border-[#2b2a2a] bg-[#1c1b1b]',
        };
    }
  };

  // Filter audit logs for the active transaction or recent events
  const transactionAuditLogs = useMemo(() => {
    if (activeTransaction) {
      const logs = auditLogs.filter(
        (l) =>
          l.transactionId === activeTransaction.id ||
          l.transactionId === activeTransaction.transactionId ||
          l.traceId === activeTransaction.traceId
      );
      if (logs.length > 0) return logs;
    }
    // Fallback: return top 8 recent audit events
    return auditLogs.slice(0, 8);
  }, [activeTransaction, auditLogs]);

  // Primary execution handler: inject webhook & trigger recovery
  const handleTriggerSimulation = async (preset: SimulationPreset) => {
    setIsExecutingSimulation(true);
    const targetId = preset.transactionTemplate.id || preset.transactionTemplate.transactionId || 'txn_rec_80191';
    setActiveInjectedTxnId(targetId);

    try {
      // 1. Call parent preset injector (ingests into transactions & audit logs)
      onSelectPreset(preset);

      // 2. Allow state to register and grab the transaction
      setTimeout(async () => {
        const found = transactions.find((t) => t.id === targetId || t.transactionId === targetId) || transactions[0];
        if (found) {
          setActiveInjectedTxnId(found.id);
          onSelectTransaction(found);

          // If onDiagnose is provided, auto-trigger diagnosis for seamless simulation
          if (onDiagnose && !found.diagnosis) {
            try {
              await onDiagnose(found);
            } catch (diagErr) {
              console.warn('Auto-diagnosis non-blocking notification:', diagErr);
            }
          }
        }
        setIsExecutingSimulation(false);
      }, 350);
    } catch (err) {
      console.error('Failed to execute simulation preset:', err);
      setIsExecutingSimulation(false);
    }
  };

  // Pipeline stage status evaluator
  const isDetected = !!activeTransaction;
  const isDiagnosed = !!activeTransaction?.diagnosis;
  const isGuardrailChecked = !!activeTransaction?.guardrailEvaluation || isDiagnosed;
  const isHighValue = (activeTransaction?.amount || activePreset.transactionTemplate.amount || 0) >= 50000;
  const isApprovalRequired = isHighValue && !activeTransaction?.humanApproved;
  const isApprovalPassed = !isHighValue || !!activeTransaction?.humanApproved;
  const isRecoveryDispatched =
    activeTransaction?.status === 'ACTION_SCHEDULED' ||
    activeTransaction?.status === 'RECOVERED' ||
    !!activeTransaction?.simulatedMessageSent;
  const isSettled = activeTransaction?.status === 'RECOVERED';
  const isAudited = transactionAuditLogs.length > 0;

  // Format timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--:--';
    try {
      const date = new Date(isoString);
      return date.toTimeString().split(' ')[0];
    } catch {
      return '--:--:--';
    }
  };

  // Calculate Result metrics
  const targetAmount = activeTransaction?.amount ?? activePreset.transactionTemplate.amount ?? 0;
  const recoveredAmount =
    activeTransaction?.status === 'RECOVERED'
      ? activeTransaction.recoveredAmount || targetAmount
      : 0;
  const remainingExposure = targetAmount - recoveredAmount;
  const aiConfidence = activeTransaction?.diagnosis?.recoveryProbability
    ? `${activeTransaction.diagnosis.recoveryProbability}%`
    : activeTransaction
    ? 'EVALUATION PENDING'
    : 'STANDBY';

  let resultStatus: 'RECOVERED' | 'BLOCKED' | 'HUMAN APPROVAL' | 'FAILED' | 'PENDING' = 'PENDING';
  if (isSettled) {
    resultStatus = 'RECOVERED';
  } else if (isApprovalRequired) {
    resultStatus = 'HUMAN APPROVAL';
  } else if (activeTransaction?.status === 'FAILED_TERMINAL') {
    resultStatus = 'FAILED';
  } else if (isRecoveryDispatched) {
    resultStatus = 'PENDING';
  }

  return (
    <div className="space-y-6 pb-12 font-hanken">
      {/* 1. HEADER */}
      <div className="bg-[#141313] border border-[#2b2a2a] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-jetbrains font-bold tracking-widest text-[#4edea3] uppercase">
              CONTROLLED EVENT ENVIRONMENT
            </span>
            <span className="text-[#444748] text-[10px]">|</span>
            <span className="text-[10px] font-jetbrains text-[#8e9192] uppercase">
              SANDBOX SIMULATION
            </span>
          </div>
          <h1 className="font-garamond text-2xl sm:text-3xl font-medium text-[#ffffff] tracking-tight mt-0.5">
            RECOVERY SIMULATION LAB
          </h1>
          <p className="text-xs text-[#8e9192] mt-1 max-w-2xl font-hanken">
            Generate deterministic payment-failure events and observe the complete RecoverAI recovery lifecycle.
          </p>

          {/* System Metadata Status Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#2b2a2a] text-[10px] font-jetbrains">
            <div className="px-2 py-0.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#8e9192] flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-none bg-[#4edea3] animate-pulse"></span>
              <span>ENVIRONMENT: <strong className="text-[#ffffff]">SIMULATION</strong></span>
            </div>
            <div className="px-2 py-0.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#8e9192] flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-none bg-[#4edea3]"></span>
              <span>EVENT BUS: <strong className="text-[#ffffff]">OPERATIONAL</strong></span>
            </div>
            <div className="px-2 py-0.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#8e9192] flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-none bg-[#4edea3]"></span>
              <span>POLICY ENGINE: <strong className="text-[#ffffff]">ACTIVE</strong></span>
            </div>
            <div className="px-2 py-0.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#8e9192] flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-none bg-[#4edea3]"></span>
              <span>AI ENGINE: <strong className="text-[#ffffff]">AVAILABLE</strong></span>
            </div>
          </div>
        </div>

        {/* Primary Header Action */}
        <div className="shrink-0 flex items-center space-x-3">
          <button
            onClick={onOpenCustomInjector}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#1c1b1b] hover:bg-[#2b2a2a] border border-[#2b2a2a] hover:border-[#4edea3] text-[#ffffff] font-jetbrains text-xs uppercase tracking-wider font-bold transition cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5 text-[#4edea3]" />
            <span>+ INJECT CUSTOM WEBHOOK</span>
          </button>
        </div>
      </div>

      {/* 2. SCENARIO LIBRARY */}
      <div className="bg-[#141313] border border-[#2b2a2a]">
        <div className="p-4 border-b border-[#2b2a2a] flex items-center justify-between bg-[#0e0e0e]">
          <div>
            <span className="text-[10px] font-jetbrains font-bold uppercase tracking-wider text-[#4edea3]">
              DETERMINISTIC PAYMENT-FAILURE TEST VECTORS
            </span>
            <h2 className="text-xs font-bold text-[#ffffff] uppercase tracking-wider font-jetbrains mt-0.5">
              SCENARIO LIBRARY
            </h2>
          </div>
          <span className="text-[10px] font-jetbrains text-[#8e9192]">
            {CANONICAL_PRESETS.length} CANONICAL FAILURE MODES
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-hanken">
            <thead>
              <tr className="border-b border-[#2b2a2a] bg-[#121111] text-[#8e9192] font-jetbrains text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-4 font-bold">SCENARIO</th>
                <th className="py-2.5 px-4 font-bold">FAILURE CODE</th>
                <th className="py-2.5 px-4 font-bold">AMOUNT</th>
                <th className="py-2.5 px-4 font-bold">PAYMENT RAIL</th>
                <th className="py-2.5 px-4 font-bold">EXPECTED RECOVERY STRATEGY</th>
                <th className="py-2.5 px-4 font-bold">POLICY RISK</th>
                <th className="py-2.5 px-4 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b2a2a]">
              {CANONICAL_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const meta = getScenarioMetadata(preset);
                const tpl = preset.transactionTemplate;

                return (
                  <tr
                    key={preset.id}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                    }}
                    className={`transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c1b1b] border-l-2 border-l-[#4edea3]'
                        : 'hover:bg-[#181717] bg-[#141313]'
                    }`}
                  >
                    {/* Scenario */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-none bg-[#4edea3] shrink-0"></span>
                        )}
                        <div>
                          <div className="font-bold text-[#ffffff] text-xs">
                            {preset.title.replace(/\s*\(₹.*?\)/, '')}
                          </div>
                          <div className="text-[10px] text-[#8e9192] line-clamp-1 max-w-xs font-hanken">
                            {preset.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Failure Code */}
                    <td className="py-3 px-4 font-jetbrains">
                      <span className="px-1.5 py-0.5 bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20 text-[10px] uppercase font-bold">
                        {tpl.gatewayErrorCode}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-jetbrains font-bold text-[#ffffff]">
                      ₹{tpl.amount?.toLocaleString('en-IN')}
                    </td>

                    {/* Payment Rail */}
                    <td className="py-3 px-4 font-jetbrains text-[11px] text-[#c4c7c5]">
                      {tpl.paymentMethod}
                    </td>

                    {/* Expected Strategy */}
                    <td className="py-3 px-4 text-[#c4c7c5] text-[11px] max-w-xs">
                      {meta.strategy}
                    </td>

                    {/* Policy Risk */}
                    <td className="py-3 px-4 font-jetbrains">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase border inline-block ${meta.riskColor}`}>
                        {meta.riskLabel}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        id={`run-scenario-btn-${preset.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPresetId(preset.id);
                          handleTriggerSimulation(preset);
                        }}
                        className={`px-3 py-1 text-[10px] font-jetbrains font-bold uppercase tracking-wider border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#ffffff] text-[#0e0e0e] border-white hover:bg-[#e5e2e1]'
                            : 'bg-[#1c1b1b] text-[#ffffff] border-[#2b2a2a] hover:border-[#4edea3]'
                        }`}
                      >
                        RUN SCENARIO
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ACTIVE SCENARIO OPERATIONAL PANEL */}
      <div
        id={`active-scenario-workbench-${activePreset.id}`}
        className="bg-[#141313] border border-[#2b2a2a] space-y-6 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2b2a2a] gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-jetbrains font-bold uppercase tracking-wider text-[#4edea3]">
                ACTIVE SCENARIO CONSOLE
              </span>
              <span className="text-[10px] font-jetbrains px-1.5 py-0.2 bg-[#1c1b1b] border border-[#2b2a2a] text-[#8e9192]">
                ID: {activePreset.id}
              </span>
            </div>
            <h2 className="font-garamond text-xl font-bold text-[#ffffff] mt-0.5">
              {activePreset.title}
            </h2>
            <p className="text-xs text-[#8e9192] mt-0.5">{activePreset.subtitle}</p>
          </div>

          {/* Primary Simulation Action */}
          <div className="flex flex-col items-start sm:items-end gap-1">
            <button
              id="inject-webhook-scenario-btn"
              type="button"
              disabled={isExecutingSimulation || isProcessing}
              onClick={() => handleTriggerSimulation(activePreset)}
              className="flex items-center space-x-2 px-6 py-3 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains font-bold text-xs uppercase tracking-wider border border-white transition cursor-pointer disabled:opacity-50"
            >
              <Zap className="h-4 w-4 fill-current text-[#0e0e0e]" />
              <span>
                {isExecutingSimulation ? 'INGESTING & SIMULATING...' : 'INJECT WEBHOOK & TRIGGER RECOVERY'}
              </span>
            </button>
            <span className="text-[9px] font-jetbrains text-[#8e9192] uppercase tracking-wider">
              [SIMULATED EVENT — CONTROLLED LAB ENVIRONMENT]
            </span>
          </div>
        </div>

        {/* 2-Column Grid: EVENT PREVIEW (Left) + EXPECTED PIPELINE (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* EVENT PREVIEW (5 Cols) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] border border-[#2b2a2a] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2b2a2a]">
                <span className="text-[10px] font-jetbrains font-bold text-[#ffffff] uppercase tracking-wider">
                  EVENT PREVIEW // INCOMING TELEMETRY
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-jetbrains font-bold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30 uppercase">
                  payment.failed
                </span>
              </div>

              <dl className="mt-3 divide-y divide-[#201f1f] text-xs font-jetbrains">
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">EVENT TYPE</dt>
                  <dd className="font-bold text-[#4edea3]">payment.failed</dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">TRANSACTION ID</dt>
                  <dd className="font-mono text-[#c4c7c5]">
                    {activeTransaction?.id || `txn_sim_${activePreset.id.replace('sim_', '')}`}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">TRACE ID</dt>
                  <dd className="font-mono text-[#8e9192]">
                    {activeTransaction?.traceId || `trc_${activePreset.id.substring(4, 10)}`}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">AMOUNT</dt>
                  <dd className="font-bold text-[#ffffff] text-sm">
                    ₹{(activeTransaction?.amount || activePreset.transactionTemplate.amount)?.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">PAYMENT RAIL</dt>
                  <dd className="text-[#c4c7c5]">
                    {activeTransaction?.paymentMethod || activePreset.transactionTemplate.paymentMethod}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">FAILURE CODE</dt>
                  <dd className="text-[#ffb4ab] font-bold">
                    {activeTransaction?.gatewayErrorCode || activePreset.transactionTemplate.gatewayErrorCode}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">CUSTOMER</dt>
                  <dd className="text-[#ffffff]">
                    {activeTransaction?.customerName || activePreset.transactionTemplate.customerName}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">RETRY COUNT</dt>
                  <dd className="text-[#c4c7c5]">
                    {activeTransaction?.retryCount ?? activePreset.transactionTemplate.retryCount ?? 0}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className="text-[10px] text-[#8e9192] uppercase">MAXIMUM RETRIES</dt>
                  <dd className="text-[#c4c7c5]">
                    {activeTransaction?.maxRetries ?? activePreset.transactionTemplate.maxRetries ?? 3}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="pt-3 border-t border-[#2b2a2a] text-[10px] font-jetbrains text-[#8e9192] flex items-center justify-between">
              <span>STATUS IN LEDGER:</span>
              <span className={`font-bold uppercase ${
                activeTransaction?.status === 'RECOVERED'
                  ? 'text-[#4edea3]'
                  : activeTransaction?.status === 'ACTION_SCHEDULED'
                  ? 'text-[#ffffff]'
                  : activeTransaction
                  ? 'text-[#f59e0b]'
                  : 'text-[#8e9192]'
              }`}>
                {activeTransaction?.status || 'NOT_YET_INJECTED'}
              </span>
            </div>
          </div>

          {/* EXPECTED PIPELINE (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0e0e0e] border border-[#2b2a2a] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2b2a2a]">
                <span className="text-[10px] font-jetbrains font-bold text-[#ffffff] uppercase tracking-wider">
                  EXPECTED PIPELINE // COMPLETE RECOVERY LIFECYCLE
                </span>
                <span className="text-[10px] font-jetbrains text-[#8e9192]">
                  DETERMINISTIC VERIFICATION
                </span>
              </div>

              {/* Pipeline Step List */}
              <div className="mt-3 space-y-2 font-jetbrains text-xs">
                {/* 1. DETECT */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-none ${isDetected ? 'bg-[#4edea3]' : 'bg-[#444748]'}`}></span>
                    <span className="font-bold text-[#ffffff] text-[11px]">01 // DETECT</span>
                    <span className="text-[10px] text-[#8e9192]">Webhook ingested on event bus</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${isDetected ? 'text-[#4edea3]' : 'text-[#8e9192]'}`}>
                    {isDetected ? `INGESTED [${formatTime(activeTransaction?.createdAt)}]` : 'PENDING'}
                  </span>
                </div>

                {/* 2. DIAGNOSE */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-none ${isDiagnosed ? 'bg-[#4edea3]' : 'bg-[#444748]'}`}></span>
                    <span className="font-bold text-[#ffffff] text-[11px]">02 // DIAGNOSE</span>
                    <span className="text-[10px] text-[#8e9192]">Gemini root-cause & intervention formulation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isDetected && !isDiagnosed && onDiagnose && (
                      <button
                        type="button"
                        onClick={() => activeTransaction && onDiagnose(activeTransaction)}
                        className="px-2 py-0.5 text-[9px] font-bold bg-[#ffffff] text-[#0e0e0e] hover:bg-[#e5e2e1] uppercase"
                      >
                        DIAGNOSE (AI)
                      </button>
                    )}
                    <span className={`text-[10px] font-bold uppercase ${isDiagnosed ? 'text-[#4edea3]' : 'text-[#8e9192]'}`}>
                      {isDiagnosed ? `DIAGNOSED (${activeTransaction?.diagnosis?.recoveryProbability}% WIN)` : 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* 3. GUARDRAIL */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-none ${isGuardrailChecked ? 'bg-[#4edea3]' : 'bg-[#444748]'}`}></span>
                    <span className="font-bold text-[#ffffff] text-[11px]">03 // GUARDRAIL</span>
                    <span className="text-[10px] text-[#8e9192]">Discount limit, anti-spam & circuit breakers</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${isGuardrailChecked ? 'text-[#4edea3]' : 'text-[#8e9192]'}`}>
                    {isGuardrailChecked ? 'PASS (BOUNDED)' : 'PENDING'}
                  </span>
                </div>

                {/* 4. APPROVAL */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-none ${
                      isApprovalPassed ? 'bg-[#4edea3]' : isApprovalRequired ? 'bg-[#f59e0b]' : 'bg-[#444748]'
                    }`}></span>
                    <span className="font-bold text-[#ffffff] text-[11px]">04 // APPROVAL</span>
                    <span className="text-[10px] text-[#8e9192]">High-value ticket threshold (&gt;₹50,000)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isApprovalRequired && onApproveHumanGate && (
                      <button
                        type="button"
                        onClick={() => activeTransaction && onApproveHumanGate(activeTransaction)}
                        className="px-2 py-0.5 text-[9px] font-bold bg-[#f59e0b] text-[#0e0e0e] hover:bg-[#d97706] uppercase"
                      >
                        SIGN OFF GATE
                      </button>
                    )}
                    <span className={`text-[10px] font-bold uppercase ${
                      isApprovalPassed ? 'text-[#4edea3]' : isApprovalRequired ? 'text-[#f59e0b]' : 'text-[#8e9192]'
                    }`}>
                      {isApprovalRequired ? 'GATED (OPERATOR SIGN-OFF)' : isApprovalPassed && isHighValue ? 'APPROVED' : 'AUTONOMOUS BYPASS'}
                    </span>
                  </div>
                </div>

                {/* 5. RECOVERY */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-none ${isRecoveryDispatched ? 'bg-[#4edea3]' : 'bg-[#444748]'}`}></span>
                    <span className="font-bold text-[#ffffff] text-[11px]">05 // RECOVERY</span>
                    <span className="text-[10px] text-[#8e9192]">Dispatch payment link & messaging payload</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isDiagnosed && !isApprovalRequired && !isRecoveryDispatched && onExecuteAction && (
                      <button
                        type="button"
                        onClick={() => activeTransaction && onExecuteAction(activeTransaction)}
                        className="px-2 py-0.5 text-[9px] font-bold bg-[#ffffff] text-[#0e0e0e] hover:bg-[#e5e2e1] uppercase"
                      >
                        DISPATCH LINK
                      </button>
                    )}
                    <span className={`text-[10px] font-bold uppercase ${isRecoveryDispatched ? 'text-[#4edea3]' : 'text-[#8e9192]'}`}>
                      {isRecoveryDispatched ? 'DISPATCHED' : 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* 6. SETTLEMENT */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-none ${isSettled ? 'bg-[#4edea3]' : 'bg-[#444748]'}`}></span>
                    <span className="font-bold text-[#ffffff] text-[11px]">06 // SETTLEMENT</span>
                    <span className="text-[10px] text-[#8e9192]">Customer payment reconciliation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isRecoveryDispatched && !isSettled && onSettlePayment && (
                      <button
                        type="button"
                        onClick={() => activeTransaction && onSettlePayment(activeTransaction)}
                        className="px-2 py-0.5 text-[9px] font-bold bg-[#4edea3] text-[#0e0e0e] hover:bg-[#3ec48e] uppercase"
                      >
                        SIMULATE SETTLEMENT
                      </button>
                    )}
                    <span className={`text-[10px] font-bold uppercase ${isSettled ? 'text-[#4edea3]' : 'text-[#8e9192]'}`}>
                      {isSettled ? `SETTLED (₹${activeTransaction?.amount.toLocaleString('en-IN')})` : 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* 7. AUDIT */}
                <div className="p-2.5 bg-[#141313] border border-[#2b2a2a] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-none ${isAudited ? 'bg-[#4edea3]' : 'bg-[#444748]'}`}></span>
                    <span className="font-bold text-[#ffffff] text-[11px]">07 // AUDIT</span>
                    <span className="text-[10px] text-[#8e9192]">Immutable cryptographic ledger record</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${isAudited ? 'text-[#4edea3]' : 'text-[#8e9192]'}`}>
                    {isAudited ? `${transactionAuditLogs.length} EVENTS RECORDED` : 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2b2a2a] text-[10px] font-jetbrains text-[#8e9192] flex items-center justify-between">
              <span>PIPELINE ENGINE: RECOVERAI CORE V2</span>
              <span className="text-[#4edea3]">ZERO HALLUCINATION BOUNDS</span>
            </div>
          </div>
        </div>

        {/* 4. RESULT PANEL */}
        <div className="bg-[#0e0e0e] border border-[#2b2a2a] p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#2b2a2a]">
            <div className="flex items-center space-x-2">
              <Activity className="h-3.5 w-3.5 text-[#4edea3]" />
              <span className="text-[10px] font-jetbrains font-bold text-[#ffffff] uppercase tracking-wider">
                RECOVERY RESULT // REVENUE METRICS & EXECUTION OUTCOME
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-jetbrains text-[#8e9192]">STATUS:</span>
              <span className={`px-2 py-0.5 text-[9px] font-jetbrains font-bold uppercase border ${
                resultStatus === 'RECOVERED'
                  ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                  : resultStatus === 'HUMAN APPROVAL'
                  ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
                  : resultStatus === 'FAILED'
                  ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                  : 'bg-[#1c1b1b] text-[#c4c7c5] border-[#2b2a2a]'
              }`}>
                {resultStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-3 text-xs font-jetbrains">
            {/* AT-RISK AMOUNT */}
            <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">AT-RISK AMOUNT</div>
              <div className="text-[#ffffff] font-bold text-sm mt-0.5">
                ₹{targetAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* RECOVERED AMOUNT */}
            <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">RECOVERED AMOUNT</div>
              <div className="text-[#4edea3] font-bold text-sm mt-0.5">
                ₹{recoveredAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* REMAINING EXPOSURE */}
            <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">REMAINING EXPOSURE</div>
              <div className="text-[#ffb4ab] font-bold text-sm mt-0.5">
                ₹{remainingExposure.toLocaleString('en-IN')}
              </div>
            </div>

            {/* AI CONFIDENCE */}
            <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">AI CONFIDENCE</div>
              <div className="text-[#ffffff] font-bold text-sm mt-0.5">
                {aiConfidence}
              </div>
            </div>

            {/* GUARDRAIL RESULT */}
            <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">GUARDRAIL RESULT</div>
              <div className={`font-bold text-xs mt-1 truncate ${
                isApprovalRequired
                  ? 'text-[#f59e0b]'
                  : isGuardrailChecked
                  ? 'text-[#4edea3]'
                  : 'text-[#8e9192]'
              }`}>
                {isApprovalRequired ? 'GATED (≥₹50k)' : isGuardrailChecked ? 'PASSED (SAFE)' : 'PENDING'}
              </div>
            </div>

            {/* RECOVERY ACTION */}
            <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">RECOVERY ACTION</div>
              <div className="text-[#c4c7c5] font-bold text-xs mt-1 truncate" title={activeTransaction?.diagnosis?.proposedIntervention?.title || 'STANDBY'}>
                {activeTransaction?.diagnosis?.proposedIntervention?.channel
                  ? `${activeTransaction.diagnosis.proposedIntervention.channel} NUDGE`
                  : activeTransaction?.simulatedPaymentLink
                  ? 'LINK DISPATCHED'
                  : 'STANDBY'}
              </div>
            </div>

            {/* SETTLEMENT STATUS */}
            <div className="p-2.5 bg-[#141313] border border-[#2b2a2a]">
              <div className="text-[9px] text-[#8e9192] uppercase">SETTLEMENT STATUS</div>
              <div className={`font-bold text-xs mt-1 uppercase ${
                isSettled ? 'text-[#4edea3]' : 'text-[#8e9192]'
              }`}>
                {isSettled ? 'RECONCILED' : 'AWAITING CHECKOUT'}
              </div>
            </div>
          </div>
        </div>

        {/* 5. LIVE SIMULATION OUTPUT TERMINAL */}
        <div className="bg-[#0e0e0e] border border-[#2b2a2a]">
          <div className="p-3 border-b border-[#2b2a2a] flex items-center justify-between bg-[#121111]">
            <div className="flex items-center space-x-2">
              <Terminal className="h-3.5 w-3.5 text-[#4edea3]" />
              <span className="text-[10px] font-jetbrains font-bold text-[#ffffff] uppercase tracking-wider">
                LIVE SIMULATION OUTPUT // IMMUTABLE LEDGER STREAM
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-jetbrains text-[#8e9192]">
              <span className="w-1.5 h-1.5 rounded-none bg-[#4edea3] animate-pulse"></span>
              <span>LIVE TELEMETRY</span>
            </div>
          </div>

          <div className="p-4 bg-[#0a0a0a] max-h-56 overflow-y-auto font-jetbrains text-[11px] leading-relaxed space-y-1.5">
            {transactionAuditLogs.length > 0 ? (
              transactionAuditLogs.map((log) => {
                const time = formatTime(log.timestamp);
                const isErr = log.riskLevel === 'ALERT';
                const isWarn = log.riskLevel === 'WARNING';
                const isSucc = log.riskLevel === 'SUCCESS';

                return (
                  <div key={log.id} className="flex items-start space-x-2 text-[#c4c7c5] hover:bg-[#141313] py-0.5 px-1">
                    <span className="text-[#8e9192] shrink-0">[{time}]</span>
                    <span className={`font-bold shrink-0 ${
                      isSucc ? 'text-[#4edea3]' : isWarn ? 'text-[#f59e0b]' : isErr ? 'text-[#ffb4ab]' : 'text-[#ffffff]'
                    }`}>
                      {log.eventType}
                    </span>
                    <span className="text-[#444748] shrink-0">::</span>
                    <span className="text-[#8e9192] truncate">{log.summary}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-[#8e9192] text-xs py-4 text-center font-jetbrains">
                READY // Select a scenario from the library or click &quot;INJECT WEBHOOK &amp; TRIGGER RECOVERY&quot; to stream real-time events.
              </div>
            )}
          </div>

          <div className="p-2 border-t border-[#2b2a2a] bg-[#121111] text-[10px] font-jetbrains text-[#8e9192] flex items-center justify-between px-4">
            <span>SHOWING SYSTEM AUDIT LOG STREAM</span>
            <span>FORMAT: [HH:MM:SS] EVENT_TYPE :: SUMMARY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
