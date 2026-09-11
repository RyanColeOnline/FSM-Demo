'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit3 
} from 'lucide-react';
import { 
  Button, 
  Checkbox,
  DatePicker,
  MenuTrigger,
  Menu,
  MenuItem,
  MenuButton,
  MenuSeparator
} from '@/components/ui';
import { useSession } from '@/auth/sessionStore';

export interface FlagNoteEntry {
  id: string;
  authorName: string;
  timestamp: string; // e.g. "8/07/2026, 4:44 pm"
  text: string;
  isEditing?: boolean; // Toggled via three-dot menu or new entry
}

export interface FollowUpFlagJobData {
  id: string;
  jobNumber: string;
  customerName?: string;
  isFlagged: boolean;
  followUpType?: string;
  assignee?: string;
  dueDate?: string;
  isFlagComplete?: boolean;
  notes?: FlagNoteEntry[];
}

import { FOLLOW_UP_TYPES } from '@/constants/globalChoices';

export const mockFollowUpTypes = [...FOLLOW_UP_TYPES];

export const mockAssignees = [
  'Alex Reynolds',
  'Sarah Jenkins',
  'Marcus Vance',
  'Carlos Mendez',
  'David Ross',
  'Tyler Reed',
];

export const getCurrentFormattedTimestamp = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;
};

interface EditFollowUpFlagModalProps {
  job: FollowUpFlagJobData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: {
    followUpType: string;
    assignee: string;
    dueDate: string;
    isFlagComplete: boolean;
    notes: FlagNoteEntry[];
  }) => void;
  onRemoveFlag: () => void;
}

export function EditFollowUpFlagModal({
  job,
  isOpen,
  onClose,
  onSave,
  onRemoveFlag,
}: EditFollowUpFlagModalProps) {
  const { currentUser } = useSession();
  const [modalFollowUpType, setModalFollowUpType] = useState('Need Quote/Autho');
  const [modalAssignee, setModalAssignee] = useState('');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalFlagComplete, setModalFlagComplete] = useState(false);
  const [modalNotes, setModalNotes] = useState<FlagNoteEntry[]>([]);
  const [activeNoteMenuId, setActiveNoteMenuId] = useState<string | null>(null);

  const noteListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (job) {
      setModalFollowUpType(job.followUpType || 'Need Quote/Autho');
      setModalAssignee(job.assignee || 'Alex Reynolds');
      setModalDueDate(job.dueDate || '');
      setModalFlagComplete(job.isFlagComplete || false);
      setModalNotes(job.notes ? job.notes.map((n) => ({ ...n, isEditing: false })) : []);
      setActiveNoteMenuId(null);
    }
  }, [job]);

  // Outside click listener for note action menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.note-menu-container')) {
        setActiveNoteMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Ensure note list is scrolled to top on load in
  useEffect(() => {
    if (isOpen && noteListRef.current) {
      noteListRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  if (!isOpen || !job) return null;

  // Add Note Entry Row AT THE BOTTOM
  const handleAddNoteRow = () => {
    const rawAuthor = currentUser?.name || 'Ryan Cole';
    const authorName = rawAuthor.replace(/\s*\(.*?\)\s*/g, '').trim();
    const newNote: FlagNoteEntry = {
      id: `note-${Date.now()}`,
      authorName: authorName || 'Ryan Cole',
      timestamp: getCurrentFormattedTimestamp(),
      text: '',
      isEditing: true,
    };
    setModalNotes((prev) => [...prev, newNote]);
    setActiveNoteMenuId(null);
  };

  const handleToggleNoteEdit = (noteId: string) => {
    setModalNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isEditing: !n.isEditing } : n))
    );
    setActiveNoteMenuId(null);
  };

  const handleUpdateNoteText = (noteId: string, text: string) => {
    setModalNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, text } : n))
    );
  };

  const handleRemoveNoteRow = (noteId: string) => {
    setModalNotes((prev) => prev.filter((n) => n.id !== noteId));
    setActiveNoteMenuId(null);
  };

  // Press Enter key to submit individual note entry into saved row form
  const handleKeyDownNoteSubmit = (e: React.KeyboardEvent, noteId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setModalNotes((prev) =>
        prev.map((n) => {
          if (n.id === noteId) {
            if (n.text.trim().length === 0) {
              return null as any;
            }
            return { ...n, isEditing: false };
          }
          return n;
        }).filter(Boolean)
      );
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNotes = modalNotes
      .map((n) => ({ ...n, isEditing: false }))
      .filter((n) => n.text.trim().length > 0);

    onSave({
      followUpType: modalFollowUpType,
      assignee: modalAssignee,
      dueDate: modalDueDate,
      isFlagComplete: modalFlagComplete,
      notes: finalNotes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col transition-all">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-normal text-[#5b708b]">
            Edit Follow Up Flag
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form id="edit-flag-form" onSubmit={handleFormSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Top Form Fields Row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
            {/* Follow Up Type Dropdown */}
            <div className="w-56 shrink-0">
              <label className="block font-bold text-slate-700 mb-1">
                Follow Up Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={modalFollowUpType}
                onChange={(e) => setModalFollowUpType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#3f6b35] cursor-pointer"
              >
                {mockFollowUpTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="w-44 shrink-0">
              <label className="block font-bold text-slate-700 mb-1">
                Assignee (optional)
              </label>
              <select
                value={modalAssignee}
                onChange={(e) => setModalAssignee(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {mockAssignees.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="w-40 shrink-0">
              <label className="block font-bold text-slate-700 mb-1">
                Due Date (optional)
              </label>
              <DatePicker
                size="sm"
                value={modalDueDate}
                onChange={(d) => setModalDueDate(d)}
              />
            </div>

            {/* Flag Complete & Remove Flag Link */}
            <div className="flex items-center gap-4 shrink-0 pt-3 sm:pt-0 pl-2">
              <div className="flex flex-col items-center">
                <label className="block font-bold text-slate-700 mb-1 text-[11px] whitespace-nowrap">
                  Flag Complete
                </label>
                <Checkbox
                  checked={modalFlagComplete}
                  onChange={(e) => setModalFlagComplete(e.target.checked)}
                />
              </div>

              <button
                type="button"
                onClick={onRemoveFlag}
                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline cursor-pointer whitespace-nowrap pt-3"
              >
                Remove Flag
              </button>
            </div>
          </div>

          {/* UNIFIED CONTINUOUS BACKGROUND FOR NOTE ENTRIES */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <label className="block font-bold text-slate-700 text-xs">
              Job Notes
            </label>

            {/* Continuous Background Container */}
            <div 
              ref={noteListRef}
              className="bg-slate-50/90 border border-slate-200 rounded-lg p-3 space-y-2.5 max-h-[50vh] overflow-y-auto transition-all"
            >
              {modalNotes.length === 0 ? (
                <div className="text-center py-3 text-slate-400 italic text-xs">
                  No notes recorded yet. Click &quot;Add Note&quot; below.
                </div>
              ) : (
                <div className="divide-y divide-slate-200/70 space-y-2">
                  {modalNotes.map((note, index) => {
                    const isMenuOpen = activeNoteMenuId === note.id;

                    return (
                      <div key={note.id} className={index > 0 ? 'pt-2' : ''}>
                        {/* Subtext Row */}
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-0 relative">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">{note.authorName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 font-normal">{note.timestamp}</span>
                          </div>

                          {/* Row Action Menu */}
                          <div className="flex items-center">
                            <MenuTrigger>
                              <MenuButton
                                variant="icon"
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                aria-label="Note options"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </MenuButton>
                              <Menu placement="bottom end">
                                <MenuItem onAction={() => handleToggleNoteEdit(note.id)}>
                                  <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Edit</span>
                                </MenuItem>
                                {index > 0 && (
                                  <>
                                    <MenuSeparator />
                                    <MenuItem variant="danger" onAction={() => handleRemoveNoteRow(note.id)}>
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      <span>Delete</span>
                                    </MenuItem>
                                  </>
                                )}
                              </Menu>
                            </MenuTrigger>
                          </div>
                        </div>

                        {/* Note Text */}
                        {note.isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            placeholder="Type new note entry and press Enter..."
                            value={note.text}
                            onChange={(e) => handleUpdateNoteText(note.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDownNoteSubmit(e, note.id)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#3f6b35] mt-1"
                          />
                        ) : (
                          <div className="text-slate-800 text-xs font-normal leading-snug">
                            {note.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* "+ Add Note" Button Placed BELOW the Note Entries List */}
              <button
                type="button"
                onClick={handleAddNoteRow}
                className="w-full py-1.5 bg-white hover:bg-slate-100 text-[#3f6b35] rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 mt-2 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Note</span>
              </button>
            </div>
          </div>
        </form>

        {/* Dedicated Sibling Footer Container */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="bg-white cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="submit"
            form="edit-flag-form"
            className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold px-6 cursor-pointer"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
