'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CanonicalAuthorizedPerson, CanonicalCustomer } from '@murphys/domain';

export interface AddAuthorizedPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (person: CanonicalAuthorizedPerson) => Promise<boolean | void> | boolean | void;
  customer?: CanonicalCustomer | null;
  locations?: Array<{ id: string; addr1: string; city: string; state?: string; zipCode?: string }>;
  initialPerson?: CanonicalAuthorizedPerson | null;
}

import { AUTHORIZED_PERSONS_LABELS } from '@/constants/globalChoices';

const CONTACT_TYPES = [...AUTHORIZED_PERSONS_LABELS];

export function AddAuthorizedPersonModal({
  isOpen,
  onClose,
  onSave,
  customer,
  locations = [],
  initialPerson,
}: AddAuthorizedPersonModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [contactType, setContactType] = useState('Primary');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPerson) {
        setFirstName(initialPerson.firstName || '');
        setLastName(initialPerson.lastName || '');
        setEmail(initialPerson.email || '');
        setHomePhone(initialPerson.homePhone || '');
        setMobilePhone(initialPerson.mobilePhone || initialPerson.phone || '');
        setContactType(initialPerson.positionLabel || 'Primary');
        setSelectedLocationId(initialPerson.locationId || locations[0]?.id || '');
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setHomePhone('');
        setMobilePhone('');
        setContactType('Primary');
        setSelectedLocationId(locations[0]?.id || '');
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialPerson, locations]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      setErrorMsg('First Name is required.');
      return;
    }
    if (!contactType.trim()) {
      setErrorMsg('Contact Type is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const selectedLoc = locations.find((l) => l.id === selectedLocationId) || locations[0];
    const locAddress = selectedLoc ? `${selectedLoc.addr1}, ${selectedLoc.city}` : '';

    const newPerson: CanonicalAuthorizedPerson = {
      id: initialPerson?.id || `auth-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      positionLabel: contactType.trim(),
      phone: mobilePhone.trim() || homePhone.trim() || '',
      mobilePhone: mobilePhone.trim() || undefined,
      homePhone: homePhone.trim() || undefined,
      email: email.trim() || undefined,
      locationId: selectedLocationId || selectedLoc?.id || undefined,
      assignedLocation: locAddress || undefined,
      isPrimary: contactType === 'Primary',
    };

    try {
      await onSave(newPerson);
      setIsSaving(false);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save authorized person.');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans text-xs ">
        
        {/* Header (Matching screenshot: "Add Authorized Person") */}
        <div className="bg-[#f7f8f8] px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-normal text-slate-700 tracking-tight">
            Add Authorized Person
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 bg-white">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {errorMsg}
            </div>
          )}

          {/* Row 1: First Name *, Last Name, Email */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Row 2: Home Phone, Mobile Phone, Contact Type * */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Home Phone
              </label>
              <input
                type="text"
                value={homePhone}
                onChange={(e) => setHomePhone(e.target.value)}
                placeholder="Home Phone"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Mobile Phone
              </label>
              <input
                type="text"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
                placeholder="Mobile Phone"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Contact Type <span className="text-red-500">*</span>
              </label>
              <select
                value={contactType}
                onChange={(e) => setContactType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
              >
                {CONTACT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Location */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Location
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
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

        {/* Footer (Matching screenshot: Red Save button in bottom right) */}
        <div className="px-6 py-3.5 bg-[#fcfdfd] border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
