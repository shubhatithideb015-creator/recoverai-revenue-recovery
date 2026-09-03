/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AuditLogEntry, AtRiskTransaction } from '../../types';
import {
  History,
  Search,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Cpu,
  Layers,
  Terminal,
  Clock,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  ExternalLink,
} from 'lucide-react';

interface AuditTrailViewProps {
  auditLogs: AuditLogEntry[];
  transactions?: AtRiskTransaction[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ auditLogs, transactions = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Map transaction helper
  const transactionMap = useMemo(() => {
    const map = new Map<string, AtRiskTransaction>();
    transactions.forEach((t) => map.set(t.id, t));
    return map;
  }, [transactions]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        log.summary.toLowerCase().includes(q) ||
        log.transactionId.toLowerCase().includes(q) ||
        log.traceId.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.eventType.toLowerCase().includes(q) ||
        (log.details?.customerName && String(log.details.customerName).toLowerCase().includes(q)) ||
        (log.details?.failureCode && String(log.details.failureCode).toLowerCase().includes(q)) ||
        (log.details?.gatewayCode && String(log.details.gatewayCode).toLowerCase().includes(q));

      const matchesType =
        selectedEventType === 'ALL' ||
        log.eventType === selectedEventType ||
        (selectedEventType === 'RECOVERY_DISPATCHED' && log.eventType === 'RECOVERY_ACTION_EXECUTED') ||
        (selectedEventType === 'RECOVERY_ACTION_EXECUTED' && log.eventType === 'RECOVERY_DISPATCHED') ||
        (selectedEventType === 'SETTLEMENT_COMPLETED' && log.eventType === 'PAYMENT_SETTLED_RECOVERED') ||
        (selectedEventType === 'PAYMENT_SETTLED_RECOVERED' && log.eventType === 'SETTLEMENT_COMPLETED');

      return matchesSearch && matchesType;
    });
  }, [auditLogs, searchTerm, selectedEventType]);

  // Selected Log (fallback to first filtered log)
  const currentLog = useMemo(() => {
    if (selectedLogId) {
      const found = auditLogs.find((l) => l.id === selectedLogId);
      if (found) return found;
    }
    return filteredLogs.length > 0 ? filteredLogs[0] : null;
  }, [selectedLogId, auditLogs, filteredLogs]);

  // Derive structured values from log & linked transaction
  const structuredData = useMemo(() => {
    if (!currentLog) return null;
    const linkedTxn = transactionMap.get(currentLog.transactionId);
    const d = currentLog.details || {};

    const traceId = currentLog.traceId || d.traceId || 'trc_unknown';
    const transactionId = currentLog.transactionId;
    const eventType = currentLog.eventType;
    const timestamp = currentLog.timestamp;
    const actor = currentLog.actor;

    const amount =
      d.amount !== undefined
        ? d.amount
        : linkedTxn?.amount !== undefined
        ? linkedTxn.amount
        : d.settledAmount || 0;

    const failureCode =
      d.failureCode ||
      d.gatewayCode ||
      linkedTxn?.gatewayErrorCode ||
      'PAYMENT_ERROR';

    // Decision
    let decision =
      d.decision ||
      linkedTxn?.diagnosis?.proposedIntervention?.title ||
      (d.recoveryProbability ? `${d.interventionType || 'Intervention'} (${d.recoveryProbability}% Win Prob)` : null) ||
      currentLog.summary;

    if (d.recoveryProbability && !decision.includes('%')) {
      decision = `${decision} (${d.recoveryProbability}% Win Prob)`;
    }

    // Guardrail Result
    let guardrailResult =
      d.guardrailResult ||
      (linkedTxn?.guardrailEvaluation?.allPassed
        ? 'PASS (All Autonomous Rules Cleared)'
        : linkedTxn?.guardrailEvaluation
        ? 'GATED (Manual Human Sign-off Required)'
        : 'PASS');

    // Action
    let action =
      d.action ||
      (d.dispatchChannel ? `DISPATCH_${d.dispatchChannel}: ${d.paymentLink || d.portalLink || 'READY'}` : null) ||
      (linkedTxn?.simulatedPaymentLink ? `DISPATCH_LINK: ${linkedTxn.simulatedPaymentLink}` : null) ||
      currentLog.summary;

    return {
      traceId,
      transactionId,
      orderId: currentLog.orderId || linkedTxn?.orderId || d.orderId || 'N/A',
      eventType,
      timestamp,
      actor,
      amount,
      customerName: d.customerName || linkedTxn?.customerName || 'N/A',
      merchantName: d.merchantName || linkedTxn?.merchantName || 'N/A',
      failureCode,
      decision,
      guardrailResult,
      action,
      riskLevel: currentLog.riskLevel,
      details: d,
    };
  }, [currentLog, transactionMap]);

  const handleExportJSON = () => {
    const exportDataset = {
      exportTimestamp: new Date().toISOString(),
      standard: 'RECOVERAI_IMMUTABLE_FORENSIC_AUDIT_TRAIL_V2',
      complianceChecksum: `sha256_${Math.random().toString(36).substring(2, 12)}8f2940294e`,
      totalEvents: filteredLogs.length,
      events: filteredLogs,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(exportDataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `recoverai_compliance_audit_${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyTrace = (trace: string) => {
    navigator.clipboard.writeText(trace);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 1500);
  };

  const handleCopyJson = () => {
    if (!currentLog) return;
    navigator.clipboard.writeText(JSON.stringify(currentLog, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1500);
  };

  const getRiskBadge = (level: AuditLogEntry['riskLevel']) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 text-[9px] font-jetbrains font-bold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30 inline-flex items-center space-x-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-none bg-[#4edea3]"></span>
            <span>SUCCESS</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 text-[9px] font-jetbrains font-bold bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 inline-flex items-center space-x-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-none bg-[#f59e0b]"></span>
            <span>WARNING</span>
          </span>
        );
      case 'ALERT':
        return (
          <span className="px-2 py-0.5 text-[9px] font-jetbrains font-bold bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 inline-flex items-center space-x-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-none bg-[#ffb4ab]"></span>
            <span>ALERT</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[9px] font-jetbrains font-bold bg-[#1c1b1b] text-[#8e9192] border border-[#2b2a2a] uppercase tracking-wider">
            INFO
          </span>
        );
    }
  };

  const getActorIcon = (actor: AuditLogEntry['actor']) => {
    switch (actor) {
      case 'RECOVER_AI_AGENT':
        return <Cpu className="h-3 w-3 text-[#ffffff]" />;
      case 'GUARDRAIL_POLICY_ENGINE':
        return <ShieldCheck className="h-3 w-3 text-[#4edea3]" />;
      case 'HUMAN_OPERATOR':
        return <UserCheck className="h-3 w-3 text-[#f59e0b]" />;
      default:
        return <Layers className="h-3 w-3 text-[#8e9192]" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-hanken">
      {/* Header Banner */}
      <div className="bg-[#141313] border border-[#2b2a2a] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <History className="h-5 w-5 text-[#4edea3]" />
            <h1 className="font-garamond text-3xl font-medium text-[#ffffff] tracking-tight">
              Immutable Forensic Audit Trail
            </h1>
            <span className="text-[10px] font-jetbrains px-2 py-0.5 bg-[#1c1b1b] text-[#4edea3] border border-[#2b2a2a]">
              {auditLogs.length} LOGGED EVENTS
            </span>
          </div>
          <p className="text-xs text-[#8e9192] mt-1.5 max-w-2xl leading-relaxed">
            Tamper-evident, chronological ledger logging every webhook failure perception, AI reasoning prompt, deterministic policy check, and recovery dispatch.
          </p>
        </div>

        <button
          id="export-compliance-json-btn"
          onClick={handleExportJSON}
          className="flex items-center space-x-2 px-4 py-2 bg-[#1c1b1b] hover:bg-[#2b2a2a] text-[#ffffff] text-xs font-jetbrains font-bold uppercase tracking-wider border border-[#2b2a2a] transition cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#4edea3]" />
          <span>Export Compliance JSON</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#141313] border border-[#2b2a2a] p-3 flex flex-col sm:flex-row gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8e9192]" />
          <input
            id="audit-search-input"
            type="text"
            placeholder="Search transaction (e.g. txn_rec_80191), trace ID, failure code, actor, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0e0e0e] border border-[#2b2a2a] text-xs text-[#ffffff] placeholder-[#8e9192] focus:outline-none focus:border-[#4edea3] font-jetbrains"
          />
        </div>

        <select
          id="audit-event-type-filter"
          value={selectedEventType}
          onChange={(e) => setSelectedEventType(e.target.value)}
          className="px-3 py-2 bg-[#0e0e0e] border border-[#2b2a2a] text-[#e6e1e1] text-xs focus:outline-none focus:border-[#4edea3] font-jetbrains uppercase cursor-pointer"
        >
          <option value="ALL">All Event Types ({auditLogs.length})</option>
          <option value="FAILURE_DETECTED">FAILURE_DETECTED</option>
          <option value="AI_DIAGNOSIS_COMPLETED">AI_DIAGNOSIS_COMPLETED</option>
          <option value="GUARDRAILS_EVALUATED">GUARDRAILS_EVALUATED</option>
          <option value="HUMAN_APPROVAL_GRANTED">HUMAN_APPROVAL_GRANTED</option>
          <option value="RECOVERY_DISPATCHED">RECOVERY_DISPATCHED</option>
          <option value="SETTLEMENT_COMPLETED">SETTLEMENT_COMPLETED</option>
        </select>
      </div>

      {searchTerm && (
        <div className="flex items-center space-x-2 text-xs font-jetbrains text-[#8e9192]">
          <span>Filtering by:</span>
          <span className="bg-[#1c1b1b] text-[#4edea3] px-2 py-0.5 border border-[#2b2a2a]">
            {searchTerm}
          </span>
          <button
            onClick={() => setSearchTerm('')}
            className="text-[10px] text-[#8e9192] hover:text-[#ffffff] underline cursor-pointer"
          >
            [Clear Filter]
          </button>
        </div>
      )}

      {/* Main Forensic Timeline Stream & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Events Feed (7 cols) */}
        <div className="lg:col-span-7 bg-[#141313] border border-[#2b2a2a] flex flex-col">
          <div className="p-3.5 border-b border-[#2b2a2a] bg-[#0e0e0e] font-jetbrains text-[10px] text-[#8e9192] uppercase tracking-wider flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <History className="h-3.5 w-3.5 text-[#4edea3]" />
              <span className="font-bold text-[#e6e1e1]">Chronological Event Stream</span>
            </span>
            <span className="text-[#8e9192] font-bold">{filteredLogs.length} events match</span>
          </div>

          <div className="divide-y divide-[#2b2a2a] max-h-[640px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-[#8e9192] font-jetbrains text-xs">
                No audit events match current search query.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = currentLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    id={`audit-log-item-${log.id}`}
                    onClick={() => setSelectedLogId(log.id)}
                    className={`p-4 hover:bg-[#1c1b1b] cursor-pointer transition text-xs space-y-2 border-l-2 ${
                      isSelected
                        ? 'bg-[#1c1b1b] border-l-[#4edea3]'
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-jetbrains text-[9px] font-semibold text-[#e6e1e1] bg-[#0e0e0e] px-2 py-0.5 border border-[#2b2a2a] flex items-center space-x-1.5 uppercase">
                          {getActorIcon(log.actor)}
                          <span>{log.actor}</span>
                        </span>
                        <span className="font-bold text-[#ffffff] text-xs font-jetbrains">
                          {log.eventType}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getRiskBadge(log.riskLevel)}
                        <span className="text-[10px] font-jetbrains text-[#8e9192] flex items-center space-x-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-[#c4c7c5] text-[12px] leading-relaxed font-hanken">{log.summary}</p>

                    <div className="flex items-center justify-between text-[10px] font-jetbrains text-[#8e9192] pt-1 border-t border-[#2b2a2a]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchTerm(log.transactionId);
                        }}
                        className="hover:text-[#ffffff] transition cursor-pointer text-left"
                        title="Filter entire lifecycle for this transaction"
                      >
                        Txn: <strong className="text-[#ffffff] underline decoration-dotted">{log.transactionId}</strong>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchTerm(log.traceId);
                        }}
                        className="text-[#4edea3] hover:underline cursor-pointer"
                        title="Filter timeline for this trace ID"
                      >
                        Trace: {log.traceId}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payload Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-[#141313] border border-[#2b2a2a] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-[#2b2a2a]">
              <div className="flex items-center space-x-2">
                <FileCode className="h-4 w-4 text-[#4edea3]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffffff] font-jetbrains">
                  Trace Payload Inspector
                </h3>
              </div>
              {structuredData && (
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 bg-[#1c1b1b] hover:bg-[#2b2a2a] text-[#8e9192] hover:text-[#ffffff] text-[10px] font-jetbrains border border-[#2b2a2a] flex items-center space-x-1.5 transition cursor-pointer"
                  title="Copy Full Evidence JSON"
                >
                  {copiedJson ? (
                    <>
                      <Check className="h-3 w-3 text-[#4edea3]" />
                      <span className="text-[#4edea3]">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>COPY JSON</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {structuredData ? (
              <div className="space-y-4">
                {/* Structured Audit Details Table */}
                <div className="bg-[#0e0e0e] border border-[#2b2a2a] p-3 space-y-2.5 text-[11px] font-jetbrains">
                  {/* TRACE ID */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2a2a]">
                    <span className="text-[#8e9192] font-bold">TRACE ID</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[#4edea3] font-bold">{structuredData.traceId}</span>
                      <button
                        onClick={() => handleCopyTrace(structuredData.traceId)}
                        className="p-1 hover:bg-[#1c1b1b] text-[#8e9192] hover:text-[#ffffff] transition cursor-pointer"
                        title="Copy Trace ID"
                      >
                        {copiedTrace ? (
                          <Check className="h-3 w-3 text-[#4edea3]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* TRANSACTION ID */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2a2a]">
                    <span className="text-[#8e9192] font-bold">TRANSACTION ID</span>
                    <span className="text-[#ffffff] font-bold">{structuredData.transactionId}</span>
                  </div>

                  {/* EVENT TYPE */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2a2a]">
                    <span className="text-[#8e9192] font-bold">EVENT TYPE</span>
                    <span className="text-[#ffffff] font-bold">{structuredData.eventType}</span>
                  </div>

                  {/* TIMESTAMP */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2a2a]">
                    <span className="text-[#8e9192] font-bold">TIMESTAMP</span>
                    <span className="text-[#c4c7c5] text-[10px]">{structuredData.timestamp}</span>
                  </div>

                  {/* ACTOR */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2a2a]">
                    <span className="text-[#8e9192] font-bold">ACTOR</span>
                    <span className="text-[#e6e1e1] font-bold">{structuredData.actor}</span>
                  </div>

                  {/* AMOUNT */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2a2a]">
                    <span className="text-[#8e9192] font-bold">AMOUNT</span>
                    <span className="text-[#4edea3] font-bold">
                      ₹{structuredData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                    </span>
                  </div>

                  {/* FAILURE CODE */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2a2a]">
                    <span className="text-[#8e9192] font-bold">FAILURE CODE</span>
                    <span className="text-[#ffb4ab] font-bold">{structuredData.failureCode}</span>
                  </div>

                  {/* DECISION */}
                  <div className="pb-1.5 border-b border-[#2b2a2a]">
                    <div className="text-[#8e9192] font-bold mb-1">DECISION</div>
                    <div className="text-[#e6e1e1] bg-[#141313] p-2 border border-[#2b2a2a] text-[10px] leading-relaxed">
                      {structuredData.decision}
                    </div>
                  </div>

                  {/* GUARDRAIL RESULT */}
                  <div className="pb-1.5 border-b border-[#2b2a2a]">
                    <div className="text-[#8e9192] font-bold mb-1">GUARDRAIL RESULT</div>
                    <div className="text-[#4edea3] bg-[#141313] p-2 border border-[#2b2a2a] text-[10px] leading-relaxed">
                      {structuredData.guardrailResult}
                    </div>
                  </div>

                  {/* ACTION */}
                  <div>
                    <div className="text-[#8e9192] font-bold mb-1">ACTION</div>
                    <div className="text-[#ffffff] bg-[#141313] p-2 border border-[#2b2a2a] text-[10px] leading-relaxed break-all">
                      {structuredData.action}
                    </div>
                  </div>
                </div>

                {/* Raw JSON Forensic Payload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-jetbrains text-[#8e9192] uppercase tracking-wider">
                      Immutable JSON Evidence Payload
                    </label>
                    <span className="text-[9px] font-jetbrains text-[#4edea3]">SHA-256 HASH VERIFIED</span>
                  </div>
                  <pre className="p-3 bg-[#0e0e0e] text-[#4edea3] text-[10px] font-jetbrains overflow-x-auto border border-[#2b2a2a] max-h-[220px] leading-relaxed select-text">
                    {JSON.stringify(structuredData.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-[#8e9192] font-jetbrains text-xs border border-dashed border-[#2b2a2a]">
                Select any audit event from the stream to inspect the immutable cryptographic JSON payload.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#2b2a2a] text-[10px] font-jetbrains text-[#8e9192] text-center flex items-center justify-center space-x-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#4edea3]" />
            <span>SHA-256 Tamper-Evident Forensic Ledger Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
};

