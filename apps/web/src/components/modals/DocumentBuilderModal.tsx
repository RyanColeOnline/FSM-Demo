'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  Save, 
  DollarSign, 
  Calendar, 
  User, 
  Briefcase 
} from 'lucide-react';

export interface DocumentLineItem {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface DocumentBuilderData {
  id: string;
  documentType: 'Invoice' | 'Proposal';
  documentNumber: string;
  customerId: string;
  customerName: string;
  billToCustomer: string;
  jobNumber: string;
  issueDate: string;
  lastModified: string;
  status: 'Open - Draft' | 'Presented' | 'Signed' | 'Voided' | 'Closed';
  amount: string;
  notes?: string;
  lineItems?: DocumentLineItem[];
}

export interface DocumentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'Invoice' | 'Proposal';
  initialData: DocumentBuilderData | null;
  onSave?: (updatedData: DocumentBuilderData) => void;
  onOpenPdfViewer?: (data: DocumentBuilderData) => void;
}

export function DocumentBuilderModal({
  isOpen,
  onClose,
  documentType,
  initialData,
  onSave,
  onOpenPdfViewer,
}: DocumentBuilderModalProps) {
  const [formData, setFormData] = useState<DocumentBuilderData | null>(null);
  const [lineItems, setLineItems] = useState<DocumentLineItem[]>([
    {
      id: 'item-1',
      description: documentType === 'Invoice' ? 'HVAC System Service & Inspection' : 'Proposed System Upgrade / PM Agreement',
      details: 'Complete diagnostic testing, electrical check, airflow optimization, filter replacement, and multi-point safety inspection.',
      quantity: 1,
      rate: 270.0,
      amount: 270.0,
    },
  ]);
  const [terms, setTerms] = useState('Net 30 Days');
  const [customerNotes, setCustomerNotes] = useState(
    'Work performed and guaranteed under Apex Field Solutions certified warranty standards.'
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      const rawAmt = typeof initialData.amount === 'number' ? initialData.amount : parseFloat(String(initialData.amount || '').replace(/[^0-9.]/g, ''));
      const parsedAmount = isNaN(rawAmt) ? 270.0 : rawAmt;
      setLineItems(
        initialData.lineItems && initialData.lineItems.length > 0
          ? initialData.lineItems.map((it: any, idx: number) => {
              const q = typeof it.quantity === 'number' ? it.quantity : (parseFloat(it.quantity) || 1);
              const r = typeof it.rate === 'number' ? it.rate : (parseFloat(it.rate || it.unitPrice) || parsedAmount);
              const a = typeof it.amount === 'number' ? it.amount : (parseFloat(it.amount || it.total) || (q * r));
              return {
                id: it.id || `item-${idx + 1}`,
                description: it.description || it.name || (documentType === 'Invoice' ? 'HVAC System Service & Inspection' : 'Proposed System Upgrade / PM Agreement'),
                details: it.details || it.detail || '',
                quantity: q,
                rate: r,
                amount: a,
              };
            })
          : [
              {
                id: 'item-1',
                description:
                  documentType === 'Invoice'
                    ? 'HVAC System Service & Inspection'
                    : 'Proposed System Upgrade / PM Agreement',
                details: 'Complete diagnostic testing, electrical check, airflow optimization, and filter replacement.',
                quantity: 1,
                rate: parsedAmount,
                amount: parsedAmount,
              },
            ]
      );
    }
  }, [initialData, documentType, isOpen]);

  if (!isOpen || !formData) return null;

  const handleUpdateItem = (id: string, field: 'description' | 'details' | 'quantity' | 'rate', value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          const q = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
          const r = field === 'rate' ? parseFloat(value) || 0 : item.rate;
          updated.amount = q * r;
        }
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    const newItem: DocumentLineItem = {
      id: `item-${Date.now()}`,
      description: 'Additional Service / Material',
      details: '',
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = lineItems.reduce((acc, item) => {
    const val = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || '0')) || ((item.quantity || 1) * (item.rate || 0));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  const tax = 0.0;
  const total = subtotal + tax;

  const handleSave = () => {
    const updated: DocumentBuilderData = {
      ...formData,
      amount: `$${total.toFixed(2)}`,
      lastModified: '8/15/2026',
      notes: customerNotes,
      lineItems,
    };
    if (onSave) {
      onSave(updated);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-[#a82e2e]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {documentType === 'Invoice' ? 'Invoice Form' : 'Proposal Form'} #{formData.documentNumber}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  {formData.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Official {documentType} builder for Job #{formData.jobNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Primary Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            {/* Customer */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Customer
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#be4646]"
              />
            </div>

            {/* Bill To Customer */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Bill To Customer
              </label>
              <input
                type="text"
                value={formData.billToCustomer}
                onChange={(e) => setFormData({ ...formData, billToCustomer: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#be4646]"
              />
            </div>

            {/* Job Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                Job #
              </label>
              <input
                type="text"
                value={formData.jobNumber}
                onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#be4646]"
              />
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Issue Date
              </label>
              <input
                type="text"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#be4646]"
              />
            </div>

            {/* Status Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">
                {documentType} Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#be4646] cursor-pointer"
              >
                <option value="Open - Draft">Open - Draft</option>
                <option value="Presented">Presented</option>
                <option value="Signed">Signed</option>
                <option value="Voided">Voided</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Payment Terms */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">
                Payment Terms
              </label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#be4646] cursor-pointer"
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Due Upon Receipt">Due Upon Receipt</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Line Items & Services
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#be4646] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Item & Description</th>
                    <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-28 text-right">Rate ($)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Amount ($)</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lineItems.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2.5 px-4 space-y-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#be4646]"
                        />
                        <input
                          type="text"
                          value={item.details || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'details', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#be4646]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center align-top">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                          className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-center font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#be4646]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right align-top">
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(item.id, 'rate', e.target.value)}
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-right font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#be4646]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 align-top pt-3.5">
                        ${(typeof item.amount === 'number' ? item.amount : (parseFloat(String(item.amount || '0')) || ((item.quantity || 1) * (item.rate || 0)))).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center align-top pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={lineItems.length <= 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed p-1 cursor-pointer transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Summary Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Notes Textarea */}
            <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <label className="text-[11px] font-semibold text-slate-700">
                Customer Notes / Scope of Work
              </label>
              <textarea
                rows={4}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#be4646]"
              />
            </div>

            {/* Totals Breakdown */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Sales Tax (0.00%)</span>
                <span>$0.00</span>
              </div>
              <div className="border-t-2 border-slate-200 pt-2 flex items-center justify-between font-bold text-sm text-slate-900">
                <span>Total {documentType} Amount</span>
                <span className="text-[#a82e2e] text-base">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {onOpenPdfViewer && (
              <button
                type="button"
                onClick={() => {
                  const updated: DocumentBuilderData = {
                    ...formData,
                    amount: `$${total.toFixed(2)}`,
                    lastModified: '8/15/2026',
                    notes: customerNotes,
                    lineItems,
                  };
                  onOpenPdfViewer(updated);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#be4646]" />
                <span>Preview PDF Document</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
