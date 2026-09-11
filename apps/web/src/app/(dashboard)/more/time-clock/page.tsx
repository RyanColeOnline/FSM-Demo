'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  Search, 
  Calendar, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Plus,
  X,
  Check,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Button, Input, DatePicker, DateRangePicker, MenuTrigger, Menu, MenuItem, MenuButton, MenuSeparator } from '@/components/ui';
import { useDatabaseMode } from '@/contexts/database-mode-context';
import { CanonicalUser } from '@murphys/domain';

export interface TimeClockEntry {
  id: string;
  date: string;              // ISO date string e.g. "2026-08-03"
  clockIn: string;           // "08:37 AM"
  clockOut: string;          // "05:35 PM"
  durationSeconds: number;   // Calculated shift length
  notes?: string;
}

export interface EmployeeTimesheet {
  employeeId: string;
  employeeName: string;
  hasManualEntries: boolean;
  totalPeriodSeconds: number;
  entries: TimeClockEntry[];
}

const mockTimesheets: EmployeeTimesheet[] = [
  {
    employeeId: 'demo-tech-hvac-1',
    employeeName: 'Marcus Vance',
    hasManualEntries: true,
    totalPeriodSeconds: 144000, // 40h
    entries: [
      {
        id: 'entry-101',
        date: '2026-09-07',
        clockIn: '08:00 AM',
        clockOut: '05:00 PM',
        durationSeconds: 32400,
      },
      {
        id: 'entry-102',
        date: '2026-09-08',
        clockIn: '07:45 AM',
        clockOut: '04:30 PM',
        durationSeconds: 31500,
      },
    ],
  },
  {
    employeeId: 'demo-tech-appliance-1',
    employeeName: 'David Ross',
    hasManualEntries: true,
    totalPeriodSeconds: 151200, // 42h
    entries: [
      {
        id: 'entry-201',
        date: '2026-09-07',
        clockIn: '08:15 AM',
        clockOut: '05:15 PM',
        durationSeconds: 32400,
      },
      {
        id: 'entry-202',
        date: '2026-09-08',
        clockIn: '08:00 AM',
        clockOut: '05:00 PM',
        durationSeconds: 32400,
      },
    ],
  },
  {
    employeeId: 'demo-tech-hvac-2',
    employeeName: 'Carlos Mendez',
    hasManualEntries: false,
    totalPeriodSeconds: 136800, // 38h
    entries: [
      {
        id: 'entry-301',
        date: '2026-09-07',
        clockIn: '08:00 AM',
        clockOut: '04:30 PM',
        durationSeconds: 30600,
      },
      {
        id: 'entry-302',
        date: '2026-09-08',
        clockIn: '08:00 AM',
        clockOut: '04:30 PM',
        durationSeconds: 30600,
      },
    ],
  },
];

const mockStaffDirectory = [
  'Alex Reynolds',
  'Sarah Jenkins',
  'Marcus Vance',
  'Carlos Mendez',
  'David Ross',
  'Tyler Reed',
];

const hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

// Helper to format seconds to "Xh Ym"
function formatPeriodHours(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

// Helper to format date string to "MM/DD/YYYY"
function formatDateString(isoStr: string): string {
  const [year, month, day] = isoStr.split('-');
  if (!year || !month || !day) return isoStr;
  return `${month}/${day}/${year}`;
}

export default function MoreTimeClockPage() {
  const { databaseMode, client } = useDatabaseMode();
  const [timesheets, setTimesheets] = useState<EmployeeTimesheet[]>(mockTimesheets);
  const [allUsersList, setAllUsersList] = useState<CanonicalUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('2026-08-24');
  const [endDate, setEndDate] = useState('2026-08-30');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Load live Firestore users and time clock entries in sandbox / live mode
  const loadLiveTimesheets = React.useCallback(async () => {
    if (databaseMode === 'mock') {
      setTimesheets(mockTimesheets);
      return;
    }
    try {
      const [users, rawEntries] = await Promise.all([
        client.fetchUsers(databaseMode),
        client.fetchTimeClockEntries(databaseMode),
      ]);
      setAllUsersList(users);

      const userSheets: EmployeeTimesheet[] = users.map((u) => {
        const uName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User';
        const matched = (rawEntries || []).filter((e) => {
          const entryUserName = (e.userName || '').toLowerCase();
          const entryUserId = e.userId;
          return (entryUserId && entryUserId === u.id) || (entryUserName && entryUserName === uName.toLowerCase());
        });

        const inRange = matched.filter((e) => {
          const eDate = e.date || (e.timestamp ? e.timestamp.slice(0, 10) : '');
          if (!eDate) return true;
          if (startDate && eDate < startDate) return false;
          if (endDate && eDate > endDate) return false;
          return true;
        });

        const formattedEntries: TimeClockEntry[] = inRange.map((e, idx) => ({
          id: e.id || `entry-${u.id}-${idx}`,
          date: e.date || (e.timestamp ? e.timestamp.slice(0, 10) : '2026-08-27'),
          clockIn: e.clockIn || e.clockInTime || '08:30 AM',
          clockOut: e.clockOut || e.clockOutTime || '05:30 PM',
          durationSeconds: e.durationSeconds || 32400,
          notes: e.notes || '',
        }));

        const totalSecs = formattedEntries.reduce((acc, curr) => acc + curr.durationSeconds, 0);

        return {
          employeeId: u.id,
          employeeName: uName,
          hasManualEntries: formattedEntries.length > 0,
          totalPeriodSeconds: totalSecs,
          entries: formattedEntries,
        };
      });

      setTimesheets(userSheets);
    } catch (err) {
      console.error('Failed to load timesheets from Firestore:', err);
    }
  }, [client, databaseMode, startDate, endDate]);

  useEffect(() => {
    loadLiveTimesheets();
  }, [loadLiveTimesheets]);

  // New User Time Entry Modal State (Step 1 & Step 2)
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserStep, setNewUserStep] = useState<1 | 2>(1);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  const [newEntryStartDate, setNewEntryStartDate] = useState('2026-08-09');
  const [newEntryStartHour, setNewEntryStartHour] = useState('08');
  const [newEntryStartMin, setNewEntryStartMin] = useState('30');
  const [newEntryStartAmpm, setNewEntryStartAmpm] = useState('AM');

  const [newEntryEndDate, setNewEntryEndDate] = useState('2026-08-09');
  const [newEntryEndHour, setNewEntryEndHour] = useState('05');
  const [newEntryEndMin, setNewEntryEndMin] = useState('30');
  const [newEntryEndAmpm, setNewEntryEndAmpm] = useState('PM');

  // Individual Card Manual Entry Modal State
  const [manualEntryTargetEmp, setManualEntryTargetEmp] = useState<EmployeeTimesheet | null>(null);

  // Edit Shift Modal State
  const [editingEntry, setEditingEntry] = useState<{ empId: string; entry: TimeClockEntry } | null>(null);
  const [editStartDate, setEditStartDate] = useState('2026-08-03');
  const [editStartHour, setEditStartHour] = useState('08');
  const [editStartMin, setEditStartMin] = useState('30');
  const [editStartAmpm, setEditStartAmpm] = useState('AM');

  const [editEndDate, setEditEndDate] = useState('2026-08-03');
  const [editEndHour, setEditEndHour] = useState('05');
  const [editEndMin, setEditEndMin] = useState('30');
  const [editEndAmpm, setEditEndAmpm] = useState('PM');

  // Delete Confirmation Modal State
  const [deletingEntryTarget, setDeletingEntryTarget] = useState<{ empId: string; entryId: string } | null>(null);

  // Filter timesheets by search query
  const filteredTimesheets = timesheets.filter((ts) =>
    ts.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter staff directory for New User Time Entry modal
  const staffSource = allUsersList.length > 0 ? allUsersList.map((u) => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()) : mockStaffDirectory;
  const filteredStaff = staffSource.filter((name) =>
    name.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Handle outside click to close three-dot menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.three-dot-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const openNewUserTimeEntryModal = () => {
    setUserSearchQuery('');
    setSelectedUser('');
    setNewUserStep(1);
    setNewEntryStartDate('2026-08-09');
    setNewEntryStartHour('08');
    setNewEntryStartMin('30');
    setNewEntryStartAmpm('AM');
    setNewEntryEndDate('2026-08-09');
    setNewEntryEndHour('05');
    setNewEntryEndMin('30');
    setNewEntryEndAmpm('PM');
    setIsNewUserModalOpen(true);
  };

  const handleStep1Add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setNewUserStep(2);
  };

  const handleSaveNewUserEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const clockInStr = `${newEntryStartHour}:${newEntryStartMin} ${newEntryStartAmpm}`;
    const clockOutStr = `${newEntryEndHour}:${newEntryEndMin} ${newEntryEndAmpm}`;
    const cleanName = selectedUser.replace(/\s*\([^)]*\)/g, ''); // strip role suffix if present

    const newRecord: TimeClockEntry = {
      id: `entry-${Date.now()}`,
      date: newEntryStartDate,
      clockIn: clockInStr,
      clockOut: clockOutStr,
      durationSeconds: 32400, // 9 hours
    };

    if (databaseMode !== 'mock') {
      const targetUser = allUsersList.find((u) => (u.name || '').toLowerCase() === cleanName.toLowerCase());
      client.saveTimeClockEntry({
        id: newRecord.id,
        userId: targetUser?.id || `emp-${Date.now()}`,
        userName: cleanName,
        type: 'Shift',
        date: newEntryStartDate,
        clockIn: clockInStr,
        clockInTime: clockInStr,
        clockOut: clockOutStr,
        clockOutTime: clockOutStr,
        durationSeconds: 32400,
        timestamp: `${newEntryStartDate}T08:30:00Z`,
      }, databaseMode).then(() => loadLiveTimesheets());
    } else {
      setTimesheets((prev) => {
        const existingIndex = prev.findIndex(
          (ts) => ts.employeeName.toLowerCase() === cleanName.toLowerCase()
        );

        if (existingIndex >= 0) {
          return prev.map((ts, idx) => {
            if (idx === existingIndex) {
              const updatedEntries = [newRecord, ...ts.entries];
              const newTotal = updatedEntries.reduce((acc, curr) => acc + curr.durationSeconds, 0);
              return {
                ...ts,
                entries: updatedEntries,
                totalPeriodSeconds: newTotal,
                hasManualEntries: true,
              };
            }
            return ts;
          });
        } else {
          const newSheet: EmployeeTimesheet = {
            employeeId: `emp-${Date.now()}`,
            employeeName: cleanName,
            hasManualEntries: true,
            totalPeriodSeconds: 32400,
            entries: [newRecord],
          };
          return [newSheet, ...prev];
        }
      });
    }

    setIsNewUserModalOpen(false);
  };

  const handleOpenManualEntryModal = (emp: EmployeeTimesheet) => {
    setSelectedUser(emp.employeeName);
    setManualEntryTargetEmp(emp);
    setNewEntryStartDate('2026-08-09');
    setNewEntryStartHour('08');
    setNewEntryStartMin('30');
    setNewEntryStartAmpm('AM');
    setNewEntryEndDate('2026-08-09');
    setNewEntryEndHour('05');
    setNewEntryEndMin('30');
    setNewEntryEndAmpm('PM');
  };

  const handleSaveManualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntryTargetEmp) return;

    const clockInStr = `${newEntryStartHour}:${newEntryStartMin} ${newEntryStartAmpm}`;
    const clockOutStr = `${newEntryEndHour}:${newEntryEndMin} ${newEntryEndAmpm}`;

    const newRecord: TimeClockEntry = {
      id: `entry-${Date.now()}`,
      date: newEntryStartDate,
      clockIn: clockInStr,
      clockOut: clockOutStr,
      durationSeconds: 32400,
    };

    if (databaseMode !== 'mock') {
      client.saveTimeClockEntry({
        id: newRecord.id,
        userId: manualEntryTargetEmp.employeeId,
        userName: manualEntryTargetEmp.employeeName,
        type: 'Shift',
        date: newEntryStartDate,
        clockIn: clockInStr,
        clockInTime: clockInStr,
        clockOut: clockOutStr,
        clockOutTime: clockOutStr,
        durationSeconds: 32400,
        timestamp: `${newEntryStartDate}T08:30:00Z`,
      }, databaseMode).then(() => loadLiveTimesheets());
    } else {
      setTimesheets((prev) =>
        prev.map((ts) => {
          if (ts.employeeId === manualEntryTargetEmp.employeeId) {
            const updatedEntries = [newRecord, ...ts.entries];
            const newTotal = updatedEntries.reduce((acc, curr) => acc + curr.durationSeconds, 0);
            return {
              ...ts,
              entries: updatedEntries,
              totalPeriodSeconds: newTotal,
              hasManualEntries: true,
            };
          }
          return ts;
        })
      );
    }

    setManualEntryTargetEmp(null);
  };

  const handlePromptDelete = (empId: string, entryId: string) => {
    setDeletingEntryTarget({ empId, entryId });
    setActiveMenuId(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingEntryTarget) return;
    const { empId, entryId } = deletingEntryTarget;

    setTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.employeeId === empId) {
          const updatedEntries = ts.entries.filter((e) => e.id !== entryId);
          const newTotal = updatedEntries.reduce((acc, curr) => acc + curr.durationSeconds, 0);
          return {
            ...ts,
            entries: updatedEntries,
            totalPeriodSeconds: newTotal,
          };
        }
        return ts;
      })
    );

    setDeletingEntryTarget(null);
  };

  const handleOpenEdit = (empId: string, entry: TimeClockEntry) => {
    setEditingEntry({ empId, entry });
    setEditStartDate(entry.date);
    
    const inParts = entry.clockIn.split(' ');
    if (inParts[0]) {
      const [h, m] = inParts[0].split(':');
      setEditStartHour(h || '08');
      setEditStartMin(m || '00');
    }
    setEditStartAmpm(inParts[1] || 'AM');

    const outParts = entry.clockOut.split(' ');
    if (outParts[0]) {
      const [h, m] = outParts[0].split(':');
      setEditEndHour(h || '05');
      setEditEndMin(m || '00');
    }
    setEditEndAmpm(outParts[1] || 'PM');

    setEditEndDate(entry.date);
    setActiveMenuId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const clockInStr = `${editStartHour}:${editStartMin} ${editStartAmpm}`;
    const clockOutStr = `${editEndHour}:${editEndMin} ${editEndAmpm}`;

    setTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.employeeId === editingEntry.empId) {
          const updatedEntries = ts.entries.map((e) =>
            e.id === editingEntry.entry.id
              ? { ...e, date: editStartDate, clockIn: clockInStr, clockOut: clockOutStr }
              : e
          );
          return { ...ts, entries: updatedEntries, hasManualEntries: true };
        }
        return ts;
      })
    );

    setEditingEntry(null);
  };

  return (
    <div className="w-full space-y-6 text-slate-800 pb-16 font-sans relative">
      {/* 1. Page Title at Original Full Width Inset Position */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
          <span className="font-bold text-[#2e4057] italic text-2xl">More Applications</span>
          <span className="font-normal text-[#5b708b] not-italic text-xl">Time Clock</span>
        </h1>
      </div>

      {/* 2. Narrower Inset Container for Filter Bar & Employee Cards */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Filter Bar (With Right-Aligned Red "New User Time Entry" Button!) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Employee Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#3f6b35]"
              />
            </div>

            {/* React Aria Date Range Picker */}
            <DateRangePicker
              value={{ start: startDate, end: endDate }}
              onChange={({ start, end }) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>

          {/* Right Aligned Red "New User Time Entry" Primary CTA Button */}
          <button
            type="button"
            onClick={openNewUserTimeEntryModal}
            className="px-3.5 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New User Time Entry</span>
          </button>
        </div>

        {/* Employee Cards Container */}
        <div className="space-y-6">
          {filteredTimesheets.map((sheet) => (
            <div
              key={sheet.employeeId}
              className="bg-white rounded-xl border border-slate-200 shadow-xs transition-all hover:border-slate-300 overflow-visible relative"
            >
              {/* Card Header */}
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
                <h2 className="text-base font-bold text-slate-900">
                  {sheet.employeeName}
                </h2>

                {/* Manual Entry Button on Right End */}
                <button
                  type="button"
                  onClick={() => handleOpenManualEntryModal(sheet)}
                  className="text-xs font-semibold text-[#be4646] hover:text-[#a63a3a] cursor-pointer transition-colors"
                >
                  Manual Entry
                </button>
              </div>

              {/* Timesheet Data Table */}
              <div className="w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 font-bold text-slate-600">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Clock In</th>
                      <th className="px-6 py-3">Clock Out</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3 text-right w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sheet.entries.map((entry, idx) => {
                      const isMenuOpen = activeMenuId === entry.id;
                      const isLastRow = idx === sheet.entries.length - 1;

                      return (
                        <tr key={entry.id} className="bg-white">
                          <td className="px-6 py-3 font-medium whitespace-nowrap text-slate-800">
                            {formatDateString(entry.date)}
                          </td>

                          <td className="px-6 py-3 font-medium whitespace-nowrap">
                            {entry.clockIn}
                          </td>

                          <td className="px-6 py-3 font-medium whitespace-nowrap">
                            {entry.clockOut}
                          </td>

                          <td className="px-6 py-3 font-bold whitespace-nowrap text-slate-900">
                            {formatPeriodHours(entry.durationSeconds)}
                          </td>

                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end">
                              <MenuTrigger>
                                <MenuButton
                                  variant="icon"
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                  aria-label="Shift options"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </MenuButton>
                                <Menu placement="bottom end">
                                  <MenuItem onAction={() => handleOpenEdit(sheet.employeeId, entry)}>
                                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Edit Shift Times</span>
                                  </MenuItem>
                                  <MenuSeparator />
                                  <MenuItem variant="danger" onAction={() => handlePromptDelete(sheet.employeeId, entry.id)}>
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    <span>Delete Entry</span>
                                  </MenuItem>
                                </Menu>
                              </MenuTrigger>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-50/90 border-t border-slate-200 text-xs">
                      <td colSpan={3} className="px-6 py-3 text-right font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                        Total:
                      </td>
                      <td className="px-6 py-3 font-bold text-slate-900 text-sm whitespace-nowrap">
                        {formatPeriodHours(sheet.totalPeriodSeconds)}
                      </td>
                      <td className="px-6 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. MULTI-STEP NEW USER TIME ENTRY MODAL (Matching Screenshot!) */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-normal text-[#5b708b]">
                {newUserStep === 1
                  ? 'Create User Time Entry'
                  : `Create Time Record for ${selectedUser.replace(/\s*\([^)]*\)/g, '')}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: Search Users (Matching Legacy Screenshot Layout) */}
            {newUserStep === 1 && (
              <form onSubmit={handleStep1Add} className="p-6 space-y-6">
                <div>
                  <label className="block font-bold text-slate-700 mb-2 text-xs">
                    Search Users
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        setSelectedUser(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#3f6b35]"
                    />

                    {/* Staff Suggestions Dropdown */}
                    {userSearchQuery.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 max-h-48 overflow-y-auto z-20">
                        {filteredStaff.map((staffName) => (
                          <button
                            key={staffName}
                            type="button"
                            onClick={() => {
                              setSelectedUser(staffName);
                              setUserSearchQuery(staffName);
                            }}
                            className={`w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between ${
                              selectedUser === staffName ? 'bg-emerald-50 text-[#3f6b35] font-bold' : 'text-slate-700'
                            }`}
                          >
                            <span>{staffName}</span>
                            {selectedUser === staffName && <UserCheck className="w-4 h-4 text-[#3f6b35]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Button (Matching Red "Add" button from screenshot!) */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end bg-slate-50/50 -mx-6 -mb-6 p-4">
                  <Button
                    type="submit"
                    variant="danger"
                    disabled={!selectedUser.trim()}
                    className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold px-6 py-2 disabled:opacity-50"
                  >
                    Add
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: Transition to Date/Time Picker Screen */}
            {newUserStep === 2 && (
              <form onSubmit={handleSaveNewUserEntry} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Start Date & Time */}
                  <div className="space-y-2">
                    <label className="block text-center font-bold text-slate-700">
                      Start Date/Time:
                    </label>
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <input
                        type="date"
                        value={newEntryStartDate}
                        onChange={(e) => setNewEntryStartDate(e.target.value)}
                        onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#3f6b35] cursor-pointer"
                      />

                      <div className="flex items-center gap-1">
                        <select
                          value={newEntryStartHour}
                          onChange={(e) => setNewEntryStartHour(e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                        >
                          {hoursList.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="font-bold text-slate-400">:</span>
                        <select
                          value={newEntryStartMin}
                          onChange={(e) => setNewEntryStartMin(e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                        >
                          {minutesList.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={newEntryStartAmpm}
                          onChange={(e) => setNewEntryStartAmpm(e.target.value)}
                          className="w-16 px-2 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="space-y-2">
                    <label className="block text-center font-bold text-slate-700">
                      End Date/Time:
                    </label>
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <input
                        type="date"
                        value={newEntryEndDate}
                        onChange={(e) => setNewEntryEndDate(e.target.value)}
                        onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#3f6b35] cursor-pointer"
                      />

                      <div className="flex items-center gap-1">
                        <select
                          value={newEntryEndHour}
                          onChange={(e) => setNewEntryEndHour(e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                        >
                          {hoursList.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="font-bold text-slate-400">:</span>
                        <select
                          value={newEntryEndMin}
                          onChange={(e) => setNewEntryEndMin(e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                        >
                          {minutesList.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={newEntryEndAmpm}
                          onChange={(e) => setNewEntryEndAmpm(e.target.value)}
                          className="w-16 px-2 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50 -mx-6 -mb-6 p-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setNewUserStep(1)}
                    className="bg-white"
                  >
                    Back
                  </Button>
                  <Button
                    variant="danger"
                    type="submit"
                    className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold"
                  >
                    Save Time Record
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. Individual Employee Card Manual Entry Modal */}
      {manualEntryTargetEmp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-normal text-[#5b708b]">
                Create Time Record for {manualEntryTargetEmp.employeeName}
              </h3>
              <button
                type="button"
                onClick={() => setManualEntryTargetEmp(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualRecord} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-center font-bold text-slate-700">
                    Start Date/Time:
                  </label>
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <input
                      type="date"
                      value={newEntryStartDate}
                      onChange={(e) => setNewEntryStartDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#3f6b35] cursor-pointer"
                    />

                    <div className="flex items-center gap-1">
                      <select
                        value={newEntryStartHour}
                        onChange={(e) => setNewEntryStartHour(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {hoursList.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="font-bold text-slate-400">:</span>
                      <select
                        value={newEntryStartMin}
                        onChange={(e) => setNewEntryStartMin(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {minutesList.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={newEntryStartAmpm}
                        onChange={(e) => setNewEntryStartAmpm(e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-center font-bold text-slate-700">
                    End Date/Time:
                  </label>
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <input
                      type="date"
                      value={newEntryEndDate}
                      onChange={(e) => setNewEntryEndDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#3f6b35] cursor-pointer"
                    />

                    <div className="flex items-center gap-1">
                      <select
                        value={newEntryEndHour}
                        onChange={(e) => setNewEntryEndHour(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {hoursList.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="font-bold text-slate-400">:</span>
                      <select
                        value={newEntryEndMin}
                        onChange={(e) => setNewEntryEndMin(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {minutesList.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={newEntryEndAmpm}
                        onChange={(e) => setNewEntryEndAmpm(e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50 -mx-6 -mb-6 p-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setManualEntryTargetEmp(null)}
                  className="bg-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="submit"
                >
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Shift Times Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-normal text-[#5b708b]">
                Edit Shift Times
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-center font-bold text-slate-700">
                    Start Date/Time:
                  </label>
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#3f6b35] cursor-pointer"
                    />

                    <div className="flex items-center gap-1">
                      <select
                        value={editStartHour}
                        onChange={(e) => setEditStartHour(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {hoursList.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="font-bold text-slate-400">:</span>
                      <select
                        value={editStartMin}
                        onChange={(e) => setEditStartMin(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {minutesList.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={editStartAmpm}
                        onChange={(e) => setEditStartAmpm(e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-center font-bold text-slate-700">
                    End Date/Time:
                  </label>
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#3f6b35] cursor-pointer"
                    />

                    <div className="flex items-center gap-1">
                      <select
                        value={editEndHour}
                        onChange={(e) => setEditEndHour(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {hoursList.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="font-bold text-slate-400">:</span>
                      <select
                        value={editEndMin}
                        onChange={(e) => setEditEndMin(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:outline-none cursor-pointer"
                      >
                        {minutesList.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={editEndAmpm}
                        onChange={(e) => setEditEndAmpm(e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-200 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50 -mx-6 -mb-6 p-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="bg-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="submit"
                >
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Entry Confirmation Modal */}
      {deletingEntryTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-[#be4646] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Shift Entry</h3>
                <p className="text-slate-500 text-[11px]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-slate-700">
              Are you sure you want to permanently delete this shift entry from the employee&apos;s timesheet?
            </p>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDeletingEntryTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleConfirmDelete}
                className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold"
              >
                Delete Entry
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
