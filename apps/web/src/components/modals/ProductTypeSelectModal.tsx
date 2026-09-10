'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProductType } from '@/data/priceBookStore';

interface ProductTypeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: ProductType) => void;
}

export function ProductTypeSelectModal({
  isOpen,
  onClose,
  onSelectType,
}: ProductTypeSelectModalProps) {
  // Default to the first option with NO placeholder
  const [selectedType, setSelectedType] = useState<ProductType>('Product - Single Part Only');

  if (!isOpen) return null;

  const handleNext = () => {
    onSelectType(selectedType);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header: Clean title matching screenshot */}
        <div className="bg-slate-100/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">New Product</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Select Product Type * (NO PLACEHOLDER) */}
        <div className="p-6 space-y-5 text-xs">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Select Product Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ProductType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none font-medium cursor-pointer"
              >
                <option value="Product - Single Part Only">Product - Single Part Only</option>
                <option value="Product - Labor/Service Only">Product - Labor/Service Only</option>
                <option value="Product Bundle - Multi Item Group">Product Bundle - Multi Item Group</option>
                <option value="Discount">Discount</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-4 py-1.5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleNext}
              className="gap-1 px-4 py-1.5 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
