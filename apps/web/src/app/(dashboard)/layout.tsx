import React from 'react';
import { DatabaseModeProvider } from '@/contexts/database-mode-context';
import { WebPortalAuthGuard } from '@/rbac/guards/WebPortalAuthGuard';
import { SandboxRbacSwitcher } from '@/components/dev/SandboxRbacSwitcher';
import { TopHeader } from '@/components/layout/top-header';
import { TopNavTabs } from '@/components/layout/top-nav-tabs';
import { TimeClockProvider } from '@/contexts/time-clock-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DatabaseModeProvider>
      <WebPortalAuthGuard>
        <TimeClockProvider>
          <div suppressHydrationWarning className="min-h-screen bg-slate-100/80 flex flex-col text-slate-900">
            {/* 1. Pinned Sticky Header & Nav Container */}
            <div suppressHydrationWarning className="sticky top-0 z-40 flex flex-col shadow-sm">
              {/* Top Utility Header */}
              <TopHeader />
              {/* Secondary Horizontal Navigation Bar */}
              <TopNavTabs />
            </div>

            {/* 2. Wider Main Page Content Area with Reduced Inset Padding */}
            <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-6 flex flex-col space-y-3 flex-1">
              <main className="flex-1">
                {children}
              </main>
            </div>

            {/* 3. Dev Sandbox Preview Switcher */}
            <SandboxRbacSwitcher />
          </div>
        </TimeClockProvider>
      </WebPortalAuthGuard>
    </DatabaseModeProvider>
  );
}
