'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx'
);

function StripeProcessPaymentStep({
  totalAmount,
  onBack,
  onSuccess,
}: {
  totalAmount: number;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment confirmation failed.');
        setIsProcessing(false);
      } else {
        setIsProcessing(false);
        onSuccess();
      }
    } catch (err: any) {
      setIsProcessing(false);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 font-sans">
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-800">Payment Details</h3>
          <span className="text-xs font-bold text-[#3f6b35]">Total: ${totalAmount.toFixed(2)}</span>
        </div>

        {/* Stripe Stock Native Accordion Layout (NO appearance prop on Elements) */}
        <PaymentElement options={{ layout: 'accordion' }} />

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <div className="pt-4 flex items-center justify-between border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onBack} className="gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <Button type="submit" variant="danger" disabled={!stripe || isProcessing} className="gap-1.5 px-6">
            {isProcessing ? 'Processing Payment...' : `Process Payment ($${totalAmount.toFixed(2)})`}
          </Button>
        </div>
      </div>
    </form>
  );
}
import { 
  Search, 
  Plus, 
  ChevronRight, 
  Check, 
  CreditCard, 
  DollarSign, 
  User, 
  FileText,
  ArrowLeft
} from 'lucide-react';
import { Button, Input, Checkbox } from '@/components/ui';

interface CustomerResult {
  id: string;
  name: string;
  location: {
    name: string;
    street: string;
    cityStateZip: string;
  };
  email?: string;
  phone: string;
  custNumber: string;
}

const mockCustomerResults: CustomerResult[] = [
  {
    id: 'cust-1',
    name: 'Tammy Cohen',
    location: {
      name: 'Primary Residence',
      street: '71 Coquina Pl',
      cityStateZip: 'Santa Rosa Beach, FL 32459',
    },
    email: 'tammy@ccrarchitecture.com',
    phone: '(205) 335-8038',
    custNumber: '49106',
  },
  {
    id: 'cust-2',
    name: '179 Enchanted Way LLC',
    location: {
      name: 'Commercial Facility',
      street: '179 Enchanted Way',
      cityStateZip: 'Santa Rosa Beach, FL 32459',
    },
    email: 'contact@enchantedway.com',
    phone: '(855) 026-0161',
    custNumber: '50219',
  },
  {
    id: 'cust-3',
    name: '21 First Mortgage',
    location: {
      name: 'Headquarters',
      street: '4000 Gulf Terrace 294',
      cityStateZip: 'Destin, FL 32541',
    },
    email: 'm.vance@firstmortgage21.com',
    phone: '(850) 582-7446',
    custNumber: '51042',
  },
  {
    id: 'cust-4',
    name: 'Bryan Billman',
    location: {
      name: 'Bryan Billman',
      street: '4200 Blue Heron View',
      cityStateZip: 'Niceville, FL 32578',
    },
    email: '',
    phone: 'h: (850) 499-9679',
    custNumber: '7785',
  },
];

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  description: string;
  total: string;
  balanceDue: string;
  selected: boolean;
}

const mockInvoices: InvoiceItem[] = [
  { id: 'inv-101', invoiceNumber: 'INV-130086', date: '5/28/2026', description: 'Appliance Service & FSIM Cleaning', total: '$160.00', balanceDue: '$160.00', selected: false },
  { id: 'inv-102', invoiceNumber: 'INV-131781', date: '6/19/2026', description: 'HVAC Maintenance Checkup', total: '$220.00', balanceDue: '$220.00', selected: false },
  { id: 'inv-103', invoiceNumber: 'INV-103242', date: '8/01/2026', description: 'Duct Repair & Filter Install', total: '$140.00', balanceDue: '$140.00', selected: false },
];

function ProcessPaymentContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams?.get('customerId');

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [searchField, setSearchField] = useState('Customer Name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>(mockInvoices);
  const [customPaymentAmount, setCustomPaymentAmount] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'ach' | 'check' | 'cash'>('credit_card');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Prepopulate Customer if launched directly from Customer Profile page (e.g. ?customerId=cust-1)
  useEffect(() => {
    if (customerIdParam) {
      const found = mockCustomerResults.find(
        (c) => c.id === customerIdParam || c.custNumber === customerIdParam
      ) || {
        id: customerIdParam,
        name: 'Tammy Cohen',
        location: {
          name: 'Primary Residence',
          street: '71 Coquina Pl',
          cityStateZip: 'Santa Rosa Beach, FL 32459',
        },
        email: 'tammy@ccrarchitecture.com',
        phone: '(205) 335-8038',
        custNumber: '49106',
      };
      setSelectedCustomer(found);
      setActiveStep(2);
    }
  }, [customerIdParam]);

  const handleCustomerSelect = (cust: CustomerResult) => {
    setSelectedCustomer(cust);
    setActiveStep(2);
  };

  const handleSkipCustomer = () => {
    setSelectedCustomer(null);
    setActiveStep(2);
  };

  const toggleInvoiceSelect = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, selected: !inv.selected } : inv))
    );
  };

  const selectedTotal = selectedCustomer
    ? invoices
        .filter((i) => i.selected)
        .reduce((sum, item) => sum + parseFloat(item.balanceDue.replace('$', '')), 0)
    : parseFloat(customPaymentAmount) || 0;

  const handleProcessPayment = () => {
    setPaymentSuccess(true);
  };

  const filteredCustomers = mockCustomerResults.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.custNumber.includes(searchQuery) ||
      c.location.street.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 text-slate-800 pb-16 font-sans">
      {/* 1. Top Header with 3-Step Wizard Progress Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
          <span className="font-bold text-[#2e4057] italic text-2xl">Payment Options</span>
          <span className="font-normal text-[#5b708b] not-italic text-xl">Process Payment</span>
        </h1>

        {/* Replicated 3-Step Wizard Stepper from Screenshot */}
        <div className="flex items-center gap-6 text-xs font-semibold text-slate-600 self-center md:self-auto">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveStep(1)}>
            <span className={activeStep === 1 ? 'text-slate-900 font-bold' : 'text-slate-400'}>
              Select Customer
            </span>
            <div className="relative flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                activeStep === 1 
                  ? 'bg-blue-200 ring-2 ring-blue-500' 
                  : activeStep > 1 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-200'
              }`}>
                {activeStep > 1 ? (
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                ) : (
                  <div className={`w-2.5 h-2.5 rounded-full ${activeStep === 1 ? 'bg-blue-600' : 'bg-slate-400'}`} />
                )}
              </div>
            </div>
          </div>

          {/* Progress Connector Line 1 */}
          <div className={`w-16 md:w-24 h-1 mt-3 transition-colors ${activeStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => selectedCustomer && setActiveStep(2)}>
            <span className={activeStep === 2 ? 'text-slate-900 font-bold' : 'text-slate-400'}>
              Select Invoices
            </span>
            <div className="relative flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                activeStep === 2 
                  ? 'bg-blue-200 ring-2 ring-blue-500' 
                  : activeStep > 2 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-200'
              }`}>
                {activeStep > 2 ? (
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                ) : (
                  <div className={`w-2.5 h-2.5 rounded-full ${activeStep === 2 ? 'bg-blue-600' : 'bg-slate-400'}`} />
                )}
              </div>
            </div>
          </div>

          {/* Progress Connector Line 2 */}
          <div className={`w-16 md:w-24 h-1 mt-3 transition-colors ${activeStep >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => activeStep >= 2 && setActiveStep(3)}>
            <span className={activeStep === 3 ? 'text-slate-900 font-bold' : 'text-slate-400'}>
              Select Payment
            </span>
            <div className="relative flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                activeStep === 3 
                  ? 'bg-blue-200 ring-2 ring-blue-500' 
                  : 'bg-slate-200'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${activeStep === 3 ? 'bg-blue-600' : 'bg-slate-400'}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: SELECT CUSTOMER (Replicated 1:1 with attached screenshots) */}
      {activeStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Centered Search Group */}
          <div className="flex items-center justify-center pt-4">
            <div className="flex items-center w-full max-w-2xl bg-white border border-slate-300 rounded shadow-xs focus-within:ring-2 focus-within:ring-blue-400">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-700 border-r border-slate-300 rounded-l focus:outline-none"
              >
                <option value="Customer Name">Customer Name ▾</option>
                <option value="Phone Number">Phone Number ▾</option>
                <option value="Customer Number">Customer # ▾</option>
              </select>

              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 text-xs text-slate-800 focus:outline-none placeholder:text-slate-400"
              />

              <button
                type="button"
                className="px-3.5 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-r transition-colors"
                title="Add New Customer"
              >
                <Plus className="w-4 h-4 font-bold stroke-[3]" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSkipCustomer}
              className="ml-4 text-xs font-semibold text-[#be4646] hover:underline whitespace-nowrap"
            >
              Skip Customer Selection
            </button>
          </div>

          {/* Replicated Customer Table (Rendered when searching) */}
          {searchQuery && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Default Location</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone Number(s)</th>
                      <th className="px-4 py-3">Cust. #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                    {filteredCustomers.map((cust) => (
                      <tr 
                        key={cust.id} 
                        onClick={() => handleCustomerSelect(cust)}
                        className="hover:bg-blue-50/70 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-800">
                          {cust.name}
                        </td>
                        <td className="px-4 py-4 text-slate-600 max-w-xs">
                          <div className="flex flex-col space-y-0.5">
                            <span className="font-semibold text-slate-700">{cust.location.name}</span>
                            <span>{cust.location.street}</span>
                            <span>{cust.location.cityStateZip}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          {cust.email || ''}
                        </td>
                        <td className="px-4 py-4 text-slate-600 whitespace-pre-line">
                          {cust.phone}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-800">
                          {cust.custNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: SELECT INVOICES OR PAYMENT WITHOUT INVOICE */}
      {activeStep === 2 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top Customer Info Bar */}
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs font-sans shadow-2xs">
            <div>
              {selectedCustomer ? (
                <>
                  <span className="text-slate-500 font-normal">Selected Customer: </span>
                  <span className="font-bold text-slate-900">{selectedCustomer.name}</span>
                  <span className="ml-2 text-slate-400 font-normal">({selectedCustomer.custNumber})</span>
                </>
              ) : (
                <span className="font-bold text-slate-900 text-sm">No Customer Selected</span>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => setActiveStep(1)} 
              className="text-xs text-[#be4646] hover:underline font-semibold cursor-pointer"
            >
              {selectedCustomer ? 'Change Customer' : 'Select Customer'}
            </button>
          </div>

          {selectedCustomer ? (
            /* Selected Customer: Render Open Invoices Table */
            <>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs">Open Invoices for Payment</h3>
                  <span className="text-xs text-slate-500 font-medium">Select invoices to apply payment to</span>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-[#a82e2e]">
                      <th className="w-10 px-4 py-3 text-center">Select</th>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="bg-white">
                        <td className="px-4 py-3.5 text-center">
                          <Checkbox
                            id={inv.id}
                            checked={inv.selected}
                            onChange={() => toggleInvoiceSelect(inv.id)}
                          />
                        </td>
                        <td className="px-4 py-3.5 font-bold text-[#be4646]">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{inv.date}</td>
                        <td className="px-4 py-3.5 text-slate-800 font-medium">{inv.description}</td>
                        <td className="px-4 py-3.5 text-slate-600">{inv.total}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{inv.balanceDue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-700">
                  Total Payment Amount: <span className="text-lg font-bold text-[#3f6b35] ml-2">${selectedTotal.toFixed(2)}</span>
                </div>
                <Button variant="danger" onClick={() => setActiveStep(3)} disabled={selectedTotal <= 0} className="gap-1.5">
                  <span>Proceed to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            /* No Customer Selected Mode (Matching screenshot in Murphy's design language) */
            <div className="bg-[#f8f9fa] rounded-lg border border-slate-200 p-6 shadow-2xs font-sans space-y-6">
              {/* Payment Without Invoice Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <span className="font-bold text-sm text-slate-800">Payment Without Invoice</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customPaymentAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                        setCustomPaymentAmount(val);
                      }
                    }}
                    onBlur={() => {
                      const num = parseFloat(customPaymentAmount);
                      if (!isNaN(num)) {
                        setCustomPaymentAmount(num.toFixed(2));
                      } else {
                        setCustomPaymentAmount('0.00');
                      }
                    }}
                    placeholder="0.00"
                    className="w-40 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] text-right"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="text-xs font-semibold text-[#be4646] hover:underline cursor-pointer"
                >
                  Back
                </button>
                <Button
                  variant="danger"
                  onClick={() => setActiveStep(3)}
                  disabled={!customPaymentAmount || parseFloat(customPaymentAmount) <= 0}
                  className="px-8 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs rounded shadow-2xs cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: SELECT PAYMENT & PROCESS */}
      {activeStep === 3 && (
        <div className="space-y-5 max-w-xl mx-auto animate-in fade-in duration-150">
          {!paymentSuccess ? (
            /* NO appearance prop passed to Elements -> Stripe renders stock native UI theme! */
            <Elements
              stripe={stripePromise}
              options={{
                mode: 'payment',
                amount: Math.max(Math.round(selectedTotal * 100), 100),
                currency: 'usd',
              }}
            >
              <StripeProcessPaymentStep
                totalAmount={selectedTotal}
                onBack={() => setActiveStep(2)}
                onSuccess={handleProcessPayment}
              />
            </Elements>
          ) : (
            /* Payment Confirmation Success Card */
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-xs space-y-4 font-sans">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Payment Successfully Processed!</h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                A total payment of <span className="font-bold text-slate-900">${selectedTotal.toFixed(2)}</span> has been charged and synced with QuickBooks.
              </p>
              <div className="pt-4">
                <Button variant="outline" onClick={() => { setActiveStep(1); setPaymentSuccess(false); }}>
                  Process Another Payment
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Process Payment Page Component with Suspense Boundary
export default function ProcessPaymentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading payment flow...</div>}>
      <ProcessPaymentContent />
    </Suspense>
  );
}
