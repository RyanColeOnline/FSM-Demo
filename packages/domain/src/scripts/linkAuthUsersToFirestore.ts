/**
 * Link Firebase Auth Users to Firestore Users Collection
 * 
 * 1. Fetch all users from Firebase Auth using auth.listUsers().
 * 2. For each auth user, find the matching document in the Firestore users collection where email == userRecord.email.
 * 3. If a matching document exists, update it with uid: userRecord.uid (and if the document ID isn't already the UID, migrate the document data to /users/{uid} and delete the old document).
 * 4. Special resolution: Updates Matt Curtsinger's email to 'curtmatt967@gmail.com' in both Auth and Firestore.
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { Firestore } from '@google-cloud/firestore';
import { OAuth2Client } from 'google-auth-library';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'murphys-fsm-staging';

function getFirebaseCredentials() {
  const configPath = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.config',
    'configstore',
    'firebase-tools.json'
  );

  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.tokens?.access_token) {
        return cfg.tokens;
      }
    } catch (e) {
      console.warn('Could not parse firebase-tools.json:', e);
    }
  }
  return null;
}

const tokens = getFirebaseCredentials();

// Clear unrelated credentials
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_APPLICATION_CREDENTIALS.includes('murphys')) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

let app: App;
let db: Firestore;

if (tokens) {
  const customCred = {
    getAccessToken: async () => ({
      access_token: tokens.access_token,
      expires_in: 3600,
    }),
  };

  app = getApps().length === 0
    ? initializeApp({ projectId: PROJECT_ID, credential: customCred })
    : getApps()[0];

  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  db = new Firestore({
    projectId: PROJECT_ID,
    authClient: oauth2Client,
  });
} else {
  app = getApps().length === 0 ? initializeApp({ projectId: PROJECT_ID }) : getApps()[0];
  db = new Firestore({ projectId: PROJECT_ID });
}

const auth = getAuth(app);

export interface MatchReportItem {
  authUid: string;
  authEmail: string;
  authDisplayName?: string;
  firestoreDocId?: string;
  firestoreEmail?: string;
  firestoreName?: string;
  status: 'EXACT_MATCH_NEEDS_MIGRATION' | 'EXACT_MATCH_ALREADY_UID' | 'MATT_SPECIAL_MIGRATION' | 'NO_MATCH_FOUND';
  actionSummary: string;
}

export async function fetchAllAuthUsers(): Promise<UserRecord[]> {
  const allUsers: UserRecord[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    allUsers.push(...listUsersResult.users);
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  return allUsers;
}

export async function fetchAllFirestoreUsers(collectionName: string = 'users') {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));
}

export async function executeMigration(collectionName: string = 'users') {
  console.log(`\n=======================================================`);
  console.log(`🚀 Starting Auth <-> Firestore Linking & Document Migration`);
  console.log(`📁 Target Firestore Collection: '${collectionName}'`);
  console.log(`🌍 Firebase Project:            '${PROJECT_ID}'`);
  console.log(`=======================================================\n`);

  // Step 0: Ensure Matt Curtsinger's Firebase Auth email is updated to curtmatt967@gmail.com
  const allAuth = await fetchAllAuthUsers();
  const mattAuth = allAuth.find(u => 
    u.uid === 'ViyQsH7E5ea7oRXC5pYjgYPaM7f1' || 
    (u.email && (u.email.includes('curtmat') || u.email.includes('curtmatt')))
  );

  if (mattAuth && mattAuth.email !== 'curtmatt967@gmail.com') {
    console.log(`🔄 Updating Matt Curtsinger Firebase Auth email: '${mattAuth.email}' -> 'curtmatt967@gmail.com'...`);
    await auth.updateUser(mattAuth.uid, {
      email: 'curtmatt967@gmail.com',
    });
    console.log(`✓ Updated Firebase Auth email for UID: ${mattAuth.uid} to 'curtmatt967@gmail.com'`);
  }

  // Refresh auth users after update
  const authUsers = await fetchAllAuthUsers();
  const firestoreUsers = await fetchAllFirestoreUsers(collectionName);

  console.log(`Fetched ${authUsers.length} Firebase Auth users.`);
  console.log(`Fetched ${firestoreUsers.length} Firestore documents from '${collectionName}'.\n`);

  let migratedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const authUser of authUsers) {
    const authEmail = (authUser.email || '').trim().toLowerCase();
    const authUid = authUser.uid;

    // Match document
    let matchingDoc = firestoreUsers.find(
      (doc) => (doc.data.email || '').trim().toLowerCase() === authEmail
    );

    // Special fallback for Matt if Firestore still has old email or usr-3
    if (!matchingDoc && (authEmail === 'curtmatt967@gmail.com' || authUid === 'ViyQsH7E5ea7oRXC5pYjgYPaM7f1')) {
      matchingDoc = firestoreUsers.find(
        (doc) => doc.id === 'usr-3' || (doc.data.email || '').includes('curtmat')
      );
    }

    if (!matchingDoc) {
      console.warn(`⚠️  No matching Firestore doc found for Auth user: ${authUser.email} (${authUid})`);
      skippedCount++;
      continue;
    }

    const oldDocId = matchingDoc.id;
    const oldDocData = matchingDoc.data;

    try {
      if (oldDocId === authUid) {
        // Already using UID as document ID
        const docRef = db.collection(collectionName).doc(authUid);
        await docRef.update({
          uid: authUid,
          email: authUser.email,
          updatedAt: new Date().toISOString(),
        });
        console.log(`✓ [IN-PLACE UPDATE] /${collectionName}/${authUid} -> Email: ${authUser.email}, uid: ${authUid}`);
        updatedCount++;
      } else {
        // Document ID needs migration from usr-X to authUid
        const oldDocRef = db.collection(collectionName).doc(oldDocId);
        const newDocRef = db.collection(collectionName).doc(authUid);

        const newDocData = {
          ...oldDocData,
          id: authUid,
          uid: authUid,
          email: authUser.email, // Standardize to the exact Auth email
          migratedFromId: oldDocId,
          migratedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const batch = db.batch();
        batch.set(newDocRef, newDocData);
        batch.delete(oldDocRef);
        await batch.commit();

        console.log(`✨ [MIGRATED] ${(authUser.email || '').padEnd(35)} : /${collectionName}/${oldDocId} -> /${collectionName}/${authUid}`);
        migratedCount++;
      }
    } catch (err: any) {
      console.error(`❌ ERROR processing user '${authUser.email || ''}' (${oldDocId} -> ${authUid}):`, err.message || err);
      errorCount++;
    }
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 Migration Completed for '${collectionName}'!`);
  console.log(`  - Migrated Documents (Created /users/{uid} & Deleted old doc): ${migratedCount}`);
  console.log(`  - Updated in Place:                                            ${updatedCount}`);
  console.log(`  - Skipped:                                                     ${skippedCount}`);
  console.log(`  - Errors:                                                      ${errorCount}`);
  console.log(`=======================================================\n`);

  // Final verification check
  const postSnapshot = await db.collection(collectionName).get();
  console.log(`🔍 Post-Migration Verification:`);
  console.log(`Total documents in '/${collectionName}': ${postSnapshot.docs.length}`);
  postSnapshot.docs.forEach((d) => {
    const data = d.data();
    console.log(`  * Doc ID: ${d.id.padEnd(30)} Email: ${(data.email || '').padEnd(35)} Name: ${(data.name || data.displayName || '').padEnd(20)} UID: ${data.uid || '(MISSING)'}`);
  });
}

// CLI Execution
if (process.argv[1]?.includes('linkAuthUsersToFirestore')) {
  const collectionArg = process.argv.find((a) => a.startsWith('--collection='))?.split('=')[1] || 'users';
  executeMigration(collectionArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal Execution Error:', err);
      process.exit(1);
    });
}
