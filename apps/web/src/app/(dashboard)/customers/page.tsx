'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { 
  Button, 
  Checkbox, 
  SearchBar, 
  StatusBadge, 
  PageHeader, 
  FilterBar 
} from '@/components/ui';
import { AddCustomerModal } from '@/components/modals/AddCustomerModal';

import { usePaginatedCustomers } from '@/hooks/usePaginatedCustomers';
import { useAppointments } from '@/hooks/useAppointments';
import { useInvoices } from '@/hooks/useInvoices';
import { useEquipment } from '@/hooks/useEquipment';
import { useMaintenancePlans } from '@/hooks/useMaintenancePlans';
import { useProposals } from '@/hooks/useProposals';

interface CustomerRecord {
  id: string;
  customerNumber?: string;
  wexCustomerId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  rawLastName: string;
  rawFirstName: string;
  defaultLocation: string;
  email: string | null;
  homePhone: string | null;
  mobilePhone: string | null;
  autoSyncStatus: 'Synced' | 'Pending' | 'Failed';
  customerStatus: 'Active' | 'Inactive' | 'Account on Hold';
  activity: {
    activeLocations: number;
    invoices: number;
    paymentVolume: string;
    proposals: number;
    maintPlans: number;
    storedCards: number;
    equipment: number;
    lastAppointmentDate: string;
  };
}

function getCustomerNameParts(c: any): { firstName: string; lastName: string; lastFirst: string; firstLast: string } {
  const isCommercial = c.customerType === 'commercial' || c.custType === 'Commercial' || Boolean(c.businessName);
  if (isCommercial) {
    const bName = (c.businessName || c.name || 'Commercial Customer').trim();
    return { firstName: '', lastName: bName, lastFirst: bName, firstLast: bName };
  }

  let first = (c.firstName || '').trim();
  let last = (c.lastName || '').trim();

  if (!first && !last) {
    const raw = (c.name || '').trim();
    if (raw.includes(',')) {
      const parts = raw.split(',').map((s: string) => s.trim());
      last = parts[0] || '';
      first = parts[1] || '';
    } else if (raw.includes(' ')) {
      const parts = raw.split(' ').map((s: string) => s.trim());
      first = parts[0] || '';
      last = parts.slice(1).join(' ') || '';
    } else {
      last = raw;
    }
  }

  const lastFirst = last && first ? `${last}, ${first}` : (last || first || c.name || 'New Customer');
  const firstLast = first && last ? `${first} ${last}` : (first || last || c.name || 'New Customer');

  return { firstName: first, lastName: last, lastFirst, firstLast };
}

export default function WexCustomersPage() {
  const {
    customers: canonicalList,
    page,
    pageSize,
    totalCount,
    totalPages,
    loading,
    hasNextPage,
    hasPrevPage,
    searchField,
    setSearchField,
    searchQuery,
    setSearchQuery,
    syncFilter,
    setSyncFilter,
    nextPage,
    prevPage,
  } = usePaginatedCustomers({ pageSize: 30 });

  const { appointments: allAppointments } = useAppointments();
  const { invoices: allInvoices } = useInvoices();
  const { equipment: allEquipment } = useEquipment();
  const { plans: allMaintPlans } = useMaintenancePlans();
  const { proposals: allProposals } = useProposals();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [nameSortOrder, setNameSortOrderState] = useState<'lastFirst' | 'firstLast'>('lastFirst');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fsm_customer_name_sort_order');
      if (saved === 'lastFirst' || saved === 'firstLast') {
        setNameSortOrderState(saved);
      }
    } catch {
      // fallback
    }
  }, []);

  const setNameSortOrder = (orderOrFn: 'lastFirst' | 'firstLast' | ((prev: 'lastFirst' | 'firstLast') => 'lastFirst' | 'firstLast')) => {
    setNameSortOrderState((prev) => {
      const next = typeof orderOrFn === 'function' ? orderOrFn(prev) : orderOrFn;
      try {
        localStorage.setItem('fsm_customer_name_sort_order', next);
        document.cookie = `fsm_customer_name_sort_order=${next}; path=/; max-age=31536000`;
      } catch {
        // fallback
      }
      return next;
    });
  };

  // Add Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Map canonical customers to view records with formatting support
  const customers: CustomerRecord[] = canonicalList.map((c) => {
    const locStr = c.address
      ? [c.address.street, c.address.city, `${c.address.state} ${c.address.zipCode}`.trim()].filter(Boolean).join(', ')
      : 'No address provided';

    const customerInvoices = allInvoices.filter(
      (inv) => inv.customerId === c.id || (c.accountNumber && inv.customerId === c.accountNumber) || (inv.billToCustomer && inv.billToCustomer.toLowerCase() === c.name.toLowerCase())
    );
    const paidSum = customerInvoices.reduce((sum, inv) => sum + (inv.amountPaid || (inv.status === 'Paid' ? inv.total : 0) || 0), 0);
    const totalVolume = paidSum > 0 ? paidSum : customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const customerProposals = allProposals.filter(
      (p) => p.customerId === c.id || (c.accountNumber && p.customerId === c.accountNumber)
    );
    const customerMaint = allMaintPlans.filter(
      (mp) => mp.customerId === c.id || (c.accountNumber && mp.customerId === c.accountNumber)
    );
    const customerEq = allEquipment.filter(
      (eq) => eq.customerId === c.id || (c.accountNumber && eq.customerId === c.accountNumber)
    );
    const customerAppts = allAppointments.filter(
      (appt) => appt.customerId === c.id || (c.accountNumber && appt.customerId === c.accountNumber)
    );

    // Calculate actual last appointment date from live appointments or historical lastVisitDate
    let formattedLastApptDate = '—';
    if (customerAppts.length > 0) {
      const validDates = customerAppts
        .map((a) => (a.dateTime ? new Date(a.dateTime).getTime() : 0))
        .filter((t) => !isNaN(t) && t > 0)
        .sort((a, b) => b - a);

      if (validDates.length > 0) {
        const d = new Date(validDates[0]);
        formattedLastApptDate = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      }
    } else if (c.lastVisitDate) {
      const d = new Date(c.lastVisitDate);
      if (!isNaN(d.getTime())) {
        formattedLastApptDate = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`;
      }
    }

    const effectiveTotalVolume = paidSum > 0 ? paidSum : (totalVolume > 0 ? totalVolume : (c.financials?.totalInvoiced || 0));

    // Support both "Last name, First name" and "First name, Last name"
    const nameParts = getCustomerNameParts(c);
    const displayName = nameSortOrder === 'lastFirst' ? nameParts.lastFirst : nameParts.firstLast;

    return {
      id: c.id,
      customerNumber: c.customerNumber || c.accountNumber || c.id,
      wexCustomerId: c.wexCustomerId,
      name: displayName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      rawLastName: nameParts.lastName.toLowerCase(),
      rawFirstName: nameParts.firstName.toLowerCase(),
      defaultLocation: locStr,
      email: c.email || null,
      homePhone: c.homePhone || null,
      mobilePhone: c.mobilePhone || c.phone || null,
      autoSyncStatus: c.autoSyncStatus || 'Synced',
      customerStatus: c.customerStatus || 'Active',
      activity: {
        activeLocations: (c.locations && c.locations.length > 0) ? c.locations.length : 1,
        invoices: customerInvoices.length,
        paymentVolume: `$${effectiveTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        proposals: customerProposals.length,
        maintPlans: customerMaint.length,
        storedCards: (c.storedPaymentMethods && c.storedPaymentMethods.length) || 0,
        equipment: customerEq.length,
        lastAppointmentDate: formattedLastApptDate,
      },
    };
  });

  // Sort according to active nameSortOrder
  const sortedCustomers = React.useMemo(() => {
    return [...customers].sort((a, b) => {
      if (nameSortOrder === 'lastFirst') {
        const cmpLast = a.rawLastName.localeCompare(b.rawLastName);
        if (cmpLast !== 0) return cmpLast;
        return a.rawFirstName.localeCompare(b.rawFirstName);
      } else {
        const cmpFirst = a.rawFirstName.localeCompare(b.rawFirstName);
        if (cmpFirst !== 0) return cmpFirst;
        return a.rawLastName.localeCompare(b.rawLastName);
      }
    });
  }, [customers, nameSortOrder]);

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedCustomers.map((c) => c.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpandRow = (id: string) => {
    setExpandedRowIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const searchFieldOptions = [
    'Customer Name',
    'Customer Number',
    'Location',
    'Email Address',
    'Phone Number',
  ];

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader title="Customers" icon={Store} />

      {/* 2. FilterBar */}
      <FilterBar>
        {/* Left Side Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            onClick={() => setShowAddCustomerModal(true)}
            className="gap-1.5 font-bold shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </Button>
        </div>

        {/* Center SearchBar */}
        <div className="flex items-center gap-3">
          <SearchBar
            fields={searchFieldOptions}
            selectedField={searchField}
            onFieldChange={setSearchField}
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        </div>

        {/* Right Auto Sync Filter */}
        <div className="flex flex-col items-start">
          <label className="text-[11px] font-medium text-slate-600 mb-0.5">
            Auto Sync Status
          </label>
          <select
            value={syncFilter}
            onChange={(e) => setSyncFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 shadow-xs focus:outline-none min-w-[140px] text-left cursor-pointer"
          >
            <option value="All">All</option>
            <option value="Synced">Synced</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </FilterBar>

      {/* 3. Customer Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-md shadow-md border border-slate-200 text-xs font-semibold text-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-[#be4646]" />
              <span>Loading records...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="w-10 px-3 py-3 text-center">
                  <Checkbox
                    checked={
                      sortedCustomers.length > 0 &&
                      selectedIds.length === sortedCustomers.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setNameSortOrder(prev => prev === 'lastFirst' ? 'firstLast' : 'lastFirst')}
                    className="inline-flex items-center gap-1.5 hover:text-[#7f1d1d] transition-colors focus:outline-none cursor-pointer group text-left"
                    title={`Current format: ${nameSortOrder === 'lastFirst' ? 'Last name, First name' : 'First name, Last name'}. Click to toggle format and sorting.`}
                  >
                    <span className="font-bold">Customer Name</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#a82e2e] transition-transform duration-200 ${nameSortOrder === 'firstLast' ? 'rotate-180' : ''}`} />
                  </button>
                </th>
                <th className="px-3 py-3">Default Location</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Home Phone</th>
                <th className="px-3 py-3">Mobile Phone</th>
                <th className="px-3 py-3">Auto Sync Status</th>
                <th className="px-3 py-3">Customer Status</th>
                <th className="w-10 px-3 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {sortedCustomers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">
                    No customer records found matching your filters.
                  </td>
                </tr>
              ) : (
                sortedCustomers.map((customer) => {
                  const isSelected = selectedIds.includes(customer.id);
                  const isExpanded = expandedRowIds.includes(customer.id);

                  return (
                    <React.Fragment key={customer.id}>
                      <tr className={isSelected ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50 transition-colors'}>
                        <td className="px-3 py-3 text-center">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelectRow(customer.id)}
                          />
                        </td>

                        <td className="px-3 py-3 font-medium">
                          <Link
                            href={`/customers/${customer.id || customer.customerNumber}`}
                            className="text-[#be4646] hover:underline font-semibold"
                          >
                            {customer.name}
                          </Link>
                        </td>

                        <td className="px-3 py-3 text-slate-600 max-w-xs truncate">
                          {customer.defaultLocation}
                        </td>

                        <td className="px-3 py-3">
                          {customer.email ? (
                            <span className="text-slate-700">{customer.email}</span>
                          ) : (
                            <span className="text-slate-400 italic">[No Email Provided]</span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {customer.homePhone ? (
                            <span className="text-slate-700">{customer.homePhone}</span>
                          ) : (
                            <span className="text-slate-400 italic">[Not Provided]</span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {customer.mobilePhone ? (
                            <span className="text-slate-700">{customer.mobilePhone}</span>
                          ) : (
                            <span className="text-slate-400 italic">[Not Provided]</span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <StatusBadge status={customer.autoSyncStatus} showDropdownArrow />
                        </td>

                        <td className="px-3 py-3 font-medium text-slate-700">
                          {customer.customerStatus}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(customer.id)}
                            className="p-1 text-[#be4646] hover:text-[#933434] transition-colors focus:outline-none font-bold text-xs cursor-pointer"
                          >
                            {isExpanded ? '▼' : '▲'}
                          </button>
                        </td>
                      </tr>

                      {/* Sub-row detail */}
                      {isExpanded && (
                        <tr className="bg-[#fcfcfd] border-t border-b border-slate-200">
                          <td colSpan={9} className="px-6 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
                              <span className="italic text-slate-500 font-serif text-xs pr-2">
                                Last 12 months activity:
                              </span>

                              <div className="flex flex-1 items-center justify-between gap-4 overflow-x-auto">
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Active Locations</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.activeLocations}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Invoices</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.invoices}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Payment Volume</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.paymentVolume}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Proposals</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.proposals}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Maint Plans</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.maintPlans}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Stored Cards</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.storedCards}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Equipment</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.equipment}</span>
                                </div>
                                <div className="flex flex-col items-center pr-4">
                                  <span className="text-[10px] text-slate-500 underline font-medium">Last Appointment Date</span>
                                  <span className="font-semibold text-slate-800 mt-0.5">{customer.activity.lastAppointmentDate}</span>
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

        {/* 4. Keyset Pagination Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{totalCount === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, totalCount)}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalCount.toLocaleString()}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevPage}
              disabled={!hasPrevPage || loading}
              className="px-3 py-1.5 border border-slate-300 rounded font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            >
              &larr; Previous
            </button>

            <span className="px-2 py-1 font-medium text-slate-700">
              Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </span>

            <button
              type="button"
              onClick={nextPage}
              disabled={!hasNextPage || loading}
              className="px-3 py-1.5 border border-slate-300 rounded font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
      />
    </div>
  );
}
