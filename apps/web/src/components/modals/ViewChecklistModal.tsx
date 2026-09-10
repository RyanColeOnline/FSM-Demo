'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bold, 
  Italic, 
  Underline, 
  Eraser, 
  List, 
  ListOrdered, 
  Check, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui';
import { 
  ChecklistDefinition, 
  ChecklistItemDefinition, 
  JobChecklistInstance, 
  defaultChecklistDefinitions 
} from '@/data/checklistsData';
import { mockAssignees } from '@/components/modals/EditFollowUpFlagModal';

interface ViewChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: JobChecklistInstance | null;
  onSave: (updatedChecklist: JobChecklistInstance) => void;
}

export function ViewChecklistModal({
  isOpen,
  onClose,
  checklist,
  onSave,
}: ViewChecklistModalProps) {
  // Find matching definition or fallback to default
  const definition = checklist
    ? defaultChecklistDefinitions.find(
        (d) => d.id === checklist.definitionId || d.name.toLowerCase() === checklist.name.toLowerCase()
      ) || defaultChecklistDefinitions[0]
    : defaultChecklistDefinitions[0];

  // Local state for values, checked, and skipped status
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [valuesMap, setValuesMap] = useState<Record<string, string>>({});
  const [skippedMap, setSkippedMap] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [completedBy, setCompletedBy] = useState<string>('Justin Dunlap');

  // Populate from checklist instance
  useEffect(() => {
    if (checklist) {
      // Default initial checks and values from definition if not already present
      const initialChecked: Record<string, boolean> = { ...(checklist.checkedItems || {}) };
      const initialValues: Record<string, string> = { ...(checklist.savedValues || {}) };
      const initialSkipped: Record<string, boolean> = { ...(checklist.skippedItems || {}) };

      definition.items.forEach((item) => {
        if (initialValues[item.id] === undefined && item.defaultValue) {
          initialValues[item.id] = item.defaultValue;
          initialChecked[item.id] = true;
        }
      });

      setCheckedMap(initialChecked);
      setValuesMap(initialValues);
      setSkippedMap(initialSkipped);
      setComments(checklist.comments || 'System inspected and operational. Airflow and electrical readings tested within manufacturer specifications.');
      setCustomerName(checklist.customerSignatureName || 'Pamela Witt');
      setCustomerSignature(checklist.customerSignature || 'Pamela Witt');
      setCompletedBy(checklist.completedBy || 'Justin Dunlap');
    }
  }, [checklist, definition]);

  if (!isOpen || !checklist) return null;

  const handleToggleCheck = (itemId: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleValueChange = (itemId: string, val: string) => {
    setValuesMap((prev) => ({
      ...prev,
      [itemId]: val,
    }));
    // Auto check item when value is entered/selected
    if (val.trim() !== '') {
      setCheckedMap((prev) => ({ ...prev, [itemId]: true }));
      // Remove skipped if answered
      setSkippedMap((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleToggleSkip = (itemId: string) => {
    setSkippedMap((prev) => {
      const nextSkipped = !prev[itemId];
      if (nextSkipped) {
        // Uncheck if skipped
        setCheckedMap((c) => ({ ...c, [itemId]: false }));
      }
      return { ...prev, [itemId]: nextSkipped };
    });
  };

  const handleSave = () => {
    const totalItems = definition.items.length;
    let completedCount = 0;

    definition.items.forEach((item) => {
      if (checkedMap[item.id] || (valuesMap[item.id] && valuesMap[item.id].trim() !== '')) {
        completedCount++;
      }
    });

    const status: JobChecklistInstance['status'] = 
      completedCount >= totalItems
        ? 'Completed'
        : completedCount > 0
        ? 'In Progress'
        : 'Incomplete';

    const updated: JobChecklistInstance = {
      ...checklist,
      itemsCompleted: `${completedCount}/${totalItems}`,
      status,
      savedValues: valuesMap,
      checkedItems: checkedMap,
      skippedItems: skippedMap,
      comments,
      customerSignatureName: customerName,
      customerSignature,
      completedBy,
      completedAt: new Date().toLocaleDateString('en-US'),
    };

    onSave(updated);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 font-sans text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================
            1. MODAL HEADER (Matching WEX Design)
           ======================================================== */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {checklist.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            2. SCROLLABLE MODAL BODY
           ======================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Checklist Items Table / List */}
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
            {definition.items.map((item, idx) => {
              const isChecked = !!checkedMap[item.id];
              const isSkipped = !!skippedMap[item.id];
              const value = valuesMap[item.id] || '';

              return (
                <div 
                  key={item.id}
                  className={`px-4 py-3 flex items-center justify-between gap-4 transition-colors ${
                    isSkipped ? 'bg-slate-50/75 opacity-70' : isChecked ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Left: Checkbox + Question Label */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <Checkbox
                      checked={isChecked}
                      onChange={() => handleToggleCheck(item.id)}
                      disabled={isSkipped}
                    />
                    <span className={`font-medium text-xs text-slate-800 truncate ${isSkipped ? 'line-through text-slate-400' : ''}`}>
                      {item.label}
                    </span>
                  </div>

                  {/* Right: Dropdown / Data Input + Skip Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    {item.inputType === 'Multiple Choice' && item.options ? (
                      <select
                        value={value}
                        onChange={(e) => handleValueChange(item.id, e.target.value)}
                        disabled={isSkipped}
                        className="h-8 px-3 bg-white border border-slate-300 rounded text-xs text-slate-700 min-w-[200px] max-w-[240px] focus:outline-none focus:ring-1 focus:ring-[#2d82b7] font-medium cursor-pointer shadow-2xs"
                      >
                        <option value="">Select Option</option>
                        {item.options.map((opt) => (
                          <option key={opt.id} value={opt.text}>
                            {opt.text}
                          </option>
                        ))}
                      </select>
                    ) : item.inputType === 'Pass/Fail' ? (
                      <select
                        value={value}
                        onChange={(e) => handleValueChange(item.id, e.target.value)}
                        disabled={isSkipped}
                        className="h-8 px-3 bg-white border border-slate-300 rounded text-xs text-slate-700 min-w-[200px] max-w-[240px] focus:outline-none focus:ring-1 focus:ring-[#2d82b7] font-medium cursor-pointer shadow-2xs"
                      >
                        <option value="">Select Option</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="N/A">N/A</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleValueChange(item.id, e.target.value)}
                        disabled={isSkipped}
                        className="h-8 px-3 bg-white border border-slate-300 rounded text-xs text-slate-700 min-w-[200px] max-w-[240px] focus:outline-none focus:ring-1 focus:ring-[#2d82b7] shadow-2xs"
                      />
                    )}

                    {/* Skip Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleSkip(item.id)}
                      className={`text-xs font-semibold px-2 py-1 transition-colors cursor-pointer ${
                        isSkipped 
                            ? 'text-slate-500 underline font-bold' 
                            : 'text-[#be4646] hover:underline'
                      }`}
                      title={isSkipped ? 'Unskip Item' : 'Skip this Item'}
                    >
                      {isSkipped ? 'Skipped' : 'Skip'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================
              COMMENTS RICH TEXT AREA (Matching Screenshot 2)
             ======================================================== */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-bold text-slate-800">
              Comments
            </label>
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
              {/* Rich Text Toolbar */}
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-slate-700">
                <button type="button" className="p-1 rounded hover:bg-slate-200 transition-colors" title="Bold">
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1 rounded hover:bg-slate-200 transition-colors" title="Italic">
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1 rounded hover:bg-slate-200 transition-colors" title="Underline">
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1 rounded hover:bg-slate-200 transition-colors" title="Clear Formatting">
                  <Eraser className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-px bg-slate-300" />
                <button type="button" className="p-1 rounded hover:bg-slate-200 transition-colors" title="Bullet List">
                  <List className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1 rounded hover:bg-slate-200 transition-colors" title="Numbered List">
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-3 bg-white text-xs text-slate-800 focus:outline-none resize-y"
              />
            </div>
          </div>

          {/* ========================================================
              CUSTOMER SIGNATURE (Matching Screenshot 2)
             ======================================================== */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-800">
              Customer Signature
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-8 px-3 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">Signature</label>
                <div className="h-8 px-3 bg-slate-50 border border-slate-300 rounded flex items-center justify-between shadow-2xs">
                  <span className="font-serif italic text-slate-800 font-semibold tracking-wide">
                    {customerSignature || customerName || 'Pending Signature'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              COMPLETED BY (Matching Screenshot 2)
             ======================================================== */}
          <div className="space-y-1 pt-2">
            <label className="block text-xs font-bold text-slate-800">
              Completed By
            </label>
            <select
              value={completedBy}
              onChange={(e) => setCompletedBy(e.target.value)}
              className="w-full h-8 px-3 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] font-medium cursor-pointer shadow-2xs"
            >
              {mockAssignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================================
            3. MODAL FOOTER (Matching WEX Design)
           ======================================================== */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-2xs"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
