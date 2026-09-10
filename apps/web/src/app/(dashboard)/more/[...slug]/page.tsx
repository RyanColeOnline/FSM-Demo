import React from 'react';
import { 
  BookOpen, 
  Files, 
  ClipboardCheck, 
  Package, 
  Clock, 
  Megaphone, 
  Truck, 
  Database,
  Layers
} from 'lucide-react';

export function generateStaticParams() {
  return [
    { slug: ['price-book'] },
    { slug: ['maintenance-plans'] },
    { slug: ['checklists'] },
    { slug: ['parts-catalogs'] },
    { slug: ['time-clock'] },
    { slug: ['marketing'] },
    { slug: ['vehicle-tracking'] },
    { slug: ['data-center'] },
  ];
}

interface Props {
  params: {
    slug?: string[];
  };
}

export default function MoreSubPage({ params }: Props) {
  const currentSubPath = params.slug?.[0] || 'price-book';

  const details: Record<string, { title: string; desc: string; icon: React.ElementType }> = {
    'price-book': { title: 'Price Book', desc: 'Manage service rates, flat-rate pricing, and job packages.', icon: BookOpen },
    'maintenance-plans': { title: 'Maintenance Plans', desc: 'Define membership tiers, annual tune-up plans, and discounts.', icon: Files },
    'checklists': { title: 'Checklists', desc: 'Configure HVAC & Appliance diagnostic checklists for technicians.', icon: ClipboardCheck },
    'parts-catalogs': { title: 'Parts Catalogs', desc: 'Inventory catalog, parts lookup, and supplier SKUs.', icon: Package },
    'time-clock': { title: 'Time Clock', desc: 'Technician time logs, shift tracking, and payroll exports.', icon: Clock },
    'marketing': { title: 'Marketing', desc: 'Customer campaigns, review requests, and service reminders.', icon: Megaphone },
    'vehicle-tracking': { title: 'Vehicle Tracking', desc: 'Fleet GPS location, route efficiency, and vehicle maintenance.', icon: Truck },
    'data-center': { title: 'Data Center', desc: 'System backups, WEX legacy imports, and data exports.', icon: Database },
  };

  const current = details[currentSubPath] || {
    title: `More: ${currentSubPath.replace(/-/g, ' ').toUpperCase()}`,
    desc: 'System settings and extended tools.',
    icon: Layers,
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
          More Dropdown Menu Item
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <p className="text-sm">Content for <span className="font-semibold text-slate-800">{current.title}</span> section.</p>
      </div>
    </div>
  );
}
