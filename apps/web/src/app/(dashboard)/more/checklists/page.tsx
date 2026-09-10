'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  MinusCircle, 
  X, 
  GripVertical, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Button, Checkbox } from '@/components/ui';
import { useChecklists } from '@/hooks/useChecklists';

// 1. Data Contracts
export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface ChecklistItemRow {
  id: string;
  label: string;
  inputType: 'Short Answer' | 'Multiple Choice' | 'Pass/Fail' | 'Text Area' | 'Photo Upload';
  options?: MultipleChoiceOption[];
}

export interface ChecklistRecord {
  id: string;
  name?: string;
  title?: string;
  itemCount: number;
  autoAdd?: boolean;
  showSignature?: boolean;
  requireSignature?: boolean;
  requireCompletion?: boolean;
  items?: ChecklistItemRow[];
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function WexChecklistsPage() {
  const { templates, loading, saveTemplate, deleteTemplate } = useChecklists();
  
  const activeChecklists = useMemo(() => {
    return (templates as any[]).filter((t) => !t.isArchived);
  }, [templates]);

  const archivedList = useMemo(() => {
    return (templates as any[]).filter((t) => Boolean(t.isArchived));
  }, [templates]);

  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<'general' | 'items'>('general');
  const [editingChecklist, setEditingChecklist] = useState<ChecklistRecord | null>(null);

  // Unsaved Changes Confirmation Modal State
  const [isUnsavedWarningModalOpen, setIsUnsavedWarningModalOpen] = useState<boolean>(false);

  // Form Fields State
  const [formName, setFormName] = useState<string>('');
  const [formAutoAdd, setFormAutoAdd] = useState<boolean>(false);
  const [formShowSignature, setFormShowSignature] = useState<boolean>(true);
  const [formRequireSignature, setFormRequireSignature] = useState<boolean>(false);
  const [formRequireCompletion, setFormRequireCompletion] = useState<boolean>(false);
  const [updateIncompleteInstances, setUpdateIncompleteInstances] = useState<boolean>(false);
  const [formItems, setFormItems] = useState<ChecklistItemRow[]>([]);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Validation: General tab required fields met?
  const isGeneralValid = Boolean(formName.trim());

  // Detect unsaved changes in form
  const isFormDirty = editingChecklist
    ? (
        formName !== (editingChecklist.name || editingChecklist.title || '') ||
        formAutoAdd !== (editingChecklist.autoAdd ?? false) ||
        formShowSignature !== (editingChecklist.showSignature ?? true) ||
        formRequireSignature !== (editingChecklist.requireSignature ?? false) ||
        formRequireCompletion !== (editingChecklist.requireCompletion ?? false)
      )
    : Boolean(
        formName.trim().length > 0 ||
        formItems.some((i) => i.label.trim().length > 0)
      );

  const openNewModal = () => {
    setEditingChecklist(null);
    setFormName('');
    setFormAutoAdd(false);
    setFormShowSignature(true);
    setFormRequireSignature(false);
    setFormRequireCompletion(false);
    setUpdateIncompleteInstances(false);
    setFormItems([
      { id: 'ci-1', label: '', inputType: 'Short Answer' },
    ]);
    setActiveModalTab('general');
    setIsModalOpen(true);
  };

  const openEditModal = (chk: ChecklistRecord) => {
    setEditingChecklist(chk);
    setFormName(chk.name || chk.title || '');
    setFormAutoAdd(chk.autoAdd ?? false);
    setFormShowSignature(chk.showSignature ?? true);
    setFormRequireSignature(chk.requireSignature ?? false);
    setFormRequireCompletion(chk.requireCompletion ?? false);
    setUpdateIncompleteInstances(false);
    setFormItems(
      chk.items && chk.items.length > 0
        ? chk.items.map((it: any) => ({
            id: it.id || `ci-${Date.now()}-${Math.random()}`,
            label: it.label || it.title || it.question || '',
            inputType: it.inputType || (it.valueType === 'multiple_choice' ? 'Multiple Choice' : 'Short Answer'),
            options: it.options && Array.isArray(it.options)
              ? typeof it.options[0] === 'string'
                ? it.options.map((optStr: string, oIdx: number) => ({ id: `opt-${oIdx + 1}`, text: optStr }))
                : it.options
              : it.inputType === 'Multiple Choice'
              ? [
                  { id: 'opt-1', text: 'Option 1' },
                  { id: 'opt-2', text: 'Option 2' },
                ]
              : undefined,
          }))
        : [{ id: 'ci-1', label: 'Inspection Item', inputType: 'Short Answer' }]
    );
    setActiveModalTab('general');
    setIsModalOpen(true);
  };

  // Close request handler: prompts warning if form has unsaved info
  const handleRequestCloseModal = () => {
    if (isFormDirty) {
      setIsUnsavedWarningModalOpen(true);
    } else {
      forceCloseModal();
    }
  };

  const forceCloseModal = () => {
    setIsUnsavedWarningModalOpen(false);
    setIsModalOpen(false);
    setEditingChecklist(null);
  };

  // Keyboard shortcut ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleRequestCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isFormDirty]);

  // ITEM MANAGEMENT FUNCTIONS
  const handleAddModalItem = () => {
    const newItem: ChecklistItemRow = {
      id: `ci-${Date.now()}`,
      label: '',
      inputType: 'Short Answer',
    };
    setFormItems([...formItems, newItem]);
  };

  const handleRemoveModalItem = (id: string) => {
    setFormItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateModalItem = (id: string, field: keyof ChecklistItemRow, value: any) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'inputType' && value === 'Multiple Choice' && (!updated.options || updated.options.length === 0)) {
            updated.options = [
              { id: `opt-${Date.now()}-1`, text: 'Option 1' },
              { id: `opt-${Date.now()}-2`, text: 'Option 2' },
            ];
          }
          return updated;
        }
        return item;
      })
    );
  };

  // MULTIPLE CHOICE OPTIONS MANAGEMENT
  const handleAddOption = (itemId: string) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const existing = item.options || [];
          const newOpt: MultipleChoiceOption = {
            id: `opt-${Date.now()}`,
            text: `Option ${existing.length + 1}`,
          };
          return { ...item, options: [...existing, newOpt] };
        }
        return item;
      })
    );
  };

  const handleRemoveOption = (itemId: string, optionId: string) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId && item.options) {
          return {
            ...item,
            options: item.options.filter((o) => o.id !== optionId),
          };
        }
        return item;
      })
    );
  };

  const handleUpdateOption = (itemId: string, optionId: string, text: string) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId && item.options) {
          return {
            ...item,
            options: item.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
          };
        }
        return item;
      })
    );
  };

  // HTML5 DRAG & DROP REORDERING
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...formItems];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, movedItem);

    setFormItems(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ARCHIVE & RESTORE
  // ARCHIVE & RESTORE & DELETE
  const handleArchiveChecklist = async (chk: ChecklistRecord) => {
    await saveTemplate({
      ...chk,
      isArchived: true,
      updatedAt: new Date().toISOString(),
    });
    if (editingChecklist?.id === chk.id) {
      setIsModalOpen(false);
      setEditingChecklist(null);
    }
  };

  const handleRestoreChecklist = async (chk: ChecklistRecord) => {
    await saveTemplate({
      ...chk,
      isArchived: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteChecklist = async (chkId: string) => {
    if (confirm('Are you sure you want to permanently delete this checklist template?')) {
      await deleteTemplate(chkId);
      if (editingChecklist?.id === chkId) {
        setIsModalOpen(false);
        setEditingChecklist(null);
      }
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGeneralValid) return;

    const validItems = formItems.filter((i) => i.label.trim().length > 0);

    if (editingChecklist) {
      await saveTemplate({
        ...editingChecklist,
        name: formName,
        title: formName,
        itemCount: validItems.length > 0 ? validItems.length : (editingChecklist.itemCount || 0),
        autoAdd: formAutoAdd,
        showSignature: formShowSignature,
        requireSignature: formRequireSignature,
        requireCompletion: formRequireCompletion,
        items: validItems,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newId = `chk-${Date.now()}`;
      await saveTemplate({
        id: newId,
        name: formName,
        title: formName,
        category: 'HVAC',
        itemCount: validItems.length,
        autoAdd: formAutoAdd,
        showSignature: formShowSignature,
        requireSignature: formRequireSignature,
        requireCompletion: formRequireCompletion,
        isArchived: false,
        items: validItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    setEditingChecklist(null);
  };

  return (
    <div className="w-full space-y-5 text-slate-800 pb-16 font-sans relative">
      {/* 1. Top Header with Title Setup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
          <span className="font-bold text-[#2e4057] italic text-2xl">More Applications</span>
          <span className="font-normal text-[#5b708b] not-italic text-xl">Checklists</span>
        </h1>

        <button
          type="button"
          onClick={openNewModal}
          className="px-3.5 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white text-xs font-bold rounded shadow-xs inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Checklist</span>
        </button>
      </div>

      {/* 2. Checklists Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e]">
                <th className="px-4 py-3 w-96">Checklist Name</th>
                <th className="px-4 py-3 w-36"># of items</th>
                <th className="px-4 py-3 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {loading && activeChecklists.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Loading checklists from database...
                  </td>
                </tr>
              ) : activeChecklists.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    No active checklists found. Click &quot;New Checklist&quot; to create one.
                  </td>
                </tr>
              ) : (
                activeChecklists.map((chk: any) => (
                  <tr key={chk.id} className="bg-white hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap w-96">
                      <button
                        type="button"
                        onClick={() => openEditModal(chk)}
                        className="text-[#be4646] font-semibold hover:underline text-left cursor-pointer transition-colors"
                      >
                        {chk.name || chk.title}
                      </button>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap w-36">
                      {chk.itemCount || (chk.items ? chk.items.length : 0)}
                    </td>

                    <td className="px-4 py-3.5 text-right pr-8">
                      <button
                        type="button"
                        onClick={() => handleArchiveChecklist(chk)}
                        className="text-[#be4646] hover:text-[#a63a3a] transition-colors p-1 cursor-pointer inline-flex items-center justify-center"
                        title="Archive Checklist"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {showArchived && archivedList.map((arch: any) => (
                <tr key={arch.id} className="bg-slate-50/60">
                  <td className="px-4 py-3.5 font-medium whitespace-nowrap w-96">
                    <span className="text-slate-500 font-semibold italic">
                      {arch.name || arch.title} <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-1 not-italic font-bold">Archived</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 w-36">{arch.itemCount || (arch.items ? arch.items.length : 0)}</td>
                  <td className="px-4 py-3.5 text-right pr-8">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestoreChecklist(arch)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded transition-colors cursor-pointer"
                        title="Restore Checklist"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklist(arch.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Archived Checklists Toggle Link */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className="text-[#be4646] hover:underline text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
        >
          {showArchived ? (
            <span>Hide {archivedList.length} Archived Checklists</span>
          ) : (
            <span>Show {archivedList.length} Archived Checklists</span>
          )}
        </button>
      </div>

      {/* 4. MODAL DIALOG FOR NEW / EDIT CHECKLIST */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden ">
          <div 
            onClick={handleRequestCloseModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200" 
          />

          <div className="fixed inset-0 flex items-start justify-center pt-[5vh] pb-10 p-4 pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-xs">
              
              {/* MODAL HEADER */}
              <div className="bg-slate-100/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-slate-800">
                  {editingChecklist ? 'Edit Checklist' : 'New Checklist'}
                </h2>
                <button
                  type="button"
                  onClick={handleRequestCloseModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TABS HEADER: GENERAL vs ITEMS */}
              <div className="flex items-center px-6 gap-6 text-xs font-semibold border-b border-slate-200 bg-white pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('general')}
                  className={`pb-2.5 transition-colors border-b-2 ${
                    activeModalTab === 'general'
                      ? 'border-[#be4646] text-[#be4646] font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  disabled={!isGeneralValid}
                  onClick={() => isGeneralValid && setActiveModalTab('items')}
                  className={`pb-2.5 transition-colors border-b-2 ${
                    activeModalTab === 'items'
                      ? 'border-[#be4646] text-[#be4646] font-bold'
                      : !isGeneralValid
                      ? 'border-transparent text-slate-300 cursor-not-allowed'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Items ({formItems.length})
                </button>
              </div>

              {/* SCROLLABLE FORM BODY */}
              <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 flex flex-col justify-between">
                
                {/* TAB 1: GENERAL */}
                {activeModalTab === 'general' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Checklist Name <span className="text-[#be4646]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#3f6b35]"
                      />
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => setFormAutoAdd(!formAutoAdd)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            formAutoAdd ? 'bg-sky-400' : 'bg-slate-300'
                          }`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            formAutoAdd ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </div>
                        <label className="font-semibold text-slate-700 flex items-center gap-1 cursor-pointer">
                          <span>Auto Add</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => setFormShowSignature(!formShowSignature)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                              formShowSignature ? 'bg-sky-400' : 'bg-slate-300'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              formShowSignature ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </div>
                          <label className="font-semibold text-slate-700 cursor-pointer">
                            Show customer signature box
                          </label>
                        </div>

                        {formShowSignature && (
                          <div className="pl-14 flex items-center gap-2">
                            <Checkbox
                              id="reqSig"
                              checked={formRequireSignature}
                              onChange={(e) => setFormRequireSignature(e.target.checked)}
                            />
                            <label htmlFor="reqSig" className="text-xs text-slate-600 font-medium cursor-pointer">
                              Make customer signature required
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => setFormRequireCompletion(!formRequireCompletion)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            formRequireCompletion ? 'bg-sky-400' : 'bg-slate-300'
                          }`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            formRequireCompletion ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </div>
                        <label className="font-semibold text-slate-700 flex items-center gap-1 cursor-pointer">
                          <span>Required for appointment completion</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ITEMS (ALLOW DATA INPUT TOGGLE REMOVED AS REQUESTED) */}
                {activeModalTab === 'items' && (
                  <div className="space-y-3.5 animate-in fade-in duration-150 flex-1 flex flex-col min-h-0">
                    {/* Header Row: Label * */}
                    <div className="border-b border-slate-200 pb-2 shrink-0">
                      <label className="font-bold text-slate-800 text-xs">
                        Label <span className="text-[#be4646] font-bold">*</span>
                      </label>
                    </div>

                    {/* DYNAMIC REORDERABLE ITEMS LIST */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 py-1 border-y border-slate-200/60 max-h-[380px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {formItems.map((row, index) => {
                        const isDragging = draggedIndex === index;
                        const isOver = dragOverIndex === index;

                        return (
                          <div
                            key={row.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`bg-slate-50 p-3 rounded-lg border transition-all ${
                              isDragging ? 'opacity-40 border-dashed border-[#be4646]' : 'border-slate-200'
                            } ${isOver ? 'border-2 border-[#3f6b35] bg-emerald-50/50' : ''}`}
                          >
                            {/* Main Item Row */}
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-slate-400 cursor-grab active:cursor-grabbing shrink-0 hover:text-slate-700 transition-colors" />

                              <textarea
                                rows={1}
                                placeholder="Enter item label..."
                                value={row.label}
                                onChange={(e) => handleUpdateModalItem(row.id, 'label', e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#3f6b35] resize-none"
                              />

                              <select
                                value={row.inputType}
                                onChange={(e) => handleUpdateModalItem(row.id, 'inputType', e.target.value as any)}
                                className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium w-40"
                              >
                                <option value="Short Answer">Short Answer</option>
                                <option value="Multiple Choice">Multiple Choice</option>
                                <option value="Pass/Fail">Pass/Fail</option>
                                <option value="Text Area">Text Area</option>
                                <option value="Photo Upload">Photo Upload</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemoveModalItem(row.id)}
                                className="text-[#be4646] hover:text-[#a63a3a] p-1 shrink-0 transition-colors cursor-pointer"
                                title="Delete Item"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            </div>

                            {/* MULTIPLE CHOICE OPTIONS GRID */}
                            {row.inputType === 'Multiple Choice' && (
                              <div className="mt-3 pt-3 border-t border-slate-200/80 pl-6 space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                  {(row.options || []).map((opt, optIdx) => (
                                    <div key={opt.id} className="space-y-1">
                                      <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                                        Option {optIdx + 1} <span className="text-[#be4646] font-bold">*</span>
                                        {row.options && row.options.length > 2 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveOption(row.id, opt.id)}
                                            className="text-[#be4646] hover:underline ml-1 text-[10px]"
                                          >
                                            <MinusCircle className="w-3.5 h-3.5 inline" />
                                          </button>
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => handleUpdateOption(row.id, opt.id, e.target.value)}
                                        className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#3f6b35]"
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddOption(row.id)}
                                    className="text-[#be4646] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                    <span>Add Option</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Item Link */}
                    <div className="shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={handleAddModalItem}
                        className="text-[#be4646] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    {/* Note: Comments Section */}
                    <div className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-200 shrink-0">
                      <span className="font-bold text-slate-700">Note:</span> A comments section is automatically added to each checklist.
                    </div>

                    {/* CALLOUT BOX FOR EDITING EXISTING CHECKLISTS */}
                    {Boolean(editingChecklist) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center space-y-1.5 text-xs text-amber-900 shrink-0 animate-in fade-in duration-150">
                        <div className="font-medium">
                          Would you like to apply these changes to existing instances of this checklist that are in an Incomplete status?
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Checkbox
                            id="updateIncomplete"
                            checked={updateIncompleteInstances}
                            onChange={(e) => setUpdateIncompleteInstances(e.target.checked)}
                          />
                          <label htmlFor="updateIncomplete" className="font-medium text-amber-900 cursor-pointer">
                            Yes, update existing instances of this checklist.
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODAL FOOTER ACTIONS */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
                  {editingChecklist ? (
                    <button
                      type="button"
                      onClick={() => handleArchiveChecklist(editingChecklist)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
                    >
                      Archive
                    </button>
                  ) : activeModalTab === 'items' ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveModalTab('general')}
                      className="gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRequestCloseModal}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}

                  {activeModalTab === 'general' ? (
                    <Button
                      type="button"
                      variant="danger"
                      disabled={!isGeneralValid}
                      onClick={() => isGeneralValid && setActiveModalTab('items')}
                      className="gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="danger"
                      disabled={!isGeneralValid}
                      className="gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingChecklist ? 'Save' : 'Done'}</span>
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. UNSAVED CHANGES WARNING CONFIRMATION MODAL */}
      {isUnsavedWarningModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xs z-[70] flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            
            {/* Header */}
            <div className="bg-slate-100/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Unsaved Changes</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsUnsavedWarningModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-slate-700 text-xs leading-relaxed">
                You have unsaved changes on this checklist form. Are you sure you want to discard your changes and exit?
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUnsavedWarningModalOpen(false)}
                  className="px-4 py-1.5 text-xs"
                >
                  Keep Editing
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={forceCloseModal}
                  className="px-4 py-1.5 text-xs font-semibold"
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
