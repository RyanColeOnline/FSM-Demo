'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Trash2 } from 'lucide-react';
import { Button, Checkbox } from '@/components/ui';
import { CanonicalWarranty, CanonicalWarrantyType } from '@murphys/domain';

export type WarrantyRecord = CanonicalWarranty;

interface WarrantyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (warrantyData: {
    name: string;
    type: CanonicalWarrantyType;
    length: string;
    description: string;
    isextended: boolean;
  }) => void;
  onDelete?: (id: string) => void;
  editingWarranty?: CanonicalWarranty | null;
}

export function WarrantyFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingWarranty,
}: WarrantyFormModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('Contractor (Labor)');
  const [lengthNum, setLengthNum] = useState('1');
  const [description, setDescription] = useState('');
  const [isExtended, setIsExtended] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Prepopulate form when editing or reset when adding
  useEffect(() => {
    if (editingWarranty) {
      setName(editingWarranty.name || '');
      setType(editingWarranty.type || 'Contractor (Labor)');
      // Extract numeric value from length e.g. "1 (years)" -> "1"
      const match = (editingWarranty.length || '').match(/\d+/);
      setLengthNum(match ? match[0] : '1');
      setDescription(editingWarranty.description || '');
      setIsExtended(editingWarranty.isextended || false);
    } else {
      setName('');
      setType('Contractor (Labor)');
      setLengthNum('1');
      setDescription('');
      setIsExtended(false);
    }
    setIsConfirmDeleteOpen(false);
  }, [editingWarranty, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      type,
      length: `${lengthNum} (years)`,
      description: description.trim() || 'Standard equipment warranty coverage.',
      isextended: isExtended,
    });
  };

  const handleConfirmDelete = () => {
    if (editingWarranty && onDelete) {
      onDelete(editingWarranty.id);
      setIsConfirmDeleteOpen(false);
      onClose();
    }
  };

  return (
    <>
      {/* Main Warranty Form Modal */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 overflow-y-auto flex items-start justify-center pt-[10vh] pb-10 p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
          
          {/* Modal Header */}
          <div className="bg-slate-100/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#be4646]" /> 
              <span>{editingWarranty ? 'Edit Warranty' : 'Add New Warranty'}</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Warranty Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium text-slate-800"
                >
                  <option value="Contractor (Labor)">Contractor (Labor)</option>
                  <option value="Manufacturer (Parts)">Manufacturer (Parts)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Length (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={lengthNum}
                  onChange={(e) => setLengthNum(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none "
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="isExtendedWarrantyCheck"
                checked={isExtended}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsExtended(e.target.checked)}
              />
              <label htmlFor="isExtendedWarrantyCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Is Extended Warranty
              </label>
            </div>

            {/* Footer with Delete on Left and Actions on Right */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-200">
              {/* Bottom Left: Delete Button (Only shown when editing an existing warranty) */}
              <div>
                {editingWarranty && onDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmDeleteOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}
              </div>

              {/* Bottom Right: Cancel & Save */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold"
                >
                  {editingWarranty ? 'Save Changes' : 'Save Warranty'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xs z-[60] flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            {/* Confirmation Header */}
            <div className="bg-slate-100/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Delete Warranty</h3>
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Confirmation Body */}
            <div className="p-6 space-y-4">
              <p className="text-slate-700 text-xs leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-900">&quot;{editingWarranty?.name}&quot;</span>? This action cannot be undone.
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="px-4 py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 text-xs font-semibold"
                >
                  Delete Warranty
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
