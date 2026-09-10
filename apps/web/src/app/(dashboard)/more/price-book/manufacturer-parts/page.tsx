'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/ui';

interface ManufacturerPartRecord {
  id: string;
  partName: string;
  manufacturerBrand?: string | null;
  supplier?: string | null;
  modelNumber?: string | null;
  warranty?: string | null;
  type?: string | null;
  cost: string;
  isSerialized: boolean;
  isInventoriable: boolean;
}

const initialManufacturerParts: ManufacturerPartRecord[] = [
  {
    id: 'mp-1',
    partName: 'Example Part-ALL-PARTS',
    manufacturerBrand: 'Example Manufacturer',
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: true,
    isInventoriable: false,
  },
  {
    id: 'mp-2',
    partName: 'Example Equipment-ALL-PARTS',
    manufacturerBrand: 'Example Manufacturer',
    supplier: null,
    modelNumber: null,
    warranty: '10-year Manufacturer Warranty',
    type: null,
    cost: '$0.00',
    isSerialized: true,
    isInventoriable: false,
  },
  {
    id: 'mp-3',
    partName: 'Example Diagnostic Fee-ALL-PARTS',
    manufacturerBrand: 'Example Manufacturer',
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-4',
    partName: 'Example Trip Charge-ALL-PARTS',
    manufacturerBrand: 'Example Manufacturer',
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-5',
    partName: 'Example Commercial Part-ALL-PARTS',
    manufacturerBrand: 'Example Manufacturer',
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: true,
    isInventoriable: false,
  },
  {
    id: 'mp-6',
    partName: 'Example Commercial Equipment-ALL-PARTS',
    manufacturerBrand: 'Example Manufacturer',
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: true,
    isInventoriable: false,
  },
  {
    id: 'mp-7',
    partName: 'Part',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-8',
    partName: 'Filter',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-9',
    partName: 'Level 1 Repair',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-10',
    partName: 'Level 2 Repair',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-11',
    partName: 'Level 3 Repair',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-12',
    partName: 'Level 4 Repair',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-13',
    partName: 'R22',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-14',
    partName: 'R410A',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
  {
    id: 'mp-15',
    partName: 'Refrigerant',
    manufacturerBrand: null,
    supplier: null,
    modelNumber: null,
    warranty: null,
    type: null,
    cost: '$0.00',
    isSerialized: false,
    isInventoriable: false,
  },
];

export default function PriceBookManufacturerPartsPage() {
  const [parts, setParts] = useState<ManufacturerPartRecord[]>(initialManufacturerParts);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParts = parts.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.manufacturerBrand && item.manufacturerBrand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.modelNumber && item.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full space-y-5 text-slate-800 pb-16 font-sans">
      {/* 1. Top Header with Exact WEX Title Font Styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
          <span className="font-bold text-[#2e4057] italic text-2xl">More Applications</span>
          <span className="font-normal text-[#5b708b] not-italic text-xl">Price Book, Manufacturer Parts</span>
        </h1>

        {/* Top Right Search Bar */}
        <div className="flex items-center border border-slate-300 rounded bg-white px-3 py-1.5 shadow-xs w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search Manufacturer Item Model # or Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
          />
        </div>
      </div>

      {/* 2. Manufacturer Parts Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-4 py-3">Part Name</th>
                <th className="px-4 py-3">Manufacturer Brand</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Model #</th>
                <th className="px-4 py-3">Warranty</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Serialized</th>
                <th className="px-4 py-3">Inventoriable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {filteredParts.map((item) => (
                <tr key={item.id} className="bg-white">
                  {/* Part Name */}
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <span className="text-[#be4646] font-semibold hover:underline cursor-pointer">
                      {item.partName}
                    </span>
                  </td>

                  {/* Manufacturer Brand */}
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {item.manufacturerBrand || ''}
                  </td>

                  {/* Supplier */}
                  <td className="px-4 py-3 text-slate-600">
                    {item.supplier || ''}
                  </td>

                  {/* Model # */}
                  <td className="px-4 py-3 text-slate-600">
                    {item.modelNumber || ''}
                  </td>

                  {/* Warranty */}
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                    {item.warranty || ''}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 text-slate-600">
                    {item.type || ''}
                  </td>

                  {/* Cost */}
                  <td className="px-4 py-3 text-slate-800">
                    {item.cost}
                  </td>

                  {/* Serialized */}
                  <td className="px-4 py-3 text-slate-700">
                    {item.isSerialized ? 'Yes' : 'No'}
                  </td>

                  {/* Inventoriable */}
                  <td className="px-4 py-3 text-slate-700">
                    {item.isInventoriable ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
