'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  UserPlus, 
  X, 
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
  Info,
  AlertTriangle,
  Bold,
  Italic,
  Underline,
  Eraser,
  List,
  ListOrdered,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  ColorSwatch, 
  ColorField, 
  ColorArea, 
  ColorThumb, 
  parseColor,
  Input as AriaInput
} from 'react-aria-components';
import { Button, Input, PageHeader, DatePicker, MenuTrigger, Menu, MenuItem, MenuButton, MenuSeparator } from '@/components/ui';
import { useUsers } from '@/hooks/useUsers';
import { useDispatchGroups } from '@/hooks/useDispatchGroups';
import { useSession } from '@/auth/sessionStore';
import { CanonicalUser, CanonicalDispatchGroup } from '@murphys/domain';
import { CANONICAL_OFFICIAL_USERS, CANONICAL_OFFICIAL_DISPATCH_GROUPS } from '@/domain/mock';

interface SubmenuItem {
  id: string;
  label: string;
}

interface MenuItem {
  id: string;
  label: string;
  hasChildren?: boolean;
  children?: SubmenuItem[];
}

export interface UserRecord {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  status: 'On Duty' | 'Off Duty' | 'Clocked In' | 'Clocked Out' | 'On Break';
  accountType: 'Admin' | 'Office' | 'Field';
  hasFsmAccess: boolean;
  laborCostHr: string;
  isDeactivated?: boolean;
  
  // Profile details
  initials?: string;
  profilePictureUrl?: string;
  accessCode?: string;
  homePhone?: string;
  mobilePhone?: string;
  techSkillLevel?: string;
  dispatchGroups?: string[];
  mapsPreference?: string;
  appTheme?: string;
  
  // Permissions
  appointmentVisibility?: string;
  allCustomerVisibility?: boolean;
  reportingTabVisibility?: boolean;
  moreAppsSettingsVisibility?: boolean;
  technicianToolsBluon?: boolean;
  manuallyEnterCards?: boolean;
  manageRecurringPayments?: boolean;
  performCreditsVoids?: boolean;
  performFinancingActions?: boolean;
  copiesReceipts?: string[];
  scheduleEvents?: string;
  editPricesTaxMobile?: boolean;
  taxGroupInvoicesProposals?: boolean;
  createCustomLineItems?: boolean;
  purchaseOrders?: boolean;
  jobPL?: boolean;
  twoWayMessaging?: string;
  messagingSound?: string;
}

export interface DispatchGroupRecord {
  id: string;
  name: string;
  members: string[];
}

const initialUsers: UserRecord[] = CANONICAL_OFFICIAL_USERS.map((c) => ({
  id: c.id,
  name: c.displayName || `${c.firstName} ${c.lastName}`.trim() || 'User',
  firstName: c.firstName,
  lastName: c.lastName,
  initials: c.initials || 'US',
  email: c.email,
  status: c.clockStatus || 'Clocked Out',
  accountType: c.permissions?.accountType || 'Field',
  hasFsmAccess: true,
  laborCostHr: 'N/A',
  isDeactivated: !c.isActive,
  accessCode: c.accessNumber,
  homePhone: c.homePhone,
  mobilePhone: c.mobilePhone,
  techSkillLevel: c.techSkillLevel,
  dispatchGroups: c.dispatchGroups,
  mapsPreference: c.deviceProfile?.mapsPreference || 'Apple Maps',
  appTheme: c.deviceProfile?.appTheme || 'System',
  appointmentVisibility: c.permissions?.appointmentVisibility,
  allCustomerVisibility: c.permissions?.allCustomerVisibility,
  reportingTabVisibility: c.permissions?.reportingTabVisibility,
  moreAppsSettingsVisibility: c.permissions?.moreAppsAndSettingsVisibility,
  manuallyEnterCards: c.permissions?.manuallyEnterCards,
  manageRecurringPayments: c.permissions?.manageRecurringPayments,
  performCreditsVoids: c.permissions?.performCreditsAndVoids,
  performFinancingActions: c.permissions?.performFinancingActions,
  copiesReceipts: c.permissions?.receiptCopyRecipients,
  scheduleEvents: c.permissions?.scheduleEventsPermission,
  editPricesTaxMobile: c.permissions?.editPricesAndTaxOnMobile,
  createCustomLineItems: c.permissions?.createCustomLineItems,
  jobPL: c.permissions?.viewJobPnL,
}));

export interface DaySchedule {
  day: string;
  short: string;
  isClosed: boolean;
  startTime: string;
  endTime: string;
}

export interface SpecialHourRecord {
  id: string;
  date: string;
  description: string;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

const initialWeeklyHours: DaySchedule[] = [
  { day: 'Sunday', short: 'Sun', isClosed: true, startTime: '8:00 am', endTime: '4:00 pm' },
  { day: 'Monday', short: 'Mon', isClosed: false, startTime: '8:00 am', endTime: '4:00 pm' },
  { day: 'Tuesday', short: 'Tue', isClosed: false, startTime: '8:00 am', endTime: '4:00 pm' },
  { day: 'Wednesday', short: 'Wed', isClosed: false, startTime: '8:00 am', endTime: '4:00 pm' },
  { day: 'Thursday', short: 'Thu', isClosed: false, startTime: '8:00 am', endTime: '4:00 pm' },
  { day: 'Friday', short: 'Fri', isClosed: false, startTime: '8:00 am', endTime: '4:00 pm' },
  { day: 'Saturday', short: 'Sat', isClosed: true, startTime: '8:00 am', endTime: '4:00 pm' },
];

const initialSpecialHours: SpecialHourRecord[] = [
  { id: 'sh-1', date: '2025-12-25', description: 'christmas closed', startTime: '6:00 am', endTime: '11:59 pm', isClosed: true },
  { id: 'sh-2', date: '2025-11-27', description: 'Thanksgiving Day', startTime: '6:00 am', endTime: '11:59 pm', isClosed: true },
  { id: 'sh-3', date: '2025-05-26', description: 'memorial Day', startTime: '6:00 am', endTime: '11:59 pm', isClosed: true },
  { id: 'sh-4', date: '2026-01-01', description: 'New Years Day', startTime: '6:00 am', endTime: '11:59 pm', isClosed: true },
];

const TIME_OPTIONS = [
  '12:00 am', '12:30 am', '1:00 am', '1:30 am', '2:00 am', '2:30 am', '3:00 am', '3:30 am',
  '4:00 am', '4:30 am', '5:00 am', '5:30 am', '6:00 am', '6:30 am', '7:00 am', '7:30 am',
  '8:00 am', '8:30 am', '9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am',
  '12:00 pm', '12:30 pm', '1:00 pm', '1:30 pm', '2:00 pm', '2:30 pm', '3:00 pm', '3:30 pm',
  '4:00 pm', '4:30 pm', '5:00 pm', '5:30 pm', '6:00 pm', '6:30 pm', '7:00 pm', '7:30 pm',
  '8:00 pm', '8:30 pm', '9:00 pm', '9:30 pm', '10:00 pm', '10:30 pm', '11:00 pm', '11:30 pm',
  '11:59 pm'
];

const initialDispatchGroups: DispatchGroupRecord[] = CANONICAL_OFFICIAL_DISPATCH_GROUPS.map((dg) => ({
  id: dg.id,
  name: dg.name,
  members: [...dg.members],
}));

export interface ReferralSourceRecord {
  id: string;
  name: string;
  isArchived?: boolean;
}

const initialReferralSources: ReferralSourceRecord[] = [
  { id: 'ref-1', name: 'BNI', isArchived: false },
  { id: 'ref-2', name: 'Customer Referral', isArchived: false },
  { id: 'ref-3', name: 'Local Advertising', isArchived: false },
  { id: 'ref-4', name: 'Saw Vehicle', isArchived: false },
  { id: 'ref-5', name: 'Web Search', isArchived: false },
  { id: 'ref-6', name: 'Website', isArchived: false },
];

export interface ContractTermRecord {
  id: string;
  name: string;
  description: string;
  isDefaultForProposals?: boolean;
  isDefaultForInvoices?: boolean;
}

const initialContractTerms: ContractTermRecord[] = [
  {
    id: 'ct-1',
    name: 'Appliance Parts and Diagnosis Disclaimer',
    description: 'Installing a new electronic board, relay, or other electrical component does not guarantee that your appliance will be fully repaired. ...',
    isDefaultForProposals: false,
    isDefaultForInvoices: false,
  },
];

export interface JobTypeRecord {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  defaultDurationHours?: string;
  defaultDurationMinutes?: string;
  defaultInvoiceClass?: string;
  primaryTechAllocation?: string;
  additionalTechsAllocation?: string;
  techAllocationStrategy?: string;
}

const initialJobTypes: JobTypeRecord[] = [
  { id: 'jt-1', name: 'APP Parts', color: '#CCA300', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-2', name: 'Appliance Install', color: '#22C55E', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-3', name: 'Appliance service', color: '#0891B2', isDefault: true, defaultDurationHours: '1 hour', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-4', name: 'Hvac Install', color: '#F97316', isDefault: false, defaultDurationHours: '6 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-5', name: 'HVAC Parts', color: '#C2410C', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-6', name: 'HVAC service', color: '#DC2626', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '0', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-7', name: 'HW Appliance', color: '#C084FC', isDefault: false, defaultDurationHours: '1 hour', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-8', name: 'HW HVAC', color: '#C084FC', isDefault: false, defaultDurationHours: '1 hour', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-9', name: 'HW Parts', color: '#C2410C', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-10', name: 'HW Recall - Appliances', color: '#818CF8', isDefault: false, defaultDurationHours: '1 hour', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-11', name: 'HW Recall: HVAC', color: '#000000', isDefault: false, defaultDurationHours: '1 hour', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-13', name: 'Preventative Maintenance', color: '#4ADE80', isDefault: false, defaultDurationHours: '1 hour', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-14', name: 'Recall - Appliances', color: '#818CF8', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-15', name: 'Recall - HVAC', color: '#000000', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
  { id: 'jt-16', name: 'Recall - HVAC Install', color: '#7E22CE', isDefault: false, defaultDurationHours: '2 hours', defaultDurationMinutes: '00 min', defaultInvoiceClass: 'None', primaryTechAllocation: '100', additionalTechsAllocation: '100', techAllocationStrategy: 'Give to each tech' },
];

export interface PaymentTermRecord {
  id: string;
  name: string;
  days: number;
  isDefault?: boolean;
  autoSyncStatus?: 'Synced' | 'Error' | 'Pending';
}

const initialPaymentTerms: PaymentTermRecord[] = [
  { id: 'pt-1', name: 'COD', days: 0, isDefault: false, autoSyncStatus: 'Synced' },
  { id: 'pt-2', name: 'Home Warranty AHS/OR', days: 30, isDefault: false, autoSyncStatus: 'Synced' },
  { id: 'pt-3', name: '30 days', days: 30, isDefault: false, autoSyncStatus: 'Synced' },
  { id: 'pt-4', name: 'Due upon Receipt', days: 10, isDefault: true, autoSyncStatus: 'Error' },
];

export interface PaymentUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  userType: 'Admin' | 'Field' | 'Office';
  emailReceipts: 'None' | 'Own' | 'All';
  canRefundVoid: boolean;
  manualCardEntry: boolean;
  isMe?: boolean;
  isPendingRegistration?: boolean;
}

const initialPaymentUsers: PaymentUserRecord[] = [
  { id: 'pu-1', firstName: 'Alex', lastName: 'Reynolds', email: 'admin@apex.com', phone: '555-0100', userType: 'Admin', emailReceipts: 'Own', canRefundVoid: true, manualCardEntry: true, isMe: true },
  { id: 'pu-2', firstName: 'Sarah', lastName: 'Jenkins', email: 'dispatch@apex.com', phone: '555-0101', userType: 'Office', emailReceipts: 'Own', canRefundVoid: true, manualCardEntry: true },
  { id: 'pu-3', firstName: 'Marcus', lastName: 'Vance', email: 'tech.hvac1@apex.com', phone: '555-0102', userType: 'Field', emailReceipts: 'None', canRefundVoid: true, manualCardEntry: true },
  { id: 'pu-4', firstName: 'Carlos', lastName: 'Mendez', email: 'tech.hvac2@apex.com', phone: '555-0103', userType: 'Field', emailReceipts: 'None', canRefundVoid: true, manualCardEntry: true },
  { id: 'pu-5', firstName: 'David', lastName: 'Ross', email: 'tech.appliance1@apex.com', phone: '555-0104', userType: 'Field', emailReceipts: 'None', canRefundVoid: true, manualCardEntry: true },
  { id: 'pu-6', firstName: 'Tyler', lastName: 'Reed', email: 'tech.appliance2@apex.com', phone: '555-0105', userType: 'Field', emailReceipts: 'None', canRefundVoid: true, manualCardEntry: true },
];

const sidebarMenu: MenuItem[] = [
  { id: 'accounting', label: 'Accounting & Taxes' },
  { 
    id: 'call-notifications', 
    label: 'Call & Notifications', 
    hasChildren: true,
    children: [
      { id: 'appointment-notifications', label: 'Appointment Notifications' },
      { id: 'email-notifications', label: 'Email Notifications' },
      { id: 'text-notifications', label: 'Text Notifications' },
      { id: 'notification-phone-numbers', label: 'Notification Phone Numbers' },
    ]
  },
  { 
    id: 'customers-scheduling', 
    label: 'Customers & Scheduling', 
    hasChildren: true,
    children: [
      { id: 'business-hours', label: 'Business Hours' },
      { id: 'customer-preferences', label: 'Customer Preferences' },
      { id: 'referral-list', label: 'Referral List' },
    ]
  },
  { 
    id: 'jobs', 
    label: 'Jobs', 
    hasChildren: true,
    children: [
      { id: 'contract-terms', label: 'Contract Terms' },

      { id: 'payment-terms', label: 'Payment Terms' },
    ]
  },
  { id: 'payment-options', label: 'Payment Options' },
  { 
    id: 'user-management', 
    label: 'User Management', 
    hasChildren: true,
    children: [
      { id: 'users', label: 'Users' },
      { id: 'dispatch-groups', label: 'Dispatch Groups' },
    ]
  },
];

function getUserProfileFormData(user: UserRecord) {
  const nameParts = user.name.split(' ');
  const firstName = user.firstName || nameParts[0] || '';
  const lastName = user.lastName || nameParts.slice(1).join(' ') || '';
  const isAdmin = user.accountType === 'Admin';
  const isField = user.accountType === 'Field';

  return {
    id: user.id,
    firstName: firstName,
    lastName: lastName,
    name: user.name,
    initials: user.initials || '',
    email: user.email,
    accessCode: user.accessCode || '',
    homePhone: user.homePhone || '',
    mobilePhone: user.mobilePhone || '',
    techSkillLevel: user.techSkillLevel || '',
    dispatchGroups: user.dispatchGroups || [],
    mapsPreference: user.mapsPreference || 'Apple Maps',
    appTheme: user.appTheme || 'System',
    
    accountType: user.accountType,
    status: user.status,
    isDeactivated: user.isDeactivated || false,
    
    // Permissions (Admin gets all permissions granted by default; Field gets reporting/settings restricted to false)
    appointmentVisibility: user.appointmentVisibility || 'All appointments',
    allCustomerVisibility: user.allCustomerVisibility ?? true,
    reportingTabVisibility: isField ? false : (user.reportingTabVisibility ?? (isAdmin ? true : false)),
    moreAppsSettingsVisibility: isField ? false : (user.moreAppsSettingsVisibility ?? (isAdmin ? true : false)),
    manuallyEnterCards: user.manuallyEnterCards ?? true,
    manageRecurringPayments: user.manageRecurringPayments ?? (isAdmin ? true : false),
    performCreditsVoids: user.performCreditsVoids ?? true,
    performFinancingActions: user.performFinancingActions ?? true,
    copiesReceipts: user.copiesReceipts || ['This User'],
    scheduleEvents: user.scheduleEvents || 'Can Schedule All Events',
    editPricesTaxMobile: user.editPricesTaxMobile ?? true,
    taxGroupInvoicesProposals: user.taxGroupInvoicesProposals ?? false,
    createCustomLineItems: user.createCustomLineItems ?? true,
    jobPL: user.jobPL ?? true,
  };
}

function getInitialsFontSizeClass(initials: string): string {
  const len = (initials || '').length;
  if (len <= 2) return 'text-xs font-bold';
  if (len === 3) return 'text-[10px] font-bold tracking-tight';
  return 'text-[9px] font-extrabold tracking-tighter';
}

function getUserStatusBadgeClass(status: string): string {
  const s = (status || '').toLowerCase().trim();
  if (s.includes('in') && !s.includes('out')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (s.includes('job') || s.includes('progress')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function canonicalToUserRecord(c: CanonicalUser): UserRecord {
  const defaultInit = ((c.firstName?.charAt(0) || '') + (c.lastName?.charAt(0) || '')).toUpperCase() || 'US';
  const rawAcc = String(c.accountType || c.role || c.permissions?.accountType || 'Field').toLowerCase();
  const normalizedAcc: 'Admin' | 'Office' | 'Field' =
    rawAcc === 'admin' ? 'Admin' : rawAcc === 'office' ? 'Office' : 'Field';

  return {
    id: c.id,
    name: c.displayName || `${c.firstName} ${c.lastName}`.trim() || 'User',
    firstName: c.firstName,
    lastName: c.lastName,
    initials: c.initials || defaultInit,
    email: c.email,
    status: c.clockStatus || 'Clocked Out',
    accountType: normalizedAcc,
    hasFsmAccess: true,
    laborCostHr: 'N/A',
    isDeactivated: !c.isActive,
    accessCode: c.accessNumber,
    homePhone: c.homePhone,
    mobilePhone: c.mobilePhone,
    techSkillLevel: c.techSkillLevel,
    dispatchGroups: c.dispatchGroups,
    mapsPreference: c.deviceProfile?.mapsPreference || 'Apple Maps',
    appTheme: c.deviceProfile?.appTheme || 'System',
    appointmentVisibility: c.permissions?.appointmentVisibility,
    allCustomerVisibility: c.permissions?.allCustomerVisibility,
    reportingTabVisibility: c.permissions?.reportingTabVisibility,
    moreAppsSettingsVisibility: c.permissions?.moreAppsAndSettingsVisibility,
    manuallyEnterCards: c.permissions?.manuallyEnterCards,
    manageRecurringPayments: c.permissions?.manageRecurringPayments,
    performCreditsVoids: c.permissions?.performCreditsAndVoids,
    performFinancingActions: c.permissions?.performFinancingActions,
    copiesReceipts: c.permissions?.receiptCopyRecipients,
    scheduleEvents: c.permissions?.scheduleEventsPermission,
    editPricesTaxMobile: c.permissions?.editPricesAndTaxOnMobile,
    createCustomLineItems: c.permissions?.createCustomLineItems,
    jobPL: c.permissions?.viewJobPnL,
  };
}

function SettingsContent() {
  const { currentUser } = useSession();
  const { users: liveUsers, saveUser: persistCanonicalUser } = useUsers();
  const { dispatchGroups: liveDispatchGroups, saveDispatchGroup: persistCanonicalGroup, deleteDispatchGroup: deleteCanonicalGroup } = useDispatchGroups();
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get('tab') : null;
  const userIdParam = searchParams ? (searchParams.get('userId') || searchParams.get('user')) : null;
  const isProfileParam = searchParams ? searchParams.get('profile') : null;

  const isDirectProfile = tabParam === 'profile' || tabParam === 'user-profile' || (tabParam === 'users' && (userIdParam || isProfileParam));

  const [users, setUsers] = useState<UserRecord[]>(initialUsers);

  useEffect(() => {
    if (liveUsers && liveUsers.length > 0) {
      setUsers(liveUsers.map(canonicalToUserRecord));
    }
  }, [liveUsers]);

  const initialTargetUser: UserRecord | null = isDirectProfile
    ? (userIdParam
        ? (users.find((u) => u.id === userIdParam || u.email?.toLowerCase() === userIdParam.toLowerCase()) || null)
        : (currentUser
            ? (users.find((u) => u.id === currentUser.id || u.email?.toLowerCase() === currentUser.email?.toLowerCase()) || null)
            : (users.find((u) => u.accountType === 'Admin') || users[0] || null)))
    : null;

  // DEFAULT LOAD-IN IS 'accounting' (Accounting & Taxes)
  const [activeSection, setActiveSection] = useState<string>(isDirectProfile ? 'users' : (tabParam || 'accounting'));
  const [expandedMenus, setExpandedMenus] = useState<string[]>(isDirectProfile ? ['user-management'] : []);
  const [dispatchGroups, setDispatchGroups] = useState<DispatchGroupRecord[]>(initialDispatchGroups);

  useEffect(() => {
    if (liveDispatchGroups && liveDispatchGroups.length > 0) {
      setDispatchGroups(liveDispatchGroups.map((dg) => ({
        id: dg.id,
        name: dg.name,
        members: [...dg.members],
      })));
    }
  }, [liveDispatchGroups]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // User Profile / Manage User State
  const [managingUser, setManagingUser] = useState<UserRecord | null>(initialTargetUser);
  const [userProfileTab, setUserProfileTab] = useState<'details' | 'work-hours'>('details');
  const [profileFormData, setProfileFormData] = useState<any>(initialTargetUser ? getUserProfileFormData(initialTargetUser) : {});
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  // Dispatch Group Modal State (Supports Add & Edit)
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [activeGroupMenuId, setActiveGroupMenuId] = useState<string | null>(null);

  // Appointment Notifications State (4 toggles)
  const [appointmentNotifications, setAppointmentNotifications] = useState({
    scheduled: false,
    oneWeekPrior: false,
    oneDayPrior: false,
    enRoute: true,
  });
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Customer Preferences State (Matching screenshot)
  const [autoGenCustomerNumber, setAutoGenCustomerNumber] = useState(true);
  const [startingCustomerNumber, setStartingCustomerNumber] = useState('49619');
  const [qbCustomerNameFormat, setQbCustomerNameFormat] = useState('Last, First / Business Name');

  // Referral List State (Matching screenshot with Edit & Delete)
  const [referralSources, setReferralSources] = useState<ReferralSourceRecord[]>(initialReferralSources);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [editingReferralId, setEditingReferralId] = useState<string | null>(null);
  const [referralNameInput, setReferralNameInput] = useState('');
  const [isDeletingReferralConfirm, setIsDeletingReferralConfirm] = useState(false);

  const handleOpenAddReferral = () => {
    setEditingReferralId(null);
    setReferralNameInput('');
    setIsDeletingReferralConfirm(false);
    setIsReferralModalOpen(true);
  };

  const handleOpenEditReferral = (source: ReferralSourceRecord) => {
    setEditingReferralId(source.id);
    setReferralNameInput(source.name);
    setIsDeletingReferralConfirm(false);
    setIsReferralModalOpen(true);
  };

  const handleSaveReferralSource = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!referralNameInput.trim()) return;

    if (editingReferralId) {
      setReferralSources((prev) =>
        prev.map((s) => (s.id === editingReferralId ? { ...s, name: referralNameInput.trim() } : s))
      );
    } else {
      const newSource: ReferralSourceRecord = {
        id: `ref-${Date.now()}`,
        name: referralNameInput.trim(),
      };
      setReferralSources((prev) => [...prev, newSource]);
    }

    setIsReferralModalOpen(false);
    setEditingReferralId(null);
    setReferralNameInput('');
    setIsDeletingReferralConfirm(false);
  };

  const handleDeleteReferralSource = () => {
    if (!editingReferralId) return;
    setReferralSources((prev) => prev.filter((s) => s.id !== editingReferralId));
    setIsReferralModalOpen(false);
    setEditingReferralId(null);
    setReferralNameInput('');
    setIsDeletingReferralConfirm(false);
  };

  // Contract Terms State (Matching screenshot with Rich Text & Defaults)
  const [contractTerms, setContractTerms] = useState<ContractTermRecord[]>(initialContractTerms);
  const [isContractTermModalOpen, setIsContractTermModalOpen] = useState(false);
  const [editingContractTermId, setEditingContractTermId] = useState<string | null>(null);
  const [termNameInput, setTermNameInput] = useState('');
  const [termDescriptionInput, setTermDescriptionInput] = useState('');
  const [termDefaultForProposals, setTermDefaultForProposals] = useState(false);
  const [termDefaultForInvoices, setTermDefaultForInvoices] = useState(false);
  const [isDeletingContractTermConfirm, setIsDeletingContractTermConfirm] = useState(false);

  const handleOpenCreateTerm = () => {
    setEditingContractTermId(null);
    setTermNameInput('');
    setTermDescriptionInput('');
    setTermDefaultForProposals(false);
    setTermDefaultForInvoices(false);
    setIsDeletingContractTermConfirm(false);
    setIsContractTermModalOpen(true);
  };

  const handleOpenEditTerm = (term: ContractTermRecord) => {
    setEditingContractTermId(term.id);
    setTermNameInput(term.name);
    setTermDescriptionInput(term.description);
    setTermDefaultForProposals(!!term.isDefaultForProposals);
    setTermDefaultForInvoices(!!term.isDefaultForInvoices);
    setIsDeletingContractTermConfirm(false);
    setIsContractTermModalOpen(true);
  };

  const handleSaveContractTerm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!termNameInput.trim()) return;

    if (editingContractTermId) {
      setContractTerms((prev) =>
        prev.map((t) =>
          t.id === editingContractTermId
            ? {
                ...t,
                name: termNameInput.trim(),
                description: termDescriptionInput.trim(),
                isDefaultForProposals: termDefaultForProposals,
                isDefaultForInvoices: termDefaultForInvoices,
              }
            : t
        )
      );
    } else {
      const newTerm: ContractTermRecord = {
        id: `ct-${Date.now()}`,
        name: termNameInput.trim(),
        description: termDescriptionInput.trim(),
        isDefaultForProposals: termDefaultForProposals,
        isDefaultForInvoices: termDefaultForInvoices,
      };
      setContractTerms((prev) => [...prev, newTerm]);
    }

    setIsContractTermModalOpen(false);
    setEditingContractTermId(null);
    setTermNameInput('');
    setTermDescriptionInput('');
    setIsDeletingContractTermConfirm(false);
  };

  const handleDeleteContractTerm = () => {
    if (!editingContractTermId) return;
    setContractTerms((prev) => prev.filter((t) => t.id !== editingContractTermId));
    setIsContractTermModalOpen(false);
    setEditingContractTermId(null);
    setTermNameInput('');
    setTermDescriptionInput('');
    setIsDeletingContractTermConfirm(false);
  };

  // Job Types State (Matching screenshot with React Aria Color picker, Duration, Allocations)
  const [jobTypes, setJobTypes] = useState<JobTypeRecord[]>(initialJobTypes);
  const [isJobTypeModalOpen, setIsJobTypeModalOpen] = useState(false);
  const [editingJobTypeId, setEditingJobTypeId] = useState<string | null>(null);
  const [jobTypeName, setJobTypeName] = useState('');
  const [jobTypeColor, setJobTypeColor] = useState('#C91F37');
  const [jobTypeIsDefault, setJobTypeIsDefault] = useState(false);
  const [jobTypeDurationHours, setJobTypeDurationHours] = useState('2 hours');
  const [jobTypeDurationMinutes, setJobTypeDurationMinutes] = useState('00 min');
  const [jobTypeInvoiceClass, setJobTypeInvoiceClass] = useState('None');
  const [jobTypePrimaryTech, setJobTypePrimaryTech] = useState('100');
  const [jobTypeAdditionalTechs, setJobTypeAdditionalTechs] = useState('100');
  const [jobTypeTechStrategy, setJobTypeTechStrategy] = useState('Give to each tech');
  const [isDeletingJobTypeConfirm, setIsDeletingJobTypeConfirm] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Safe color parsing for React Aria
  let parsedJobTypeColor = parseColor('#C91F37');
  try {
    const rawColor = jobTypeColor.startsWith('#') ? jobTypeColor : '#' + jobTypeColor;
    parsedJobTypeColor = parseColor(rawColor);
  } catch {
    parsedJobTypeColor = parseColor('#C91F37');
  }

  const handleOpenAddJobType = () => {
    setEditingJobTypeId(null);
    setJobTypeName('');
    setJobTypeColor('#C91F37');
    setJobTypeIsDefault(false);
    setJobTypeDurationHours('2 hours');
    setJobTypeDurationMinutes('00 min');
    setJobTypeInvoiceClass('None');
    setJobTypePrimaryTech('100');
    setJobTypeAdditionalTechs('100');
    setJobTypeTechStrategy('Give to each tech');
    setIsDeletingJobTypeConfirm(false);
    setIsColorPickerOpen(false);
    setIsJobTypeModalOpen(true);
  };

  const handleOpenEditJobType = (jt: JobTypeRecord) => {
    setEditingJobTypeId(jt.id);
    setJobTypeName(jt.name);
    setJobTypeColor(jt.color || '#C91F37');
    setJobTypeIsDefault(!!jt.isDefault);
    setJobTypeDurationHours(jt.defaultDurationHours || '2 hours');
    setJobTypeDurationMinutes(jt.defaultDurationMinutes || '00 min');
    setJobTypeInvoiceClass(jt.defaultInvoiceClass || 'None');
    setJobTypePrimaryTech(jt.primaryTechAllocation || '100');
    setJobTypeAdditionalTechs(jt.additionalTechsAllocation || '100');
    setJobTypeTechStrategy(jt.techAllocationStrategy || 'Give to each tech');
    setIsDeletingJobTypeConfirm(false);
    setIsColorPickerOpen(false);
    setIsJobTypeModalOpen(true);
  };

  const handleSaveJobType = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jobTypeName.trim()) return;

    const formattedColor = jobTypeColor.startsWith('#') ? jobTypeColor.toUpperCase() : ('#' + jobTypeColor).toUpperCase();

    if (editingJobTypeId) {
      setJobTypes((prev) =>
        prev.map((jt) => {
          if (jt.id === editingJobTypeId) {
            return {
              ...jt,
              name: jobTypeName.trim(),
              color: formattedColor,
              isDefault: jobTypeIsDefault,
              defaultDurationHours: jobTypeDurationHours,
              defaultDurationMinutes: jobTypeDurationMinutes,
              defaultInvoiceClass: jobTypeInvoiceClass,
              primaryTechAllocation: jobTypePrimaryTech,
              additionalTechsAllocation: jobTypeAdditionalTechs,
              techAllocationStrategy: jobTypeTechStrategy,
            };
          }
          if (jobTypeIsDefault) {
            return { ...jt, isDefault: false };
          }
          return jt;
        })
      );
    } else {
      const newJt: JobTypeRecord = {
        id: `jt-${Date.now()}`,
        name: jobTypeName.trim(),
        color: formattedColor,
        isDefault: jobTypeIsDefault,
        defaultDurationHours: jobTypeDurationHours,
        defaultDurationMinutes: jobTypeDurationMinutes,
        defaultInvoiceClass: jobTypeInvoiceClass,
        primaryTechAllocation: jobTypePrimaryTech,
        additionalTechsAllocation: jobTypeAdditionalTechs,
        techAllocationStrategy: jobTypeTechStrategy,
      };
      setJobTypes((prev) => {
        const list = jobTypeIsDefault ? prev.map((item) => ({ ...item, isDefault: false })) : prev;
        return [...list, newJt];
      });
    }

    setIsJobTypeModalOpen(false);
    setEditingJobTypeId(null);
    setIsDeletingJobTypeConfirm(false);
    setIsColorPickerOpen(false);
  };

  const handleDeleteJobType = () => {
    if (!editingJobTypeId) return;
    setJobTypes((prev) => prev.filter((jt) => jt.id !== editingJobTypeId));
    setIsJobTypeModalOpen(false);
    setEditingJobTypeId(null);
    setIsDeletingJobTypeConfirm(false);
    setIsColorPickerOpen(false);
  };

  // Payment Terms State (Matching screenshot)
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermRecord[]>(initialPaymentTerms);
  const [isPaymentTermModalOpen, setIsPaymentTermModalOpen] = useState(false);
  const [editingPaymentTermId, setEditingPaymentTermId] = useState<string | null>(null);
  const [paymentTermName, setPaymentTermName] = useState('');
  const [paymentTermDays, setPaymentTermDays] = useState('0');
  const [paymentTermIsDefault, setPaymentTermIsDefault] = useState(false);
  const [isDeletingPaymentTermConfirm, setIsDeletingPaymentTermConfirm] = useState(false);

  const handleOpenAddPaymentTerm = () => {
    setEditingPaymentTermId(null);
    setPaymentTermName('');
    setPaymentTermDays('');
    setPaymentTermIsDefault(false);
    setIsDeletingPaymentTermConfirm(false);
    setIsPaymentTermModalOpen(true);
  };

  const handleOpenEditPaymentTerm = (pt: PaymentTermRecord) => {
    setEditingPaymentTermId(pt.id);
    setPaymentTermName(pt.name);
    setPaymentTermDays(pt.days.toString());
    setPaymentTermIsDefault(!!pt.isDefault);
    setIsDeletingPaymentTermConfirm(false);
    setIsPaymentTermModalOpen(true);
  };

  const handleSavePaymentTerm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!paymentTermName.trim()) return;

    const parsedDays = parseInt(paymentTermDays, 10) || 0;

    if (editingPaymentTermId) {
      setPaymentTerms((prev) =>
        prev.map((pt) => {
          if (pt.id === editingPaymentTermId) {
            return {
              ...pt,
              name: paymentTermName.trim(),
              days: parsedDays,
              isDefault: paymentTermIsDefault,
            };
          }
          if (paymentTermIsDefault) {
            return { ...pt, isDefault: false };
          }
          return pt;
        })
      );
    } else {
      const newPt: PaymentTermRecord = {
        id: `pt-${Date.now()}`,
        name: paymentTermName.trim(),
        days: parsedDays,
        isDefault: paymentTermIsDefault,
        autoSyncStatus: 'Synced',
      };
      setPaymentTerms((prev) => {
        const list = paymentTermIsDefault ? prev.map((item) => ({ ...item, isDefault: false })) : prev;
        return [...list, newPt];
      });
    }

    setIsPaymentTermModalOpen(false);
    setEditingPaymentTermId(null);
    setIsDeletingPaymentTermConfirm(false);
  };

  const handleDeletePaymentTerm = () => {
    if (!editingPaymentTermId) return;
    setPaymentTerms((prev) => prev.filter((pt) => pt.id !== editingPaymentTermId));
    setIsDeletingPaymentTermConfirm(false);
    setEditingPaymentTermId(null);
  };

  // Payment Options / Users State (Matching Screenshot 1 & 2)
  const [paymentUsers, setPaymentUsers] = useState<PaymentUserRecord[]>(initialPaymentUsers);
  const [isPaymentUserModalOpen, setIsPaymentUserModalOpen] = useState(false);
  const [editingPaymentUserId, setEditingPaymentUserId] = useState<string | null>(null);
  const [paymentUserFirstName, setPaymentUserFirstName] = useState('');
  const [paymentUserLastName, setPaymentUserLastName] = useState('');
  const [paymentUserEmail, setPaymentUserEmail] = useState('');
  const [paymentUserPhone, setPaymentUserPhone] = useState('');
  const [paymentUserAccountType, setPaymentUserAccountType] = useState<'Admin' | 'Field' | 'Office' | ''>('');
  
  // Expanded form states
  const [paymentUserGroup, setPaymentUserGroup] = useState('None');
  const [paymentUserAccessNumber, setPaymentUserAccessNumber] = useState('');
  const [paymentUserEmailReceiptsList, setPaymentUserEmailReceiptsList] = useState<string[]>([
    'All Users',
    'Admin Users',
    'Office Users',
    'Field Users',
    'Recurring Payments',
    'This User',
    'None (No Emailed Receipts)'
  ]);
  const [paymentUserCanRefundVoidSelect, setPaymentUserCanRefundVoidSelect] = useState('No');
  const [paymentUserCanManageRecurring, setPaymentUserCanManageRecurring] = useState('No');
  const [paymentUserCanPerformFinancing, setPaymentUserCanPerformFinancing] = useState('Yes');
  const [paymentUserManualCardSelect, setPaymentUserManualCardSelect] = useState('Yes');
  const [paymentUserDisableLogoutTimer, setPaymentUserDisableLogoutTimer] = useState('No');
  const [paymentUserPrimaryUser, setPaymentUserPrimaryUser] = useState('No');
  
  const [isDeletingPaymentUserConfirm, setIsDeletingPaymentUserConfirm] = useState(false);

  const isPaymentUserFormValid = Boolean(
    paymentUserFirstName.trim() &&
    paymentUserLastName.trim() &&
    paymentUserEmail.trim() &&
    paymentUserAccountType &&
    paymentUserEmailReceiptsList.length > 0
  );

  const handleToggleReceiptOption = (option: string) => {
    setPaymentUserEmailReceiptsList((prev) => {
      if (option === 'None (No Emailed Receipts)') {
        if (prev.includes('None (No Emailed Receipts)')) {
          return prev.filter((o) => o !== option);
        } else {
          return ['None (No Emailed Receipts)'];
        }
      } else {
        const withoutNone = prev.filter((o) => o !== 'None (No Emailed Receipts)');
        if (withoutNone.includes(option)) {
          return withoutNone.filter((o) => o !== option);
        } else {
          return [...withoutNone, option];
        }
      }
    });
  };

  const handleOpenAddPaymentUser = () => {
    setEditingPaymentUserId(null);
    setPaymentUserFirstName('');
    setPaymentUserLastName('');
    setPaymentUserEmail('');
    setPaymentUserPhone('');
    setPaymentUserAccountType('');
    setPaymentUserGroup('None');
    setPaymentUserAccessNumber('');
    setPaymentUserEmailReceiptsList([
      'All Users',
      'Admin Users',
      'Office Users',
      'Field Users',
      'Recurring Payments',
      'This User',
      'None (No Emailed Receipts)'
    ]);
    setPaymentUserCanRefundVoidSelect('No');
    setPaymentUserCanManageRecurring('No');
    setPaymentUserCanPerformFinancing('Yes');
    setPaymentUserManualCardSelect('Yes');
    setPaymentUserDisableLogoutTimer('No');
    setPaymentUserPrimaryUser('No');
    setIsDeletingPaymentUserConfirm(false);
    setIsPaymentUserModalOpen(true);
  };

  const handleOpenEditPaymentUser = (u: PaymentUserRecord) => {
    setEditingPaymentUserId(u.id);
    setPaymentUserFirstName(u.firstName);
    setPaymentUserLastName(u.lastName);
    setPaymentUserEmail(u.email);
    setPaymentUserPhone(u.phone || '');
    setPaymentUserAccountType(u.userType);
    setPaymentUserGroup('None');
    setPaymentUserAccessNumber('12345');
    setPaymentUserEmailReceiptsList(
      u.emailReceipts === 'None'
        ? ['None (No Emailed Receipts)']
        : u.emailReceipts === 'Own'
        ? ['This User']
        : ['All Users', 'Admin Users', 'Office Users', 'Field Users', 'Recurring Payments', 'This User']
    );
    setPaymentUserCanRefundVoidSelect(u.canRefundVoid ? 'Yes' : 'No');
    setPaymentUserCanManageRecurring('No');
    setPaymentUserCanPerformFinancing('Yes');
    setPaymentUserManualCardSelect(u.manualCardEntry ? 'Yes' : 'No');
    setPaymentUserDisableLogoutTimer('No');
    setPaymentUserPrimaryUser(u.isMe ? 'Yes' : 'No');
    setIsDeletingPaymentUserConfirm(false);
    setIsPaymentUserModalOpen(true);
  };

  const handleSavePaymentUser = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPaymentUserFormValid) return;

    const accountType = (paymentUserAccountType || 'Field') as 'Admin' | 'Field' | 'Office';
    const computedEmailReceipts: 'None' | 'Own' | 'All' =
      paymentUserEmailReceiptsList.includes('None (No Emailed Receipts)')
        ? 'None'
        : paymentUserEmailReceiptsList.includes('All Users')
        ? 'All'
        : 'Own';

    const canRefund = paymentUserCanRefundVoidSelect === 'Yes';
    const manualCard = paymentUserManualCardSelect === 'Yes';

    if (editingPaymentUserId) {
      setPaymentUsers((prev) =>
        prev.map((u) =>
          u.id === editingPaymentUserId
            ? {
                ...u,
                firstName: paymentUserFirstName.trim(),
                lastName: paymentUserLastName.trim(),
                email: paymentUserEmail.trim(),
                phone: paymentUserPhone.trim(),
                userType: accountType,
                emailReceipts: computedEmailReceipts,
                canRefundVoid: canRefund,
                manualCardEntry: manualCard,
              }
            : u
        )
      );
    } else {
      const newUser: PaymentUserRecord = {
        id: `pu-${Date.now()}`,
        firstName: paymentUserFirstName.trim(),
        lastName: paymentUserLastName.trim(),
        email: paymentUserEmail.trim(),
        phone: paymentUserPhone.trim(),
        userType: accountType,
        emailReceipts: computedEmailReceipts,
        canRefundVoid: canRefund,
        manualCardEntry: manualCard,
      };
      setPaymentUsers((prev) => [...prev, newUser]);
    }

    setIsPaymentUserModalOpen(false);
    setEditingPaymentUserId(null);
    setIsDeletingPaymentUserConfirm(false);
  };

  const handleDeletePaymentUser = () => {
    if (!editingPaymentUserId) return;
    setPaymentUsers((prev) => prev.filter((u) => u.id !== editingPaymentUserId));
    setIsDeletingPaymentUserConfirm(false);
    setIsPaymentUserModalOpen(false);
    setEditingPaymentUserId(null);
  };

  // Business Hours State
  const [weeklyHours, setWeeklyHours] = useState<DaySchedule[]>(initialWeeklyHours);
  const [specialHours, setSpecialHours] = useState<SpecialHourRecord[]>(initialSpecialHours);

  const handleToggleDayClosed = (dayName: string, isClosed: boolean) => {
    setWeeklyHours((prev) =>
      prev.map((d) => (d.day === dayName ? { ...d, isClosed } : d))
    );
  };

  const handleDayTimeChange = (dayName: string, field: 'startTime' | 'endTime', value: string) => {
    setWeeklyHours((prev) =>
      prev.map((d) => (d.day === dayName ? { ...d, [field]: value } : d))
    );
  };

  const handleSpecialHourChange = (
    id: string,
    field: keyof SpecialHourRecord,
    value: any
  ) => {
    setSpecialHours((prev) =>
      prev.map((sh) => (sh.id === id ? { ...sh, [field]: value } : sh))
    );
  };

  const handleAddSpecialHour = () => {
    const newRecord: SpecialHourRecord = {
      id: `sh-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: 'Special Closure',
      startTime: '6:00 am',
      endTime: '11:59 pm',
      isClosed: true,
    };
    setSpecialHours((prev) => [...prev, newRecord]);
  };

  const handleDeleteSpecialHour = (id: string) => {
    setSpecialHours((prev) => prev.filter((sh) => sh.id !== id));
  };

  // Outside click listener for dispatch group overflow menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.group-menu-container')) {
        setActiveGroupMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedMenus((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAccountTypeChange = async (userId: string, newType: 'Admin' | 'Office' | 'Field') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, accountType: newType } : u))
    );
    const existing = liveUsers.find((u) => u.id === userId);
    if (existing) {
      await persistCanonicalUser({
        ...existing,
        permissions: {
          ...existing.permissions,
          accountType: newType,
        },
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleFsmAccessToggle = (userId: string, hasAccess: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, hasFsmAccess: hasAccess } : u))
    );
  };

  const handleToggleDeactivate = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isDeactivated: !u.isDeactivated } : u))
    );
    const existing = liveUsers.find((u) => u.id === userId);
    if (existing) {
      await persistCanonicalUser({
        ...existing,
        isActive: !existing.isActive,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleProfileAccountTypeChange = (type: 'Admin' | 'Office' | 'Field') => {
    if (type === 'Admin') {
      setProfileFormData((prev: any) => ({
        ...prev,
        accountType: 'Admin',
        appointmentVisibility: 'All appointments',
        allCustomerVisibility: true,
        reportingTabVisibility: true,
        moreAppsSettingsVisibility: true,
        manuallyEnterCards: true,
        manageRecurringPayments: true,
        performCreditsVoids: true,
        performFinancingActions: true,
        scheduleEvents: 'Can Schedule All Events',
        editPricesTaxMobile: true,
        taxGroupInvoicesProposals: false,
        createCustomLineItems: true,
        jobPL: true,
      }));
    } else if (type === 'Field') {
      setProfileFormData((prev: any) => ({
        ...prev,
        accountType: 'Field',
        reportingTabVisibility: false,
        moreAppsSettingsVisibility: false,
      }));
    } else {
      setProfileFormData((prev: any) => ({
        ...prev,
        accountType: type,
      }));
    }
  };

  const handleOpenManageUser = (user: UserRecord) => {
    setManagingUser(user);
    setUserProfileTab('details');
    setProfileFormData(getUserProfileFormData(user));
  };

  useEffect(() => {
    const handleOpenProfileEvent = (e: any) => {
      const uId = e?.detail?.userId;
      const uEmail = e?.detail?.email;
      const target = (uId || uEmail)
        ? users.find((u) => (uId && u.id === uId) || (uEmail && u.email.toLowerCase() === uEmail.toLowerCase()))
        : (currentUser
            ? users.find((u) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase())
            : users.find((u) => u.accountType === 'Admin') || users[0]);
      if (target) {
        setActiveSection('users');
        setExpandedMenus((prev) => Array.from(new Set([...prev, 'user-management'])));
        handleOpenManageUser(target);
      }
    };
    window.addEventListener('open-user-profile', handleOpenProfileEvent);
    return () => window.removeEventListener('open-user-profile', handleOpenProfileEvent);
  }, [users, currentUser]);

  useEffect(() => {
    const currentTab = searchParams ? searchParams.get('tab') : null;
    const userId = searchParams ? (searchParams.get('userId') || searchParams.get('user')) : null;
    const isProfile = searchParams ? (searchParams.get('profile') || currentTab === 'profile' || currentTab === 'user-profile') : null;

    if (isProfile || (currentTab === 'users' && (userId || isProfile))) {
      setActiveSection('users');
      setExpandedMenus((prev) => Array.from(new Set([...prev, 'user-management'])));
      const targetUser = userId 
        ? users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) 
        : (currentUser
            ? users.find((u) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase())
            : users.find((u) => u.accountType === 'Admin') || users[0]);
      if (targetUser) {
        handleOpenManageUser(targetUser);
      }
    } else if (currentTab) {
      setActiveSection(currentTab);
      for (const menu of sidebarMenu) {
        if (menu.children && menu.children.some((c) => c.id === currentTab)) {
          setExpandedMenus((prev) => Array.from(new Set([...prev, menu.id])));
        }
      }
      if (currentTab === 'users' && !userId && !isProfile) {
        setManagingUser(null);
      }
    }
  }, [searchParams ? searchParams.toString() : '', users, currentUser]);

  const handleSaveUserProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!managingUser) return;

    const firstName = profileFormData.firstName?.trim() || '';
    const lastName = profileFormData.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim() || profileFormData.name || 'User';
    const isField = profileFormData.accountType === 'Field';
    const isAdmin = profileFormData.accountType === 'Admin';
    const defaultInit = ((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase() || 'US';
    let userInitials = profileFormData.initials ? String(profileFormData.initials).replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() : defaultInit;
    if (userInitials.length < 2) userInitials = defaultInit;
    
    const rawType = (profileFormData.accountType || 'Field').toString().toLowerCase();
    const normalizedAccountType: 'admin' | 'office' | 'field' = rawType.includes('admin') ? 'admin' : rawType.includes('office') ? 'office' : 'field';
    const roleString: 'Admin' | 'Office' | 'Field' = normalizedAccountType === 'admin' ? 'Admin' : normalizedAccountType === 'office' ? 'Office' : 'Field';

    const canonicalPayload: CanonicalUser = {
      id: managingUser.id,
      uid: managingUser.id,
      firstName,
      lastName,
      displayName: fullName,
      name: fullName,
      initials: userInitials,
      email: profileFormData.email?.trim() || '',
      mobilePhone: profileFormData.mobilePhone || '',
      homePhone: profileFormData.homePhone || '',
      accessNumber: profileFormData.accessCode || '',
      techSkillLevel: profileFormData.techSkillLevel || '2 (Veteran)',
      dispatchGroups: Array.isArray(profileFormData.dispatchGroups) ? profileFormData.dispatchGroups : ['Appliance Techs'],
      isActive: !profileFormData.isDeactivated,
      accountType: normalizedAccountType,
      role: roleString,
      deviceProfile: {
        mapsPreference: profileFormData.mapsPreference || 'Apple Maps',
        appTheme: profileFormData.appTheme || 'System',
      },
      permissions: {
        accountType: roleString,
        appointmentVisibility: profileFormData.appointmentVisibility || 'All appointments',
        allCustomerVisibility: profileFormData.allCustomerVisibility !== undefined ? Boolean(profileFormData.allCustomerVisibility) : true,
        reportingTabVisibility: isField ? false : (profileFormData.reportingTabVisibility !== undefined ? Boolean(profileFormData.reportingTabVisibility) : (isAdmin ? true : false)),
        moreAppsAndSettingsVisibility: isField ? false : (profileFormData.moreAppsSettingsVisibility !== undefined ? Boolean(profileFormData.moreAppsSettingsVisibility) : (isAdmin ? true : false)),
        manuallyEnterCards: profileFormData.manuallyEnterCards !== undefined ? Boolean(profileFormData.manuallyEnterCards) : true,
        manageRecurringPayments: profileFormData.manageRecurringPayments !== undefined ? Boolean(profileFormData.manageRecurringPayments) : (isAdmin ? true : false),
        performCreditsAndVoids: profileFormData.performCreditsVoids !== undefined ? Boolean(profileFormData.performCreditsVoids) : true,
        performFinancingActions: profileFormData.performFinancingActions !== undefined ? Boolean(profileFormData.performFinancingActions) : true,
        receiptCopyRecipients: Array.isArray(profileFormData.copiesReceipts) ? profileFormData.copiesReceipts : ['This User'],
        scheduleEventsPermission: profileFormData.scheduleEvents || 'Can Schedule All Events',
        editPricesAndTaxOnMobile: profileFormData.editPricesTaxMobile !== undefined ? Boolean(profileFormData.editPricesTaxMobile) : true,
        createCustomLineItems: profileFormData.createCustomLineItems !== undefined ? Boolean(profileFormData.createCustomLineItems) : true,
        viewJobPnL: profileFormData.jobPL !== undefined ? Boolean(profileFormData.jobPL) : true,
      },
      currentShiftId: null,
      clockStatus: managingUser.status === 'Clocked In' ? 'Clocked In' : 'Clocked Out',
      lastActiveAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistCanonicalUser(canonicalPayload);

    const userRecord = canonicalToUserRecord(canonicalPayload);
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === managingUser.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = userRecord;
        return updated;
      }
      return [...prev, userRecord];
    });
    setManagingUser(userRecord);

    setProfileSavedFeedback(true);
    setTimeout(() => setProfileSavedFeedback(false), 2000);
  };

  const handleToggleProfileDeactivate = async () => {
    const nextDeactivated = !profileFormData.isDeactivated;
    setProfileFormData((prev: any) => ({
      ...prev,
      isDeactivated: nextDeactivated,
    }));

    if (managingUser) {
      const firstName = profileFormData.firstName?.trim() || '';
      const lastName = profileFormData.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim() || profileFormData.name || 'User';
      const isField = profileFormData.accountType === 'Field';
      const isAdmin = profileFormData.accountType === 'Admin';
      const defaultInit = ((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase() || 'US';
      let userInitials = profileFormData.initials ? String(profileFormData.initials).replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() : defaultInit;
      if (userInitials.length < 2) userInitials = defaultInit;

      const canonicalPayload: CanonicalUser = {
        id: managingUser.id,
        firstName,
        lastName,
        displayName: fullName,
        name: fullName,
        initials: userInitials,
        email: profileFormData.email?.trim() || '',
        mobilePhone: profileFormData.mobilePhone || '',
        homePhone: profileFormData.homePhone || '',
        accessNumber: profileFormData.accessCode || '',
        techSkillLevel: profileFormData.techSkillLevel || '',
        dispatchGroups: Array.isArray(profileFormData.dispatchGroups) ? profileFormData.dispatchGroups : [],
        isActive: !nextDeactivated,
        deviceProfile: {
          mapsPreference: profileFormData.mapsPreference || 'Apple Maps',
          appTheme: profileFormData.appTheme || 'System',
        },
        permissions: {
          accountType: profileFormData.accountType || 'Field',
          appointmentVisibility: profileFormData.appointmentVisibility || 'All appointments',
          allCustomerVisibility: profileFormData.allCustomerVisibility !== undefined ? Boolean(profileFormData.allCustomerVisibility) : true,
          reportingTabVisibility: isField ? false : (profileFormData.reportingTabVisibility !== undefined ? Boolean(profileFormData.reportingTabVisibility) : (isAdmin ? true : false)),
          moreAppsAndSettingsVisibility: isField ? false : (profileFormData.moreAppsSettingsVisibility !== undefined ? Boolean(profileFormData.moreAppsSettingsVisibility) : (isAdmin ? true : false)),
          manuallyEnterCards: profileFormData.manuallyEnterCards !== undefined ? Boolean(profileFormData.manuallyEnterCards) : true,
          manageRecurringPayments: profileFormData.manageRecurringPayments !== undefined ? Boolean(profileFormData.manageRecurringPayments) : (isAdmin ? true : false),
          performCreditsAndVoids: profileFormData.performCreditsVoids !== undefined ? Boolean(profileFormData.performCreditsVoids) : true,
          performFinancingActions: profileFormData.performFinancingActions !== undefined ? Boolean(profileFormData.performFinancingActions) : true,
          receiptCopyRecipients: Array.isArray(profileFormData.copiesReceipts) ? profileFormData.copiesReceipts : ['This User'],
          scheduleEventsPermission: profileFormData.scheduleEvents || 'Can Schedule All Events',
          editPricesAndTaxOnMobile: profileFormData.editPricesTaxMobile !== undefined ? Boolean(profileFormData.editPricesTaxMobile) : true,
          createCustomLineItems: profileFormData.createCustomLineItems !== undefined ? Boolean(profileFormData.createCustomLineItems) : true,
          viewJobPnL: profileFormData.jobPL !== undefined ? Boolean(profileFormData.jobPL) : true,
        },
        currentShiftId: null,
        clockStatus: managingUser.status === 'Clocked In' ? 'Clocked In' : 'Clocked Out',
        lastActiveAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await persistCanonicalUser(canonicalPayload);
      const userRecord = canonicalToUserRecord(canonicalPayload);
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === managingUser.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = userRecord;
          return updated;
        }
        return [...prev, userRecord];
      });
      setManagingUser(userRecord);
    }
  };

  const handleOpenAddUser = () => {
    const blankUser: UserRecord = {
      id: `usr-${Date.now()}`,
      name: '',
      firstName: '',
      lastName: '',
      initials: '',
      email: '',
      status: 'Clocked Out',
      accountType: 'Field',
      hasFsmAccess: true,
      laborCostHr: 'N/A',
      isDeactivated: false,
      accessCode: '',
      homePhone: '',
      mobilePhone: '',
      techSkillLevel: '',
      dispatchGroups: [],
      mapsPreference: 'Apple Maps',
      appTheme: 'System',
      appointmentVisibility: 'All appointments',
      allCustomerVisibility: true,
      reportingTabVisibility: false,
      moreAppsSettingsVisibility: false,
      manuallyEnterCards: true,
      manageRecurringPayments: false,
      performCreditsVoids: true,
      performFinancingActions: true,
      copiesReceipts: ['This User'],
      scheduleEvents: 'Can Schedule All Events',
      editPricesTaxMobile: true,
      taxGroupInvoicesProposals: false,
      createCustomLineItems: true,
      jobPL: true,
    };

    setManagingUser(blankUser);
    setProfileFormData(getUserProfileFormData(blankUser));
    setUserProfileTab('details');
    setActiveSection('users');
  };

  // Open Modal for Adding New Group
  const handleOpenAddGroupModal = () => {
    setEditingGroupId(null);
    setNewGroupName('');
    setSelectedGroupMembers([]);
    setIsAddGroupModalOpen(true);
    setActiveGroupMenuId(null);
  };

  // Open Modal for Editing Existing Group
  const handleOpenEditGroupModal = (group: DispatchGroupRecord) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
    setSelectedGroupMembers([...group.members]);
    setIsAddGroupModalOpen(true);
    setActiveGroupMenuId(null);
  };

  // Submit Handler for Add / Edit Dispatch Group
  const handleSaveDispatchGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const groupPayload: CanonicalDispatchGroup = {
      id: editingGroupId || `dg-${Date.now()}`,
      name: newGroupName.trim(),
      members: selectedGroupMembers,
      updatedAt: new Date().toISOString(),
      ...(editingGroupId ? {} : { createdAt: new Date().toISOString() }),
    };

    await persistCanonicalGroup(groupPayload);

    // Sync each affected user's dispatchGroups in Firestore
    for (const u of users) {
      const uName = u.name;
      const isMember = selectedGroupMembers.includes(uName);
      const currentGroups = u.dispatchGroups || [];
      const hasGroup = currentGroups.includes(groupPayload.name);

      let newGroups = [...currentGroups];
      if (isMember && !hasGroup) {
        newGroups.push(groupPayload.name);
      } else if (!isMember && hasGroup) {
        newGroups = newGroups.filter((g) => g !== groupPayload.name);
      }

      if (JSON.stringify(newGroups) !== JSON.stringify(currentGroups)) {
        await persistCanonicalUser({
          ...u,
          dispatchGroups: newGroups,
        } as any);
      }
    }

    if (editingGroupId) {
      setDispatchGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroupId
            ? { ...g, name: newGroupName.trim(), members: selectedGroupMembers }
            : g
        )
      );
    } else {
      setDispatchGroups((prev) => [...prev, groupPayload]);
    }

    setNewGroupName('');
    setSelectedGroupMembers([]);
    setEditingGroupId(null);
    setIsAddGroupModalOpen(false);
  };

  // Delete Group Handler with Warning Confirmation
  const handleDeleteGroupWithWarning = async (group: DispatchGroupRecord) => {
    setActiveGroupMenuId(null);
    if (confirm(`Are you sure you want to delete the dispatch group "${group.name}"? This action cannot be undone.`)) {
      await deleteCanonicalGroup(group.id);
      setDispatchGroups((prev) => prev.filter((g) => g.id !== group.id));

      // Remove from users
      for (const u of users) {
        if (u.dispatchGroups && u.dispatchGroups.includes(group.name)) {
          await persistCanonicalUser({
            ...u,
            dispatchGroups: u.dispatchGroups.filter((g) => g !== group.name),
          } as any);
        }
      }
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const lastA = (a.lastName || a.name.split(' ').slice(1).join(' ') || a.name).trim().toLowerCase();
      const lastB = (b.lastName || b.name.split(' ').slice(1).join(' ') || b.name).trim().toLowerCase();
      if (lastA !== lastB) return lastA.localeCompare(lastB);
      const firstA = (a.firstName || a.name.split(' ')[0] || '').trim().toLowerCase();
      const firstB = (b.firstName || b.name.split(' ')[0] || '').trim().toLowerCase();
      return firstA.localeCompare(firstB);
    });
  }, [users]);

  const filteredUsers = sortedUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const activeAccessCount = users.filter((u) => u.hasFsmAccess && !u.isDeactivated).length;

  return (
    <div className="w-full space-y-5 text-slate-800 pb-12 font-sans">
      {/* 1. Page Header */}
      <PageHeader title="Settings" />

      {/* 2. Main 2-Column Settings Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sidebar Menu */}
        <div className="w-full md:w-64 bg-white rounded-lg border border-slate-200 p-2 space-y-1 shrink-0 shadow-xs">
          {sidebarMenu.map((item) => {
            const isExpanded = expandedMenus.includes(item.id);
            const hasChildren = Boolean(item.hasChildren && item.children && item.children.length > 0);
            const hasActiveChild = Boolean(hasChildren && item.children!.some((c) => c.id === activeSection));

            // Standalone options without children are highlighted when activeSection === item.id.
            // Parents with children are ONLY highlighted when collapsed (!isExpanded) while their subcategory is chosen.
            const isActive = hasChildren 
              ? (hasActiveChild && !isExpanded)
              : (activeSection === item.id);

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(item.id);
                      // Only expand/collapse without auto-selecting first child
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-200 text-slate-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{item.label}</span>
                  {hasChildren && (
                    <span className="text-slate-400 font-bold ml-2">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </span>
                  )}
                </button>

                {/* Submenu Children */}
                {hasChildren && isExpanded && item.children && (
                  <div className="pl-4 space-y-0.5 border-l border-slate-200 ml-3 my-1">
                    {item.children.map((child) => {
                      const isCurrentChildActive = activeSection === child.id;
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setActiveSection(child.id)}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer ${
                            isCurrentChildActive
                              ? 'bg-slate-200 text-slate-900 font-bold'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Content Panel (Toolbar stripped out as requested) */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 shadow-xs w-full">
          {activeSection === 'accounting' ? (
            /* ======================================================================== */
            /* ACCOUNTING & TAXES SETTINGS (TOOLBAR REMOVED)                            */
            /* ======================================================================== */
            <div className="space-y-5 max-w-2xl text-xs text-slate-700">
              <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
                Accounting &amp; Taxes
              </h2>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Company Legal Entity Name
                </label>
                <Input defaultValue="Apex Field Solutions LLC" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Default Sales Tax Rate (%)
                  </label>
                  <Input defaultValue="7.00%" />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Federal Employer ID (EIN)
                  </label>
                  <Input defaultValue="XX-XXXX850" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Default Revenue / Income Account
                  </label>
                  <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium">
                    <option>Services &gt; HVAC &amp; Appliance Revenue</option>
                    <option>Services &gt; Maintenance Agreements</option>
                    <option>Parts &gt; Direct Retail Sales</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Default Expense Account
                  </label>
                  <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium">
                    <option>Cost of Goods Sold &gt; Parts &amp; Equipment</option>
                    <option>Cost of Goods Sold &gt; Subcontractor Labor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Default Payment Terms
                  </label>
                  <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium">
                    <option>Due Upon Receipt</option>
                    <option>Net 15 Days</option>
                    <option>Net 30 Days</option>
                    <option>Net 60 Days</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Default Currency
                  </label>
                  <Input defaultValue="USD ($)" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Tax Exemption / Resale Certificate Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
                  defaultValue="Florida sales tax exempt certificate on file for approved commercial property accounts."
                />
              </div>
            </div>
          ) : activeSection === 'appointment-notifications' ? (
            /* ======================================================================== */
            /* APPOINTMENT NOTIFICATIONS SETTINGS (MATCHING SCREENSHOT)                 */
            /* ======================================================================== */
            <div className="space-y-8 text-xs text-slate-800">
              <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
                Appointment Notifications
              </h2>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  Default appointment notifications
                </h3>

                <div className="flex flex-wrap items-center gap-8 sm:gap-14 pt-1">
                  {/* 1. Scheduled */}
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-xs font-bold text-slate-700">Scheduled</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAppointmentNotifications((prev) => ({
                          ...prev,
                          scheduled: !prev.scheduled,
                        }))
                      }
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 focus:outline-none ${
                        appointmentNotifications.scheduled ? 'bg-[#5fa8d3]' : 'bg-[#6b7280]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 absolute top-1 left-1 ${
                          appointmentNotifications.scheduled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 2. 1 Week Prior */}
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-xs font-bold text-slate-700">1 Week Prior</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAppointmentNotifications((prev) => ({
                          ...prev,
                          oneWeekPrior: !prev.oneWeekPrior,
                        }))
                      }
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 focus:outline-none ${
                        appointmentNotifications.oneWeekPrior ? 'bg-[#5fa8d3]' : 'bg-[#6b7280]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 absolute top-1 left-1 ${
                          appointmentNotifications.oneWeekPrior ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 3. 1 Day Prior */}
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-xs font-bold text-slate-700">1 Day Prior</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAppointmentNotifications((prev) => ({
                          ...prev,
                          oneDayPrior: !prev.oneDayPrior,
                        }))
                      }
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 focus:outline-none ${
                        appointmentNotifications.oneDayPrior ? 'bg-[#5fa8d3]' : 'bg-[#6b7280]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 absolute top-1 left-1 ${
                          appointmentNotifications.oneDayPrior ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 4. En Route */}
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-xs font-bold text-slate-700">En Route</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAppointmentNotifications((prev) => ({
                          ...prev,
                          enRoute: !prev.enRoute,
                        }))
                      }
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 focus:outline-none ${
                        appointmentNotifications.enRoute ? 'bg-[#5fa8d3]' : 'bg-[#6b7280]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 absolute top-1 left-1 ${
                          appointmentNotifications.enRoute ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button aligned to bottom right */}
              <div className="flex justify-end pt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsSavedFeedback(true);
                    setTimeout(() => setIsSavedFeedback(false), 2000);
                  }}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-medium px-8 py-1.5 rounded text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  {isSavedFeedback ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>
          ) : activeSection === 'business-hours' ? (
            /* ======================================================================== */
            /* BUSINESS HOURS SETTINGS                                                  */
            /* ======================================================================== */
            <div className="space-y-6 text-xs text-slate-800">
              {/* Business Hours Section Title */}
              <div className="space-y-1.5 max-w-2xl">
                <h3 className="text-base font-bold text-[#2e4057]">Business Hours</h3>

                {/* Standard Hours Table */}
                <div className="space-y-2">
                  {/* Table Header with Closed? right next to hours */}
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                    <span className="w-24 sm:w-28"></span>
                    <span className="w-64 sm:w-72"></span>
                    <span className="w-16 text-center">Closed?</span>
                  </div>

                  {/* Days List */}
                  {weeklyHours.map((schedule) => (
                    <div key={schedule.day} className="flex items-center gap-4 text-xs py-1">
                      <span className="w-24 sm:w-28 font-medium text-slate-700">{schedule.day}</span>
                      <div className="flex items-center gap-2 w-64 sm:w-72">
                        {schedule.isClosed ? (
                          <span className="text-slate-400 italic py-1">Closed</span>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={schedule.startTime}
                              onChange={(e) => handleDayTimeChange(schedule.day, 'startTime', e.target.value)}
                              className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 text-center focus:outline-none"
                            />
                            <span className="text-slate-400 font-bold">-</span>
                            <input
                              type="text"
                              value={schedule.endTime}
                              onChange={(e) => handleDayTimeChange(schedule.day, 'endTime', e.target.value)}
                              className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 text-center focus:outline-none"
                            />
                          </>
                        )}
                      </div>
                      <div className="w-16 flex justify-center">
                        <input
                          type="checkbox"
                          checked={schedule.isClosed}
                          onChange={(e) => handleToggleDayClosed(schedule.day, e.target.checked)}
                          className="w-4 h-4 rounded text-[#be4646] focus:ring-[#be4646] cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Hours Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200 max-w-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Special / Holiday Hours</h4>
                  <button
                    type="button"
                    onClick={handleAddSpecialHour}
                    className="text-[#be4646] hover:text-[#a63a3a] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Special Date</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {specialHours.map((row) => (
                    <div key={row.id} className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleSpecialHourChange(row.id, 'description', e.target.value)}
                          className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none font-medium"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleSpecialHourChange(row.id, 'date', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="w-48 flex items-center gap-1.5">
                        {row.isClosed ? (
                          <span className="text-slate-500 italic px-2">Closed All Day</span>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={row.startTime}
                              onChange={(e) => handleSpecialHourChange(row.id, 'startTime', e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 text-center focus:outline-none"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                              type="text"
                              value={row.endTime}
                              onChange={(e) => handleSpecialHourChange(row.id, 'endTime', e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 text-center focus:outline-none"
                            />
                          </>
                        )}
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.isClosed}
                          onChange={(e) => handleSpecialHourChange(row.id, 'isClosed', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[#be4646] focus:ring-[#be4646]"
                        />
                        <span>Closed</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteSpecialHour(row.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Centered Save Button */}
              <div className="flex justify-center pt-8 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSavedFeedback(true);
                    setTimeout(() => setIsSavedFeedback(false), 2000);
                  }}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-medium px-12 py-2 rounded text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  {isSavedFeedback ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>
          ) : activeSection === 'customer-preferences' ? (
            /* ======================================================================== */
            /* CUSTOMER PREFERENCES SETTINGS (MATCHING SCREENSHOT)                      */
            /* ======================================================================== */
            <div className="space-y-6 text-xs text-slate-800">
              <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
                Customer Preferences
              </h2>

              {/* 1. Auto-generate Customer Number */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span>Auto-generate Customer Number</span>
                  <button
                    type="button"
                    title="When enabled, new customer records will automatically be assigned sequential customer numbers."
                    className="text-slate-500 hover:text-slate-700 inline-flex items-center cursor-help"
                  >
                    <Info className="w-3.5 h-3.5 fill-slate-500 text-white" />
                  </button>
                </div>

                {/* Toggle switch (sky blue when active) */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoGenCustomerNumber}
                    onClick={() => setAutoGenCustomerNumber((prev) => !prev)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                      autoGenCustomerNumber ? 'bg-[#5fa8d3]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                        autoGenCustomerNumber ? 'translate-x-5.5' : 'translate-x-0.5'
                      } top-0.5`}
                    />
                  </button>
                </div>
              </div>

              {/* 2. Starting Customer Number Point */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span>Starting Customer Number Point</span>
                  <button
                    type="button"
                    title="The starting number for auto-generated customer IDs."
                    className="text-slate-500 hover:text-slate-700 inline-flex items-center cursor-help"
                  >
                    <Info className="w-3.5 h-3.5 fill-slate-500 text-white" />
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    value={startingCustomerNumber}
                    onChange={(e) => setStartingCustomerNumber(e.target.value)}
                    disabled={!autoGenCustomerNumber}
                    className="w-48 sm:w-56 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 3. QuickBooks Customer Name Format */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  QuickBooks Customer Name Format
                </label>
                <div>
                  <select
                    value={qbCustomerNameFormat}
                    onChange={(e) => setQbCustomerNameFormat(e.target.value)}
                    className="w-80 sm:w-96 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="Last, First / Business Name">Last, First / Business Name</option>
                    <option value="First Last / Business Name">First Last / Business Name</option>
                    <option value="Business Name / Last, First">Business Name / Last, First</option>
                    <option value="Business Name / First Last">Business Name / First Last</option>
                  </select>
                </div>
              </div>

              {/* Bottom Right Save Button */}
              <div className="flex justify-end pt-24">
                <button
                  type="button"
                  onClick={() => {
                    setIsSavedFeedback(true);
                    setTimeout(() => setIsSavedFeedback(false), 2000);
                  }}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-medium px-8 py-2 rounded text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  {isSavedFeedback ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>
          ) : activeSection === 'referral-list' ? (
            /* ======================================================================== */
            /* REFERRAL LIST SETTINGS                                                  */
            /* ======================================================================== */
            <div className="space-y-4 text-xs text-slate-800">
              {/* Header with Title and Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">
                  Referral List
                </h2>
                <button
                  type="button"
                  onClick={handleOpenAddReferral}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Referral Source</span>
                </button>
              </div>

              {/* Table Container */}
              <div className="border-b border-slate-200">
                <div className="py-2 px-1 border-b border-slate-200 font-bold text-slate-700">
                  Name
                </div>

                {/* Rows - No hover effects, clickable names to edit */}
                <div className="divide-y divide-slate-100">
                  {referralSources.map((source) => (
                    <div
                      key={source.id}
                      className="py-2.5 px-1 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEditReferral(source)}
                        className="text-[#a63a3a] hover:underline font-medium text-left cursor-pointer transition-colors"
                      >
                        {source.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeSection === 'contract-terms' ? (
            /* ======================================================================== */
            /* CONTRACT TERMS SETTINGS (MATCHING SCREENSHOT 1)                          */
            /* ======================================================================== */
            <div className="space-y-4 text-xs text-slate-800">
              {/* Header with Title and Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">
                  Contract Terms
                </h2>
                <button
                  type="button"
                  onClick={handleOpenCreateTerm}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Terms</span>
                </button>
              </div>

              {/* Table Container */}
              <div className="border-b border-slate-200">
                <div className="py-2 px-1 border-b border-slate-200 font-bold text-slate-700">
                  Name
                </div>

                {/* Rows - No hover effects, clickable names to edit */}
                <div className="divide-y divide-slate-100">
                  {contractTerms.map((term) => (
                    <div
                      key={term.id}
                      className="py-2.5 px-1 text-xs grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-2 sm:gap-6 items-baseline"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEditTerm(term)}
                        className="text-[#a63a3a] hover:underline font-medium text-left cursor-pointer transition-colors"
                      >
                        {term.name}
                      </button>
                      <div className="text-slate-600 line-clamp-1 truncate">
                        {term.description || 'No description provided.'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeSection === 'job-types' ? (
            /* ======================================================================== */
            /* JOB TYPES SETTINGS (MATCHING SCREENSHOT 2)                               */
            /* ======================================================================== */
            <div className="space-y-4 text-xs text-slate-800">
              {/* Header with Title and Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">
                  Job Types
                </h2>
                <button
                  type="button"
                  onClick={handleOpenAddJobType}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Job Type</span>
                </button>
              </div>

              {/* Table Container */}
              <div className="border-b border-slate-200">
                {/* Table Header: Color on Left, Name on Right */}
                <div className="grid grid-cols-[48px_1fr] py-2 px-1 border-b border-slate-200 font-bold text-slate-700 items-center">
                  <span>Color</span>
                  <span>Name</span>
                </div>

                {/* Rows - No hover effects, clickable names to edit */}
                <div className="divide-y divide-slate-100">
                  {jobTypes.map((jt) => (
                    <div
                      key={jt.id}
                      className="py-2.5 px-1 text-xs grid grid-cols-[48px_1fr] items-center"
                    >
                      <div className="flex items-center">
                        <span
                          className="w-3.5 h-3.5 rounded-[3px] border border-black/15 shadow-2xs inline-block shrink-0"
                          style={{ backgroundColor: jt.color }}
                        />
                      </div>

                      <div className="flex items-center gap-2 leading-none">
                        <button
                          type="button"
                          onClick={() => handleOpenEditJobType(jt)}
                          className="text-[#a63a3a] hover:underline font-medium text-left cursor-pointer transition-colors leading-none"
                        >
                          {jt.name}
                        </button>
                        {jt.isDefault && (
                          <span className="px-1.5 py-0.5 bg-[#e0f2fe] text-[#0284c7] text-[9px] font-bold rounded tracking-wider border border-[#bae6fd] leading-none">
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeSection === 'payment-terms' ? (
            /* ======================================================================== */
            /* PAYMENT TERMS SETTINGS (MATCHING SCREENSHOT 1)                           */
            /* ======================================================================== */
            <div className="space-y-4 text-xs text-slate-800">
              {/* Header with Title and Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">
                  Payment Terms
                </h2>
                <button
                  type="button"
                  onClick={handleOpenAddPaymentTerm}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Payment Terms</span>
                </button>
              </div>

              {/* Table Container */}
              <div className="border-b border-slate-200">
                {/* Table Header: Name, Days, Auto-Sync Status */}
                <div className="grid grid-cols-[minmax(200px,44%)_minmax(120px,22%)_1fr] py-2 px-1 border-b border-slate-200 font-bold text-slate-700 items-center">
                  <span>Name</span>
                  <span>Days</span>
                  <span>Auto-Sync Status</span>
                </div>

                {/* Rows - No hover effects, clickable names to edit */}
                <div className="divide-y divide-slate-100">
                  {paymentTerms.map((pt) => (
                    <div
                      key={pt.id}
                      className="py-2.5 px-1 text-xs grid grid-cols-[minmax(200px,44%)_minmax(120px,22%)_1fr] items-center"
                    >
                      {/* Name column */}
                      <div className="flex items-center gap-2 leading-none">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPaymentTerm(pt)}
                          className="text-[#a63a3a] hover:underline font-medium text-left cursor-pointer transition-colors leading-none"
                        >
                          {pt.name}
                        </button>
                        {pt.isDefault && (
                          <span className="px-1.5 py-0.5 bg-[#e0f2fe] text-[#0284c7] text-[9px] font-bold rounded tracking-wider border border-[#bae6fd] leading-none">
                            DEFAULT
                          </span>
                        )}
                      </div>

                      {/* Days column */}
                      <div className="text-slate-700 font-normal">
                        {pt.days} days
                      </div>

                      {/* Auto-Sync Status column */}
                      <div>
                        {pt.autoSyncStatus === 'Error' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#e8a838] text-white">
                            <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                            <span>Error</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#70b04a] text-white">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Synced</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeSection === 'payment-options' ? (
            /* ======================================================================== */
            /* PAYMENT OPTIONS (MATCHING SCREENSHOT 1)                                   */
            /* ======================================================================== */
            <div className="space-y-4 text-xs text-slate-800">
              {/* Header with Title and Button (Matching Screenshot 1) */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">
                  Payment Options
                </h2>
                <button
                  type="button"
                  onClick={handleOpenAddPaymentUser}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add User</span>
                </button>
              </div>

              {/* Table Container */}
              <div className="border-b border-slate-200 overflow-x-auto">
                {/* Table Header: Name, Email Address, User Type, Email Receipts, Can Perform Refunds/Voids?, Manual Card Entry? */}
                <div className="grid grid-cols-[1.3fr_2fr_0.9fr_1fr_1.3fr_1.1fr] min-w-[760px] py-2 px-1 border-b border-slate-200 font-bold text-slate-700 items-center">
                  <span>Name</span>
                  <span>Email Address</span>
                  <span>User Type</span>
                  <span>Email Receipts</span>
                  <span>Can Perform Refunds/Voids?</span>
                  <span>Manual Card Entry?</span>
                </div>

                {/* Rows - No hover effects, clickable names to edit */}
                <div className="divide-y divide-slate-100 min-w-[760px]">
                  {paymentUsers.map((u) => (
                    <div
                      key={u.id}
                      className="py-2.5 px-1 text-xs grid grid-cols-[1.3fr_2fr_0.9fr_1fr_1.3fr_1.1fr] items-center"
                    >
                      {/* Name */}
                      <div className="flex items-center gap-1 leading-none">
                        {u.isMe && (
                          <span className="text-slate-400 font-normal text-xs mr-0.5">
                            (Me)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditPaymentUser(u)}
                          className="text-[#a63a3a] hover:underline font-medium text-left cursor-pointer transition-colors leading-none"
                        >
                          {u.firstName} {u.lastName}
                        </button>
                      </div>

                      {/* Email Address */}
                      <div className="flex flex-col pr-2">
                        <span className="text-slate-700">{u.email}</span>
                        {u.isPendingRegistration && (
                          <span className="text-red-500 italic text-[10px] leading-tight">
                            (pending registration)
                          </span>
                        )}
                      </div>

                      {/* User Type */}
                      <div className="text-slate-700 font-normal">
                        {u.userType}
                      </div>

                      {/* Email Receipts */}
                      <div className="text-slate-700 font-normal">
                        {u.emailReceipts}
                      </div>

                      {/* Can Perform Refunds/Voids? */}
                      <div className="text-slate-700 font-normal">
                        {u.canRefundVoid ? 'Yes' : 'No'}
                      </div>

                      {/* Manual Card Entry? */}
                      <div className="text-slate-700 font-normal">
                        {u.manualCardEntry ? 'Yes' : 'No'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeSection === 'users' ? (
            /* ======================================================================== */
            /* USERS PAGE & USER PROFILE MANAGEMENT                                     */
            /* ======================================================================== */
            managingUser ? (
              /* ====================================================================== */
              /* MANAGE USER PROFILE VIEW                                               */
              /* ====================================================================== */
              <div className="space-y-6 text-xs text-slate-800">
                {/* Top Header & Breadcrumb: < Users / [User Name] */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5 text-base font-bold text-slate-800">
                    <button
                      type="button"
                      onClick={() => setManagingUser(null)}
                      className="text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Users</span>
                    </button>
                    <span className="text-slate-300 font-normal">/</span>
                    <span className="text-slate-900 font-bold">
                      {profileFormData.firstName || profileFormData.lastName ? `${profileFormData.firstName} ${profileFormData.lastName}`.trim() : 'New User'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManagingUser(null)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Back to Users List
                  </button>
                </div>

                {/* Main Form Content - Elegant Full Width */}
                <div className="space-y-6">
                  {/* 1. DETAILS SECTION */}
                  <div>
                    <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
                      Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 text-xs">
                      {/* First Name */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileFormData.firstName || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, firstName: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>

                      {/* Last Name */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileFormData.lastName || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, lastName: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={profileFormData.email || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>

                      {/* User Initials (Replaces Primary Business User) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block font-bold text-slate-700">
                            User Initials
                          </label>
                          <span className="text-[10px] text-slate-500 italic">2-4 letters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            value={profileFormData.initials || ''}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
                              setProfileFormData({ ...profileFormData, initials: cleaned });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <div className="w-8 h-8 rounded-full bg-[#be4646] text-white flex items-center justify-center font-bold shadow-xs shrink-0" title="Profile picture preview">
                            <span className={getInitialsFontSizeClass(profileFormData.initials || '')}>
                              {profileFormData.initials || ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Phone (Switched with Access #) */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Mobile Phone
                        </label>
                        <input
                          type="tel"
                          value={profileFormData.mobilePhone || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, mobilePhone: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* Home Phone */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Home Phone
                        </label>
                        <input
                          type="tel"
                          value={profileFormData.homePhone || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, homePhone: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* Access # (Switched with Mobile Phone) */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Access #
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          value={profileFormData.accessCode || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                            setProfileFormData({ ...profileFormData, accessCode: val });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>

                      {/* Tech Skill Level */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Tech Skill Level
                        </label>
                        <select
                          value={profileFormData.techSkillLevel || '2 (Veteran)'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, techSkillLevel: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="1 (Novice)">1 (Novice)</option>
                          <option value="2 (Veteran)">2 (Veteran)</option>
                          <option value="3 (Master)">3 (Master)</option>
                        </select>
                      </div>

                      {/* Assign User to Dispatch Group(s) - Full Width */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="block font-bold text-slate-700">
                          Assign User to Dispatch Group(s)
                        </label>
                        <div className="min-h-[42px] p-2 bg-white border border-slate-300 rounded flex flex-wrap items-center gap-2">
                          {(profileFormData.dispatchGroups || []).map((groupName: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium"
                            >
                              <span>{groupName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (profileFormData.dispatchGroups || []).filter((g: string) => g !== groupName);
                                  setProfileFormData({ ...profileFormData, dispatchGroups: updated });
                                }}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value && !profileFormData.dispatchGroups?.includes(e.target.value)) {
                                setProfileFormData({
                                  ...profileFormData,
                                  dispatchGroups: [...(profileFormData.dispatchGroups || []), e.target.value],
                                });
                              }
                            }}
                            className="text-xs text-slate-500 bg-transparent border-none focus:outline-none cursor-pointer py-1"
                          >
                            <option value="" disabled>+ Add to group...</option>
                            {dispatchGroups.map((dg) => (
                              <option key={dg.id} value={dg.name} disabled={profileFormData.dispatchGroups?.includes(dg.name)}>
                                {dg.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. PERMISSIONS SECTION */}
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
                      Permissions
                    </h3>

                    {/* Account Type Toggle */}
                    <div className="space-y-2 pt-4">
                      <div className="flex items-center gap-1 font-bold text-slate-700 text-xs">
                        <span>Account Type</span>
                        <div className="relative group inline-flex items-center">
                          <button type="button" className="text-slate-500 hover:text-slate-700 cursor-help focus:outline-none flex items-center">
                            <Info className="w-3.5 h-3.5 fill-slate-500 text-white" />
                          </button>

                          {/* Hover Tooltip Popup from (i) */}
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 w-72 p-3 bg-white border border-slate-300 rounded-md shadow-lg text-[11px] leading-relaxed text-slate-700 pointer-events-none">
                            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-300 rotate-45" />
                            <div className="relative space-y-1.5">
                              <div>
                                <span className="font-bold text-slate-900">Admin:</span> Can access the entire site.
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">Office:</span> Can access everything Admin users can, but has limited ability to edit.
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">Field:</span> Can only access the mobile app.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3-Segment Button Group */}
                      <div className="inline-flex rounded border border-slate-300 bg-slate-100 p-0.5 text-xs font-medium w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleProfileAccountTypeChange('Admin')}
                          className={`flex-1 sm:flex-none px-6 py-1.5 rounded transition-colors cursor-pointer text-center font-bold ${
                            profileFormData.accountType === 'Admin'
                              ? 'bg-[#2d82b7] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProfileAccountTypeChange('Office')}
                          className={`flex-1 sm:flex-none px-6 py-1.5 rounded transition-colors cursor-pointer text-center font-bold ${
                            profileFormData.accountType === 'Office'
                              ? 'bg-[#2d82b7] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          Office
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProfileAccountTypeChange('Field')}
                          className={`flex-1 sm:flex-none px-6 py-1.5 rounded transition-colors cursor-pointer text-center font-bold ${
                            profileFormData.accountType === 'Field'
                              ? 'bg-[#2d82b7] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          Field
                        </button>
                      </div>
                    </div>

                    {/* Grid of Permission Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 text-xs">
                      {/* Appointment Visibility */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Appointment Visibility
                        </label>
                        <select
                          value={profileFormData.appointmentVisibility || 'All appointments'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, appointmentVisibility: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="All appointments">All appointments</option>
                          <option value="Assigned appointments only">Assigned appointments only</option>
                          <option value="None">None</option>
                        </select>
                      </div>

                      {/* All Customer Visibility */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          <span>All Customer Visibility</span>
                          <button type="button" title="View all customer accounts." className="text-slate-500 hover:text-slate-700 cursor-help">
                            <Info className="w-3.5 h-3.5 fill-slate-500 text-white" />
                          </button>
                        </div>
                        <select
                          value={profileFormData.allCustomerVisibility ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, allCustomerVisibility: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Reporting Tab Visibility (Disabled & No for Field) */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Reporting Tab Visibility
                        </label>
                        <select
                          disabled={profileFormData.accountType === 'Field'}
                          value={profileFormData.accountType === 'Field' ? 'No' : (profileFormData.reportingTabVisibility ? 'Yes' : 'No')}
                          onChange={(e) => setProfileFormData({ ...profileFormData, reportingTabVisibility: e.target.value === 'Yes' })}
                          className={`w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none ${
                            profileFormData.accountType === 'Field'
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-white cursor-pointer'
                          }`}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      {/* More Applications and Settings Visibility (Disabled & No for Field) */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          More Applications and Settings Visibility
                        </label>
                        <select
                          disabled={profileFormData.accountType === 'Field'}
                          value={profileFormData.accountType === 'Field' ? 'No' : (profileFormData.moreAppsSettingsVisibility ? 'Yes' : 'No')}
                          onChange={(e) => setProfileFormData({ ...profileFormData, moreAppsSettingsVisibility: e.target.value === 'Yes' })}
                          className={`w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none ${
                            profileFormData.accountType === 'Field'
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-white cursor-pointer'
                          }`}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      {/* Manually Enter Cards */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Manually Enter Cards
                        </label>
                        <select
                          value={profileFormData.manuallyEnterCards ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, manuallyEnterCards: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Manage Recurring Payments */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Manage Recurring Payments
                        </label>
                        <select
                          value={profileFormData.manageRecurringPayments ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, manageRecurringPayments: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      {/* Perform Credits and Voids */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Perform Credits and Voids
                        </label>
                        <select
                          value={profileFormData.performCreditsVoids ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, performCreditsVoids: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Perform Financing Actions */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Perform Financing Actions
                        </label>
                        <select
                          value={profileFormData.performFinancingActions ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, performFinancingActions: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Copies for Job Forms & Receipts for Payments */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Copies for Job Forms &amp; Receipts for Payments
                        </label>
                        <div className="min-h-[34px] px-2 py-1 bg-white border border-slate-300 rounded flex flex-wrap items-center gap-1.5">
                          {(profileFormData.copiesReceipts || []).map((item: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium"
                            >
                              <span>{item}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (profileFormData.copiesReceipts || []).filter((c: string) => c !== item);
                                  setProfileFormData({ ...profileFormData, copiesReceipts: updated });
                                }}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value && !profileFormData.copiesReceipts?.includes(e.target.value)) {
                                setProfileFormData({
                                  ...profileFormData,
                                  copiesReceipts: [...(profileFormData.copiesReceipts || []), e.target.value],
                                });
                              }
                            }}
                            className="text-xs text-slate-400 bg-transparent border-none focus:outline-none cursor-pointer"
                          >
                            <option value="" disabled>+ Add...</option>
                            <option value="This User" disabled={profileFormData.copiesReceipts?.includes('This User')}>This User</option>
                            <option value="All Techs" disabled={profileFormData.copiesReceipts?.includes('All Techs')}>All Techs</option>
                            <option value="Office Admin" disabled={profileFormData.copiesReceipts?.includes('Office Admin')}>Office Admin</option>
                          </select>
                        </div>
                      </div>

                      {/* Schedule Events */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Schedule Events <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={profileFormData.scheduleEvents || 'Can Schedule All Events'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, scheduleEvents: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Can Schedule All Events">Can Schedule All Events</option>
                          <option value="Can Schedule Assigned Events Only">Can Schedule Assigned Events Only</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Edit Prices & Tax on Invoices and Proposals on Mobile */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          <span>Edit Prices &amp; Tax on Invoices and Proposals on Mobile <span className="text-red-500">*</span></span>
                          <button type="button" title="Allow mobile app invoice modifications." className="text-slate-500 hover:text-slate-700 cursor-help">
                            <Info className="w-3.5 h-3.5 fill-slate-500 text-white" />
                          </button>
                        </div>
                        <select
                          value={profileFormData.editPricesTaxMobile ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, editPricesTaxMobile: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Select or Change Tax Group on Invoices/Proposals (Field account type ONLY) */}
                      {profileFormData.accountType === 'Field' && (
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-700">
                            Select or Change Tax Group on Invoices/Proposals <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={profileFormData.taxGroupInvoicesProposals ? 'Yes' : 'No'}
                            onChange={(e) => setProfileFormData({ ...profileFormData, taxGroupInvoicesProposals: e.target.value === 'Yes' })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      )}

                      {/* Create Custom Line Items */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          <span>Create Custom Line Items <span className="text-red-500">*</span></span>
                          <button type="button" title="Allow custom line items on jobs." className="text-slate-500 hover:text-slate-700 cursor-help">
                            <Info className="w-3.5 h-3.5 fill-slate-500 text-white" />
                          </button>
                        </div>
                        <select
                          value={profileFormData.createCustomLineItems ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, createCustomLineItems: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Job P&L */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">
                          Job P&amp;L <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={profileFormData.jobPL ? 'Yes' : 'No'}
                          onChange={(e) => setProfileFormData({ ...profileFormData, jobPL: e.target.value === 'Yes' })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setManagingUser(null)}
                      className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleToggleProfileDeactivate}
                        className="px-6 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{profileFormData.isDeactivated ? 'Activate' : 'Deactivate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveUserProfile}
                        className="px-8 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {profileSavedFeedback && <Check className="w-3.5 h-3.5" />}
                        <span>{profileSavedFeedback ? 'Saved!' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ====================================================================== */
              /* USERS LIST TABLE VIEW                                                  */
              /* ====================================================================== */
              <div className="space-y-4 text-xs text-slate-800">
                {/* Header Bar: Page Title on Left, Search Bar & Add User on Right */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-800">
                    Users
                  </h2>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-48 pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddUser}
                      className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add User</span>
                    </button>
                  </div>
                </div>

                {/* Users Data Table (No row hover effects, tight columns, red user names) */}
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                          <th className="p-3 w-64">User</th>
                          <th className="p-3 w-28">Status</th>
                          <th className="p-3 w-56 text-left">Account Type</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                              No users found matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => {
                            return (
                              <tr 
                                key={user.id} 
                                className={user.isDeactivated ? 'bg-slate-50/70 opacity-60' : ''}
                              >
                                {/* User (Red clickable name, email below) */}
                                <td className="p-3 w-64">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenManageUser(user)}
                                    className="text-left cursor-pointer block group w-full"
                                  >
                                    <div className="font-semibold text-[#be4646] group-hover:text-[#a63a3a] group-hover:underline break-words leading-tight">
                                      {user.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 break-all leading-tight mt-0.5">
                                      {user.email}
                                    </div>
                                  </button>
                                </td>

                                {/* Status */}
                                <td className="p-3 w-28 whitespace-nowrap">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${getUserStatusBadgeClass(user.status)}`}>
                                    {user.status || 'Clocked Out'}
                                  </span>
                                </td>

                                {/* Account Type (3-Segment Button Group tightly aligned) */}
                                <td className="p-3 w-56">
                                  <div className="inline-flex items-center rounded border border-slate-300 bg-slate-50 p-0.5 text-xs font-medium">
                                    <button
                                      type="button"
                                      onClick={() => handleAccountTypeChange(user.id, 'Admin')}
                                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                        user.accountType === 'Admin'
                                          ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                      }`}
                                    >
                                      Admin
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAccountTypeChange(user.id, 'Office')}
                                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                        user.accountType === 'Office'
                                          ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                      }`}
                                    >
                                      Office
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAccountTypeChange(user.id, 'Field')}
                                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                        user.accountType === 'Field'
                                          ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                      }`}
                                    >
                                      Field
                                    </button>
                                  </div>
                                </td>

                                {/* Action */}
                                <td className="p-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDeactivate(user.id)}
                                    className={`text-xs font-semibold hover:underline cursor-pointer ${
                                      user.isDeactivated
                                        ? 'text-[#3f6b35] hover:text-[#34592b]'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {user.isDeactivated ? 'Activate' : 'Deactivate'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : activeSection === 'dispatch-groups' ? (
            /* ======================================================================== */
            /* DISPATCH GROUPS PAGE                                                     */
            /* ======================================================================== */
            <div className="space-y-4 text-xs text-slate-800">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-800">
                  Dispatch Groups
                </h2>
                <button
                  type="button"
                  onClick={handleOpenAddGroupModal}
                  className="bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Dispatch Group</span>
                </button>
              </div>

              {/* Clean Dispatch Groups Table */}
              <div className="border border-slate-200 rounded-lg shadow-2xs">
                <div className="overflow-visible">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                        <th className="p-3 w-56">Name</th>
                        <th className="p-3">Techs / Users</th>
                        <th className="p-3 text-right w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                      {dispatchGroups.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                            No dispatch groups configured. Click &quot;Add Dispatch Group&quot; to create one.
                          </td>
                        </tr>
                      ) : (
                        dispatchGroups.map((group) => {
                          const isMenuOpen = activeGroupMenuId === group.id;

                          return (
                            <tr key={group.id} className="bg-white relative">
                              {/* Group Name with Member Count */}
                              <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                                {group.name} ({group.members.length})
                              </td>

                              {/* Techs/Users (Clean Plain Text Pills) */}
                              <td className="p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {group.members.map((memberName, i) => (
                                    <span
                                      key={i}
                                      className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs rounded"
                                    >
                                      {memberName}
                                    </span>
                                  ))}
                                </div>
                              </td>

                              {/* Action Overflow Menu (...) */}
                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end">
                                  <MenuTrigger>
                                    <MenuButton
                                      variant="icon"
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                      aria-label="Group options"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </MenuButton>
                                    <Menu placement="bottom end" popoverClassName="min-w-[140px] shadow-md rounded-lg border border-slate-200/80 p-1 bg-white">
                                      <MenuItem onAction={() => handleOpenEditGroupModal(group)} className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-slate-700 font-medium">
                                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                        <span>Edit Group</span>
                                      </MenuItem>
                                      <MenuItem variant="danger" onAction={() => handleDeleteGroupWithWarning(group)} className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-50 cursor-pointer text-red-600 font-medium">
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        <span>Delete Group</span>
                                      </MenuItem>
                                    </Menu>
                                  </MenuTrigger>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================================== */
            /* SUBCATEGORY & GENERIC CONFIGURATIONS (TOOLBAR REMOVED)                   */
            /* ======================================================================== */
            <div className="space-y-4 max-w-xl text-xs text-slate-700">
              <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
                {sidebarMenu.flatMap(m => m.children || [m]).find(c => c.id === activeSection)?.label || 'Settings'}
              </h2>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Configuration Name / Label
                </label>
                <Input defaultValue={`Apex Setting`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Default Status
                  </label>
                  <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium">
                    <option>Active / Enabled</option>
                    <option>Disabled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Effective Scope
                  </label>
                  <select className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium">
                    <option>All Divisions &amp; Techs</option>
                    <option>HVAC Only</option>
                    <option>Appliance Only</option>
                    <option>Plumbing Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Notes &amp; Internal Instructions
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:outline-none resize-none"
                  defaultValue="Operational settings configured for this department."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. ADD / EDIT DISPATCH GROUP MODAL */}
      {isAddGroupModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-xs max-h-[85vh] flex flex-col">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#5b708b]">
                {editingGroupId ? 'Edit Dispatch Group' : 'Add New Dispatch Group'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddGroupModalOpen(false);
                  setEditingGroupId(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDispatchGroupSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#3f6b35]"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Select Members for this Group ({selectedGroupMembers.length} selected)
                </label>
                <div className="border border-slate-200 rounded-md p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/50">
                  {users.map((u) => {
                    const isSelected = selectedGroupMembers.includes(u.name);
                    return (
                      <label 
                        key={u.id} 
                        className="flex items-center gap-2 text-xs text-slate-700 hover:bg-white p-1.5 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupMembers([...selectedGroupMembers, u.name]);
                            } else {
                              setSelectedGroupMembers(selectedGroupMembers.filter((m) => m !== u.name));
                            }
                          }}
                          className="rounded text-[#3f6b35] focus:ring-[#3f6b35]"
                        />
                        <span className="font-medium">{u.name}</span>
                        <span className="text-[11px] text-slate-400 ">({u.email})</span>
                        <span className="text-[10px] ml-auto px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                          {u.accountType}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setIsAddGroupModalOpen(false);
                    setEditingGroupId(null);
                  }}
                  className="bg-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="submit"
                  className="bg-[#3f6b35] hover:bg-[#34592b] text-white font-bold px-6"
                >
                  {editingGroupId ? 'Save Changes' : 'Save Group'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD / EDIT REFERRAL SOURCE MODAL */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between">
              <h3 className="text-xl font-normal text-slate-700">
                {editingReferralId ? 'Edit Referral Source' : 'Add New Referral Source'}
              </h3>
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveReferralSource}>
              <div className="px-6 pb-6 pt-1 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={referralNameInput}
                    onChange={(e) => setReferralNameInput(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Delete Confirmation Warning */}
                {isDeletingReferralConfirm && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-xs flex items-start gap-2.5 animate-in fade-in duration-100">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold">
                        Are you sure you want to delete &ldquo;{referralNameInput}&rdquo;?
                      </p>
                      <p className="text-[11px] text-red-600">
                        This action cannot be undone and will permanently remove this referral source.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleDeleteReferralSource}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeletingReferralConfirm(false)}
                          className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {editingReferralId ? (
                    <button
                      type="button"
                      onClick={() => setIsDeletingReferralConfirm(true)}
                      className="px-3.5 py-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsReferralModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingReferralId && (
                    <button
                      type="button"
                      onClick={() => setIsReferralModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-[#c45b5b] hover:bg-[#b04a4a] text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CREATE / EDIT CONTRACT TERMS MODAL (MATCHING SCREENSHOT 2) */}
      {isContractTermModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between">
              <h3 className="text-xl font-normal text-slate-700">
                {editingContractTermId ? 'Edit Contract Terms' : 'Create Contract Terms'}
              </h3>
              <button
                type="button"
                onClick={() => setIsContractTermModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveContractTerm}>
              <div className="px-6 pb-6 pt-1 space-y-4">
                {/* Name Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={termNameInput}
                    onChange={(e) => setTermNameInput(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Description Field with Rich Text Toolbar */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Description <span className="text-red-600">*</span>
                  </label>
                  <div className="border border-slate-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-slate-400 focus-within:border-slate-400">
                    {/* Rich Text Toolbar */}
                    <div className="bg-[#f8f9fa] border-b border-slate-200 px-3 py-1.5 flex items-center gap-3 text-slate-700">
                      <div className="flex items-center gap-1.5 border-r border-slate-300 pr-3">
                        <button
                          type="button"
                          title="Bold"
                          className="p-1 rounded hover:bg-slate-200 text-slate-800 font-bold transition-colors cursor-pointer"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Italic"
                          className="p-1 rounded hover:bg-slate-200 text-slate-800 italic transition-colors cursor-pointer"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Underline"
                          className="p-1 rounded hover:bg-slate-200 text-slate-800 underline transition-colors cursor-pointer"
                        >
                          <Underline className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Clear Formatting"
                          className="p-1 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Bulleted List"
                          className="p-1 rounded hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Numbered List"
                          className="p-1 rounded hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      rows={5}
                      value={termDescriptionInput}
                      onChange={(e) => setTermDescriptionInput(e.target.value)}
                      className="w-full p-3 bg-white text-xs text-slate-800 focus:outline-none resize-y min-h-[110px]"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={termDefaultForProposals}
                      onChange={(e) => setTermDefaultForProposals(e.target.checked)}
                      className="rounded text-[#3f6b35] focus:ring-[#3f6b35] cursor-pointer w-4 h-4"
                    />
                    <span>Make these contract terms the default for proposals.</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={termDefaultForInvoices}
                      onChange={(e) => setTermDefaultForInvoices(e.target.checked)}
                      className="rounded text-[#3f6b35] focus:ring-[#3f6b35] cursor-pointer w-4 h-4"
                    />
                    <span>Make these contract terms the default for invoices.</span>
                  </label>
                </div>

                {/* Delete Confirmation Warning */}
                {isDeletingContractTermConfirm && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-xs flex items-start gap-2.5 animate-in fade-in duration-100">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold">
                        Are you sure you want to delete &ldquo;{termNameInput}&rdquo;?
                      </p>
                      <p className="text-[11px] text-red-600">
                        This action cannot be undone and will permanently remove these terms.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleDeleteContractTerm}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeletingContractTermConfirm(false)}
                          className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer (matching screenshot) */}
              <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {editingContractTermId ? (
                    <button
                      type="button"
                      onClick={() => setIsDeletingContractTermConfirm(true)}
                      className="px-3.5 py-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsContractTermModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingContractTermId && (
                    <button
                      type="button"
                      onClick={() => setIsContractTermModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-[#c45b5b] hover:bg-[#b04a4a] text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CREATE / EDIT JOB TYPE MODAL (MATCHING SCREENSHOT 2) */}
      {isJobTypeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between">
              <h3 className="text-xl font-normal text-slate-700">
                {editingJobTypeId ? 'Edit Job Type' : 'New Job Type'}
              </h3>
              <button
                type="button"
                onClick={() => setIsJobTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveJobType}>
              <div className="px-6 pb-6 pt-1 space-y-4">
                {/* Row 1: Name and Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder=""
                      value={jobTypeName}
                      onChange={(e) => setJobTypeName(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold pt-1">
                      <input
                        type="checkbox"
                        checked={jobTypeIsDefault}
                        onChange={(e) => setJobTypeIsDefault(e.target.checked)}
                        className="rounded text-[#3f6b35] focus:ring-[#3f6b35] cursor-pointer w-4 h-4"
                      />
                      <span>Make default job type</span>
                    </label>
                  </div>

                  {/* Color Field with React Aria ColorSwatch & ColorField */}
                  <div className="space-y-1.5 relative">
                    <label className="block text-xs font-bold text-slate-700">
                      Color <span className="text-red-600">*</span>
                    </label>

                    {/* Color field container */}
                    <div className="relative">
                      <div className="border border-slate-300 rounded flex items-center bg-white overflow-hidden focus-within:ring-1 focus-within:ring-slate-400">
                        {/* Aria ColorSwatch Button */}
                        <button
                          type="button"
                          onClick={() => setIsColorPickerOpen((prev) => !prev)}
                          className="p-1.5 pl-2 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
                          title="Click to pick color"
                        >
                          <ColorSwatch
                            color={parsedJobTypeColor}
                            className="w-5 h-5 rounded-xs border border-black/20 shadow-2xs cursor-pointer"
                          />
                        </button>
                        <div className="w-[1px] h-6 bg-slate-300" />
                        {/* Aria ColorField */}
                        <ColorField
                          value={parsedJobTypeColor}
                          onChange={(c) => {
                            if (c) setJobTypeColor(c.toString('hex').toUpperCase());
                          }}
                          className="flex-1 flex items-center"
                        >
                          <AriaInput
                            className="w-full px-3 py-1.5 text-xs text-slate-800 uppercase focus:outline-none bg-transparent"
                          />
                        </ColorField>
                      </div>

                      {/* Floating Color Picker Popover with Aria ColorArea + ColorThumb */}
                      {isColorPickerOpen && (
                        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-700 text-[11px]">Choose Color</span>
                            <button
                              type="button"
                              onClick={() => setIsColorPickerOpen(false)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Aria ColorArea + ColorThumb */}
                          <ColorArea
                            value={parsedJobTypeColor}
                            onChange={(c) => setJobTypeColor(c.toString('hex').toUpperCase())}
                            className="w-48 h-40 rounded border border-slate-300"
                          >
                            <ColorThumb className="w-4 h-4 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing focus:outline-none ring-1 ring-black/20" />
                          </ColorArea>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Default Duration and Default Invoice Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Default Duration */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Default Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={jobTypeDurationHours}
                        onChange={(e) => setJobTypeDurationHours(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        {['0 hours', '1 hour', '2 hours', '3 hours', '4 hours', '5 hours', '6 hours', '7 hours', '8 hours', '9 hours', '10 hours'].map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        value={jobTypeDurationMinutes}
                        onChange={(e) => setJobTypeDurationMinutes(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        {['00 min', '15 min', '30 min', '45 min'].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Default Invoice Class */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Default Invoice Class</span>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </label>
                    <select
                      value={jobTypeInvoiceClass}
                      onChange={(e) => setJobTypeInvoiceClass(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="None">None</option>
                      <option value="Appliance">Appliance</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Residential">Residential</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: % Allocation between technicians */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>% Allocation between technicians</span>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Primary Tech */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-600">Primary Tech</span>
                      <div className="border border-slate-300 rounded flex items-center bg-white overflow-hidden">
                        <input
                          type="text"
                          value={jobTypePrimaryTech}
                          onChange={(e) => setJobTypePrimaryTech(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                        />
                        <span className="px-2.5 py-1.5 bg-slate-50 text-slate-500 border-l border-slate-300 text-xs font-medium">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Additional Techs */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-600">Additional Techs</span>
                      <div className="border border-slate-300 rounded flex items-center bg-white overflow-hidden">
                        <input
                          type="text"
                          value={jobTypeAdditionalTechs}
                          onChange={(e) => setJobTypeAdditionalTechs(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                        />
                        <span className="px-2.5 py-1.5 bg-slate-50 text-slate-500 border-l border-slate-300 text-xs font-medium">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Tech Allocation Strategy */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        Tech Allocation Strategy <span className="text-red-600">*</span>
                      </span>
                      <select
                        value={jobTypeTechStrategy}
                        onChange={(e) => setJobTypeTechStrategy(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="Give to each tech">Give to each tech</option>
                        <option value="Split evenly">Split evenly</option>
                        <option value="Custom allocation">Custom allocation</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {editingJobTypeId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsJobTypeModalOpen(false);
                        setIsDeletingJobTypeConfirm(true);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsJobTypeModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingJobTypeId && (
                    <button
                      type="button"
                      onClick={() => setIsJobTypeModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-[#c45b5b] hover:bg-[#b04a4a] text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. DELETE JOB TYPE CONFIRMATION MODAL */}
      {isDeletingJobTypeConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-800">
                  Delete Job Type
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeletingJobTypeConfirm(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-2">
              <p className="text-slate-700 text-xs">
                Are you sure you want to delete <span className="font-bold text-slate-900">&ldquo;{jobTypeName}&rdquo;</span>?
              </p>
              <p className="text-slate-500 text-[11px]">
                This action cannot be undone and will permanently remove this job type from your system.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeletingJobTypeConfirm(false)}
                className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteJobType}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. CREATE / EDIT PAYMENT TERMS MODAL (MATCHING SCREENSHOT 2) */}
      {isPaymentTermModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between">
              <h3 className="text-xl font-normal text-slate-700">
                {editingPaymentTermId ? 'Edit Payment Terms' : 'Create Payment Terms'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentTermModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePaymentTerm}>
              <div className="px-6 pb-6 pt-1 space-y-4">
                {/* Row 1: Name and Days */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={paymentTermName}
                      onChange={(e) => setPaymentTermName(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  {/* Days Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Days <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={paymentTermDays}
                      onChange={(e) => setPaymentTermDays(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                {/* Make default checkbox */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={paymentTermIsDefault}
                      onChange={(e) => setPaymentTermIsDefault(e.target.checked)}
                      className="rounded text-[#3f6b35] focus:ring-[#3f6b35] cursor-pointer w-4 h-4"
                    />
                    <span>Make these payment terms the default.</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {editingPaymentTermId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaymentTermModalOpen(false);
                        setIsDeletingPaymentTermConfirm(true);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsPaymentTermModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingPaymentTermId && (
                    <button
                      type="button"
                      onClick={() => setIsPaymentTermModalOpen(false)}
                      className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-[#c45b5b] hover:bg-[#b04a4a] text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. DELETE PAYMENT TERM CONFIRMATION MODAL */}
      {isDeletingPaymentTermConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-800">
                  Delete Payment Terms
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeletingPaymentTermConfirm(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-2">
              <p className="text-slate-700 text-xs">
                Are you sure you want to delete <span className="font-bold text-slate-900">&ldquo;{paymentTermName}&rdquo;</span>?
              </p>
              <p className="text-slate-500 text-[11px]">
                This action cannot be undone and will permanently remove these payment terms from your system.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeletingPaymentTermConfirm(false)}
                className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePaymentTerm}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. ADD / EDIT PAYMENT USER MODAL (MATCHING SCREENSHOTS 1 & 2) */}
      {isPaymentUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-normal text-[#3f6b35]">
                {editingPaymentUserId ? 'Edit Business User' : 'Add Business User'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePaymentUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-3.5 overflow-y-auto max-h-[calc(90vh-130px)]">
                {/* First Name */}
                <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={paymentUserFirstName}
                    onChange={(e) => setPaymentUserFirstName(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Last Name */}
                <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={paymentUserLastName}
                    onChange={(e) => setPaymentUserLastName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Email Address */}
                <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={paymentUserEmail}
                    onChange={(e) => setPaymentUserEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Mobile Phone */}
                <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={paymentUserPhone}
                    onChange={(e) => setPaymentUserPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Account Type */}
                <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Account Type
                  </label>
                  <select
                    value={paymentUserAccountType}
                    onChange={(e) => setPaymentUserAccountType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="">- select -</option>
                    <option value="Admin">Admin</option>
                    <option value="Office">Office</option>
                    <option value="Field">Field</option>
                  </select>
                </div>

                {/* DYNAMIC EXPANDED FIELDS (For Admin, Office, Field) */}
                {paymentUserAccountType && (
                  <>
                    {/* Group */}
                    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Group
                      </label>
                      <select
                        value={paymentUserGroup}
                        onChange={(e) => setPaymentUserGroup(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="None">None</option>
                        <option value="HVAC">HVAC</option>
                        <option value="Appliance">Appliance</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                      </select>
                    </div>

                    {/* Access # (5 digit number) */}
                    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Access #
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={paymentUserAccessNumber}
                        onChange={(e) => setPaymentUserAccessNumber(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>

                    {/* Receive Email Receipts for Payments Run By */}
                    <div className="grid grid-cols-[180px_1fr] items-start gap-3 pt-1">
                      <label className="text-xs font-semibold text-slate-700 leading-tight">
                        Receive Email Receipts for Payments Run By:
                      </label>
                      <div className="space-y-2">
                        {[
                          'All Users',
                          'Admin Users',
                          'Office Users',
                          'Field Users',
                          'Recurring Payments',
                          'This User',
                          'None (No Emailed Receipts)'
                        ].map((opt) => (
                          <label
                            key={opt}
                            className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={paymentUserEmailReceiptsList.includes(opt)}
                              onChange={() => handleToggleReceiptOption(opt)}
                              className="rounded text-[#3f6b35] focus:ring-[#3f6b35] cursor-pointer w-4 h-4"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Can Perform Refunds/Voids? */}
                    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Can Perform Refunds/Voids?
                      </label>
                      <select
                        value={paymentUserCanRefundVoidSelect}
                        onChange={(e) => setPaymentUserCanRefundVoidSelect(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Can Manage Recurring Payments? */}
                    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Can Manage Recurring Payments?
                      </label>
                      <select
                        value={paymentUserCanManageRecurring}
                        onChange={(e) => setPaymentUserCanManageRecurring(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Can Perform Financing Actions? */}
                    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Can Perform Financing Actions?
                      </label>
                      <select
                        value={paymentUserCanPerformFinancing}
                        onChange={(e) => setPaymentUserCanPerformFinancing(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {/* Manual Card Entry? */}
                    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Manual Card Entry?
                      </label>
                      <select
                        value={paymentUserManualCardSelect}
                        onChange={(e) => setPaymentUserManualCardSelect(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {/* Disable Mobile App Logout Timer? */}
                    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Disable Mobile App Logout Timer?
                      </label>
                      <select
                        value={paymentUserDisableLogoutTimer}
                        onChange={(e) => setPaymentUserDisableLogoutTimer(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Primary User? (Admin only) */}
                    {paymentUserAccountType === 'Admin' && (
                      <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                        <label className="text-xs font-semibold text-slate-700">
                          Primary User?
                        </label>
                        <select
                          value={paymentUserPrimaryUser}
                          onChange={(e) => setPaymentUserPrimaryUser(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer (Matching Screenshot 2) */}
              <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  {editingPaymentUserId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaymentUserModalOpen(false);
                        setIsDeletingPaymentUserConfirm(true);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!isPaymentUserFormValid}
                    className={`px-4 py-2 text-white rounded text-xs font-bold transition-colors shadow-2xs ${
                      isPaymentUserFormValid
                        ? 'bg-[#3f6b35] hover:bg-[#32562a] cursor-pointer'
                        : 'bg-[#3f6b35]/50 cursor-not-allowed'
                    }`}
                  >
                    {editingPaymentUserId ? 'Update User' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaymentUserModalOpen(false)}
                    className="px-4 py-2 bg-[#8c9196] hover:bg-[#787d82] text-white rounded text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. DELETE PAYMENT USER CONFIRMATION MODAL */}
      {isDeletingPaymentUserConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-xs flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-800">
                  Delete Business User
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeletingPaymentUserConfirm(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-2">
              <p className="text-slate-700 text-xs">
                Are you sure you want to delete <span className="font-bold text-slate-900">&ldquo;{paymentUserFirstName} {paymentUserLastName}&rdquo;</span>?
              </p>
              <p className="text-slate-500 text-[11px]">
                This action cannot be undone and will permanently remove this user from Payment Options.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#f8f9fa] px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeletingPaymentUserConfirm(false)}
                className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePaymentUser}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WexSettingsPageContainer() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
