/**
 * Non-Destructive Firestore Sandbox Seeding Script for Murphy's FSM Platform.
 * Populates sandbox collections with canonical customer, appointment, price book,
 * equipment, invoice, proposal, checklist, note, attachment, and follow-up datasets.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CANONICAL_MOCK_CUSTOMERS } from '../mock/customers';
import { CANONICAL_MOCK_APPOINTMENTS } from '../mock/appointments';
import { CANONICAL_MOCK_JOBS } from '../mock/jobs';
import { CANONICAL_MOCK_PRICEBOOK_ITEMS } from '../mock/priceBook';
import { CANONICAL_MOCK_EQUIPMENT } from '../mock/equipment';
import { CANONICAL_MOCK_INVOICES } from '../mock/invoices';
import { CANONICAL_MOCK_PROPOSALS } from '../mock/proposals';
import { CANONICAL_MOCK_PAYMENT_RECORDS } from '../mock/payments';
import { CANONICAL_MOCK_MAINTENANCE_PLANS } from '../mock/maintenancePlans';
import { CANONICAL_MOCK_CHECKLIST_TEMPLATES } from '../mock/checklists';
import { CANONICAL_MOCK_NOTES } from '../mock/notes';
import { CANONICAL_MOCK_ATTACHMENTS } from '../mock/attachments';
import { CANONICAL_MOCK_FOLLOW_UPS } from '../mock/followUps';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'murphys-fsm-staging';

const app = getApps().length === 0 ? initializeApp({ projectId: PROJECT_ID }) : getApps()[0];
const db = getFirestore(app);

async function seedCollection<T extends { id: string }>(
  collectionName: string,
  items: T[],
  label: string
) {
  console.log(`\n📦 Seeding ${items.length} ${label} into collection '${collectionName}'...`);
  
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    
    for (const item of chunk) {
      const docRef = db.collection(collectionName).doc(item.id);
      batch.set(docRef, item as any, { merge: true });
    }
    
    await batch.commit();
    console.log(`  ✓ Committed batch ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} items)`);
  }
  
  console.log(`✅ Successfully seeded ${items.length} ${label} into '${collectionName}'.`);
}

export async function runSandboxSeed() {
  console.log(`=======================================================`);
  console.log(`🚀 Starting Murphy's Sandbox Database Seeding on: ${PROJECT_ID}`);
  console.log(`=======================================================`);
  
  try {
    // 1. Seed Customers (sandbox_customers)
    await seedCollection('sandbox_customers', CANONICAL_MOCK_CUSTOMERS, 'Customers');
    
    // 2. Seed Appointments & Jobs (sandbox_appointments & sandbox_jobs)
    await seedCollection('sandbox_appointments', CANONICAL_MOCK_APPOINTMENTS, 'Appointments');
    await seedCollection('sandbox_jobs', CANONICAL_MOCK_JOBS, 'Jobs');
    
    // 3. Seed Price Book Items (sandbox_priceBook)
    await seedCollection('sandbox_priceBook', CANONICAL_MOCK_PRICEBOOK_ITEMS, 'Price Book Items');
    
    // 4. Seed Equipment (sandbox_equipment)
    await seedCollection('sandbox_equipment', CANONICAL_MOCK_EQUIPMENT, 'Equipment');
    
    // 5. Seed Invoices (sandbox_invoices)
    await seedCollection('sandbox_invoices', CANONICAL_MOCK_INVOICES, 'Invoices');
    
    // 6. Seed Proposals (sandbox_proposals)
    await seedCollection('sandbox_proposals', CANONICAL_MOCK_PROPOSALS, 'Proposals');
    
    // 7. Seed Payments (sandbox_payments)
    await seedCollection('sandbox_payments', CANONICAL_MOCK_PAYMENT_RECORDS, 'Payments');
    
    // 7. Seed Maintenance Plans (sandbox_maintenancePlans)
    await seedCollection('sandbox_maintenancePlans', CANONICAL_MOCK_MAINTENANCE_PLANS, 'Maintenance Plans');
    
    // 8. Seed Checklist Templates (sandbox_checklistTemplates)
    await seedCollection('sandbox_checklistTemplates', CANONICAL_MOCK_CHECKLIST_TEMPLATES, 'Checklist Templates');
    
    // 9. Seed Notes (sandbox_notes)
    await seedCollection('sandbox_notes', CANONICAL_MOCK_NOTES, 'Notes');
    
    // 10. Seed Attachments (sandbox_attachments)
    await seedCollection('sandbox_attachments', CANONICAL_MOCK_ATTACHMENTS, 'Attachments');
    
    // 11. Seed Follow-Ups (sandbox_followUps)
    await seedCollection('sandbox_followUps', CANONICAL_MOCK_FOLLOW_UPS, 'Follow-Up Flags');
    
    console.log(`\n=======================================================`);
    console.log(`🎉 Sandbox Database Seeding Completed Successfully!`);
    console.log(`=======================================================\n`);
  } catch (error) {
    console.error('❌ Error seeding sandbox database:', error);
    throw error;
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.includes('seedSandbox')) {
  runSandboxSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
