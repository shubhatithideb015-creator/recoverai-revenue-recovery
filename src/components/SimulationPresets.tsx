/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SIMULATION_PRESETS } from '../data/seedData';
import { SimulationPreset, AtRiskTransaction } from '../types';
import { Zap, CreditCard, ShieldAlert, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface SimulationPresetsProps {
  onSelectPreset: (preset: SimulationPreset) => void;
}

export const SimulationPresets: React.FC<SimulationPresetsProps> = ({ onSelectPreset }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="h-4 w-4 text-amber-400" />;
      case 'CreditCard':
        return <CreditCard className="h-4 w-4 text-purple-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case 'AlertCircle':
        return <AlertCircle className="h-4 w-4 text-sky-400" />;
      case 'RefreshCw':
        return <RefreshCw className="h-4 w-4 text-emerald-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-teal-400" />;
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            Quick Failure Simulation Studio
          </h3>
          <span className="text-xs text-slate-400">
            (Inject realistic Razorpay failure scenarios to test AI reasoning & guardrails)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {SIMULATION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            id={`preset-btn-${preset.id}`}
            onClick={() => onSelectPreset(preset)}
            className="flex flex-col text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 rounded-md bg-slate-900 border border-slate-700/50">
                {getIcon(preset.iconName)}
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
                {preset.badge}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition line-clamp-1">
              {preset.title}
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
              {preset.subtitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
