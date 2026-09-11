'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ExternalLink, 
  Calendar,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { PdfDocumentViewerModal } from '@/components/modals/PdfDocumentViewerModal';

function StripeWordmark({ className = "h-4 w-auto", fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg 
      viewBox="0 0 360 150" 
      className={className} 
      fill={fill} 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Stripe"
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M360 77.4001C360 51.8001 347.6 31.6001 323.9 31.6001C300.1 31.6001 285.7 51.8001 285.7 77.2001C285.7 107.3 302.7 122.5 327.1 122.5C339 122.5 348 119.8 354.8 116V96.0001C348 99.4001 340.2 101.5 330.3 101.5C320.6 101.5 312 98.1001 310.9 86.3001H359.8C359.8 85.0001 360 79.8001 360 77.4001ZM310.6 67.9001C310.6 56.6001 317.5 51.9001 323.8 51.9001C329.9 51.9001 336.4 56.6001 336.4 67.9001H310.6Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M247.1 31.6001C237.3 31.6001 231 36.2001 227.5 39.4001L226.2 33.2001H204.2V149.8L229.2 144.5L229.3 116.2C232.9 118.8 238.2 122.5 247 122.5C264.9 122.5 281.2 108.1 281.2 76.4001C281.1 47.4001 264.6 31.6001 247.1 31.6001ZM241.1 100.5C235.2 100.5 231.7 98.4001 229.3 95.8001L229.2 58.7001C231.8 55.8001 235.4 53.8001 241.1 53.8001C250.2 53.8001 256.5 64.0001 256.5 77.1001C256.5 90.5001 250.3 100.5 241.1 100.5Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M169.8 25.7L194.9 20.3V0L169.8 5.3V25.7Z" />
      <path d="M194.9 33.3H169.8V120.8H194.9V33.3Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M142.9 40.7L141.3 33.3H119.7V120.8H144.7V61.5C150.6 53.8 160.6 55.2 163.7 56.3V33.3C160.5 32.1 148.8 29.9 142.9 40.7Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M92.8999 11.6001L68.4999 16.8001L68.3999 96.9001C68.3999 111.7 79.4999 122.6 94.2999 122.6C102.5 122.6 108.5 121.1 111.8 119.3V99.0001C108.6 100.3 92.7999 104.9 92.7999 90.1001V54.6001H111.8V33.3001H92.7999L92.8999 11.6001Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M25.3 58.7001C25.3 54.8001 28.5 53.3001 33.8 53.3001C41.4 53.3001 51 55.6001 58.6 59.7001V36.2001C50.3 32.9001 42.1 31.6001 33.8 31.6001C13.5 31.6001 0 42.2001 0 59.9001C0 87.5001 38 83.1001 38 95.0001C38 99.6001 34 101.1 28.4 101.1C20.1 101.1 9.5 97.7001 1.1 93.1001V116.9C10.4 120.9 19.8 122.6 28.4 122.6C49.2 122.6 63.5 112.3 63.5 94.4001C63.4 64.6001 25.3 69.9001 25.3 58.7001Z" />
    </svg>
  );
}

export interface ProcessingStatement {
  id: string;
  fileId: string;
  filename: string;
  monthYear?: string;
  provider: 'Stripe' | 'Merchant Archive' | string;
  type: string;
  downloadUrl?: string;
  fileSize?: string;
  status: string;
  isLegacy: boolean;
  year: string;
  viewUrl?: string;
}

const defaultStripeStatements: ProcessingStatement[] = [
  {
    id: 'stmt-stripe-2026-08',
    fileId: 'file_stripe_2026_08',
    filename: 'monthly_processing_statement_august_2026.pdf',
    monthYear: 'August 2026',
    provider: 'Stripe',
    type: 'Monthly Processing',
    fileSize: '1.6 MB',
    status: 'Ready',
    isLegacy: false,
    year: '2026',
    viewUrl: '#',
  },
  {
    id: 'stmt-stripe-2026-07',
    fileId: 'file_stripe_2026_07',
    filename: 'monthly_processing_statement_july_2026.pdf',
    monthYear: 'July 2026',
    provider: 'Stripe',
    type: 'Monthly Processing',
    fileSize: '1.8 MB',
    status: 'Ready',
    isLegacy: false,
    year: '2026',
    viewUrl: '#',
  },
  {
    id: 'stmt-stripe-2026-06',
    fileId: 'file_stripe_2026_06',
    filename: 'monthly_processing_statement_june_2026.pdf',
    monthYear: 'June 2026',
    provider: 'Stripe',
    type: 'Monthly Processing',
    fileSize: '1.5 MB',
    status: 'Ready',
    isLegacy: false,
    year: '2026',
    viewUrl: '#',
  },
  {
    id: 'stmt-stripe-2025-1099k',
    fileId: 'file_stripe_2025_1099k',
    filename: 'form_1099k_tax_year_2025.pdf',
    monthYear: 'Annual Tax 2025',
    provider: 'Stripe',
    type: '1099-K Tax Form',
    fileSize: '840 KB',
    status: 'Ready',
    isLegacy: false,
    year: '2025',
    viewUrl: '#',
  },
];

const legacyMockStatements: ProcessingStatement[] = [
  {
    id: 'stmt-legacy-2025-12',
    fileId: 'file_legacy_2025_12',
    filename: 'merchant_payout_statement_december_2025.pdf',
    monthYear: 'December 2025',
    provider: 'Merchant Archive',
    type: 'Monthly Processing',
    downloadUrl: '#',
    fileSize: '2.0 MB',
    status: 'Ready',
    isLegacy: true,
    year: '2025',
    viewUrl: '#',
  },
  {
    id: 'stmt-legacy-2024-09',
    fileId: 'file_legacy_2024_09',
    filename: 'merchant_payout_statement_september_2024.pdf',
    monthYear: 'September 2024',
    provider: 'Merchant Archive',
    type: 'Monthly Processing',
    downloadUrl: '#',
    fileSize: '980 KB',
    status: 'Ready',
    isLegacy: true,
    year: '2024',
    viewUrl: '#',
  },
];

function formatStatementLabel(stmt: ProcessingStatement): string {
  const fn = stmt.filename.toLowerCase();

  // Pattern: monthly_processing_statement_july_2026.pdf
  if (fn.includes('processing_statement') || fn.includes('monthly_processing')) {
    const match = fn.match(/([a-z]+)_(\d{4})/i);
    if (match && match[1] && match[2]) {
      const month = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      return `${month} ${match[2]} Processing Statement`;
    }
  }

  // Pattern: 1099-K tax forms
  if (fn.includes('1099k') || fn.includes('1099-k') || fn.includes('tax')) {
    const match = fn.match(/(\d{4})/);
    const year = match ? match[1] : '2025';
    return `${year} 1099-K Tax Form`;
  }

  // Fallback using monthYear
  if (stmt.monthYear) {
    return `${stmt.monthYear} Processing Statement`;
  }

  return stmt.filename
    .replace(/\.pdf$/i, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function WexStatementsPage() {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  // Default: Only Stripe Processing Documents expanded, Legacy collapsed
  const [isStripeGroupOpen, setIsStripeGroupOpen] = useState<boolean>(true);
  const [isLegacyGroupOpen, setIsLegacyGroupOpen] = useState<boolean>(false);
  const [stripeStatements, setStripeStatements] = useState<ProcessingStatement[]>(defaultStripeStatements);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Shared PDF Viewer Modal state
  const [viewingStatement, setViewingStatement] = useState<ProcessingStatement | null>(null);

  const fetchStripeStatements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stripe/statements');
      if (res.ok) {
        const data = await res.json();
        if (data.statements && Array.isArray(data.statements)) {
          const formatted: ProcessingStatement[] = data.statements.map((s: any) => ({
            id: s.id,
            fileId: s.fileId || s.id,
            filename: s.filename,
            monthYear: s.monthYear || 'Monthly Processing',
            provider: 'Stripe',
            type: s.reportType || 'Monthly Processing',
            fileSize: s.fileSize || '1.4 MB',
            status: s.status || 'Ready',
            isLegacy: false,
            year: s.year || '2026',
            viewUrl: s.viewUrl || `/api/stripe/statements/${s.fileId || s.id}/view`,
          }));
          setStripeStatements(formatted);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Stripe statements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStripeStatements();
  }, []);

  const filteredStripeStatements = stripeStatements.filter(
    (stmt) => selectedYear === 'All' || stmt.year === selectedYear
  );

  const filteredLegacyStatements = legacyMockStatements.filter(
    (stmt) => selectedYear === 'All' || stmt.year === selectedYear
  );

  const handleOpenPdfViewer = (stmt: ProcessingStatement) => {
    setViewingStatement(stmt);
  };

  return (
    <div className="w-full space-y-6 text-slate-800 pb-16 font-sans">
      {/* 1. Modern Header & Quick-Action Button */}
      <PageHeader
        title="Statements & Financial Documents"
        subtitle="Access monthly processing statements, 1099-K tax documents, and historical merchant archives."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStripeStatements}
              disabled={isLoading}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Refresh Stripe Statements"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#635bff]' : ''}`} />
            </button>

            {/* Direct active new tab link to Stripe Dashboard (icon only on right) */}
            <a
              href="https://dashboard.stripe.com/reports"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-[#635bff] hover:bg-[#534be5] text-white text-xs font-semibold rounded-lg shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Open Full Stripe Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/80" />
            </a>
          </div>
        }
      />

      {/* 2. Quick Year Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Filter by Year:</span>
          {['All', '2026', '2025', '2024'].map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedYear === year
                  ? 'bg-purple-50 text-[#635bff] border border-purple-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredStripeStatements.length + filteredLegacyStatements.length}</span> statement document(s)
        </div>
      </div>

      {/* 3. Group 1: Stripe Processing Documents (Stripe Logo Wordmark in Header) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Stripe Purple Expandable Header */}
        <button
          type="button"
          onClick={() => setIsStripeGroupOpen(!isStripeGroupOpen)}
          className="w-full bg-[#635bff] text-white px-4 h-[44px] font-bold text-xs flex items-center justify-between hover:bg-[#534be5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isStripeGroupOpen ? 'rotate-90' : 'rotate-0'}`} />
            {/* Stripe official wordmark SVG floating cleanly by itself */}
            <StripeWordmark className="h-[24px] w-auto fill-white" fill="white" />
          </div>
        </button>

        {/* Statement Rows (Clean: Single masked clickable label only) */}
        {isStripeGroupOpen && (
          <div className="divide-y divide-slate-200">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#635bff]" />
                <span>Loading statements from Stripe Reporting API...</span>
              </div>
            ) : filteredStripeStatements.length > 0 ? (
              filteredStripeStatements.map((stmt) => (
                <div 
                  key={stmt.id} 
                  className="px-5 py-3.5 bg-white text-xs"
                >
                  {/* Masked statement title linking to PDF viewer */}
                  <button
                    type="button"
                    onClick={() => handleOpenPdfViewer(stmt)}
                    className="font-semibold text-[#635bff] text-sm hover:underline hover:text-[#534be5] cursor-pointer text-left block"
                  >
                    {formatStatementLabel(stmt)}
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                No Stripe statements found for year {selectedYear}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Group 2: Legacy Statements (CardConnect / WEX FSM Accordion with Chevron) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Accordion Group Header (Collapsed by default, Chevron rotation) */}
        <button
          type="button"
          onClick={() => setIsLegacyGroupOpen(!isLegacyGroupOpen)}
          className="w-full bg-slate-700 text-white px-4 h-[44px] font-bold text-xs flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isLegacyGroupOpen ? 'rotate-90' : 'rotate-0'}`} />
            <span className="text-sm font-semibold">Historical Merchant Processing Archives</span>
          </div>
        </button>

        {/* Statement Rows */}
        {isLegacyGroupOpen && (
          <div className="divide-y divide-slate-200">
            {filteredLegacyStatements.length > 0 ? (
              filteredLegacyStatements.map((stmt) => (
                <div 
                  key={stmt.id} 
                  className="px-5 py-3.5 bg-white text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenPdfViewer(stmt)}
                    className="font-semibold text-slate-700 text-sm hover:underline hover:text-slate-900 cursor-pointer text-left block"
                  >
                    {formatStatementLabel(stmt)}
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                No legacy statements found for year {selectedYear}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Shared Official PDF Viewer Modal */}
      {viewingStatement && (
        <PdfDocumentViewerModal
          isOpen={viewingStatement !== null}
          onClose={() => setViewingStatement(null)}
          documentType="Statement"
          filename={viewingStatement.filename}
          pdfUrl={viewingStatement.viewUrl || `/api/stripe/statements/${viewingStatement.fileId}/view`}
          customerName="Apex Merchant Statement"
          billToCustomer="Apex Field Solutions LLC"
          issueDate={viewingStatement.monthYear || 'August 2026'}
          status={viewingStatement.status}
          amount="$148,290.50"
        />
      )}
    </div>
  );
}
