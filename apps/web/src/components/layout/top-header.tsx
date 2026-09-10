'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  Flag, 
  Settings, 
  ChevronDown, 
  User, 
  LogOut 
} from 'lucide-react';
import { MenuTrigger, Menu, MenuItem, MenuButton, MenuSeparator } from '@/components/ui';
import { useTimeClock } from '@/contexts/time-clock-context';
import { useSession } from '@/auth/sessionStore';
import { useFollowUps } from '@/hooks/useFollowUps';
import { getAccountTypeDisplayName } from '@/rbac/accountTypes';

export function TopHeader() {
  const router = useRouter();
  const { currentUser, permissions, signOut } = useSession();
  const { activeShiftSeconds, formatDuration } = useTimeClock();
  const { followUps } = useFollowUps();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAccessSettings = currentUser?.accountType === 'admin' || permissions.moreAppsAndSettingsVisibility;

  const activeFlagsCount = React.useMemo(() => {
    if (!followUps || followUps.length === 0) return 0;
    const currentUserName = (currentUser?.name || '').toLowerCase().trim();
    return followUps.filter((f) => {
      if (f.isComplete || f.isArchived) return false;
      const flagAssignee = (f.assignedTo || (f as any).assignee || '').toLowerCase().trim();
      if (!currentUserName || currentUser?.accountType === 'office') {
        return true;
      }
      return flagAssignee.includes(currentUserName) || !flagAssignee || flagAssignee === 'unassigned';
    }).length;
  }, [followUps, currentUser]);

  // Default to the AppLogoExample logo asset `/app-logo-example.png`
  const [logoSrc, setLogoSrc] = useState<string>('/app-logo-example.png');

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoSrc(url);
    }
  };

  const handleOpenMyProfile = () => {
    const targetUserId = currentUser?.id || currentUser?.uid || '';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-user-profile', { detail: { userId: targetUserId, email: currentUser?.email } }));
    }
    if (targetUserId) {
      router.push(`/settings?tab=users&userId=${targetUserId}`);
    } else {
      router.push('/settings?tab=users');
    }
  };

  return (
    <header className="w-full h-11 sm:h-12 bg-[#3f6b35] text-white shadow-md border-b border-[#34572c] flex items-center">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 h-full flex items-center justify-between">
        {/* Left Side: Brand Logo (AppLogoExample) */}
        <div className="flex items-center h-full">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center h-full cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
            title="Click to replace logo image"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <img 
              src={logoSrc} 
              alt="Apex Field Solutions" 
              className="h-[22px] sm:h-[24px] w-auto max-w-[160px] object-contain object-left block" 
            />
          </div>
        </div>

        {/* Right Side Utility Indicators */}
        <div className="flex items-center gap-3 sm:gap-4 text-sm h-full">
          {/* Active Timer Widget (00:00:00) -> Links to /time-clock */}
          <Link
            href="/time-clock"
            className="flex items-center gap-1.5 px-1 py-0.5 rounded cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-emerald-100 hover:text-white transition-colors"
            title="Time Clock (Click to view hours & clock in/out)"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <div suppressHydrationWarning className="inline-flex items-center text-xs sm:text-sm font-medium tracking-tight text-emerald-100">
              {formatDuration(activeShiftSeconds).split('').map((char, idx) => (
                <span
                  key={idx}
                  className={char === ':' ? "w-1 text-center text-emerald-300/80 inline-block" : "w-2 text-center inline-block"}
                >
                  {char}
                </span>
              ))}
            </div>
          </Link>

          {/* Flags Indicator */}
          <Link
            href="/jobs/list?flagged=true"
            className="flex items-center gap-1.5 text-amber-200 px-1 py-0.5 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
            title="Active System Flags"
          >
            <div className="relative flex items-center">
              <Flag className="w-3.5 h-3.5 text-amber-300 fill-amber-300/40" />
              {activeFlagsCount > 0 && (
                <span className="absolute -top-2 -right-2.5 bg-red-600 text-white text-[9px] font-bold px-1 py-0.2 rounded-full min-w-[14px] text-center leading-tight shadow-xs">
                  {activeFlagsCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium whitespace-nowrap">Flags</span>
          </Link>

          {/* Settings Icon Link (Permission Protected) */}
          {canAccessSettings && (
            <Link 
              href="/settings"
              className="p-1 text-white/90 cursor-pointer flex items-center justify-center outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
              title="Portal Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* User Profile Dropdown */}
          <MenuTrigger>
            <MenuButton
              variant="ghost"
              className="flex items-center gap-1 px-1 py-0.5 cursor-pointer text-white hover:text-white font-semibold text-xs border-0 border-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 ring-offset-0 focus:ring-offset-0 focus-visible:ring-offset-0 bg-transparent hover:bg-transparent transition-none"
              aria-label="User account menu"
            >
              <span suppressHydrationWarning className="text-white hover:text-white">
                {(currentUser?.name || currentUser?.email || 'User').replace(/\s*\(.*?\)\s*/g, '').trim()}
              </span>
              <ChevronDown className="w-3 h-3 text-white" />
            </MenuButton>
            <Menu placement="bottom end" popoverClassName="min-w-[170px]">
              <MenuItem
                onAction={handleOpenMyProfile}
                href={currentUser?.id ? `/settings?tab=users&userId=${currentUser.id}` : '/settings?tab=users'}
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>My Profile</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                variant="danger"
                onAction={async () => {
                  await signOut();
                  router.push('/login');
                }}
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>Sign Out</span>
              </MenuItem>
            </Menu>
          </MenuTrigger>
        </div>
      </div>
    </header>
  );
}
