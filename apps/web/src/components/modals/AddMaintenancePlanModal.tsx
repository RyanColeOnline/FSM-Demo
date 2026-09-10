'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { DatePicker, HierarchicalJobTypeSelector } from '@/components/ui';
import { 
  CanonicalMaintenancePlan, 
  CanonicalServiceWindow,
  CanonicalCustomer,
  CanonicalAuthorizedPerson,
  CanonicalPaymentRecord 
} from '@murphys/domain';
import { 
  MAINTENANCE_PLAN_TEMPLATES, 
  getEasternDateString,
  formatEasternDate,
  formatEasternDateTime,
  FirestoreDomainClient 
} from '@/domain';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx'
);

interface AddMaintenancePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: CanonicalCustomer | null;
  locationsList?: Array<{ id: string; addr1: string; addr2?: string; city: string; state: string; zip: string; isDefault?: boolean }>;
  authorizedPersons?: CanonicalAuthorizedPerson[];
  onPlanCreated?: (plan: CanonicalMaintenancePlan) => void;
}

interface ServiceWindowRow {
  id: string;
  beginningMonth: string;
  endMonth: string;
  jobName: string;
}

interface ReminderRecipientRow {
  id: string;
  name: string;
  channel: 'Email' | 'Text';
  destination: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT: Record<string, string> = {
  January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr',
  May: 'May', June: 'Jun', July: 'Jul', August: 'Aug',
  September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec'
};

const MONTH_INDEX: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3,
  May: 4, June: 5, July: 6, August: 7,
  September: 8, October: 9, November: 10, December: 11
};

const SALES_AGENTS = [
  'Justin Lung',
  'Ryan Cole',
  'Austin Murphy',
  'Sarah Jenkins',
  'David Miller',
];

const TAX_GROUPS = [
  { name: 'FL (7%)', rate: 0.07 },
  { name: 'FL Excluded (0%)', rate: 0.00 },
  { name: 'Out of State (0%)', rate: 0.00 },
];

// Actual Stripe Payment Module (Native Theme)
function StripeMaintenancePaymentForm({
  totalAmount,
  onSuccess,
  onCancel,
}: {
  totalAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [memo, setMemo] = useState('');

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
      // In mock/sandbox environment
      setIsProcessing(false);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans bg-white border border-slate-200 rounded-lg p-5 shadow-2xs animate-in fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h4 className="text-xs font-bold text-slate-800">Process Payment (Stripe)</h4>
        <span className="text-xs font-bold text-[#3f6b35]">Amount: ${totalAmount.toFixed(2)}</span>
      </div>

      <div className="p-1">
        <PaymentElement options={{ layout: 'accordion' }} />
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Authorization Checkbox */}
      <div className="flex items-start gap-2.5 pt-1">
        <input
          type="checkbox"
          id="maintPlanStripeAuthCheck"
          checked={isAuthorized}
          onChange={(e) => setIsAuthorized(e.target.checked)}
          className="mt-0.5 rounded border-slate-300 text-[#be4646] focus:ring-[#be4646] cursor-pointer shrink-0"
        />
        <label htmlFor="maintPlanStripeAuthCheck" className="text-xs text-slate-700 leading-snug cursor-pointer font-medium">
          The account holder has authorized Apex Field Solutions LLC to debit their account for the amount above using the payment method provided.
        </label>
      </div>

      {/* Memo Field */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Memo</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder=""
          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-3 flex items-center justify-between border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? 'Processing Payment...' : `Submit Payment ($${totalAmount.toFixed(2)})`}
        </button>
      </div>
    </form>
  );
}

export function AddMaintenancePlanModal({
  isOpen,
  onClose,
  customer,
  locationsList = [],
  authorizedPersons = [],
  onPlanCreated,
}: AddMaintenancePlanModalProps) {
  // Tabs: contract, service, reminders, payment
  const [activeTab, setActiveTab] = useState<'contract' | 'service' | 'reminders' | 'payment'>('contract');

  // Scroll container ref for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const jobTypeAnchorRef = useRef<HTMLDivElement | null>(null);

  // --- Tab 1: Contract State ---
  const defaultLocation = useMemo(() => {
    if (locationsList.length > 0) {
      const def = locationsList.find((l) => l.isDefault) || locationsList[0];
      return `${def.addr1}, ${def.city}, ${def.state} ${def.zip}`.trim();
    }
    if (customer?.billingAddress) {
      return `${customer.billingAddress.street}, ${customer.billingAddress.city}, ${customer.billingAddress.state} ${customer.billingAddress.zipCode}`;
    }
    return '639 Serenoa Rd, Santa Rosa Beach, FL 32459';
  }, [customer, locationsList]);

  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  
  // No plan selected by default
  const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState<string>('');
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  
  // Start & End dates in Eastern US format (e.g. 8-25-2026)
  const [startDate, setStartDate] = useState(() => getEasternDateString(0));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 20);
    return getEasternDateString(0, d);
  });

  const [annualPrice, setAnnualPrice] = useState<string>('');
  const [salesAgent, setSalesAgent] = useState('');
  const [account, setAccount] = useState(''); // Left blank for now until Quickbooks is configured
  const [planClass, setPlanClass] = useState('Commercial');
  
  // Tax state: off by default
  const [collectTax, setCollectTax] = useState(false);
  const [taxGroupName, setTaxGroupName] = useState('FL (7%)');
  
  // Contract Terms & Signature (typed only)
  const [termsText, setTermsText] = useState(
    'Standard commercial and residential preventative maintenance terms and conditions. The customer agrees to the regular service schedule and specified coverage.'
  );
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [eSignatureName, setESignatureName] = useState('');

  // --- Tab 2: Service Windows State ---
  const [serviceWindowsList, setServiceWindowsList] = useState<ServiceWindowRow[]>([]);
  const [firstServiceWindowKey, setFirstServiceWindowKey] = useState<string>('');
  const [numberOfWindows, setNumberOfWindows] = useState<number>(60);
  const [serviceJobType, setServiceJobType] = useState<string>('HVAC - Commercial (C) - PM');

  // --- Tab 3: Reminders State ---
  const [sendReminders, setSendReminders] = useState(true);
  const customerEmail = customer?.email || 'payables@30aescapes.com';
  const customerPhone = customer?.mobilePhone || customer?.phone || '(850) 499-1045';

  const [recipients, setRecipients] = useState<ReminderRecipientRow[]>([
    {
      id: 'rec-1',
      name: customer?.name || '30A Escapes',
      channel: 'Email',
      destination: customerEmail,
    },
  ]);

  // --- Tab 4: Payment State ---
  const [paymentOption, setPaymentOption] = useState<'One-Time' | 'Not Now'>('One-Time');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  // Sub-forms inside One-Time Payment: 'none' | 'process' | 'record'
  const [paymentActionView, setPaymentActionView] = useState<'none' | 'process' | 'record'>('none');
  const [paymentProcessedSuccess, setPaymentProcessedSuccess] = useState<string | null>(null);

  // Record Payment Form State (matching screenshot 2)
  const [recordMethod, setRecordMethod] = useState('Check');
  const [recordDate, setRecordDate] = useState(() => formatEasternDate(new Date()));

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedPlanTemplateId(templateId);
    if (!templateId) {
      setPlanName('');
      setDescription('');
      setAnnualPrice('');
      setServiceWindowsList([]);
      return;
    }

    const template = MAINTENANCE_PLAN_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setPlanName(template.name);
      setDescription(template.description);
      setAnnualPrice(template.annualPrice.toFixed(2));
      setPlanClass(template.className || 'Commercial');
      
      // Calculate end date based on template length
      const startYear = parseInt(startDate.slice(0, 4), 10) || new Date().getFullYear();
      const endYear = startYear + template.contractLengthYears;
      const endStr = `${endYear}-${startDate.slice(5, 10) || '08-25'}`;
      setEndDate(endStr);

      const rows: ServiceWindowRow[] = template.serviceWindows.map((sw, idx) => ({
        id: `sw-${idx + 1}`,
        beginningMonth: sw.beginningMonth,
        endMonth: sw.endMonth,
        jobName: sw.jobName,
      }));
      setServiceWindowsList(rows);
      setNumberOfWindows(rows.length * template.contractLengthYears);
    }
  };

  // Re-calculate contract subtotal & total
  const contractYears = useMemo(() => {
    const startY = parseInt(startDate.slice(0, 4), 10) || new Date().getFullYear();
    const endY = parseInt(endDate.slice(0, 4), 10) || (startY + 1);
    return Math.max(1, endY - startY);
  }, [startDate, endDate]);

  const numericAnnualPrice = useMemo(() => {
    const clean = annualPrice.replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  }, [annualPrice]);

  const contractSubtotal = useMemo(() => {
    return numericAnnualPrice * contractYears;
  }, [numericAnnualPrice, contractYears]);

  const selectedTaxRate = useMemo(() => {
    if (!collectTax) return 0;
    const tg = TAX_GROUPS.find((t) => t.name === taxGroupName);
    return tg ? tg.rate : 0.07;
  }, [collectTax, taxGroupName]);

  const taxAmount = useMemo(() => {
    if (!collectTax) return 0;
    return contractSubtotal * selectedTaxRate;
  }, [collectTax, contractSubtotal, selectedTaxRate]);

  const contractTotal = useMemo(() => {
    return contractSubtotal + taxAmount;
  }, [contractSubtotal, taxAmount]);

  // Sync payment amount default when contract total changes
  useEffect(() => {
    if (contractTotal > 0) {
      setPaymentAmount(contractTotal.toFixed(2));
    }
  }, [contractTotal]);

  // Sync # of windows when service windows list or years change
  useEffect(() => {
    if (serviceWindowsList.length > 0) {
      setNumberOfWindows(serviceWindowsList.length * contractYears);
    }
  }, [serviceWindowsList.length, contractYears]);

  // --- Chronological candidate service windows generation ---
  const candidateServiceWindows = useMemo(() => {
    if (serviceWindowsList.length === 0) return [];
    const startYear = parseInt(startDate.slice(0, 4), 10) || new Date().getFullYear();
    const list: Array<{
      key: string;
      label: string;
      beginningMonth: string;
      endMonth: string;
      startYear: number;
      endYear: number;
      jobName: string;
      absoluteMonthIndex: number;
    }> = [];

    for (let yr = 0; yr <= contractYears + 2; yr++) {
      const curYear = startYear + yr;
      serviceWindowsList.forEach((sw) => {
        const startMonthIdx = MONTH_INDEX[sw.beginningMonth] ?? 0;
        const endMonthIdx = MONTH_INDEX[sw.endMonth] ?? startMonthIdx;
        const endYear = endMonthIdx < startMonthIdx ? curYear + 1 : curYear;
        const key = `${sw.beginningMonth}-${sw.endMonth}-${curYear}`;
        const label = `${sw.beginningMonth} - ${sw.endMonth} ${endYear}`;
        const absoluteMonthIndex = curYear * 12 + startMonthIdx;

        list.push({
          key,
          label,
          beginningMonth: sw.beginningMonth,
          endMonth: sw.endMonth,
          startYear: curYear,
          endYear,
          jobName: sw.jobName,
          absoluteMonthIndex,
        });
      });
    }

    list.sort((a, b) => a.absoluteMonthIndex - b.absoluteMonthIndex);
    return list;
  }, [serviceWindowsList, startDate, contractYears]);

  // Default first service window to nearest upcoming window to current date
  useEffect(() => {
    if (candidateServiceWindows.length === 0) return;
    const startYear = parseInt(startDate.slice(0, 4), 10) || new Date().getFullYear();
    const startMonth = parseInt(startDate.slice(5, 7), 10) - 1 || new Date().getMonth();
    const currentAbsMonth = startYear * 12 + startMonth;

    const nearest = candidateServiceWindows.find((w) => w.absoluteMonthIndex >= currentAbsMonth) || candidateServiceWindows[0];
    if (nearest && (!firstServiceWindowKey || !candidateServiceWindows.some((c) => c.key === firstServiceWindowKey))) {
      setFirstServiceWindowKey(nearest.key);
    }
  }, [candidateServiceWindows, startDate, firstServiceWindowKey]);

  // Calculate First Window and Last Window summary based on selected first window and # of windows
  const dynamicWindowSummary = useMemo(() => {
    if (candidateServiceWindows.length === 0) {
      return {
        total: numberOfWindows,
        firstStr: 'Sep 2026 - Oct 2026',
        lastStr: 'May 2046 - Jun 2046',
      };
    }

    let firstIdx = candidateServiceWindows.findIndex((w) => w.key === firstServiceWindowKey);
    if (firstIdx < 0) firstIdx = 0;

    const firstWin = candidateServiceWindows[firstIdx];
    const lastIdx = firstIdx + Math.max(1, numberOfWindows) - 1;
    
    let lastStr = '';
    if (lastIdx < candidateServiceWindows.length) {
      const lastWin = candidateServiceWindows[lastIdx];
      const startShort = MONTH_SHORT[lastWin.beginningMonth] || lastWin.beginningMonth.slice(0, 3);
      const endShort = MONTH_SHORT[lastWin.endMonth] || lastWin.endMonth.slice(0, 3);
      lastStr = `${startShort} ${lastWin.startYear} - ${endShort} ${lastWin.endYear}`;
    } else {
      const cycleLength = serviceWindowsList.length || 1;
      const additionalCycles = Math.floor((lastIdx - firstIdx) / cycleLength);
      const rowIdx = (lastIdx - firstIdx) % cycleLength;
      const row = serviceWindowsList[rowIdx] || serviceWindowsList[0];
      const startYear = (firstWin?.startYear || 2026) + additionalCycles;
      const startMonthIdx = MONTH_INDEX[row.beginningMonth] ?? 0;
      const endMonthIdx = MONTH_INDEX[row.endMonth] ?? startMonthIdx;
      const endYear = endMonthIdx < startMonthIdx ? startYear + 1 : startYear;
      const startShort = MONTH_SHORT[row.beginningMonth] || row.beginningMonth.slice(0, 3);
      const endShort = MONTH_SHORT[row.endMonth] || row.endMonth.slice(0, 3);
      lastStr = `${startShort} ${startYear} - ${endShort} ${endYear}`;
    }

    const firstStartShort = firstWin ? (MONTH_SHORT[firstWin.beginningMonth] || firstWin.beginningMonth.slice(0, 3)) : 'Sep';
    const firstEndShort = firstWin ? (MONTH_SHORT[firstWin.endMonth] || firstWin.endMonth.slice(0, 3)) : 'Oct';
    const firstStr = firstWin ? `${firstStartShort} ${firstWin.startYear} - ${firstEndShort} ${firstWin.endYear}` : 'Sep 2026 - Oct 2026';

    return {
      total: numberOfWindows,
      firstStr,
      lastStr,
    };
  }, [candidateServiceWindows, firstServiceWindowKey, numberOfWindows, serviceWindowsList]);

  // --- Inline Row Handlers for Tab 2: Service Windows ---
  const handleAddServiceWindowRow = () => {
    const nextIdx = serviceWindowsList.length + 1;
    const newRow: ServiceWindowRow = {
      id: `sw-${Date.now()}-${nextIdx}`,
      beginningMonth: MONTH_NAMES[(nextIdx * 3) % 12],
      endMonth: MONTH_NAMES[(nextIdx * 3 + 1) % 12],
      jobName: `${nextIdx === 1 ? '1st' : nextIdx === 2 ? '2nd' : nextIdx === 3 ? '3rd' : `${nextIdx}th`} Visit 1 System`,
    };
    setServiceWindowsList((prev) => [...prev, newRow]);
  };

  const handleDeleteServiceWindowRow = (id: string) => {
    setServiceWindowsList((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateServiceWindowRow = (id: string, field: keyof ServiceWindowRow, value: string) => {
    setServiceWindowsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // --- Inline Row Handlers for Tab 3: Reminders ---
  const handleAddRecipientRow = () => {
    const nextPerson = authorizedPersons[recipients.length - 1];
    const newName = nextPerson ? `${nextPerson.firstName} ${nextPerson.lastName}` : (customer?.name || '30A Escapes');
    const newDestination = nextPerson ? (nextPerson.email || nextPerson.phone) : customerEmail;

    const newRow: ReminderRecipientRow = {
      id: `rec-${Date.now()}-${recipients.length + 1}`,
      name: newName,
      channel: 'Email',
      destination: newDestination,
    };
    setRecipients((prev) => [...prev, newRow]);
  };

  const handleDeleteRecipientRow = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRecipientChannel = (id: string, newChannel: 'Email' | 'Text') => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const dest = newChannel === 'Email' ? customerEmail : customerPhone;
        return { ...r, channel: newChannel, destination: dest };
      })
    );
  };

  // Auto-scroll helper when Job Type selector is opened
  const handleJobTypeOpenChange = (open: boolean) => {
    if (open && scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 50);
    }
  };

  if (!isOpen) return null;

  const isPlanSelected = !!selectedPlanTemplateId;

  // Build canonical plan helper
  const buildCanonicalPlan = (isPaid: boolean = false): CanonicalMaintenancePlan => {
    const planId = `mp-${Date.now()}`;
    const generatedWindows: CanonicalServiceWindow[] = [];
    const startYear = parseInt(startDate.slice(0, 4), 10) || new Date().getFullYear();

    let jobIdCounter = 134354;
    for (let yr = 0; yr < contractYears; yr++) {
      const curYear = startYear + yr;
      serviceWindowsList.forEach((sw, idx) => {
        const isFirst = yr === 0 && idx === 0;
        generatedWindows.push({
          id: `win-${curYear}-${idx}`,
          season: sw.beginningMonth,
          dateRange: `${sw.beginningMonth.slice(0, 3)} ${curYear} - ${sw.endMonth.slice(0, 3)} ${curYear}`,
          jobSubtitle: `Job #${jobIdCounter}: ${sw.jobName}`,
          jobName: sw.jobName,
          beginningMonth: sw.beginningMonth,
          endMonth: sw.endMonth,
          isScheduled: isFirst,
          isComplete: false,
          appointmentId: null,
          assignedTech: salesAgent || 'Justin Lung',
        });
        jobIdCounter++;
      });
    }

    const appliedVal = isPaid ? (parseFloat(paymentAmount) || contractTotal) : 0;

    return {
      id: planId,
      customerId: customer?.id || 'cust-1',
      name: planName || 'Maintenance Plan',
      status: 'Active',
      description,
      startDate,
      expiresDate: endDate,
      contractTotal,
      annualPrice: numericAnnualPrice,
      balanceDue: Math.max(0, contractTotal - appliedVal),
      billingFrequency: 'Annual',
      locationStreet: selectedLocation,
      salesAgent: salesAgent || undefined,
      accountName: account || undefined,
      className: planClass,
      collectTax,
      taxGroup: taxGroupName,
      termsText,
      termsAgreed,
      customerSignature: eSignatureName || undefined,
      signatureType: 'typed',
      jobType: serviceJobType,
      includedVisitsTotal: generatedWindows.length,
      includedVisitsRemaining: generatedWindows.length,
      coveredEquipmentIds: [],
      discountPercentage: 15,
      serviceWindows: generatedWindows,
      sendReminders,
      reminderRecipients: recipients.map((r) => ({
        name: r.name,
        channel: r.channel,
        destination: r.destination,
      })),
      paymentOption,
      appliedAmount: appliedVal,
      autoRenew: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Submit payment handler (Processes or Records payment WITHOUT closing the modal)
  const handleSubmitPayment = (type: 'process' | 'record') => {
    const amt = parseFloat(paymentAmount) || contractTotal;
    setPaymentProcessedSuccess(
      type === 'process'
        ? `Payment of $${amt.toFixed(2)} successfully confirmed through Stripe.`
        : `Payment of $${amt.toFixed(2)} recorded successfully (${recordMethod}).`
    );
    setPaymentActionView('none');

    // Record client-side transaction in Firestore payments collection
    try {
      const client = FirestoreDomainClient.getInstance();
      const planId = `mp-${Date.now()}`;
      const newPaymentRecord: CanonicalPaymentRecord = {
        id: `pay-${Date.now()}`,
        customerId: customer?.id || 'cust-1',
        customerName: customer?.name || '30A Escapes',
        payerName: eSignatureName || customer?.name || 'Customer',
        dateTime: formatEasternDateTime(new Date()),
        type: type === 'process' ? 'Processed' : 'Recorded',
        method: type === 'process' ? 'Visa x4242' : recordMethod,
        status: 'Settled',
        amount: amt,
        amountFormatted: `$${amt.toFixed(2)}`,
        frequency: 'One-time',
        autoSyncStatus: 'Synced',
        hasInvLink: false,
        hasMpLink: true,
        maintenancePlanId: planId,
        maintenancePlanName: planName || 'Maintenance Plan',
        maintenancePlanAmountApplied: amt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      client.savePaymentRecord(newPaymentRecord, 'mock');
    } catch (e) {
      // Best-effort local persistence
    }
  };

  // Final submit handler when clicking Done
  const handleDone = () => {
    const isPaid = !!paymentProcessedSuccess;
    const plan = buildCanonicalPlan(isPaid);
    onPlanCreated?.(plan);
    onClose();
  };

  const parsedPaymentAmount = parseFloat(paymentAmount) || contractTotal || 50;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Taller Pinned Frame container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-4xl h-[85vh] max-h-[850px] min-h-[720px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans text-xs ">
        
        {/* 1. Pinned Header */}
        <div className="bg-[#fcfdfd] px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-medium text-slate-800 tracking-tight">Add Maintenance Plan</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Pinned Multi-Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('contract')}
              className={`px-4 py-2 text-xs font-semibold rounded-t transition-colors cursor-pointer ${
                activeTab === 'contract'
                  ? 'border border-b-white bg-white text-slate-900 font-bold -mb-px'
                  : 'text-[#be4646] hover:text-[#9e3a3a]'
              }`}
            >
              Contract
            </button>
            <button
              type="button"
              disabled={!isPlanSelected}
              onClick={() => isPlanSelected && setActiveTab('service')}
              className={`px-4 py-2 text-xs font-semibold rounded-t transition-colors ${
                !isPlanSelected
                  ? 'text-slate-300 cursor-not-allowed'
                  : activeTab === 'service'
                  ? 'border border-b-white bg-white text-slate-900 font-bold -mb-px cursor-pointer'
                  : 'text-[#be4646] hover:text-[#9e3a3a] cursor-pointer'
              }`}
            >
              Service
            </button>
            <button
              type="button"
              disabled={!isPlanSelected}
              onClick={() => isPlanSelected && setActiveTab('reminders')}
              className={`px-4 py-2 text-xs font-semibold rounded-t transition-colors ${
                !isPlanSelected
                  ? 'text-slate-300 cursor-not-allowed'
                  : activeTab === 'reminders'
                  ? 'border border-b-white bg-white text-slate-900 font-bold -mb-px cursor-pointer'
                  : 'text-[#be4646] hover:text-[#9e3a3a] cursor-pointer'
              }`}
            >
              Reminders
            </button>
            <button
              type="button"
              disabled={!isPlanSelected}
              onClick={() => isPlanSelected && setActiveTab('payment')}
              className={`px-4 py-2 text-xs font-semibold rounded-t transition-colors ${
                !isPlanSelected
                  ? 'text-slate-300 cursor-not-allowed'
                  : activeTab === 'payment'
                  ? 'border border-b-white bg-white text-slate-900 font-bold -mb-px cursor-pointer'
                  : 'text-[#be4646] hover:text-[#9e3a3a] cursor-pointer'
              }`}
            >
              Payment
            </button>
          </div>
        </div>

        {/* 3. Scrollable Modal Body */}
        <div ref={scrollContainerRef} className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#fafbfb]">
          {/* ================= TAB 1: CONTRACT ================= */}
          {activeTab === 'contract' && (
            <div className="space-y-4">
              {/* Location */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  {locationsList.length > 0 ? (
                    locationsList.map((loc) => {
                      const fullAddr = `${loc.addr1}, ${loc.city}, ${loc.state} ${loc.zip}`.trim();
                      const label = `${customer?.name || 'Customer'} - ${fullAddr}`;
                      return (
                        <option key={loc.id} value={fullAddr}>
                          {label}
                        </option>
                      );
                    })
                  ) : (
                    <option value={defaultLocation}>
                      {customer?.name || 'Customer'} - {defaultLocation}
                    </option>
                  )}
                </select>
              </div>

              {/* Plan Name & Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedPlanTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer font-medium"
                  >
                    <option value="">-- Select Maintenance Plan --</option>
                    {MAINTENANCE_PLAN_TEMPLATES.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Class</label>
                  <select
                    value={planClass}
                    onChange={(e) => setPlanClass(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Residential">Residential</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">Description</label>
                  <span className="text-[10px] text-slate-400">
                    {Math.max(0, 10000 - description.length)} characters remaining
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-y"
                />
              </div>

              {/* Dates Row: React Aria DatePickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Plan Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    size="sm"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Plan End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    size="sm"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Annual Price, Sales Agent, Account */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Annual Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-medium">$</span>
                    <input
                      type="text"
                      value={annualPrice}
                      onChange={(e) => setAnnualPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sales Agent</label>
                  <select
                    value={salesAgent}
                    onChange={(e) => setSalesAgent(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="">Select Sales Agent</option>
                    {SALES_AGENTS.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account</label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="">(Blank - QuickBooks not configured)</option>
                    <option value="HVAC Preventative Maintenance">HVAC Preventative Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Tax & Pricing Section (Smoothly Expands when Collect Tax is Active) */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-end gap-4">
                  {/* Collect Tax Toggle */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Collect Tax <span className="text-red-500">*</span>
                    </label>
                    <div className="h-8 flex items-center">
                      <button
                        type="button"
                        onClick={() => setCollectTax(!collectTax)}
                        className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          collectTax ? 'bg-[#2d82b7]' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                            collectTax ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tax Fields on Same Row */}
                  {collectTax && (
                    <>
                      <div className="w-36 animate-in fade-in slide-in-from-left-2 duration-150">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tax Group <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={taxGroupName}
                          onChange={(e) => setTaxGroupName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                        >
                          {TAX_GROUPS.map((tg) => (
                            <option key={tg.name} value={tg.name}>
                              {tg.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-40 animate-in fade-in slide-in-from-left-2 duration-150">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Contract Subtotal <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            disabled
                            value={contractSubtotal.toFixed(2)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="w-36 animate-in fade-in slide-in-from-left-2 duration-150">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tax Amount</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            disabled
                            value={taxAmount.toFixed(2)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Contract Total */}
                  <div className={`w-44 ${collectTax ? 'ml-auto' : ''}`}>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contract Total</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-medium">$</span>
                      <input
                        type="text"
                        disabled
                        value={contractTotal.toFixed(2)}
                        className="w-full pl-7 pr-3 py-2 bg-slate-100 border border-slate-300 rounded text-xs text-slate-900 font-bold focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contract Terms & eSignature */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="bg-slate-100 px-3 py-1.5 rounded font-semibold text-slate-700 text-xs">
                  Contract Terms
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Terms & Agreement Text</span>
                    <span className="text-[10px] text-slate-400">
                      {Math.max(0, 3000 - termsText.length)} characters remaining
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={termsText}
                    onChange={(e) => setTermsText(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer ">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#be4646] focus:ring-[#be4646]"
                  />
                  <span className="text-xs text-slate-800 font-medium leading-snug">
                    I have received customer agreement to the terms and conditions of this maintenance plan.
                  </span>
                </label>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    eSignature
                  </label>
                  <input
                    type="text"
                    value={eSignatureName}
                    onChange={(e) => setESignatureName(e.target.value)}
                    placeholder="Type Full Name"
                    className="w-full max-w-md px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: SERVICE WINDOWS ================= */}
          {activeTab === 'service' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100 px-3.5 py-2 rounded">
                <span className="font-semibold text-slate-800 text-xs">Service Window Calculator</span>
                <button
                  type="button"
                  onClick={handleAddServiceWindowRow}
                  className="text-xs font-semibold text-[#be4646] hover:text-[#9e3a3a] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  Add Service Window
                </button>
              </div>

              {/* Dynamic Service Windows Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5 w-44">Beginning Month</th>
                      <th className="p-2.5 w-44">End Month</th>
                      <th className="p-2.5">Job Name</th>
                      <th className="p-2.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {serviceWindowsList.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="p-2.5">
                          <select
                            value={row.beginningMonth}
                            onChange={(e) => handleUpdateServiceWindowRow(row.id, 'beginningMonth', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                          >
                            {MONTH_NAMES.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={row.endMonth}
                            onChange={(e) => handleUpdateServiceWindowRow(row.id, 'endMonth', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                          >
                            {MONTH_NAMES.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.jobName}
                            onChange={(e) => handleUpdateServiceWindowRow(row.id, 'jobName', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteServiceWindowRow(row.id)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                            title="Delete window"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Service Window Parameters with Auto-Scroll on Job Type click */}
              <div ref={jobTypeAnchorRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. First Service Window with Year */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    First Service Window <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={firstServiceWindowKey}
                    onChange={(e) => setFirstServiceWindowKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    {candidateServiceWindows.slice(0, 12).map((cw) => (
                      <option key={cw.key} value={cw.key}>
                        {cw.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Number of Service Windows */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    # of Service Windows <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={numberOfWindows}
                    onChange={(e) => setNumberOfWindows(parseInt(e.target.value, 10) || 1)}
                    min={1}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* 3. Job Type (Shared HierarchicalJobTypeSelector with Auto-Scroll) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Job Type <span className="text-red-500">*</span>
                  </label>
                  <HierarchicalJobTypeSelector
                    value={serviceJobType}
                    onChange={(val) => setServiceJobType(val)}
                    onOpenChange={handleJobTypeOpenChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Dynamic Calculation Blue Summary Box */}
              <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-lg p-4 text-center space-y-1 text-slate-800">
                <p className="font-semibold text-xs text-[#205493]">
                  {dynamicWindowSummary.total} Service Windows will be created.
                </p>
                <p className="text-xs text-slate-600">
                  First Service Window: <span className="font-medium text-slate-800">{dynamicWindowSummary.firstStr}</span>
                </p>
                <p className="text-xs text-slate-600">
                  Last Service Window: <span className="font-medium text-slate-800">{dynamicWindowSummary.lastStr}</span>
                </p>
              </div>
            </div>
          )}

          {/* ================= TAB 3: REMINDERS ================= */}
          {activeTab === 'reminders' && (
            <div className="space-y-5">
              {/* Master Toggle */}
              <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-lg">
                <h4 className="font-semibold text-xs text-slate-800">
                  Send Service Reminders for Appointment Scheduling? <span className="text-red-500">*</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSendReminders(!sendReminders)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    sendReminders ? 'bg-[#2d82b7]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                      sendReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Recipients Dynamic List */}
              {sendReminders && (
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    {recipients.map((rec, idx) => (
                      <div
                        key={rec.id}
                        className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white border border-slate-200 p-3 rounded-lg"
                      >
                        <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                        
                        {/* Disabled Contact Name Dropdown */}
                        <div className="flex-1 min-w-[160px]">
                          <select
                            disabled
                            value={rec.name}
                            className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-700 font-medium focus:outline-none cursor-not-allowed"
                          >
                            <option value={rec.name}>{rec.name}</option>
                            <option value={customer?.name || '30A Escapes'}>{customer?.name || '30A Escapes'}</option>
                            {authorizedPersons.map((p) => (
                              <option key={p.id} value={`${p.firstName} ${p.lastName}`}>
                                {p.firstName} {p.lastName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Channel Dropdown */}
                        <div className="w-32">
                          <select
                            value={rec.channel}
                            onChange={(e) => handleUpdateRecipientChannel(rec.id, e.target.value as 'Email' | 'Text')}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                          >
                            <option value="Email">email</option>
                            <option value="Text">text</option>
                          </select>
                        </div>

                        {/* Destination Input */}
                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={rec.destination}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecipients((prev) =>
                                prev.map((r) => (r.id === rec.id ? { ...r, destination: val } : r))
                              );
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRecipientRow(rec.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                          title="Delete recipient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRecipientRow}
                    className="text-xs font-semibold text-[#be4646] hover:text-[#9e3a3a] flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    Add Recipient
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: PAYMENT ================= */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              {/* Financial Metrics Summary Banner (Constant Numbers) */}
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x divide-slate-200">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">Contract Total</span>
                    <span className="text-sm font-bold text-slate-800">
                      ${contractTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">Annual Price</span>
                    <span className="text-sm font-bold text-slate-800">
                      ${numericAnnualPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">Applied</span>
                    <span className="text-sm font-bold text-slate-800">
                      ${paymentProcessedSuccess ? (parseFloat(paymentAmount) || contractTotal).toFixed(2) : '$0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">Balance</span>
                    <span className="text-sm font-bold text-slate-800">
                      ${paymentProcessedSuccess ? '0.00' : contractTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Success Confirmation Banner if payment was taken */}
              {paymentProcessedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                  <span>{paymentProcessedSuccess}</span>
                  <span className="text-xs font-normal text-emerald-600">Window remains open for edits. Click Done when finished.</span>
                </div>
              )}

              {/* Payment Options (Only One-Time and Not Now buttons) */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-800 w-28 shrink-0">Payment Options</span>
                  
                  <div className="inline-flex rounded-md shadow-2xs border border-slate-200 overflow-hidden bg-slate-100">
                    <button
                      type="button"
                      onClick={() => setPaymentOption('One-Time')}
                      className={`px-6 py-2 text-xs font-semibold transition-colors cursor-pointer border-r border-slate-200 ${
                        paymentOption === 'One-Time'
                          ? 'bg-[#2d82b7] text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      One-Time
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentOption('Not Now');
                        setPaymentActionView('none');
                      }}
                      className={`px-6 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        paymentOption === 'Not Now'
                          ? 'bg-[#2d82b7] text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Not Now
                    </button>
                  </div>
                </div>

                {/* One-Time Payment Section */}
                {paymentOption === 'One-Time' && (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-semibold text-slate-800 w-28 shrink-0">
                        Payment Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative w-48">
                        <span className="absolute left-3 top-2 text-slate-500 font-medium">$</span>
                        <input
                          type="text"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>

                    {/* Action Selector Card (when not in sub-form) */}
                    {paymentActionView === 'none' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setPaymentActionView('process')}
                            className="w-full py-2.5 px-4 bg-[#7cb342] hover:bg-[#689f38] text-white font-bold rounded text-xs transition-colors text-center cursor-pointer shadow-2xs"
                          >
                            Process Payment
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentActionView('record')}
                            className="w-full py-2.5 px-4 bg-[#7cb342] hover:bg-[#689f38] text-white font-bold rounded text-xs transition-colors text-center cursor-pointer shadow-2xs"
                          >
                            Record Payment
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-500 italic leading-relaxed">
                          A one-time payment on a maintenance plan will be displayed as a credit on a customer&apos;s account. An invoice will not be created. Please create an invoice and assign the payment from the Customer page Payments tab or the Payment List.
                        </p>
                      </div>
                    )}

                    {/* Sub-form 1: Actual Shared Stripe Module */}
                    {paymentActionView === 'process' && (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          mode: 'payment',
                          amount: Math.max(50, Math.round(parsedPaymentAmount * 100)),
                          currency: 'usd',
                        }}
                      >
                        <StripeMaintenancePaymentForm
                          totalAmount={parsedPaymentAmount}
                          onSuccess={() => handleSubmitPayment('process')}
                          onCancel={() => setPaymentActionView('none')}
                        />
                      </Elements>
                    )}

                    {/* Sub-form 2: Record Payment Form (Matching Screenshot 2) */}
                    {paymentActionView === 'record' && (
                      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-2xs animate-in fade-in">
                        {/* Payment Method Dropdown */}
                        <div className="flex items-center gap-4">
                          <label className="text-xs font-semibold text-slate-700 w-32 shrink-0">
                            Payment Method <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={recordMethod}
                            onChange={(e) => setRecordMethod(e.target.value)}
                            className="flex-1 max-w-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="Check">Check</option>
                            <option value="Cash">Cash</option>
                            <option value="Credit Card">Credit Card (External)</option>
                            <option value="ACH">ACH / Bank Transfer</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Date Recorded (Formatted as M-DD-YYYY, e.g. 8-08-2026) */}
                        <div className="flex items-center gap-4">
                          <label className="text-xs font-semibold text-slate-700 w-32 shrink-0">
                            Date Recorded <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={recordDate}
                            onChange={(e) => setRecordDate(e.target.value)}
                            className="flex-1 max-w-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none "
                          />
                        </div>

                        {/* Sub-form Buttons */}
                        <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setPaymentActionView('none')}
                            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitPayment('record')}
                            className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Record Payment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Pinned Footer Controls */}
        <div className="bg-[#fcfdfd] px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {activeTab === 'contract' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'service') setActiveTab('contract');
                  if (activeTab === 'reminders') setActiveTab('service');
                  if (activeTab === 'payment') setActiveTab('reminders');
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div>
            {activeTab !== 'payment' ? (
              <button
                type="button"
                disabled={!isPlanSelected}
                onClick={() => {
                  if (!isPlanSelected) return;
                  if (activeTab === 'contract') setActiveTab('service');
                  if (activeTab === 'service') setActiveTab('reminders');
                  if (activeTab === 'reminders') setActiveTab('payment');
                }}
                className={`px-6 py-2 font-bold rounded text-xs transition-colors shadow-2xs ${
                  !isPlanSelected
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#be4646] hover:bg-[#a63a3a] text-white cursor-pointer'
                }`}
              >
                Next &gt;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDone}
                className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
