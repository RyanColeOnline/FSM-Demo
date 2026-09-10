export interface MaintenancePlanTemplate {
  id: string;
  name: string;
  quickbooksItemName?: string;
  description: string;
  contractLengthYears: number;
  contractLengthText: string;
  annualPrice: number;
  accountName?: string;
  className?: string;
  collectTax?: boolean;
  frequency: 'Tri-Annual' | 'Bi-Annual' | 'Annual' | 'Quarterly';
  serviceWindows: Array<{
    id: string;
    beginningMonth: string;
    endMonth: string;
    jobName: string;
  }>;
  jobType: string;
}

export const MAINTENANCE_PLAN_TEMPLATES: MaintenancePlanTemplate[] = [
  {
    id: 'mp-template-1',
    name: 'Commercial PM 6 systems',
    quickbooksItemName: 'Maint-Comm-PM6',
    description: 'Comprehensive commercial PM service covering up to 6 systems.',
    contractLengthYears: 20,
    contractLengthText: '20 Years',
    annualPrice: 2265.00,
    accountName: 'HVAC Preventative Maintenance',
    className: 'Commercial',
    collectTax: false,
    frequency: 'Tri-Annual',
    serviceWindows: [
      { id: 'sw-1', beginningMonth: 'May', endMonth: 'June', jobName: '1st Visit 6 Systems' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', jobName: '2nd Visit 6 Systems' },
      { id: 'sw-3', beginningMonth: 'January', endMonth: 'January', jobName: '3rd Visit 6 Systems' },
    ],
    jobType: 'Preventative Maint',
  },
  {
    id: 'mp-template-2',
    name: 'Commercial system maintenance',
    quickbooksItemName: 'Maint-Comm-System',
    description: 'Routine maintenance for single commercial HVAC installations.',
    contractLengthYears: 20,
    contractLengthText: '20 Years',
    annualPrice: 850.00,
    accountName: 'HVAC Preventative Maintenance',
    className: 'Commercial',
    collectTax: false,
    frequency: 'Bi-Annual',
    serviceWindows: [
      { id: 'sw-1', beginningMonth: 'September', endMonth: 'December', jobName: 'Fall Commercial Visit' },
      { id: 'sw-2', beginningMonth: 'March', endMonth: 'April', jobName: 'Spring Commercial Visit' },
    ],
    jobType: 'Preventative Maint',
  },
  {
    id: 'mp-template-3',
    name: 'Complimentary HVAC Maintenance',
    quickbooksItemName: 'Maint-Promo-Free',
    description: 'Complimentary first year maintenance included with new equipment installation.',
    contractLengthYears: 1,
    contractLengthText: '1 Year',
    annualPrice: 0.00,
    accountName: '',
    className: 'Residential',
    collectTax: false,
    frequency: 'Bi-Annual',
    serviceWindows: [
      { id: 'sw-1', beginningMonth: 'March', endMonth: 'April', jobName: 'Spring Inspection' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', jobName: 'Fall Inspection' },
    ],
    jobType: 'HVAC Maintenance',
  },
  {
    id: 'mp-template-4',
    name: 'Hvac 1 system maintenance plan',
    quickbooksItemName: 'Maint-Res-1System',
    description: 'Residential 1 system annual precision tune-up & maintenance plan.',
    contractLengthYears: 20,
    contractLengthText: '20 Years',
    annualPrice: 245.00,
    accountName: 'HVAC Preventative Maintenance',
    className: 'Residential',
    collectTax: false,
    frequency: 'Bi-Annual',
    serviceWindows: [
      { id: 'sw-1', beginningMonth: 'March', endMonth: 'April', jobName: '1st Visit 1 System' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', jobName: '2nd Visit 1 System' },
    ],
    jobType: 'Preventative Maint',
  },
  {
    id: 'mp-template-5',
    name: 'Hvac 2 system maintenance plan',
    quickbooksItemName: 'Maint-Res-2System',
    description: 'Residential 2 system annual precision tune-up & maintenance plan.',
    contractLengthYears: 20,
    contractLengthText: '20 Years',
    annualPrice: 395.00,
    accountName: 'HVAC Preventative Maintenance',
    className: 'Residential',
    collectTax: false,
    frequency: 'Bi-Annual',
    serviceWindows: [
      { id: 'sw-1', beginningMonth: 'March', endMonth: 'April', jobName: '1st Visit 2 Systems' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', jobName: '2nd Visit 2 Systems' },
    ],
    jobType: 'Preventative Maint',
  },
  {
    id: 'mp-template-6',
    name: 'Hvac 3 system maintenance plan',
    quickbooksItemName: 'Maint-Res-3System',
    description: 'Residential 3 system annual precision tune-up & maintenance plan.',
    contractLengthYears: 20,
    contractLengthText: '20 Years',
    annualPrice: 545.00,
    accountName: 'HVAC Preventative Maintenance',
    className: 'Residential',
    collectTax: false,
    frequency: 'Bi-Annual',
    serviceWindows: [
      { id: 'sw-1', beginningMonth: 'March', endMonth: 'April', jobName: '1st Visit 3 Systems' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', jobName: '2nd Visit 3 Systems' },
    ],
    jobType: 'Preventative Maint',
  },
  {
    id: 'mp-template-7',
    name: 'Hvac 4 system maintenance plan',
    quickbooksItemName: 'Maint-Res-4System',
    description: 'Residential 4 system annual precision tune-up & maintenance plan.',
    contractLengthYears: 20,
    contractLengthText: '20 Years',
    annualPrice: 695.00,
    accountName: 'HVAC Preventative Maintenance',
    className: 'Residential',
    collectTax: false,
    frequency: 'Bi-Annual',
    serviceWindows: [
      { id: 'sw-1', beginningMonth: 'March', endMonth: 'April', jobName: '1st Visit 4 Systems' },
      { id: 'sw-2', beginningMonth: 'September', endMonth: 'October', jobName: '2nd Visit 4 Systems' },
    ],
    jobType: 'Preventative Maint',
  },
];
