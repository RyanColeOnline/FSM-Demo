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

export default async function PaymentOptionsCatchAllPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const resolvedParams = await params;
  const rootSegment = resolvedParams.slug?.[0] || 'financing';
  const leafSegment = resolvedParams.slug?.[resolvedParams.slug.length - 1] || 'financing';
  const isFinancing = rootSegment === 'financing';

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
        subtitle={isFinancing ? 'Financing integrations and loan applications are disabled in this demo.' : `Manage ${pageTitle.toLowerCase()} forms, rates, and payment integrations.`}
        icon={CreditCard}
        actions={
          <Button variant="danger" className="gap-1.5" disabled={isFinancing}>
            <Plus className="w-4 h-4" />
            <span>New Application</span>
          </Button>
        }
      />

      {/* Main Content Area */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-[#be4646]" /> {pageTitle} Details
        </h2>

        {isFinancing ? (
          <div className="p-5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-2">
            <p className="font-semibold text-amber-900">
              Financing options are currently disabled.
            </p>
            <p>
              Customer financing, loan options, and lender partner integrations (e.g. GreenSky, Service Finance) are disabled in this demo environment.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
            <p>
              You are currently viewing the <span className="font-semibold text-slate-800">{pageTitle}</span> portal for FSM Demo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
