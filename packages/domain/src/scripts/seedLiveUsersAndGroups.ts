/**
 * Live & Sandbox Firestore Seeding Script for Official Company Users & Dispatch Groups.
 * Ingests the 15 official users and 4 dispatch groups from Google Sheet specifications.
 */

import { CANONICAL_OFFICIAL_USERS } from '../mock/users';
import { CANONICAL_OFFICIAL_DISPATCH_GROUPS } from '../mock/dispatchGroups';
import { FirestoreDomainClient } from '../firestore/client';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'murphys-fsm-staging';

export async function runUsersAndGroupsSeed() {
  console.log(`=======================================================`);
  console.log(`🚀 Seeding Official Users & Dispatch Groups on: ${PROJECT_ID}`);
  console.log(`=======================================================`);

  const client = FirestoreDomainClient.getInstance(PROJECT_ID);

  // 1. Seed to Live Mode (users, dispatchGroups)
  console.log(`\n📦 [LIVE MODE] Ingesting ${CANONICAL_OFFICIAL_USERS.length} Users into 'users'...`);
  for (const user of CANONICAL_OFFICIAL_USERS) {
    const success = await client.saveUser(user, 'live');
    console.log(`  ${success ? '✓' : '✗'} User: ${user.displayName} (${user.id}) -> ${user.email}`);
  }

  console.log(`\n📦 [LIVE MODE] Ingesting ${CANONICAL_OFFICIAL_DISPATCH_GROUPS.length} Dispatch Groups into 'dispatchGroups'...`);
  for (const group of CANONICAL_OFFICIAL_DISPATCH_GROUPS) {
    const success = await client.saveDispatchGroup(group, 'live');
    console.log(`  ${success ? '✓' : '✗'} Dispatch Group: ${group.name} (${group.id}) [${group.members.join(', ')}]`);
  }

  // 2. Seed to Sandbox Mode (sandbox_users, sandbox_dispatchGroups)
  console.log(`\n📦 [SANDBOX MODE] Ingesting ${CANONICAL_OFFICIAL_USERS.length} Users into 'sandbox_users'...`);
  for (const user of CANONICAL_OFFICIAL_USERS) {
    const success = await client.saveUser(user, 'sandbox');
    console.log(`  ${success ? '✓' : '✗'} User: ${user.displayName} (${user.id}) -> ${user.email}`);
  }

  console.log(`\n📦 [SANDBOX MODE] Ingesting ${CANONICAL_OFFICIAL_DISPATCH_GROUPS.length} Dispatch Groups into 'sandbox_dispatchGroups'...`);
  for (const group of CANONICAL_OFFICIAL_DISPATCH_GROUPS) {
    const success = await client.saveDispatchGroup(group, 'sandbox');
    console.log(`  ${success ? '✓' : '✗'} Dispatch Group: ${group.name} (${group.id}) [${group.members.join(', ')}]`);
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 Users & Dispatch Groups Seed Completed Successfully!`);
  console.log(`=======================================================\n`);
}

// Execute directly if run via CLI
if (process.argv[1]?.includes('seedLiveUsersAndGroups')) {
  runUsersAndGroupsSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed Error:', err);
      process.exit(1);
    });
}
