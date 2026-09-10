'use client';

/**
 * SandboxRbacSwitcher: Developer & Admin preview widget for instant RBAC & Database Mode routing.
 * Strictly gated: Only visible to authorized administrator Justin Lung in production/staging builds.
 * Hidden completely for external testers.
 */

import React, { useState } from 'react';
import { useSession } from '@/auth/sessionStore';
import { useDatabaseMode } from '@/contexts/database-mode-context';
import { DatabaseMode } from '@murphys/domain';
import { ALL_ACCOUNT_TYPES, getAccountTypeDisplayName } from '@/rbac/accountTypes';
import { ALL_DISPATCH_GROUPS, getDispatchGroupDisplayName } from '@/rbac/dispatchGroups';
import { Shield, ChevronUp, ChevronDown, Check, RefreshCw, Smartphone, Monitor, Database } from 'lucide-react';

export function SandboxRbacSwitcher() {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const { currentUser, permissions, switchRole, resetSandboxOverride, isSandboxOverride } = useSession();
  const { databaseMode, setDatabaseMode } = useDatabaseMode();

  // Strictly gated: Visible when logged in as admin
  const userEmail = currentUser?.email?.toLowerCase().trim();
  const isAuthorizedAdmin =
    userEmail === 'admin@apex.com' ||
    currentUser?.accountType === 'admin' ||
    userEmail === 'justinlung@murphyshomeservices.com' ||
    currentUser?.id === 'usr-admin';

  if (!isAuthorizedAdmin) {
    return null;
  }

  const currentAccountType = currentUser?.accountType || 'office';
  const currentGroup = currentUser?.dispatchGroup || 'office_staff';

  return (
    <aside aria-label="Dev RBAC Sandbox Switcher" className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Floating Pill Toggle Button */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 text-white rounded-full shadow-lg border border-slate-700 hover:bg-slate-800 transition-all text-xs font-semibold backdrop-blur-xs cursor-pointer focus:outline-none"
        title="Toggle RBAC Sandbox Preview Switcher"
      >
        <Shield className="w-3.5 h-3.5 text-amber-400" />
        <span>RBAC:</span>
        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
          currentAccountType === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
          currentAccountType === 'office' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
          'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        }`}>
          {getAccountTypeDisplayName(currentAccountType)}
        </span>
        <span className="text-slate-500">|</span>
        <Database className="w-3 h-3 text-emerald-400" />
        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
          databaseMode === 'live' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        }`}>
          {databaseMode}
        </span>
        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronUp className="w-3 h-3 text-slate-400" />}
      </button>

      {/* Expanded Control Panel */}
      {isExpanded && (
        <div className="absolute bottom-12 right-0 w-80 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700 p-4 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                RBAC & DB Sandbox
              </h3>
            </div>
            {isSandboxOverride && (
              <button
                onClick={resetSandboxOverride}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                title="Reset to live Firebase Auth state"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Database Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Database className="w-3 h-3 text-emerald-400" />
              Database Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['sandbox', 'live'] as DatabaseMode[]).map((mode) => {
                const isActive = databaseMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setDatabaseMode(mode)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-center cursor-pointer border ${
                      isActive
                        ? mode === 'live'
                          ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Type Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Account Type (Role)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {ALL_ACCOUNT_TYPES.map((type) => {
                const isActive = currentAccountType === type;
                return (
                  <button
                    key={type}
                    onClick={() => switchRole(type, currentGroup)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center flex flex-col items-center gap-0.5 cursor-pointer border ${
                      isActive
                        ? type === 'admin'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : type === 'office'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="capitalize">{type}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      {type === 'field' ? <Smartphone className="w-2.5 h-2.5" /> : <Monitor className="w-2.5 h-2.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dispatch Group Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Dispatch Group
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_DISPATCH_GROUPS.map((group) => {
                const isActive = currentGroup === group;
                return (
                  <button
                    key={group}
                    onClick={() => switchRole(currentAccountType, group)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{getDispatchGroupDisplayName(group)}</span>
                    {isActive && <Check className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Capabilities Checklist */}
          <div className="space-y-1 pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400 font-semibold block mb-1">Active Capabilities:</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${permissions.hasWebPortalAccess ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className={permissions.hasWebPortalAccess ? 'text-slate-200' : 'text-slate-500 line-through'}>Web Portal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${permissions.canCreateInvoices ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className={permissions.canCreateInvoices ? 'text-slate-200' : 'text-slate-500 line-through'}>Invoices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${permissions.canEditPrices ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className={permissions.canEditPrices ? 'text-slate-200' : 'text-slate-500 line-through'}>Edit Prices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${permissions.canModifyPriceBook ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className={permissions.canModifyPriceBook ? 'text-slate-200' : 'text-slate-500 line-through'}>Price Book</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <span className={`w-1.5 h-1.5 rounded-full ${permissions.canSwitchTechnicianSchedules ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className={permissions.canSwitchTechnicianSchedules ? 'text-slate-200' : 'text-slate-500 line-through'}>Cross-Tech Scheduling</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
