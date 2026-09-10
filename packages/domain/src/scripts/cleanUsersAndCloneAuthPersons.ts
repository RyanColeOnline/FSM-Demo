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

// Complete canonical mapping of all 15 staff members with exact official groups, account types, and contact numbers
const USER_MAPPING = [
  // Admins
  { uid: 'DtSwSvfAHcUHYTgWYyMoxOjO4Xp1', email: 'justinlung@murphyshomeservices.com', name: 'Justin Lung', firstName: 'Justin', lastName: 'Lung', mobilePhone: '(850) 797-5086', homePhone: '', accessCode: '12345', techSkillLevel: '2 (Veteran)', accountType: 'admin' as const, role: 'Admin' as const, dispatchGroups: ['Appliance Techs'], title: 'President / System Admin' },
  { uid: '2bcPatWBofQ1cunlNVIH88sqgTo2', email: 'jr@murphyshomeservices.com', name: 'Andrew (Jr) Murphy', firstName: 'Andrew (Jr)', lastName: 'Murphy', mobilePhone: '(850) 699-2477', homePhone: '(850) 650-1089', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'admin' as const, role: 'Admin' as const, dispatchGroups: ['HVAC Techs'], title: 'Vice President' },
  { uid: 'UcrNv9sV8ze4N8ZRyPAjnnSPeeK2', email: 'nancy@murphyshomeservices.com', name: 'Nancy Murphy', firstName: 'Nancy', lastName: 'Murphy', mobilePhone: '(850) 685-3905', homePhone: '(850) 650-1089', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'admin' as const, role: 'Admin' as const, dispatchGroups: ['Office Staff'], title: 'Operations Director' },

  // Office Staff
  { uid: 'v3kdSQRts0Oh0ocYaLaHFCX8IA12', email: 'justin@murphyshomeservices.com', name: 'Justin Dunlap', firstName: 'Justin', lastName: 'Dunlap', mobilePhone: '(850) 650-1089', homePhone: '', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'office' as const, role: 'Office' as const, dispatchGroups: ['Office Staff'], title: 'Dispatch & Operations Specialist' },
  { uid: 'oipWhOfkutde5xbpIteUzCjt6fk1', email: 'amanda@murphyshomeservices.com', name: 'Amanda Hoover', firstName: 'Amanda', lastName: 'Hoover', mobilePhone: '', homePhone: '', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'office' as const, role: 'Office' as const, dispatchGroups: ['Office Staff'], title: 'Office Manager' },
  { uid: '44PrQzBg5FV2GGFmXwNlSrHveRg2', email: 'appliances@murphyshomeservices.com', name: 'Danny Pardo', firstName: 'Danny', lastName: 'Pardo', mobilePhone: '', homePhone: '', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'office' as const, role: 'Office' as const, dispatchGroups: ['Office Staff'], title: 'Appliance Service Manager' },

  // Field Techs
  { uid: 'cWmYG7DXVPRp471lLSijaz3jmY02', email: '8504200991m@gmail.com', name: 'Joe Colacino', firstName: 'Joe', lastName: 'Colacino', mobilePhone: '(850) 420-0991', homePhone: '', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['HVAC Techs'], title: 'Lead HVAC Technician' },
  { uid: 'lAqLXzM0fhds6Lxz3uANaPqQwHf1', email: 'minorcover@gmail.com', name: 'Minor Cover', firstName: 'Minor', lastName: 'Cover', mobilePhone: '(850) 467-1474', homePhone: '', accessCode: '', techSkillLevel: '1 (Rookie)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['Appliance Techs'], title: 'Appliance Technician' },
  { uid: 'ViyQsH7E5ea7oRXC5pYjgYPaM7f1', email: 'curtmatt967@gmail.com', name: 'Matt Curtsinger', firstName: 'Matt', lastName: 'Curtsinger', mobilePhone: '', homePhone: '', accessCode: '', techSkillLevel: '1 (Rookie)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['Installer'], title: 'Lead HVAC & Duct Installer' },
  { uid: 'vAbfD8bZMTbEberUqBwjxUFpOcp2', email: '8502590012m@gmail.com', name: 'Robert Hudson', firstName: 'Robert', lastName: 'Hudson', mobilePhone: '(850) 259-0012', homePhone: '', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['HVAC Techs'], title: 'HVAC Specialist' },
  { uid: 'KTTXH5JfG3Vqk1BrpfiGcbS0d5X2', email: 'liljon081405@gmail.com', name: 'Jon Martin', firstName: 'Jon', lastName: 'Martin', mobilePhone: '', homePhone: '', accessCode: '', techSkillLevel: '1 (Rookie)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['Installer'], title: 'HVAC Installation Assistant' },
  { uid: '4aC4YshdCbTjGG1vOA5Ysds2yWL2', email: 'saethanmitchell@gmail.com', name: 'Ethan Mitchell', firstName: 'Ethan', lastName: 'Mitchell', mobilePhone: '', homePhone: '', accessCode: '', techSkillLevel: '1 (Rookie)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['HVAC Techs'], title: 'HVAC Maintenance Technician' },
  { uid: 'HJeKRAGukDSCdw2HHmPeEVtmI6P2', email: '8506056069m@gmail.com', name: 'Ethan Murphy', firstName: 'Ethan', lastName: 'Murphy', mobilePhone: '(850) 605-6069', homePhone: '', accessCode: '', techSkillLevel: '1 (Rookie)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['Installer'], title: 'Installation Specialist' },
  { uid: 'cqeZr0nuQ8SkzWEFrUwYVc95lOC2', email: 'christiannguyen908@yahoo.com', name: 'Christian Nguyen', firstName: 'Christian', lastName: 'Nguyen', mobilePhone: '', homePhone: '', accessCode: '', techSkillLevel: '1 (Rookie)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['Installer'], title: 'Installer' },
  { uid: 'H0k7o55IVebWi112yiOu3dl1amr2', email: '8506990384m@gmail.com', name: 'Wes Rykoskey', firstName: 'Wes', lastName: 'Rykoskey', mobilePhone: '(850) 899-0384', homePhone: '', accessCode: '', techSkillLevel: '2 (Veteran)', accountType: 'field' as const, role: 'Field' as const, dispatchGroups: ['Appliance Techs'], title: 'Senior Appliance Specialist' },
];

function getDefaultPermissions(accountType: 'admin' | 'office' | 'field', name: string) {
  const role: 'Admin' | 'Office' | 'Field' = accountType === 'admin' ? 'Admin' : accountType === 'office' ? 'Office' : 'Field';
  const isAdmin = accountType === 'admin';
  const isOffice = accountType === 'office';
  const isRestrictedSettings = name === 'Justin Dunlap' || name === 'Danny Pardo';

  return {
    accountType: role,
    appointmentVisibility: 'All appointments',
    allCustomerVisibility: true,
    reportingTabVisibility: isAdmin || isOffice,
    moreAppsAndSettingsVisibility: isAdmin || (isOffice && !isRestrictedSettings),
    manuallyEnterCards: true,
    manageRecurringPayments: isAdmin,
    performCreditsAndVoids: true,
    performFinancingActions: true,
    receiptCopyRecipients: ['This User'],
    scheduleEventsPermission: 'Can Schedule All Events',
    editPricesAndTaxOnMobile: true,
    createCustomLineItems: true,
    viewJobPnL: true,
  };
}

function toFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (Array.isArray(v)) {
      fields[k] = { arrayValue: { values: v.map((item) => toFirestoreFields({ item }).item) } };
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
    }
  }
  return fields;
}

async function fetchAllDocumentsInCollection(collectionName: string): Promise<any[]> {
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=AIzaSyACnlivHZXwO_2yGO7yjlAK4XQ_XJDl26M`;
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collectionName }] } }),
  });
  if (!res.ok) {
    throw new Error(`Failed to query collection ${collectionName}: ${await res.text()}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data.filter((d) => d.document).map((d) => d.document) : [];
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

async function cleanUsersCollection(collectionName: string, token: string) {
  console.log(`\n=======================================================`);
  console.log(`🧹 Normalizing and de-duplicating '${collectionName}' collection...`);

  // 1. Write canonical UID documents
  const setWrites = USER_MAPPING.map((user) => {
    const permissions = getDefaultPermissions(user.accountType, user.name);
    const targetDocName = `projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}/${user.uid}`;
    const initials = ((user.firstName.charAt(0) || '') + (user.lastName.charAt(0) || '')).toUpperCase();
    const data = {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.name,
      name: user.name,
      initials,
      mobilePhone: user.mobilePhone,
      phone: user.mobilePhone,
      homePhone: user.homePhone,
      accessNumber: user.accessCode,
      accessCode: user.accessCode,
      techSkillLevel: user.techSkillLevel,
      role: user.role,
      accountType: user.accountType,
      dispatchGroups: user.dispatchGroups,
      dispatchGroup: user.dispatchGroups[0],
      title: user.title,
      isActive: true,
      status: 'Active',
      clockStatus: 'Clocked Out',
      permissions,
      deviceProfile: {
        mapsPreference: 'Apple Maps',
        appTheme: 'System',
      },
      updatedAt: new Date().toISOString(),
    };
    return {
      update: {
        name: targetDocName,
        fields: toFirestoreFields(data),
      },
    };
  });

  await commitWrites(setWrites, token);
  console.log(`  ✓ Written ${USER_MAPPING.length} canonical UID documents to '${collectionName}'.`);

  // 2. Remove legacy usr-* documents
  const existingDocs = await fetchAllDocumentsInCollection(collectionName);
  const deleteWrites: any[] = [];

  for (const doc of existingDocs) {
    const docId = doc.name.split('/').pop();
    if (docId && docId.startsWith('usr-')) {
      deleteWrites.push({
        delete: doc.name,
      });
    }
  }

  if (deleteWrites.length > 0) {
    await commitWrites(deleteWrites, token);
    console.log(`  ✓ Deleted ${deleteWrites.length} legacy duplicate usr-* documents from '${collectionName}'.`);
  }

  const finalDocs = await fetchAllDocumentsInCollection(collectionName);
  console.log(`✅ '${collectionName}' now has ${finalDocs.length} clean, authenticated user documents.`);
}

async function cloneAuthorizedPersons(token: string) {
  console.log(`\n=======================================================`);
  console.log(`📦 Copying Authorized Persons: 'sandbox_authorizedPersons' -> 'authorizedPersons'...`);

  const sourceDocs = await fetchAllDocumentsInCollection('sandbox_authorizedPersons');
  const count = sourceDocs.length;
  console.log(`  Found ${count} documents in 'sandbox_authorizedPersons'.`);

  if (count === 0) return;

  const CHUNK_SIZE = 250;
  let copiedCount = 0;

  for (let i = 0; i < sourceDocs.length; i += CHUNK_SIZE) {
    const chunk = sourceDocs.slice(i, i + CHUNK_SIZE);
    const writes = chunk.map((doc) => {
      const docId = doc.name.split('/').pop();
      const targetDocName = `projects/${PROJECT_ID}/databases/(default)/documents/authorizedPersons/${docId}`;
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

  const targetDocs = await fetchAllDocumentsInCollection('authorizedPersons');
  console.log(`✅ Finished 'authorizedPersons': ${targetDocs.length} total documents.`);
}

async function main() {
  console.log(`=======================================================`);
  console.log(`🚀 Starting Users De-duplication & AuthorizedPersons Clone on ${PROJECT_ID}`);
  console.log(`=======================================================`);

  const token = getFirebaseAccessToken();

  // 1. Clean both 'users' and 'sandbox_users'
  await cleanUsersCollection('users', token);
  await cleanUsersCollection('sandbox_users', token);

  // 2. Clone authorized persons 1:1
  await cloneAuthorizedPersons(token);

  console.log(`\n=======================================================`);
  console.log(`🎉 Operations Completed Successfully!`);
  console.log(`=======================================================\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
