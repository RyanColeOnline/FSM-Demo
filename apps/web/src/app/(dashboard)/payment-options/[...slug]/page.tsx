import React from 'react';
import { 
  CreditCard, 
  FileCheck, 
  CheckCircle, 
  Plus 
} from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';

export function generateStaticParams() {
  return [
    { slug: ['financing'] },
    { slug: ['activity'] },
    { slug: ['payments'] },
    { slug: ['settings'] },
  ];
}

interface Props {
  params: {
    slug?: string[];
  };
}

export default function PaymentOptionsCatchAllPage({ params }: Props) {
  const leafSegment = params.slug?.[params.slug.length - 1] || 'financing';

  const formatTitle = (slug: string) => {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const pageTitle = formatTitle(leafSegment);

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* Page Header */}
      <PageHeader 
        title={`Payment Options ${pageTitle}`} 
        subtitle={`Manage ${pageTitle.toLowerCase()} forms, rates, and financing partner integrations.`}
        icon={CreditCard}
        actions={
          <Button variant="danger" className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>New Application</span>
          </Button>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 font-medium">Active Applications</div>
          <div className="text-2xl font-bold text-slate-800">24</div>
          <div className="text-[11px] text-emerald-600 font-semibold">+4 submitted today</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 font-medium">Approved Financing Volume</div>
          <div className="text-2xl font-bold text-slate-800">$184,500.00</div>
          <div className="text-[11px] text-slate-500">Avg. APR 6.99% - 12.99%</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 font-medium">Primary Lender Partner</div>
          <div className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[#3f6b35]" /> Greensky / Service Finance
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">API Integrated & Synced</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-[#be4646]" /> {pageTitle} Details
        </h2>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
          <p>
            You are currently viewing the <span className="font-semibold text-slate-800">{pageTitle}</span> portal for Apex Field Solutions.
          </p>
          <p>
            Use this section to process customer loan applications, select promotional financing plans (e.g. 0% APR for 12 months, 60-month low monthly payment), and verify lender decisions in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
