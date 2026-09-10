'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  PlusCircle, 
  MinusCircle, 
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { 
  CanonicalEquipment,
  CanonicalCustomer,
  EquipmentWarrantyDetail
} from '@murphys/domain';
import { 
  DatePicker 
} from '@/components/ui';
import { useWarranties } from '@/hooks/useWarranties';

export interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: CanonicalEquipment) => Promise<boolean | void> | boolean | void;
  customer?: CanonicalCustomer | null;
  locations?: Array<{ id: string; addr1: string; city: string; state?: string; zipCode?: string }>;
  initialEquipment?: CanonicalEquipment | null;
}

export function AddEquipmentModal({
  isOpen,
  onClose,
  onSave,
  customer,
  locations = [],
  initialEquipment,
}: AddEquipmentModalProps) {
  const { warranties } = useWarranties();

  const manufacturerWarrantyOptions = React.useMemo(() => {
    const list = ['None'];
    warranties.forEach((w) => {
      if (!list.includes(w.name)) {
        list.push(w.name);
      }
    });
    if (initialEquipment?.manufacturerWarranty && !list.includes(initialEquipment.manufacturerWarranty)) {
      list.push(initialEquipment.manufacturerWarranty);
    }
    return list;
  }, [warranties, initialEquipment]);

  // Form State - All blank by default except location
  const [name, setName] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'replaced'>('active');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Manufacturer Warranty
  const [manufacturerWarranty, setManufacturerWarranty] = useState('None');
  const [mfgStartDate, setMfgStartDate] = useState('');
  const [mfgEndDate, setMfgEndDate] = useState('');

  // Install Date
  const [installDate, setInstallDate] = useState('');

  // Other Warranty (Collapsible)
  const [showOtherWarranty, setShowOtherWarranty] = useState(false);
  const [otherWarrantyName, setOtherWarrantyName] = useState('');
  const [otherWarrantyDesc, setOtherWarrantyDesc] = useState('');
  const [otherWarrantyStartDate, setOtherWarrantyStartDate] = useState('');
  const [otherWarrantyEndDate, setOtherWarrantyEndDate] = useState('');

  // Additional Warranty (Collapsible)
  const [showAdditionalWarranty, setShowAdditionalWarranty] = useState(false);
  const [addWarrantyName, setAddWarrantyName] = useState('');
  const [addWarrantyDesc, setAddWarrantyDesc] = useState('');
  const [addWarrantyStartDate, setAddWarrantyStartDate] = useState('');
  const [addWarrantyEndDate, setAddWarrantyEndDate] = useState('');

  // Image Upload & Thumbnails
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Validation & Saving
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      if (initialEquipment) {
        setName(initialEquipment.name || initialEquipment.equipmentType || '');
        setModelNumber(initialEquipment.modelNumber || initialEquipment.modelNo || '');
        setManufacturer(initialEquipment.manufacturer || initialEquipment.mfg || '');
        setSerialNumber(initialEquipment.serialNumber || initialEquipment.serialNo || '');
        setStatus((initialEquipment.status as any) || 'active');
        setSelectedLocationId(initialEquipment.locationId || locations[0]?.id || '');
        setManufacturerWarranty(initialEquipment.manufacturerWarranty || 'None');
        setMfgStartDate(initialEquipment.manufacturerWarrantyStartDate || '');
        setMfgEndDate(initialEquipment.manufacturerWarrantyEndDate || '');
        setInstallDate(initialEquipment.installDate || initialEquipment.installedOn || '');

        if (initialEquipment.otherWarranty) {
          setShowOtherWarranty(true);
          setOtherWarrantyName(initialEquipment.otherWarranty.name || '');
          setOtherWarrantyDesc(initialEquipment.otherWarranty.description || '');
          setOtherWarrantyStartDate(initialEquipment.otherWarranty.startDate || '');
          setOtherWarrantyEndDate(initialEquipment.otherWarranty.endDate || '');
        } else {
          setShowOtherWarranty(false);
        }

        if (initialEquipment.additionalWarranty) {
          setShowAdditionalWarranty(true);
          setAddWarrantyName(initialEquipment.additionalWarranty.name || '');
          setAddWarrantyDesc(initialEquipment.additionalWarranty.description || '');
          setAddWarrantyStartDate(initialEquipment.additionalWarranty.startDate || '');
          setAddWarrantyEndDate(initialEquipment.additionalWarranty.endDate || '');
        } else {
          setShowAdditionalWarranty(false);
        }
        setImagePreviewUrl(initialEquipment.imageUrl || null);
      } else {
        // All fields blank by default except location
        setName('');
        setModelNumber('');
        setManufacturer('');
        setSerialNumber('');
        setStatus('active');
        setSelectedLocationId(locations[0]?.id || '');
        setManufacturerWarranty('None');
        setMfgStartDate('');
        setMfgEndDate('');
        setInstallDate('');
        setShowOtherWarranty(false);
        setOtherWarrantyName('');
        setOtherWarrantyDesc('');
        setOtherWarrantyStartDate('');
        setOtherWarrantyEndDate('');
        setShowAdditionalWarranty(false);
        setAddWarrantyName('');
        setAddWarrantyDesc('');
        setAddWarrantyStartDate('');
        setAddWarrantyEndDate('');
        setImageFile(null);
        setImagePreviewUrl(null);
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialEquipment, locations]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreviewUrl(preview);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Equipment Name is required.');
      return;
    }
    if (!manufacturer.trim()) {
      setErrorMsg('Manufacturer is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const selectedLoc = locations.find((l) => l.id === selectedLocationId) || locations[0];
    const locAddress = selectedLoc ? `${selectedLoc.addr1}, ${selectedLoc.city} ${selectedLoc.state || ''}` : '';

    let otherWarrantyObj: EquipmentWarrantyDetail | undefined = undefined;
    if (showOtherWarranty && otherWarrantyName.trim()) {
      otherWarrantyObj = {
        id: `war-${Date.now()}-1`,
        name: otherWarrantyName.trim(),
        description: otherWarrantyDesc.trim(),
        startDate: otherWarrantyStartDate || undefined,
        endDate: otherWarrantyEndDate || undefined,
      };
    }

    let addWarrantyObj: EquipmentWarrantyDetail | undefined = undefined;
    if (showAdditionalWarranty && addWarrantyName.trim()) {
      addWarrantyObj = {
        id: `war-${Date.now()}-2`,
        name: addWarrantyName.trim(),
        description: addWarrantyDesc.trim(),
        startDate: addWarrantyStartDate || undefined,
        endDate: addWarrantyEndDate || undefined,
      };
    }

    const newEquipment: CanonicalEquipment = {
      id: initialEquipment?.id || `eq-${Date.now()}`,
      customerId: customer?.id || initialEquipment?.customerId || 'cust-1',
      name: name.trim(),
      equipmentType: name.trim(),
      type: name.trim(),
      manufacturer: manufacturer.trim(),
      mfg: manufacturer.trim(),
      modelNumber: modelNumber.trim(),
      modelNo: modelNumber.trim(),
      serialNumber: serialNumber.trim(),
      serialNo: serialNumber.trim(),
      status,
      locationId: selectedLocationId || selectedLoc?.id || null,
      locationStreet: selectedLoc?.addr1 || null,
      locationAddress: locAddress || null,
      installDate: installDate || undefined,
      installedOn: installDate || undefined,
      manufacturerWarranty: manufacturerWarranty !== 'None' ? manufacturerWarranty : undefined,
      manufacturerWarrantyStartDate: mfgStartDate || undefined,
      manufacturerWarrantyEndDate: mfgEndDate || undefined,
      otherWarranty: otherWarrantyObj,
      additionalWarranty: addWarrantyObj,
      imageUrl: imagePreviewUrl || initialEquipment?.imageUrl || null,
      createdAt: initialEquipment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(newEquipment);
      setIsSaving(false);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save equipment.');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-3xl h-[88vh] max-h-[850px] min-h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans text-xs ">
        
        {/* 1. Header: Labeled "New Equipment", no icon, no return string */}
        <div className="bg-[#fcfdfd] px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-medium text-slate-800 tracking-tight">
            New Equipment
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          
          {/* Customer & Location Header Box */}
          <div className="pb-4 border-b border-slate-100 space-y-1">
            <h3 className="text-base font-semibold text-slate-800">
              {customer?.name || 'Customer Name'}
            </h3>
            
            {/* Location Selector Dropdown */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-medium text-slate-500">Location:</span>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[280px] cursor-pointer"
              >
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.addr1}, {loc.city} {loc.state || ''} {loc.zipCode || ''}
                    </option>
                  ))
                ) : (
                  <option value="">Default Location</option>
                )}
              </select>
            </div>
          </div>

          {/* Validation Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {errorMsg}
            </div>
          )}

          {/* Main 2-Column Form Fields (Labels on left, inputs on right - No Placeholders) */}
          <div className="space-y-4 max-w-2xl">
            
            {/* 1. Equipment Name * */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-semibold text-slate-700 text-right">
                Equipment Name <span className="text-red-500">*</span>
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* 2. Model Number */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-medium text-slate-700 text-right">
                Model Number
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* 3. Manufacturer * (Editable text field, no placeholder, no custom button) */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-semibold text-slate-700 text-right">
                Manufacturer <span className="text-red-500">*</span>
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* 4. Serial Number */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-medium text-slate-700 text-right">
                Serial Number
              </label>
              <div className="col-span-8">
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* 5. Status */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-medium text-slate-700 text-right">
                Status
              </label>
              <div className="col-span-8">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* 6. Manufacturer Warranty */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-medium text-slate-700 text-right">
                Manufacturer Warranty
              </label>
              <div className="col-span-8">
                <select
                  value={manufacturerWarranty}
                  onChange={(e) => setManufacturerWarranty(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  {manufacturerWarrantyOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 7. Effective Date */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-medium text-slate-700 text-right">
                Effective Date
              </label>
              <div className="col-span-8 grid grid-cols-2 gap-3">
                <DatePicker
                  value={mfgStartDate}
                  onChange={(val) => setMfgStartDate(val)}
                />
                <DatePicker
                  value={mfgEndDate}
                  onChange={(val) => setMfgEndDate(val)}
                />
              </div>
            </div>

            {/* 8. Install Date */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <label className="col-span-4 text-xs font-medium text-slate-700 text-right">
                Install Date
              </label>
              <div className="col-span-8">
                <DatePicker
                  value={installDate}
                  onChange={(val) => setInstallDate(val)}
                />
              </div>
            </div>

            {/* 9. Collapsible: Other Warranty */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOtherWarranty(!showOtherWarranty)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#be4646] hover:text-[#9e3a3a] cursor-pointer"
              >
                {showOtherWarranty ? (
                  <>
                    <MinusCircle className="w-3.5 h-3.5" />
                    <span>Hide Other Warranty</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Other Warranty</span>
                  </>
                )}
              </button>

              {showOtherWarranty && (
                <div className="mt-2.5 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 animate-in fade-in duration-100">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-xs font-medium text-slate-700 text-right">
                      Name
                    </label>
                    <div className="col-span-9">
                      <input
                        type="text"
                        value={otherWarrantyName}
                        onChange={(e) => setOtherWarrantyName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-xs font-medium text-slate-700 text-right">
                      Description
                    </label>
                    <div className="col-span-9">
                      <input
                        type="text"
                        value={otherWarrantyDesc}
                        onChange={(e) => setOtherWarrantyDesc(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-xs font-medium text-slate-700 text-right">
                      Dates Effective
                    </label>
                    <div className="col-span-9 grid grid-cols-2 gap-3">
                      <DatePicker
                        value={otherWarrantyStartDate}
                        onChange={(val) => setOtherWarrantyStartDate(val)}
                      />
                      <DatePicker
                        value={otherWarrantyEndDate}
                        onChange={(val) => setOtherWarrantyEndDate(val)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 10. Collapsible: Additional Warranty */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdditionalWarranty(!showAdditionalWarranty)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#be4646] hover:text-[#9e3a3a] cursor-pointer"
              >
                {showAdditionalWarranty ? (
                  <>
                    <MinusCircle className="w-3.5 h-3.5" />
                    <span>Hide Additional Warranty</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Additional Warranty</span>
                  </>
                )}
              </button>

              {showAdditionalWarranty && (
                <div className="mt-2.5 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 animate-in fade-in duration-100">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-xs font-medium text-slate-700 text-right">
                      Name
                    </label>
                    <div className="col-span-9">
                      <input
                        type="text"
                        value={addWarrantyName}
                        onChange={(e) => setAddWarrantyName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-xs font-medium text-slate-700 text-right">
                      Description
                    </label>
                    <div className="col-span-9">
                      <input
                        type="text"
                        value={addWarrantyDesc}
                        onChange={(e) => setAddWarrantyDesc(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-xs font-medium text-slate-700 text-right">
                      Dates Effective
                    </label>
                    <div className="col-span-9 grid grid-cols-2 gap-3">
                      <DatePicker
                        value={addWarrantyStartDate}
                        onChange={(val) => setAddWarrantyStartDate(val)}
                      />
                      <DatePicker
                        value={addWarrantyEndDate}
                        onChange={(val) => setAddWarrantyEndDate(val)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 11. Image Upload with Thumbnail Display */}
            <div className="grid grid-cols-12 gap-4 items-start pt-2">
              <label className="col-span-4 text-xs font-medium text-slate-700 text-right pt-1.5">
                Image (.png, .jpeg, or .gif)
              </label>
              <div className="col-span-8 space-y-3">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleImageChange}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />

                {/* Thumbnail Display Card */}
                {imagePreviewUrl && (
                  <div className="relative inline-block border border-slate-200 rounded-lg p-1.5 bg-slate-50 shadow-2xs group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Equipment preview"
                      className="w-24 h-24 object-cover rounded border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[96px] text-center">
                      {imageFile?.name || 'Attached Photo'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Pinned Footer: Red button without chevron */}
        <div className="px-6 py-4 bg-[#fcfdfd] border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Equipment'}
          </button>
        </div>
      </div>
    </div>
  );
}
