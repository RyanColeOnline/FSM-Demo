'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ExternalLink, 
  Heart, 
  Copy, 
  Plus, 
  Info, 
  Search, 
  FileText,
  X
} from 'lucide-react';
import { 
  Button, 
  SearchBar, 
  FilterBar, 
  PageHeader 
} from '@/components/ui';

interface PurchaseOrderRecord {
  id: string;
  supplier: string;
  isFavorite?: boolean;
  poNumber: string;
  supplierOrderNumber: string;
  poName: string;
  lastModified: string;
  issuedDate: string;
  status: 'Approved' | 'Pending' | 'Received' | 'Draft';
  amount: string;
  type: 'Parts' | 'Equipment' | 'Services';
  jobNumber: string;
  jobType: string;
}

const initialPurchaseOrders: PurchaseOrderRecord[] = [
  {
    id: 'po-1',
    supplier: 'Johnstone Supply',
    isFavorite: false,
    poNumber: 'PO-84910',
    supplierOrderNumber: 'SUP-99214',
    poName: 'Compressor & R410A Refrigerant',
    lastModified: '8/08/2026',
    issuedDate: '8/08/2026',
    status: 'Approved',
    amount: '$1,420.00',
    type: 'Parts',
    jobNumber: '134100',
    jobType: 'HVAC Repair',
  },
  {
    id: 'po-2',
    supplier: 'Carrier Enterprise',
    isFavorite: true,
    poNumber: 'PO-84911',
    supplierOrderNumber: 'SUP-99215',
    poName: '16 SEER Heat Pump Outdoor Unit',
    lastModified: '8/07/2026',
    issuedDate: '8/07/2026',
    status: 'Received',
    amount: '$2,850.00',
    type: 'Equipment',
    jobNumber: '133907',
    jobType: 'HVAC Replacement',
  },
  {
    id: 'po-3',
    supplier: 'Trane Supply',
    isFavorite: false,
    poNumber: 'PO-84912',
    supplierOrderNumber: 'SUP-99216',
    poName: 'Blower Motor & Control Board',
    lastModified: '8/06/2026',
    issuedDate: '8/06/2026',
    status: 'Pending',
    amount: '$485.50',
    type: 'Parts',
    jobNumber: '132410',
    jobType: 'Appliance Service',
  },
];

import { useDatabaseMode } from '@/contexts/database-mode-context';

export default function WexPurchaseOrderListPage() {
  const { databaseMode } = useDatabaseMode();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>(
    (databaseMode === 'live' || databaseMode === 'sandbox') ? [] : initialPurchaseOrders
  );
  const [statusFilter, setStatusFilter] = useState('All');
  const [poTypeFilter, setPoTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPoModalOpen, setIsNewPoModalOpen] = useState(false);

  React.useEffect(() => {
    if (databaseMode === 'live' || databaseMode === 'sandbox') {
      setPurchaseOrders([]);
    } else {
      setPurchaseOrders(initialPurchaseOrders);
    }
  }, [databaseMode]);

  // New PO Form state
  const [newSupplier, setNewSupplier] = useState('');
  const [newPoName, setNewPoName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newJobNumber, setNewJobNumber] = useState('');

  const toggleFavorite = (id: string) => {
    setPurchaseOrders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier || !newPoName) return;

    const newEntry: PurchaseOrderRecord = {
      id: `po-${Date.now()}`,
      supplier: newSupplier,
      isFavorite: false,
      poNumber: `PO-${Math.floor(80000 + Math.random() * 10000)}`,
      supplierOrderNumber: `SUP-${Math.floor(90000 + Math.random() * 10000)}`,
      poName: newPoName,
      lastModified: '8/09/2026',
      issuedDate: '8/09/2026',
      status: 'Approved',
      amount: newAmount ? `$${newAmount}` : '$0.00',
      type: 'Parts',
      jobNumber: newJobNumber || '134155',
      jobType: 'HVAC Service',
    };

    setPurchaseOrders([newEntry, ...purchaseOrders]);
    setIsNewPoModalOpen(false);
    setNewSupplier('');
    setNewPoName('');
    setNewAmount('');
  };

  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.poName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.poNumber.includes(searchQuery) ||
      po.supplierOrderNumber.includes(searchQuery) ||
      po.jobNumber.includes(searchQuery);

    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    const matchesType = poTypeFilter === 'All' || po.type === poTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader 
        title="Jobs Purchase Order List" 
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => alert('Copy Purchase Order link copied!')}
              className="inline-flex items-center gap-1 text-[#be4646] hover:text-[#a63a3a] font-semibold text-xs transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewPoModalOpen(true)}
              className="inline-flex items-center gap-1 text-[#be4646] hover:text-[#a63a3a] font-bold text-xs transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New PO</span>
            </button>
          </div>
        }
      />

      {/* 2. Filter Bar Container (No download buttons/labels) */}
      <FilterBar>
        <div className="flex flex-wrap items-end justify-between gap-4 text-xs w-full">
          <div className="flex items-center gap-4">
            {/* Status Select */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-slate-600 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[140px]"
              >
                <option value="All">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Received">Received</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            {/* PO Type Select */}
            <div className="flex flex-col">
              <label className="text-[11px] font-medium text-slate-600 mb-1">
                PO Type
              </label>
              <select
                value={poTypeFilter}
                onChange={(e) => setPoTypeFilter(e.target.value)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[140px]"
              >
                <option value="All">All</option>
                <option value="Parts">Parts</option>
                <option value="Equipment">Equipment</option>
                <option value="Services">Services</option>
              </select>
            </div>
          </div>

          {/* PO Search Group */}
          <div className="flex items-center border border-slate-300 rounded bg-white px-2.5 py-1 shadow-xs ml-auto">
            <span className="text-xs font-medium text-slate-700 pr-2 border-r border-slate-200 flex items-center gap-1">
              PO Search <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </span>
            <div className="flex items-center pl-2">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>
          </div>
        </div>
      </FilterBar>

      {/* 3. Replicated Purchase Order Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-3 py-3">Supplier</th>
                <th className="w-8 px-2 py-3 text-center"></th>
                <th className="px-3 py-3">PO #</th>
                <th className="px-3 py-3">Supplier Order #</th>
                <th className="px-3 py-3">PO Name</th>
                <th className="px-3 py-3 cursor-pointer hover:underline whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    Last Modified <span className="text-[10px]">▼</span>
                  </span>
                </th>
                <th className="px-3 py-3">Issued Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Job</th>
                <th className="px-3 py-3">Job Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((po) => (
                  <tr key={po.id} className="bg-white">
                    {/* Supplier */}
                    <td className="px-3 py-3.5 font-medium">
                      <Link
                        href="/more/vendors"
                        className="inline-flex items-center gap-1 text-[#be4646] font-semibold hover:underline"
                      >
                        <span>{po.supplier}</span>
                        <ExternalLink className="w-3 h-3 text-[#be4646]" />
                      </Link>
                    </td>

                    {/* Favorite Heart */}
                    <td className="px-2 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(po.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Heart className={`w-3.5 h-3.5 ${po.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                      </button>
                    </td>

                    {/* PO # */}
                    <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                      <Link
                        href={`/jobs/purchase-orders/${po.poNumber}`}
                        className="inline-flex items-center gap-1 text-[#be4646] font-semibold hover:underline"
                      >
                        <span>{po.poNumber}</span>
                        <ExternalLink className="w-3 h-3 text-[#be4646]" />
                      </Link>
                    </td>

                    {/* Supplier Order # */}
                    <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                      {po.supplierOrderNumber}
                    </td>

                    {/* PO Name */}
                    <td className="px-3 py-3.5 text-slate-800 font-medium max-w-xs truncate">
                      {po.poName}
                    </td>

                    {/* Last Modified */}
                    <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                      {po.lastModified}
                    </td>

                    {/* Issued Date */}
                    <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                      {po.issuedDate}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 font-medium text-slate-700">
                      {po.status}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-3.5 font-semibold text-slate-800">
                      {po.amount}
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3.5 text-slate-700">
                      {po.type}
                    </td>

                    {/* Job */}
                    <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                      <Link
                        href={`/jobs/${po.jobNumber}`}
                        className="inline-flex items-center gap-1 text-[#be4646] font-semibold hover:underline"
                      >
                        <span>{po.jobNumber}</span>
                        <ExternalLink className="w-3 h-3 text-[#be4646]" />
                      </Link>
                    </td>

                    {/* Job Type */}
                    <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                      {po.jobType}
                    </td>
                  </tr>
                ))
              ) : (
                /* Replicated Empty State Message from Screenshot */
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500 italic bg-slate-50/50">
                    Add a Supplier and Supplier Catalog Items to create purchase orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. New PO Modal */}
      {isNewPoModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#be4646]" /> Create Purchase Order
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPoModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  PO Description / Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPoName}
                  onChange={(e) => setNewPoName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="text"
                    placeholder="1250.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Job #
                  </label>
                  <input
                    type="text"
                    placeholder="134100"
                    value={newJobNumber}
                    onChange={(e) => setNewJobNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsNewPoModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="submit"
                >
                  Save PO
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
