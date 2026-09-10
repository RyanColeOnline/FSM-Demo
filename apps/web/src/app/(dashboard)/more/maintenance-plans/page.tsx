'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  MinusCircle, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Shield, 
  Check, 
  RotateCcw,
  Upload, 
  Settings2, 
  HelpCircle,
  FileUp,
  FileText,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui';

interface ServiceWindowRow {
  id: string;
  beginningMonth: string;
  endMonth: string;
  visitTitle: string;
}

interface MaintenancePlanRecord {
  id: string;
  name: string;
  quickbooksItemName?: string;
  description?: string;
  contractLength: string;
  annualPrice?: number;
  accountName?: string;
  className?: string;
  collectTax?: boolean;
  autoRenewalReminders?: boolean;
  termsType?: 'pdf' | 'editable';
  termsText?: string;
  termsPdfName?: string;
  frequency: 'Tri-Annual' | 'Bi-Annual' | 'Annual' | 'Quarterly';
  serviceWindowsList?: ServiceWindowRow[];
  serviceWindowsSummary: string[];
  serviceWindowJobType?: string;
  appointmentDurationHours?: string;
  isArchived?: boolean;
}

const activePlans: MaintenancePlanRecord[] = [
  {
    id: 'mp-1',
    name: 'Commercial PM 6 systems',
    quickbooksItemName: 'Maint-Comm-PM6',
    description: 'Comprehensive commercial PM service covering up to 6 systems.',
    contractLength: '20 Years',
    annualPrice: 1450.00,
    accountName: 'Services > Commercial Maintenance',
    className: 'Commercial',
    collectTax: false,
    autoRenewalReminders: false,
    termsType: 'editable',
    termsText: 'Standard commercial maintenance agreement terms and liability disclosures.',
    frequency: 'Tri-Annual',
    serviceWindowsList: [
      { id: 'sw-1', beginningMonth: 'May', endMonth: 'June', visitTitle: 'Spring Cooling PM' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', visitTitle: 'Fall Heating PM' },
      { id: 'sw-3', beginningMonth: 'January', endMonth: 'January', visitTitle: 'Winter Mid-Season Inspection' },
    ],
    serviceWindowsSummary: ['May - June', 'September - October', 'January - January'],
    serviceWindowJobType: 'Maintenance Inspection',
    appointmentDurationHours: '2.0',
  },
  {
    id: 'mp-2',
    name: 'Commercial system maintenance',
    quickbooksItemName: 'Maint-Comm-System',
    description: 'Routine maintenance for single commercial HVAC installations.',
    contractLength: '20 Years',
    annualPrice: 850.00,
    accountName: 'Services > Commercial Maintenance',
    className: 'Commercial',
    collectTax: false,
    autoRenewalReminders: false,
    termsType: 'editable',
    termsText: 'Commercial system terms.',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['September - December', 'March - April'],
    serviceWindowJobType: 'Maintenance Inspection',
    appointmentDurationHours: '1.5',
  },
  {
    id: 'mp-3',
    name: 'Complimentary HVAC Maintenance',
    quickbooksItemName: 'Maint-Promo-Free',
    description: 'Complimentary first year maintenance included with new equipment installation.',
    contractLength: '1 Year',
    annualPrice: 0.00,
    accountName: 'Services > Promotional',
    className: 'Residential',
    collectTax: false,
    autoRenewalReminders: false,
    termsType: 'editable',
    termsText: 'Complimentary maintenance plan terms.',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['March - April', 'September - October'],
    serviceWindowJobType: 'Maintenance Inspection',
    appointmentDurationHours: '1.0',
  },
  {
    id: 'mp-4',
    name: 'Hvac 1 system maintenance plan',
    quickbooksItemName: 'Maint-Res-1System',
    description: 'Residential 1 system annual precision tune-up & maintenance plan.',
    contractLength: '20 Years',
    annualPrice: 245.00,
    accountName: 'Services > Residential Maintenance',
    className: 'Residential',
    collectTax: false,
    autoRenewalReminders: false,
    termsType: 'editable',
    termsText: 'Residential 1-system maintenance agreement terms.',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['March - April', 'September - October'],
    serviceWindowJobType: 'Maintenance Inspection',
    appointmentDurationHours: '1.0',
  },
  {
    id: 'mp-5',
    name: 'Hvac 2 system maintenance plan',
    quickbooksItemName: 'Maint-Res-2System',
    description: 'Residential 2 system annual precision tune-up & maintenance plan.',
    contractLength: '20 Years',
    annualPrice: 395.00,
    accountName: 'Services > Residential Maintenance',
    className: 'Residential',
    collectTax: false,
    autoRenewalReminders: false,
    termsType: 'editable',
    termsText: 'Residential 2-system agreement terms.',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['March - April', 'September - October'],
    serviceWindowJobType: 'Maintenance Inspection',
    appointmentDurationHours: '1.5',
  },
  {
    id: 'mp-6',
    name: 'Hvac 3 system maintenance plan',
    quickbooksItemName: 'Maint-Res-3System',
    description: 'Residential 3 system annual precision tune-up & maintenance plan.',
    contractLength: '20 Years',
    annualPrice: 545.00,
    accountName: 'Services > Residential Maintenance',
    className: 'Residential',
    collectTax: false,
    autoRenewalReminders: false,
    termsType: 'editable',
    termsText: 'Residential 3-system agreement terms.',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['March - April', 'September - October'],
    serviceWindowJobType: 'Maintenance Inspection',
    appointmentDurationHours: '2.0',
  },
  {
    id: 'mp-7',
    name: 'Hvac 4 system maintenance plan',
    quickbooksItemName: 'Maint-Res-4System',
    description: 'Residential 4 system annual precision tune-up & maintenance plan.',
    contractLength: '20 Years',
    annualPrice: 695.00,
    accountName: 'Services > Residential Maintenance',
    className: 'Residential',
    collectTax: false,
    autoRenewalReminders: false,
    termsType: 'editable',
    termsText: 'Residential 4-system agreement terms.',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['March - April', 'September - October'],
    serviceWindowJobType: 'Maintenance Inspection',
    appointmentDurationHours: '2.5',
  },
];

const archivedPlans: MaintenancePlanRecord[] = [
  {
    id: 'arch-1',
    name: 'Legacy 2-Year Residential Care',
    contractLength: '2 Years',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['April - May', 'October - November'],
    isArchived: true,
  },
  {
    id: 'arch-2',
    name: 'Legacy Commercial Chillers Plan',
    contractLength: '5 Years',
    frequency: 'Quarterly',
    serviceWindowsSummary: ['Jan - Feb', 'Apr - May', 'Jul - Aug', 'Oct - Nov'],
    isArchived: true,
  },
  {
    id: 'arch-3',
    name: '2023 Promotional Basic Tuneup',
    contractLength: '1 Year',
    frequency: 'Annual',
    serviceWindowsSummary: ['May - June'],
    isArchived: true,
  },
  {
    id: 'arch-4',
    name: 'Standard Heat Pump Protection Plan',
    contractLength: '3 Years',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['March - April', 'September - October'],
    isArchived: true,
  },
  {
    id: 'arch-5',
    name: 'Multi-Tenant Property Maintenance',
    contractLength: '10 Years',
    frequency: 'Tri-Annual',
    serviceWindowsSummary: ['Feb - Mar', 'Jun - Jul', 'Oct - Nov'],
    isArchived: true,
  },
  {
    id: 'arch-6',
    name: 'Spring & Fall Seasonal Inspection',
    contractLength: '1 Year',
    frequency: 'Bi-Annual',
    serviceWindowsSummary: ['April - May', 'October - November'],
    isArchived: true,
  },
];

const monthOptions = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MoreMaintenancePlansPage() {
  const [plans, setPlans] = useState<MaintenancePlanRecord[]>(activePlans);
  const [archivedList, setArchivedList] = useState<MaintenancePlanRecord[]>(archivedPlans);
  const [isArchivedSectionExpanded, setIsArchivedSectionExpanded] = useState<boolean>(false);

  // Archive Confirmation Modal State
  const [planToArchive, setPlanToArchive] = useState<MaintenancePlanRecord | null>(null);

  // Floating Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlanRecord | null>(null);

  // Modal Form Fields
  const [formName, setFormName] = useState('');
  const [formQbName, setFormQbName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContractLength, setFormContractLength] = useState('');
  const [formAnnualPriceStr, setFormAnnualPriceStr] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [formClassName, setFormClassName] = useState('');
  const [formCollectTax, setFormCollectTax] = useState<boolean>(false);
  const [formAutoRenewalReminders, setFormAutoRenewalReminders] = useState<boolean>(false);
  const [formTermsType, setFormTermsType] = useState<'pdf' | 'editable'>('editable');
  const [formTermsText, setFormTermsText] = useState('');
  const [formTermsPdfName, setFormTermsPdfName] = useState('');
  const [formServiceWindows, setFormServiceWindows] = useState<ServiceWindowRow[]>([]);
  const [formJobType, setFormJobType] = useState('');
  const [formAppointmentDuration, setFormAppointmentDuration] = useState('0.5');

  // Validation state: Save button disabled until all required fields are met
  const isSaveEnabled = Boolean(
    formName.trim() &&
    formQbName.trim() &&
    formAccountName.trim() &&
    formServiceWindows.length > 0 &&
    formJobType.trim() &&
    formAppointmentDuration.trim()
  );

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormQbName('');
    setFormDescription('');
    setFormContractLength('1 Year');
    setFormAnnualPriceStr('');
    setFormAccountName('Services > Residential Maintenance');
    setFormClassName('Residential');
    setFormCollectTax(false);
    setFormAutoRenewalReminders(false);
    setFormTermsType('editable');
    setFormTermsText('Standard annual preventative maintenance agreement terms.');
    setFormTermsPdfName('');
    setFormServiceWindows([
      { id: 'sw-1', beginningMonth: 'March', endMonth: 'April', visitTitle: 'Spring Cooling Tune-Up' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', visitTitle: 'Fall Heating Inspection' },
    ]);
    setFormJobType('Maintenance Inspection');
    setFormAppointmentDuration('1.0');
    setIsModalOpen(true);
  };

  const openEditPlanModal = (plan: MaintenancePlanRecord) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormQbName(plan.quickbooksItemName || `Maint-${plan.name.slice(0, 10)}`);
    setFormDescription(plan.description || '');
    setFormContractLength(plan.contractLength || '1 Year');
    setFormAnnualPriceStr(plan.annualPrice ? plan.annualPrice.toFixed(2) : '');
    setFormAccountName(plan.accountName || 'Services > Residential Maintenance');
    setFormClassName(plan.className || 'Residential');
    setFormCollectTax(plan.collectTax ?? false);
    setFormAutoRenewalReminders(plan.autoRenewalReminders ?? false);
    setFormTermsType(plan.termsType || 'editable');
    setFormTermsText(plan.termsText || '');
    setFormTermsPdfName(plan.termsPdfName || '');
    setFormServiceWindows(
      plan.serviceWindowsList && plan.serviceWindowsList.length > 0
        ? plan.serviceWindowsList
        : plan.serviceWindowsSummary.map((win, idx) => {
            const parts = win.split('-');
            return {
              id: `sw-${idx}`,
              beginningMonth: parts[0]?.trim() || 'March',
              endMonth: parts[1]?.trim() || 'April',
              visitTitle: `Service Window #${idx + 1}`,
            };
          })
    );
    setFormJobType(plan.serviceWindowJobType || 'Maintenance Inspection');
    setFormAppointmentDuration(plan.appointmentDurationHours || '1.0');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleAddServiceWindowRow = () => {
    const newRow: ServiceWindowRow = {
      id: `sw-${Date.now()}`,
      beginningMonth: 'May',
      endMonth: 'June',
      visitTitle: 'Mid-Season Inspection',
    };
    setFormServiceWindows([...formServiceWindows, newRow]);
  };

  const handleRemoveServiceWindowRow = (id: string) => {
    setFormServiceWindows((prev) => prev.filter((r) => r.id !== id));
  };

  // Confirm Archive Action
  const confirmArchivePlan = () => {
    if (!planToArchive) return;
    setPlans((prev) => prev.filter((p) => p.id !== planToArchive.id));
    setArchivedList((prev) => [{ ...planToArchive, isArchived: true }, ...prev]);
    setPlanToArchive(null);
  };

  const handleRestorePlan = (planToRestore: MaintenancePlanRecord) => {
    setArchivedList((prev) => prev.filter((p) => p.id !== planToRestore.id));
    setPlans((prev) => [{ ...planToRestore, isArchived: false }, ...prev]);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSaveEnabled) return;

    const windowsSummary = formServiceWindows.length > 0
      ? formServiceWindows.map((w) => `${w.beginningMonth} - ${w.endMonth}`)
      : ['March - April', 'September - October'];

    const numAnnualPrice = parseFloat(formAnnualPriceStr) || 0.00;

    if (editingPlan) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id
            ? {
                ...p,
                name: formName,
                quickbooksItemName: formQbName,
                description: formDescription,
                contractLength: formContractLength || '1 Year',
                annualPrice: numAnnualPrice,
                accountName: formAccountName,
                className: formClassName,
                collectTax: formCollectTax,
                autoRenewalReminders: formAutoRenewalReminders,
                termsType: formTermsType,
                termsText: formTermsText,
                termsPdfName: formTermsPdfName,
                serviceWindowsList: formServiceWindows,
                serviceWindowsSummary: windowsSummary,
                serviceWindowJobType: formJobType,
                appointmentDurationHours: formAppointmentDuration,
              }
            : p
        )
      );
    } else {
      const newPlan: MaintenancePlanRecord = {
        id: `mp-${Date.now()}`,
        name: formName,
        quickbooksItemName: formQbName,
        description: formDescription,
        contractLength: formContractLength || '1 Year',
        annualPrice: numAnnualPrice,
        accountName: formAccountName,
        className: formClassName,
        collectTax: formCollectTax,
        autoRenewalReminders: formAutoRenewalReminders,
        termsType: formTermsType,
        termsText: formTermsText,
        termsPdfName: formTermsPdfName,
        frequency: formServiceWindows.length >= 3 ? 'Tri-Annual' : 'Bi-Annual',
        serviceWindowsList: formServiceWindows,
        serviceWindowsSummary: windowsSummary,
        serviceWindowJobType: formJobType,
        appointmentDurationHours: formAppointmentDuration,
      };

      setPlans([newPlan, ...plans]);
    }

    setIsModalOpen(false);
    setEditingPlan(null);
  };

  return (
    <div className="w-full space-y-6 text-slate-800 pb-16 font-sans relative">
      {/* 1. Top Header with Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
          <span className="font-bold text-[#2e4057] italic text-2xl">More Applications</span>
          <span className="font-normal text-[#5b708b] not-italic text-xl">Maintenance Plans</span>
        </h1>

        <button
          type="button"
          onClick={openNewPlanModal}
          className="px-3.5 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white text-xs font-bold rounded shadow-xs inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Maintenance Plan</span>
        </button>
      </div>

      {/* 2. Active Maintenance Plans Data Table (Color code column removed) */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contract Length</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Service Windows</th>
                <th className="px-4 py-3 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {plans.map((plan) => (
                <tr key={plan.id} className="bg-white hover:bg-slate-50/70 transition-colors">
                  {/* Name (Click to edit) */}
                  <td className="px-4 py-4 font-medium whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditPlanModal(plan)}
                      className="text-[#be4646] font-bold hover:underline text-left cursor-pointer transition-colors"
                    >
                      {plan.name}
                    </button>
                  </td>

                  {/* Contract Length */}
                  <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                    {plan.contractLength}
                  </td>

                  {/* Frequency */}
                  <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                    {plan.frequency}
                  </td>

                  {/* Service Windows */}
                  <td className="px-4 py-4 text-slate-600">
                    <div className="space-y-0.5">
                      {plan.serviceWindowsSummary.map((win, idx) => (
                        <div key={idx} className="text-slate-600">
                          {win}
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Actions (Archive trigger) */}
                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => setPlanToArchive(plan)}
                      className="text-[#be4646] hover:text-[#a63a3a] transition-colors p-1 cursor-pointer"
                      title="Archive Maintenance Plan"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {plans.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic bg-slate-50/50">
                    No active maintenance plans.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Dedicated Expandable Section for Archived Plans */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        {/* Expandable Section Header */}
        <button
          type="button"
          onClick={() => setIsArchivedSectionExpanded(!isArchivedSectionExpanded)}
          className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors flex items-center justify-between border-b border-slate-200 cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className={`transform transition-transform duration-200 ${isArchivedSectionExpanded ? 'rotate-90' : ''}`}>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#be4646]" />
              <span>Archived Maintenance Plans</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
              {archivedList.length}
            </span>
          </div>

          <span className="text-xs font-semibold text-[#be4646]">
            {isArchivedSectionExpanded ? 'Hide' : 'Show'}
          </span>
        </button>

        {/* Expandable Table Body */}
        {isArchivedSectionExpanded && (
          <div className="overflow-x-auto animate-in fade-in duration-150">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <th className="px-4 py-3">Plan Name</th>
                  <th className="px-4 py-3">Contract Length</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Service Windows</th>
                  <th className="px-4 py-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600 bg-slate-50/30">
                {archivedList.length > 0 ? (
                  archivedList.map((arch) => (
                    <tr key={arch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                        <span className="text-slate-600 font-semibold">
                          {arch.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{arch.contractLength}</td>
                      <td className="px-4 py-3.5 text-slate-500">{arch.frequency}</td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {arch.serviceWindowsSummary.join(', ')}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRestorePlan(arch)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#3f6b35] border border-emerald-200 text-[11px] font-bold rounded transition-colors cursor-pointer"
                          title="Restore Plan to Active List"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No archived maintenance plans.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. ARCHIVE CONFIRMATION MODAL */}
      {planToArchive && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-[60] flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-slate-100/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-4 h-4 text-[#be4646]" />
                <span>Archive Maintenance Plan</span>
              </h3>
              <button
                type="button"
                onClick={() => setPlanToArchive(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700 text-xs leading-relaxed">
                Are you sure you want to archive <span className="font-bold text-slate-900">&quot;{planToArchive.name}&quot;</span>? This plan will be moved to the Archived Plans section and removed from active booking options.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPlanToArchive(null)}
                  className="px-4 py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={confirmArchivePlan}
                  className="px-4 py-1.5 text-xs font-semibold"
                >
                  Archive Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. FLOATING ADD / EDIT MAINTENANCE PLAN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 overflow-y-auto flex items-start justify-center pt-[5vh] pb-10 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs font-sans">
            
            {/* Modal Header */}
            <div className="bg-slate-100/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#be4646]" />
                <span>{editingPlan ? `Edit Maintenance Plan: ${editingPlan.name}` : 'New Maintenance Plan'}</span>
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
              
              {/* SECTION 1: PLAN DETAILS */}
              <div className="space-y-3.5 border-b border-slate-200 pb-5">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#be4646]">
                  Plan Details
                </h3>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      QuickBooks Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formQbName}
                      onChange={(e) => setFormQbName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contract Length <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formContractLength}
                      onChange={(e) => setFormContractLength(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                    >
                      <option value="1 Year">1 Year</option>
                      <option value="2 Years">2 Years</option>
                      <option value="3 Years">3 Years</option>
                      <option value="5 Years">5 Years</option>
                      <option value="10 Years">10 Years</option>
                      <option value="20 Years">20 Years</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Annual Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formAnnualPriceStr}
                      onChange={(e) => setFormAnnualPriceStr(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formAccountName}
                      onChange={(e) => setFormAccountName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                    >
                      <option value="Services > Residential Maintenance">Services &gt; Residential Maintenance</option>
                      <option value="Services > Commercial Maintenance">Services &gt; Commercial Maintenance</option>
                      <option value="Services > Promotional">Services &gt; Promotional</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* SECTION 2: SERVICE WINDOWS */}
              <div className="space-y-3.5 border-b border-slate-200 pb-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#be4646]">
                    Service Windows &amp; Scheduling
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddServiceWindowRow}
                    className="text-[#be4646] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Service Window</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formServiceWindows.map((sw, idx) => (
                    <div key={sw.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="font-semibold text-slate-500 w-24">Window #{idx + 1}:</span>
                      <select
                        value={sw.beginningMonth}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormServiceWindows((prev) =>
                            prev.map((item) => (item.id === sw.id ? { ...item, beginningMonth: val } : item))
                          );
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      >
                        {monthOptions.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-bold">to</span>
                      <select
                        value={sw.endMonth}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormServiceWindows((prev) =>
                            prev.map((item) => (item.id === sw.id ? { ...item, endMonth: val } : item))
                          );
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      >
                        {monthOptions.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={sw.visitTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormServiceWindows((prev) =>
                            prev.map((item) => (item.id === sw.id ? { ...item, visitTitle: val } : item))
                          );
                        }}
                        className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                      />
                      {formServiceWindows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceWindowRow(sw.id)}
                          className="text-[#be4646] hover:text-[#a63a3a] p-1"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Job Type Generated <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formJobType}
                      onChange={(e) => setFormJobType(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Appointment Duration (Hours) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formAppointmentDuration}
                      onChange={(e) => setFormAppointmentDuration(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                    >
                      <option value="0.5">0.5 Hours (30 mins)</option>
                      <option value="1.0">1.0 Hours (60 mins)</option>
                      <option value="1.5">1.5 Hours (90 mins)</option>
                      <option value="2.0">2.0 Hours (120 mins)</option>
                      <option value="2.5">2.5 Hours</option>
                      <option value="3.0">3.0 Hours</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="px-4 py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={!isSaveEnabled}
                  className="px-5 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
