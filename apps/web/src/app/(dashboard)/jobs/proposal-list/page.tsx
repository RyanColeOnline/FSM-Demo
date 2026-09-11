'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  FilterBar, 
  PageHeader, 
} from '@/components/ui';
import { AdobePdfIcon, PdfDocumentViewerModal } from '@/components/modals/PdfDocumentViewerModal';
import { DocumentBuilderModal, DocumentBuilderData } from '@/components/modals/DocumentBuilderModal';
import { useProposals } from '@/hooks/useProposals';
import { CanonicalProposal, CanonicalProposalOption, normalizeToEasternDateString } from '@murphys/domain';

export type ProposalStatus = 'Open - Draft' | 'Presented' | 'Signed' | 'Voided' | 'Closed';

interface ProposalRecord {
  id: string;
  customerId: string;
  customerName: string;
  billToCustomer: string;
  proposalNumber: string;
  issueDate: string;
  lastModified: string;
  status: ProposalStatus;
  proposalAmount: string;
  jobNumber: string;
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

function parseDateToTimestamp(raw?: string | null): number {
  if (!raw) return 0;
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const [m, d, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  const t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}

export default function WexProposalListPage() {
  const { proposals: canonicalProposals = [], saveProposal, loading } = useProposals();
  const [displayStatusFilter, setDisplayStatusFilter] = useState('All Proposals');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingPdfProposal, setViewingPdfProposal] = useState<ProposalRecord | null>(null);
  const [editingProposalData, setEditingProposalData] = useState<DocumentBuilderData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Map canonical proposals to view records
  const proposals: ProposalRecord[] = React.useMemo(() => {
    return canonicalProposals.map((prop: any) => ({
      id: prop.id,
      customerId: prop.customerId || `cust-${prop.jobNumber || '1'}`,
      customerName: prop.customerName || prop.billToCustomer || 'Customer',
      billToCustomer: prop.billToCustomer || prop.customerName || 'Customer',
      proposalNumber: String(prop.proposalNumber || prop.id || '').replace(/^#P-/, ''),
      issueDate: formatSlashDate(prop.issueDate || prop.lastModified || (prop.updatedAt ? prop.updatedAt.slice(0, 10) : '2026-08-28')),
      lastModified: formatSlashDate(prop.lastModified || prop.issueDate || (prop.updatedAt ? prop.updatedAt.slice(0, 10) : '2026-08-28')),
      status: (prop.status === 'Draft' ? 'Open - Draft' : (prop.status as ProposalStatus)) || 'Open - Draft',
      proposalAmount: prop.amount !== undefined ? `$${Number(prop.amount).toFixed(2)}` : (prop.totalAmount ? `$${Number(prop.totalAmount).toFixed(2)}` : '$0.00'),
      jobNumber: String(prop.jobNumber || prop.jobId || '').replace(/^job-/, '') || '000000',
    }));
  }, [canonicalProposals]);

  const handleStatusChange = async (id: string, newStatus: ProposalStatus) => {
    const rawProp = canonicalProposals.find((p) => p.id === id);
    if (rawProp) {
      const canonicalStatus = (newStatus === 'Open - Draft' ? 'Draft' : newStatus) as any;
      await saveProposal({ ...rawProp, status: canonicalStatus, updatedAt: new Date().toISOString() });
    }
  };

  const handleOpenProposalForm = (prop: ProposalRecord) => {
    const rawProp = canonicalProposals.find((p) => p.id === prop.id);
    const firstOption = rawProp?.options?.[0];
    const lineItems = (firstOption as any)?.items?.map((item: any) => ({
      id: item.id,
      description: item.name,
      details: item.description,
      quantity: item.quantity,
      rate: item.unitPrice,
      amount: item.totalPrice,
    })) || (firstOption as any)?.lineItems?.map((item: any) => ({
      id: item.id,
      description: item.name,
      details: item.description,
      quantity: item.quantity,
      rate: item.unitPrice,
      amount: item.totalPrice,
    })) || [
      {
        id: 'item-1',
        description: 'Proposed Upgrade Package',
        details: 'High-efficiency condenser unit replacement with new copper lines and smart thermostat.',
        quantity: 1,
        rate: parseFloat(prop.proposalAmount.replace(/[^0-9.]/g, '')) || 8500.0,
        amount: parseFloat(prop.proposalAmount.replace(/[^0-9.]/g, '')) || 8500.0,
      }
    ];

    setEditingProposalData({
      id: prop.id,
      documentType: 'Proposal',
      documentNumber: prop.proposalNumber,
      customerId: prop.customerId,
      customerName: prop.customerName,
      billToCustomer: prop.billToCustomer,
      jobNumber: prop.jobNumber,
      issueDate: prop.lastModified,
      lastModified: prop.lastModified,
      status: prop.status,
      amount: prop.proposalAmount,
      lineItems,
    });
  };

  const handleSaveProposalForm = async (updatedData: DocumentBuilderData) => {
    const rawProp = canonicalProposals.find((p) => p.id === updatedData.id);
    const totalAmount = parseFloat(updatedData.amount.replace(/[^0-9.]/g, '')) || 8500.0;
    const optionItems: any[] = (updatedData.lineItems || []).map((li: any) => ({
      id: li.id,
      name: li.description,
      description: li.details || li.description,
      quantity: li.quantity,
      unitPrice: li.rate,
      totalPrice: li.amount,
    }));

    const optionA: CanonicalProposalOption = {
      id: 'opt-a',
      name: 'Proposed Option',
      summary: 'Custom proposed HVAC / Electrical upgrade solution',
      totalAmount,
      items: optionItems,
      isSelected: true,
    } as any;

    const canonical: CanonicalProposal = {
      id: updatedData.id,
      proposalNumber: updatedData.documentNumber.startsWith('#P-') ? updatedData.documentNumber : `#P-${updatedData.documentNumber}`,
      customerId: updatedData.customerId || 'cust-1',
      jobId: rawProp?.jobId || `job-${updatedData.jobNumber}`,
      jobNumber: parseInt(updatedData.jobNumber.replace(/[^0-9]/g, ''), 10) || null,
      status: (updatedData.status === 'Open - Draft' ? 'Draft' : updatedData.status) as any,
      issueDate: updatedData.issueDate || '2026-08-07',
      expirationDate: '2026-09-07',
      options: [optionA],
      selectedOptionId: 'opt-a',
      notes: updatedData.notes || null,
      billToCustomer: updatedData.billToCustomer,
      jobLocation: rawProp?.jobLocation || '1420 Lakeview Drive, Winter Park, FL 32789',
      technician: rawProp?.technician || 'Unassigned',
      createdAt: rawProp?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveProposal(canonical);
    setEditingProposalData(null);
  };

  const filteredAndSortedProposals = React.useMemo(() => {
    const list = proposals.filter((prop) => {
      const matchesSearch =
        prop.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.proposalNumber.includes(searchQuery) ||
        prop.jobNumber.includes(searchQuery) ||
        prop.billToCustomer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDisplay =
        displayStatusFilter === 'All Proposals' ||
        displayStatusFilter === prop.status;

      return matchesSearch && matchesDisplay;
    });

    list.sort((a, b) => {
      const tA = parseDateToTimestamp(a.lastModified);
      const tB = parseDateToTimestamp(b.lastModified);
      if (tB !== tA) return tB - tA;
      return (b.proposalNumber || '').localeCompare(a.proposalNumber || '');
    });

    return list;
  }, [proposals, searchQuery, displayStatusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, displayStatusFilter]);

  const totalProposals = filteredAndSortedProposals.length;
  const totalPages = Math.ceil(totalProposals / pageSize) || 1;
  const paginatedProposals = filteredAndSortedProposals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader title="Jobs Proposal List" />

      {/* 2. Filter Bar Container matching Invoice List */}
      <FilterBar>
        <div className="flex flex-wrap items-end justify-between gap-4 text-xs w-full">
          {/* Display Proposals Filter */}
          <div className="flex flex-col">
            <label className="text-[11px] font-medium text-slate-600 mb-1">
              Display Proposals
            </label>
            <select
              value={displayStatusFilter}
              onChange={(e) => setDisplayStatusFilter(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[180px]"
            >
              <option value="All Proposals">All Proposals</option>
              <option value="Open - Draft">Open - Draft</option>
              <option value="Presented">Presented</option>
              <option value="Signed">Signed</option>
              <option value="Voided">Voided</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Search Input without info icon and without sync support button */}
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

      {/* 3. Proposal List Table (No hover effects on rows) */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Bill To Customer</th>
                <th className="px-3 py-3">Proposal #</th>
                <th className="px-3 py-3">Issue Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Proposal Amount</th>
                <th className="px-3 py-3">Job #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {totalProposals === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    {loading ? 'Loading proposals...' : 'No proposals found matching the selected criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedProposals.map((prop) => {
                  const isClickable = prop.status === 'Open - Draft' || prop.status === 'Presented';

                  return (
                    <tr key={prop.id} className="bg-white">
                      {/* Customer (links to customer profile, no icons) */}
                      <td className="px-3 py-3.5 font-medium">
                        <Link
                          href={`/customers/${prop.customerId}`}
                          className="text-[#be4646] font-semibold hover:underline"
                        >
                          {prop.customerName}
                        </Link>
                      </td>

                      {/* Bill To Customer */}
                      <td className="px-3 py-3.5 text-slate-600">
                        {prop.billToCustomer}
                      </td>

                      {/* Proposal # and PDF icon */}
                      <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setViewingPdfProposal(prop)}
                            className="text-[#be4646] font-semibold hover:underline cursor-pointer text-left"
                            title="View PDF Document"
                          >
                            {prop.proposalNumber}
                          </button>

                          <button 
                            type="button" 
                            onClick={() => setViewingPdfProposal(prop)}
                            className="cursor-pointer text-[#be4646] hover:opacity-80 transition-opacity shrink-0" 
                            title="View PDF Document"
                          >
                            <AdobePdfIcon className="w-4 h-4 shadow-2xs rounded-xs" />
                          </button>
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                        {prop.issueDate}
                      </td>

                      {/* Status Dropdown (5 standard statuses) */}
                      <td className="px-3 py-3.5">
                        <select
                          value={prop.status}
                          onChange={(e) => handleStatusChange(prop.id, e.target.value as ProposalStatus)}
                          className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="Open - Draft">Open - Draft</option>
                          <option value="Presented">Presented</option>
                          <option value="Signed">Signed</option>
                          <option value="Voided">Voided</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>

                      {/* Proposal Amount */}
                      <td className="px-3 py-3.5 font-semibold text-slate-800">
                        {prop.proposalAmount}
                      </td>

                      {/* Job # (no icon next to Job #) */}
                      <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                        <Link
                          href={`/jobs/${prop.jobNumber}`}
                          className="text-[#be4646] font-semibold hover:underline"
                        >
                          {prop.jobNumber}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Bar (20 proposals per page) */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 ">
          <div>
            Showing <span className="font-semibold text-slate-800">{totalProposals === 0 ? 0 : Math.min(1 + (currentPage - 1) * pageSize, totalProposals)}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, totalProposals)}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalProposals.toLocaleString()}</span> proposals
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

      {/* Official Shared Proposal Modal Form */}
      {editingProposalData && (
        <DocumentBuilderModal
          isOpen={editingProposalData !== null}
          onClose={() => setEditingProposalData(null)}
          documentType="Proposal"
          initialData={editingProposalData}
          onSave={handleSaveProposalForm}
          onOpenPdfViewer={(data) => {
            setEditingProposalData(null);
            setViewingPdfProposal({
              id: data.id,
              customerId: data.customerId,
              customerName: data.customerName,
              billToCustomer: data.billToCustomer,
              proposalNumber: data.documentNumber,
              issueDate: data.issueDate || data.lastModified,
              lastModified: data.lastModified,
              status: data.status,
              proposalAmount: data.amount,
              jobNumber: data.jobNumber,
            });
          }}
        />
      )}

      {/* Official Shared PDF Viewer Modal */}
      {viewingPdfProposal && (() => {
        const rawProp = canonicalProposals.find(
          (p) => p.id === viewingPdfProposal.id || 
                 String(p.proposalNumber || '').replace(/^#?P-/, '') === String(viewingPdfProposal.proposalNumber).replace(/^#?P-/, '')
        );
        return (
          <PdfDocumentViewerModal
            isOpen={viewingPdfProposal !== null}
            onClose={() => setViewingPdfProposal(null)}
            documentType="Proposal"
            documentNumber={viewingPdfProposal.proposalNumber}
            customerName={viewingPdfProposal.customerName}
            billToCustomer={viewingPdfProposal.billToCustomer}
            jobLocation={rawProp?.jobLocation || (rawProp as any)?.locationAddress}
            issueDate={rawProp?.issueDate || viewingPdfProposal.lastModified}
            lastModified={viewingPdfProposal.lastModified}
            amount={viewingPdfProposal.proposalAmount}
            jobNumber={viewingPdfProposal.jobNumber}
            status={viewingPdfProposal.status}
            technician={rawProp?.technician || 'Alex Reynolds'}
          />
        );
      })()}
    </div>
  );
}
