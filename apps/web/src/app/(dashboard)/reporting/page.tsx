'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Gauge, 
  Search, 
  FileText, 
  BarChart2, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package, 
  Wrench,
  Clock,
  Calendar
} from 'lucide-react';

import { PermissionGuard } from '@/rbac/guards/PermissionGuard';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  href: string;
}

interface ReportCategory {
  title: string;
  reports: ReportItem[];
}

export default function WexReportingPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const categoryColumn1: ReportCategory[] = [
    {
      title: 'Accounting',
      reports: [
        {
          id: 'ar-aging',
          title: 'Accounts Receivable Aging',
          description: 'Outstanding balances by customer and invoice organized by days overdue',
          href: '/reporting/ar-aging',
        },
        {
          id: 'receivables',
          title: 'Receivables',
          description: 'Outstanding balances by customer and invoice',
          href: '/reporting/receivables',
        },
        {
          id: 'tax-drilldown',
          title: 'Tax Collected Drill Down',
          description: 'Detailed view of total taxes by entity, date range, and invoice',
          href: '/reporting/tax-drilldown',
        },
        {
          id: 'tax-liability',
          title: 'Tax Liability',
          description: 'Total taxes by tax entity and date range',
          href: '/reporting/tax-liability',
        },
      ],
    },
    {
      title: 'Customers',
      reports: [
        {
          id: 'customers-report',
          title: 'Customers',
          description: 'View, filter, and manage all customers',
          href: '/customers',
        },
        {
          id: 'email-text-status',
          title: 'Email and Text Delivery Status',
          description: 'Email and text delivery statuses by date, recipient and type.',
          href: '/reporting/email-text-status',
        },
        {
          id: 'maintenance-plans-report',
          title: 'Maintenance Plans',
          description: 'View maintenance plans by customer, plan name, status, and balance',
          href: '/more/maintenance-plans',
        },
        {
          id: 'maintenance-plan-customers',
          title: 'Maintenance Plan Customers',
          description: 'A list of your maintenance plans and maintenance plan customers',
          href: '/reporting/maintenance-plan-customers',
        },
      ],
    },
    {
      title: 'Equipment',
      reports: [
        {
          id: 'equipment-warranty',
          title: 'Equipment & Warranty',
          description: 'Monitor the status of equipment and warranties that have been attached to your customers',
          href: '/reporting/equipment-warranty',
        },
      ],
    },
  ];

  const categoryColumn2: ReportCategory[] = [
    {
      title: 'Jobs',
      reports: [
        {
          id: 'appointments-report',
          title: 'Appointments',
          description: 'Track appointments by status and hours worked',
          href: '/reporting/appointments',
        },
        {
          id: 'appts-service-requests',
          title: 'Appointments & Service Requests',
          description: 'Track appointments and service requests by customer, status, and hours worked',
          href: '/reporting/appts-service-requests',
        },
        {
          id: 'invoice-detail',
          title: 'Invoice Detail',
          description: 'Review, track, and update all invoices by date and status',
          href: '/jobs/invoice-list',
        },
        {
          id: 'job-profit-report',
          title: 'Job Profit Report',
          description: 'A summary and detail view of profit and loss by job',
          href: '/reporting/job-profit',
        },
        {
          id: 'job-summary',
          title: 'Job Summary',
          description: 'View metrics per job including checklist completion, lead source, and # of appointments.',
          href: '/jobs/list',
        },
        {
          id: 'job-summary-appt',
          title: 'Job Summary by Appointment',
          description: 'List of jobs by appointment with type, status, and additional metrics',
          href: '/reporting/job-summary-by-appointment',
        },
        {
          id: 'proposals-report',
          title: 'Proposals',
          description: 'Detailed list of proposals and summary view of close rate',
          href: '/jobs/proposal-list',
        },
        {
          id: 'maint-appt-scheduling',
          title: 'Maintenance Plan Appt. Scheduling',
          description: 'View service windows for all maintenance plans',
          href: '/reporting/maint-plan-scheduling',
        },
      ],
    },
    {
      title: 'Sales',
      reports: [
        {
          id: 'custom-line-item-sales',
          title: 'Custom Line Item Sales',
          description: 'All custom line items created on job forms',
          href: '/reporting/custom-line-item-sales',
        },
        {
          id: 'part-sales',
          title: 'Part Sales',
          description: 'Number of parts sold by date range',
          href: '/reporting/part-sales',
        },
        {
          id: 'product-sales',
          title: 'Product Sales',
          description: 'Price book products sold, total dollar amount invoiced, and cost and margin information',
          href: '/reporting/product-sales',
        },
        {
          id: 'product-sales-by-user',
          title: 'Product Sales by User',
          description: 'Product quantity, total sales amount, and sales detail by user',
          href: '/reporting/product-sales-by-user',
        },
        {
          id: 'recommendations-report',
          title: 'Recommendations',
          description: 'View and manage recommendations made on proposals and invoices for follow up',
          href: '/reporting/recommendations',
        },
        {
          id: 'total-sales',
          title: 'Total Sales',
          description: 'Total sales by date range and job type',
          href: '/reporting/total-sales',
        },
      ],
    },
  ];

  const categoryColumn3: ReportCategory[] = [
    {
      title: 'Users',
      reports: [
        {
          id: 'employee-productivity',
          title: 'Employee Productivity',
          description: 'Actions taken by any employee in relation to the total hours clocked in',
          href: '/reporting/employee-productivity',
        },
        {
          id: 'itemized-events',
          title: 'Itemized Events',
          description: 'Summary and detailed view of scheduled non-work events',
          href: '/reporting/itemized-events',
        },
        {
          id: 'scheduled-vs-actual',
          title: 'Scheduled vs Actual Time',
          description: 'Hours technicians are scheduled in comparison to the actual time logged on appointments',
          href: '/reporting/scheduled-vs-actual',
        },
        {
          id: 'tech-job-performance',
          title: 'Technician Job Performance',
          description: 'Actions taken by technicians in relation to appointments',
          href: '/reporting/tech-performance',
        },
        {
          id: 'time-clock-report',
          title: 'Time Clock',
          description: 'Clock-in and clock-out times by technician by date',
          href: '/more/time-clock',
        },
        {
          id: 'time-clock-total',
          title: 'Time Clock Total',
          description: 'Clock in and clock out times and totals by technician by date',
          href: '/reporting/time-clock-total',
        },
      ],
    },
  ];

  const filterCategory = (categories: ReportCategory[]) => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();

    return categories
      .map((cat) => {
        const filteredReports = cat.reports.filter(
          (rep) =>
            rep.title.toLowerCase().includes(q) ||
            rep.description.toLowerCase().includes(q)
        );
        return { ...cat, reports: filteredReports };
      })
      .filter((cat) => cat.reports.length > 0);
  };

  const filteredCol1 = filterCategory(categoryColumn1);
  const filteredCol2 = filterCategory(categoryColumn2);
  const filteredCol3 = filterCategory(categoryColumn3);

  return (
    <PermissionGuard
      requiredPermission="reportingTabVisibility"
      fallbackMessage="Your account does not have permission to access the Reporting tab."
    >
      <div className="w-full space-y-6 text-slate-800 pb-12 font-sans">
      {/* 1. Top Header */}
      <div className="flex items-center justify-between pt-1 border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-700 italic tracking-tight">
          Reporting
        </h1>
      </div>

      {/* 2. Sub-Header Action & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 pb-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#be4646] font-semibold text-xs rounded border border-slate-300 shadow-2xs transition-colors"
        >
          <Gauge className="w-4 h-4 text-[#be4646]" />
          <span>Go to Dashboard</span>
        </Link>

        <div className="relative">
          <input
            type="text"
            placeholder="Search Reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 3. Report Categories Grid (3 Columns Layout matching screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
        {/* Column 1: Accounting, Customers, Equipment */}
        <div className="space-y-6">
          {filteredCol1.map((category) => (
            <div key={category.title} className="space-y-3">
              <h2 className="text-base font-semibold text-slate-600 border-b border-slate-200 pb-1">
                {category.title}
              </h2>
              <div className="space-y-3 pl-0.5">
                {category.reports.map((report) => (
                  <div key={report.id} className="space-y-0.5">
                    <Link
                      href={report.href}
                      className="inline-block text-[#be4646] font-semibold text-xs hover:underline"
                    >
                      {report.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {report.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Column 2: Jobs, Sales */}
        <div className="space-y-6">
          {filteredCol2.map((category) => (
            <div key={category.title} className="space-y-3">
              <h2 className="text-base font-semibold text-slate-600 border-b border-slate-200 pb-1">
                {category.title}
              </h2>
              <div className="space-y-3 pl-0.5">
                {category.reports.map((report) => (
                  <div key={report.id} className="space-y-0.5">
                    <Link
                      href={report.href}
                      className="inline-block text-[#be4646] font-semibold text-xs hover:underline"
                    >
                      {report.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {report.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Column 3: Users */}
        <div className="space-y-6">
          {filteredCol3.map((category) => (
            <div key={category.title} className="space-y-3">
              <h2 className="text-base font-semibold text-slate-600 border-b border-slate-200 pb-1">
                {category.title}
              </h2>
              <div className="space-y-3 pl-0.5">
                {category.reports.map((report) => (
                  <div key={report.id} className="space-y-0.5">
                    <Link
                      href={report.href}
                      className="inline-block text-[#be4646] font-semibold text-xs hover:underline"
                    >
                      {report.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {report.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </PermissionGuard>
  );
}
