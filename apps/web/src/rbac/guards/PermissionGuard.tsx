'use client';

/**
 * PermissionGuard: Restricts route access based on required UserPermissions keys.
 * Redirects unauthorized users to /schedule with an alert or message.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/auth/sessionStore';
import { UserPermissions } from '../permissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: keyof UserPermissions;
  fallbackMessage?: string;
  redirectTo?: string;
}

export function PermissionGuard({
  children,
  requiredPermission,
  fallbackMessage = 'You do not have permission to access this page or feature.',
  redirectTo = '/schedule',
}: PermissionGuardProps) {
  const { currentUser, permissions, isLoading } = useSession();
  const router = useRouter();

  const isGranted = React.useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.accountType === 'admin') return true; // Admins bypass all UI guards

    const value = permissions[requiredPermission];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'Cannot Schedule Any Events';
    return Boolean(value);
  }, [currentUser, permissions, requiredPermission]);

  useEffect(() => {
    if (!isLoading && currentUser && !isGranted) {
      const timer = setTimeout(() => {
        router.replace(redirectTo);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentUser, isGranted, router, redirectTo]);

  if (isLoading) {
    return null;
  }

  if (!currentUser) {
    return null;
  }

  if (!isGranted) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-14 h-14 bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {fallbackMessage}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.replace(redirectTo)}
          className="gap-2 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Schedule</span>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
