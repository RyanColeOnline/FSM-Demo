'use client';

/**
 * WebPortalAuthGuard: Intercepts unauthenticated users and 'field' accounts from accessing the web portal.
 */

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/auth/sessionStore';
import { Smartphone, ShieldAlert, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function WebPortalAuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, permissions, isLoading, signOut, switchRole, isSandboxOverride } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

  // Loading state while verifying Firebase Auth & Firestore session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <img src="/login-logo-dark.png" alt="Murphy's" className="h-16 object-contain opacity-90 animate-pulse" />
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Loading portal session...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    return null; // Will redirect via useEffect
  }

  // If user is logged in as a field technician or lacks web portal access
  if (!permissions.hasWebPortalAccess || currentUser.accountType === 'field') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-12">
        {/* Top Header Brand */}
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <img src="/login-logo-dark.png" alt="Apex Logo" className="h-10 object-contain" />
            <span className="text-lg font-bold tracking-tight text-white pl-2 border-l border-white/20">
              Apex FSM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/80 text-blue-200 border border-blue-700">
              Role: Field Technician
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="max-w-xl mx-auto w-full my-auto py-8">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xs text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <Smartphone className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Mobile App Access Only
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Field Technician accounts cannot access the Web Management Portal. Please use the <span className="font-semibold text-white">Apex Mobile App</span> on your iOS device to view schedules, log time, and manage job invoices.
              </p>
            </div>

            {/* Mobile App Download Card */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 text-left flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Need Web Access?</h4>
                  <p className="text-xs text-slate-400">
                    Contact your office administrator to request an Office Staff or Admin role.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full justify-center bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-2 text-slate-400" />
                Sign Out
              </Button>

              {(currentUser?.email?.toLowerCase().trim() === 'justinlung@murphyshomeservices.com' || currentUser?.id === 'DtSwSvfAHcUHYTgWYyMoxOjO4Xp1' || currentUser?.id === 'usr-7') && (
                <Button
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  onClick={() => switchRole('office', 'office_staff')}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Dev Switch to Office
                </Button>
              )}
            </div>

            {isSandboxOverride && (currentUser?.email?.toLowerCase().trim() === 'justinlung@murphyshomeservices.com' || currentUser?.id === 'DtSwSvfAHcUHYTgWYyMoxOjO4Xp1') && (
              <p className="text-xs text-amber-400/90 italic">
                Active in Dev Sandbox Preview Mode
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 max-w-4xl mx-auto w-full">
          Murphy&apos;s Home Services &copy; {new Date().getFullYear()} &bull; All Rights Reserved
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
