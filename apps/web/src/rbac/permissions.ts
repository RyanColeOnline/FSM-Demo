/**
 * Canonical User Permissions and Capability Matrix for Murphy's platform.
 * Fully mapped to user profiles in Firestore `/users/{uid}`.
 */

import { AccountType } from './accountTypes';
import { DispatchGroupCategory, ALL_DISPATCH_GROUPS } from './dispatchGroups';

export interface UserPermissions {
  // Account classification & Web Portal access
  accountType: AccountType;
  hasWebPortalAccess: boolean;

  // Navigation & Page Guards
  reportingTabVisibility: boolean;
  moreAppsAndSettingsVisibility: boolean;

  // Schedule & Customer Filtering
  appointmentVisibility: string; // 'All appointments' | 'All appointments for my dispatch groups' | 'All appointments for me'
  allCustomerVisibility: boolean;
  scheduleEventsPermission: string; // 'Can Schedule All Events' | 'Can Schedule for Self' | 'Cannot Schedule Any Events'

  // Payment & Billing Capabilities
  manuallyEnterCards: boolean;
  manageRecurringPayments: boolean;
  performCreditsAndVoids: boolean;
  performFinancingActions: boolean;
  receiptCopyRecipients: string[];

  // Mobile & Invoicing Capabilities
  editPricesAndTaxOnMobile: boolean;
  createCustomLineItems: boolean;
  viewJobPnL: boolean;

  // Computed helper permissions for backward compatibility & quick checks
  canSwitchTechnicianSchedules: boolean;
  canViewCrossGroupSchedules: boolean;
  canCreateInvoices: boolean;
  canEditPrices: boolean;
  canTakePayments: boolean;
  canModifyPriceBook: boolean;
  allowedDispatchGroups: DispatchGroupCategory[];
}

export function getDefaultPermissions(
  accountType: AccountType,
  userGroup: DispatchGroupCategory = 'appliance_techs'
): UserPermissions {
  switch (accountType) {
    case 'field':
      return {
        accountType: 'field',
        hasWebPortalAccess: false,
        reportingTabVisibility: false,
        moreAppsAndSettingsVisibility: false,
        appointmentVisibility: 'All appointments',
        allCustomerVisibility: true,
        scheduleEventsPermission: 'Cannot Schedule Any Events',
        manuallyEnterCards: true,
        manageRecurringPayments: false,
        performCreditsAndVoids: true,
        performFinancingActions: true,
        receiptCopyRecipients: ['None (No Emailed Receipts)'],
        editPricesAndTaxOnMobile: true,
        createCustomLineItems: false,
        viewJobPnL: false,

        canSwitchTechnicianSchedules: false,
        canViewCrossGroupSchedules: false,
        canCreateInvoices: false,
        canEditPrices: false,
        canTakePayments: true,
        canModifyPriceBook: false,
        allowedDispatchGroups: [userGroup],
      };

    case 'office':
      return {
        accountType: 'office',
        hasWebPortalAccess: true,
        reportingTabVisibility: true,
        moreAppsAndSettingsVisibility: false, // Default office is false, can be overridden per user (e.g. Amanda Hoover = true)
        appointmentVisibility: 'All appointments',
        allCustomerVisibility: true,
        scheduleEventsPermission: 'Can Schedule All Events',
        manuallyEnterCards: true,
        manageRecurringPayments: true,
        performCreditsAndVoids: true,
        performFinancingActions: true,
        receiptCopyRecipients: ['This User'],
        editPricesAndTaxOnMobile: true,
        createCustomLineItems: true,
        viewJobPnL: true,

        canSwitchTechnicianSchedules: true,
        canViewCrossGroupSchedules: true,
        canCreateInvoices: true,
        canEditPrices: true,
        canTakePayments: true,
        canModifyPriceBook: false,
        allowedDispatchGroups: ALL_DISPATCH_GROUPS,
      };

    case 'admin':
      return {
        accountType: 'admin',
        hasWebPortalAccess: true,
        reportingTabVisibility: true,
        moreAppsAndSettingsVisibility: true,
        appointmentVisibility: 'All appointments',
        allCustomerVisibility: true,
        scheduleEventsPermission: 'Can Schedule All Events',
        manuallyEnterCards: true,
        manageRecurringPayments: true,
        performCreditsAndVoids: true,
        performFinancingActions: true,
        receiptCopyRecipients: ['This User'],
        editPricesAndTaxOnMobile: true,
        createCustomLineItems: true,
        viewJobPnL: true,

        canSwitchTechnicianSchedules: true,
        canViewCrossGroupSchedules: true,
        canCreateInvoices: true,
        canEditPrices: true,
        canTakePayments: true,
        canModifyPriceBook: true,
        allowedDispatchGroups: ALL_DISPATCH_GROUPS,
      };
  }
}
