/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuditLogEntry } from '../types';
import {
  X,
  ShieldCheck,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Terminal,
  FileText,
} from 'lucide-react';

interface AuditTrailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLogEntry[];
}

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({
  isOpen,
  onClose,
  auditLogs,
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.traceId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedEventType === 'ALL' || log.eventType === selectedEventType;

    return matchesSearch && matchesType;
  });

  const getRiskBadge = (level: AuditLogEntry['riskLevel']) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SUCCESS
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            WARNING
          </span>
        );
      case 'ALERT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            ALERT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            INFO
          </span>
        );
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recoverai_audit_trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Immutable Audit Trail</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {auditLogs.length} events logged
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tamper-evident logs of every AI decision, policy check, and recovery action
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-3 bg-slate-950 border-b border-slate-800/80 flex flex-col sm:flex-row gap-2 text-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search trace ID, event, transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto">
            {['ALL', 'FAILURE_DETECTED', 'AI_DIAGNOSIS_COMPLETED', 'RECOVERY_ACTION_EXECUTED', 'PAYMENT_SETTLED_RECOVERED'].map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setSelectedEventType(type)}
                  className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition ${
                    selectedEventType === type
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'ALL' ? 'All Logs' : type.replace(/_/g, ' ').slice(0, 14)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Logs Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              No audit records matching your criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-3.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800/60 cursor-pointer transition text-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {log.actor}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {log.eventType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRiskBadge(log.riskLevel)}
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 mb-2">{log.summary}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Txn: {log.transactionId}</span>
                  <span>Trace: {log.traceId}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Inspection Modal for Single Log Detail */}
        {selectedLog && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">
                Payload Details ({selectedLog.traceId})
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close Inspector
              </button>
            </div>
            <pre className="p-2 bg-slate-900 text-emerald-400 text-[11px] font-mono rounded overflow-x-auto border border-slate-800">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
