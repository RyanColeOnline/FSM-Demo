import { CanonicalAccountType, CanonicalDispatchGroupKey } from '../types/rbac';
import { CanonicalUserPermissions } from '../types/user';

export const ALL_CANONICAL_DISPATCH_GROUPS: CanonicalDispatchGroupKey[] = [
  'appliance_techs',
  'hvac_techs',
  'installer',
  'office_staff',
];

export function getCanonicalDefaultPermissions(accountType: CanonicalAccountType): CanonicalUserPermissions {
  switch (accountType) {
    case 'field':
      return {
        accountType: 'Field',
        appointmentVisibility: 'Assigned only',
        allCustomerVisibility: true,
        reportingTabVisibility: false,
        moreAppsAndSettingsVisibility: false,
        manuallyEnterCards: true,
        manageRecurringPayments: false,
        performCreditsAndVoids: true,
        performFinancingActions: true,
        receiptCopyRecipients: ['This User'],
        scheduleEventsPermission: 'Can Schedule Assigned Events Only',
        editPricesAndTaxOnMobile: true,
        createCustomLineItems: true,
        viewJobPnL: false,
      };
    case 'office':
      return {
        accountType: 'Office',
        appointmentVisibility: 'All appointments',
        allCustomerVisibility: true,
        reportingTabVisibility: true,
        moreAppsAndSettingsVisibility: false,
        manuallyEnterCards: true,
        manageRecurringPayments: true,
        performCreditsAndVoids: true,
        performFinancingActions: true,
        receiptCopyRecipients: ['This User'],
        scheduleEventsPermission: 'Can Schedule All Events',
        editPricesAndTaxOnMobile: true,
        createCustomLineItems: true,
        viewJobPnL: true,
      };
    case 'admin':
      return {
        accountType: 'Admin',
        appointmentVisibility: 'All appointments',
        allCustomerVisibility: true,
        reportingTabVisibility: true,
        moreAppsAndSettingsVisibility: true,
        manuallyEnterCards: true,
        manageRecurringPayments: true,
        performCreditsAndVoids: true,
        performFinancingActions: true,
        receiptCopyRecipients: ['This User'],
        scheduleEventsPermission: 'Can Schedule All Events',
        editPricesAndTaxOnMobile: true,
        createCustomLineItems: true,
        viewJobPnL: true,
      };
  }
}
