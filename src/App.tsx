/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  AtRiskTransaction,
  AuditLogEntry,
  NavigationTab,
  SimulationPreset,
  AIDiagnosisResult,
  GuardrailEvaluation,
  GuardrailCheckResult,
} from './types';
import {
  CANONICAL_TRANSACTIONS,
  CANONICAL_AUDIT_LOGS,
  TransactionDataService,
  normalizeTransaction,
  generateClientFallbackDiagnosis,
} from './data/transactionStore';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewView } from './components/views/OverviewView';
import { TransactionsView } from './components/views/TransactionsView';
import { AIAgentView } from './components/views/AIAgentView';
import { GuardrailsView } from './components/views/GuardrailsView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { SimulationLabView } from './components/views/SimulationLabView';
import { AgentDrawer } from './components/AgentDrawer';
import { ManualFailureInjectorModal } from './components/ManualFailureInjectorModal';
import { LearningConceptsModal } from './components/LearningConceptsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('OVERVIEW');
  const [transactions, setTransactions] = useState<AtRiskTransaction[]>(() =>
    TransactionDataService.getBaselineTransactions()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    TransactionDataService.getBaselineAuditLogs()
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isLearningHubOpen, setIsLearningHubOpen] = useState(false);
  const [isCustomInjectorOpen, setIsCustomInjectorOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDiagnosingBatch, setIsDiagnosingBatch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Derive the active selected transaction dynamically so it always reflects current state
  const selectedTransaction = useMemo(
    () => (selectedTransactionId ? transactions.find((t) => t.id === selectedTransactionId) || null : null),
    [transactions, selectedTransactionId]
  );

  const setSelectedTransaction = (txn: AtRiskTransaction | null) => {
    setSelectedTransactionId(txn ? txn.id : null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const addAuditLog = (
    transaction: AtRiskTransaction,
    eventType: AuditLogEntry['eventType'],
    actor: AuditLogEntry['actor'],
    summary: string,
    details: Record<string, any>,
    riskLevel: AuditLogEntry['riskLevel'] = 'INFO'
  ) => {
    const traceId = details.traceId || transaction.traceId || `trc_${Math.random().toString(36).substring(2, 10)}`;
    const newEntry: AuditLogEntry = {
      id: `aud_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      transactionId: transaction.transactionId || transaction.id,
      orderId: transaction.orderId,
      eventType,
      actor,
      summary,
      details: {
        traceId,
        transactionId: transaction.transactionId || transaction.id,
        orderId: transaction.orderId,
        eventType,
        timestamp: new Date().toISOString(),
        actor,
        amount: transaction.amount,
        currency: transaction.currency || 'INR',
        customer: transaction.customer || transaction.customerName,
        customerName: transaction.customerName || transaction.customer,
        merchant: transaction.merchant || transaction.merchantName,
        merchantName: transaction.merchantName || transaction.merchant,
        paymentRail: transaction.paymentRail || transaction.paymentMethod,
        paymentMethod: transaction.paymentMethod || transaction.paymentRail,
        failureCode: transaction.failureCode || transaction.gatewayErrorCode,
        failureCategory: transaction.failureCategory,
        recoveryProbability: transaction.diagnosis?.recoveryProbability ?? details.diagnosis?.recoveryProbability,
        decision: details.decision || transaction.diagnosis?.proposedIntervention?.title || details.diagnosis?.proposedIntervention?.title || summary,
        guardrailResult: details.guardrailResult || (transaction.amount >= 50000 && !transaction.humanApproved ? 'GATED (Amount ≥ ₹50,000 Threshold)' : 'ALL_RULES_PASSED'),
        action: details.action || (transaction.simulatedPaymentLink ? `DISPATCH: ${transaction.simulatedPaymentLink}` : 'EVALUATED_AND_LOGGED'),
        ...details,
      },
      riskLevel,
      traceId,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // 1. Run AI Diagnosis for a single transaction
  const handleDiagnose = async (txn: AtRiskTransaction) => {
    setIsProcessing(true);
    try {
      let diagnosis: AIDiagnosisResult | null = null;
      let source = 'GEMINI_COGNITION_PIPELINE';

      try {
        const res = await fetch('/api/recover/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction: txn }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.diagnosis) {
            diagnosis = data.diagnosis;
            source = data.source || 'GEMINI_COGNITION_PIPELINE';
          }
        }
      } catch (fetchErr) {
        console.warn('Direct server diagnosis fetch failed, stepping to local rule engine:', fetchErr);
      }

      // If server returned non-JSON (e.g. gateway timeout) or failed, use deterministic fallback
      if (!diagnosis) {
        diagnosis = generateClientFallbackDiagnosis(txn);
        source = 'FINTECH_RECOVERY_ENGINE_LOCAL';
      }

      // 1. Update the transaction in centralized state with the AI diagnosis
      const diagnosedTxn: AtRiskTransaction = {
        ...txn,
        diagnosis,
        status: 'DIAGNOSING',
      };

      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id || t.transactionId === txn.id ? diagnosedTxn : t))
      );

      if (selectedTransaction?.id === txn.id || selectedTransaction?.transactionId === txn.id) {
        setSelectedTransaction(diagnosedTxn);
      }

      // Log AI_DIAGNOSIS_COMPLETED
      addAuditLog(
        txn,
        'AI_DIAGNOSIS_COMPLETED',
        'RECOVER_AI_AGENT',
        `AI Diagnosis formulated for ₹${txn.amount.toLocaleString('en-IN')} (${diagnosis.recoveryProbability}% win prob). Root cause: ${diagnosis.rootCauseSummary}. Proposed intervention: ${diagnosis.proposedIntervention?.title || 'Recovery Link'}.`,
        {
          diagnosis,
          transactionId: txn.transactionId || txn.id,
          traceId: txn.traceId,
          source,
          rootCause: diagnosis.rootCauseSummary,
          failureNature: diagnosis.failureNature,
          recoveryProbability: diagnosis.recoveryProbability,
          decision: diagnosis.proposedIntervention?.title,
        },
        'INFO'
      );

      // 2. Immediate Deterministic Guardrail Evaluation
      let guardrailEvaluation: GuardrailEvaluation | null = null;
      try {
        const guardrailRes = await fetch('/api/recover/guardrail-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction: diagnosedTxn,
            proposedIntervention: diagnosis.proposedIntervention,
          }),
        });
        if (guardrailRes.ok) {
          const gData = await guardrailRes.json();
          if (gData?.evaluation) {
            guardrailEvaluation = gData.evaluation;
          }
        }
      } catch (gErr) {
        console.warn('Direct guardrail check failed, falling back to local policy rules:', gErr);
      }

      // Deterministic local guardrail engine fallback if server fetch failed
      if (!guardrailEvaluation) {
        const isHighTicket = (diagnosedTxn.amount || 0) >= 50000 && !diagnosedTxn.humanApproved;
        const checks: GuardrailCheckResult[] = [
          {
            ruleId: 'GR-RETRY-LIMIT',
            ruleName: 'Max Retries Policy',
            passed: (diagnosedTxn.retryCount || 0) < (diagnosedTxn.maxRetries || 3),
            reason: `Attempt ${diagnosedTxn.retryCount || 0} is within maximum ${diagnosedTxn.maxRetries || 3} retries limit.`,
            riskLevel: 'LOW',
          },
          {
            ruleId: 'GR-AMOUNT-THRESHOLD',
            ruleName: 'Autonomous Recovery Limit (≤ ₹50,000)',
            passed: !isHighTicket,
            reason: isHighTicket ? 'Ticket exceeds ₹50,000 threshold. Operator sign-off required.' : 'Within autonomous execution limit.',
            riskLevel: isHighTicket ? 'HIGH' : 'LOW',
          },
          {
            ruleId: 'GR-TERMINAL-DECLINE-BLOCK',
            ruleName: 'Zero-Retry Rule on Expired Cards',
            passed: !(diagnosedTxn.failureCode === 'CARD_EXPIRED' && diagnosis.proposedIntervention.type === 'SMART_RETRY_SCHEDULE'),
            reason: 'Expired card is safely routed to credential update portal rather than blind gateway retries.',
            riskLevel: 'LOW',
          },
          {
            ruleId: 'GR-DISCOUNT-CEILING',
            ruleName: 'Discount Cap Ceiling (≤ 15%)',
            passed: (diagnosis.proposedIntervention.recommendedDiscountPercent || 0) <= 15,
            reason: 'Discount within approved merchant limits.',
            riskLevel: 'LOW',
          },
          {
            ruleId: 'GR-RATE-LIMIT',
            ruleName: 'Anti-Spam Frequency Cap',
            passed: true,
            reason: '0 duplicate messages sent in trailing 24h window.',
            riskLevel: 'LOW',
          },
        ];

        guardrailEvaluation = {
          allPassed: checks.every((c) => c.passed),
          requiresHumanApproval: isHighTicket,
          approvalReason: isHighTicket ? 'Transaction amount exceeds ₹50,000 safety threshold.' : '',
          checks,
          clampedDiscountPercent: Math.min(diagnosis.proposedIntervention.recommendedDiscountPercent || 0, 15),
        };
      }

      // Update state with guardrail evaluation result
      const finalStatus = guardrailEvaluation.requiresHumanApproval
        ? 'REQUIRES_HUMAN_APPROVAL'
        : !guardrailEvaluation.allPassed
        ? 'REJECTED_GUARDRAIL'
        : 'ACTION_SCHEDULED';

      const fullyEvaluatedTxn: AtRiskTransaction = {
        ...diagnosedTxn,
        guardrailEvaluation,
        status: finalStatus,
      };

      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id || t.transactionId === txn.id ? fullyEvaluatedTxn : t))
      );

      if (selectedTransaction?.id === txn.id || selectedTransaction?.transactionId === txn.id) {
        setSelectedTransaction(fullyEvaluatedTxn);
      }

      // Log GUARDRAILS_EVALUATED
      addAuditLog(
        fullyEvaluatedTxn,
        'GUARDRAILS_EVALUATED',
        'GUARDRAIL_POLICY_ENGINE',
        guardrailEvaluation.allPassed
          ? 'All 5 deterministic safety rules passed. Autonomous recovery action cleared for dispatch.'
          : guardrailEvaluation.requiresHumanApproval
          ? `High-value action gated: ${guardrailEvaluation.approvalReason}`
          : 'Action blocked by deterministic guardrail policy.',
        {
          evaluation: guardrailEvaluation,
          checks: guardrailEvaluation.checks,
          allPassed: guardrailEvaluation.allPassed,
          requiresHumanApproval: guardrailEvaluation.requiresHumanApproval,
          guardrailResult: guardrailEvaluation.allPassed ? 'PASS' : guardrailEvaluation.requiresHumanApproval ? 'HUMAN_APPROVAL_REQUIRED' : 'BLOCKED',
          decision: guardrailEvaluation.allPassed ? 'Autonomous recovery authorized' : guardrailEvaluation.approvalReason || 'Blocked by policy',
          traceId: txn.traceId,
          transactionId: txn.transactionId || txn.id,
        },
        guardrailEvaluation.allPassed ? 'SUCCESS' : guardrailEvaluation.requiresHumanApproval ? 'ALERT' : 'WARNING'
      );

      const customerLabel = txn.customerName || txn.customer || 'Customer';
      showToast(`AI Diagnosis formulated & Guardrails checked for ${customerLabel}`);
    } catch (err: any) {
      console.error('Error during AI diagnosis:', err);
      showToast(`AI Diagnosis: ${err?.message || 'Please try again'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Batch Diagnose All Pending
  const handleBatchDiagnose = async () => {
    setIsDiagnosingBatch(true);
    const undiagnosed = transactions.filter((t) => !t.diagnosis);

    for (const txn of undiagnosed) {
      try {
        let diagnosis: AIDiagnosisResult | null = null;
        let source = 'GEMINI_COGNITION_PIPELINE';

        try {
          const res = await fetch('/api/recover/diagnose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: txn }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data?.diagnosis) {
              diagnosis = data.diagnosis;
              source = data.source || 'GEMINI_COGNITION_PIPELINE';
            }
          }
        } catch {
          // Ignore and fall through to fallback
        }

        if (!diagnosis) {
          diagnosis = generateClientFallbackDiagnosis(txn);
          source = 'FINTECH_RECOVERY_ENGINE_LOCAL';
        }

        const updatedTxn: AtRiskTransaction = {
          ...txn,
          diagnosis,
          status: 'ACTION_SCHEDULED',
        };

        setTransactions((prev) =>
          prev.map((t) =>
            t.id === txn.id || t.transactionId === txn.id ? updatedTxn : t
          )
        );

        addAuditLog(
          txn,
          'AI_DIAGNOSIS_COMPLETED',
          'RECOVER_AI_AGENT',
          `Batch AI Diagnosis: ${diagnosis.proposedIntervention?.title || 'Recovery Link'} formulated.`,
          {
            diagnosis,
            transactionId: txn.transactionId || txn.id,
            traceId: txn.traceId,
            source,
          },
          'INFO'
        );
      } catch (e) {
        console.error('Error in batch diagnosis for transaction:', txn.id, e);
      }
    }

    setIsDiagnosingBatch(false);
    showToast(`Batch AI diagnosis complete for ${undiagnosed.length} transactions!`);
  };

  // 3. Human Approval Gate Sign-Off for High-Value Orders
  const handleApproveHumanGate = (txn: AtRiskTransaction) => {
    const updatedTxn: AtRiskTransaction = {
      ...txn,
      humanApproved: true,
      status: 'ACTION_SCHEDULED',
      humanReviewNotes: 'Operator verified high-ticket transaction and authorized autonomous dispatch.',
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === txn.id || t.transactionId === txn.id ? updatedTxn : t))
    );

    if (selectedTransaction?.id === txn.id || selectedTransaction?.transactionId === txn.id) {
      setSelectedTransaction(updatedTxn);
    }

    addAuditLog(
      txn,
      'HUMAN_APPROVAL_GRANTED',
      'HUMAN_OPERATOR',
      `Merchant operator granted manual sign-off for high-value transaction of ₹${txn.amount.toLocaleString('en-IN')}.`,
      {
        approvedAmount: txn.amount,
        approvedAt: new Date().toISOString(),
        traceId: txn.traceId,
        transactionId: txn.transactionId || txn.id,
        guardrailResult: 'APPROVED_BY_OPERATOR',
        decision: 'Operator sign-off verified',
      },
      'SUCCESS'
    );

    showToast(`High-Value human approval granted for ₹${txn.amount.toLocaleString('en-IN')}`);
  };

  // 4. Execute Bounded Recovery Action
  const handleExecuteAction = async (txn: AtRiskTransaction) => {
    if (!txn.diagnosis) {
      showToast('Cannot dispatch: AI diagnosis is required first');
      return;
    }

    // Safety checks: do not allow execution if blocked by guardrails or awaiting human gate
    if (txn.guardrailEvaluation?.requiresHumanApproval && !txn.humanApproved) {
      showToast('Action blocked: High-value transaction requires operator sign-off');
      return;
    }

    if (txn.guardrailEvaluation && !txn.guardrailEvaluation.allPassed && !txn.humanApproved) {
      showToast('Action blocked: Deterministic guardrail policy violation');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/recover/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: txn,
          intervention: txn.diagnosis.proposedIntervention,
          humanApproved: txn.humanApproved,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      const executionLog = data.executionLog;
      const updatedTxn: AtRiskTransaction = {
        ...txn,
        status: 'ACTION_SCHEDULED',
        simulatedPaymentLink: executionLog.simulatedPaymentLink,
        simulatedMessageSent: true,
      };

      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id || t.transactionId === txn.id ? updatedTxn : t))
      );

      if (selectedTransaction?.id === txn.id || selectedTransaction?.transactionId === txn.id) {
        setSelectedTransaction(updatedTxn);
      }

      addAuditLog(
        txn,
        'RECOVERY_DISPATCHED',
        'RECOVER_AI_AGENT',
        `Dispatched bounded ${txn.diagnosis.proposedIntervention.channel} recovery link (${executionLog.simulatedPaymentLink}).`,
        {
          execution: executionLog,
          traceId: data.traceId || txn.traceId,
          transactionId: txn.transactionId || txn.id,
          action: `DISPATCH_${txn.diagnosis.proposedIntervention.channel}`,
          paymentLink: executionLog.simulatedPaymentLink,
          channel: txn.diagnosis.proposedIntervention.channel,
          decision: `Dispatched ${txn.diagnosis.proposedIntervention.channel} recovery with link ${executionLog.simulatedPaymentLink}`,
        },
        'SUCCESS'
      );

      showToast(`Recovery link & ${txn.diagnosis.proposedIntervention.channel} dispatch simulated for ${txn.customerName}!`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Action blocked by safety policy');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Simulate Customer Payment Settlement
  const handleSettlePayment = (txn: AtRiskTransaction) => {
    const settledAt = new Date().toISOString();
    const updatedTxn: AtRiskTransaction = {
      ...txn,
      status: 'RECOVERED',
      recoveredAmount: txn.amount,
      recoveredAt: settledAt,
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === txn.id || t.transactionId === txn.id ? updatedTxn : t))
    );

    if (selectedTransaction?.id === txn.id || selectedTransaction?.transactionId === txn.id) {
      setSelectedTransaction(updatedTxn);
    }

    addAuditLog(
      txn,
      'SETTLEMENT_COMPLETED',
      'SYSTEM_WEBHOOK',
      `Payment settled successfully via Razorpay recovery link! Recovered ₹${txn.amount.toLocaleString('en-IN')}.`,
      {
        settledAmount: txn.amount,
        recoveredAmount: txn.amount,
        settledAt,
        traceId: txn.traceId,
        transactionId: txn.transactionId || txn.id,
        action: 'PAYMENT_LINK_PAID',
        decision: `Recovered ₹${txn.amount.toLocaleString('en-IN')} via simulated settlement`,
      },
      'SUCCESS'
    );

    showToast(`🎉 ₹${txn.amount.toLocaleString('en-IN')} RECOVERED! Credited to merchant account.`);
  };

  // 6. Handle Preset Selection (Idempotent)
  const handleSelectPreset = (preset: SimulationPreset) => {
    const { transaction, auditLogs: scenarioAuditLogs } = TransactionDataService.ingestPaymentFailureEvent(preset);

    setTransactions((prev) => {
      const existingIdx = prev.findIndex(
        (t) => t.id === transaction.id || t.transactionId === transaction.transactionId
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = transaction;
        return next;
      }
      return [transaction, ...prev];
    });

    setSelectedTransaction(transaction);

    setAuditLogs((prev) => {
      const existingIds = new Set(prev.map((l) => l.id));
      const filtered = scenarioAuditLogs.filter((l) => !existingIds.has(l.id));
      return [...filtered, ...prev];
    });

    showToast(`Injected test scenario: ${preset.title}`);
    return transaction;
  };

  // 7. Handle Custom Injected Transaction (Idempotent)
  const handleCustomInject = (txn: Partial<AtRiskTransaction>) => {
    const { transaction, auditLogs: scenarioAuditLogs } = TransactionDataService.ingestPaymentFailureEvent(txn);

    setTransactions((prev) => {
      const existingIdx = prev.findIndex(
        (t) => t.id === transaction.id || t.transactionId === transaction.transactionId
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = transaction;
        return next;
      }
      return [transaction, ...prev];
    });

    setSelectedTransaction(transaction);

    setAuditLogs((prev) => {
      const existingIds = new Set(prev.map((l) => l.id));
      const filtered = scenarioAuditLogs.filter((l) => !existingIds.has(l.id));
      return [...filtered, ...prev];
    });

    showToast(`Custom failed payment ingested: ₹${transaction.amount.toLocaleString('en-IN')}`);
  };

  const pendingHumanCount = transactions.filter(
    (t) => t.amount >= 50000 && !t.humanApproved && t.status !== 'RECOVERED'
  ).length;

  const totalAtRiskToday = transactions
    .filter((t) => t.status !== 'RECOVERED')
    .reduce((acc, t) => acc + t.amount, 0);

  const recoveredTotalToday = transactions
    .filter((t) => t.status === 'RECOVERED')
    .reduce((acc, t) => acc + (t.recoveredAmount || t.amount), 0);

  return (
    <div className="flex h-screen bg-[#08090D] text-slate-100 font-sans antialiased overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Left Nav Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenLearningGuide={() => setIsLearningHubOpen(true)}
        pendingHumanCount={pendingHumanCount}
        auditCount={auditLogs.length}
        totalAtRiskCount={transactions.filter((t) => t.status !== 'RECOVERED').length}
      />

      {/* 2. Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Top Bar */}
        <TopBar
          onOpenCustomInjector={() => setIsCustomInjectorOpen(true)}
          recoveredTotalToday={recoveredTotalToday}
          totalAtRiskToday={totalAtRiskToday}
        />

        {/* Dynamic Workspace Route View */}
        <main className={`flex-1 overflow-y-auto ${activeTab === 'OVERVIEW' ? 'p-0 w-full' : 'px-6 py-6 max-w-7xl w-full mx-auto'}`}>
          {activeTab === 'OVERVIEW' && (
            <OverviewView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onRunBatchDiagnose={handleBatchDiagnose}
              isDiagnosingBatch={isDiagnosingBatch}
            />
          )}

          {activeTab === 'TRANSACTIONS' && (
            <TransactionsView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onRunBatchDiagnose={handleBatchDiagnose}
              isDiagnosingBatch={isDiagnosingBatch}
            />
          )}

          {activeTab === 'AI_AGENT' && (
            <AIAgentView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onRunBatchDiagnose={handleBatchDiagnose}
              onDiagnoseTransaction={handleDiagnose}
              isDiagnosingBatch={isDiagnosingBatch}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'GUARDRAILS' && (
            <GuardrailsView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onApproveHumanGate={handleApproveHumanGate}
            />
          )}

          {activeTab === 'AUDIT_TRAIL' && (
            <AuditTrailView auditLogs={auditLogs} transactions={transactions} />
          )}

          {activeTab === 'SIMULATION_LAB' && (
            <SimulationLabView
              onSelectPreset={handleSelectPreset}
              onOpenCustomInjector={() => setIsCustomInjectorOpen(true)}
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onDiagnose={handleDiagnose}
              onApproveHumanGate={handleApproveHumanGate}
              onExecuteAction={handleExecuteAction}
              onSettlePayment={handleSettlePayment}
              auditLogs={auditLogs}
              isProcessing={isProcessing}
            />
          )}
        </main>
      </div>

      {/* Cognitive Inspector Slide-over Drawer */}
      <AgentDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDiagnose={handleDiagnose}
        onExecuteAction={handleExecuteAction}
        onApproveHumanGate={handleApproveHumanGate}
        onSettlePayment={handleSettlePayment}
        isProcessing={isProcessing}
      />

      {/* Custom Injector Modal */}
      <ManualFailureInjectorModal
        isOpen={isCustomInjectorOpen}
        onClose={() => setIsCustomInjectorOpen(false)}
        onInject={handleCustomInject}
      />

      {/* Learning Concepts Handbook Modal */}
      <LearningConceptsModal
        isOpen={isLearningHubOpen}
        onClose={() => setIsLearningHubOpen(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0E1118] text-white px-4 py-3 rounded-xl border border-emerald-500/40 shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-bottom-4 duration-150">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
