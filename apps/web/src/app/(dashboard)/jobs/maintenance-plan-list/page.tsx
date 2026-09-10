'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  FilterBar, 
  PageHeader 
} from '@/components/ui';
import { useMaintenancePlans } from '@/hooks/useMaintenancePlans';
import { useCustomers } from '@/hooks/useCustomers';
import { useDatabaseMode } from '@/contexts/database-mode-context';

interface MaintenancePlanRecord {
  id: string;
  customerId: string;
  customerName: string;
  location: {
    street: string;
    cityStateZip: string;
  };
  planName: string;
  expirationDate: string;
  hasPaymentPlan: boolean;
  contractPrice: string;
  paymentsApplied: string;
  contractBalance: string;
}

const allMonthsList = [
  'All Months',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const allYearsList = [
  'All Years',
  '2024',
  '2025',
  '2026',
  '2027',
  '2028',
  '2046',
  '2047',
];

export default function WexMaintenancePlanListPage() {
  const { databaseMode } = useDatabaseMode();
  const { plans: liveMaintenancePlans = [], loading } = useMaintenancePlans();
  const { customers = [] } = useCustomers();

  const [planFilter, setPlanFilter] = useState('All');
  const [expiringMonth, setExpiringMonth] = useState('All Months');
  const [expiringYear, setExpiringYear] = useState('All Years');
  const [paymentPlanFilter, setPaymentPlanFilter] = useState('Both');
  const [balanceFilter, setBalanceFilter] = useState('Both');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Map canonical maintenance plans to MaintenancePlanRecord view model
  const plans: MaintenancePlanRecord[] = React.useMemo(() => {
    return liveMaintenancePlans.map((mp: any) => {
      const cust = customers.find((c) => c.id === mp.customerId || c.name?.toLowerCase() === (mp.customerName || '').toLowerCase());
      
      const locStreet = mp.location?.street || (mp.locationAddress || '').split('\n')[0] || cust?.address?.street || '';
      const locCityZip = mp.location?.cityStateZip || (mp.locationAddress || '').split('\n')[1] || [cust?.address?.city, cust?.address?.state, cust?.address?.zipCode].filter(Boolean).join(', ') || 'FL';

      const displayName = (cust?.lastName && cust?.firstName)
        ? `${cust.lastName}, ${cust.firstName}`
        : (mp.customerName || cust?.name || 'Customer');

      return {
        id: mp.id,
        customerId: mp.customerId || cust?.id || `cust-${mp.id}`,
        customerName: displayName,
        location: {
          street: locStreet,
          cityStateZip: locCityZip,
        },
        planName: mp.planName || mp.name || 'HVAC Maintenance Plan',
        expirationDate: mp.expirationDate || mp.renewalDate || 'Active',
        hasPaymentPlan: Boolean(mp.hasPaymentPlan || mp.paymentPlan === 'Yes' || (mp.billingFrequency && mp.billingFrequency !== 'annual' && mp.billingFrequency !== 'One-time')),
        contractPrice: mp.contractPrice || `$${(mp.annualPrice || mp.totalAmount || 140).toFixed(2)}`,
        paymentsApplied: mp.paymentsApplied || '$0.00',
        contractBalance: mp.contractBalance || mp.contractPrice || `$${(mp.annualPrice || mp.totalAmount || 140).toFixed(2)}`,
      };
    });
  }, [liveMaintenancePlans, customers]);

  const filteredPlans = React.useMemo(() => {
    const list = plans.filter((item) => {
      const matchesSearch =
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.street.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.cityStateZip.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlanType = planFilter === 'All' || item.planName.toLowerCase().includes(planFilter.toLowerCase());
      const matchesMonth = expiringMonth === 'All Months' || item.expirationDate.includes(expiringMonth);
      const matchesYear = expiringYear === 'All Years' || item.expirationDate.includes(expiringYear);
      const matchesPaymentPlan =
        paymentPlanFilter === 'Both' ||
        (paymentPlanFilter === 'Yes' && item.hasPaymentPlan) ||
        (paymentPlanFilter === 'No' && !item.hasPaymentPlan);

      return matchesSearch && matchesPlanType && matchesMonth && matchesYear && matchesPaymentPlan;
    });

    list.sort((a, b) => {
      const isDigitA = /^\d/.test(a.customerName.trim());
      const isDigitB = /^\d/.test(b.customerName.trim());
      if (isDigitA && !isDigitB) return -1;
      if (!isDigitA && isDigitB) return 1;
      return a.customerName.trim().localeCompare(b.customerName.trim(), undefined, { numeric: true, sensitivity: 'base' });
    });

    return list;
  }, [plans, searchQuery, planFilter, expiringMonth, expiringYear, paymentPlanFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, planFilter, expiringMonth, expiringYear, paymentPlanFilter]);

  const totalPlans = filteredPlans.length;
  const totalPages = Math.ceil(totalPlans / pageSize) || 1;
  const paginatedPlans = filteredPlans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader 
        title="Jobs Maintenance Plan List" 
      />

      {/* 2. Filter Bar Container */}
      <FilterBar>
        <div className="flex flex-wrap items-end justify-between gap-4 text-xs w-full">
          <div className="flex flex-wrap items-end gap-4">
            {/* Maintenance Plan Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-slate-600 mb-1">
                Maintenance Plan
              </label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[150px]"
              >
                <option value="All">All</option>
                <option value="Hvac 1">Hvac 1 system maintenance plan</option>
                <option value="Hvac 2">Hvac 2 system maintenance plan</option>
                <option value="Hvac 3">Hvac 3 system maintenance plan</option>
              </select>
            </div>

            {/* Plans Expiring In Filters (All 12 Months & Specific Years) */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-slate-600 mb-1">
                Plans Expiring In
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={expiringMonth}
                  onChange={(e) => setExpiringMonth(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[110px]"
                >
                  {allMonthsList.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                <select
                  value={expiringYear}
                  onChange={(e) => setExpiringYear(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[95px]"
                >
                  {allYearsList.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Plan Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-slate-600 mb-1">
                Payment Plan
              </label>
              <select
                value={paymentPlanFilter}
                onChange={(e) => setPaymentPlanFilter(e.target.value)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[110px]"
              >
                <option value="Both">Both</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* Outstanding Balance Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-slate-600 mb-1">
                Outstanding Balance
              </label>
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[120px]"
              >
                <option value="Both">Both</option>
                <option value="With Balance">With Balance</option>
                <option value="Zero Balance">Zero Balance</option>
              </select>
            </div>

            {/* Status Filter Input */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-slate-600 mb-1">
                Status
              </label>
              <input
                type="text"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-32 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Search Input on Right */}
          <div className="flex items-center ml-auto">
            <div className="flex items-center border border-slate-300 rounded bg-white px-2.5 py-1">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>
          </div>
        </div>
      </FilterBar>

      {/* 3. Maintenance Plan List Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Maintenance Plan</th>
                <th className="px-4 py-3">Expiration Date</th>
                <th className="px-4 py-3">Payment Plan</th>
                <th className="px-4 py-3">Contract Price</th>
                <th className="px-4 py-3">Payments Applied</th>
                <th className="px-4 py-3">Contract Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {totalPlans === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    {loading ? 'Loading maintenance plans...' : 'No maintenance plans found matching the selected criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((mp) => (
                  <tr key={mp.id} className="bg-white">
                    {/* Customer Name (no icon next to customer name) */}
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                      <Link
                        href={`/customers/${mp.customerId}`}
                        className="text-[#be4646] font-semibold hover:underline"
                      >
                        {mp.customerName}
                      </Link>
                    </td>

                    {/* Location Address (no customer name, both lines same font config) */}
                    <td className="px-4 py-3.5 text-slate-600 max-w-xs">
                      <div className="flex flex-col space-y-0.5 text-xs text-slate-600">
                        <span>{mp.location.street}</span>
                        <span>{mp.location.cityStateZip}</span>
                      </div>
                    </td>

                    {/* Maintenance Plan Name (no star icon) */}
                    <td className="px-4 py-3.5 font-medium">
                      <Link 
                        href={`/more/maintenance-plans`} 
                        className="text-[#be4646] hover:underline font-semibold"
                      >
                        {mp.planName}
                      </Link>
                    </td>

                    {/* Expiration Date */}
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {mp.expirationDate}
                    </td>

                    {/* Payment Plan */}
                    <td className="px-4 py-3.5 text-slate-600">
                      {mp.hasPaymentPlan ? 'Yes' : 'No'}
                    </td>

                    {/* Contract Price (unbolded) */}
                    <td className="px-4 py-3.5 text-slate-600">
                      {mp.contractPrice}
                    </td>

                    {/* Payments Applied */}
                    <td className="px-4 py-3.5 text-slate-600">
                      {mp.paymentsApplied}
                    </td>

                    {/* Contract Balance (unbolded) */}
                    <td className="px-4 py-3.5 text-slate-600">
                      {mp.contractBalance}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Bar (20 maintenance plans per page) */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 ">
          <div>
            Showing <span className="font-semibold text-slate-800">{totalPlans === 0 ? 0 : Math.min(1 + (currentPage - 1) * pageSize, totalPlans)}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, totalPlans)}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPlans.toLocaleString()}</span> plans
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
