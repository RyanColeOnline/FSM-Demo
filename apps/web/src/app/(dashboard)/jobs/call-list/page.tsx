'use client';

function formatCallListDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  const clean = rawDate.trim();
  try {
    // If it's ISO like 2026-08-27T08:00:00Z
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        const m = d.getMonth() + 1;
        const dt = d.getDate();
        const y = d.getFullYear();
        let h = d.getHours();
        const mn = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        return `${m}/${dt}/${y} - ${h}:${mn}${ampm}`;
      }
    }

    // If it has format M/D/YYYY H:MMam or MM/DD/YYYY H:MMam
    const match = clean.match(/^0?(\d{1,2})\/0?(\d{1,2})\/(\d{4})[\s,]+-?\s*0?(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (match) {
      const [_, m, d, y, hr, mn, ampm] = match;
      return `${m}/${d}/${y} - ${hr}:${mn}${ampm ? ampm.toLowerCase() : 'am'}`;
    }

    // Strip leading zeros from month in M/D/YYYY
    return clean.replace(/^0(\d)\/0?(\d)/, '$1/$2').replace(/\s+([0-9]{1,2}:[0-9]{2}\s*(?:am|pm)?)/i, ' - $1');
  } catch {
    return clean;
  }
}

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, MoreHorizontal, X, PhoneCall, Search, Calendar, 
  Clock, Check, ChevronLeft, ChevronRight, ChevronDown, User, MapPin, AlertTriangle, Trash2, Edit3, UserCheck, UserPlus 
} from 'lucide-react';
import { 
  Button, 
  SearchBar, 
  FilterBar, 
  PageHeader,
  DateRangePicker,
  DatePicker,
  MenuTrigger,
  Menu,
  MenuItem,
  MenuButton,
  MenuSeparator,
} from '@/components/ui';
import { AddCustomerModal } from '@/components/modals/AddCustomerModal';
import { 
  getEasternDateString, 
  formatEasternDateTime, 
  normalizeToEasternDateString 
} from '@/domain';

interface CallRecord {
  id: string;
  customerId?: string | null;
  callDate: string;
  phoneCid: string | null;
  customerName: string;
  contactName?: string;
  relatedLocation: string | null;
  callType: string | null;
  user: string;
}

interface CustomerSearchRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  mobile?: string;
}

import { useDatabaseMode } from '@/contexts/database-mode-context';
import { useCustomers } from '@/hooks/useCustomers';
import { useCalls } from '@/hooks/useCalls';
import { CanonicalCall } from '@murphys/domain';

function resolveLiveAddress(locStr: string | null | undefined, custName?: string, custObj?: any): string {
  // 1. Direct address object on customer
  if (custObj) {
    const locItem = custObj.address || (Array.isArray(custObj.locations) && custObj.locations[0]);
    if (locItem && typeof locItem === 'object') {
      const st = (locItem.street || locItem.addr1 || '').trim();
      let a2 = (locItem.addressLine2 || locItem.addr2 || locItem.street2 || '').trim();
      if (a2 && /^\d+[A-Za-z]?$/i.test(a2)) {
        a2 = `Apt ${a2}`;
      }
      const ct = (locItem.city || '').trim();
      const sta = (locItem.state || 'FL').trim();
      const zp = (locItem.zipCode || locItem.zip || '').trim();
      let stCombined = st;
      if (a2 && !st.includes(a2)) {
        stCombined = `${st}, ${a2}`.trim();
      }
      const parts: string[] = [];
      if (stCombined) parts.push(stCombined);
      if (ct && !stCombined.includes(ct)) parts.push(ct);
      if (sta && !stCombined.includes(sta)) parts.push(`${sta}${zp ? ` ${zp}` : ''}`.trim());
      else if (zp && !stCombined.includes(zp)) parts.push(zp);
      const full = parts.join(', ');
      if (full) return full;
    }
    if (typeof custObj.address === 'string' && custObj.address.trim()) {
      let cleanA = custObj.address.trim();
      if (custName) cleanA = cleanA.replace(new RegExp(`^${custName}\s*-\s*`, 'i'), '');
      cleanA = cleanA.replace(/,\s*(\d+[A-Za-z]?)\s*,/i, ', Apt $1,');
      return cleanA;
    }
  }



  if (!locStr) return '';
  let clean = locStr.trim();
  if (custName) {
    clean = clean.replace(new RegExp(`^${custName}\s*-\s*`, 'i'), '');
  }
  clean = clean.replace(/^[^,-]+-\s*/i, '');
  clean = clean.replace(/,\s*(\d+[A-Za-z]?)\s*,/i, ', Apt $1,');
  clean = clean.replace(/,\s*FL,\s*([0-9]{5}),\s*FL$/i, ', Fort Walton Beach, FL $1')
               .replace(/,\s*([A-Z]{2}),\s*([0-9]{5}),\s*$/i, ', $1 $2')
               .replace(/,\s*FL,\s*([0-9]{5})$/i, ', FL $1');
  return clean;
}

export default function WexCallListPage() {
  const { databaseMode, client } = useDatabaseMode();
  const { customers } = useCustomers();
  const { calls, saveCall: saveLiveCall, deleteCall: deleteLiveCall, loading: callsLoading } = useCalls();

  const [callLogs, setCallLogs] = useState<CallRecord[]>([]);
  
  // Date Range state preset to most recent week (Eastern US time: today and 7 days prior)
  const [startDate, setStartDate] = useState(() => getEasternDateString(-30));
  const [endDate, setEndDate] = useState(() => getEasternDateString(0));
  
  const [callTypeFilter, setCallTypeFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [searchField, setSearchField] = useState('Customer Name');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (databaseMode === 'live' || databaseMode === 'sandbox') {
      const liveRecords: CallRecord[] = calls.map((c) => {
        const matchingCust = customers.find((cust) => 
          (c.customerId && cust.id === c.customerId) || 
          (cust.name && c.customerName && cust.name.toLowerCase() === c.customerName.toLowerCase())
        );
        const resolvedLoc = resolveLiveAddress(c.relatedLocation, c.customerName, matchingCust);
        return {
          id: c.id,
          customerId: c.customerId || (matchingCust ? matchingCust.id : null),
          callDate: c.callDate,
          phoneCid: c.phoneCid || (matchingCust?.phone ? cleanPhone(matchingCust.phone) : null),
          customerName: c.customerName,
          contactName: c.contactName || c.customerName,
          relatedLocation: resolvedLoc || c.relatedLocation || null,
          callType: c.callType || 'Inbound',
          user: c.user || 'Ryan Cole',
        };
      });
      setCallLogs(liveRecords);
    } else {
      if (calls.length > 0) {
        setCallLogs(calls.map((c) => {
          const matchingCust = customers.find((cust) => 
            (c.customerId && cust.id === c.customerId) || 
            (cust.name && c.customerName && cust.name.toLowerCase() === c.customerName.toLowerCase())
          );
          const resolvedLoc = resolveLiveAddress(c.relatedLocation, c.customerName, matchingCust);
          return {
            id: c.id,
            customerId: c.customerId || (matchingCust ? matchingCust.id : null),
            callDate: c.callDate,
            phoneCid: c.phoneCid || null,
            customerName: c.customerName,
            contactName: c.contactName || c.customerName,
            relatedLocation: resolvedLoc || c.relatedLocation || null,
            callType: c.callType || 'Inbound',
            user: c.user || 'Ethan Mitchell',
          };
        }));
      } else {
        setCallLogs([]);
      }
    }
  }, [databaseMode, calls, customers]);
  
  // 20 entries per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Actions Menu & Delete Confirmation State
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [deletingCallRecord, setDeletingCallRecord] = useState<CallRecord | null>(null);
  const [reassigningCallRecord, setReassigningCallRecord] = useState<CallRecord | null>(null);

  // Modal State for Log Call
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [logCallStep, setLogCallStep] = useState<1 | 2>(1);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchRecord | null>(null);
  const [editingCallId, setEditingCallId] = useState<string | null>(null);

  // Quick Create Customer Modal State
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustFirstName, setNewCustFirstName] = useState('');
  const [newCustLastName, setNewCustLastName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('FL');
  const [newCustZip, setNewCustZip] = useState('');

  // Interactive DateTime Picker State for Log Call Only Form
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [newCallDayNum, setNewCallDayNum] = useState<number>(10);
  const [newCallHourInput, setNewCallHourInput] = useState('08');
  const [newCallMinInput, setNewCallMinInput] = useState('00');
  const [newCallAmpmInput, setNewCallAmpmInput] = useState<'AM' | 'PM'>('AM');
  const [newCallDateTimeStr, setNewCallDateTimeStr] = useState('8/27/2026 08:00 am');
  const [callDateOnly, setCallDateOnly] = useState('2026-08-27');

  // Form Fields for Log Call Only
  const [formType, setFormType] = useState('Call');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formCallType, setFormCallType] = useState('Inbound');
  const [formLocation, setFormLocation] = useState('');
  const [formNote, setFormNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Handle Dynamic Call Date/Time Calculation for Live Clock Picker
  const updateNewCallDateTime = (day: number, hour: string, min: string, ampm: 'AM' | 'PM') => {
    setNewCallDayNum(day);
    setNewCallHourInput(hour);
    setNewCallMinInput(min);
    setNewCallAmpmInput(ampm);
    const dayPadded = String(day).padStart(2, '0');
    const hrPadded = String(hour).padStart(2, '0');
    const minPadded = String(min).padStart(2, '0');
    setNewCallDateTimeStr(`08/${dayPadded}/2026, ${hrPadded}:${minPadded} ${ampm}`);
  };

  // Live and Mock Search Records
  const allCustomerSearchRecords: CustomerSearchRecord[] = React.useMemo(() => {
    const liveRecords: CustomerSearchRecord[] = customers.map((c) => {
      const addr = c.address ? `${c.address.street}${c.address.addressLine2 ? `, ${c.address.addressLine2}` : ''}, ${c.address.city}, ${c.address.state} ${c.address.zipCode}` : '';
      return {
        id: c.id,
        name: c.name,
        phone: c.phone ? `Mobile: ${c.phone}` : '',
        mobile: c.mobilePhone || c.phone || '',
        email: c.email || '',
        address: addr || '',
      };
    });
    return liveRecords;
  }, [customers, databaseMode]);

  const [asyncCustomerResults, setAsyncCustomerResults] = useState<CustomerSearchRecord[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const q = customerSearchQuery.trim();
    if (!q) {
      setAsyncCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await client.fetchCustomersPaginated({ mode: databaseMode, searchQuery: q, pageSize: 25 });
        if (!isCancelled && res?.customers) {
          const mapped: CustomerSearchRecord[] = res.customers.map((c: any) => {
            const addr = c.address
              ? `${c.address.street}${c.address.addressLine2 ? `, ${c.address.addressLine2}` : ''}, ${c.address.city}, ${c.address.state} ${c.address.zipCode}`
              : '';
            return {
              id: c.id,
              name: c.name,
              phone: c.phone ? `Mobile: ${c.phone}` : '',
              mobile: c.mobilePhone || c.phone || '',
              email: c.email || '',
              address: addr || '',
            };
          });
          setAsyncCustomerResults(mapped);
        }
      } catch (e) {}
    }, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearchQuery, client, databaseMode]);

  // Live Matching Customer Results (Empty by default when search input is empty)
  const matchingCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const map = new Map<string, CustomerSearchRecord>();
    for (const item of asyncCustomerResults) {
      map.set(item.id, item);
    }
    for (const c of allCustomerSearchRecords) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      ) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      }
    }
    return Array.from(map.values());
  }, [customerSearchQuery, asyncCustomerResults, allCustomerSearchRecords]);

  const openLogCallModal = () => {
    setEditingCallId(null);
    setLogCallStep(1);
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
    setShowDateTimePicker(false);
    setIsLogCallOpen(true);
  };

  const cleanPhone = (phoneStr: string) => {
    return phoneStr.replace(/^(Home|Mobile|Office|Work):\s*/i, '');
  };

  const cleanAddress = (addrStr: string, name: string) => {
    return addrStr.replace(new RegExp(`^${name}\\s*-\\s*`, 'i'), '');
  };

  const selectCustomerForCall = (cust: CustomerSearchRecord) => {
    setSelectedCustomer(cust);
    const cleanedP = cust.mobile || cleanPhone(cust.phone);
    const cleanedA = cleanAddress(cust.address, cust.name);
    setFormPhoneNumber(cleanedP);
    setFormContact(cust.name);
    setFormLocation(cleanedA);
    setFormType('Call');
    setFormCallType('Inbound');
    setFormNote('');
    setNewCallDateTimeStr(formatEasternDateTime(new Date()));
    setLogCallStep(2);
  };

  const handleEditCall = async (log: CallRecord) => {
    setOpenActionMenuId(null);
    setEditingCallId(log.id);
    
    // Find real customer from live Firestore customers or fetch direct
    let custRecord: CustomerSearchRecord | undefined = allCustomerSearchRecords.find(
      (c) => c.id === log.customerId || c.name.toLowerCase() === log.customerName.toLowerCase()
    );

    if (!custRecord && log.customerId) {
      try {
        const directCust = await client.fetchCustomerById(log.customerId, databaseMode);
        if (directCust) {
          const addr = directCust.address
            ? `${directCust.address.street}${directCust.address.addressLine2 ? `, ${directCust.address.addressLine2}` : ''}, ${directCust.address.city}, ${directCust.address.state} ${directCust.address.zipCode}`
            : '';
          custRecord = {
            id: directCust.id,
            name: directCust.name,
            phone: directCust.phone ? `Mobile: ${directCust.phone}` : '',
            mobile: directCust.mobilePhone || directCust.phone || '',
            email: directCust.email || '',
            address: addr || '',
          };
        }
      } catch (e) {}
    }

    const finalCust = custRecord || {
      id: log.customerId || `cust-${log.id}`,
      name: log.customerName,
      phone: log.phoneCid ? `Mobile: ${log.phoneCid}` : 'Mobile: (850) 556-8402',
      mobile: log.phoneCid || '(850) 556-8402',
      email: 'customer@example.com',
      address: log.relatedLocation || ''
    };

    setSelectedCustomer(finalCust);
    setNewCallDateTimeStr(log.callDate);

    // Extract date for DatePicker
    try {
      if (log.callDate.includes('-')) {
        setCallDateOnly(log.callDate.slice(0, 10));
      } else if (log.callDate.includes('/')) {
        const [m, d, yPart] = log.callDate.split('/');
        const y = yPart.split(' ')[0].replace(',', '');
        setCallDateOnly(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      }
    } catch (e) {}

    setFormPhoneNumber(log.phoneCid || cleanPhone(finalCust.phone));
    setFormContact(log.contactName || finalCust.name);
    setFormCallType(log.callType || 'Inbound');
    setFormLocation(log.relatedLocation || cleanAddress(finalCust.address, finalCust.name));
    
    // Find note from live calls collection
    const liveCallObj = calls.find((c) => c.id === log.id);
    setFormNote(liveCallObj?.notes || '');
    setLogCallStep(2);
    setIsLogCallOpen(true);
  };

  const handleConfirmReassign = async (newCust: CustomerSearchRecord) => {
    if (!reassigningCallRecord) return;
    const cleanedP = newCust.mobile || cleanPhone(newCust.phone);
    const cleanedA = cleanAddress(newCust.address, newCust.name);

    const existing = calls.find((c) => c.id === reassigningCallRecord.id);
    const updatedCall: CanonicalCall = {
      id: reassigningCallRecord.id,
      customerId: newCust.id,
      customerName: newCust.name,
      contactName: newCust.name,
      phoneCid: cleanedP,
      relatedLocation: cleanedA,
      callType: (reassigningCallRecord.callType as any) || 'Inbound',
      callDate: reassigningCallRecord.callDate,
      user: reassigningCallRecord.user,
      activityType: existing?.activityType || 'Call',
      notes: existing?.notes || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    await saveLiveCall(updatedCall);

    setCallLogs((prev) =>
      prev.map((item) =>
        item.id === reassigningCallRecord.id
          ? {
              ...item,
              customerName: newCust.name,
              phoneCid: cleanedP,
              relatedLocation: cleanedA,
              contactName: newCust.name,
            }
          : item
      )
    );
    setReassigningCallRecord(null);
    setToastMessage(`Call record reassigned to ${newCust.name}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCallRecord) return;
    await deleteLiveCall(deletingCallRecord.id);
    setCallLogs((prev) => prev.filter((item) => item.id !== deletingCallRecord.id));
    const deletedName = deletingCallRecord.customerName;
    setDeletingCallRecord(null);
    setToastMessage(`Call record for ${deletedName} deleted.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustFirstName.trim() || !newCustLastName.trim()) return;
    const fullName = `${newCustFirstName.trim()} ${newCustLastName.trim()}`;
    const formattedAddress = `${newCustAddress.trim()}, ${newCustCity.trim()}, ${newCustState} ${newCustZip.trim()}`;

    const newCustomerObj: CustomerSearchRecord = {
      id: `c-new-${Date.now()}`,
      name: fullName,
      phone: `Mobile: ${newCustPhone || '(850) 555-0100'}`,
      mobile: newCustPhone || '(850) 555-0100',
      email: newCustEmail || `${newCustFirstName.toLowerCase()}@example.com`,
      address: formattedAddress,
    };

    setShowNewCustomerModal(false);
    selectCustomerForCall(newCustomerObj);
  };

  const handleSaveCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    // Convert DateTime String to format e.g. "8/13/2026 9:35am"
    const parseFormattedDisplayDate = (str: string) => {
      try {
        const parts = str.split(',');
        if (parts.length >= 2) {
          const datePart = parts[0].trim();
          const timePart = parts[1].trim();
          const [m, d, y] = datePart.split('/');
          const monthNum = parseInt(m, 10);
          const timeMatch = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            const hr = parseInt(timeMatch[1], 10);
            const min = timeMatch[2];
            const ampm = timeMatch[3].toLowerCase();
            return `${monthNum}/${d}/${y} ${hr}:${min}${ampm}`;
          }
        }
      } catch (err) {}
      return str;
    };

    const finalDateStr = parseFormattedDisplayDate(newCallDateTimeStr);
    const existing = editingCallId ? calls.find((c) => c.id === editingCallId) : null;

    const liveCall: CanonicalCall = {
      id: editingCallId || `call-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      contactName: formContact || selectedCustomer.name,
      phoneCid: formPhoneNumber || selectedCustomer.mobile || cleanPhone(selectedCustomer.phone),
      relatedLocation: formLocation || cleanAddress(selectedCustomer.address, selectedCustomer.name),
      callDate: newCallDateTimeStr || finalDateStr,
      callType: (formCallType as any) || 'Inbound',
      activityType: (formType as any) || 'Call',
      notes: formNote || null,
      user: existing?.user || 'Ryan Cole',
      jobNumber: existing?.jobNumber || null,
      appointmentId: existing?.appointmentId || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveLiveCall(liveCall);

    if (editingCallId) {
      setCallLogs((prev) =>
        prev.map((item) =>
          item.id === editingCallId
            ? {
                ...item,
                callDate: finalDateStr,
                phoneCid: formPhoneNumber,
                customerName: selectedCustomer.name,
                contactName: formContact || selectedCustomer.name,
                relatedLocation: formLocation || cleanAddress(selectedCustomer.address, selectedCustomer.name),
                callType: formCallType,
              }
            : item
        )
      );
      setToastMessage(`Call log updated for ${selectedCustomer.name}!`);
    } else {
      const newEntry: CallRecord = {
        id: liveCall.id,
        callDate: finalDateStr,
        phoneCid: formPhoneNumber || selectedCustomer.mobile || cleanPhone(selectedCustomer.phone),
        customerName: selectedCustomer.name,
        contactName: formContact || selectedCustomer.name,
        relatedLocation: formLocation || cleanAddress(selectedCustomer.address, selectedCustomer.name),
        callType: formCallType,
        user: 'Ryan Cole',
      };
      setCallLogs([newEntry, ...callLogs]);
      setToastMessage(`Call logged successfully for ${selectedCustomer.name}!`);
    }

    setIsLogCallOpen(false);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredLogs = callLogs.filter((log) => {
    const matchesSearch =
      log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.phoneCid && log.phoneCid.includes(searchQuery)) ||
      (log.relatedLocation && log.relatedLocation.toLowerCase().includes(searchQuery.toLowerCase()));

    let parsedCallDate = normalizeToEasternDateString(log.callDate);
    if (!parsedCallDate && log.callDate) {
      try {
        const d = new Date(log.callDate);
        if (!isNaN(d.getTime())) {
          parsedCallDate = d.toISOString().slice(0, 10);
        }
      } catch (e) {}
    }
    const matchesDate =
      (!startDate || !parsedCallDate || parsedCallDate >= startDate) &&
      (!endDate || !parsedCallDate || parsedCallDate <= endDate);

    const matchesType = callTypeFilter === 'All' || log.callType === callTypeFilter;
    const matchesUser = userFilter === 'All' || log.user === userFilter;

    return matchesSearch && matchesDate && matchesType && matchesUser;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full space-y-4 text-slate-800 pb-12 font-sans">
      {/* Main Container (1340px) wrapping PageHeader, FilterBar, and Table */}
      <div className="max-w-[1340px] mx-auto w-full space-y-4">
        {/* 1. Page Header */}
        <PageHeader 
          title="Jobs Call List" 
          actions={
            <button
              type="button"
              onClick={openLogCallModal}
              className="px-3 py-1.5 text-xs font-bold bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-md flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors h-8"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Log Call</span>
            </button>
          }
        />

        {/* 2. FilterBar Primitive */}
        <FilterBar>
          <div className="flex flex-wrap items-end justify-between gap-4 text-xs w-full">
            {/* React Aria Date Range Picker */}
            <DateRangePicker
              label="Date Range"
              value={{ start: startDate, end: endDate }}
              onChange={({ start, end }) => {
                setStartDate(start);
                setEndDate(end);
                setCurrentPage(1);
              }}
            />

            {/* Call Type Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                Call Type
              </label>
              <select
                value={callTypeFilter}
                onChange={(e) => {
                  setCallTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2d82b7]/15 focus:border-[#2d82b7] min-w-[100px] cursor-pointer shadow-2xs font-medium"
              >
                <option value="All">All</option>
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
              </select>
            </div>

            {/* User Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                User
              </label>
              <select
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2d82b7]/15 focus:border-[#2d82b7] min-w-[140px] cursor-pointer shadow-2xs font-medium"
              >
                <option value="All">All</option>
                <option value="Ethan Mitchell">Ethan Mitchell</option>
                <option value="Robert Hudson">Robert Hudson</option>
                <option value="Amanda Hoover">Amanda Hoover</option>
                <option value="Andrew (Jr) Murphy">Andrew (Jr) Murphy</option>
              </select>
            </div>

            <div className="ml-auto">
              <SearchBar
                fields={['Customer Name', 'Phone', 'Location']}
                selectedField={searchField}
                onFieldChange={setSearchField}
                query={searchQuery}
                onQueryChange={(q) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </FilterBar>

        {/* 3. Call List Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-text">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#a82e2e] ">
                  <th className="px-3 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      Call Date <span className="text-[10px]">▲</span>
                    </span>
                  </th>
                  <th className="px-3 py-3 whitespace-nowrap">Phone # / CID</th>
                  <th className="px-3 py-3">Customer Name</th>
                  <th className="px-3 py-3">Related Location(s)</th>
                  <th className="px-3 py-3 whitespace-nowrap">Call Type</th>
                  <th className="px-3 py-3 whitespace-nowrap">User</th>
                  <th className="w-12 px-3 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      No call records found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, logIdx) => {
                  const isMenuOpen = openActionMenuId === log.id;
                  return (
                    /* Table row with NO hover background grey effect */
                    <tr key={`${log.id}-${logIdx}`} className="bg-white">
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        {formatCallListDate(log.callDate)}
                      </td>

                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        {log.phoneCid || ''}
                      </td>

                      {/* Cursor pointer ONLY on customer name */}
                      <td className="px-3 py-3 font-medium">
                        <div className="flex flex-col">
                          <Link
                            href={`/customers/${log.customerId || encodeURIComponent(log.customerName)}`}
                            className="inline-block text-[#be4646] font-semibold hover:underline cursor-pointer w-fit"
                          >
                            {log.customerName}
                          </Link>
                          {log.contactName && (
                            <span className="text-[11px] text-slate-500 font-normal select-text">
                              Contact: {log.contactName}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-slate-600 max-w-md truncate">
                        {log.relatedLocation || ''}
                      </td>

                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                        {log.callType || ''}
                      </td>

                      <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {log.user}
                      </td>

                      {/* Actions Menu */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <MenuTrigger>
                            <MenuButton
                              variant="ghost"
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </MenuButton>
                            <Menu placement="bottom end">
                              <MenuItem onAction={() => handleEditCall(log)}>
                                <Edit3 className="w-3.5 h-3.5 text-[#2d82b7] shrink-0" />
                                <span>Edit Call</span>
                              </MenuItem>
                              <MenuItem onAction={() => setReassigningCallRecord(log)}>
                                <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Reassign Customer</span>
                              </MenuItem>
                              <MenuSeparator />
                              <MenuItem variant="danger" onAction={() => setDeletingCallRecord(log)}>
                                <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                <span>Delete</span>
                              </MenuItem>
                            </Menu>
                          </MenuTrigger>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar (20 items per page) */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 ">
            <div>
              Showing <span className="font-semibold text-slate-800">{Math.min(1 + (currentPage - 1) * itemsPerPage, filteredLogs.length)}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of{' '}
              <span className="font-semibold text-slate-800">{filteredLogs.length}</span> records
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="font-semibold text-slate-800 px-1">
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Warning Modal Box */}
      {deletingCallRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Call Record</h3>
                <p className="text-xs text-slate-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              Are you sure you want to permanently delete the call record for{' '}
              <span className="font-bold text-slate-900">{deletingCallRecord.customerName}</span> ({deletingCallRecord.callDate})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCallRecord(null)}
                className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Delete Call Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Customer Quick Modal */}
      {reassigningCallRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Reassign Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setReassigningCallRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select the customer to assign to this call log entry ({reassigningCallRecord.callDate}):
            </p>

            <div className="space-y-2 border border-slate-200 rounded-lg p-2 max-h-56 overflow-y-auto bg-slate-50">
              {allCustomerSearchRecords.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => handleConfirmReassign(cust)}
                  className="p-2.5 bg-white border border-slate-200 rounded hover:border-[#be4646] hover:bg-red-50/40 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-800">{cust.name}</span>
                    <p className="text-[11px] text-slate-500">{cust.mobile || cleanPhone(cust.phone)}</p>
                  </div>
                  <span className="text-xs font-bold text-[#be4646]">Assign →</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setReassigningCallRecord(null)}
                className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Flow: Step 1 = Customer Search Lookup, Step 2 = Log Call Only Form (Exact match to "Log a phone call" screenshot) */}
      {isLogCallOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-sans">
            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {logCallStep === 1 ? 'Select Customer' : 'Log Call Only'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLogCallOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Customer Selection Lookup (identical to Add Appointment flow) */}
            {logCallStep === 1 ? (
              <div className="p-5 space-y-3">
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="px-3.5 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-md shadow-2xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
                      title="Create New Customer"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Matching Customer Results Container */}
                  {matchingCustomers.length > 0 && (
                    <div className="mt-1 bg-white rounded-md border border-slate-300 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-200 z-20">
                      {matchingCustomers.map((cust: CustomerSearchRecord) => (
                        <div
                          key={cust.id}
                          onClick={() => selectCustomerForCall(cust)}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer transition-colors space-y-0.5"
                        >
                          <div className="font-semibold text-slate-800 text-xs">
                            {cust.name}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="italic">{cust.phone}</span>
                            <span className="text-right truncate max-w-[280px] text-slate-600">{cust.address}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Exact "Log Call Only" form matching customer profile "Log a phone call" (No slider) */
              <form onSubmit={handleSaveCallLog} className="flex flex-col font-sans">
                {/* Customer Banner Header Box */}
                <div className="p-3 bg-slate-50/80 border-b border-slate-200 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#be4646] text-sm">
                          {selectedCustomer?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLogCallStep(1)}
                          className="text-[11px] font-semibold text-[#be4646] hover:underline cursor-pointer ml-1"
                        >
                          (Change)
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-600 space-x-3">
                        <span>H: N/A</span>
                        <span>M: {selectedCustomer?.mobile || cleanPhone(selectedCustomer?.phone || '')}</span>
                        <span>Email: {selectedCustomer?.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span>Total Customer Balance: <span className="font-bold text-slate-900">$0.00</span></span>
                      <span className="text-slate-400 cursor-help" title="This includes all unpaid invoices">ⓘ</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields: Row 1 (Spacious 3 columns, Type field removed) */}
                <div className="p-4 space-y-3.5 overflow-y-auto flex-1 max-h-[60vh]">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Field 1: Date / Time * with React Aria DatePicker */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Date / Time <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 min-w-[130px]">
                          <DatePicker
                            value={callDateOnly}
                            onChange={(d: string) => {
                              setCallDateOnly(d);
                              setNewCallDateTimeStr(`${d} ${newCallHourInput}:${newCallMinInput} ${newCallAmpmInput}`);
                            }}
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-800 shrink-0">
                          <input
                            type="text"
                            value={newCallHourInput}
                            onChange={(e) => {
                              setNewCallHourInput(e.target.value);
                              setNewCallDateTimeStr(`${callDateOnly} ${e.target.value}:${newCallMinInput} ${newCallAmpmInput}`);
                            }}
                            className="w-5 text-center font-semibold focus:outline-none"
                            maxLength={2}
                          />
                          <span>:</span>
                          <input
                            type="text"
                            value={newCallMinInput}
                            onChange={(e) => {
                              setNewCallMinInput(e.target.value);
                              setNewCallDateTimeStr(`${callDateOnly} ${newCallHourInput}:${e.target.value} ${newCallAmpmInput}`);
                            }}
                            className="w-5 text-center font-semibold focus:outline-none"
                            maxLength={2}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextAp = newCallAmpmInput === 'AM' ? 'PM' : 'AM';
                              setNewCallAmpmInput(nextAp);
                              setNewCallDateTimeStr(`${callDateOnly} ${newCallHourInput}:${newCallMinInput} ${nextAp}`);
                            }}
                            className="font-bold text-[10px] text-slate-600 hover:text-slate-900 ml-0.5 px-1 py-0.5 rounded bg-slate-100 cursor-pointer"
                          >
                            {newCallAmpmInput}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Field 2: Phone Number */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={formPhoneNumber}
                        onChange={(e) => setFormPhoneNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                      />
                    </div>

                    {/* Field 3: Contact Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Contact
                      </label>
                      <select 
                        value={formContact}
                        onChange={(e) => setFormContact(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                      >
                        <option value="">Select Contact...</option>
                        <option value={selectedCustomer?.name}>{selectedCustomer?.name} (Primary)</option>
                      </select>
                    </div>
                  </div>

                  {/* Form Fields: Row 2 (2 columns) */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Call Type */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Call Type
                      </label>
                      <select 
                        value={formCallType}
                        onChange={(e) => setFormCallType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                      >
                        <option value="Inbound">Inbound</option>
                        <option value="Outbound">Outbound</option>
                      </select>
                    </div>

                    {/* Related Location(s) */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Related Location(s) <span className="text-slate-400 cursor-help" title="Select location for call log">ⓘ</span>
                      </label>
                      <select 
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                      >
                        <option value={cleanAddress(selectedCustomer?.address || '', selectedCustomer?.name || '')}>
                          {cleanAddress(selectedCustomer?.address || '', selectedCustomer?.name || '')}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Form Fields: Row 3 (Call Notes Textarea with "Enter Note" Placeholder) */}
                  <div className="space-y-1">
                    <textarea
                      rows={4}
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] resize-none"
                    />
                  </div>
                </div>

                {/* Footer Controls for Log Call Only */}
                <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-white">
                  <button
                    type="button"
                    onClick={() => setIsLogCallOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Shared Add Customer Modal */}
      <AddCustomerModal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        onCustomerCreated={(newCust) => {
          const locStr = newCust.address
            ? [newCust.address.street, newCust.address.city, newCust.address.state].filter(Boolean).join(', ')
            : '';
          selectCustomerForCall({
            id: newCust.id,
            name: newCust.name,
            phone: newCust.phone || newCust.mobilePhone || '',
            email: newCust.email || '',
            address: locStr,
          });
        }}
      />
    </div>
  );
}
