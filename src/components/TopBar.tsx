/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Search,
  Settings,
  Bell,
  Plus,
  Shield,
  Activity,
} from 'lucide-react';

interface TopBarProps {
  onOpenCustomInjector: () => void;
  recoveredTotalToday: number;
  totalAtRiskToday: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCustomInjector,
  recoveredTotalToday,
  totalAtRiskToday,
}) => {
  return (
    <header
      id="recoverai-topbar"
      className="h-14 bg-[#141313] border-b border-[#2b2a2a] px-6 flex items-center justify-between z-20 flex-shrink-0 select-none"
    >
      {/* Left: Brand Wordmark & Global Search */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 bg-[#ffffff] flex items-center justify-center text-[#141313]">
            <Shield className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="font-garamond text-xl font-medium tracking-tight text-[#ffffff]">
            RecoverAI
          </span>
        </div>

        {/* Minimalist Search / CMD+K */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-[#0f0e0e] border border-[#2b2a2a] text-[#8e9192] text-xs">
          <Search className="h-3.5 w-3.5" />
          <span className="font-hanken text-[12px] text-[#8e9192]">Search / CMD+K</span>
        </div>
      </div>

      {/* Center: High-Level Operational Metrics Ticker */}
      <div className="hidden lg:flex items-center space-x-6 font-jetbrains text-[11px]">
        <div className="flex items-center space-x-2">
          <span className="text-[#8e9192] tracking-wider uppercase text-[10px]">At-Risk:</span>
          <span className="text-[#ffb4ab] font-bold">₹{totalAtRiskToday.toLocaleString('en-IN')}</span>
        </div>
        <span className="text-[#2b2a2a]">/</span>
        <div className="flex items-center space-x-2">
          <span className="text-[#8e9192] tracking-wider uppercase text-[10px]">Recovered:</span>
          <span className="text-[#4edea3] font-bold">₹{recoveredTotalToday.toLocaleString('en-IN')}</span>
        </div>
        <span className="text-[#2b2a2a]">/</span>
        <div className="flex items-center space-x-1.5 text-[#8e9192]">
          <Activity className="h-3 w-3 text-[#4edea3]" />
          <span>18ms</span>
        </div>
      </div>

      {/* Right: Operational Status, Action Trigger, Settings */}
      <div className="flex items-center space-x-3">
        {/* Inject Webhook CTA */}
        <button
          id="btn-topbar-inject"
          onClick={onOpenCustomInjector}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1c1b1b] hover:bg-[#2b2a2a] text-[#e6e1e1] border border-[#444748] font-jetbrains text-[10px] font-bold tracking-wider uppercase transition"
        >
          <Plus className="h-3.5 w-3.5 text-[#4edea3]" />
          <span>INJECT EVENT</span>
        </button>

        {/* Operational Status Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#1c1b1b] border border-[#2b2a2a] text-[#e6e1e1]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse inline-block" />
          <span className="font-jetbrains text-[10px] font-bold tracking-widest uppercase">
            OPERATIONAL
          </span>
        </div>

        {/* Global Settings & Notifications */}
        <div className="flex items-center space-x-1 text-[#8e9192]">
          <button
            title="System Configuration"
            className="p-1.5 hover:text-[#e6e1e1] hover:bg-[#1c1b1b] transition"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            title="Sentry Alerts"
            className="p-1.5 hover:text-[#e6e1e1] hover:bg-[#1c1b1b] transition relative"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-[#f59e0b] rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};
