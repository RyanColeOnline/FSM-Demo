'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui';
import { CategoryNode, initialCategoryTree } from '@/data/priceBookStore';

export default function WexPriceBookCategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>(initialCategoryTree);
  const [expandedIds, setExpandedIds] = useState<string[]>([
    'cat-cod-resorts',
    'cat-hw-basic',
    'cat-hvac',
    'cat-equip',
    'cat-hvac-comm-inst',
    'cat-hvac-res-inst',
    'cat-hri-equip'
  ]);

  // Inline editing state
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditName, setInlineEditName] = useState<string>('');

  // Modal State for Add / Edit Category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add-top' | 'add-sub' | 'edit'>('add-top');
  const [targetCategory, setTargetCategory] = useState<CategoryNode | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState<string>('');
  const [categoryParentIdInput, setCategoryParentIdInput] = useState<string>('');
  const [categoryAccountInput, setCategoryAccountInput] = useState<string>('Services > HVAC Equipment');
  const [categoryDescInput, setCategoryDescInput] = useState<string>('');

  // Delete Confirmation Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryNode | null>(null);

  // Toggle Category Expand/Collapse
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Modal to Add Top-Level Category
  const handleOpenAddTop = () => {
    setModalMode('add-top');
    setTargetCategory(null);
    setCategoryNameInput('');
    setCategoryParentIdInput('');
    setCategoryAccountInput('Services > HVAC Equipment');
    setCategoryDescInput('');
    setIsCategoryModalOpen(true);
  };

  // Open Modal to Add Subcategory
  const handleOpenAddSub = (parent: CategoryNode) => {
    setModalMode('add-sub');
    setTargetCategory(parent);
    setCategoryNameInput('');
    setCategoryParentIdInput(parent.id);
    setCategoryAccountInput(parent.account || 'Services > HVAC Equipment');
    setCategoryDescInput('');
    setIsCategoryModalOpen(true);
  };

  // Open Modal to Edit Category
  const handleOpenEditModal = (node: CategoryNode) => {
    setModalMode('edit');
    setTargetCategory(node);
    setCategoryNameInput(node.name);
    setCategoryParentIdInput(node.parentId || '');
    setCategoryAccountInput(node.account || 'Services > HVAC Equipment');
    setCategoryDescInput(node.description || '');
    setIsCategoryModalOpen(true);
  };

  // Start Inline Edit
  const startInlineEdit = (node: CategoryNode) => {
    setInlineEditId(node.id);
    setInlineEditName(node.name);
  };

  // Save Inline Edit
  const saveInlineEdit = (id: string) => {
    if (!inlineEditName.trim()) {
      setInlineEditId(null);
      return;
    }

    const updateName = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, name: inlineEditName.trim() };
        }
        if (node.children) {
          return { ...node, children: updateName(node.children) };
        }
        return node;
      });
    };

    setCategories(updateName(categories));
    setInlineEditId(null);
  };

  // Confirm Delete Category
  const confirmDeleteCategory = (id: string) => {
    const removeNode = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes
        .filter((node) => node.id !== id)
        .map((node) => ({
          ...node,
          children: node.children ? removeNode(node.children) : undefined,
        }));
    };

    setCategories(removeNode(categories));
  };

  // Save Category from Modal (Add or Edit)
  const handleSaveModalCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    if (modalMode === 'edit' && targetCategory) {
      // Edit existing category
      const updateNode = (nodes: CategoryNode[]): CategoryNode[] => {
        return nodes.map((node) => {
          if (node.id === targetCategory.id) {
            return {
              ...node,
              name: categoryNameInput.trim(),
              account: categoryAccountInput,
              description: categoryDescInput,
            };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      setCategories(updateNode(categories));
    } else if (modalMode === 'add-sub' && targetCategory) {
      // Add subcategory to target parent
      const newNode: CategoryNode = {
        id: `cat-${Date.now()}`,
        name: categoryNameInput.trim(),
        parentId: targetCategory.id,
        itemCount: 0,
        account: categoryAccountInput,
        description: categoryDescInput,
      };

      const appendChild = (nodes: CategoryNode[]): CategoryNode[] => {
        return nodes.map((node) => {
          if (node.id === targetCategory.id) {
            return {
              ...node,
              children: [...(node.children || []), newNode],
            };
          }
          if (node.children) {
            return { ...node, children: appendChild(node.children) };
          }
          return node;
        });
      };

      setCategories(appendChild(categories));
      if (!expandedIds.includes(targetCategory.id)) {
        setExpandedIds((prev) => [...prev, targetCategory.id]);
      }
    } else {
      // Add top-level category
      const newNode: CategoryNode = {
        id: `cat-${Date.now()}`,
        name: categoryNameInput.trim(),
        itemCount: 0,
        account: categoryAccountInput,
        description: categoryDescInput,
      };
      setCategories((prev) => [newNode, ...prev]);
    }

    setIsCategoryModalOpen(false);
  };

  // Helper to flatten categories for parent dropdown selector
  const getAllFlattenedCategories = (nodes: CategoryNode[], prefix = ''): { id: string; name: string }[] => {
    const list: { id: string; name: string }[] = [];
    for (const node of nodes) {
      list.push({ id: node.id, name: prefix ? `${prefix} > ${node.name}` : node.name });
      if (node.children) {
        list.push(...getAllFlattenedCategories(node.children, prefix ? `${prefix} > ${node.name}` : node.name));
      }
    }
    return list;
  };

  // Render Recursive Hierarchy Tree Row
  const renderCategoryItem = (node: CategoryNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.includes(node.id);
    const isEditingThis = inlineEditId === node.id;

    return (
      <div key={node.id} className="relative group">
        {/* Indentation connector guide lines */}
        {depth > 0 && (
          <div 
            className="absolute -left-4 top-5 w-4 h-px bg-slate-200"
            style={{ left: `-${Math.max(16, depth * 8)}px` }}
          />
        )}

        {/* Row Item Card */}
        <div 
          className={`flex items-center justify-between p-3 rounded-lg border transition-all my-1.5 ${
            depth === 0 
              ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300' 
              : depth === 1 
                ? 'bg-slate-50/70 border-slate-200/80 hover:bg-white' 
                : 'bg-white border-dashed border-slate-200 hover:border-slate-300'
          }`}
          style={{ marginLeft: `${depth * 28}px` }}
        >
          {/* Left: Expand toggle, Folder Icon & Name */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-700" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>
            ) : (
              <span className="w-6 shrink-0" />
            )}

            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-[#be4646] shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-[#be4646] shrink-0" />
            )}

            {/* Editable Name or Display */}
            {isEditingThis ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  autoFocus
                  value={inlineEditName}
                  onChange={(e) => setInlineEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveInlineEdit(node.id);
                    if (e.key === 'Escape') setInlineEditId(null);
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 w-full max-w-sm"
                />
                <button
                  type="button"
                  onClick={() => saveInlineEdit(node.id)}
                  className="p-1 text-[#3f6b35] hover:bg-emerald-50 rounded"
                  title="Save Name"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => setInlineEditId(null)}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 truncate">
                <span 
                  onDoubleClick={() => startInlineEdit(node)}
                  className={`text-xs font-semibold truncate ${
                    depth === 0 ? 'text-slate-800 text-[13px]' : 'text-slate-700'
                  }`}
                >
                  {node.name}
                </span>

                {/* Item count badge */}
                <Link
                  href="/more/price-book/my-price-book"
                  className="text-[11px] font-medium text-slate-400 hover:text-[#be4646] transition-colors shrink-0"
                  title="View Products in My Price Book"
                >
                  ({node.itemCount} items)
                </Link>
              </div>
            )}
          </div>

          {/* Right: Actions Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
            {/* Add Subcategory button */}
            <button
              type="button"
              onClick={() => handleOpenAddSub(node)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-[#be4646] text-slate-600 hover:text-white transition-all text-xs font-medium cursor-pointer shadow-2xs"
              title={`Add Subcategory under "${node.name}"`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline text-[11px]">Add Sublevel</span>
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => handleOpenEditModal(node)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Edit Category Details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button (Triggers Confirmation Modal) */}
            <button
              type="button"
              onClick={() => setCategoryToDelete(node)}
              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
              title="Delete Category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Children Rows */}
        {hasChildren && isExpanded && (
          <div className="relative pl-3 border-l-2 border-slate-100 ml-4">
            {node.children!.map((child) => renderCategoryItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-5 text-slate-800 pb-20 font-sans">
      
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
            <span className="font-bold text-[#2e4057] italic text-2xl">More Applications</span>
            <span className="font-normal text-[#5b708b] not-italic text-xl">Price Book, My Price Book Categories</span>
          </h1>
        </div>

        <Button
          variant="danger"
          onClick={handleOpenAddTop}
          className="gap-1.5 text-xs shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Top Level Category</span>
        </Button>
      </div>

      {/* 2. Main Categories Hierarchy Tree Panel */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-1">
        {categories.map((node) => renderCategoryItem(node, 0))}
      </div>

      {/* 3. ADD / EDIT CATEGORY MODAL DIALOG */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 overflow-y-auto flex items-start justify-center pt-[10vh] pb-10 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            
            {/* Modal Header */}
            <div className="bg-slate-100/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {modalMode === 'add-top' 
                  ? 'Add Top-Level Category' 
                  : modalMode === 'add-sub' 
                    ? `Add Subcategory under "${targetCategory?.name}"` 
                    : `Edit Category: ${targetCategory?.name}`}
              </h2>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveModalCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Parent Category Selection (if editing or adding) */}
              {modalMode === 'add-sub' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent Category
                  </label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-[#be4646]" />
                    <span>{targetCategory?.name}</span>
                  </div>
                </div>
              ) : modalMode === 'edit' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent Hierarchy
                  </label>
                  <select
                    value={categoryParentIdInput}
                    onChange={(e) => setCategoryParentIdInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                  >
                    <option value="">[Root Level / Top Category]</option>
                    {getAllFlattenedCategories(categories)
                      .filter((c) => c.id !== targetCategory?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Accounting Mapping
                </label>
                <select
                  value={categoryAccountInput}
                  onChange={(e) => setCategoryAccountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                >
                  <option value="Services > HVAC Equipment">Services &gt; HVAC Equipment</option>
                  <option value="Services > HVAC Labor">Services &gt; HVAC Labor</option>
                  <option value="Parts > Motors & Blowers">Parts &gt; Motors &amp; Blowers</option>
                  <option value="Parts > Electrical">Parts &gt; Electrical</option>
                  <option value="Discounts > Promotional">Discounts &gt; Promotional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={categoryDescInput}
                  onChange={(e) => setCategoryDescInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="px-6 py-2 text-xs font-semibold"
                >
                  {modalMode === 'edit' ? 'Save Changes' : 'Save Category'}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 4. DELETE CONFIRMATION MODAL DIALOG */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            {/* Modal Header */}
            <div className="bg-slate-100/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Delete Category</h2>
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-slate-700 text-xs leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-900">&quot;{categoryToDelete.name}&quot;</span> and all of its subcategories? This action cannot be undone.
              </p>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoryToDelete(null)}
                  className="px-4 py-1.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    confirmDeleteCategory(categoryToDelete.id);
                    setCategoryToDelete(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold"
                >
                  Delete Category
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
