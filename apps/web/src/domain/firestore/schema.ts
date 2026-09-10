/**
 * Firestore Schema & Collection Path Definitions for Murphy's FSM Platform.
 * Single source of truth for database collections and subcollections on Firebase.
 */

export const FIRESTORE_COLLECTIONS = {
  CUSTOMERS: 'customers',
  LOCATIONS: 'locations',
  AUTHORIZED_PERSONS: 'authorizedPersons',
  JOBS: 'jobs',
  APPOINTMENTS: 'appointments',
  PRICE_BOOK: 'priceBook',
  TIME_CLOCK: 'timeClock',
  USERS: 'users',
  EQUIPMENT: 'equipment',
  INVOICES: 'invoices',
  PROPOSALS: 'proposals',
  MAINTENANCE_PLANS: 'maintenancePlans',
  CHECKLISTS: 'checklists',
  CHECKLIST_TEMPLATES: 'checklistTemplates',
  NOTES: 'notes',
  ATTACHMENTS: 'attachments',
  FOLLOW_UPS: 'followUps',
  TRANSACTIONS: 'transactions',
  PAYMENT_METHODS: 'paymentMethods',
  PAYMENTS: 'payments',
  WARRANTIES: 'warranties',
  CALLS: 'calls',
  DISPATCH_GROUPS: 'dispatchGroups',
} as const;

/**
 * Firestore Collection Path Generators
 */
export const FirestorePaths = {
  customer: (customerId: string) => `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${customerId}`,
  customerLocations: (customerId: string) =>
    `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${customerId}/${FIRESTORE_COLLECTIONS.LOCATIONS}`,
  customerLocation: (customerId: string, locationId: string) =>
    `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${customerId}/${FIRESTORE_COLLECTIONS.LOCATIONS}/${locationId}`,
  customerAuthorizedPersons: (customerId: string) =>
    `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${customerId}/${FIRESTORE_COLLECTIONS.AUTHORIZED_PERSONS}`,
  customerNotes: (customerId: string) =>
    `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${customerId}/${FIRESTORE_COLLECTIONS.NOTES}`,
  customerAttachments: (customerId: string) =>
    `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${customerId}/${FIRESTORE_COLLECTIONS.ATTACHMENTS}`,
  customerPaymentMethods: (customerId: string) =>
    `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${customerId}/${FIRESTORE_COLLECTIONS.PAYMENT_METHODS}`,
  
  // Root entities with relational queries
  job: (jobId: string) => `${FIRESTORE_COLLECTIONS.JOBS}/${jobId}`,
  jobAppointments: (jobId: string) =>
    `${FIRESTORE_COLLECTIONS.JOBS}/${jobId}/${FIRESTORE_COLLECTIONS.APPOINTMENTS}`,
  jobAppointment: (jobId: string, appointmentId: string) =>
    `${FIRESTORE_COLLECTIONS.JOBS}/${jobId}/${FIRESTORE_COLLECTIONS.APPOINTMENTS}/${appointmentId}`,
  jobChecklists: (jobId: string) =>
    `${FIRESTORE_COLLECTIONS.JOBS}/${jobId}/${FIRESTORE_COLLECTIONS.CHECKLISTS}`,
  jobNotes: (jobId: string) =>
    `${FIRESTORE_COLLECTIONS.JOBS}/${jobId}/${FIRESTORE_COLLECTIONS.NOTES}`,
  jobAttachments: (jobId: string) =>
    `${FIRESTORE_COLLECTIONS.JOBS}/${jobId}/${FIRESTORE_COLLECTIONS.ATTACHMENTS}`,
  
  equipment: (equipmentId: string) => `${FIRESTORE_COLLECTIONS.EQUIPMENT}/${equipmentId}`,
  invoice: (invoiceId: string) => `${FIRESTORE_COLLECTIONS.INVOICES}/${invoiceId}`,
  proposal: (proposalId: string) => `${FIRESTORE_COLLECTIONS.PROPOSALS}/${proposalId}`,
  maintenancePlan: (planId: string) => `${FIRESTORE_COLLECTIONS.MAINTENANCE_PLANS}/${planId}`,
  checklistTemplate: (templateId: string) => `${FIRESTORE_COLLECTIONS.CHECKLIST_TEMPLATES}/${templateId}`,
  checklistInstance: (checklistId: string) => `${FIRESTORE_COLLECTIONS.CHECKLISTS}/${checklistId}`,
  followUp: (followUpId: string) => `${FIRESTORE_COLLECTIONS.FOLLOW_UPS}/${followUpId}`,
  priceBookItem: (itemId: string) => `${FIRESTORE_COLLECTIONS.PRICE_BOOK}/${itemId}`,
  timeClockLog: (logId: string) => `${FIRESTORE_COLLECTIONS.TIME_CLOCK}/${logId}`,
  user: (userId: string) => `${FIRESTORE_COLLECTIONS.USERS}/${userId}`,
  transaction: (txId: string) => `${FIRESTORE_COLLECTIONS.TRANSACTIONS}/${txId}`,
  dispatchGroup: (groupId: string) => `${FIRESTORE_COLLECTIONS.DISPATCH_GROUPS}/${groupId}`,
};
