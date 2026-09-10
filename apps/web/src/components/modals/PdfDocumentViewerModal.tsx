'use client';

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut,
  CheckSquare
} from 'lucide-react';

export function AdobePdfIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Adobe Acrobat PDF">
      <title>Adobe Acrobat PDF</title>
      <rect width="24" height="24" rx="4" fill="#ED2224" />
      <path
        d="M19.2 14.8c-.5-1.4-1.9-2.3-3.6-2.5-.7-.1-1.4 0-2 .1-.5-.7-1-1.6-1.5-2.7.3-1.1.5-2.3.4-3.3 0-.8-.3-1.4-.9-1.4-.4 0-.7.3-.8.7-.3 1.1-.1 2.5.6 4.3-.6 1.4-1.3 2.8-2.2 4.1-1.3.6-2.8 1.4-3.5 2.3-.6.8-.7 1.6-.3 2.1.3.4.8.6 1.4.6 1.5 0 3.3-1.7 4.5-4.2 1.3-.4 2.7-.7 4.1-.8 1.3 1 2.5 1.5 3.4 1.5.7 0 1.2-.3 1.4-.8.3-.5.1-1.1-.4-1.7zm-13.4 3c-.3-.3-.1-.9.4-1.5.5-.6 1.4-1.2 2.3-1.7-.9 2-1.9 3-2.7 3.2zm6.2-10.2c.2 0 .3.3.3.6 0 .7-.2 1.6-.4 2.4-.4-1.2-.5-2.1-.3-2.8.1-.1.2-.2.4-.2zm-2.4 8.7c.6-.9 1.1-1.9 1.5-2.9 1.1 0 2.2-.1 3.2-.2-1.1.7-2.1 1.6-3 2.8-.6.2-1.1.3-1.7.3zm7.6 1.2c-.4 0-1-.3-1.8-.9 1.1.1 2 .4 2.3.7.1.1.1.2 0 .3-.1-.1-.3-.1-.5-.1z"
        fill="white"
      />
    </svg>
  );
}

export interface PdfDocumentLineItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  rate?: number;
  unitPrice?: number;
  amount?: number;
  totalPrice?: number;
  isTaxable?: boolean;
}

export interface PdfDocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType?: 'Invoice' | 'Proposal' | 'Statement' | string;
  documentNumber?: string;
  filename?: string;
  pdfUrl?: string;
  customerName?: string;
  billToCustomer?: string;
  billingAddress?: string;
  jobLocation?: string;
  issueDate?: string;
  dueDate?: string;
  lastModified?: string;
  amount?: string;
  subtotal?: number | string;
  tax?: number | string;
  total?: number | string;
  balanceDue?: number | string;
  jobNumber?: string;
  jobName?: string;
  status?: string;
  paymentStatus?: string;
  paymentTerms?: string;
  paymentsCredits?: string | string[];
  technician?: string;
  customerContact?: { phone?: string; email?: string };
  lineItems?: PdfDocumentLineItem[];
}

export function PdfDocumentViewerModal({
  isOpen,
  onClose,
  documentType = 'Invoice',
  documentNumber = '',
  filename,
  pdfUrl,
  customerName = "Apex Field Solutions Customer",
  billToCustomer = 'Customer Account',
  billingAddress,
  jobLocation,
  issueDate = '8/09/2026',
  dueDate,
  amount = '$0.00',
  subtotal,
  tax,
  total,
  balanceDue,
  jobNumber = '000000',
  jobName,
  status = 'Ready',
  paymentStatus = 'Unpaid',
  paymentTerms = 'Due upon Receipt',
  paymentsCredits,
  technician = 'Minor Cover',
  customerContact,
  lineItems = [],
}: PdfDocumentViewerModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!isOpen) return null;

  const displayFilename = filename || (documentNumber ? `${documentType}_${documentNumber}.pdf` : `${documentType}.pdf`);
  const isPaid = (paymentStatus || '').toLowerCase() === 'paid' || status === 'Closed';

  const formatCurrency = (val?: number | string) => {
    if (val === undefined || val === null || val === '') return '$0.00';
    if (typeof val === 'string') {
      if (val.startsWith('$')) return val;
      const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
    }
    return `$${val.toFixed(2)}`;
  };

  const computedSubtotal = subtotal !== undefined ? formatCurrency(subtotal) : amount;
  const computedTax = tax !== undefined ? formatCurrency(tax) : '$0.00';
  const computedTotal = total !== undefined ? formatCurrency(total) : amount;
  const computedBalance = balanceDue !== undefined ? formatCurrency(balanceDue) : (isPaid ? '$0.00' : amount);

  // Parse payments list
  const paymentsList: string[] = Array.isArray(paymentsCredits) 
    ? paymentsCredits 
    : (typeof paymentsCredits === 'string' && paymentsCredits ? [paymentsCredits] : []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
      return;
    }
    const textContent = `${documentType} ${documentNumber}\nCustomer: ${customerName}\nJob: #${jobNumber}\nAmount: ${amount}\nDate: ${issueDate}\nStatus: ${status}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = displayFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#323639] rounded-xl shadow-2xl border border-slate-700 w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
        {/* Native Style PDF Viewer Top Header */}
        <div className="bg-[#323639] px-4 py-2.5 border-b border-slate-700 flex items-center justify-between text-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <AdobePdfIcon className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-xs text-slate-100 truncate">
              {displayFilename}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {isPaid ? 'Paid' : 'Unpaid'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
                className="p-1 hover:text-white rounded hover:bg-slate-700 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] w-10 text-center">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(140, prev + 10))}
                className="p-1 hover:text-white rounded hover:bg-slate-700 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print & Download */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 hover:text-white rounded hover:bg-slate-700 cursor-pointer transition-colors"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 hover:text-white rounded hover:bg-slate-700 cursor-pointer transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:text-white rounded hover:bg-slate-700 cursor-pointer transition-colors ml-1 text-slate-400"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable PDF Document Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#525659] p-4 sm:p-8 flex justify-center items-start">
          {pdfUrl ? (
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="transition-transform duration-100 w-full max-w-[750px] min-h-[850px] flex flex-col"
            >
              <iframe
                src={pdfUrl}
                className="w-full flex-1 min-h-[850px] bg-white rounded shadow-2xl border-0"
                title={displayFilename}
              />
            </div>
          ) : (
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="transition-transform duration-100 bg-white text-slate-900 shadow-2xl rounded-sm w-full max-w-[750px] p-8 sm:p-12 font-sans space-y-7 my-2"
            >
              {/* Header: Company Logo & Details (Left) + Document Meta (Right) */}
              <div className="flex items-start justify-between border-b-2 border-slate-200 pb-6">
                {/* Left: Logo & Murphy's Address */}
                <div className="max-w-[50%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/logo.png" 
                    alt="Apex Field Solutions" 
                    className="h-14 w-auto object-contain mb-3"
                  />
                  <div className="text-[11px] text-slate-600 space-y-0.5 font-normal">
                    <p className="font-semibold text-slate-900">Apex Field Solutions LLC</p>
                    <p>100 Innovation Parkway, Suite 400</p>
                    <p>Orlando, FL 32801</p>
                    <p className="pt-1">Phone: (800) 555-2739</p>
                    <p>support@apexfieldsolutions.com</p>
                    <p>FL State Lic: CAC1813900</p>
                  </div>
                </div>

                {/* Right: Document Title, Status, and Meta Box */}
                <div className="text-right space-y-2">
                  <div className="flex items-center justify-end gap-2.5">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                      {documentType}
                    </h1>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-left text-xs bg-slate-50 p-3 rounded border border-slate-200 min-w-[280px]">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Invoice #</span>
                      <span className="font-bold text-slate-900">{documentNumber ? (documentNumber.startsWith('I-') ? documentNumber : `I-${documentNumber}`) : 'I-134802-1'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Job #</span>
                      <span className="font-semibold text-slate-800">{jobNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Issue Date</span>
                      <span className="font-medium text-slate-700">{issueDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Due Date</span>
                      <span className="font-medium text-slate-700">{dueDate || issueDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Technician</span>
                      <span className="font-medium text-slate-700">{technician || 'Minor Cover'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Payment Terms</span>
                      <span className="font-medium text-slate-700">{paymentTerms || 'Due upon Receipt'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid: Presented to (Bill To) & Service Location */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">
                    Presented to:
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{customerName}</p>
                  <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">
                    {billingAddress || 'Destin, FL 32541'}
                  </p>
                  {customerContact?.phone && (
                    <p className="text-slate-500 text-[11px] mt-1.5">M: {customerContact.phone}</p>
                  )}
                  {customerContact?.email && (
                    <p className="text-slate-500 text-[11px]">E: {customerContact.email}</p>
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">
                    Service Location:
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{billToCustomer || customerName}</p>
                  <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">
                    {jobLocation || billingAddress || 'Destin, FL 32541'}
                  </p>
                  {jobName && (
                    <p className="text-slate-500 text-[11px] mt-1.5 font-medium">Job: {jobName}</p>
                  )}
                </div>
              </div>

              {/* Dynamic Line Items Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 pl-2">Description</th>
                      <th className="py-2.5 text-center w-16">Qty</th>
                      <th className="py-2.5 text-right pr-2 w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {lineItems.length > 0 ? (
                      lineItems.map((item, idx) => {
                        const itemQty = item.quantity !== undefined ? item.quantity : 1;
                        const itemAmt = item.totalPrice !== undefined ? item.totalPrice : (item.amount !== undefined ? item.amount : 0);
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50">
                            <td className="py-3 pl-2 pr-4 align-top">
                              {/* Pricebook Item Name in bold */}
                              <p className="font-bold text-slate-900 text-xs">
                                {item.name}
                              </p>
                              {/* Item Description in subtext */}
                              {item.description && item.description.trim() !== '' && (
                                <p className="text-[11px] text-slate-600 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3 text-center align-top font-medium text-slate-800">
                              {itemQty}
                            </td>
                            <td className="py-3 text-right pr-2 align-top font-bold text-slate-900">
                              ${itemAmt.toFixed(2)}
                              {item.isTaxable && (
                                <span className="ml-1 text-[10px] text-slate-400 font-normal">T</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-3 pl-2 pr-4 align-top">
                          <p className="font-bold text-slate-900 text-xs">
                            {documentType === 'Invoice' 
                              ? 'HVAC / Appliance Service & Inspection' 
                              : documentType === 'Proposal' 
                              ? 'Proposed System Upgrade / PM Agreement'
                              : 'Merchant Card Processing & Payouts'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Standard diagnostic testing, electrical check, airflow optimization, and filter replacement.
                          </p>
                        </td>
                        <td className="py-3 text-center align-top font-medium">1</td>
                        <td className="py-3 text-right pr-2 font-bold text-slate-900 align-top">{amount}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payments Section */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-2 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-800">{computedSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes</span>
                    <span className="font-medium text-slate-800">{computedTax}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                    <span>Total</span>
                    <span>{computedTotal}</span>
                  </div>

                  {/* Payments / Credits block */}
                  {paymentsList.length > 0 ? (
                    <div className="border-t border-slate-200 pt-2 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Payments / Credits
                      </span>
                      {paymentsList.map((pmt, pIdx) => (
                        <div key={pIdx} className="flex justify-between text-[11px] text-emerald-700 font-medium">
                          <span className="truncate pr-2">{pmt}</span>
                        </div>
                      ))}
                    </div>
                  ) : isPaid ? (
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-[11px] text-emerald-700 font-medium">
                      <span>Paid in Full</span>
                      <span>({computedTotal})</span>
                    </div>
                  ) : null}

                  <div className="border-t-2 border-slate-300 pt-2 flex justify-between font-black text-sm text-slate-900">
                    <span>Remaining Balance</span>
                    <span className={isPaid ? 'text-emerald-700' : 'text-[#a82e2e]'}>
                      {computedBalance}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Approval & Footer Terms */}
              <div className="border-t border-slate-200 pt-6 space-y-4 text-[10px] text-slate-500">
                {/* Customer Approval */}
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-700 font-medium">
                      I agree to the terms and conditions of this invoice, and that the goods and or services referenced have been provided to my satisfaction.
                    </p>
                  </div>
                  {isPaid && (
                    <p className="text-[10px] text-slate-500 pl-5">
                      Signature Date/Time: {issueDate} 12:00PM, CDT • Reconciled
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-end pt-2 text-[10px] text-slate-400">
                  <div>
                    <p className="font-semibold text-slate-600">Apex Field Solutions LLC</p>
                    <p>Lic #CAC1813900 • 100 Innovation Parkway, Suite 400, Orlando, FL 32801</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-600">Generated: {issueDate}</p>
                    <p>Page 1 of 1</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
