/**
 * WEX Historical Customer Data ETL & Firestore Importer
 * 
 * Imports 16,463 historical customer records from WEX FSM export:
 * 'data/wex_exports/customers/WEX customer report.csv'
 * 
 * Capabilities:
 * - Reads UTF-16 TSV format with multiline cells.
 * - Standardizes Customer Number as primary ID (e.g., '49591').
 * - Preserves WEX internal ID and legacy GUIDs ('wexCustomerId', 'legacyId').
 * - Disambiguates duplicate Customer Numbers.
 * - Sanitizes and formats phone numbers (extracts Mobile vs Home vs Office).
 * - Sanitizes multi-line addresses into structured street, addr2, city, state, zip.
 * - Parses financial metrics (Total Invoiced, Total Proposed) into structured 'financials' for Looker.
 * - Embeds 'wexMetadata' for full historical auditability and cohort analytics.
 * - Safe by default: writes to 'sandbox_customers' (mode=sandbox) unless explicitly set to mode=live.
 * - Supports --dry-run and --export-json.
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CanonicalCustomer, CanonicalAddress } from '../types/customer';

// Helper to format US phone number: 10 digits -> (XXX) XXX-XXXX
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim();
}

// Parses WEX multiline phone block: e.g. "M:4144188867\nH:8502258351"
export function parseWexPhones(rawBlock: string): {
  primaryPhone: string;
  mobilePhone: string | null;
  homePhone: string | null;
} {
  if (!rawBlock || !rawBlock.trim()) {
    return { primaryPhone: '', mobilePhone: null, homePhone: null };
  }

  const lines = rawBlock
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let mobilePhone: string | null = null;
  let homePhone: string | null = null;
  const otherPhones: string[] = [];

  for (const line of lines) {
    if (/^[Mm]:/i.test(line)) {
      const formatted = formatPhoneNumber(line.replace(/^[Mm]:/i, '').trim());
      if (formatted) mobilePhone = formatted;
    } else if (/^[Hh]:/i.test(line)) {
      const formatted = formatPhoneNumber(line.replace(/^[Hh]:/i, '').trim());
      if (formatted) homePhone = formatted;
    } else if (/^[OoWwFf]:/i.test(line)) {
      const formatted = formatPhoneNumber(line.replace(/^[OoWwFf]:/i, '').trim());
      if (formatted) otherPhones.push(formatted);
    } else {
      const formatted = formatPhoneNumber(line);
      if (formatted) otherPhones.push(formatted);
    }
  }

  const primaryPhone = mobilePhone || homePhone || (otherPhones.length > 0 ? otherPhones[0] : '');

  return {
    primaryPhone,
    mobilePhone,
    homePhone,
  };
}

// Parses currency string e.g. "$1,420.00" -> 1420.00
export function parseCurrency(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parses date string e.g. "8/05/2026" -> ISO string "2026-08-05T00:00:00.000Z"
export function parseWexDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      return d.toISOString();
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// TSV line tokenizer handling multiline quoted fields and UTF-16
export function parseTsvContent(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === '\t' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface WexRawRow {
  index: number;
  customerCreationDate: string;
  customerNumber: string;
  name: string;
  businessName: string;
  firstName: string;
  lastName: string;
  customerType: string;
  defaultBillingAddress: string;
  billingAddress1: string;
  billingAddress2: string;
  billingAddress3: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  locationAddress: string;
  locationAddress1: string;
  locationAddress2: string;
  locationAddress3: string;
  locationCity: string;
  locationState: string;
  locationZip: string;
  maintenancePlanStatus: string;
  email: string;
  phone: string;
  referralSource: string;
  lastVisitDate: string;
  customerStatus: string;
  customerId: string;
  totalInvoiced: string;
  totalProposed: string;
}

export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanUndefined(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

export function transformWexRowToCanonical(
  raw: WexRawRow,
  duplicateCounts: Map<string, number>
): CanonicalCustomer {
  const rawCustNum = raw.customerNumber.trim();
  const seenCount = (duplicateCounts.get(rawCustNum) || 0) + 1;
  duplicateCounts.set(rawCustNum, seenCount);

  // Disambiguate if Customer Number is duplicate
  const customerNumber = seenCount === 1 ? rawCustNum : `${rawCustNum}-${seenCount}`;
  const id = customerNumber;

  const { primaryPhone, mobilePhone, homePhone } = parseWexPhones(raw.phone);

  const customerType = raw.customerType.toLowerCase().includes('commercial')
    ? 'commercial'
    : 'residential';

  // Primary Service Location Address
  const primaryLocStreet = raw.locationAddress1.trim() || raw.locationAddress.split('\n')[0]?.trim() || 'No street provided';
  const primaryLocAddr2 = raw.locationAddress2.trim() || raw.locationAddress3.trim() || '';
  const primaryLocCity = raw.locationCity.trim() || 'Santa Rosa Beach';
  const primaryLocState = raw.locationState.trim() || 'FL';
  const primaryLocZip = raw.locationZip.trim() || '32459';

  const address: CanonicalAddress = {
    id: 'loc-1',
    street: primaryLocStreet,
    addr2: primaryLocAddr2,
    addressLine2: primaryLocAddr2,
    street2: primaryLocAddr2,
    city: primaryLocCity,
    state: primaryLocState,
    zipCode: primaryLocZip,
    type: customerType,
    isDefault: true,
    description: '',
  };

  const locations: CanonicalAddress[] = [address];

  // Billing Address
  let billingAddress: CanonicalAddress | null = null;
  const billingStreet = raw.billingAddress1.trim() || raw.defaultBillingAddress.split('\n')[0]?.trim() || '';
  if (billingStreet) {
    const billingAddr2 = raw.billingAddress2.trim() || raw.billingAddress3.trim() || '';
    billingAddress = {
      id: 'b-1',
      street: billingStreet,
      addr2: billingAddr2,
      addressLine2: billingAddr2,
      street2: billingAddr2,
      city: raw.billingCity.trim() || primaryLocCity,
      state: raw.billingState.trim() || primaryLocState,
      zipCode: raw.billingZip.trim() || primaryLocZip,
      type: customerType,
      isDefault: true,
      description: 'Primary Billing',
    };
  }

  // Quickbooks name: "LastName, FirstName" or Name
  const firstName = raw.firstName.trim();
  const lastName = raw.lastName.trim();
  const qbName = lastName && firstName ? `${lastName}, ${firstName}` : raw.name.trim();

  // Financial metrics for Looker
  const totalInvoiced = parseCurrency(raw.totalInvoiced);
  const totalProposed = parseCurrency(raw.totalProposed);

  // Timestamps
  const createdAt = parseWexDate(raw.customerCreationDate) || new Date().toISOString();
  const lastVisitDate = parseWexDate(raw.lastVisitDate);

  const customerStatus = raw.customerStatus.trim() === 'Inactive'
    ? 'Inactive'
    : raw.customerStatus.trim() === 'On Hold'
    ? 'Account on Hold'
    : 'Active';

  const rawDoc: CanonicalCustomer = {
    id,
    customerNumber,
    accountNumber: customerNumber,
    wexCustomerId: raw.customerId.trim(),
    legacyId: raw.customerId.trim(),
    name: raw.name.trim(),
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    businessName: raw.businessName.trim() || undefined,
    qbName,
    email: raw.email.trim() ? raw.email.trim() : null,
    phone: primaryPhone,
    mobilePhone,
    homePhone,
    customerType,
    customerStatus,
    autoSyncStatus: 'Synced',
    paymentTerms: 'Due upon Receipt',
    referralSource: raw.referralSource.trim() || undefined,
    maintenancePlanStatus: raw.maintenancePlanStatus.trim() || undefined,
    lastVisitDate: lastVisitDate || undefined,
    address,
    locations,
    billingAddress,
    financials: {
      totalInvoiced,
      totalProposed,
      currency: 'USD',
    },
    wexMetadata: {
      index: raw.index,
      customerCreationDate: raw.customerCreationDate.trim(),
      rawBillingAddress: raw.defaultBillingAddress.trim(),
      rawLocationAddress: raw.locationAddress.trim(),
      importedAt: new Date().toISOString(),
      batchVersion: 'WEX-EXPORT-2026-08-05',
    },
    createdAt,
    updatedAt: new Date().toISOString(),
  };

  return cleanUndefined(rawDoc);
}

export async function runWexCustomerImport(options: {
  filePath?: string;
  mode?: 'sandbox' | 'live';
  dryRun?: boolean;
  exportJsonPath?: string;
}) {
  const targetMode = options.mode || 'sandbox';
  const isDryRun = options.dryRun ?? false;
  const csvPath = options.filePath || path.resolve(__dirname, '../../../../data/wex_exports/customers/WEX customer report.csv');

  console.log('================================================================');
  console.log(`?? Starting WEX Historical Customer Import`);
  console.log(`?? Source: ${csvPath}`);
  console.log(`?? Mode: ${targetMode.toUpperCase()} (Dry Run: ${isDryRun})`);
  console.log('================================================================\n');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Source CSV file not found at: ${csvPath}`);
  }

  // Read UTF-16 file
  console.log('? Reading and tokenizing UTF-16 TSV file...');
  const buffer = fs.readFileSync(csvPath);
  const content = buffer.toString('utf16le');
  const rows = parseTsvContent(content);

  console.log(`? Total raw parsed rows: ${rows.length}`);

  if (rows.length < 2) {
    throw new Error('CSV file is empty or missing data rows.');
  }

  const headers = rows[0].map((h) => h.trim());
  console.log(`? Detected ${headers.length} headers: ${headers.slice(0, 8).join(', ')}...`);

  const duplicateCounts = new Map<string, number>();
  const canonicalCustomers: CanonicalCustomer[] = [];

  let totalInvoicedSum = 0;
  let totalProposedSum = 0;
  let phoneCount = 0;
  let emailCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const raw: WexRawRow = {
      index: parseInt(r[0] || `${i}`, 10),
      customerCreationDate: r[1] || '',
      customerNumber: r[2] || '',
      name: r[3] || '',
      businessName: r[4] || '',
      firstName: r[5] || '',
      lastName: r[6] || '',
      customerType: r[7] || 'Residential',
      defaultBillingAddress: r[8] || '',
      billingAddress1: r[9] || '',
      billingAddress2: r[10] || '',
      billingAddress3: r[11] || '',
      billingCity: r[12] || '',
      billingState: r[13] || '',
      billingZip: r[14] || '',
      locationAddress: r[15] || '',
      locationAddress1: r[16] || '',
      locationAddress2: r[17] || '',
      locationAddress3: r[18] || '',
      locationCity: r[19] || '',
      locationState: r[20] || '',
      locationZip: r[21] || '',
      maintenancePlanStatus: r[22] || '',
      email: r[23] || '',
      phone: r[24] || '',
      referralSource: r[25] || '',
      lastVisitDate: r[26] || '',
      customerStatus: r[27] || 'Active',
      customerId: r[28] || '',
      totalInvoiced: r[29] || '$0.00',
      totalProposed: r[30] || '$0.00',
    };

    if (!raw.name.trim() && !raw.customerNumber.trim()) {
      continue;
    }

    const customer = transformWexRowToCanonical(raw, duplicateCounts);
    canonicalCustomers.push(customer);

    if (customer.financials) {
      totalInvoicedSum += customer.financials.totalInvoiced;
      totalProposedSum += customer.financials.totalProposed;
    }
    if (customer.phone) phoneCount++;
    if (customer.email) emailCount++;
  }

  console.log('\n?? Data Validation & Transformation Summary:');
  console.log(`   Successfully Transformed: ${canonicalCustomers.length.toLocaleString()} customers`);
  console.log(`   Customers with Phone:     ${phoneCount.toLocaleString()} (${((phoneCount / canonicalCustomers.length) * 100).toFixed(1)}%)`);
  console.log(`   Customers with Email:     ${emailCount.toLocaleString()} (${((emailCount / canonicalCustomers.length) * 100).toFixed(1)}%)`);
  console.log(`   Lifetime Invoiced Volume: $${totalInvoicedSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   Lifetime Proposed Volume: $${totalProposedSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  // Check duplicate Customer Numbers
  const dupes = Array.from(duplicateCounts.entries()).filter(([_, count]) => count > 1);
  if (dupes.length > 0) {
    console.log(`   Handled Disambiguation for Duplicate Customer Numbers:`);
    for (const [cNum, count] of dupes) {
      console.log(`    - Customer #${cNum} (${count} occurrences) -> disambiguated`);
    }
  }

  // Print sample customer
  console.log('\n?? Sample Transformed Customer Document (#1):');
  console.log(JSON.stringify(canonicalCustomers[0], null, 2));

  // Export JSON if requested
  if (options.exportJsonPath) {
    const exportFile = path.resolve(process.cwd(), options.exportJsonPath);
    fs.writeFileSync(exportFile, JSON.stringify(canonicalCustomers, null, 2), 'utf-8');
    console.log(`\n?? Saved JSON export (${canonicalCustomers.length} records) to: ${exportFile}`);
  }

  if (isDryRun) {
    console.log('\n? DRY RUN complete. No database writes were performed.');
    return canonicalCustomers;
  }

  // Firestore Ingestion
  const targetCollection = targetMode === 'sandbox' ? 'sandbox_customers' : 'customers';
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'murphys-fsm-staging';

  console.log(`\n?? Ingesting ${canonicalCustomers.length.toLocaleString()} documents into Firestore collection '${targetCollection}' on project '${projectId}'...`);

  const app = getApps().length === 0 ? initializeApp({ projectId }) : getApps()[0];
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  const BATCH_CHUNK_SIZE = 400;
  const totalBatches = Math.ceil(canonicalCustomers.length / BATCH_CHUNK_SIZE);

  for (let i = 0; i < canonicalCustomers.length; i += BATCH_CHUNK_SIZE) {
    const chunk = canonicalCustomers.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = db.batch();

    for (const cust of chunk) {
      const docRef = db.collection(targetCollection).doc(cust.id);
      batch.set(docRef, cust as any, { merge: true });
    }

    await batch.commit();
    const batchNum = Math.floor(i / BATCH_CHUNK_SIZE) + 1;
    const pct = ((batchNum / totalBatches) * 100).toFixed(1);
    console.log(`  ? Committed batch ${batchNum} of ${totalBatches} (${chunk.length} items - ${pct}%)`);
  }

  console.log(`\n?? Successfully imported ${canonicalCustomers.length.toLocaleString()} customers into '${targetCollection}'!`);
  return canonicalCustomers;
}

// CLI execution handler
if (require.main === module || process.argv[1]?.includes('importWexCustomers')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const liveMode = args.includes('--mode=live');
  const exportJsonArg = args.find((a) => a.startsWith('--export-json='));
  const exportJsonPath = exportJsonArg ? exportJsonArg.split('=')[1] : (args.includes('--export-json') ? 'wex_customers_canonical.json' : undefined);

  runWexCustomerImport({
    mode: liveMode ? 'live' : 'sandbox',
    dryRun,
    exportJsonPath,
  }).catch((err) => {
    console.error('? Import failed:', err);
    process.exit(1);
  });
}
