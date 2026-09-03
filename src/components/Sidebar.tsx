/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavigationTab } from '../types';
import {
  Terminal,
  Layers,
  Network,
  ShieldAlert,
  Archive,
  FlaskConical,
  HelpCircle,
  LogOut,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenLearningGuide: () => void;
  pendingHumanCount: number;
  auditCount: number;
  totalAtRiskCount: number;
}

interface NavItemConfig {
  tab: NavigationTab;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeType?: 'alert' | 'count' | 'neutral';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenLearningGuide,
  pendingHumanCount,
  auditCount,
  totalAtRiskCount,
}) => {
  const navItems: NavItemConfig[] = [
    {
      tab: 'OVERVIEW',
      label: 'TERMINAL',
      sublabel: 'Command Center',
      icon: Terminal,
    },
    {
      tab: 'TRANSACTIONS',
      label: 'ASSETS',
      sublabel: 'Live Queue',
      icon: Layers,
      badge: totalAtRiskCount > 0 ? totalAtRiskCount : undefined,
      badgeType: 'count',
    },
    {
      tab: 'AI_AGENT',
      label: 'INTELLIGENCE',
      sublabel: 'Gemini Flash Agent',
      icon: Sparkles,
    },
    {
      tab: 'GUARDRAILS',
      label: 'NETWORK & POLICY',
      sublabel: 'Zero-Trust Engine',
      icon: Network,
      badge: pendingHumanCount > 0 ? `${pendingHumanCount} GATED` : undefined,
      badgeType: 'alert',
    },
    {
      tab: 'AUDIT_TRAIL',
      label: 'ARCHIVE',
      sublabel: 'Forensic Stream',
      icon: Archive,
      badge: auditCount > 0 ? auditCount : undefined,
      badgeType: 'neutral',
    },
    {
      tab: 'SIMULATION_LAB',
      label: 'SANDBOX',
      sublabel: 'Stress Testing',
      icon: FlaskConical,
    },
  ];

  return (
    <aside
      id="recoverai-sidebar"
      className="w-60 bg-[#141313] border-r border-[#2b2a2a] flex flex-col justify-between h-screen flex-shrink-0 z-30 select-none font-hanken"
    >
      {/* 1. Header / Operator Verified Session Block */}
      <div>
        <div className="p-4 border-b border-[#2b2a2a] flex items-center space-x-3 bg-[#0f0e0e]">
          <div className="h-9 w-9 bg-[#1c1b1b] border border-[#2b2a2a] flex items-center justify-center text-[#e6e1e1]">
            <ShieldCheck className="h-4 w-4 text-[#4edea3]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-jetbrains text-[12px] font-bold text-[#ffffff] tracking-wider">
                OP-01
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] inline-block" />
            </div>
            <div className="font-jetbrains text-[9px] text-[#8e9192] tracking-widest uppercase">
              VERIFIED SESSION
            </div>
          </div>
        </div>

        {/* 2. Primary Navigation Terminal List */}
        <nav className="py-2 space-y-0.5" aria-label="Terminal Workspaces">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;

            return (
              <button
                key={item.tab}
                id={`sidebar-nav-${item.tab.toLowerCase()}`}
                onClick={() => onSelectTab(item.tab)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors relative ${
                  isActive
                    ? 'bg-[#1c1b1b] text-[#ffffff] border-l-2 border-[#ffffff]'
                    : 'text-[#8e9192] hover:text-[#e6e1e1] hover:bg-[#1c1b1b]/50 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      isActive ? 'text-[#ffffff]' : 'text-[#8e9192]'
                    }`}
                  />
                  <span className="font-jetbrains text-[11px] font-bold tracking-wider uppercase">
                    {item.label}
                  </span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`font-jetbrains text-[9px] px-1.5 py-0.5 font-bold ${
                      item.badgeType === 'alert'
                        ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40'
                        : item.badgeType === 'count'
                        ? 'bg-[#2b2a2a] text-[#e6e1e1] border border-[#444748]'
                        : 'bg-[#1c1b1b] text-[#8e9192]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Secondary: Architecture Handbook Trigger */}
        <div className="pt-2 border-t border-[#2b2a2a] px-2">
          <button
            id="sidebar-btn-handbook"
            onClick={onOpenLearningGuide}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-[#8e9192] hover:text-[#e6e1e1] hover:bg-[#1c1b1b] transition-colors"
          >
            <HelpCircle className="h-4 w-4 flex-shrink-0" />
            <span className="font-jetbrains text-[10px] font-bold tracking-wider uppercase">
              SPEC & ARCHITECTURE
            </span>
          </button>
        </div>
      </div>

      {/* 3. Bottom Terminal Controls */}
      <div className="p-3 border-t border-[#2b2a2a] space-y-2 bg-[#0f0e0e]">
        <button
          id="sidebar-btn-initiate-recovery"
          onClick={() => onSelectTab('SIMULATION_LAB')}
          className="w-full py-2.5 px-3 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-jetbrains text-[10px] font-bold tracking-widest uppercase transition text-center block"
        >
          INITIATE RECOVERY
        </button>

        <button
          id="sidebar-btn-logout"
          onClick={() => alert('RecoverAI session active. Operator OP-01 authenticated.')}
          className="w-full flex items-center space-x-2 px-3 py-1.5 text-[#8e9192] hover:text-[#e6e1e1] text-left transition font-jetbrains text-[10px] uppercase tracking-wider"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>SESSION LOGOUT</span>
        </button>
      </div>
    </aside>
  );
};
