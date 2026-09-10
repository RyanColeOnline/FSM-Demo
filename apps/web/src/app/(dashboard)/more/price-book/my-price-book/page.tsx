'use client';

import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  Search, 
  Plus, 
  Trash2, 
  Heart,
  Eye
} from 'lucide-react';
import { Button, Checkbox } from '@/components/ui';
import { 
  CategoryNode, 
  PriceBookItem, 
  ProductType, 
  initialCategoryTree, 
  initialProducts 
} from '@/data/priceBookStore';
import { ProductTypeSelectModal } from '@/components/modals/ProductTypeSelectModal';
import { ProductFormModal } from '@/components/modals/ProductFormModal';
import { useSession } from '@/auth/sessionStore';
import { usePriceBook } from '@/hooks/usePriceBook';
import { CanonicalPriceBookItem } from '@murphys/domain';

export default function WexPriceBookPage() {
  const { permissions } = useSession();
  const { items: canonicalItems, savePriceBookItem } = usePriceBook();
  const [categories] = useState<CategoryNode[]>(initialCategoryTree);
  const [products, setProducts] = useState<PriceBookItem[]>(initialProducts);

  // Sync products when canonicalItems update
  useEffect(() => {
    if (canonicalItems.length > 0) {
      setProducts((prev) => {
        const merged = [...canonicalItems.map((ci) => ({
          id: ci.id,
          categoryId: ci.categoryId || 'cat-15-5ton',
          categoryIds: ci.categoryIds || (ci.categoryId ? [ci.categoryId] : ['cat-15-5ton']),
          productType: (ci.productType as ProductType) || 'Product - Single Part Only',
          name: ci.name,
          sku: ci.sku,
          description: ci.description || '',
          unitCost: ci.unitCost || 0,
          sellingPrice: ci.sellingPrice,
          isTaxable: ci.isTaxable,
          accountName: ci.incomeAccount,
          qbAccount: ci.incomeAccount,
          categoryName: ci.categoryPaths?.[0] || 'HVAC > Equipment',
          maintPlanPrice: ci.maintenancePlanPrice || ci.sellingPrice,
          laborHours: ci.laborHours,
        })), ...prev.filter((p) => !canonicalItems.some((ci) => ci.id === p.id))];
        return merged;
      });
    }
  }, [canonicalItems]);
  
  // Left Sidebar Tree Selection & Expansion State (UNEXPANDED BY DEFAULT)
  const [selectedCatId, setSelectedCatId] = useState<string>('cat-15-5ton');
  const [expandedCatIds, setExpandedCatIds] = useState<string[]>([]);
  
  // Quick Edit Mode & Toolbar State
  const [isQuickEditView, setIsQuickEditView] = useState<boolean>(false);
  const [quickEditCatId, setQuickEditCatId] = useState<string>('cat-cod');
  const [includeSubCategories, setIncludeSubCategories] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Step 1: Type Selection Modal State
  const [isTypeSelectModalOpen, setIsTypeSelectModalOpen] = useState<boolean>(false);

  // Step 2: Main Product Form Modal State (Shared Add/Edit Modal)
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [modalProductType, setModalProductType] = useState<ProductType>('Product - Single Part Only');
  const [editingProduct, setEditingProduct] = useState<PriceBookItem | null>(null);

  // Open Step 1: Type Selection Modal
  const handleOpenAddProduct = () => {
    setIsTypeSelectModalOpen(true);
  };

  // Step 1 -> Step 2 transition
  const handleSelectProductType = (type: ProductType) => {
    setIsTypeSelectModalOpen(false);
    setEditingProduct(null);
    setModalProductType(type);
    setIsProductModalOpen(true);
  };

  // Open Step 2 directly for editing an existing product
  const handleOpenEditProduct = (prod: PriceBookItem) => {
    setEditingProduct(prod);
    setModalProductType(prod.productType || 'Product - Single Part Only');
    setIsProductModalOpen(true);
  };

  // Save product handler (Add or Edit)
  const handleSaveProduct = async (formData: Partial<PriceBookItem>) => {
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, ...formData } as PriceBookItem
            : p
        )
      );
      const canonical: CanonicalPriceBookItem = {
        id: editingProduct.id,
        name: formData.name || editingProduct.name,
        sku: formData.sku || editingProduct.sku,
        description: formData.description || editingProduct.description,
        incomeAccount: formData.accountName || editingProduct.accountName || 'Services > HVAC Equipment',
        isTaxable: formData.isTaxable !== false,
        laborHours: formData.laborHours || editingProduct.laborHours || 0,
        sellingPrice: formData.sellingPrice || editingProduct.sellingPrice,
        unitCost: formData.unitCost || editingProduct.unitCost,
        categoryPaths: [formData.categoryName || editingProduct.categoryName || 'HVAC > Equipment'],
        categoryId: formData.categoryId || editingProduct.categoryId,
        productType: (formData.productType || editingProduct.productType) as any,
      };
      await savePriceBookItem(canonical);
    } else {
      const newProdId = `pb-${Date.now()}`;
      const newProd: PriceBookItem = {
        id: newProdId,
        categoryId: selectedCatId || 'cat-15-5ton',
        productType: formData.productType || modalProductType,
        name: formData.name || 'Untitled Product',
        sku: formData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        description: formData.description || '',
        unitCost: formData.unitCost || 0,
        sellingPrice: formData.sellingPrice || 0,
        isTaxable: formData.isTaxable !== false,
        accountName: formData.accountName || 'Services > HVAC Equipment',
        qbAccount: formData.qbAccount || 'Services > HVAC Equipment',
        categoryName: formData.categoryName || 'HVAC > Equipment',
        imageUrl: formData.imageUrl || '',
        maintPlanOverride: formData.maintPlanOverride || false,
        maintPlanPrice: formData.maintPlanPrice || formData.sellingPrice || 0,
        isServiceFee: formData.isServiceFee || false,
        laborRate: formData.laborRate,
        laborHours: formData.laborHours,
        isFavorite: formData.isFavorite || false,
      };
      setProducts((prev) => [newProd, ...prev]);

      const canonical: CanonicalPriceBookItem = {
        id: newProdId,
        name: newProd.name,
        sku: newProd.sku,
        description: newProd.description,
        incomeAccount: newProd.accountName || 'Services > HVAC Equipment',
        isTaxable: newProd.isTaxable,
        laborHours: newProd.laborHours || 0,
        sellingPrice: newProd.sellingPrice,
        unitCost: newProd.unitCost,
        categoryPaths: [newProd.categoryName || 'HVAC > Equipment'],
        categoryId: newProd.categoryId,
        productType: newProd.productType as any,
      };
      await savePriceBookItem(canonical);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Quick Edit Inline Update Handler
  const handleQuickEditItemChange = (id: string, field: keyof PriceBookItem, value: any) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Category Expand helper
  const toggleCategoryExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCatIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    // Clicking the chevron also selects the category so its direct items pop up in the table
    setSelectedCatId(id);
    setIsQuickEditView(false);
    setCurrentPage(1);
  };

  // Sub-category IDs helper
  const getAllSubCatIds = (catId: string): string[] => {
    const ids: string[] = [catId];
    const findChildren = (nodes: CategoryNode[]) => {
      for (const node of nodes) {
        if (node.id === catId) {
          const collect = (children?: CategoryNode[]) => {
            if (!children) return;
            for (const child of children) {
              ids.push(child.id);
              if (child.children) collect(child.children);
            }
          };
          collect(node.children);
          return;
        }
        if (node.children) findChildren(node.children);
      }
    };
    findChildren(categories);
    return ids;
  };

  const findCategoryNode = (nodes: CategoryNode[], id: string): CategoryNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findCategoryNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activeCatIdForView = isQuickEditView && quickEditCatId ? quickEditCatId : selectedCatId;
  const activeSubCatIds = includeSubCategories ? getAllSubCatIds(activeCatIdForView) : [activeCatIdForView];

  // Filter products by selected category and search query
  const filteredProducts = products.filter((prod) => {
    const matchesCat =
      activeSubCatIds.includes(prod.categoryId) ||
      (prod.categoryIds && prod.categoryIds.some((cid) => activeSubCatIds.includes(cid)));
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  // Pagination Slice
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Dynamic Category Item Counter
  const getCategoryItemCount = (catNode: CategoryNode): number => {
    const directCount = products.filter(
      (p) => p.categoryId === catNode.id || (p.categoryIds && p.categoryIds.includes(catNode.id))
    ).length;
    if (!catNode.children || catNode.children.length === 0) {
      return directCount;
    }
    const childrenCount = catNode.children.reduce((acc, child) => acc + getCategoryItemCount(child), 0);
    return directCount + childrenCount;
  };

  // Render Category Node Component
  const renderCategoryNode = (node: CategoryNode, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedCatIds.includes(node.id);
    const isSelected = selectedCatId === node.id;

    return (
      <div key={node.id} className="space-y-0.5">
        <div
          onClick={() => {
            setSelectedCatId(node.id);
            setIsQuickEditView(false);
            setCurrentPage(1);
          }}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-slate-200 text-slate-900 font-bold' 
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          style={{ paddingLeft: `${level * 14 + 10}px` }}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCategoryExpand(node.id, e)}
                className="p-0.5 rounded hover:bg-black/10 focus:outline-none shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-800' : 'text-slate-500'}`} />
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-800' : 'text-slate-500'}`} />
                )}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[#be4646]" />
            ) : (
              <Folder className="w-3.5 h-3.5 shrink-0 text-[#be4646]" />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          {/* Item Counter with NO grey background */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCatId(node.id);
              setQuickEditCatId(node.id);
              setIsQuickEditView(true);
              setCurrentPage(1);
            }}
            title="Quick Edit Category Items"
            className="text-[10px] font-medium text-slate-500 hover:text-[#be4646] shrink-0 ml-1 transition-colors cursor-pointer"
          >
            ({getCategoryItemCount(node)})
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children!.map((child) => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-5 text-slate-800 pb-16 font-sans relative">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
          <span className="font-bold text-[#2e4057] italic text-2xl">More Applications</span>
          <span className="font-normal text-[#5b708b] not-italic text-xl">Price Book, My Price Book</span>
        </h1>

        {permissions.canModifyPriceBook && (
          <Button
            variant="danger"
            onClick={handleOpenAddProduct}
            className="gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Product</span>
          </Button>
        )}
      </div>

      {/* 2. Main Dual-Pane Architecture vs Quick Edit View */}
      {!isQuickEditView ? (
        <div className="flex flex-col md:flex-row gap-5 items-start">
          {/* LEFT SIDEBAR: Category Tree Panel (280px Fixed Width) */}
          <div className="w-full md:w-72 bg-white rounded-lg border border-slate-200 p-3 space-y-2 shrink-0 shadow-xs">
            {/* Header: Clean 'Categories' label with no icon or count label */}
            <div className="border-b border-slate-200 pb-2 px-1">
              <span className="font-bold text-xs text-slate-800">
                Categories
              </span>
            </div>

            <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
              {categories.map((node) => renderCategoryNode(node, 0))}
            </div>
          </div>

          {/* MAIN CONTENT AREA: Master-Detail Data Table Panel */}
          <div className="flex-1 bg-white rounded-lg border border-slate-200 p-5 shadow-xs w-full space-y-4">
            {/* Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1">
              <div className="flex items-center gap-2 border border-slate-300 rounded bg-white px-3 py-1.5 shadow-xs w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search Product Name, SKU, or Description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>

              {/* Sub-category Toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="incSubCat"
                  checked={includeSubCategories}
                  onChange={(e) => setIncludeSubCategories(e.target.checked)}
                />
                <label htmlFor="incSubCat" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Include Sub-category Items
                </label>
              </div>
            </div>

            {/* Price Book Master-Detail Data Table */}
            <div className="rounded-md border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-[#a82e2e]">
                      <th className="px-3.5 py-3">Product Name</th>
                      <th className="px-3.5 py-3">Description</th>
                      <th className="px-3.5 py-3">Category</th>
                      <th className="px-3.5 py-3">Unit Cost</th>
                      <th className="px-3.5 py-3">Selling Price</th>
                      <th className="px-3.5 py-3 text-center">Taxable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {paginatedProducts.length > 0 ? (
                      paginatedProducts.map((item) => (
                        <tr key={item.id} className="bg-white">
                          {/* Product Name (Clickable link to open Prepopulated Edit Modal) */}
                          <td className="px-3.5 py-3 font-semibold text-[#be4646] hover:underline cursor-pointer">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(item)}
                              className="text-left font-bold text-[#be4646] hover:underline cursor-pointer"
                            >
                              {item.name}
                            </button>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.sku}
                            </div>
                          </td>

                          {/* Description */}
                          <td className="px-3.5 py-3 max-w-xs text-slate-600 truncate">
                            {item.description || '—'}
                          </td>

                          {/* Category Name */}
                          <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                            {item.categoryName || 'General'}
                          </td>

                          {/* Unit Cost */}
                          <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                            ${item.unitCost.toFixed(2)}
                          </td>

                          {/* Selling Price */}
                          <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            ${item.sellingPrice.toFixed(2)}
                          </td>

                          {/* Taxable Flag */}
                          <td className="px-3.5 py-3 text-center">
                            {item.isTaxable ? (
                              <span className="inline-block w-2 h-2 rounded-full bg-[#3f6b35]" title="Taxable" />
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-slate-300" title="Non-taxable" />
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500 bg-slate-50/50">
                          {(() => {
                            const activeNode = findCategoryNode(categories, activeCatIdForView);
                            const hasSubCategories = Boolean(activeNode && activeNode.children && activeNode.children.length > 0);
                            if (hasSubCategories && !includeSubCategories) {
                              return (
                                <div className="space-y-1 max-w-md mx-auto">
                                  <p className="font-semibold text-slate-700 text-xs">
                                    This category contains subcategories.
                                  </p>
                                  <p className="text-slate-500 text-[11px]">
                                    Select a subcategory from the left menu to view products, or check <span className="font-semibold text-slate-600">"Include Sub-category Items"</span> above.
                                  </p>
                                </div>
                              );
                            }
                            return <span className="italic">No products found in this category.</span>;
                          })()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Pagination */}
              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing {paginatedProducts.length} of {filteredProducts.length} product(s)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* QUICK EDIT VIEW */
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <button
                type="button"
                onClick={() => setIsQuickEditView(false)}
                className="text-[#be4646] hover:underline flex items-center gap-1 font-semibold text-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back to My Price Book List
              </button>
              <h2 className="text-xl font-normal text-[#5b708b] mt-1">
                Quick Edit ({filteredProducts.length})
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-slate-300 rounded bg-white px-3 py-1.5 shadow-xs w-64">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>

              <Button
                variant="danger"
                onClick={handleOpenAddProduct}
                className="gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Product</span>
              </Button>
            </div>
          </div>

          {/* Quick Edit Inline Form Data Table */}
          <div className="rounded-md border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-[#a82e2e]">
                    <th className="px-3.5 py-3 w-64">Product Name *</th>
                    <th className="px-3.5 py-3 w-52">Product Number</th>
                    <th className="px-3.5 py-3 w-40">Standard Price *</th>
                    <th className="px-3.5 py-3 w-36">Tax Default *</th>
                    <th className="px-3.5 py-3 w-44">Maintenance Plan Price</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-3.5 py-2.5">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleQuickEditItemChange(item.id, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs font-semibold text-slate-800"
                          />
                        </td>

                        <td className="px-3.5 py-2.5">
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleQuickEditItemChange(item.id, 'sku', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.sellingPrice}
                              onChange={(e) => handleQuickEditItemChange(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="inline-flex rounded-md border border-slate-300 p-0.5 bg-slate-100">
                            <button
                              type="button"
                              onClick={() => handleQuickEditItemChange(item.id, 'isTaxable', true)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                item.isTaxable
                                  ? 'bg-[#5b708b] text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              On
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickEditItemChange(item.id, 'isTaxable', false)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                !item.isTaxable
                                  ? 'bg-sky-400 text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              off
                            </button>
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.maintPlanPrice || 0}
                              onChange={(e) => handleQuickEditItemChange(item.id, 'maintPlanPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                            />
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(item)}
                              className="text-[#be4646] font-medium hover:underline cursor-pointer"
                            >
                              details
                            </button>
                            <button type="button" className="text-slate-400 hover:text-red-500 p-1" title="Favorite">
                              <Heart className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" className="text-slate-400 hover:text-slate-700 p-1" title="Quick View">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" className="text-slate-400 hover:text-red-600 p-1" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic bg-slate-50/50">
                        No products found in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 MODAL: Select Product Type (NO placeholder in dropdown) */}
      <ProductTypeSelectModal
        isOpen={isTypeSelectModalOpen}
        onClose={() => setIsTypeSelectModalOpen(false)}
        onSelectType={handleSelectProductType}
      />

      {/* STEP 2 MODAL: Centered Floating Form Modal (Sits still with top fixed) */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initialProductType={modalProductType}
        editingProduct={editingProduct}
      />

    </div>
  );
}
