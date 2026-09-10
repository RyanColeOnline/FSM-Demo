import { FirestoreDomainClient } from '../firestore/client';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'murphys-fsm-staging';

async function run() {
  console.log(`Auditing users in ${PROJECT_ID}...`);
  const client = FirestoreDomainClient.getInstance(PROJECT_ID);

  const liveUsers = await client.fetchUsers('live');
  console.log(`\nFound ${liveUsers.length} docs in 'users':`);
  for (const u of liveUsers) {
    console.log(` - ID: [${u.id}] | UID: [${u.uid}] | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Type: ${u.accountType}`);
  }

  const sandboxUsers = await client.fetchUsers('sandbox');
  console.log(`\nFound ${sandboxUsers.length} docs in 'sandbox_users':`);
  for (const u of sandboxUsers) {
    console.log(` - ID: [${u.id}] | UID: [${u.uid}] | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Type: ${u.accountType}`);
  }

  // Check authorized persons
  const queryUrl = (col: string) => `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=AIzaSyACnlivHZXwO_2yGO7yjlAK4XQ_XJDl26M`;
  
  const getColDocs = async (col: string) => {
    const res = await fetch(queryUrl(col), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }] } })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter(d => d.document).map(d => d.document) : [];
  };

  const sandboxAP = await getColDocs('sandbox_authorizedPersons');
  console.log(`\nFound ${sandboxAP.length} docs in 'sandbox_authorizedPersons'.`);
  if (sandboxAP.length > 0) {
    console.log('Sample sandbox_authorizedPersons:', JSON.stringify(sandboxAP[0]));
  }

  const liveAP = await getColDocs('authorizedPersons');
  console.log(`Found ${liveAP.length} docs in 'authorizedPersons'.`);
}

run().catch(console.error);
