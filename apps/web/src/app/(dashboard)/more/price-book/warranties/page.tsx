'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { WarrantyFormModal } from '@/components/modals/WarrantyFormModal';
import { useWarranties } from '@/hooks/useWarranties';
import { CanonicalWarranty } from '@murphys/domain';

export default function PriceBookWarrantiesPage() {
  const { warranties, loading, saveWarranty, deleteWarranty } = useWarranties();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<CanonicalWarranty | null>(null);

  // Open modal in Create mode
  const handleOpenAddWarranty = () => {
    setEditingWarranty(null);
    setIsModalOpen(true);
  };

  // Open modal in Edit mode (Prepopulated)
  const handleOpenEditWarranty = (war: CanonicalWarranty) => {
    setEditingWarranty(war);
    setIsModalOpen(true);
  };

  // Save handler (Add or Update)
  const handleSaveWarranty = async (formData: {
    name: string;
    type: string;
    length: string;
    description: string;
    isextended: boolean;
  }) => {
    if (editingWarranty) {
      await saveWarranty({
        ...editingWarranty,
        ...formData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newRecord: CanonicalWarranty = {
        id: `war-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveWarranty(newRecord);
    }
    setIsModalOpen(false);
    setEditingWarranty(null);
  };

  // Delete handler
  const handleDeleteWarranty = async (id: string) => {
    await deleteWarranty(id);
  };

  return (
    <div className="w-full space-y-5 text-slate-800 pb-16 font-sans">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
          <span className="font-bold text-[#2e4057] italic text-2xl">More Applications</span>
          <span className="font-normal text-[#5b708b] not-italic text-xl">Price Book, Warranties</span>
        </h1>

        <button
          type="button"
          onClick={handleOpenAddWarranty}
          className="px-3.5 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white text-xs font-bold rounded shadow-xs inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Warranty</span>
        </button>
      </div>

      {/* 2. Warranties Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Length</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Extended Warranty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {loading && warranties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading warranties from database...
                  </td>
                </tr>
              ) : warranties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No warranties found. Click &quot;+ New Warranty&quot; above to create one.
                  </td>
                </tr>
              ) : (
                warranties.map((war) => (
                  <tr key={war.id} className="bg-white hover:bg-slate-50/70 transition-colors">
                    {/* Name (Clickable link to open prepopulated edit modal) */}
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEditWarranty(war)}
                        className="text-[#be4646] font-semibold hover:underline cursor-pointer text-left"
                      >
                        {war.name}
                      </button>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {war.type}
                    </td>

                    {/* Length */}
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {war.length}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 text-slate-700 max-w-lg">
                      {war.description}
                    </td>

                    {/* Extended Warranty */}
                    <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                      {war.isextended ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Shared Add / Edit Warranty Modal */}
      <WarrantyFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWarranty(null);
        }}
        onSave={handleSaveWarranty}
        onDelete={handleDeleteWarranty}
        editingWarranty={editingWarranty}
      />
    </div>
  );
}
