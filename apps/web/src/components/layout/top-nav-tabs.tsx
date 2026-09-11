'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronRight,
  PhoneCall, 
  Folder, 
  List, 
  FileText, 
  DollarSign, 
  Coins, 
  Files, 
  Trophy, 
  ShoppingCart,
  CreditCard,
  Activity,
  BookOpen,
  ClipboardCheck,
  Package,
  Clock,
  Megaphone,
  Truck,
  Database,
  Building2,
  FileCheck,
  LayoutDashboard,
  Settings2,
  Receipt,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';

interface SubMenuItem {
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface MenuItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  hasSubmenu?: boolean;
  submenuItems?: SubMenuItem[];
}

import { useSession } from '@/auth/sessionStore';

export function TopNavTabs() {
  const pathname = usePathname() || '/';
  const { currentUser, permissions } = useSession();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const canViewReporting = currentUser?.accountType === 'admin' || permissions.reportingTabVisibility;
  const canViewMore = isMounted && (currentUser?.accountType === 'admin' || permissions.moreAppsAndSettingsVisibility);

  // Safe Mouse Zone Handlers
  const handleMouseEnterNav = (key: string | null) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpenDropdown(key);
    if (!key) setActiveSubmenu(null);
  };

  const handleMouseLeaveNav = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
      setActiveSubmenu(null);
    }, 150);
  };

  const handleMouseEnterItem = (item: MenuItem) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (item.hasSubmenu) {
      setActiveSubmenu(item.label);
    } else {
      setActiveSubmenu(null); // Submenu closes immediately when hovering over sibling without a submenu!
    }
  };

  // Menu lists definitions
  const jobsMenuItems: MenuItem[] = [
    { label: 'Call List', href: '/jobs/call-list', icon: PhoneCall },
    { label: 'Job List', href: '/jobs/list', icon: Folder },
    { label: 'Invoice List', href: '/jobs/invoice-list', icon: List },
    { label: 'Proposal List', href: '/jobs/proposal-list', icon: FileText },
    { label: 'Payment List', href: '/jobs/payment-list', icon: DollarSign },
    { label: 'Maintenance Plan List', href: '/jobs/maintenance-plan-list', icon: Files },
  ];

  // Payment Options menu
  const paymentOptionItems: MenuItem[] = [
    { 
      label: 'Payments', 
      icon: DollarSign,
      hasSubmenu: true,
      submenuItems: [
        { label: 'Process Payment', href: '/payment-options/payments/process-payment', icon: DollarSign },
      ]
    },
    { 
      label: 'Financing', 
      icon: CreditCard,
      hasSubmenu: true,
      submenuItems: [
        { label: 'Consumer Loan Application', href: '/payment-options/financing/consumer-loan-application', icon: FileCheck },
        { label: 'Commercial Loan Application', href: '/payment-options/financing/commercial-loan-application', icon: Building2 },
        { label: 'Financing Dashboard', href: '/payment-options/financing/dashboard', icon: LayoutDashboard },
        { label: 'Manage Loan Options', href: '/payment-options/financing/manage-loan-options', icon: Settings2 },
      ]
    },
    { 
      label: 'Activity', 
      icon: Activity,
      hasSubmenu: true,
      submenuItems: [
        { label: 'Transactions', href: '/payment-options/activity/transactions', icon: Receipt },
        { label: 'Statements', href: '/payment-options/activity/statements', icon: FileSpreadsheet },
      ]
    },
  ];

  // More Menu
  const moreMenuItems: MenuItem[] = [
    { 
      label: 'Price Book', 
      icon: BookOpen,
      hasSubmenu: true,
      submenuItems: [
        { label: 'My Price Book', href: '/more/price-book/my-price-book', icon: BookOpen },
        { label: 'Warranties', href: '/more/price-book/warranties', icon: ShieldCheck },
        { label: 'Manufacturer Parts', href: '/more/price-book/manufacturer-parts', icon: Package },
        { label: 'Pricing Defaults', href: '/more/price-book/pricing-defaults', icon: Settings2 },
        { label: 'My Price Book Categories', href: '/more/price-book/categories', icon: List },
      ]
    },
    { label: 'Maintenance Plans', href: '/more/maintenance-plans', icon: Files },
    { label: 'Checklists', href: '/more/checklists', icon: ClipboardCheck },
    { label: 'Time Clock', href: '/more/time-clock', icon: Clock },
  ];

  // Tab active state helpers
  const isScheduleActive = pathname === '/schedule' || pathname === '/dispatch' || pathname === '/';
  const isCustomersActive = pathname.startsWith('/customers');
  const isJobsActive = pathname.startsWith('/jobs');
  const isReportingActive = pathname.startsWith('/reporting');
  const isPaymentOptionsActive = pathname.startsWith('/payment-options');
  const isMoreActive = pathname.startsWith('/more');

  return (
    <nav 
      ref={navRef}
      onMouseLeave={handleMouseLeaveNav}
      className="w-full bg-white border-b border-slate-200 shadow-xs z-30 "
    >
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-start py-0">
        <div className="flex items-center space-x-2">
          
          {/* 1. Schedule -> Direct Leaf Link */}
          <Link
            href="/schedule"
            onMouseEnter={() => handleMouseEnterNav(null)}
            onClick={() => setOpenDropdown(null)}
            className={`relative px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 flex items-center ${
              isScheduleActive
                ? 'text-[#0f2744] font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <span>Schedule</span>
            {isScheduleActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[3px] bg-[#0f2744] rounded-full" />
            )}
          </Link>

          {/* 2. Customers -> Direct Leaf Link */}
          <Link
            href="/customers"
            onMouseEnter={() => handleMouseEnterNav(null)}
            onClick={() => setOpenDropdown(null)}
            className={`relative px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 flex items-center ${
              isCustomersActive
                ? 'text-[#0f2744] font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <span>Customers</span>
            {isCustomersActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[3px] bg-[#0f2744] rounded-full" />
            )}
          </Link>

          {/* 3. Jobs* -> Triggered on Hover */}
          <div 
            className="relative"
            onMouseEnter={() => handleMouseEnterNav('jobs')}
          >
            <button
              type="button"
              className={`relative px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                isJobsActive || openDropdown === 'jobs'
                  ? 'text-[#0f2744] font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>Jobs</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === 'jobs' ? 'rotate-180 text-[#0f2744]' : 'text-slate-400'}`} />
              {(isJobsActive || openDropdown === 'jobs') && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[3px] bg-[#0f2744] rounded-full" />
              )}
            </button>

            {openDropdown === 'jobs' && (
              <div className="absolute left-0 top-full pt-1 w-64 z-50">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  {jobsMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isSubActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href!}
                        href={item.href!}
                        onMouseEnter={() => setActiveSubmenu(null)}
                        onClick={() => setOpenDropdown(null)}
                        className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                          isSubActive 
                            ? 'bg-emerald-50 text-[#0f2744] font-semibold' 
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {Icon && <Icon className={`w-4 h-4 ${isSubActive ? 'text-[#0f2744]' : 'text-slate-500'}`} />}
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Reporting -> Direct Leaf Link (Permission Protected) */}
          {canViewReporting && (
            <Link
              href="/reporting"
              onMouseEnter={() => handleMouseEnterNav(null)}
              onClick={() => setOpenDropdown(null)}
              className={`relative px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 flex items-center ${
                isReportingActive
                  ? 'text-[#0f2744] font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>Reporting</span>
              {isReportingActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[3px] bg-[#0f2744] rounded-full" />
              )}
            </Link>
          )}

          {/* 5. Payment Options* -> Triggered on Hover */}
          <div 
            className="relative"
            onMouseEnter={() => handleMouseEnterNav('payment-options')}
          >
            <button
              type="button"
              className={`relative px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                isPaymentOptionsActive || openDropdown === 'payment-options'
                  ? 'text-[#0f2744] font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>Payment Options</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === 'payment-options' ? 'rotate-180 text-[#0f2744]' : 'text-slate-400'}`} />
              {(isPaymentOptionsActive || openDropdown === 'payment-options') && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[3px] bg-[#0f2744] rounded-full" />
              )}
            </button>

            {openDropdown === 'payment-options' && (
              <div className="absolute left-0 top-full pt-1 w-52 z-50">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  {paymentOptionItems.map((item) => {
                    const Icon = item.icon;
                    const isSubmenuOpen = activeSubmenu === item.label;

                    return (
                      <div 
                        key={item.label} 
                        className="relative"
                        onMouseEnter={() => handleMouseEnterItem(item)}
                      >
                        {item.hasSubmenu ? (
                          <button
                            type="button"
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors text-left ${
                              isSubmenuOpen
                                ? 'bg-emerald-50 text-[#0f2744] font-semibold' 
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {Icon && <Icon className={`w-4 h-4 ${isSubmenuOpen ? 'text-[#0f2744]' : 'text-slate-500'}`} />}
                              <span>{item.label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        ) : (
                          <Link
                            href={item.href!}
                            onClick={() => {
                              setOpenDropdown(null);
                              setActiveSubmenu(null);
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            {Icon && <Icon className="w-4 h-4 text-slate-500" />}
                            <span>{item.label}</span>
                          </Link>
                        )}

                        {/* Level-2 Deepest Child Submenu */}
                        {item.hasSubmenu && isSubmenuOpen && item.submenuItems && (
                          <div 
                            className="absolute left-full top-0 -ml-2 pl-3 w-64 z-50"
                            onMouseEnter={() => setActiveSubmenu(item.label)}
                          >
                            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 py-2 animate-in fade-in slide-in-from-left-1 duration-150">
                              {item.submenuItems.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const isLeafActive = pathname === subItem.href;

                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      setActiveSubmenu(null);
                                    }}
                                    className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                                      isLeafActive
                                        ? 'bg-emerald-50 text-[#0f2744] font-semibold'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                  >
                                    {SubIcon && <SubIcon className={`w-4 h-4 ${isLeafActive ? 'text-[#0f2744]' : 'text-slate-500'}`} />}
                                    <span>{subItem.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 6. More* -> Triggered on Hover (Permission Protected) */}
          {canViewMore && (
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnterNav('more')}
            >
              <button
                type="button"
                className={`relative px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                  isMoreActive || openDropdown === 'more'
                    ? 'text-[#0f2744] font-bold'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === 'more' ? 'rotate-180 text-[#0f2744]' : 'text-slate-400'}`} />
                {(isMoreActive || openDropdown === 'more') && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[3px] bg-[#0f2744] rounded-full" />
                )}
              </button>

              {openDropdown === 'more' && (
                <div className="absolute left-0 top-full pt-1 w-60 z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    {moreMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isSubmenuOpen = activeSubmenu === item.label;

                      return (
                        <div
                          key={item.label}
                          className="relative"
                          onMouseEnter={() => handleMouseEnterItem(item)}
                        >
                          {item.hasSubmenu ? (
                            <button
                              type="button"
                              className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors text-left ${
                                isSubmenuOpen
                                  ? 'bg-emerald-50 text-[#0f2744] font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {Icon && <Icon className={`w-4 h-4 ${isSubmenuOpen ? 'text-[#0f2744]' : 'text-slate-500'}`} />}
                                <span>{item.label}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </button>
                          ) : (
                            <Link
                              href={item.href!}
                              onClick={() => {
                                setOpenDropdown(null);
                                setActiveSubmenu(null);
                              }}
                              className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                                pathname === item.href
                                  ? 'bg-emerald-50 text-[#0f2744] font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {Icon && <Icon className={`w-4 h-4 ${pathname === item.href ? 'text-[#0f2744]' : 'text-slate-500'}`} />}
                              <span>{item.label}</span>
                            </Link>
                          )}

                          {/* Level-2 Deepest Child Submenu for Price Book */}
                          {item.hasSubmenu && isSubmenuOpen && item.submenuItems && (
                            <div 
                              className="absolute left-full top-0 -ml-2 pl-3 w-64 z-50"
                              onMouseEnter={() => setActiveSubmenu(item.label)}
                            >
                              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 py-2 animate-in fade-in slide-in-from-left-1 duration-150">
                                {item.submenuItems.map((subItem, idx) => {
                                  const SubIcon = subItem.icon;
                                  const isLeafActive = pathname === subItem.href;

                                  return (
                                    <React.Fragment key={subItem.href}>
                                      {idx === 3 && <div className="my-1 border-t border-slate-100" />}
                                      <Link
                                        href={subItem.href}
                                        onClick={() => {
                                          setOpenDropdown(null);
                                          setActiveSubmenu(null);
                                        }}
                                        className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                                          isLeafActive
                                            ? 'bg-emerald-50 text-[#0f2744] font-semibold'
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                      >
                                        {SubIcon && <SubIcon className={`w-4 h-4 ${isLeafActive ? 'text-[#0f2744]' : 'text-slate-500'}`} />}
                                        <span>{subItem.label}</span>
                                      </Link>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
