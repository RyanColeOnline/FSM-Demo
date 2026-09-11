'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  CreditCard, 
  ExternalLink, 
  Search, 
  RefreshCw, 
  Printer, 
  Plus, 
  Minus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { PdfDocumentViewerModal } from '@/components/modals/PdfDocumentViewerModal';

export interface Transaction {
  transaction_id: string;
  date: string;
  status: 'Settled' | 'Pending' | 'Declined';
  amount: number;
  customer_name: string;
  customer_id?: string;
  card_brand: string;
  card_last4: string;
  payment_method: string;
  invoice_number: string;
  reference_number: string;
  authorization_code: string;
  qb_sync_status: 'Unmatched' | 'Ready' | 'Synced' | 'Error' | 'Pre-conversion';
  batch_id: string;
}

export interface PayoutBatch {
  payout_batch_id: string;
  batch_name: string;
  total_amount: number;
  non_amex_amount: number;
  amex_amount: number;
  transactions: Transaction[];
}

const initialBatches: PayoutBatch[] = [
  {
    payout_batch_id: 'pending-batch',
    batch_name: 'PENDING / UNSETTLED TRANSACTIONS',
    total_amount: 680.00,
    non_amex_amount: 680.00,
    amex_amount: 0.00,
    transactions: [
      {
        transaction_id: 'tx-106',
        date: '9/10/2026 10:15 AM',
        status: 'Pending',
        amount: 680.00,
        customer_name: 'Apex Commercial Plaza',
        card_brand: 'Visa',
        card_last4: '1190',
        payment_method: 'EMV Chip',
        invoice_number: 'INV-2045',
        reference_number: 'REF-984720',
        authorization_code: 'AUTH-09901',
        qb_sync_status: 'Ready',
        batch_id: 'pending-batch',
      },
    ],
  },
  {
    payout_batch_id: 'batch-2026-09-09',
    batch_name: 'SETTLEMENT ID #948210 - 09/09/2026',
    total_amount: 1485.50,
    non_amex_amount: 1210.50,
    amex_amount: 275.00,
    transactions: [
      {
        transaction_id: 'tx-101',
        date: '9/09/2026 3:45 PM',
        status: 'Settled',
        amount: 450.00,
        customer_name: 'Summit Ridge Properties',
        card_brand: 'Visa',
        card_last4: '4242',
        payment_method: 'Card Swipe',
        invoice_number: 'INV-2044',
        reference_number: 'REF-984712',
        authorization_code: 'AUTH-09124',
        qb_sync_status: 'Synced',
        batch_id: 'batch-2026-09-09',
      },
      {
        transaction_id: 'tx-102',
        date: '9/09/2026 1:15 PM',
        status: 'Settled',
        amount: 760.50,
        customer_name: 'Oakwood Residences',
        card_brand: 'Mastercard',
        card_last4: '8812',
        payment_method: 'EMV Chip',
        invoice_number: 'INV-2043',
        reference_number: 'REF-984713',
        authorization_code: 'AUTH-09125',
        qb_sync_status: 'Synced',
        batch_id: 'batch-2026-09-09',
      },
      {
        transaction_id: 'tx-103',
        date: '9/09/2026 11:20 AM',
        status: 'Settled',
        amount: 275.00,
        customer_name: 'Elena Martinez',
        card_brand: 'Amex',
        card_last4: '1004',
        payment_method: 'Stored Account',
        invoice_number: 'INV-2042',
        reference_number: 'REF-984714',
        authorization_code: 'AUTH-09126',
        qb_sync_status: 'Ready',
        batch_id: 'batch-2026-09-09',
      },
    ],
  },
  {
    payout_batch_id: 'batch-2026-09-07',
    batch_name: 'SETTLEMENT ID #948201 - 09/07/2026',
    total_amount: 2150.00,
    non_amex_amount: 2150.00,
    amex_amount: 0.00,
    transactions: [
      {
        transaction_id: 'tx-104',
        date: '9/07/2026 4:10 PM',
        status: 'Settled',
        amount: 1200.00,
        customer_name: 'Horizon Business Park',
        card_brand: 'Visa',
        card_last4: '5541',
        payment_method: 'Manual Keyed',
        invoice_number: 'INV-2041',
        reference_number: 'REF-984700',
        authorization_code: 'AUTH-08811',
        qb_sync_status: 'Synced',
        batch_id: 'batch-2026-09-07',
      },
      {
        transaction_id: 'tx-105',
        date: '9/07/2026 2:30 PM',
        status: 'Settled',
        amount: 950.00,
        customer_name: 'Metro Logistics Hub',
        card_brand: 'Discover',
        card_last4: '9012',
        payment_method: 'Card Swipe',
        invoice_number: 'INV-2040',
        reference_number: 'REF-984701',
        authorization_code: 'AUTH-08812',
        qb_sync_status: 'Unmatched',
        batch_id: 'batch-2026-09-07',
      },
    ],
  },
];

function TransactionsContent() {
  const [batches, setBatches] = useState<PayoutBatch[]>(initialBatches);

  // Filter States
  const [cardBatchFilter, setCardBatchFilter] = useState('Card Batch');
  const [groupFilter, setGroupFilter] = useState('All Groups');
  const [startDate, setStartDate] = useState('9/01/2026');
  const [endDate, setEndDate] = useState('9/11/2026');
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable Tx detail card (NONE expanded on load by default!)
  const [expandedTxIds, setExpandedTxIds] = useState<string[]>([]);
  const [viewingPdfTx, setViewingPdfTx] = useState<Transaction | null>(null);

  // Pagination State (50 items per page limit!)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  // Status Checkboxes
  const [statusFilters, setStatusFilters] = useState({
    Settled: true,
    Pending: true,
    Declined: true,
  });

  // Entry Method Checkboxes
  const [methodFilters, setMethodFilters] = useState({
    'Manual Keyed': true,
    'Stored Account': true,
    'Card Swipe': true,
    'EMV Chip': true,
  });

  // QuickBooks Sync Status Checkboxes
  const [qbSyncFilters, setQbSyncFilters] = useState({
    Unmatched: true,
    Ready: true,
    Synced: true,
    Error: true,
    'Pre-conversion': true,
  });

  const toggleTxExpand = (id: string) => {
    setExpandedTxIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Filter Batches and inner Transactions
  const filteredBatches = batches
    .map((batch) => {
      const filteredTxs = batch.transactions.filter((tx) => {
        // Status Filter
        if (!statusFilters[tx.status as keyof typeof statusFilters]) return false;

        // Method Filter
        if (!methodFilters[tx.payment_method as keyof typeof methodFilters]) return false;

        // QB Sync Filter
        if (!qbSyncFilters[tx.qb_sync_status as keyof typeof qbSyncFilters]) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            tx.customer_name.toLowerCase().includes(q) ||
            tx.invoice_number.toLowerCase().includes(q) ||
            tx.reference_number.toLowerCase().includes(q) ||
            tx.card_last4.includes(q) ||
            tx.amount.toString().includes(q);

          if (!matches) return false;
        }

        return true;
      });

      return { ...batch, transactions: filteredTxs };
    })
    .filter((batch) => batch.transactions.length > 0);

  // Flatten all transactions for pagination count calculation
  const totalTransactionCount = filteredBatches.reduce((acc, b) => acc + b.transactions.length, 0);
  const totalPages = Math.ceil(totalTransactionCount / pageSize) || 1;

  return (
    <div className="w-full space-y-5 text-slate-800 pb-16 font-sans">
      {/* 1. Top Header */}
      <PageHeader title="Transactions History" />

      {/* 2. Shortened Filter Module with Refresh & Print Buttons at Top Right */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3 text-xs relative">
        {/* Top Header Row of Module with Refresh & Print at Top Right */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <span className="font-bold text-slate-800 text-sm">Filter Transactions</span>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBatches([...initialBatches])}
              className="px-3 py-1 bg-[#3f6b35] hover:bg-[#34572c] text-white text-xs font-semibold rounded shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 bg-[#3f6b35] hover:bg-[#34572c] text-white text-xs font-semibold rounded shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Shortened Filter Controls Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column Controls */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <select
                value={cardBatchFilter}
                onChange={(e) => setCardBatchFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="Card Batch">Card Batch ▾</option>
                <option value="Date Grouping">Date Grouping ▾</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="All Groups">All Groups ▾</option>
                <option value="Group A">Group A ▾</option>
                <option value="Group B">Group B ▾</option>
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="font-semibold text-slate-700 w-24 shrink-0">Date Range:</span>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none"
              />
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="font-semibold text-slate-700 w-24 shrink-0">Search:</span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column Filter Checkboxes */}
          <div className="lg:col-span-8 space-y-3 pl-0 lg:pl-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0">
            {/* Status Checkboxes */}
            <div className="flex flex-wrap items-center gap-4">
              {Object.keys(statusFilters).map((key) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={statusFilters[key as keyof typeof statusFilters]}
                    onChange={(e) => setStatusFilters({ ...statusFilters, [key]: e.target.checked })}
                    className="accent-[#3f6b35] h-3.5 w-3.5"
                  />
                  <span>{key}</span>
                </label>
              ))}
            </div>

            {/* Entry Method Checkboxes */}
            <div className="flex flex-wrap items-center gap-4">
              {Object.keys(methodFilters).map((key) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={methodFilters[key as keyof typeof methodFilters]}
                    onChange={(e) => setMethodFilters({ ...methodFilters, [key]: e.target.checked })}
                    className="accent-[#3f6b35] h-3.5 w-3.5"
                  />
                  <span>{key}</span>
                </label>
              ))}
            </div>

            {/* QuickBooks Sync Statuses Group */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="font-semibold text-slate-600 text-[11px]">QuickBooks Sync Statuses</div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={qbSyncFilters.Unmatched}
                    onChange={(e) => setQbSyncFilters({ ...qbSyncFilters, Unmatched: e.target.checked })}
                    className="accent-[#3f6b35] h-3.5 w-3.5"
                  />
                  <span>🔄 Unmatched</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={qbSyncFilters.Ready}
                    onChange={(e) => setQbSyncFilters({ ...qbSyncFilters, Ready: e.target.checked })}
                    className="accent-[#3f6b35] h-3.5 w-3.5"
                  />
                  <span className="text-blue-600">✔ Ready</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={qbSyncFilters.Synced}
                    onChange={(e) => setQbSyncFilters({ ...qbSyncFilters, Synced: e.target.checked })}
                    className="accent-[#3f6b35] h-3.5 w-3.5"
                  />
                  <span className="text-emerald-600">✔ Synced</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={qbSyncFilters.Error}
                    onChange={(e) => setQbSyncFilters({ ...qbSyncFilters, Error: e.target.checked })}
                    className="accent-[#3f6b35] h-3.5 w-3.5"
                  />
                  <span className="text-rose-600">❌ Error</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={qbSyncFilters['Pre-conversion']}
                    onChange={(e) => setQbSyncFilters({ ...qbSyncFilters, 'Pre-conversion': e.target.checked })}
                    className="accent-[#3f6b35] h-3.5 w-3.5"
                  />
                  <span>📅 Pre-conversion</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. QuickBooks Sync Date/Time Bar Header */}
      <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100/90 px-3 py-2 rounded border border-slate-200 font-semibold">
        <Plus className="w-3.5 h-3.5 text-slate-600 cursor-pointer" />
        <span>Last QuickBooks Sync Date/Time: 8/7/2026 4:18PM</span>
        <span className="ml-1 px-1.5 py-0.5 bg-emerald-700 text-white text-[10px] rounded font-bold uppercase tracking-wider">
          Intuit QuickBooks
        </span>
      </div>

      {/* 4. Transactions Batch Table View */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 cursor-pointer hover:underline">
                  <span className="flex items-center gap-1">
                    Status <span className="text-[10px]">▼</span>
                  </span>
                </th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">From</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Invoice Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBatches.map((batch) => {
                return (
                  <React.Fragment key={batch.payout_batch_id}>
                    {/* PARENT BATCH ROW (Non-collapsible static header row) */}
                    <tr className="bg-[#3e3e3e] text-white font-bold">
                      <td className="px-3 py-2 text-xs" colSpan={2}>
                        <span>{batch.batch_name}</span>
                      </td>
                      <td className="px-3 py-2 ">
                        ${batch.total_amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-normal text-slate-200 text-[11px]" colSpan={4}>
                        {batch.amex_amount > 0 ? (
                          <span>
                            Non-Amex: ${batch.non_amex_amount.toFixed(2)} &nbsp;&nbsp; Amex: ${batch.amex_amount.toFixed(2)}
                          </span>
                        ) : (
                          batch.payout_batch_id !== 'pending-batch' && (
                            <span>Non-Amex: ${batch.non_amex_amount.toFixed(2)} &nbsp;&nbsp; Amex: $0.00</span>
                          )
                        )}
                      </td>
                    </tr>

                    {/* CHILD TRANSACTION ROWS (NONE expanded by default!) */}
                    {batch.transactions.map((tx) => {
                      const isTxExpanded = expandedTxIds.includes(tx.transaction_id);

                      return (
                        <React.Fragment key={tx.transaction_id}>
                          <tr className="bg-white">
                            {/* Date + Expand Button */}
                            <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTxExpand(tx.transaction_id);
                                }}
                                className="mr-2 text-slate-500 hover:text-slate-800 focus:outline-none cursor-pointer"
                              >
                                {isTxExpanded ? (
                                  <Minus className="w-3.5 h-3.5 inline p-0.5 bg-slate-200 rounded" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 inline p-0.5 bg-slate-200 rounded" />
                                )}
                              </button>
                              <span>{tx.date}</span>
                            </td>

                            {/* Status Badge */}
                            <td className="px-3 py-2.5 font-medium">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                tx.status === 'Pending' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : tx.status === 'Settled' 
                                  ? 'bg-slate-200 text-slate-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {tx.status}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-3 py-2.5 font-bold text-[#488e36]">
                              ${tx.amount.toFixed(2)}
                            </td>

                            {/* From Customer */}
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {tx.customer_name}
                            </td>

                            {/* Method */}
                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                              <span className="mr-1 text-slate-400 font-bold">∞</span>
                              <span className="px-1 py-0.5 bg-slate-700 text-white text-[10px] rounded font-bold mr-1">
                                {tx.card_brand.toUpperCase()}
                              </span>
                              <span>x{tx.card_last4}</span>
                            </td>

                            {/* Type */}
                            <td className="px-3 py-2.5 text-slate-700">
                              {tx.payment_method}
                            </td>

                            {/* Invoice Number */}
                            <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                              <button 
                                type="button"
                                onClick={() => setViewingPdfTx(tx)}
                                className="text-[#be4646] hover:underline inline-flex items-center gap-1 font-semibold focus:outline-none cursor-pointer"
                                title={`View PDF for ${tx.invoice_number}`}
                              >
                                <span>{tx.invoice_number}</span>
                                <ExternalLink className="w-3 h-3 text-[#be4646]" />
                              </button>
                            </td>
                          </tr>

                          {/* EXPANDED DETAILS CARD (Only visible when explicitly expanded by user) */}
                          {isTxExpanded && (
                            <tr className="bg-slate-50/90">
                              <td colSpan={7} className="px-6 py-4 border-y border-slate-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-700">
                                  <div>
                                    <div className="font-bold text-slate-900 mb-1">Authorization Details</div>
                                    <div>Auth Code: <span className="text-slate-800 font-semibold">{tx.authorization_code}</span></div>
                                    <div>Ref Number: <span className="text-slate-800">{tx.reference_number}</span></div>
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 mb-1">QuickBooks Status</div>
                                    <div>Status: <span className="font-semibold text-emerald-700">{tx.qb_sync_status}</span></div>
                                    <div>Batch ID: <span className="text-[11px]">{tx.batch_id}</span></div>
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 mb-1">Payment Method</div>
                                    <div>Entry: {tx.payment_method}</div>
                                    <div>Card: {tx.card_brand} (x{tx.card_last4})</div>
                                  </div>
                                  <div className="flex flex-col justify-end gap-2">
                                    <button 
                                      type="button"
                                      onClick={() => alert(`Printing Receipt for Invoice #${tx.invoice_number}...`)}
                                      className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold hover:bg-slate-100 text-slate-700"
                                    >
                                      Print Receipt
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. 50 Record Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="text-slate-600">
            Showing <span className="font-bold text-slate-800">1 - {Math.min(pageSize, totalTransactionCount)}</span> of{' '}
            <span className="font-bold text-slate-800">{totalTransactionCount}</span> records (50 per page)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded font-bold">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice PDF Lightbox Modal */}
      {viewingPdfTx && (
        <PdfDocumentViewerModal
          isOpen={viewingPdfTx !== null}
          onClose={() => setViewingPdfTx(null)}
          documentType="Invoice"
          documentNumber={viewingPdfTx.invoice_number}
          customerName={viewingPdfTx.customer_name}
          billToCustomer={viewingPdfTx.customer_name}
          issueDate={viewingPdfTx.date.split(' ')[0] || '9/10/2026'}
          dueDate={viewingPdfTx.date.split(' ')[0] || '9/10/2026'}
          amount={`$${viewingPdfTx.amount.toFixed(2)}`}
          subtotal={viewingPdfTx.amount}
          tax={0}
          total={viewingPdfTx.amount}
          balanceDue={viewingPdfTx.status === 'Settled' ? 0 : viewingPdfTx.amount}
          jobNumber={viewingPdfTx.invoice_number.replace('INV-', '')}
          status={viewingPdfTx.status === 'Settled' ? 'Approved' : 'Pending'}
          paymentStatus={viewingPdfTx.status === 'Settled' ? 'Paid' : 'Unpaid'}
          paymentTerms="Due upon Receipt"
          paymentsCredits={viewingPdfTx.status === 'Settled' ? [`$${viewingPdfTx.amount.toFixed(2)} (${viewingPdfTx.payment_method})`] : []}
          technician="Marcus Vance"
          lineItems={[
            {
              id: 'li-1',
              name: 'Field Service & Diagnostics',
              description: `Completed service transaction ${viewingPdfTx.transaction_id} via ${viewingPdfTx.card_brand} (x${viewingPdfTx.card_last4})`,
              quantity: 1,
              rate: viewingPdfTx.amount,
              unitPrice: viewingPdfTx.amount,
              amount: viewingPdfTx.amount,
              totalPrice: viewingPdfTx.amount,
              isTaxable: false,
            },
          ]}
        />
      )}
    </div>
  );
}

export default function WexTransactionsPageContainer() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Transactions...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
