/**
 * Murphy's Global Choices Master Registry
 * Source: https://docs.google.com/spreadsheets/d/11RWZhH5KgqrqFHAa5md0sw6jBhuQUvrk-btz5nM9V9s
 */

export const DISPATCH_GROUPS = [
  'HVAC Techs',
  'Appliance Techs',
  'Installer',
  'Office Staff',
] as const;

export const REFERRAL_LIST = [
  'BNI',
  'Customer Referral',
  'Local Advertising',
  'Saw Vehicle',
  'Web Search',
  'Website',
] as const;

export const TAX_GROUPS = [
  'FL (7%)',
  'Exempt (0%)',
] as const;

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

export const EVENT_TYPES = [
  'Call Center',
  'Doctor',
  'Holiday',
  'Lunch',
  'Meeting',
  'Office',
  'Other',
  'Shop',
  'Sick',
  'Vacation',
  'Vacation Day',
] as const;

export const PAYMENT_TERMS = [
  'COD',
  'Home Warranty AHS/OR',
  '30 days',
  'Due upon Receipt',
] as const;

export const FOLLOW_UP_TYPES = [
  'Awaiting call back',
  'General',
  'HW Work Complete/Bill out',
  'Need more info',
  'Need Quote/Autho',
  'Order Now',
  'Part Order',
  'Parts In',
  'Parts Ordered',
  'Parts Ready for PU',
  'Register Equipment',
  'Return Part/Bill LTD',
  'Return visit needed',
  'Waiting approval',
] as const;

export const EVENT_FREQUENCIES = [
  'one time',
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;

export const APPOINTMENT_STATUSES = [
  'Idle',
  'En Route',
  'Arrived',
  'Complete',
] as const;

export const APPOINTMENT_FREQUENCIES = [
  'one time',
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;

export const MAP_PREFERENCES = [
  'Apple Maps',
  'Google Maps',
] as const;

export const APP_THEMES = [
  'System',
  'Light',
  'Dark',
] as const;

export const PHONE_NUMBER_LABELS = [
  'mobile',
  'home',
  'work',
  'school',
  'iPhone',
  'Apple Watch',
  'main',
  'home fax',
  'work fax',
  'pager',
  'other',
] as const;

export const EMAIL_LABELS = [
  'home',
  'work',
  'school',
  'other',
] as const;

export const ADDRESS_LOCATION_LABELS = [
  'home',
  'work',
  'school',
  'other',
] as const;

export const AUTHORIZED_PERSONS_LABELS = [
  'spouse',
  'partner',
  'family member',
  'property manager',
  'tenant',
  'caregiver',
  'other',
] as const;

export const CUSTOMER_ACCOUNT_STATUSES = [
  'Active',
  'Inactive',
  'Account on Hold',
] as const;

export const PAYMENT_TYPES = [
  'Processed',
  'Recorded',
  'Credit',
] as const;

export const PAYMENT_METHODS = [
  'Account Credit',
  'ACH',
  'American Express',
  'Cash',
  'Check',
  'Discover',
  'EnerBank USA',
  'Fortiva',
  'GreenSky',
  'Mastercard',
  'Other',
  'Service Finance',
  'Synchrony',
  'Visa',
  'Wells Fargo',
] as const;

export const PAYMENT_STATUSES = [
  'Authorized',
  'Settled',
  'Entered',
  'Pending',
  'Returned',
] as const;

export const EQUIPMENT_STATUSES = [
  'Active',
  'Inactive',
] as const;

export const CUSTOMER_PROFILE_TIMELINE_FILTERS = [
  'All Activity',
  'Jobs',
  'Appointments',
  'Calls & Notes',
  'Proposals',
  'Invoices',
  'Payments',
] as const;

export const JOB_LIST_STATUSES = [
  'Opened',
  'Closed',
  'Abandoned',
] as const;

export const JOB_PRICE_OPTIONS = [
  'Maintenance Plan Price',
  'Standard Price',
] as const;
