import React from 'react';
import { 
  PhoneCall, 
  Folder, 
  List, 
  FileText, 
  DollarSign, 
  Coins, 
  Files, 
  Trophy, 
  ShoppingCart,
  Briefcase
} from 'lucide-react';

export function generateStaticParams() {
  return [
    { slug: ['call-list'] },
    { slug: ['list'] },
    { slug: ['invoice-list'] },
    { slug: ['proposal-list'] },
    { slug: ['payment-list'] },
    { slug: ['payment-plan-list'] },
    { slug: ['maintenance-plan-list'] },
    { slug: ['proposal-comparison-list'] },
    { slug: ['purchase-order-list'] },
  ];
}

export default async function JobsSubPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const resolvedParams = await params;
  const currentSubPath = resolvedParams.slug?.[0] || 'list';

  const subPageDetails: Record<string, { title: string; desc: string; icon: React.ElementType }> = {
    'call-list': { title: 'Call List', desc: 'Active dispatch calls, incoming requests, and triage items.', icon: PhoneCall },
    'list': { title: 'Job List', desc: 'Comprehensive list of scheduled and completed work orders.', icon: Folder },
    'invoice-list': { title: 'Invoice List', desc: 'Generated, pending, and paid invoices across all jobs.', icon: List },
    'proposal-list': { title: 'Proposal List', desc: 'Open estimates, quote submissions, and pending customer approvals.', icon: FileText },
    'payment-list': { title: 'Payment List', desc: 'Recorded payments, receipts, and transactions.', icon: DollarSign },
    'payment-plan-list': { title: 'Payment Plan List', desc: 'Active customer installment and recurring payment schedules.', icon: Coins },
    'maintenance-plan-list': { title: 'Maintenance Plan List', desc: 'Recurring preventative maintenance contracts and service agreements.', icon: Files },
    'proposal-comparison-list': { title: 'Proposal Comparison List', desc: 'Side-by-side tier option comparisons (Good/Better/Best options).', icon: Trophy },
    'purchase-order-list': { title: 'Purchase Order List', desc: 'Vendor orders, parts procurement, and PO status tracking.', icon: ShoppingCart },
  };

  const current = subPageDetails[currentSubPath] || {
    title: `Jobs: ${currentSubPath.replace(/-/g, ' ').toUpperCase()}`,
    desc: 'Job details and administrative view.',
    icon: Briefcase,
  };

  const Icon = current.icon;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-[#3f6b35] rounded-xl border border-emerald-200">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{current.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{current.desc}</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
          Jobs Dropdown Item
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-3">
          <Icon className="w-12 h-12 text-slate-300 stroke-[1.5]" />
          <h2 className="text-lg font-semibold text-slate-800">{current.title} Data View</h2>
          <p className="text-sm max-w-md text-slate-500">
            All records under <span className="font-semibold text-slate-700">{current.title}</span> are connected via the top navigation layout.
          </p>
        </div>
      </div>
    </div>
  );
}
