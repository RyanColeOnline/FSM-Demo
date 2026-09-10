'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronDown, 
  Search, 
  Plus, 
  Heart, 
  Edit2, 
  Info,
  Layers,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui';
import { 
  PriceBookItem, 
  ProductType, 
  BundlePartItem, 
  BundleLaborItem,
  initialBundleParts,
  initialBundleServices
} from '@/data/priceBookStore';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<PriceBookItem>) => void;
  initialProductType?: ProductType;
  editingProduct?: PriceBookItem | null;
  defaultCategoryId?: string;
  defaultCategoryName?: string;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  initialProductType = 'Product - Single Part Only',
  editingProduct,
  defaultCategoryId = 'cat-15-5ton',
  defaultCategoryName = 'HVAC > Equipment > 1.5 - 5 Ton Split Systems',
}: ProductFormModalProps) {
  const [productType, setProductType] = useState<ProductType>(initialProductType);
  const [activeTab, setActiveTab] = useState<'info' | 'additional'>('info');

  // Core Form Fields
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [categoryPath, setCategoryPath] = useState<string>(defaultCategoryName);
  const [accountName, setAccountName] = useState<string>('Services > HVAC Equipment');
  const [qbAccount, setQbAccount] = useState<string>('Services > HVAC Equipment');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isTaxable, setIsTaxable] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [searchExisting, setSearchExisting] = useState<string>('');

  // Pricing & Margin Fields
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [maintPlanOverride, setMaintPlanOverride] = useState<boolean>(false);
  const [maintPlanPrice, setMaintPlanPrice] = useState<number>(0);

  // Labor / Service Specific Fields
  const [isServiceFee, setIsServiceFee] = useState<boolean>(false);
  const [laborRate, setLaborRate] = useState<number>(100);
  const [laborHours, setLaborHours] = useState<number>(1);

  // Bundle Specific Fields
  const [bundleParts, setBundleParts] = useState<BundlePartItem[]>(initialBundleParts);
  const [bundleServices, setBundleServices] = useState<BundleLaborItem[]>(initialBundleServices);
  const [isPartsSectionOpen, setIsPartsSectionOpen] = useState<boolean>(true);
  const [isLaborSectionOpen, setIsLaborSectionOpen] = useState<boolean>(true);

  // Sync state when modal opens or editingProduct / initialProductType changes
  useEffect(() => {
    if (editingProduct) {
      setProductType(editingProduct.productType || 'Product - Single Part Only');
      setName(editingProduct.name || '');
      setSku(editingProduct.sku || '');
      setCategoryPath(editingProduct.categoryName || defaultCategoryName);
      setAccountName(editingProduct.accountName || 'Services > HVAC Equipment');
      setQbAccount(editingProduct.qbAccount || 'Services > HVAC Equipment');
      setDescription(editingProduct.description || '');
      setImageUrl(editingProduct.imageUrl || '');
      setSellingPrice(editingProduct.sellingPrice || 0);
      setUnitCost(editingProduct.unitCost || 0);
      setIsTaxable(editingProduct.isTaxable !== false);
      setMaintPlanOverride(editingProduct.maintPlanOverride || false);
      setMaintPlanPrice(editingProduct.maintPlanPrice || editingProduct.sellingPrice || 0);
      setIsServiceFee(editingProduct.isServiceFee || false);
      setLaborRate(editingProduct.laborRate || 100);
      setLaborHours(editingProduct.laborHours || 1);
      setIsFavorite(editingProduct.isFavorite || false);
    } else {
      setProductType(initialProductType);
      setName('');
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategoryPath(defaultCategoryName);
      setAccountName(initialProductType === 'Product - Labor/Service Only' ? 'Services > HVAC Labor' : 'Services > HVAC Equipment');
      setQbAccount(initialProductType === 'Product - Labor/Service Only' ? 'Services > HVAC Labor' : 'Services > HVAC Equipment');
      setDescription('');
      setImageUrl('');
      setSellingPrice(0);
      setUnitCost(0);
      setIsTaxable(true);
      setMaintPlanOverride(false);
      setMaintPlanPrice(0);
      setIsServiceFee(false);
      setLaborRate(100);
      setLaborHours(1);
      setIsFavorite(false);
    }
    setActiveTab('info');
  }, [editingProduct, initialProductType, isOpen, defaultCategoryName]);

  // Computed Margin & Markup
  const calculatedMarkup = unitCost > 0 ? (sellingPrice / unitCost).toFixed(1) : '1.2';
  const calculatedMargin = sellingPrice > 0 
    ? (((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(1) 
    : '0.0';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && productType !== 'Product Bundle - Multi Item Group') {
      // If name is required
      if (!name) return;
    }

    const effectiveSellingPrice = productType === 'Product - Labor/Service Only' 
      ? (laborRate * laborHours) 
      : sellingPrice;

    onSave({
      productType,
      name: name || (productType === 'Product Bundle - Multi Item Group' ? 'Custom Equipment & Labor Package' : ''),
      sku,
      categoryName: categoryPath,
      accountName,
      qbAccount,
      description,
      imageUrl,
      unitCost,
      sellingPrice: effectiveSellingPrice,
      isTaxable,
      maintPlanOverride,
      maintPlanPrice: maintPlanOverride ? maintPlanPrice : effectiveSellingPrice,
      isServiceFee,
      laborRate,
      laborHours,
      isFavorite,
    });
  };

  return (
    // Fixed container with items-start and pt-[5vh] to prevent ANY vertical jumping
    <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 overflow-y-auto flex items-start justify-center pt-[5vh] pb-10 p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-[1120px] min-h-[640px] max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs font-sans">
        
        {/* Header: Clean title with NO product type badge indicator */}
        <div className="bg-[#f4f5f6] px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-slate-700">
            {editingProduct ? 'Edit Product' : 'New Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700 flex flex-col justify-between">
          <div className="space-y-5">
            {/* TOP DROPDOWN: Select Product Type * (Allows live switching between 4 configurations) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Select Product Type <span className="text-red-500">*</span>
              </label>
              <div className="relative max-w-md">
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as ProductType)}
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

            {/* TABS (Product Information & Additional Details) + Favorite Heart */}
            {productType !== 'Product Bundle - Multi Item Group' && (
              <div className="flex items-center justify-between border-b border-slate-200 pt-1 pb-0">
                <div className="flex items-center gap-6 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
                      activeTab === 'info'
                        ? 'border-[#be4646] text-[#be4646] font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Product Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('additional')}
                    className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
                      activeTab === 'additional'
                        ? 'border-[#be4646] text-[#be4646] font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Additional Details
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    isFavorite ? 'text-red-500 fill-red-500' : 'text-slate-400 hover:text-red-500'
                  }`}
                  title="Favorite Product"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
                </button>
              </div>
            )}

            {/* TAB CONTENT: PRODUCT INFORMATION */}
            {activeTab === 'info' && (
              <div className="space-y-5">
                
                {/* 1. CONFIGURATION: SINGLE PART ONLY */}
                {productType === 'Product - Single Part Only' && (
                  <div className="space-y-5">
                    {/* Optional Search Bar for Existing Part */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">
                        Search for Existing Part (optional)
                      </label>
                      <div className="flex items-center border border-slate-300 rounded bg-white px-3 py-1.5 shadow-2xs">
                        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search name or product/model number..."
                          value={searchExisting}
                          onChange={(e) => setSearchExisting(e.target.value)}
                          className="w-full text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
                        />
                      </div>
                    </div>

                    {/* 2-Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      {/* Left: Product Details */}
                      <div className="space-y-3.5">
                        <h3 className="font-semibold text-slate-700 text-sm">Product Details</h3>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Product Number
                            </label>
                            <input
                              type="text"
                              value={sku}
                              onChange={(e) => setSku(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Product Image
                            </label>
                            <div className="flex items-center gap-2 border border-slate-300 rounded px-2.5 py-1 bg-white">
                              <label className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-200">
                                Choose File
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) setImageUrl(URL.createObjectURL(e.target.files[0]));
                                  }}
                                />
                              </label>
                              <span className="text-[11px] text-slate-400 truncate">
                                {imageUrl ? 'File attached' : 'No file chosen'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Categories <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={categoryPath}
                            onChange={(e) => setCategoryPath(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                          >
                            <option value="HVAC > Equipment > 1.5 - 5 Ton Split Systems">HVAC &gt; Equipment &gt; 1.5 - 5 Ton Split Systems</option>
                            <option value="HVAC > Equipment > Package Units">HVAC &gt; Equipment &gt; Package Units</option>
                            <option value="HVAC > Equipment > Heat Pumps">HVAC &gt; Equipment &gt; Heat Pumps</option>
                            <option value="HVAC > Parts">HVAC &gt; Parts</option>
                            <option value="COD and Resorts > COD">COD and Resorts &gt; COD</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Account <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                          >
                            <option value="Services > HVAC Equipment">Services &gt; HVAC Equipment</option>
                            <option value="Services > HVAC Labor">Services &gt; HVAC Labor</option>
                            <option value="Parts > Motors & Blowers">Parts &gt; Motors &amp; Blowers</option>
                            <option value="Parts > Electrical">Parts &gt; Electrical</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
                          />
                        </div>
                      </div>

                      {/* Right: Pricing & Pricing Strategies */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold text-slate-700 text-sm mb-3">Pricing</h3>

                          <div className="grid grid-cols-5 gap-2 items-end">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Standard Price
                              </label>
                              <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                                <span className="text-slate-400 mr-1 font-semibold">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={sellingPrice || ''}
                                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full text-xs focus:outline-none font-semibold"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                Markup <Info className="w-3 h-3 text-slate-400" />
                              </label>
                              <div className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 ">
                                {calculatedMarkup}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                Margin <Info className="w-3 h-3 text-slate-400" />
                              </label>
                              <div className="text-xs text-slate-700 py-1 font-medium">
                                {calculatedMargin}%
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Cost
                              </label>
                              <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                                <span className="text-slate-400 mr-1 font-semibold">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={unitCost || ''}
                                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Tax Default
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsTaxable(!isTaxable)}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                                  isTaxable ? 'bg-sky-500' : 'bg-slate-300'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                    isTaxable ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Pricing Strategies Table */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-slate-700 text-sm">Pricing Strategies</h3>

                          <div className="border border-slate-200 rounded overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                  <th className="px-3 py-2 w-14"></th>
                                  <th className="px-3 py-2">Name</th>
                                  <th className="px-3 py-2">Change vs Standard</th>
                                  <th className="px-3 py-2 flex items-center gap-1">
                                    Strategy Price <Info className="w-3 h-3 text-slate-400" />
                                  </th>
                                  <th className="px-3 py-2 w-10 text-right"></th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-slate-100">
                                <tr>
                                  <td className="px-3 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => setMaintPlanOverride(!maintPlanOverride)}
                                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                        maintPlanOverride ? 'bg-sky-500' : 'bg-slate-300'
                                      }`}
                                    >
                                      <div
                                        className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                                          maintPlanOverride ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800">
                                    Maintenance Plan Price
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-600">
                                    0.0%
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-800">
                                    {maintPlanOverride ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={maintPlanPrice || ''}
                                        onChange={(e) => setMaintPlanPrice(parseFloat(e.target.value) || 0)}
                                        className="w-24 px-2 py-0.5 border border-slate-300 rounded text-xs"
                                      />
                                    ) : (
                                      `$${(maintPlanPrice || sellingPrice).toFixed(2)}`
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <Edit2 className="w-3.5 h-3.5 text-red-500 cursor-pointer inline" />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CONFIGURATION: LABOR / SERVICE ONLY */}
                {productType === 'Product - Labor/Service Only' && (
                  <div className="space-y-5">
                    {/* Optional Search Bar for Existing Service/Labor */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">
                        Search for Existing Service/Labor (optional)
                      </label>
                      <div className="flex items-center border border-slate-300 rounded bg-white px-3 py-1.5 shadow-2xs">
                        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search name..."
                          value={searchExisting}
                          onChange={(e) => setSearchExisting(e.target.value)}
                          className="w-full text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
                        />
                      </div>
                    </div>

                    {/* 2-Column Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      {/* Left: Product Details */}
                      <div className="space-y-3.5">
                        <h3 className="font-semibold text-slate-700 text-sm">Product Details</h3>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Product Number
                            </label>
                            <input
                              type="text"
                              value={sku}
                              onChange={(e) => setSku(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Product Image
                            </label>
                            <div className="flex items-center gap-2 border border-slate-300 rounded px-2.5 py-1 bg-white">
                              <label className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-200">
                                Choose File
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) setImageUrl(URL.createObjectURL(e.target.files[0]));
                                  }}
                                />
                              </label>
                              <span className="text-[11px] text-slate-400 truncate">
                                {imageUrl ? 'File attached' : 'No file chosen'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Categories <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={categoryPath}
                            onChange={(e) => setCategoryPath(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                          >
                            <option value="HVAC > Service">HVAC &gt; Service</option>
                            <option value="HVAC > Equipment">HVAC &gt; Equipment</option>
                            <option value="COD and Resorts > COD">COD and Resorts &gt; COD</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Account <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                          >
                            <option value="Services > HVAC Labor">Services &gt; HVAC Labor</option>
                            <option value="Services > HVAC Equipment">Services &gt; HVAC Equipment</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
                          />
                        </div>
                      </div>

                      {/* Right: Labor Pricing & Strategies */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold text-slate-700 text-sm mb-3">Pricing</h3>

                          {/* Row 1: Standard Price, Markup, Margin, Cost (/hr), Tax Default */}
                          <div className="grid grid-cols-5 gap-2 items-end mb-4">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Standard Price
                              </label>
                              <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                                <span className="text-slate-400 mr-1 font-semibold">$</span>
                                <span className="text-xs font-semibold text-slate-900">
                                  {(laborRate * laborHours).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Markup
                              </label>
                              <div className="border border-slate-300 rounded bg-white px-2.5 py-1 text-xs text-slate-700 ">
                                {unitCost > 0 ? (laborRate / unitCost).toFixed(0) : '2'}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                Margin <Info className="w-3 h-3 text-slate-400" />
                              </label>
                              <div className="text-xs text-slate-700 py-1 font-medium">
                                50.0%
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Cost
                              </label>
                              <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                                <span className="text-slate-400 mr-1 font-semibold">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={unitCost || ''}
                                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                                  placeholder="50.00"
                                  className="w-full text-xs focus:outline-none"
                                />
                                <span className="text-slate-400 text-[10px] ml-1">/hr</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Tax Default
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsTaxable(!isTaxable)}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                                  isTaxable ? 'bg-sky-500' : 'bg-slate-300'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                    isTaxable ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Service Fee, Labor Rate, Labor Hours */}
                          <div className="grid grid-cols-3 gap-4 items-end pt-1">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Service Fee
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsServiceFee(!isServiceFee)}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                                  isServiceFee ? 'bg-slate-600' : 'bg-slate-300'
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                    isServiceFee ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Labor Rate
                              </label>
                              <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                                <span className="text-slate-400 mr-1 font-semibold">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={laborRate || ''}
                                  onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                                  className="w-full text-xs focus:outline-none font-semibold"
                                />
                                <span className="text-slate-400 text-[10px] ml-1">/hr</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Labor Hours
                              </label>
                              <input
                                type="number"
                                step="0.25"
                                value={laborHours || ''}
                                onChange={(e) => setLaborHours(parseFloat(e.target.value) || 1)}
                                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Pricing Strategies Table */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-slate-700 text-sm">Pricing Strategies</h3>

                          <div className="border border-slate-200 rounded overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                  <th className="px-3 py-2 w-14"></th>
                                  <th className="px-3 py-2">Name</th>
                                  <th className="px-3 py-2">Change vs Standard</th>
                                  <th className="px-3 py-2 flex items-center gap-1">
                                    Strategy Price <Info className="w-3 h-3 text-slate-400" />
                                  </th>
                                  <th className="px-3 py-2 w-10 text-right"></th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-slate-100">
                                <tr>
                                  <td className="px-3 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => setMaintPlanOverride(!maintPlanOverride)}
                                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                        maintPlanOverride ? 'bg-sky-500' : 'bg-slate-300'
                                      }`}
                                    >
                                      <div
                                        className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                                          maintPlanOverride ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800">
                                    Maintenance Plan Price
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-600">
                                    0.0%
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-800">
                                    ${(laborRate * laborHours).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <Edit2 className="w-3.5 h-3.5 text-red-500 cursor-pointer inline" />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CONFIGURATION: PRODUCT BUNDLE - MULTI ITEM GROUP */}
                {productType === 'Product Bundle - Multi Item Group' && (
                  <div className="space-y-6">
                    {/* Collapsible Section 1: Select Parts - */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setIsPartsSectionOpen(!isPartsSectionOpen)}
                        className="w-full px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-left font-semibold text-slate-700 flex items-center justify-between"
                      >
                        <span>Select Parts -</span>
                        <span className="text-xs text-slate-400">{isPartsSectionOpen ? '▼' : '►'}</span>
                      </button>

                      {isPartsSectionOpen && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center border border-slate-300 rounded bg-white px-3 py-1.5">
                            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                            <input
                              type="text"
                              placeholder="Search name or product/model number..."
                              className="w-full text-xs focus:outline-none placeholder:text-slate-400 bg-transparent"
                            />
                          </div>

                          <div className="border border-slate-200 rounded overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                                  <th className="px-3 py-2 w-10 text-center">
                                    <input type="checkbox" className="rounded" />
                                  </th>
                                  <th className="px-3 py-2">Part Name</th>
                                  <th className="px-3 py-2">Product Name</th>
                                  <th className="px-3 py-2">Unit Price</th>
                                  <th className="px-3 py-2">Cost</th>
                                  <th className="px-3 py-2">Manufacturer #</th>
                                  <th className="px-3 py-2">Product #</th>
                                  <th className="px-3 py-2">Source</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {bundleParts.map((part) => (
                                  <tr key={part.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={part.selected || false}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setBundleParts((prev) =>
                                            prev.map((p) => (p.id === part.id ? { ...p, selected: checked } : p))
                                          );
                                        }}
                                        className="rounded"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-800">{part.partName}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{part.productName}</td>
                                    <td className="px-3 py-2.5 ">${part.unitPrice.toFixed(2)}</td>
                                    <td className="px-3 py-2.5 ">${part.cost.toFixed(2)}</td>
                                    <td className="px-3 py-2.5 text-slate-400">{part.manufacturerNumber || '—'}</td>
                                    <td className="px-3 py-2.5 text-slate-400">{part.productNumber || '—'}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{part.source}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <div className="flex items-center gap-1 text-[11px] text-slate-600">
                              <button type="button" className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800">First</button>
                              <button type="button" className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800">Previous</button>
                              <span className="px-2 py-0.5 bg-[#be4646] text-white rounded font-bold">1</span>
                              <button type="button" className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900">2</button>
                              <button type="button" className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900">3</button>
                              <button type="button" className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900">4</button>
                              <button type="button" className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900">5</button>
                              <span className="px-1 text-slate-400">...</span>
                              <button type="button" className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900">Next</button>
                              <button type="button" className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900">Last</button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setProductType('Product - Single Part Only')}
                              className="text-[#be4646] font-semibold hover:underline flex items-center gap-1 text-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add New Part</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Section 2: Select Labor/Service - */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setIsLaborSectionOpen(!isLaborSectionOpen)}
                        className="w-full px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-left font-semibold text-slate-700 flex items-center justify-between"
                      >
                        <span>Select Labor/Service -</span>
                        <span className="text-xs text-slate-400">{isLaborSectionOpen ? '▼' : '►'}</span>
                      </button>

                      {isLaborSectionOpen && (
                        <div className="p-4 space-y-3">
                          <div className="border border-slate-200 rounded overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                                  <th className="px-3 py-2 w-10 text-center">
                                    <input type="checkbox" className="rounded" />
                                  </th>
                                  <th className="px-3 py-2">Service Name</th>
                                  <th className="px-3 py-2">Labor Rate</th>
                                  <th className="px-3 py-2">Estimated Hours</th>
                                  <th className="px-3 py-2">Source</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {bundleServices.map((srv) => (
                                  <tr key={srv.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={srv.selected || false}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setBundleServices((prev) =>
                                            prev.map((s) => (s.id === srv.id ? { ...s, selected: checked } : s))
                                          );
                                        }}
                                        className="rounded"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-800 font-medium">{srv.serviceName}</td>
                                    <td className="px-3 py-2.5 ">${srv.laborRate.toFixed(2)}/hr</td>
                                    <td className="px-3 py-2.5 text-slate-600">{srv.hours} hrs</td>
                                    <td className="px-3 py-2.5 text-slate-600">{srv.source}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. CONFIGURATION: DISCOUNT */}
                {productType === 'Discount' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left: Product Details */}
                    <div className="space-y-3.5">
                      <h3 className="font-semibold text-slate-700 text-sm">Product Details</h3>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. 10% Senior Citizen Discount"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Product Number
                          </label>
                          <input
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Product Image
                          </label>
                          <div className="flex items-center gap-2 border border-slate-300 rounded px-2.5 py-1 bg-white">
                            <label className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-200">
                              Choose File
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files?.[0]) setImageUrl(URL.createObjectURL(e.target.files[0]));
                                }}
                              />
                            </label>
                            <span className="text-[11px] text-slate-400 truncate">
                              {imageUrl ? 'File attached' : 'No file chosen'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Categories <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={categoryPath}
                          onChange={(e) => setCategoryPath(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                        >
                          <option value="Discounts & Promotions">Discounts &amp; Promotions</option>
                          <option value="HVAC > Equipment">HVAC &gt; Equipment</option>
                          <option value="HVAC > Service">HVAC &gt; Service</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Account <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                        >
                          <option value="Discounts > Promotional">Discounts &gt; Promotional</option>
                          <option value="Services > HVAC Labor">Services &gt; HVAC Labor</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Right: Pricing */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700 text-sm">Pricing</h3>

                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Price <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center border border-slate-300 rounded bg-white px-2.5 py-1.5">
                            <span className="text-slate-400 mr-1.5 font-semibold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={sellingPrice || ''}
                              onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-xs focus:outline-none font-semibold text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Tax Default
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsTaxable(!isTaxable)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              isTaxable ? 'bg-sky-500' : 'bg-slate-300'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                isTaxable ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: ADDITIONAL DETAILS */}
            {activeTab === 'additional' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-3 border-b border-slate-200 pb-4">
                  <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-1.5 text-[#a82e2e]">
                    <Layers className="w-3.5 h-3.5" /> QuickBooks Online Account Mapping
                  </h3>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Income / Expense Account <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={qbAccount}
                      onChange={(e) => setQbAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
                    >
                      <option value="Services > HVAC Labor">Services &gt; HVAC Labor</option>
                      <option value="Services > HVAC Equipment">Services &gt; HVAC Equipment</option>
                      <option value="Parts > Motors & Blowers">Parts &gt; Motors &amp; Blowers</option>
                      <option value="Parts > Electrical">Parts &gt; Electrical</option>
                      <option value="Discounts > Promotional">Discounts &gt; Promotional</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs text-slate-600">
                  <div className="font-bold text-slate-800">Extended Attributes &amp; Synchronization</div>
                  <p>All items added to the Apex Price Book automatically synchronize with technicians&apos; mobile dispatch app, proposal comparison builder, and invoice ledger.</p>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 cursor-pointer text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="danger"
              className="px-8 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
            >
              {productType === 'Product Bundle - Multi Item Group' 
                ? 'Create Product Bundle' 
                : 'Save'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
