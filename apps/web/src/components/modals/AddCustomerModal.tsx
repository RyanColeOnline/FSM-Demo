'use client';

import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { CanonicalCustomer } from '@murphys/domain';
import { useCustomers } from '@/hooks/useCustomers';
import { REFERRAL_LIST, TAX_GROUPS } from '@/constants/globalChoices';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: CanonicalCustomer) => void;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
}: AddCustomerModalProps) {
  const { saveCustomer } = useCustomers();

  const [newCustType, setNewCustType] = useState<'Residential' | 'Commercial'>('Residential');
  const [newCustReferralSource, setNewCustReferralSource] = useState('');
  const [newCustFirstName, setNewCustFirstName] = useState('');
  const [newCustLastName, setNewCustLastName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustAddress2, setNewCustAddress2] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('FL');
  const [newCustZip, setNewCustZip] = useState('');
  const [newCustTaxGroup, setNewCustTaxGroup] = useState('FL (7%)');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustMobilePhone, setNewCustMobilePhone] = useState('');
  const [newCustHomePhone, setNewCustHomePhone] = useState('');
  const [newCustCommMethod, setNewCustCommMethod] = useState<'Email' | 'Text'>('Email');
  const [newCustOptOutText, setNewCustOptOutText] = useState(false);
  const [newCustOptOutEmail, setNewCustOptOutEmail] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setNewCustType('Residential');
    setNewCustReferralSource('');
    setNewCustFirstName('');
    setNewCustLastName('');
    setNewCustCompany('');
    setNewCustAddress('');
    setNewCustAddress2('');
    setNewCustCity('');
    setNewCustState('FL');
    setNewCustZip('');
    setNewCustTaxGroup('FL (7%)');
    setNewCustEmail('');
    setNewCustMobilePhone('');
    setNewCustHomePhone('');
    setNewCustCommMethod('Email');
    setNewCustOptOutText(false);
    setNewCustOptOutEmail(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCommercial = newCustType === 'Commercial';
    const computedName = isCommercial
      ? newCustCompany.trim() || `${newCustLastName.trim()}, ${newCustFirstName.trim()}`.replace(/^,\s*|,\s*$/g, '') || 'Commercial Customer'
      : `${newCustLastName.trim()}, ${newCustFirstName.trim()}`.replace(/^,\s*|,\s*$/g, '') || 'New Customer';

    const addrObj = {
      street: newCustAddress.trim(),
      addr2: newCustAddress2.trim() || undefined,
      city: newCustCity.trim(),
      state: newCustState,
      zipCode: newCustZip.trim(),
      type: (isCommercial ? 'commercial' : 'residential') as 'residential' | 'commercial',
      isDefault: true,
    };

    const newCust: CanonicalCustomer = {
      id: `cust-${Date.now()}`,
      accountNumber: `CUST-${Math.floor(10000 + Math.random() * 90000)}`,
      name: computedName,
      firstName: newCustFirstName.trim() || undefined,
      lastName: newCustLastName.trim() || undefined,
      customerType: isCommercial ? 'commercial' : 'residential',
      referralSource: newCustReferralSource || undefined,
      address: addrObj,
      locations: [addrObj],
      authorizedPersons: [],
      email: newCustEmail.trim() || null,
      mobilePhone: newCustMobilePhone.trim() || null,
      homePhone: newCustHomePhone.trim() || null,
      phone: newCustMobilePhone.trim() || newCustHomePhone.trim() || '',
      preferredCommunicationMethod: newCustCommMethod,
      optOutText: newCustOptOutText,
      optOutEmail: newCustOptOutEmail,
      taxGroup: newCustTaxGroup,
      autoSyncStatus: 'Synced',
      customerStatus: 'Active',
      createdAt: new Date().toISOString(),
    };

    await saveCustomer(newCust);
    if (onCustomerCreated) {
      onCustomerCreated(newCust);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-sans">
        {/* Modal Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#be4646]" />
            <h3 className="text-sm font-bold text-slate-800">Add Customer</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Row 1: Customer Type & Referral Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Customer Type</label>
              <div className="inline-flex rounded border border-slate-300 overflow-hidden w-full text-xs">
                <button
                  type="button"
                  onClick={() => setNewCustType('Residential')}
                  className={`flex-1 py-1.5 font-medium transition-colors cursor-pointer ${
                    newCustType === 'Residential'
                      ? 'bg-slate-300 text-slate-900 font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Residential
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustType('Commercial')}
                  className={`flex-1 py-1.5 font-medium transition-colors border-l border-slate-300 cursor-pointer ${
                    newCustType === 'Commercial'
                      ? 'bg-slate-300 text-slate-900 font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Commercial
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Referral Source</label>
              <select
                value={newCustReferralSource}
                onChange={(e) => setNewCustReferralSource(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
              >
                <option value="">Select source...</option>
                {REFERRAL_LIST.map((ref) => (
                  <option key={ref} value={ref}>
                    {ref}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Name Fields */}
          {newCustType === 'Commercial' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-slate-700 font-medium">
                  Company / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-700 font-medium">Contact Person Name</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCustFirstName}
                    onChange={(e) => setNewCustFirstName(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <input
                    type="text"
                    value={newCustLastName}
                    onChange={(e) => setNewCustLastName(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-slate-700 font-medium">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustFirstName}
                  onChange={(e) => setNewCustFirstName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-700 font-medium">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustLastName}
                  onChange={(e) => setNewCustLastName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>
          )}

          {/* Row 3: Address & Address 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">
                *Address
              </label>
              <input
                type="text"
                required
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Address 2</label>
              <input
                type="text"
                value={newCustAddress2}
                onChange={(e) => setNewCustAddress2(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Row 4: City, State, Zip, Default Tax Group */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">
                *City
              </label>
              <input
                type="text"
                required
                value={newCustCity}
                onChange={(e) => setNewCustCity(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">
                *State
              </label>
              <select
                value={newCustState}
                onChange={(e) => setNewCustState(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="FL">FL</option>
                <option value="AL">AL</option>
                <option value="GA">GA</option>
                <option value="MS">MS</option>
                <option value="TX">TX</option>
                <option value="TN">TN</option>
                <option value="NC">NC</option>
                <option value="SC">SC</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">
                *Zip Code
              </label>
              <input
                type="text"
                required
                value={newCustZip}
                onChange={(e) => setNewCustZip(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">
                Default Tax Group
              </label>
              <select
                value={newCustTaxGroup}
                onChange={(e) => setNewCustTaxGroup(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="FL (7%)">FL (7%)</option>
                <option value="Exempt (0%)">Exempt (0%)</option>
              </select>
            </div>
          </div>

          {/* Subheading: Communication Preferences */}
          <div className="pt-3 pb-1 border-b border-slate-100">
            <h4 className="text-sm font-normal text-slate-600">Communication Preferences</h4>
          </div>

          {/* Row 5: Email, Mobile Phone, Home Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={newCustEmail}
                onChange={(e) => setNewCustEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Mobile Phone</label>
              <input
                type="tel"
                value={newCustMobilePhone}
                onChange={(e) => setNewCustMobilePhone(formatPhoneInput(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Home Phone</label>
              <input
                type="tel"
                value={newCustHomePhone}
                onChange={(e) => setNewCustHomePhone(formatPhoneInput(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Row 6: Preferred Communication Method & Stacked Opt-Out Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 items-start">
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-medium">
                Preferred Communication Method <span className="text-red-500">*</span>
              </label>
              <div className="inline-flex rounded border border-slate-300 overflow-hidden w-48 text-xs">
                <button
                  type="button"
                  onClick={() => setNewCustCommMethod('Email')}
                  className={`flex-1 py-1.5 font-medium transition-colors cursor-pointer ${
                    newCustCommMethod === 'Email'
                      ? 'bg-[#3b82f6] text-white font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustCommMethod('Text')}
                  className={`flex-1 py-1.5 font-medium transition-colors border-l border-slate-300 cursor-pointer ${
                    newCustCommMethod === 'Text'
                      ? 'bg-[#3b82f6] text-white font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-0.5">
              {/* Opt-Out of Text Notifications */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={newCustOptOutText}
                  onClick={() => setNewCustOptOutText(!newCustOptOutText)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    newCustOptOutText ? 'bg-[#be4646]' : 'bg-slate-400'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      newCustOptOutText ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-slate-700 font-medium">
                  Opt-Out of Text Notifications
                </span>
              </div>

              {/* Opt-Out of Email Notifications */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={newCustOptOutEmail}
                  onClick={() => setNewCustOptOutEmail(!newCustOptOutEmail)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    newCustOptOutEmail ? 'bg-[#be4646]' : 'bg-slate-400'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      newCustOptOutEmail ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-slate-700 font-medium">
                  Opt-Out of Email Notifications
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs cursor-pointer shadow-2xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-1.5 rounded bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs cursor-pointer shadow-2xs transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
