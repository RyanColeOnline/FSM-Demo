'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { 
  Checkbox, 
  DateRangePicker,
  MenuTrigger,
  MenuButton,
  Menu,
  MenuItem
} from '@/components/ui';
import { 
  getEasternDateString,
  MOCK_PAYMENTS_DATA,
  CanonicalPaymentRecord,
  FirestoreDomainClient
} from '@/domain';

import { useDatabaseMode } from '@/contexts/database-mode-context';

function parsePaymentDate(dateStr: string): number {
  if (!dateStr) return 0;
  const cleaned = dateStr
    .replace(/(\d+)(st|nd|rd|th)/g, '$1')
    .replace('@', '')
    .replace('CDT', '')
    .replace('EDT', '')
    .replace('EST', '')
    .replace('CST', '')
    .trim();
  const time = new Date(cleaned).getTime();
  return isNaN(time) ? 0 : time;
}

export default function JobsPaymentListPage() {
  const { databaseMode, client } = useDatabaseMode();
  const [payments, setPayments] = useState<CanonicalPaymentRecord[]>(() => {
    return databaseMode === 'mock' ? MOCK_PAYMENTS_DATA : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState(() => getEasternDateString(-25));
  const [endDate, setEndDate] = useState(() => getEasternDateString(6));
  const [syncStatusFilter, setSyncStatusFilter] = useState('All');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [displayInvoicesFilter, setDisplayInvoicesFilter] = useState('All Invoices');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Date and Time sorting (default newest first: 'desc')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Track which payment rows are expanded
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Load from Firestore on mount & databaseMode change
  useEffect(() => {
    let isMounted = true;
    async function loadPayments() {
      setIsLoading(true);
      try {
        const records = await client.fetchPaymentRecords(undefined, databaseMode);
        if (isMounted) {
          setPayments(records || []);
          setIsLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          if (databaseMode === 'mock') {
            setPayments(MOCK_PAYMENTS_DATA);
          } else {
            setPayments([]);
          }
          setIsLoading(false);
        }
      }
    }
    loadPayments();
    return () => {
      isMounted = false;
    };
  }, [databaseMode, client]);

  const toggleRowExpansion = (id: string) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleDateSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const filteredAndSortedPayments = useMemo(() => {
    const filtered = payments.filter((pay) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = pay.customerName.toLowerCase().includes(q) || pay.payerName.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      // Sync status
      if (syncStatusFilter !== 'All' && pay.autoSyncStatus !== syncStatusFilter) {
        return false;
      }

      // Payment Type filter
      if (paymentTypeFilter.trim() && !pay.type.toLowerCase().includes(paymentTypeFilter.toLowerCase())) {
        return false;
      }

      // Payment Method filter
      if (paymentMethodFilter.trim() && !pay.method.toLowerCase().includes(paymentMethodFilter.toLowerCase())) {
        return false;
      }

      // Payment Status filter
      if (paymentStatusFilter.trim() && !pay.status.toLowerCase().includes(paymentStatusFilter.toLowerCase())) {
        return false;
      }

      // Unassigned only
      if (unassignedOnly && pay.customerId) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const timeA = parsePaymentDate(a.dateTime);
      const timeB = parsePaymentDate(b.dateTime);
      if (sortOrder === 'desc') {
        return timeB - timeA;
      } else {
        return timeA - timeB;
      }
    });
  }, [
    payments,
    searchQuery,
    syncStatusFilter,
    paymentTypeFilter,
    paymentMethodFilter,
    paymentStatusFilter,
    unassignedOnly,
    sortOrder,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, syncStatusFilter, paymentTypeFilter, paymentMethodFilter, paymentStatusFilter, unassignedOnly]);

  const totalPayments = filteredAndSortedPayments.length;
  const totalPages = Math.ceil(totalPayments / pageSize) || 1;
  const paginatedPayments = filteredAndSortedPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full space-y-4 text-slate-800 pb-12 font-sans text-xs">
      {/* 1. Header with Download Button */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-bold italic tracking-tight text-slate-800 flex items-center gap-2 font-serif">
          <span>Jobs</span>
          <span className="text-slate-400 font-normal text-xl not-italic font-sans">Payment List</span>
        </h1>

        <button
          type="button"
          className="px-3 py-1.5 bg-[#7cb342] hover:bg-[#689f38] text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Filter Bar Container */}
      <div className="bg-[#fcfdfd] border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-2xs">
        {/* Row 1: Date Range, Auto Sync Status, Customer Name Search & Sync Support */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DateRangePicker
            label="Date Range"
            value={{ start: startDate, end: endDate }}
            onChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />

          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-700 mb-1">
              Auto Sync Status
            </label>
            <select
              value={syncStatusFilter}
              onChange={(e) => setSyncStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[140px] cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Synced">Synced</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="flex flex-col items-end gap-1.5 ml-auto">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-700">Customer Name</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-48 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <button
              type="button"
              className="px-3 py-1 bg-[#8c2d2d] hover:bg-[#742323] text-white text-[11px] font-bold rounded shadow-2xs transition-colors cursor-pointer"
            >
              Sync Support
            </button>
          </div>
        </div>

        {/* Row 2: Payment Type(s), Method(s), Status(es), Display Invoices, Checkbox */}
        <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-slate-200">
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-700 mb-1">
              Payment Type(s)
            </label>
            <input
              type="text"
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-700 mb-1">
              Payment Method(s)
            </label>
            <input
              type="text"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-700 mb-1">
              Payment Status(es)
            </label>
            <input
              type="text"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-700 mb-1">
              Display Invoices
            </label>
            <select
              value={displayInvoicesFilter}
              onChange={(e) => setDisplayInvoicesFilter(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[150px] cursor-pointer"
            >
              <option value="All Invoices">All Invoices</option>
              <option value="Open Invoices">Open Invoices</option>
              <option value="Paid Invoices">Paid Invoices</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pb-1 ml-2">
            <Checkbox
              id="unassignedOnly"
              checked={unassignedOnly}
              onChange={(e) => setUnassignedOnly(e.target.checked)}
            />
            <label htmlFor="unassignedOnly" className="text-[11px] font-medium text-slate-700 cursor-pointer ">
              Only show Payments Not Assigned to a Customer
            </label>
          </div>
        </div>
      </div>

      {/* 3. Populated Payment List Table with Expandable Detail Rows */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafbfb] border-b border-slate-200 text-xs font-medium text-[#a82e2e]">
                <th className="px-3 py-3 font-medium">Customer Name</th>
                <th className="px-3 py-3 font-medium">Payer Name</th>
                <th 
                  onClick={toggleDateSort}
                  className="px-3 py-3 font-medium whitespace-nowrap cursor-pointer hover:underline"
                  title="Click to sort by date and time"
                >
                  Date and Time
                </th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Method</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Frequency</th>
                <th className="px-3 py-3 font-medium">Auto Sync Status</th>
                <th className="w-10 px-2 py-3 text-center"></th>
                <th className="w-10 px-2 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700 font-normal">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="animate-pulse">
                    <td className="px-3 py-4"><div className="h-3.5 bg-slate-200 rounded w-28" /></td>
                    <td className="px-3 py-4"><div className="h-3 bg-slate-150 rounded w-24" /></td>
                    <td className="px-3 py-4"><div className="h-3 bg-slate-150 rounded w-32" /></td>
                    <td className="px-3 py-4"><div className="h-3 bg-slate-150 rounded w-20" /></td>
                    <td className="px-3 py-4"><div className="h-3 bg-slate-150 rounded w-16" /></td>
                    <td className="px-3 py-4"><div className="h-4 bg-emerald-100 rounded-full w-14" /></td>
                    <td className="px-3 py-4"><div className="h-3 bg-slate-200 rounded w-16" /></td>
                    <td className="px-3 py-4"><div className="h-3 bg-slate-150 rounded w-20" /></td>
                    <td className="px-3 py-4"><div className="h-3 bg-slate-150 rounded w-16" /></td>
                    <td className="w-10 px-2 py-4" />
                    <td className="w-10 px-2 py-4" />
                  </tr>
                ))
              ) : totalPayments === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                    No payments found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((pay) => {
                  const isExpanded = !!expandedRowIds[pay.id];

                  return (
                    <React.Fragment key={pay.id}>
                      <tr className={`transition-colors ${isExpanded ? 'bg-slate-50/60' : 'bg-white hover:bg-slate-50/40'}`}>
                        {/* Customer Name: links to profile, semibold */}
                        <td className="px-3 py-3.5">
                          <Link
                            href={pay.customerId ? `/customers/${pay.customerId}` : '/customers'}
                            className="text-[#be4646] font-semibold hover:underline"
                          >
                            {pay.customerName}
                          </Link>
                        </td>

                        {/* Payer Name: unbolded */}
                        <td className="px-3 py-3.5 text-slate-700 font-normal">
                          {pay.payerName}
                        </td>

                        {/* Date and Time */}
                        <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap font-normal">
                          {pay.dateTime}
                        </td>

                        {/* Payment Type */}
                        <td className="px-3 py-3.5 text-slate-700 font-normal">
                          {pay.type}
                        </td>

                        {/* Payment Method */}
                        <td className="px-3 py-3.5 text-slate-700 font-normal">
                          {pay.method}
                        </td>

                        {/* Payment Status: Emerald/Success pill style */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100/70 text-emerald-800 border border-emerald-200/60">
                            {pay.status}
                          </span>
                        </td>

                        {/* Payment Amount: unbolded */}
                        <td className="px-3 py-3.5 text-slate-700 font-normal">
                          ${pay.amount.toFixed(2)}
                        </td>

                        {/* Frequency: unbolded */}
                        <td className="px-3 py-3.5 text-slate-700 font-normal">
                          {pay.frequency}
                        </td>

                        {/* Auto Sync Status: Pill style */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {pay.autoSyncStatus}
                          </span>
                        </td>

                        {/* Row Expand Toggle */}
                        <td className="w-10 px-2 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRowExpansion(pay.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                            aria-label="Toggle Details"
                          >
                            <ChevronDown className={`w-4 h-4 mx-auto transition-transform duration-150 ${isExpanded ? 'rotate-180 text-slate-700' : ''}`} />
                          </button>
                        </td>

                        {/* Actions Menu */}
                        <td className="w-10 px-2 py-3.5 text-center">
                          <MenuTrigger>
                            <MenuButton
                              variant="ghost"
                              size="sm"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                              aria-label="Payment Actions"
                            >
                              <MoreHorizontal className="w-4 h-4 mx-auto" />
                            </MenuButton>
                            <Menu placement="bottom end">
                              <MenuItem onAction={() => {}}>Edit Payment</MenuItem>
                              <MenuItem onAction={() => {}}>Change Customer</MenuItem>
                              <MenuItem onAction={() => {}} variant="danger">Refund Payment</MenuItem>
                            </Menu>
                          </MenuTrigger>
                        </td>
                      </tr>

                      {/* Expandable Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-[#fafbfb] border-b border-slate-200 animate-in fade-in duration-100">
                          <td colSpan={11} className="p-4 pl-12">
                            <div className="flex flex-wrap items-start gap-6">
                              {/* Card 1: Invoice Details */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs min-w-[240px] space-y-2 font-normal">
                                <div className="grid grid-cols-3 gap-3 text-slate-500 font-medium text-[11px] border-b border-slate-100 pb-1.5">
                                  <span>Invoice #</span>
                                  <span className="text-right">Total</span>
                                  <span className="text-right">Balance</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 items-center text-xs font-normal text-slate-800">
                                  <span className="inline-flex items-center gap-1 text-slate-700 hover:text-[#be4646] cursor-pointer">
                                    <span>{pay.invoiceNumber || '#131941-2'}</span>
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  </span>
                                  <span className="text-right">${(pay.invoiceTotal || pay.amount).toFixed(2)}</span>
                                  <span className="text-right">${(pay.invoiceBalance || 0).toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Card 2: Maintenance Plan Details */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs min-w-[320px] space-y-2 font-normal">
                                <div className="flex items-center justify-between text-slate-500 font-medium text-[11px] border-b border-slate-100 pb-1.5 gap-6">
                                  <span>Maintenance Plan</span>
                                  <span>Amount Applied</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-800 font-normal gap-6">
                                  <span className={pay.maintenancePlanName && pay.maintenancePlanName !== 'No maintenance plans applied' ? 'text-slate-800' : 'text-slate-600'}>
                                    {pay.maintenancePlanName || 'No maintenance plans applied'}
                                  </span>
                                  <span className="font-normal text-slate-800">
                                    {pay.maintenancePlanAmountApplied ? `$${pay.maintenancePlanAmountApplied.toFixed(2)}` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Bar (20 payments per page) */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 ">
          <div>
            Showing <span className="font-semibold text-slate-800">{totalPayments === 0 ? 0 : Math.min(1 + (currentPage - 1) * pageSize, totalPayments)}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, totalPayments)}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPayments.toLocaleString()}</span> payments
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="font-semibold text-slate-800 px-1">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
