/**
 * Idempotent Demo Reset & Seeding Engine for Apex Field Solutions.
 * Purges and restores all canonical collections to pristine baseline demo state.
 * Usage: npm run demo:reset
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import {
  DEMO_USERS,
  DEMO_CUSTOMERS,
  DEMO_EQUIPMENT,
  DEMO_JOBS,
  DEMO_APPOINTMENTS,
  DEMO_INVOICES,
  DEMO_TIME_RECORDS,
  DEMO_PRICEBOOK_ITEMS,
  DEMO_PRICEBOOK_CATEGORIES,
  DEMO_CHECKLIST_TEMPLATES,
  DEMO_WARRANTIES,
  DEMO_DISPATCH_GROUPS,
  DEMO_PROCESSING_STATEMENTS,
  DEMO_PROPOSALS,
} from '../mock/demo/index';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'fsm-demo-266c8';

// Look for serviceAccountKey.json in root or domain package matching this project
function findServiceAccount(): any | null {
  const localCandidates = [
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), '../../serviceAccountKey.json'),
    path.resolve(__dirname, '../../../../serviceAccountKey.json'),
    path.resolve(__dirname, '../../serviceAccountKey.json'),
  ];

  for (const p of localCandidates) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        console.log(`🔑 Loaded local Firebase Service Account from: ${p}`);
        return parsed;
      } catch (err) {
        console.warn(`⚠️ Failed to parse service account at ${p}:`, err);
      }
    }
  }

  // Check GOOGLE_APPLICATION_CREDENTIALS only if it matches PROJECT_ID
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    try {
      const raw = fs.readFileSync(envPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.project_id === PROJECT_ID) {
        console.log(`🔑 Loaded Firebase Service Account from env: ${envPath}`);
        return parsed;
      } else {
        console.log(`ℹ️ Ignoring GOOGLE_APPLICATION_CREDENTIALS for '${parsed.project_id}' (expected '${PROJECT_ID}').`);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

const serviceAccount = findServiceAccount();

const app = getApps().length === 0
  ? initializeApp(
      serviceAccount
        ? { credential: cert(serviceAccount), projectId: PROJECT_ID }
        : { projectId: PROJECT_ID }
    )
  : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);

const CHUNK_SIZE = 400;

async function purgeCollection(collectionName: string) {
  process.stdout.write(`  🧹 Purging collection '${collectionName}'... `);
  try {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) {
      console.log(`(0 docs)`);
      return;
    }

    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();
      for (const doc of chunk) {
        batch.delete(doc.ref);
      }
      await batch.commit();
    }
    console.log(`(${docs.length} docs purged)`);
  } catch (err: any) {
    console.log(`⚠️ Skip purge '${collectionName}': ${err?.message || err}`);
  }
}

async function seedCollection<T extends { id: string }>(
  collectionName: string,
  items: T[],
  label: string
) {
  process.stdout.write(`  📦 Seeding ${items.length} ${label} into '${collectionName}'... `);
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const item of chunk) {
      const docRef = db.collection(collectionName).doc(item.id);
      batch.set(docRef, item as any, { merge: false });
    }
    await batch.commit();
  }
  console.log(`✓ done`);
}

async function provisionAuthUsers() {
  if (!serviceAccount) {
    console.log(`\nℹ️  Service Account Key not yet detected in workspace. Skipping automated Firebase Auth account generation.`);
    console.log(`   (Place 'serviceAccountKey.json' in repository root to enable automatic password & custom claims provisioning).\n`);
    return;
  }

  console.log(`\n🔐 Provisioning Firebase Authentication Demo Users & Custom Claims...`);

  // Clean up obsolete accounts from earlier iterations
  try {
    const listResult = await auth.listUsers(100);
    for (const u of listResult.users) {
      const email = u.email?.toLowerCase() || '';
      if (email.endsWith('@apexfieldsolutions.com') || email.includes('murphys') || email.includes('payzer.com')) {
        await auth.deleteUser(u.uid);
        console.log(`  🗑️ Removed legacy auth account: ${u.email}`);
      }
    }
  } catch (cleanErr: any) {
    console.warn(`  ⚠️ Could not clean up legacy auth accounts:`, cleanErr?.message || cleanErr);
  }

  for (const user of DEMO_USERS) {
    try {
      let authUser;
      try {
        authUser = await auth.getUserByEmail(user.email);
        // Update password to ensure it matches Fsmdemo2026!
        await auth.updateUser(authUser.uid, {
          password: 'Fsmdemo2026!',
          displayName: user.displayName,
        });
        console.log(`  ✓ Updated Auth User: ${user.email} (Password: Fsmdemo2026!)`);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          authUser = await auth.createUser({
            uid: user.id,
            email: user.email,
            displayName: user.displayName,
            password: 'Fsmdemo2026!',
            emailVerified: true,
          });
          console.log(`  ✓ Created Auth User: ${user.email} (Password: Fsmdemo2026!)`);
        } else {
          throw err;
        }
      }

      // Set Custom Claims based on role
      const role = user.accountType || (user.permissions?.accountType?.toLowerCase() ?? 'field');
      await auth.setCustomUserClaims(authUser.uid, {
        role: role,
        accountType: role,
        admin: role === 'admin',
        office: role === 'office',
        field: role === 'field',
      });
      console.log(`  ✓ Updated Custom Claims for ${user.email} -> { role: '${role}' }`);
    } catch (authErr: any) {
      console.warn(`  ⚠️ Could not provision auth user ${user.email}:`, authErr?.message || authErr);
    }
  }
}

export async function runDemoReset() {
  console.log(`=====================================================================`);
  console.log(`🚀 Apex Field Solutions - Baseline FSM Demo Environment Reset Engine`);
  console.log(`🎯 Target Project: ${PROJECT_ID}`);
  console.log(`=====================================================================\n`);

  console.log(`STEP 1: Purging target collections (Live & Sandbox)...`);
  const collectionsToPurge = [
    'users',
    'sandbox_users',
    'customers',
    'sandbox_customers',
    'equipment',
    'sandbox_equipment',
    'jobs',
    'sandbox_jobs',
    'appointments',
    'sandbox_appointments',
    'invoices',
    'sandbox_invoices',
    'proposals',
    'sandbox_proposals',
    'time_records',
    'sandbox_time_records',
    'timeClock',
    'sandbox_timeClock',
    'price_book',
    'sandbox_price_book',
    'priceBook',
    'sandbox_priceBook',
    'checklists',
    'sandbox_checklists',
    'checklistTemplates',
    'sandbox_checklistTemplates',
    'warranties',
    'sandbox_warranties',
    'dispatchGroups',
    'sandbox_dispatchGroups',
    'processing_statements',
    'sandbox_processing_statements',
    'settings',
    'sandbox_settings',
  ];

  for (const col of collectionsToPurge) {
    await purgeCollection(col);
  }

  console.log(`\nSTEP 2: Seeding pristine canonical demo datasets...`);
  
  // 1. Users (Live & Sandbox)
  await seedCollection('users', DEMO_USERS, 'Users');
  await seedCollection('sandbox_users', DEMO_USERS, 'Sandbox Users');

  // 2. Dispatch Groups (Live & Sandbox)
  await seedCollection('dispatchGroups', DEMO_DISPATCH_GROUPS, 'Dispatch Groups');
  await seedCollection('sandbox_dispatchGroups', DEMO_DISPATCH_GROUPS, 'Sandbox Dispatch Groups');

  // 3. Settings (Single Master Document - Live & Sandbox)
  process.stdout.write(`  📦 Seeding master Settings documents... `);
  const companySettings = {
    companyName: 'Apex Field Solutions',
    legalName: 'Apex Field Solutions LLC',
    phone: '(800) 555-2739',
    email: 'support@apex.com',
    billingEmail: 'billing@apex.com',
    address: '100 Innovation Parkway, Suite 400, Orlando, FL 32801',
    defaultTaxRate: 7.0,
    invoicePrefix: 'INV-',
    startingInvoiceNumber: 10045,
    enableStripePayments: true,
    timezone: 'America/New_York',
    updatedAt: new Date().toISOString(),
  };
  await db.collection('settings').doc('company_settings').set(companySettings);
  await db.collection('sandbox_settings').doc('company_settings').set(companySettings);
  console.log(`✓ done`);

  // 4. Warranties
  await seedCollection('warranties', DEMO_WARRANTIES, 'Warranties');
  await seedCollection('sandbox_warranties', DEMO_WARRANTIES, 'Sandbox Warranties');

  // 5. Checklists
  await seedCollection('checklistTemplates', DEMO_CHECKLIST_TEMPLATES, 'Checklist Templates');
  await seedCollection('sandbox_checklistTemplates', DEMO_CHECKLIST_TEMPLATES, 'Sandbox Checklist Templates');
  await seedCollection('checklists', DEMO_CHECKLIST_TEMPLATES, 'Checklists');
  await seedCollection('sandbox_checklists', DEMO_CHECKLIST_TEMPLATES, 'Sandbox Checklists');

  // 6. Price Book (both priceBook and price_book for complete compatibility)
  await seedCollection('priceBook', DEMO_PRICEBOOK_ITEMS, 'Price Book Items');
  await seedCollection('sandbox_priceBook', DEMO_PRICEBOOK_ITEMS, 'Sandbox Price Book Items');
  await seedCollection('price_book', DEMO_PRICEBOOK_ITEMS, 'Price Book Items');
  await seedCollection('sandbox_price_book', DEMO_PRICEBOOK_ITEMS, 'Sandbox Price Book Items');

  // 7. Customers
  await seedCollection('customers', DEMO_CUSTOMERS, 'Customers');
  await seedCollection('sandbox_customers', DEMO_CUSTOMERS, 'Sandbox Customers');

  // 8. Equipment
  await seedCollection('equipment', DEMO_EQUIPMENT, 'Equipment');
  await seedCollection('sandbox_equipment', DEMO_EQUIPMENT, 'Sandbox Equipment');

  // 9. Jobs & Appointments
  await seedCollection('jobs', DEMO_JOBS, 'Jobs');
  await seedCollection('sandbox_jobs', DEMO_JOBS, 'Sandbox Jobs');
  await seedCollection('appointments', DEMO_APPOINTMENTS, 'Appointments');
  await seedCollection('sandbox_appointments', DEMO_APPOINTMENTS, 'Sandbox Appointments');

  // 10. Invoices & Proposals
  await seedCollection('invoices', DEMO_INVOICES, 'Invoices');
  await seedCollection('sandbox_invoices', DEMO_INVOICES, 'Sandbox Invoices');
  await seedCollection('proposals', DEMO_PROPOSALS, 'Proposals');
  await seedCollection('sandbox_proposals', DEMO_PROPOSALS, 'Sandbox Proposals');

  // 11. Time Clock / Time Records
  await seedCollection('timeClock', DEMO_TIME_RECORDS, 'Time Clock Logs');
  await seedCollection('sandbox_timeClock', DEMO_TIME_RECORDS, 'Sandbox Time Clock Logs');
  await seedCollection('time_records', DEMO_TIME_RECORDS, 'Time Records');
  await seedCollection('sandbox_time_records', DEMO_TIME_RECORDS, 'Sandbox Time Records');

  // 12. Processing Statements
  await seedCollection('processing_statements', DEMO_PROCESSING_STATEMENTS, 'Merchant Processing Statements');
  await seedCollection('sandbox_processing_statements', DEMO_PROCESSING_STATEMENTS, 'Sandbox Merchant Processing Statements');

  // Step 3: Auth Provisioning
  await provisionAuthUsers();

  // Step 4: Verification Count
  console.log(`\nSTEP 3: Running post-seed database integrity check...`);
  console.log(`---------------------------------------------------------------------`);
  for (const col of [
    'users',
    'customers',
    'equipment',
    'jobs',
    'appointments',
    'invoices',
    'proposals',
    'time_records',
    'price_book',
    'warranties',
    'checklists',
    'processing_statements',
  ]) {
    try {
      const snap = await db.collection(col).count().get();
      console.log(`  ✓ Collection '${col.padEnd(23)}': ${snap.data().count} documents verified`);
    } catch {
      const snap = await db.collection(col).get();
      console.log(`  ✓ Collection '${col.padEnd(23)}': ${snap.size} documents verified`);
    }
  }

  console.log(`---------------------------------------------------------------------`);
  console.log(`🎉 Demo Environment Successfully Restored to Pristine Canonical State!`);
  console.log(`=====================================================================\n`);
}

// Allow direct execution
if (require.main === module) {
  runDemoReset().catch((err) => {
    console.error(`❌ Fatal error during demo reset:`, err);
    process.exit(1);
  });
}
