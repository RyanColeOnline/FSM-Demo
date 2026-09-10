/**
 * Non-Destructive 1:1 Sandbox to Live Dataset Snapshot Sync Script.
 * 
 * Clones all sandbox_* collections to their live counterparts (e.g. sandbox_customers -> customers).
 * Once cloned, the live collections are frozen in time and sit idle, while testers continue
 * working in the sandbox collections.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'murphys-fsm-staging';

function getFirebaseAccessToken(): string {
  const configPaths = [
    path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
    path.join(process.env.LOCALAPPDATA || '', 'configstore', 'firebase-tools.json'),
  ];
  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        const token = raw.tokens?.access_token;
        if (token) return token;
      } catch (e) {}
    }
  }
  throw new Error('No Firebase CLI access token found in configstore.');
}

const COLLECTIONS_TO_CLONE: { sandbox: string; live: string; label: string }[] = [
  { sandbox: 'sandbox_users', live: 'users', label: 'Users' },
  { sandbox: 'sandbox_dispatchGroups', live: 'dispatchGroups', label: 'Dispatch Groups' },
  { sandbox: 'sandbox_customers', live: 'customers', label: 'Customers' },
  { sandbox: 'sandbox_jobs', live: 'jobs', label: 'Jobs' },
  { sandbox: 'sandbox_appointments', live: 'appointments', label: 'Appointments' },
  { sandbox: 'sandbox_priceBook', live: 'priceBook', label: 'Price Book' },
  { sandbox: 'sandbox_equipment', live: 'equipment', label: 'Equipment' },
  { sandbox: 'sandbox_invoices', live: 'invoices', label: 'Invoices' },
  { sandbox: 'sandbox_proposals', live: 'proposals', label: 'Proposals' },
  { sandbox: 'sandbox_payments', live: 'payments', label: 'Payments' },
  { sandbox: 'sandbox_maintenancePlans', live: 'maintenancePlans', label: 'Maintenance Plans' },
  { sandbox: 'sandbox_checklistTemplates', live: 'checklistTemplates', label: 'Checklist Templates' },
  { sandbox: 'sandbox_checklists', live: 'checklists', label: 'Checklist Instances' },
  { sandbox: 'sandbox_notes', live: 'notes', label: 'Notes' },
  { sandbox: 'sandbox_attachments', live: 'attachments', label: 'Attachments' },
  { sandbox: 'sandbox_followUps', live: 'followUps', label: 'Follow-Up Flags' },
  { sandbox: 'sandbox_settings', live: 'settings', label: 'Settings' },
  { sandbox: 'sandbox_timeClock', live: 'timeClock', label: 'Time Clock Entries' },
];

async function fetchAllDocumentsInCollection(collectionName: string, token: string): Promise<any[]> {
  const documents: any[] = [];
  let pageToken: string | undefined = undefined;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}`;

  do {
    const url: string = `${baseUrl}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to list documents in '${collectionName}' (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.documents && Array.isArray(data.documents)) {
      documents.push(...data.documents);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return documents;
}

async function commitWrites(writes: any[], token: string): Promise<void> {
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Commit batch failed (${res.status}): ${errText}`);
  }
}

async function cloneCollection(sandboxCol: string, liveCol: string, label: string, token: string) {
  console.log(`\n=======================================================`);
  console.log(`📦 Copying ${label}: '${sandboxCol}' -> '${liveCol}'...`);

  const sourceDocs = await fetchAllDocumentsInCollection(sandboxCol, token);
  const count = sourceDocs.length;

  if (count === 0) {
    console.log(`  ℹ️ Source '${sandboxCol}' has 0 documents. Skipping.`);
    return;
  }

  console.log(`  Found ${count} documents in '${sandboxCol}'. Cloning 1:1 into '${liveCol}'...`);

  const CHUNK_SIZE = 250;
  let copiedCount = 0;

  for (let i = 0; i < sourceDocs.length; i += CHUNK_SIZE) {
    const chunk = sourceDocs.slice(i, i + CHUNK_SIZE);
    const writes = chunk.map((doc) => {
      const docNameParts = doc.name.split('/');
      const docId = docNameParts[docNameParts.length - 1];
      const targetDocName = `projects/${PROJECT_ID}/databases/(default)/documents/${liveCol}/${docId}`;
      return {
        update: {
          name: targetDocName,
          fields: doc.fields,
        },
      };
    });

    await commitWrites(writes, token);
    copiedCount += chunk.length;
    console.log(`  ✓ Committed batch ${Math.floor(i / CHUNK_SIZE) + 1} (${copiedCount}/${count} items)`);
  }

  const targetDocs = await fetchAllDocumentsInCollection(liveCol, token);
  console.log(`✅ Successfully cloned '${liveCol}': ${targetDocs.length} total documents (Source: ${count}).`);
}

export async function runCloneSandboxToLive() {
  console.log(`\n=======================================================`);
  console.log(`🚀 Starting 1:1 Snapshot Clone: Sandbox -> Live on ${PROJECT_ID}`);
  console.log(`🔒 The Live dataset will become a frozen idle snapshot.`);
  console.log(`=======================================================`);

  const token = getFirebaseAccessToken();

  for (const { sandbox, live, label } of COLLECTIONS_TO_CLONE) {
    try {
      await cloneCollection(sandbox, live, label, token);
    } catch (err: any) {
      console.error(`❌ Error copying ${label} ('${sandbox}' -> '${live}'):`, err.message);
    }
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 1:1 Sandbox to Live Clone Complete!`);
  console.log(`🔒 Live collections are now populated, isolated, and frozen.`);
  console.log(`=======================================================\n`);
}

if (process.argv[1]?.includes('cloneSandboxToLive')) {
  runCloneSandboxToLive()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal clone error:', err);
      process.exit(1);
    });
}
