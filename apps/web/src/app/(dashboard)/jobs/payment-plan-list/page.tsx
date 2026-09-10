'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Star, Info, Edit, ChevronDown } from 'lucide-react';
import { 
  Checkbox, 
  SearchBar, 
  FilterBar, 
  PageHeader 
} from '@/components/ui';

interface PaymentPlanRecord {
  id: string;
  customerName: string;
  payerName: string;
  firstPayment: string;
  lastPayment: string;
  frequency: string;
  paymentAmount: string;
  paymentAccount: string;
  maintenancePlan: string;
  autoInvoice?: string | null;
}

const initialPaymentPlans: PaymentPlanRecord[] = [
  {
    id: 'pp-1',
    customerName: 'Calfee, Mary',
    payerName: 'Calfee, Mary',
    firstPayment: 'Mar 2026',
    lastPayment: 'Feb 2046',
    frequency: 'Yearly',
    paymentAmount: '$140.00',
    paymentAccount: 'Visa x7120',
    maintenancePlan: 'Hvac 1 system maintenance plan',
    autoInvoice: null,
  },
  {
    id: 'pp-2',
    customerName: 'Johnson, Robert',
    payerName: 'Robert Johnson',
    firstPayment: 'Jan 2026',
    lastPayment: 'Dec 2027',
    frequency: 'Monthly',
    paymentAmount: '$35.00',
    paymentAccount: 'MasterCard x4821',
    maintenancePlan: 'Hvac 2 system maintenance plan',
    autoInvoice: null,
  },
  {
    id: 'pp-3',
    customerName: 'Smith, Patricia',
    payerName: 'Patricia Smith',
    firstPayment: 'Apr 2026',
    lastPayment: 'Mar 2028',
    frequency: 'Yearly',
    paymentAmount: '$210.00',
    paymentAccount: 'Visa x0192',
    maintenancePlan: 'Hvac 2 system maintenance plan',
    autoInvoice: null,
  },
  {
    id: 'pp-4',
    customerName: 'Vance, David',
    payerName: 'David Vance',
    firstPayment: 'Jun 2026',
    lastPayment: 'May 2030',
    frequency: 'Quarterly',
    paymentAmount: '$125.00',
    paymentAccount: 'ACH x9021',
    maintenancePlan: 'Hvac 3 system maintenance plan',
    autoInvoice: null,
  },
  {
    id: 'pp-5',
    customerName: 'Miller, Karen',
    payerName: 'Karen Miller',
    firstPayment: 'Feb 2026',
    lastPayment: 'Jan 2027',
    frequency: 'Yearly',
    paymentAmount: '$140.00',
    paymentAccount: 'Visa x5510',
    maintenancePlan: 'Hvac 1 system maintenance plan',
    autoInvoice: null,
  },
];

export default function WexPaymentPlanListPage() {
  const [plans, setPlans] = useState<PaymentPlanRecord[]>(initialPaymentPlans);
  const [firstMonth, setFirstMonth] = useState('All Month');
  const [firstYear, setFirstYear] = useState('All Years');
  const [lastMonth, setLastMonth] = useState('All Month');
  const [lastYear, setLastYear] = useState('All Years');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [searchField, setSearchField] = useState('Customer Name');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.payerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.maintenancePlan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.paymentAccount.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader title="Jobs Payment Plan List" />

      {/* 2. Filter Bar Container (No download buttons/labels) */}
      <FilterBar>
        <div className="flex flex-wrap items-end justify-between gap-4 text-xs w-full">
          {/* First Payment Selects */}
          <div className="flex flex-col">
            <label className="text-[11px] font-medium text-slate-600 mb-1">
              First Payment
            </label>
            <div className="flex items-center gap-1">
              <select
                value={firstMonth}
                onChange={(e) => setFirstMonth(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[100px]"
              >
                <option value="All Month">All Month</option>
                <option value="Jan">Jan</option>
                <option value="Feb">Feb</option>
                <option value="Mar">Mar</option>
              </select>
              <span className="text-slate-400 font-bold">-</span>
              <select
                value={firstYear}
                onChange={(e) => setFirstYear(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[90px]"
              >
                <option value="All Years">All Years</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          {/* Last Payment Selects */}
          <div className="flex flex-col">
            <label className="text-[11px] font-medium text-slate-600 mb-1">
              Last Payment
            </label>
            <div className="flex items-center gap-1">
              <select
                value={lastMonth}
                onChange={(e) => setLastMonth(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[100px]"
              >
                <option value="All Month">All Month</option>
                <option value="Jan">Jan</option>
                <option value="Feb">Feb</option>
                <option value="Mar">Mar</option>
              </select>
              <span className="text-slate-400 font-bold">-</span>
              <select
                value={lastYear}
                onChange={(e) => setLastYear(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[90px]"
              >
                <option value="All Years">All Years</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2046">2046</option>
              </select>
            </div>
          </div>

          {/* Unassigned Checkbox */}
          <div className="flex items-center gap-2 pb-1.5">
            <Checkbox
              id="unassignedOnlyPP"
              checked={unassignedOnly}
              onChange={(e) => setUnassignedOnly(e.target.checked)}
            />
            <label htmlFor="unassignedOnlyPP" className="text-xs font-medium text-slate-700 cursor-pointer">
              Only Show Payments Not Assigned to a Customer
            </label>
          </div>

          {/* SearchBar Primitive */}
          <div className="ml-auto">
            <SearchBar
              fields={['Customer Name', 'Payer Name', 'Plan']}
              selectedField={searchField}
              onFieldChange={setSearchField}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />
          </div>
        </div>
      </FilterBar>

      {/* 3. Replicated Payment Plan List Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-3 py-3 cursor-pointer hover:underline">
                  <span className="inline-flex items-center gap-1">
                    Customer Name <ChevronDown className="w-3.5 h-3.5 text-[#a82e2e]" />
                  </span>
                </th>
                <th className="px-3 py-3">Payer Name</th>
                <th className="px-3 py-3">First Payment</th>
                <th className="px-3 py-3">Last Payment</th>
                <th className="px-3 py-3">Frequency</th>
                <th className="px-3 py-3">Payment Amount</th>
                <th className="px-3 py-3">Payment Account</th>
                <th className="px-3 py-3">Maintenance Plan</th>
                <th className="px-3 py-3 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    Auto Invoice <Info className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {filteredPlans.map((plan) => (
                <tr key={plan.id} className="bg-white">
                  {/* Customer Name */}
                  <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <a
                        href="/customers"
                        className="inline-flex items-center gap-1 text-[#be4646] font-semibold hover:underline"
                      >
                        <span>{plan.customerName}</span>
                        <ExternalLink className="w-3 h-3 text-[#be4646]" />
                      </a>
                      <span title="Edit Customer"><Edit className="w-3 h-3 text-[#be4646] cursor-pointer ml-0.5" /></span>
                    </div>
                  </td>

                  {/* Payer Name */}
                  <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                    {plan.payerName}
                  </td>

                  {/* First Payment */}
                  <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                    {plan.firstPayment}
                  </td>

                  {/* Last Payment */}
                  <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                    {plan.lastPayment}
                  </td>

                  {/* Frequency */}
                  <td className="px-3 py-3.5 text-slate-700">
                    {plan.frequency}
                  </td>

                  {/* Payment Amount */}
                  <td className="px-3 py-3.5 font-semibold text-slate-800">
                    {plan.paymentAmount}
                  </td>

                  {/* Payment Account */}
                  <td className="px-3 py-3.5 text-slate-700 whitespace-nowrap">
                    {plan.paymentAccount}
                  </td>

                  {/* Maintenance Plan */}
                  <td className="px-3 py-3.5 font-medium">
                    <div className="flex items-center gap-1 text-[#be4646]">
                      <Star className="w-3.5 h-3.5 fill-slate-800 text-slate-800 shrink-0" />
                      <a href={`/more/maintenance-plans/${plan.id}`} className="hover:underline font-semibold">
                        {plan.maintenancePlan}
                      </a>
                      <span title="Edit Plan"><Edit className="w-3 h-3 text-[#be4646] cursor-pointer ml-0.5" /></span>
                    </div>
                  </td>

                  {/* Auto Invoice */}
                  <td className="px-3 py-3.5 text-slate-500">
                    {plan.autoInvoice || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
