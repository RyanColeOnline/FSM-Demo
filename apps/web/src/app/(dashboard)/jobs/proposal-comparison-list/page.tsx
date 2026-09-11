'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Star, Heart, FileText, Search, Info } from 'lucide-react';
import { 
  Checkbox, 
  SearchBar, 
  FilterBar, 
  PageHeader 
} from '@/components/ui';

interface ProposalComparisonRecord {
  id: string;
  customerName: string;
  isStarred?: boolean;
  isFavorite?: boolean;
  comparisonNumber: string;
  name: string;
  proposalCount: string;
  lastModified: string;
  jobNumber: string;
}

const initialComparisons: ProposalComparisonRecord[] = [
  {
    id: 'pc-1',
    customerName: 'Eleanor Vance',
    isStarred: true,
    isFavorite: false,
    comparisonNumber: 'PC-1042',
    name: 'Good / Better / Best HVAC Replacement',
    proposalCount: '3 Proposals',
    lastModified: '8/08/2026',
    jobNumber: '1001',
  },
  {
    id: 'pc-2',
    customerName: 'Magnolia Bay Bistro',
    isStarred: false,
    isFavorite: true,
    comparisonNumber: 'PC-1043',
    name: 'Commercial Walk-in Condenser Options',
    proposalCount: '2 Proposals',
    lastModified: '8/07/2026',
    jobNumber: '1002',
  },
  {
    id: 'pc-3',
    customerName: 'Highland Park Center',
    isStarred: true,
    isFavorite: true,
    comparisonNumber: 'PC-1044',
    name: 'Commercial Multi-Zone System Options',
    proposalCount: '4 Proposals',
    lastModified: '8/06/2026',
    jobNumber: '1004',
  },
  {
    id: 'pc-4',
    customerName: 'Dr. Aris Thorne',
    isStarred: false,
    isFavorite: false,
    comparisonNumber: 'PC-1045',
    name: 'Ductless Mini-Split Tier Comparison',
    proposalCount: '3 Proposals',
    lastModified: '8/05/2026',
    jobNumber: '1003',
  },
];

export default function WexProposalComparisonListPage() {
  const [comparisons, setComparisons] = useState<ProposalComparisonRecord[]>(initialComparisons);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchField, setSearchField] = useState('Proposal Comparison Search');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleStar = (id: string) => {
    setComparisons((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isStarred: !item.isStarred } : item))
    );
  };

  const toggleFavorite = (id: string) => {
    setComparisons((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  const filteredComparisons = comparisons.filter((item) => {
    const matchesSearch =
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.comparisonNumber.includes(searchQuery) ||
      item.jobNumber.includes(searchQuery);

    const matchesFavorite = !showFavoritesOnly || item.isFavorite;

    return matchesSearch && matchesFavorite;
  });

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader title="Jobs Proposal Comparison List" />

      {/* 2. Filter Bar Container (No download buttons/labels) */}
      <FilterBar>
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs w-full">
          {/* Show Favorites Only Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="showFavOnly"
              checked={showFavoritesOnly}
              onChange={(e) => setShowFavoritesOnly(e.target.checked)}
            />
            <label htmlFor="showFavOnly" className="text-xs font-medium text-slate-700 cursor-pointer">
              Show Favorites Only
            </label>
          </div>

          {/* Search Bar Group */}
          <div className="flex items-center border border-slate-300 rounded bg-white px-2.5 py-1 shadow-xs ml-auto">
            <span className="text-xs font-medium text-slate-700 pr-2 border-r border-slate-200 flex items-center gap-1">
              Proposal Comparison Search <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </span>
            <div className="flex items-center pl-2">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>
          </div>
        </div>
      </FilterBar>

      {/* 3. Replicated Proposal Comparison Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-3 py-3">Customer</th>
                <th className="w-8 px-2 py-3 text-center"></th>
                <th className="px-3 py-3">Proposal Comparison #</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Proposals</th>
                <th className="px-3 py-3 cursor-pointer hover:underline whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    Last Modified <span className="text-[10px]">▼</span>
                  </span>
                </th>
                <th className="px-3 py-3">Job #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {filteredComparisons.map((item) => (
                <tr key={item.id} className="bg-white">
                  {/* Customer */}
                  <td className="px-3 py-3.5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleStar(item.id)}
                        className="text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                      </button>
                      <Link
                        href="/customers"
                        className="inline-flex items-center gap-1 text-[#be4646] font-semibold hover:underline"
                      >
                        <span>{item.customerName}</span>
                        <ExternalLink className="w-3 h-3 text-[#be4646]" />
                      </Link>
                    </div>
                  </td>

                  {/* Favorite Heart */}
                  <td className="px-2 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                    </button>
                  </td>

                  {/* Proposal Comparison # */}
                  <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#be4646] font-semibold hover:underline cursor-pointer">
                        {item.comparisonNumber}
                      </span>
                      <span title="PDF Comparison"><FileText className="w-3.5 h-3.5 text-[#be4646]" /></span>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-3.5 text-slate-800 font-medium">
                    {item.name}
                  </td>

                  {/* Proposals */}
                  <td className="px-3 py-3.5 text-slate-600 font-medium">
                    {item.proposalCount}
                  </td>

                  {/* Last Modified */}
                  <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                    {item.lastModified}
                  </td>

                  {/* Job # */}
                  <td className="px-3 py-3.5 font-medium whitespace-nowrap">
                    <Link
                      href={`/jobs/${item.jobNumber}`}
                      className="inline-flex items-center gap-1 text-[#be4646] font-semibold hover:underline"
                    >
                      <span>{item.jobNumber}</span>
                      <ExternalLink className="w-3 h-3 text-[#be4646]" />
                    </Link>
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
