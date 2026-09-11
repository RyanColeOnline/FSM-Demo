'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Check, 
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { 
  FilterBar, 
  PageHeader, 
  StatusBadge 
} from '@/components/ui';
import { AdobePdfIcon, PdfDocumentViewerModal } from '@/components/modals/PdfDocumentViewerModal';
import { DocumentBuilderModal, DocumentBuilderData } from '@/components/modals/DocumentBuilderModal';
import { useInvoices, usePaginatedInvoices } from '@/hooks/useInvoices';
import { CanonicalInvoice, CanonicalInvoiceLineItem, normalizeToEasternDateString } from '@murphys/domain';

export type InvoiceStatus = 'Open - Draft' | 'Presented' | 'Signed' | 'Voided' | 'Closed';

interface InvoiceRecord {
  id: string;
  customerId: string;
  customerName: string;
  billToCustomer: string;
  invoiceNumber: string;
  lastModified: string;
  issueDate: string;
  invoiceStatus: InvoiceStatus;
  paymentStatus: 'Unpaid' | 'Paid';
  invoiceAmount: string;
  jobNumber: string;
  autoSync: 'Ready' | 'Synced' | 'Pending';
}

function formatSlashDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return `${m}/${d}/${y}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    const m = parseInt(parts[0], 10);
    const d = parseInt(parts[1], 10);
    const y = parts[2].slice(0, 4);
    return `${m}/${d}/${y}`;
  }
  return str;
}

export default function WexInvoiceListPage() {
  const [autoSyncFilter, setAutoSyncFilter] = useState('');
  const [displayInvoicesFilter, setDisplayInvoicesFilter] = useState('All Invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewingPdfInvoice, setViewingPdfInvoice] = useState<InvoiceRecord | null>(null);
  const [editingInvoiceData, setEditingInvoiceData] = useState<DocumentBuilderData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Debounce search input to avoid spamming the endpoint on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { saveInvoice } = useInvoices();

  const statusParam = displayInvoicesFilter === 'Unpaid Invoices' || displayInvoicesFilter === 'Paid Invoices'
    ? 'All'
    : displayInvoicesFilter === 'All Invoices'
    ? 'All'
    : displayInvoicesFilter;

  const paymentStatusParam = displayInvoicesFilter === 'Unpaid Invoices'
    ? 'Unpaid'
    : displayInvoicesFilter === 'Paid Invoices'
    ? 'Paid'
    : 'All';

  const { data: paginatedData, isLoading: loading, refetch: refreshInvoices } = usePaginatedInvoices({
    page: currentPage,
    pageSize,
    search: debouncedSearch,
    status: statusParam,
    paymentStatus: paymentStatusParam,
  });

  const canonicalInvoices = paginatedData?.invoices || [];
  const totalInvoices = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, displayInvoicesFilter, autoSyncFilter]);

  // Map canonical invoices to view records
  const invoices: InvoiceRecord[] = React.useMemo(() => {
    return canonicalInvoices.map((inv: any) => ({
      id: inv.id,
      customerId: inv.customerId || `cust-${inv.jobNumber || '1'}`,
      customerName: inv.customerName || inv.billToCustomer || 'Customer',
      billToCustomer: inv.billToCustomer || inv.customerName || 'Customer',
      invoiceNumber: String(inv.invoiceNumber || inv.id || '').replace(/^#I-/, ''),
      lastModified: formatSlashDate(inv.lastModified || (inv.updatedAt ? inv.updatedAt.slice(0, 10) : inv.issueDate || '2026-08-28')),
      issueDate: formatSlashDate(inv.issueDate || '2026-08-28'),
      invoiceStatus: (inv.invoiceStatus || (inv.status === 'Draft' ? 'Open - Draft' : (inv.status as InvoiceStatus)) || 'Open - Draft') as InvoiceStatus,
      paymentStatus: (inv.paymentStatus || ((inv.balanceDue !== undefined && inv.balanceDue <= 0 && inv.total > 0) ? 'Paid' : 'Unpaid')) as 'Unpaid' | 'Paid',
      invoiceAmount: inv.invoiceAmount || `$${(inv.total || 0).toFixed(2)}`,
      jobNumber: String(inv.jobNumber || inv.jobId || '').replace(/^job-/, '') || '116483',
      autoSync: (inv.autoSync as any) || 'Ready',
    }));
  }, [canonicalInvoices]);

  const filteredInvoices = React.useMemo(() => {
    if (!autoSyncFilter.trim()) return invoices;
    return invoices.filter((inv) =>
      inv.autoSync.toLowerCase().includes(autoSyncFilter.toLowerCase().trim())
    );
  }, [invoices, autoSyncFilter]);

  const handleStatusChange = async (id: string, newStatus: InvoiceStatus) => {
    const rawInv = canonicalInvoices.find((i) => i.id === id);
    if (rawInv) {
      const canonicalStatus = (newStatus === 'Open - Draft' ? 'Draft' : newStatus) as any;
      await saveInvoice({ ...rawInv, status: canonicalStatus, updatedAt: new Date().toISOString() });
      refreshInvoices();
    }
  };

  const handleOpenInvoiceForm = (inv: InvoiceRecord) => {
    const rawInv = canonicalInvoices.find((i) => i.id === inv.id);
    const lineItems = rawInv?.lineItems?.map((li) => ({
      id: li.id,
      description: li.name || li.description,
      details: li.description,
      quantity: li.quantity,
      rate: li.unitPrice,
      amount: li.totalPrice,
    })) || [
      {
        id: 'item-1',
        description: 'HVAC System Service & Inspection',
        details: 'Complete diagnostic testing, electrical check, airflow optimization, and filter replacement.',
        quantity: 1,
        rate: parseFloat(inv.invoiceAmount.replace(/[^0-9.]/g, '')) || 270.0,
        amount: parseFloat(inv.invoiceAmount.replace(/[^0-9.]/g, '')) || 270.0,
      }
    ];

    setEditingInvoiceData({
      id: inv.id,
      documentType: 'Invoice',
      documentNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      billToCustomer: inv.billToCustomer,
      jobNumber: inv.jobNumber,
      issueDate: inv.issueDate,
      lastModified: inv.lastModified,
      status: inv.invoiceStatus,
      amount: inv.invoiceAmount,
      lineItems,
    });
  };

  const handleSaveInvoiceForm = async (updatedData: DocumentBuilderData) => {
    const rawInv = canonicalInvoices.find((i) => i.id === updatedData.id);
    const totalAmount = parseFloat(updatedData.amount.replace(/[^0-9.]/g, '')) || 270.0;
    const lineItems: CanonicalInvoiceLineItem[] = (updatedData.lineItems || []).map((li) => ({
      id: li.id,
      name: li.description,
      description: li.details || li.description,
      quantity: li.quantity,
      unitPrice: li.rate,
      totalPrice: li.amount,
      isTaxable: true,
    }));

    const canonical: CanonicalInvoice = {
      id: updatedData.id,
      invoiceNumber: updatedData.documentNumber.startsWith('#I-') ? updatedData.documentNumber : `#I-${updatedData.documentNumber}`,
      customerId: updatedData.customerId || 'cust-1',
      jobId: rawInv?.jobId || `job-${updatedData.jobNumber}`,
      jobNumber: parseInt(updatedData.jobNumber.replace(/[^0-9]/g, ''), 10) || null,
      billToCustomer: updatedData.billToCustomer || updatedData.customerName,
      billingAddress: rawInv?.billingAddress || '',
      jobLocation: rawInv?.jobLocation || '',
      technician: rawInv?.technician || 'Marcus Vance',
      paymentTerms: rawInv?.paymentTerms || 'Due Upon Receipt',
      acceptedPaymentMethods: rawInv?.acceptedPaymentMethods || ['Card', 'Check', 'Cash'],
      issueDate: updatedData.issueDate,
      dueDate: rawInv?.dueDate || updatedData.issueDate,
      status: (updatedData.status === 'Open - Draft' ? 'Draft' : updatedData.status) as any,
      subtotal: totalAmount,
      taxRate: 0,
      taxAmount: 0,
      total: totalAmount,
      amountPaid: rawInv?.amountPaid || 0,
      balanceDue: rawInv?.balanceDue !== undefined ? rawInv.balanceDue : totalAmount,
      lineItems,
      createdAt: rawInv?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveInvoice(canonical);
    setEditingInvoiceData(null);
    refreshInvoices();
  };

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader 
        title="Jobs Invoice List" 
      />

      {/* 2. Filter Bar Container */}
      <FilterBar>
        <div className="flex flex-wrap items-end justify-between gap-4 text-xs w-full">
          {/* Auto Sync Status Filter */}
          <div className="flex flex-col">
            <label className="text-[11px] font-medium text-slate-600 mb-1">
              Auto Sync Status
            </label>
            <input
              type="text"
              placeholder=""
              value={autoSyncFilter}
              onChange={(e) => setAutoSyncFilter(e.target.value)}
              className="w-44 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Display Invoices Filter */}
          <div className="flex flex-col">
            <label className="text-[11px] font-medium text-slate-600 mb-1">
              Display Invoices
            </label>
            <select
              value={displayInvoicesFilter}
              onChange={(e) => setDisplayInvoicesFilter(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[180px]"
            >
              <option value="All Invoices">All Invoices</option>
              <option value="Open - Draft">Open - Draft</option>
              <option value="Presented">Presented</option>
              <option value="Signed">Signed</option>
              <option value="Voided">Voided</option>
              <option value="Closed">Closed</option>
              <option value="Unpaid Invoices">Unpaid Invoices</option>
              <option value="Paid Invoices">Paid Invoices</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex items-center ml-auto">
            <div className="flex items-center border border-slate-300 rounded bg-white px-2.5 py-1">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                type="text"
                placeholder="Search across all invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
              />
              {loading && <Loader2 className="w-3 h-3 text-slate-400 animate-spin ml-1" />}
            </div>
          </div>
        </div>
      </FilterBar>

      {/* 3. Invoice List Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Bill To Customer</th>
                <th className="px-3 py-3">Invoice #</th>
                <th className="px-3 py-3">Last Modified</th>
                <th className="px-3 py-3">Issue Date</th>
                <th className="px-3 py-3">Invoice Status</th>
                <th className="px-3 py-3">Payment Status</th>
                <th className="px-3 py-3">Invoice Amount</th>
                <th className="px-3 py-3">Job #</th>
                <th className="px-3 py-3">Auto Sync</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                    No invoices match the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-100 transition-none"
                    >
                      {/* Customer */}
                      <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                        <Link
                          href={`/customers/${inv.customerId}`}
                          className="text-[#be4646] font-semibold hover:underline"
                        >
                          {inv.customerName}
                        </Link>
                      </td>

                      {/* Bill To Customer */}
                      <td className="px-3 py-3.5 text-slate-700 whitespace-nowrap">
                        {inv.billToCustomer}
                      </td>

                      {/* Invoice # */}
                      <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenInvoiceForm(inv)}
                            className="text-[#be4646] font-semibold hover:underline cursor-pointer"
                          >
                            {inv.invoiceNumber}
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingPdfInvoice(inv)}
                            title="View Official Invoice PDF"
                            className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <AdobePdfIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Last Modified */}
                      <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                        {inv.lastModified}
                      </td>

                      {/* Issue Date */}
                      <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                        {inv.issueDate}
                      </td>

                      {/* Invoice Status Dropdown */}
                      <td className="px-3 py-3.5">
                        <select
                          value={inv.invoiceStatus}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="Open - Draft">Open - Draft</option>
                          <option value="Presented">Presented</option>
                          <option value="Signed">Signed</option>
                          <option value="Voided">Voided</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>

                      {/* Payment Status */}
                      <td className="px-3 py-3.5 font-medium whitespace-nowrap text-slate-700">
                        {inv.paymentStatus}
                      </td>

                      {/* Invoice Amount */}
                      <td className="px-3 py-3.5 font-semibold text-slate-800">
                        {inv.invoiceAmount}
                      </td>

                      {/* Job # */}
                      <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                        <Link
                          href={`/jobs/${inv.jobNumber}`}
                          className="text-[#be4646] font-semibold hover:underline"
                        >
                          {inv.jobNumber}
                        </Link>
                      </td>

                      {/* Auto Sync Status Badge */}
                      <td className="px-3 py-3.5">
                        <StatusBadge status={inv.autoSync} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Bar (20 invoices per page) */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-800">{totalInvoices === 0 ? 0 : Math.min(1 + (currentPage - 1) * pageSize, totalInvoices)}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, totalInvoices)}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalInvoices.toLocaleString()}</span> invoices
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

      {/* Official Shared Invoice Modal Form */}
      {editingInvoiceData && (
        <DocumentBuilderModal
          isOpen={editingInvoiceData !== null}
          onClose={() => setEditingInvoiceData(null)}
          documentType="Invoice"
          initialData={editingInvoiceData}
          onSave={handleSaveInvoiceForm}
          onOpenPdfViewer={(data) => {
            setEditingInvoiceData(null);
            setViewingPdfInvoice({
              id: data.id,
              customerId: data.customerId,
              customerName: data.customerName,
              billToCustomer: data.billToCustomer,
              invoiceNumber: data.documentNumber,
              lastModified: data.lastModified,
              issueDate: data.issueDate,
              invoiceStatus: data.status,
              paymentStatus: 'Unpaid',
              invoiceAmount: data.amount,
              jobNumber: data.jobNumber,
              autoSync: 'Ready',
            });
          }}
        />
      )}

      {/* Official Shared PDF Viewer Modal */}
      {viewingPdfInvoice && (() => {
        const rawInv = canonicalInvoices.find(
          (i) => i.id === viewingPdfInvoice.id || 
                 String(i.invoiceNumber || '').replace(/^#?I-/, '') === String(viewingPdfInvoice.invoiceNumber).replace(/^#?I-/, '')
        );
        return (
          <PdfDocumentViewerModal
            isOpen={viewingPdfInvoice !== null}
            onClose={() => setViewingPdfInvoice(null)}
            documentType="Invoice"
            documentNumber={viewingPdfInvoice.invoiceNumber}
            customerName={viewingPdfInvoice.customerName}
            billToCustomer={viewingPdfInvoice.billToCustomer}
            billingAddress={rawInv?.billingAddress}
            jobLocation={rawInv?.jobLocation}
            issueDate={viewingPdfInvoice.issueDate}
            dueDate={rawInv?.dueDate || viewingPdfInvoice.issueDate}
            lastModified={viewingPdfInvoice.lastModified}
            amount={viewingPdfInvoice.invoiceAmount}
            subtotal={rawInv?.subtotal}
            tax={rawInv?.taxAmount}
            total={rawInv?.total}
            balanceDue={rawInv?.balanceDue}
            jobNumber={viewingPdfInvoice.jobNumber}
            status={viewingPdfInvoice.invoiceStatus}
            paymentStatus={viewingPdfInvoice.paymentStatus}
            paymentTerms={(rawInv as any)?.paymentTerms || 'Due upon Receipt'}
            paymentsCredits={(rawInv as any)?.payments || (viewingPdfInvoice.paymentStatus === 'Paid' ? [viewingPdfInvoice.invoiceAmount] : [])}
            technician={rawInv?.technician || 'Marcus Vance'}
            lineItems={rawInv?.lineItems?.map((li: any) => ({
              id: li.id,
              name: li.name || li.description || 'Service Item',
              description: li.description || '',
              quantity: li.quantity || 1,
              rate: li.unitPrice || li.rate || 0,
              unitPrice: li.unitPrice || li.rate || 0,
              amount: li.totalPrice || li.amount || 0,
              totalPrice: li.totalPrice || li.amount || 0,
              isTaxable: li.isTaxable || false,
            }))}
          />
        );
      })()}
    </div>
  );
}
