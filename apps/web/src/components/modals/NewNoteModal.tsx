'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Info, 
  Bell, 
  BellOff,
  Trash2
} from 'lucide-react';

export interface LocationOption {
  id?: string;
  label?: string;
  addr1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface NewNoteData {
  text: string;
  location: string;
  isPinned: boolean;
}

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewNoteData) => void;
  onDelete?: () => void;
  locations?: Array<string | LocationOption>;
  defaultLocation?: string;
  initialText?: string;
  initialLocation?: string;
  initialIsPinned?: boolean;
  title?: string;
  submitLabel?: string;
}

export function NewNoteModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  locations = [],
  defaultLocation = '',
  initialText = '',
  initialLocation = '',
  initialIsPinned = false,
  title = 'New Note',
  submitLabel = 'Save',
}: NewNoteModalProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || defaultLocation);
  const [noteText, setNoteText] = useState(initialText);
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [showBellTooltip, setShowBellTooltip] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedLocation(initialLocation || defaultLocation);
      setNoteText(initialText || '');
      setIsPinned(initialIsPinned || false);
      setShowBellTooltip(false);
    }
  }, [isOpen, defaultLocation, initialText, initialLocation, initialIsPinned]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onSave({
      text: noteText.trim(),
      location: selectedLocation,
      isPinned,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans text-xs flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-sm text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form id="new-note-modal-form" onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
          {/* Related Location(s) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span>Related Location(s)</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#be4646] cursor-pointer"
            >
              <option value="">Select location (optional)...</option>
              {locations.map((loc, idx) => {
                if (typeof loc === 'string') {
                  return (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  );
                }
                const formatted = loc.label || `${loc.addr1 || ''}, ${loc.city || ''} ${loc.state || ''} ${loc.zip || ''}`.trim();
                return (
                  <option key={loc.id || idx} value={formatted}>
                    {formatted}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Clean Textarea with Placeholder "Enter Note" and No Rich Editing Toolbar */}
          <div className="space-y-1.5">
            <textarea
              id="new-note-textarea"
              required
              rows={6}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#be4646] focus:border-[#be4646] resize-y min-h-[140px] transition-all"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Bell Icon Button (Matching Save Button Height, with BellOff when inactive and Bell when active) */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => setIsPinned((prev) => !prev)}
                onMouseEnter={() => setShowBellTooltip(true)}
                onMouseLeave={() => setShowBellTooltip(false)}
                className={`h-8 w-8 rounded transition-all cursor-pointer border flex items-center justify-center ${
                  isPinned
                    ? 'bg-[#be4646] hover:bg-[#a63a3a] text-white border-[#be4646] shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-300'
                }`}
                title="Pin Note"
              >
                {isPinned ? (
                  <Bell className="w-4 h-4 fill-current text-white" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Hover Tooltip Popup over the button */}
              {showBellTooltip && (
                <div className="absolute bottom-full right-0 mb-2 w-72 p-2.5 bg-slate-900 text-white text-[11px] rounded-md shadow-xl z-50 leading-snug animate-in fade-in duration-150 pointer-events-none">
                  Note will be pinned to the top of the customer&apos;s timeline and will appear on customer&apos;s jobs for related location(s).
                  <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-900" />
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              form="new-note-modal-form"
              disabled={!noteText.trim()}
              className="h-8 px-6 bg-[#be4646] hover:bg-[#a63a3a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
