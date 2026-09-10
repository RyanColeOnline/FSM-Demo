/**
 * Normalize accountType and role across all Firestore /users documents.
 * Ensures Justin Lung, Andrew (Jr) Murphy, Nancy Murphy have accountType: 'admin'.
 * Ensures Justin Dunlap, Amanda Hoover, Danny Pardo have accountType: 'office'.
 * Ensures all technicians have accountType: 'field'.
 */

import { FirestoreDomainClient } from '../firestore/client';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'murphys-fsm-staging';

const USER_ROLE_MAP: Record<string, { accountType: 'admin' | 'office' | 'field'; roleName: string }> = {
  // Admins
  'DtSwSvfAHcUHYTgWYyMoxOjO4Xp1': { accountType: 'admin', roleName: 'Admin' }, // Justin Lung
  '2bcPatWBofQ1cunlNVIH88sqgTo2': { accountType: 'admin', roleName: 'Admin' }, // Andrew (Jr) Murphy
  'UcrNv9sV8ze4N8ZRyPAjnnSPeeK2': { accountType: 'admin', roleName: 'Admin' }, // Nancy Murphy

  // Office Staff
  'v3kdSQRts0Oh0ocYaLaHFCX8IA12': { accountType: 'office', roleName: 'Office' }, // Justin Dunlap
  'oipWhOfkutde5xbpIteUzCjt6fk1': { accountType: 'office', roleName: 'Office' }, // Amanda Hoover
  '44PrQzBg5FV2GGFmXwNlSrHveRg2': { accountType: 'office', roleName: 'Office' }, // Danny Pardo

  // Field Techs
  'cWmYG7DXVPRp471lLSijaz3jmY02': { accountType: 'field', roleName: 'Field' }, // Joe Colacino
  'lAqLXzM0fhds6Lxz3uANaPqQwHf1': { accountType: 'field', roleName: 'Field' }, // Minor Cover
  'ViyQsH7E5ea7oRXC5pYjgYPaM7f1': { accountType: 'field', roleName: 'Field' }, // Matt Curtsinger
  'vAbfD8bZMTbEberUqBwjxUFpOcp2': { accountType: 'field', roleName: 'Field' }, // Robert Hudson
  'KTTXH5JfG3Vqk1BrpfiGcbS0d5X2': { accountType: 'field', roleName: 'Field' }, // Jon Martin
  '4aC4YshdCbTjGG1vOA5Ysds2yWL2': { accountType: 'field', roleName: 'Field' }, // Ethan Mitchell
  'HJeKRAGukDSCdw2HHmPeEVtmI6P2': { accountType: 'field', roleName: 'Field' }, // Ethan Murphy
  'cqeZr0nuQ8SkzWEFrUwYVc95lOC2': { accountType: 'field', roleName: 'Field' }, // Christian Nguyen
  'H0k7o55IVebWi112yiOu3dl1amr2': { accountType: 'field', roleName: 'Field' }, // Wes Rykoskey
};

async function main() {
  console.log(`\n=======================================================`);
  console.log(`🚀 Normalizing User Roles & Account Types in Firestore`);
  console.log(`🌍 Project: ${PROJECT_ID}`);
  console.log(`=======================================================\n`);

  const client = FirestoreDomainClient.getInstance(PROJECT_ID);

  const users = await client.fetchUsers('live');
  console.log(`Fetched ${users.length} users from Firestore 'users' collection.`);

  for (const user of users) {
    const roleInfo = USER_ROLE_MAP[user.id] || {
      accountType: ((user as any).permissions?.accountType || 'field').toLowerCase().includes('admin')
        ? 'admin'
        : ((user as any).permissions?.accountType || 'field').toLowerCase().includes('office')
        ? 'office'
        : 'field',
      roleName: ((user as any).permissions?.accountType || 'field').toLowerCase().includes('admin')
        ? 'Admin'
        : ((user as any).permissions?.accountType || 'field').toLowerCase().includes('office')
        ? 'Office'
        : 'Field',
    };

    const updatedUser: any = {
      ...user,
      id: user.id,
      uid: user.id,
      accountType: roleInfo.accountType,
      role: roleInfo.roleName,
      updatedAt: new Date().toISOString(),
    };

    const success = await client.saveUser(updatedUser, 'live');
    console.log(`  ${success ? '✓' : '❌'} User: ${user.name || user.displayName} (${user.id}) -> accountType: '${roleInfo.accountType}' (Role: ${roleInfo.roleName})`);
  }

  console.log(`\n🎉 All user documents normalized successfully in Firestore!\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
