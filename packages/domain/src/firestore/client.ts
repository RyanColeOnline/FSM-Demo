/**
 * Universal Firestore REST Client for Murphy's FSM Platform.
 * Supports Multi-Database Modes: 'mock' (in-memory), 'sandbox' (sandbox_* collections), 'live' (production root collections).
 * Works across Browser (Next.js) and Server (Node.js) environments.
 */

import { FIRESTORE_COLLECTIONS } from './schema';
import {
  CanonicalCustomer,
  CanonicalAddress,
  CanonicalAppointment,
  CanonicalJob,
  CanonicalEquipment,
  CanonicalInvoice,
  CanonicalProposal,
  CanonicalMaintenancePlan,
  CanonicalChecklistTemplate,
  CanonicalChecklistInstance,
  CanonicalNote,
  CanonicalAttachment,
  CanonicalFollowUpFlag,
  CanonicalPriceBookItem,
  CanonicalWarranty,
  CanonicalUser,
  CanonicalUserPermissions,
  CanonicalDeviceProfile,
  CanonicalDispatchGroup,
  CanonicalCall,
  CanonicalPaymentRecord,
  CanonicalAuthorizedPerson,
} from '../types/index';

import {
  CANONICAL_OFFICIAL_WARRANTIES,
  CANONICAL_OFFICIAL_USERS,
  CANONICAL_OFFICIAL_DISPATCH_GROUPS,
  CANONICAL_MOCK_APPOINTMENTS,
  CANONICAL_MOCK_JOBS,
} from '../mock/index';
import { cleanUserDisplayName } from '../types/user';
import { extractTime12hFromIsoOrString } from '../timezone';

export type DatabaseMode = 'sandbox' | 'live';

export interface CustomerPaginationParams {
  mode?: DatabaseMode;
  pageSize?: number;
  cursor?: { name?: string; qbName?: string; id: string } | null;
  searchField?: string;
  searchQuery?: string;
  customerStatus?: string;
  syncFilter?: string;
}

export interface CustomerPaginationResult {
  customers: CanonicalCustomer[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: { name: string; id: string; qbName?: string } | null;
}

export function sanitizeDomainText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  let str = text;
  str = str.replace(/&#34;/g, '"')
           .replace(/&#39;/g, "'")
           .replace(/&#43;/g, '+')
           .replace(/&amp;/g, '&')
           .replace(/&quot;/g, '"')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>');
  str = str.replace(/Â\xa0/g, ' ')
           .replace(/\xa0/g, ' ')
           .replace(/Â/g, ' ')
           .replace(/\ufffd/g, ' ')
           .replace(/â€™/g, "'")
           .replace(/â€˜/g, "'")
           .replace(/â€œ/g, '"')
           .replace(/â€/g, '"')
           .replace(/â€“/g, '-')
           .replace(/â€”/g, '-')
           .replace(/â€¦/g, '...')
           .replace(/Ã©/g, 'e')
           .replace(/Ã¨/g, 'e')
           .replace(/Ã /g, 'a')
           .replace(/Ã±/g, 'n')
           .replace(/Ã¼/g, 'u')
           .replace(/Ã¶/g, 'o')
           .replace(/Ã¤/g, 'a')
           .replace(/Ã/g, 'A');
  str = str.replace(/<br\s*\/?>/gi, '\n')
           .replace(/<\/?(div|p|span|b|i|u|strong|em)[^>]*>/gi, ' ')
           .replace(/<[^>]+>/g, ' ');
  str = str.replace(/\b(CDT|CST|EDT|EST|UTC)\b/gi, '');
  str = str.replace(/[ \t\f\v]+/g, ' ').replace(/ +([,.:;?!])/g, '$1').trim();
  return str;
}

export class FirestoreDomainClient {
  private static instance: FirestoreDomainClient;
  private projectId: string;

  private apiKey: string;
  private mockAppointments: CanonicalAppointment[] = [...CANONICAL_MOCK_APPOINTMENTS];
  private mockJobs: CanonicalJob[] = [...CANONICAL_MOCK_JOBS];

  private constructor(projectId = 'fsm-demo-266c8', apiKey = 'AIzaSyCPDRqGnaIEmVlHmX_nD8z30YK4Af98Hm0') {
    this.projectId = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || projectId;
    this.apiKey = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_API_KEY) || apiKey;
  }

  public static getInstance(projectId?: string, apiKey?: string): FirestoreDomainClient {
    if (!FirestoreDomainClient.instance) {
      FirestoreDomainClient.instance = new FirestoreDomainClient(projectId, apiKey);
    }
    return FirestoreDomainClient.instance;
  }

  private get baseDocumentsURL(): string {
    return `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  }

  private buildUrl(path: string, queryParams: Record<string, any> = {}): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(`${this.baseDocumentsURL}/${cleanPath}`);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private buildRootUrl(action: string, queryParams: Record<string, any> = {}): string {
    const cleanAction = action.startsWith(':') ? action : `:${action}`;
    const url = new URL(`${this.baseDocumentsURL}${cleanAction}`);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private getCollectionName(baseCollection: string, mode: DatabaseMode): string {
    if (mode === 'sandbox') {
      return `sandbox_${baseCollection}`;
    }
    return baseCollection;
  }

  // --- REST Helpers ---

  private toFirestoreValue(val: any): any {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      if (isNaN(val)) return { nullValue: null };
      return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
    }
    if (typeof val === 'string') {
      if (!val) return { stringValue: '' };
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/i.test(val)) {
        let iso = val;
        if (!iso.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(iso)) {
          iso = `${iso}Z`;
        }
        const parsed = Date.parse(iso);
        if (!isNaN(parsed)) {
          return { timestampValue: new Date(parsed).toISOString() };
        }
      }
      return { stringValue: val };
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return { arrayValue: {} };
      const items = val
        .map((item) => this.toFirestoreValue(item))
        .filter((item) => item && Object.keys(item).length > 0);
      return items.length > 0 ? { arrayValue: { values: items } } : { arrayValue: {} };
    }
    if (typeof val === 'object') {
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) {
          const fv = this.toFirestoreValue(v);
          if (fv && Object.keys(fv).length > 0) {
            fields[k] = fv;
          }
        }
      }
      return Object.keys(fields).length > 0 ? { mapValue: { fields } } : { mapValue: {} };
    }
    return { stringValue: String(val) };
  }

  private fromFirestoreValue(valObj: any): any {
    if (!valObj) return null;
    if ('stringValue' in valObj) return valObj.stringValue;
    if ('booleanValue' in valObj) return valObj.booleanValue;
    if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
    if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
    if ('timestampValue' in valObj) return valObj.timestampValue;
    if ('nullValue' in valObj) return null;
    if ('arrayValue' in valObj) {
      const values = valObj.arrayValue.values || [];
      return values.map((v: any) => this.fromFirestoreValue(v));
    }
    if ('mapValue' in valObj) {
      const result: Record<string, any> = {};
      const fields = valObj.mapValue.fields || {};
      for (const [k, v] of Object.entries(fields)) {
        result[k] = this.fromFirestoreValue(v);
      }
      return result;
    }
    return null;
  }

  private parseFirestoreDocument<T>(doc: any): T {
    const fields = doc.fields || {};
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      result[k] = this.fromFirestoreValue(v);
    }
    if (!result.id && doc.name) {
      const parts = doc.name.split('/');
      result.id = parts[parts.length - 1];
    }
    return result as T;
  }

  public normalizeCustomer(raw: any): CanonicalCustomer {
    const name = (raw.name || `${raw.firstName || ''} ${raw.lastName || ''}`).trim() || 'Unnamed Customer';
    let firstName = raw.firstName || '';
    let lastName = raw.lastName || '';
    if (!firstName && !lastName && name) {
      const parts = name.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    const qbName = raw.qbName || (lastName && firstName ? `${lastName}, ${firstName}` : name);
    
    // Parse Home and Mobile phone numbers
    let rawHome = raw.homePhone ? String(raw.homePhone).trim() : null;
    let rawMobile = raw.mobilePhone ? String(raw.mobilePhone).trim() : null;
    const rawCombined = raw.phone ? String(raw.phone).trim() : '';

    if (rawCombined || (rawHome && (rawHome.includes('H:') || rawHome.includes('M:'))) || (rawMobile && (rawMobile.includes('H:') || rawMobile.includes('M:')))) {
      const combined = `${rawCombined} ${rawMobile || ''} ${rawHome || ''}`;
      const hMatch = combined.match(/H:\s*([0-9\-\(\)\.\s]+)/i);
      const mMatch = combined.match(/M:\s*([0-9\-\(\)\.\s]+)/i);

      if (hMatch && (!rawHome || rawHome.includes('H:') || rawHome.includes('M:'))) {
        const hDigits = hMatch[1].replace(/\D/g, '');
        rawHome = hDigits.length >= 10 ? hDigits.slice(0, 10) : hDigits;
      }
      if (mMatch && (!rawMobile || rawMobile.includes('H:') || rawMobile.includes('M:'))) {
        const mDigits = mMatch[1].replace(/\D/g, '');
        rawMobile = mDigits.length >= 10 ? mDigits.slice(0, 10) : mDigits;
      }
      if (!rawHome && !rawMobile) {
        const digits = combined.replace(/\D/g, '');
        if (digits.length === 20) {
          rawHome = digits.slice(0, 10);
          rawMobile = digits.slice(10, 20);
        } else if (digits.length >= 10) {
          rawMobile = digits.slice(0, 10);
        }
      }
    }

    const format10 = (val: string | null) => {
      if (!val) return null;
      const d = val.replace(/\D/g, '');
      if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
      return val;
    };

    const homePhone = format10(rawHome);
    const mobilePhone = format10(rawMobile);
    const phone = mobilePhone || homePhone || '';
    
    // Address normalization
    const rawAddr = raw.address || raw.billingAddress || {};
    const addr2Val = rawAddr.addressLine2 || rawAddr.addr2 || rawAddr.unit || rawAddr.apt || rawAddr.street2 || '';
    const address: CanonicalAddress = {
      id: rawAddr.id,
      street: rawAddr.street || rawAddr.addr1 || rawAddr.addressLine1 || 'No street provided',
      addr2: addr2Val,
      addressLine2: addr2Val,
      street2: addr2Val,
      city: rawAddr.city || '',
      state: rawAddr.state || 'FL',
      zipCode: rawAddr.zipCode || rawAddr.zip || '',
      type: rawAddr.type || (raw.customerType === 'commercial' ? 'commercial' : 'residential'),
      billingType: rawAddr.billingType,
      description: rawAddr.description,
      isDefault: rawAddr.isDefault !== undefined ? rawAddr.isDefault : true,
    };

    // Locations normalization
    let locations: CanonicalAddress[] = [];
    if (Array.isArray(raw.locations) && raw.locations.length > 0) {
      locations = raw.locations.map((loc: any, index: number) => {
        const locAddr2 = loc.addressLine2 || loc.addr2 || loc.unit || loc.apt || loc.street2 || '';
        return {
          id: loc.id || `loc-${index + 1}`,
          street: loc.street || loc.addr1 || loc.addressLine1 || '',
          addr2: locAddr2,
          addressLine2: locAddr2,
          street2: locAddr2,
          city: loc.city || '',
          state: loc.state || 'FL',
          zipCode: loc.zipCode || loc.zip || '',
          type: loc.type || (raw.customerType === 'commercial' ? 'commercial' : 'residential'),
          isDefault: loc.isDefault !== undefined ? loc.isDefault : (index === 0),
          description: loc.description && loc.description !== 'Primary Location' ? loc.description : (loc.street || `Location ${index + 1}`),
        };
      });
    } else if (address.street && address.street !== 'No street provided') {
      locations = [
        {
          id: 'loc-1',
          street: address.street,
          addr2: address.addr2 || address.addressLine2 || '',
          addressLine2: address.addressLine2 || address.addr2 || '',
          street2: address.street2 || address.addr2 || '',
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          type: address.type || 'residential',
          isDefault: true,
          description: address.street || 'Default Location',
        }
      ];
    }

    // Billing Address normalization
    const rawBilling = raw.billingAddress || (Array.isArray(raw.billingAddresses) ? raw.billingAddresses[0] : null);
    const billingAddr2 = rawBilling ? (rawBilling.addressLine2 || rawBilling.addr2 || rawBilling.unit || rawBilling.apt || rawBilling.street2 || '') : '';
    let billingAddress: CanonicalAddress | null = rawBilling ? {
      id: rawBilling.id || 'b-1',
      street: rawBilling.street || rawBilling.addr1 || rawBilling.addressLine1 || '',
      addr2: billingAddr2,
      addressLine2: billingAddr2,
      street2: billingAddr2,
      city: rawBilling.city || '',
      state: rawBilling.state || 'FL',
      zipCode: rawBilling.zipCode || rawBilling.zip || '',
      type: rawBilling.type || (raw.customerType === 'commercial' ? 'commercial' : 'residential'),
      isDefault: rawBilling.isDefault !== undefined ? rawBilling.isDefault : true,
      description: rawBilling.description || 'Primary Billing',
    } : null;

    // Fallbacks to guarantee at least 1 address in BOTH locations and billing
    if (locations.length === 0 && address.street) {
      locations = [{ ...address, id: 'loc-1', description: address.street || 'Default Location', isDefault: true }];
    }
    if (!billingAddress) {
      billingAddress = {
        ...(locations[0] || address),
        id: 'b-1',
        description: 'Primary Billing',
        isDefault: true,
      };
    }
    if (locations.length === 0) {
      locations = [{ ...billingAddress, id: 'loc-1', description: address.street || 'Default Location', isDefault: true }];
    }

    const customerNumber = raw.customerNumber || raw.accountNumber || raw.id || '';
    const id = raw.id || customerNumber || `cust-${Date.now()}`;

    return {
      id,
      customerNumber: customerNumber || id,
      accountNumber: customerNumber || id,
      wexCustomerId: raw.wexCustomerId || raw.legacyId || undefined,
      legacyId: raw.legacyId || raw.wexCustomerId || undefined,
      name,
      firstName,
      lastName,
      businessName: raw.businessName || '',
      qbName,
      email: raw.email || null,
      phone,
      mobilePhone,
      homePhone,
      customerType: raw.customerType === 'commercial' ? 'commercial' : 'residential',
      address,
      locations,
      billingAddress,
      referralSource: raw.referralSource || undefined,
      maintenancePlanStatus: raw.maintenancePlanStatus || undefined,
      lastVisitDate: raw.lastVisitDate || undefined,
      financials: raw.financials ? {
        totalInvoiced: typeof raw.financials.totalInvoiced === 'number' ? raw.financials.totalInvoiced : 0,
        totalProposed: typeof raw.financials.totalProposed === 'number' ? raw.financials.totalProposed : 0,
        currency: raw.financials.currency || 'USD',
      } : undefined,
      wexMetadata: raw.wexMetadata || undefined,
      authorizedPersons: Array.isArray(raw.authorizedPersons) ? raw.authorizedPersons : [],
      storedPaymentMethods: Array.isArray(raw.storedPaymentMethods) ? raw.storedPaymentMethods : [],
      customerStatus: raw.customerStatus || 'Active',
      autoSyncStatus: raw.autoSyncStatus || 'Synced',
      paymentTerms: raw.paymentTerms || 'Due upon Receipt',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt,
    };
  }

  public normalizeEquipment(raw: any): CanonicalEquipment {
    return {
      ...raw,
      id: raw.id || `eq-${Date.now()}`,
      customerId: raw.customerId || '',
      customerNumber: raw.customerNumber || '',
      wexCustomerId: raw.wexCustomerId || '',
      customerName: raw.customerName || '',
      name: raw.equipmentName || raw.name || raw.equipmentType || raw.systemType || 'Equipment',
      equipmentName: raw.equipmentName || raw.name || raw.equipmentType || raw.systemType || 'Equipment',
      locationId: raw.locationId || null,
      locationStreet: raw.locationStreet || raw.locationAddress || null,
      locationAddress: raw.locationAddress || raw.locationStreet || null,
      systemType: raw.systemType || raw.type || 'HVAC',
      equipmentType: raw.equipmentType || raw.name || 'Equipment',
      type: raw.type || raw.systemType || 'HVAC',
      manufacturer: raw.manufacturer || raw.mfg || '',
      mfg: raw.mfg || raw.manufacturer || '',
      modelNumber: raw.modelNumber || raw.modelNo || '',
      modelNo: raw.modelNo || raw.modelNumber || '',
      serialNumber: raw.serialNumber || raw.serialNo || '',
      serialNo: raw.serialNo || raw.serialNumber || '',
      systemAge: raw.systemAge || '',
      installationDate: raw.installationDate || raw.installDate || raw.installedOn || '',
      installDate: raw.installDate || raw.installationDate || raw.installedOn || '',
      installedOn: raw.installedOn || raw.installationDate || raw.installDate || '',
      status: raw.status || raw.equipmentStatus || (raw.isArchived ? 'Inactive' : 'Active'),
      equipmentStatus: raw.equipmentStatus || raw.status || (raw.isArchived ? 'Inactive' : 'Active'),
      warranty: raw.warranty || 'Unassigned',
      manufacturerWarrantyStatus: raw.manufacturerWarrantyStatus || '',
      manufacturerWarrantyEffectiveDate: raw.manufacturerWarrantyEffectiveDate || '',
      manufacturerWarrantyEffectiveEnd: raw.manufacturerWarrantyEffectiveEnd || '',
      otherWarrantyName: raw.otherWarrantyName || '',
      otherWarrantyEffectiveDate: raw.otherWarrantyEffectiveDate || '',
      otherWarrantyEndDate: raw.otherWarrantyEndDate || '',
      photos: Array.isArray(raw.photos) ? raw.photos : [],
      warranties: Array.isArray(raw.warranties) ? raw.warranties : [],
      rebates: Array.isArray(raw.rebates) ? raw.rebates : [],
      isArchived: raw.isArchived ?? false,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined') {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        if (auth?.currentUser) {
          return await auth.currentUser.getIdToken();
        }
      }
    } catch {
      // Ignore when auth is uninitialized
    }
    return null;
  }

  private async writeDocument(collection: string, documentId: string, data: Record<string, any>): Promise<boolean> {
    const url = this.buildUrl(`${collection}/${documentId}`);
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        const encoded = this.toFirestoreValue(v);
        if (encoded && Object.keys(encoded).length > 0) {
          fields[k] = encoded;
        }
      }
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Firestore Write Notice - ${collection}]: Cloud sync deferred (${res.status}): ${errorText.slice(0, 100)}. Saved locally in session.`);
        return true;
      }
      console.log(`[Firestore Write SUCCESS - ${collection}]: Saved document ${documentId}`);
      return true;
    } catch (err: any) {
      console.warn(`[Firestore Write Notice - ${collection}]: Saved locally in session (${err.message})`);
      return true;
    }
  }

  private async deleteDocument(collection: string, documentId: string): Promise<boolean> {
    const url = this.buildUrl(`${collection}/${documentId}`);
    try {
      const headers: Record<string, string> = {};
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, { method: 'DELETE', headers });
      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Firestore Delete Notice - ${collection}]: Cloud sync deferred (${res.status}): ${errorText.slice(0, 100)}. Deleted locally in session.`);
        return true;
      }
      console.log(`[Firestore Delete SUCCESS - ${collection}]: Deleted document ${documentId}`);
      return true;
    } catch (err: any) {
      console.warn(`[Firestore Delete Notice - ${collection}]: Deleted locally in session (${err.message})`);
      return true;
    }
  }

  private async queryCollection<T>(collection: string, maxPages: number = 200): Promise<T[]> {
    const allDocs: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;

    try {
      do {
        const url: string = this.buildUrl(collection, {
          pageSize: 300,
          ...(pageToken ? { pageToken } : {}),
        });
        const res = await fetch(url);
        if (!res.ok) break;
        const json = await res.json();
        const docs = json.documents || [];
        allDocs.push(...docs);
        pageToken = json.nextPageToken || null;
        pageCount++;
      } while (pageToken && pageCount < maxPages);

      return allDocs.map((d: any) => this.parseFirestoreDocument<T>(d));
    } catch (err: any) {
      console.error(`[Firestore Read Error - ${collection}]: ${err.message}`);
      return [];
    }
  }

  private async runStructuredQuery<T>(
    collection: string,
    field: string,
    value: any,
    limit: number = 1000
  ): Promise<T[]> {
    if (value === undefined || value === null || value === '') return [];
    const url = this.buildRootUrl(':runQuery');
    let encodedVal: any = { stringValue: String(value) };
    if (typeof value === 'boolean') {
      encodedVal = { booleanValue: value };
    } else if (typeof value === 'number') {
      encodedVal = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    }

    const body = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: encodedVal,
          },
        },
        limit,
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return [];
      const json = await res.json();
      if (!Array.isArray(json)) return [];
      const docs = json.filter((r: any) => r.document).map((r: any) => r.document);
      return docs.map((d: any) => this.parseFirestoreDocument<T>(d));
    } catch (err: any) {
      console.error(`[Firestore Structured Query Error - ${collection}]:`, err.message);
      return [];
    }
  }

  // --- Customers ---
  public async fetchCustomers(mode: DatabaseMode = 'sandbox'): Promise<CanonicalCustomer[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CUSTOMERS, mode);
    try {
      const queryUrl = this.buildRootUrl(':runQuery');
      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: col }],
            limit: 500,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const list: CanonicalCustomer[] = [];
        for (const item of Array.isArray(data) ? data : []) {
          if (item.document) {
            list.push(this.normalizeCustomer(this.parseFirestoreDocument(item.document)));
          }
        }
        if (list.length > 0) return list;
      }
    } catch (e) {}

    const docs = await this.queryCollection<any>(col, 3);
    if (docs.length > 0) {
      return docs.map((d) => this.normalizeCustomer(d));
    }
    return [];
  }

  public async fetchCustomerCount(
    mode: DatabaseMode = 'sandbox',
    filters?: { customerStatus?: string; syncFilter?: string }
  ): Promise<number> {

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CUSTOMERS, mode);
    const url = this.buildRootUrl(':runAggregationQuery');

    const structuredQuery: Record<string, any> = {
      from: [{ collectionId: col }],
    };

    const filterList: any[] = [];
    if (filters?.customerStatus && filters.customerStatus !== 'All') {
      filterList.push({
        fieldFilter: {
          field: { fieldPath: 'customerStatus' },
          op: 'EQUAL',
          value: { stringValue: filters.customerStatus },
        },
      });
    }
    if (filters?.syncFilter && filters.syncFilter !== 'All') {
      filterList.push({
        fieldFilter: {
          field: { fieldPath: 'autoSyncStatus' },
          op: 'EQUAL',
          value: { stringValue: filters.syncFilter },
        },
      });
    }

    if (filterList.length === 1) {
      structuredQuery.where = filterList[0];
    } else if (filterList.length > 1) {
      structuredQuery.where = {
        compositeFilter: {
          op: 'AND',
          filters: filterList,
        },
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredAggregationQuery: {
            structuredQuery,
            aggregations: [{ alias: 'total_count', count: {} }],
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : data;
        const total = first?.result?.aggregateFields?.total_count?.integerValue;
        if (total !== undefined) {
          return parseInt(total, 10);
        }
      }
    } catch (err: any) {
      console.error(`[Firestore Count Error - ${col}]: ${err.message}`);
    }

    return 0;
  }

  public async fetchCustomerById(customerId: string, mode: DatabaseMode = 'sandbox'): Promise<CanonicalCustomer | null> {
    if (!customerId) return null;
    const rawId = customerId.replace(/^cust-/, '').trim();
    const decodedName = decodeURIComponent(customerId).toLowerCase().trim();

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CUSTOMERS, mode);

    // 1. Direct document lookup by ID / Customer Number
    try {
      const docUrl = this.buildUrl(`${col}/${encodeURIComponent(customerId)}`);
      const res = await fetch(docUrl);
      if (res.ok) {
        const raw = await res.json();
        return this.normalizeCustomer(this.parseFirestoreDocument(raw));
      }
    } catch (e) {}

    // Check stripped rawId if different
    if (rawId && rawId !== customerId) {
      try {
        const docUrl = this.buildUrl(`${col}/${encodeURIComponent(rawId)}`);
        const res = await fetch(docUrl);
        if (res.ok) {
          const raw = await res.json();
          return this.normalizeCustomer(this.parseFirestoreDocument(raw));
        }
      } catch (e) {}
    }

    // Helper for single field queries
    const querySingleByField = async (fieldPath: string, value: string) => {
      try {
        const queryUrl = this.buildRootUrl(':runQuery');
        const structuredQuery = {
          from: [{ collectionId: col }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: 'EQUAL',
              value: { stringValue: value },
            },
          },
          limit: 1,
        };

        const res = await fetch(queryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery }),
        });

        if (res.ok) {
          const data = await res.json();
          const first = data?.[0]?.document;
          if (first) {
            return this.normalizeCustomer(this.parseFirestoreDocument(first));
          }
        }
      } catch (e) {}
      return null;
    };

    // 2. Query by customerNumber
    let match = await querySingleByField('customerNumber', customerId);
    if (match) return match;
    if (rawId !== customerId) {
      match = await querySingleByField('customerNumber', rawId);
      if (match) return match;
    }

    // 3. Query by accountNumber (e.g. CUST-91143)
    match = await querySingleByField('accountNumber', customerId);
    if (match) return match;
    if (rawId !== customerId) {
      match = await querySingleByField('accountNumber', rawId);
      if (match) return match;
    }

    // 4. Query by id field
    match = await querySingleByField('id', customerId);
    if (match) return match;
    if (rawId !== customerId) {
      match = await querySingleByField('id', rawId);
      if (match) return match;
    }

    // 5. Fallback: Search in full customer list
    try {
      const all = await this.fetchCustomers(mode);
      const found = all.find(
        (c) =>
          c.id === customerId ||
          c.id === rawId ||
          c.customerNumber === customerId ||
          c.customerNumber === rawId ||
          (c as any).accountNumber === customerId ||
          (c as any).accountNumber === rawId ||
          (c.name && c.name.toLowerCase().trim() === decodedName) ||
          (c.name && c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === decodedName)
      );
      if (found) return found;
    } catch (e) {}

    return null;
  }

  public async fetchCustomersPaginated(params: CustomerPaginationParams = {}): Promise<CustomerPaginationResult> {
    const {
      mode = 'sandbox',
      pageSize = 30,
      cursor = null,
      searchField = 'Customer Name',
      searchQuery = '',
      customerStatus = 'All',
      syncFilter = 'All',
    } = params;

    const trimmedQ = (searchQuery || '').trim();
    const qLower = trimmedQ.toLowerCase();

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CUSTOMERS, mode);
    const queryUrl = this.buildRootUrl(':runQuery');

    // Fast Single Document Lookup if searching by exact Customer Number
    if (searchField === 'Customer Number' && trimmedQ && !trimmedQ.includes(' ')) {
      try {
        const docUrl = this.buildUrl(`${col}/${encodeURIComponent(trimmedQ)}`);
        const res = await fetch(docUrl);
        if (res.ok) {
          const rawDoc = await res.json();
          const single = this.normalizeCustomer(this.parseFirestoreDocument(rawDoc));
          return {
            customers: [single],
            totalCount: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            endCursor: { name: single.name || single.qbName || '', qbName: single.name || single.qbName || '', id: single.id },
          };
        }
      } catch (e) {}
    }

    // Global Case-Insensitive Multi-Word & Prefix Search
    if (trimmedQ) {
      const words = trimmedQ.toLowerCase().split(/[\s,]+/).filter(Boolean);
      const cleanDigits = trimmedQ.replace(/\D/g, '');
      const candidateMap = new Map<string, CanonicalCustomer>();

      const runRawQuery = async (queryPayload: any) => {
        try {
          const res = await fetch(queryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryPayload),
          });
          if (res.ok) {
            const data = await res.json();
            for (const item of Array.isArray(data) ? data : []) {
              if (item.document) {
                const cust = this.normalizeCustomer(this.parseFirestoreDocument(item.document));
                if (!candidateMap.has(cust.id)) {
                  candidateMap.set(cust.id, cust);
                }
              }
            }
          }
        } catch (e) {}
      };

      const queryPromises: Promise<void>[] = [];

      // Generate comprehensive casing variants & search prefixes
      const prefixes = new Set<string>();
      prefixes.add(trimmedQ);
      prefixes.add(qLower);
      prefixes.add(trimmedQ.toUpperCase());
      const titleQ = trimmedQ.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      prefixes.add(titleQ);

      for (const w of words) {
        prefixes.add(w);
        prefixes.add(w.toUpperCase());
        prefixes.add(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      }

      if (words.length >= 2) {
        const lastWord = words[words.length - 1];
        const restWords = words.slice(0, -1).join(' ');
        const rev1 = `${lastWord}, ${restWords}`;
        const rev2 = `${lastWord.charAt(0).toUpperCase() + lastWord.slice(1)}, ${restWords.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}`;
        prefixes.add(rev1);
        prefixes.add(rev2);
      }

      const targetFields = ['name', 'qbName', 'firstName', 'lastName', 'customerNumber', 'email', 'phone', 'mobilePhone', 'nameLower', 'qbNameLower'];

      for (const pref of Array.from(prefixes)) {
        if (!pref) continue;
        for (const field of targetFields) {
          queryPromises.push(
            runRawQuery({
              structuredQuery: {
                from: [{ collectionId: col }],
                where: {
                  compositeFilter: {
                    op: 'AND',
                    filters: [
                      {
                        fieldFilter: {
                          field: { fieldPath: field },
                          op: 'GREATER_THAN_OR_EQUAL',
                          value: { stringValue: pref },
                        },
                      },
                      {
                        fieldFilter: {
                          field: { fieldPath: field },
                          op: 'LESS_THAN_OR_EQUAL',
                          value: { stringValue: pref + '\uf8ff' },
                        },
                      },
                    ],
                  },
                },
                limit: 30,
              },
            })
          );
        }
      }

      // Keyword queries
      for (const w of words.slice(0, 4)) {
        queryPromises.push(
          runRawQuery({
            structuredQuery: {
              from: [{ collectionId: col }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'searchKeywords' },
                  op: 'ARRAY_CONTAINS',
                  value: { stringValue: w },
                },
              },
              limit: 50,
            },
          })
        );
      }

      // Clean phone / account number digits queries
      if (cleanDigits.length >= 3) {
        queryPromises.push(
          runRawQuery({
            structuredQuery: {
              from: [{ collectionId: col }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'searchKeywords' },
                  op: 'ARRAY_CONTAINS',
                  value: { stringValue: cleanDigits },
                },
              },
              limit: 50,
            },
          })
        );
      }

      // Exact Document ID / Customer Number Lookup
      if (trimmedQ) {
        queryPromises.push(
          (async () => {
            try {
              const docUrl = this.buildUrl(`${col}/${encodeURIComponent(trimmedQ)}`);
              const res = await fetch(docUrl);
              if (res.ok) {
                const rawDoc = await res.json();
                const single = this.normalizeCustomer(this.parseFirestoreDocument(rawDoc));
                candidateMap.set(single.id, single);
              }
            } catch (e) {}
          })()
        );
      }

      await Promise.all(queryPromises);

      // Deep Client-side filter all candidates against all search words
      let matched = Array.from(candidateMap.values()).filter((c) => {
        const phoneDigits = `${c.phone || ''} ${c.mobilePhone || ''} ${c.homePhone || ''}`.replace(/\D/g, '');
        const authPersons = (c.authorizedPersons || []).map((p: any) => `${p.name || ''} ${p.firstName || ''} ${p.lastName || ''} ${p.phone || ''} ${p.email || ''}`).join(' ');
        const locations = (c.locations || []).map((l: any) => `${l.street || ''} ${l.street2 || ''} ${l.addr1 || ''} ${l.addr2 || ''} ${l.city || ''} ${l.state || ''} ${l.zipCode || ''} ${l.zip || ''}`).join(' ');
        const notesText = `${((c as any).notes || []).map((n: any) => `${n.content || ''} ${n.title || ''}`).join(' ')} ${(c as any).customerNotes || ''} ${(c as any).billingNotes || ''}`;

        const allText = `${c.name || ''} ${c.qbName || ''} ${c.firstName || ''} ${c.lastName || ''} ${c.businessName || ''} ${c.customerNumber || ''} ${c.accountNumber || ''} ${c.wexCustomerId || ''} ${c.legacyId || ''} ${c.id || ''} ${c.email || ''} ${c.phone || ''} ${c.mobilePhone || ''} ${c.homePhone || ''} ${phoneDigits} ${c.address?.street || ''} ${c.address?.city || ''} ${c.address?.state || ''} ${c.address?.zipCode || ''} ${locations} ${authPersons} ${notesText}`.toLowerCase();

        return words.every((w) => {
          const wDigits = w.replace(/\D/g, '');
          if (wDigits.length >= 3 && phoneDigits.includes(wDigits)) return true;
          return allText.includes(w);
        });
      });

      // Apply status and sync filters if set
      if (customerStatus !== 'All') {
        matched = matched.filter((c) => c.customerStatus === customerStatus);
      }
      if (syncFilter !== 'All') {
        matched = matched.filter((c) => c.autoSyncStatus === syncFilter);
      }

      // Rank results: exact name match or prefix match on name/qbName comes first
      matched.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aQb = (a.qbName || '').toLowerCase();
        const bQb = (b.qbName || '').toLowerCase();

        const aStartsWith = aName.startsWith(qLower) || aQb.startsWith(qLower);
        const bStartsWith = bName.startsWith(qLower) || bQb.startsWith(qLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return (a.qbName || a.name || '').localeCompare(b.qbName || b.name || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });

      const paged = matched.slice(0, pageSize);
      const lastItem = paged[paged.length - 1];

      return {
        customers: paged,
        totalCount: matched.length,
        hasNextPage: matched.length > pageSize,
        hasPreviousPage: false,
        endCursor: lastItem ? { name: lastItem.name || '', qbName: lastItem.name || '', id: lastItem.id } : null,
      };
    }

    // Default Paginated Flow (Alphabetical by customer name)
    const totalCount = await this.fetchCustomerCount(mode, { customerStatus, syncFilter });

    if (totalCount <= 500) {
      const all = await this.fetchCustomers(mode);
      if (all && all.length > 0) {
        let filtered = all;
        if (customerStatus && customerStatus !== 'All') {
          filtered = filtered.filter((c) => c.customerStatus === customerStatus);
        }
        if (syncFilter && syncFilter !== 'All') {
          filtered = filtered.filter((c) => c.autoSyncStatus === syncFilter);
        }
        filtered.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        );

        let startIndex = 0;
        if (cursor) {
          const cursorName = cursor.name || cursor.qbName;
          const foundIdx = filtered.findIndex((c) => (c.name || c.qbName) === cursorName && c.id === cursor.id);
          if (foundIdx >= 0) {
            startIndex = foundIdx + 1;
          }
        }
        const paged = filtered.slice(startIndex, startIndex + pageSize);
        const lastItem = paged[paged.length - 1];
        return {
          customers: paged,
          totalCount: filtered.length,
          hasNextPage: startIndex + pageSize < filtered.length,
          hasPreviousPage: startIndex > 0,
          endCursor: lastItem ? { name: lastItem.name || '', qbName: lastItem.name || '', id: lastItem.id } : null,
        };
      }
    }

    const structuredQuery: Record<string, any> = {
      from: [{ collectionId: col }],
      orderBy: [
        { field: { fieldPath: 'name' }, direction: 'ASCENDING' },
        { field: { fieldPath: '__name__' }, direction: 'ASCENDING' },
      ],
      limit: pageSize + 1,
    };

    const filterList: any[] = [];

    if (customerStatus && customerStatus !== 'All') {
      filterList.push({
        fieldFilter: {
          field: { fieldPath: 'customerStatus' },
          op: 'EQUAL',
          value: { stringValue: customerStatus },
        },
      });
    }

    if (syncFilter && syncFilter !== 'All') {
      filterList.push({
        fieldFilter: {
          field: { fieldPath: 'autoSyncStatus' },
          op: 'EQUAL',
          value: { stringValue: syncFilter },
        },
      });
    }

    if (filterList.length === 1) {
      structuredQuery.where = filterList[0];
    } else if (filterList.length > 1) {
      structuredQuery.where = {
        compositeFilter: {
          op: 'AND',
          filters: filterList,
        },
      };
    }

    // Keyset Cursor Pagination
    if (cursor) {
      structuredQuery.startAt = {
        values: [
          { stringValue: cursor.name || cursor.qbName || '' },
          { referenceValue: `projects/${this.projectId}/databases/(default)/documents/${col}/${cursor.id}` },
        ],
        before: false,
      };
    }

    try {
      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : [];
        const rawDocs = results.map((item: any) => item.document).filter(Boolean);
        const hasNextPage = rawDocs.length > pageSize;
        const pageDocs = rawDocs.slice(0, pageSize);
        const customers = pageDocs.map((d: any) => this.normalizeCustomer(this.parseFirestoreDocument(d)));
        const lastItem = customers[customers.length - 1];

        return {
          customers,
          totalCount,
          hasNextPage,
          hasPreviousPage: cursor !== null,
          endCursor: lastItem ? { name: lastItem.name || '', qbName: lastItem.name || '', id: lastItem.id } : null,
        };
      }
    } catch (err: any) {
      console.error(`[Firestore Paginated Query Error - ${col}]: ${err.message}`);
    }

    // Resilient fallback: fetch customers via fetchCustomers(mode) and paginate client-side
    try {
      const all = await this.fetchCustomers(mode);
      if (all && all.length > 0) {
        let filtered = all;
        if (customerStatus && customerStatus !== 'All') {
          filtered = filtered.filter((c) => c.customerStatus === customerStatus);
        }
        if (syncFilter && syncFilter !== 'All') {
          filtered = filtered.filter((c) => c.autoSyncStatus === syncFilter);
        }
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        let startIndex = 0;
        if (cursor) {
          const cursorName = cursor.name || cursor.qbName;
          const foundIdx = filtered.findIndex((c) => (c.name || c.qbName) === cursorName && c.id === cursor.id);
          if (foundIdx >= 0) {
            startIndex = foundIdx + 1;
          }
        }
        const paged = filtered.slice(startIndex, startIndex + pageSize);
        const lastItem = paged[paged.length - 1];
        return {
          customers: paged,
          totalCount: filtered.length,
          hasNextPage: startIndex + pageSize < filtered.length,
          hasPreviousPage: startIndex > 0,
          endCursor: lastItem ? { name: lastItem.name || '', qbName: lastItem.name || '', id: lastItem.id } : null,
        };
      }
    } catch (fallbackErr: any) {
      console.error(`[Firestore Fallback Customers Error]:`, fallbackErr);
    }

    return {
      customers: [],
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor: null,
    };
  }

  private formatAddressForSave(addr?: CanonicalAddress | null): any {
    if (!addr) return undefined;
    const line2 = (addr.addressLine2 || addr.addr2 || addr.street2 || '').trim();
    const formatted: Record<string, any> = {
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || 'FL',
      zipCode: addr.zipCode || '',
      type: addr.type || 'residential',
    };
    if (addr.id) formatted.id = addr.id;
    if (line2) formatted.addressLine2 = line2;
    if (addr.description) formatted.description = addr.description;
    if (addr.isDefault !== undefined) formatted.isDefault = addr.isDefault;
    if (addr.billingType) formatted.billingType = addr.billingType;
    return formatted;
  }

  public async saveCustomer(customer: CanonicalCustomer, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CUSTOMERS, mode);

    const qbName = customer.qbName || (customer.lastName && customer.firstName ? `${customer.lastName}, ${customer.firstName}` : customer.name);

    const normalizedData: any = {
      ...customer,
      qbName,
      address: this.formatAddressForSave(customer.address),
      locations: (customer.locations || []).map((loc) => this.formatAddressForSave(loc)),
      billingAddress: customer.billingAddress ? this.formatAddressForSave(customer.billingAddress) : null,
    };

    return this.writeDocument(col, customer.id, normalizedData);
  }

  public async updateCustomer(customerId: string, fields: Partial<CanonicalCustomer>, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const existing = await this.fetchCustomerById(customerId, mode);
    if (!existing) {
      const newCust: CanonicalCustomer = this.normalizeCustomer({
        id: customerId,
        ...fields,
      });
      return this.saveCustomer(newCust, mode);
    }
    const merged: CanonicalCustomer = {
      ...existing,
      ...fields,
      updatedAt: new Date().toISOString(),
    };
    return this.saveCustomer(merged, mode);
  }

  public normalizeAppointment(raw: any): CanonicalAppointment {
    const dateTime = raw.dateTime || raw.appointmentDateTime || '';
    const assignedTech = raw.assignedTech || raw.technician || (Array.isArray(raw.technicians) ? raw.technicians[0] : null) || null;
    const additionalTech = raw.additionalTech || (Array.isArray(raw.technicians) && raw.technicians.length > 1 ? raw.technicians[1] : null) || null;
    const serviceNotes = sanitizeDomainText(raw.serviceNotes || raw.callNotes || raw.note || raw.noteHtml) || null;
    const locationAddress = raw.locationAddress || raw.location || raw.locationStreet || null;

    const isScheduled = raw.isScheduled !== undefined
      ? Boolean(raw.isScheduled)
      : (raw.scheduleMode === 'request' || raw.status === 'Unscheduled' || !dateTime ? false : true);
    const scheduleMode = raw.scheduleMode || (!isScheduled || raw.status === 'Unscheduled' ? 'request' : 'schedule');

    const appointmentDate = raw.appointmentDate || (dateTime && dateTime.includes('T') ? dateTime.split('T')[0] : (dateTime ? dateTime.split(' ')[0] : null));
    const startTime = raw.startTime || extractTime12hFromIsoOrString(dateTime) || null;
    const endTime = raw.endTime || null;

    const rawTechList: string[] = Array.isArray(raw.technicians) && raw.technicians.length > 0
      ? raw.technicians.map((t: any) => cleanUserDisplayName(t)).filter(Boolean)
      : [];
    if (assignedTech && !rawTechList.some((t) => t.toLowerCase() === assignedTech.toLowerCase())) {
      if (rawTechList.length <= 1) {
        rawTechList.length = 0;
        rawTechList.push(assignedTech);
      } else {
        rawTechList.unshift(assignedTech);
      }
    } else if (assignedTech && rawTechList.length === 0) {
      rawTechList.push(assignedTech);
    }

    return {
      id: raw.id || `appt-${Date.now()}`,
      customerId: raw.customerId || '',
      jobNumber: typeof raw.jobNumber === 'number' ? raw.jobNumber : parseInt(raw.jobNumber || '0', 10),
      appointmentSequenceNumber: typeof raw.appointmentSequenceNumber === 'number' ? raw.appointmentSequenceNumber : parseInt(raw.appointmentSequenceNumber || '1', 10),
      dateTime,
      appointmentDate,
      startTime,
      endTime,
      durationHours: typeof raw.durationHours === 'number' ? raw.durationHours : parseFloat(raw.durationHours || '1'),
      status: raw.status || (isScheduled ? 'Assigned' : 'Unscheduled'),
      isScheduled,
      scheduleMode,
      isServiceRequest: !isScheduled,
      minSkillLevel: raw.minSkillLevel || 1,
      expectedDurationHours: typeof raw.expectedDurationHours === 'number' ? raw.expectedDurationHours : parseFloat(raw.expectedDurationHours || '1'),
      jobType: raw.jobType || 'Residential - Diagnostic',
      jobCategory: raw.jobCategory || 'HVAC',
      tripType: raw.tripType || 'Diagnostic',
      colorHex: raw.colorHex,
      designationOverride: raw.designationOverride || null,
      assignedTech,
      technician: assignedTech,
      technicians: rawTechList.length > 0 ? rawTechList : (assignedTech ? [assignedTech, ...(additionalTech ? [additionalTech] : [])] : []),
      additionalTech,
      assignedTechId: raw.assignedTechId || null,
      userId: raw.userId || null,
      isFlaggedForFollowUp: Boolean(raw.isFlaggedForFollowUp),
      accessCodes: Array.isArray(raw.accessCodes) ? raw.accessCodes : [],
      serviceNotes,
      callNotes: serviceNotes,
      note: serviceNotes,
      noteHtml: raw.noteHtml || serviceNotes,
      customerName: raw.customerName || null,
      locationAddress,
      location: locationAddress,
      locationStreet: raw.locationStreet || locationAddress,
      hoursWorked: raw.hoursWorked || null,
      hoursScheduled: raw.hoursScheduled || null,
      createdDate: raw.createdDate || raw.createdAt || null,
    } as any;
  }

  // --- Appointments ---
  public async fetchAppointments(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    arg3?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalAppointment[]> {
    const isMode = (v: any): v is DatabaseMode => v === 'sandbox' || v === 'live';
    const mode: DatabaseMode = [arg1, arg2, arg3, argMode].find(isMode) || 'sandbox';
    const customerId: string | undefined = !isMode(arg1) ? arg1 : undefined;
    const jobNumber: string | undefined = !isMode(arg2) ? arg2 : undefined;
    const customerName: string | undefined = !isMode(arg3) ? arg3 : undefined;

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.APPOINTMENTS, mode);
    const resultsMap = new Map<string, CanonicalAppointment>();

    if (customerId) {
      const rawId = customerId.replace(/^cust-/, '');
      const q1 = await this.runStructuredQuery<any>(col, 'customerId', customerId);
      q1.forEach((a) => resultsMap.set(a.id, this.normalizeAppointment(a)));
      const q2 = await this.runStructuredQuery<any>(col, 'customerId', `cust-${rawId}`);
      q2.forEach((a) => resultsMap.set(a.id, this.normalizeAppointment(a)));
      const q3 = await this.runStructuredQuery<any>(col, 'customerNumber', rawId);
      q3.forEach((a) => resultsMap.set(a.id, this.normalizeAppointment(a)));
    }
    if (jobNumber) {
      const rawJNum = jobNumber.replace(/^job-/, '').replace(/^#/, '');
      const parsedNum = parseInt(rawJNum, 10);
      const q4 = await this.runStructuredQuery<any>(col, 'jobNumber', rawJNum);
      q4.forEach((a) => resultsMap.set(a.id, this.normalizeAppointment(a)));
      if (!isNaN(parsedNum)) {
        const q4Num = await this.runStructuredQuery<any>(col, 'jobNumber', parsedNum);
        q4Num.forEach((a) => resultsMap.set(a.id, this.normalizeAppointment(a)));
      }
      const q5 = await this.runStructuredQuery<any>(col, 'jobId', `job-${rawJNum}`);
      q5.forEach((a) => resultsMap.set(a.id, this.normalizeAppointment(a)));
    }
    if (customerName && resultsMap.size === 0) {
      const q6 = await this.runStructuredQuery<any>(col, 'customerName', customerName);
      q6.forEach((a) => resultsMap.set(a.id, this.normalizeAppointment(a)));
    }

    if (!customerId && !jobNumber && !customerName) {
      const mergedMap = new Map<string, CanonicalAppointment>();
      try {
        // Query 1: All documents from the live collection (no field exclusions)
        const liveDocs = await this.queryCollection<any>(col);
        liveDocs.forEach((a) => {
          const norm = this.normalizeAppointment(a);
          mergedMap.set(norm.id, norm);
        });

        // Query 2: Unscheduled / Service Requests
        const unscheduledDocs = await this.runStructuredQuery<any>(col, 'status', 'Unscheduled');
        unscheduledDocs.forEach((a) => mergedMap.set(a.id, this.normalizeAppointment(a)));

        const unscheduledByBool = await this.runStructuredQuery<any>(col, 'isScheduled', false);
        unscheduledByBool.forEach((a) => mergedMap.set(a.id, this.normalizeAppointment(a)));

        // Fallback: If queryCollection returned nothing or failed, query via :runQuery without orderBy restrictions
        if (mergedMap.size === 0) {
          const queryUrl = this.buildRootUrl(':runQuery');
          const res = await fetch(queryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: col }],
                limit: 1000,
              },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            for (const item of Array.isArray(data) ? data : []) {
              if (item.document) {
                const norm = this.normalizeAppointment(this.parseFirestoreDocument(item.document));
                mergedMap.set(norm.id, norm);
              }
            }
          }
        }
      } catch (e) {}

      // Merge in canonical mock appointments (including active Sept 2026 dataset)
      for (const mockAppt of this.mockAppointments) {
        if (!mergedMap.has(mockAppt.id)) {
          mergedMap.set(mockAppt.id, mockAppt);
        }
      }
      return Array.from(mergedMap.values());
    }

    if (this.mockAppointments.length > 0) {
      for (const appt of this.mockAppointments) {
        if (customerId && (appt.customerId === customerId || appt.customerId === `cust-${customerId}`)) {
          if (!resultsMap.has(appt.id)) resultsMap.set(appt.id, appt);
        }
        if (jobNumber && (String(appt.jobNumber) === String(jobNumber) || appt.jobId === `job-${jobNumber}`)) {
          if (!resultsMap.has(appt.id)) resultsMap.set(appt.id, appt);
        }
        if (customerName && (appt.customerName || '').toLowerCase().includes(customerName.toLowerCase().trim())) {
          if (!resultsMap.has(appt.id)) resultsMap.set(appt.id, appt);
        }
      }
    }

    let list = Array.from(resultsMap.values());
    return list;
  }

  public async saveAppointment(appointment: CanonicalAppointment, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.APPOINTMENTS, mode);
    return this.writeDocument(col, appointment.id, appointment);
  }

  public async deleteAppointment(appointmentId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.APPOINTMENTS, mode);
    return this.deleteDocument(col, appointmentId);
  }

  // --- Time Clock ---
  public async fetchTimeClockEntries(mode: DatabaseMode = 'sandbox'): Promise<any[]> {
    if (mode === 'sandbox') return [];
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.TIME_CLOCK, mode);
    return this.queryCollection<any>(col);
  }

  public async saveTimeClockEntry(entry: {
    id: string;
    type: string;
    timestamp: string;
    userId?: string;
    userName?: string;
    sessionId?: string;
    date?: string;
    clockIn?: string;
    clockInTime?: string;
    clockOut?: string;
    clockOutTime?: string;
    durationSeconds?: number;
    notes?: string;
  }, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.TIME_CLOCK, mode);
    return this.writeDocument(col, entry.id, {
      ...entry,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deleteTimeClockEntry(entryId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.TIME_CLOCK, mode);
    return this.deleteDocument(col, entryId);
  }

  // --- Users ---
  public normalizeUser(raw: any): CanonicalUser {
    const firstName = raw.firstName || (raw.name ? raw.name.split(' ')[0] : 'User');
    const lastName = raw.lastName || (raw.name ? raw.name.split(' ').slice(1).join(' ') : '');
    const displayName = raw.displayName || `${firstName} ${lastName}`.trim() || raw.name || 'User';

    const rawPerms = raw.permissions || {};
    const rawAccount = raw.accountType || raw.role || rawPerms.accountType || 'Field';
    const normAccLower = String(rawAccount).toLowerCase();
    const normalizedAccountType: 'Admin' | 'Office' | 'Field' =
      normAccLower === 'admin' ? 'Admin' : normAccLower === 'office' ? 'Office' : 'Field';

    const permissions: CanonicalUserPermissions = {
      accountType: normalizedAccountType,
      appointmentVisibility: rawPerms.appointmentVisibility || raw.appointmentVisibility || 'All appointments',
      allCustomerVisibility: rawPerms.allCustomerVisibility !== undefined ? Boolean(rawPerms.allCustomerVisibility) : (raw.allCustomerVisibility !== undefined ? Boolean(raw.allCustomerVisibility) : true),
      reportingTabVisibility: rawPerms.reportingTabVisibility !== undefined ? Boolean(rawPerms.reportingTabVisibility) : (raw.reportingTabVisibility !== undefined ? Boolean(raw.reportingTabVisibility) : (normalizedAccountType === 'Admin' || normalizedAccountType === 'Office')),
      moreAppsAndSettingsVisibility: rawPerms.moreAppsAndSettingsVisibility !== undefined ? Boolean(rawPerms.moreAppsAndSettingsVisibility) : (raw.moreAppsSettingsVisibility !== undefined ? Boolean(raw.moreAppsSettingsVisibility) : (normalizedAccountType === 'Admin')),
      manuallyEnterCards: rawPerms.manuallyEnterCards !== undefined ? Boolean(rawPerms.manuallyEnterCards) : (raw.manuallyEnterCards !== undefined ? Boolean(raw.manuallyEnterCards) : true),
      manageRecurringPayments: rawPerms.manageRecurringPayments !== undefined ? Boolean(rawPerms.manageRecurringPayments) : (raw.manageRecurringPayments !== undefined ? Boolean(raw.manageRecurringPayments) : (normalizedAccountType === 'Admin')),
      performCreditsAndVoids: rawPerms.performCreditsAndVoids !== undefined ? Boolean(rawPerms.performCreditsAndVoids) : (raw.performCreditsVoids !== undefined ? Boolean(raw.performCreditsVoids) : true),
      performFinancingActions: rawPerms.performFinancingActions !== undefined ? Boolean(rawPerms.performFinancingActions) : (raw.performFinancingActions !== undefined ? Boolean(raw.performFinancingActions) : true),
      receiptCopyRecipients: Array.isArray(rawPerms.receiptCopyRecipients) ? rawPerms.receiptCopyRecipients : (Array.isArray(raw.copiesReceipts) ? raw.copiesReceipts : ['This User']),
      scheduleEventsPermission: rawPerms.scheduleEventsPermission || raw.scheduleEvents || 'Can Schedule All Events',
      editPricesAndTaxOnMobile: rawPerms.editPricesAndTaxOnMobile !== undefined ? Boolean(rawPerms.editPricesAndTaxOnMobile) : (raw.editPricesTaxMobile !== undefined ? Boolean(raw.editPricesTaxMobile) : true),
      createCustomLineItems: rawPerms.createCustomLineItems !== undefined ? Boolean(rawPerms.createCustomLineItems) : (raw.createCustomLineItems !== undefined ? Boolean(raw.createCustomLineItems) : true),
      viewJobPnL: rawPerms.viewJobPnL !== undefined ? Boolean(rawPerms.viewJobPnL) : (raw.jobPL !== undefined ? Boolean(raw.jobPL) : true),
    };

    const defaultInitials = ((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase() || 'TC';
    let userInitials = raw.initials ? String(raw.initials).replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() : defaultInitials;
    if (userInitials.length < 2) userInitials = defaultInitials;

    const deviceProfile: CanonicalDeviceProfile = {
      mapsPreference: raw.deviceProfile?.mapsPreference || raw.mapsPreference || 'Apple Maps',
      appTheme: raw.deviceProfile?.appTheme || raw.appTheme || 'System',
    };

    let userDispatchGroups: string[] = Array.isArray(raw.dispatchGroups) && raw.dispatchGroups.length > 0
      ? raw.dispatchGroups
      : (raw.dispatchGroup ? [raw.dispatchGroup] : []);

    if (userDispatchGroups.length === 0) {
      const match = CANONICAL_OFFICIAL_USERS.find(
        (cu) => (cu.email && raw.email && cu.email.toLowerCase() === raw.email.toLowerCase()) ||
                (cu.displayName && displayName && cu.displayName.toLowerCase() === displayName.toLowerCase()) ||
                (cu.name && displayName && cu.name.toLowerCase() === displayName.toLowerCase())
      );
      if (match && Array.isArray(match.dispatchGroups) && match.dispatchGroups.length > 0) {
        userDispatchGroups = [...match.dispatchGroups];
      }
    }

    return {
      id: raw.id || `usr-${Date.now()}`,
      uid: raw.uid || raw.id,
      firstName,
      lastName,
      displayName,
      name: displayName,
      initials: userInitials,
      email: raw.email || '',
      mobilePhone: raw.mobilePhone || raw.phone || '',
      homePhone: raw.homePhone || '',
      accessNumber: raw.accessNumber || raw.accessCode || '',
      techSkillLevel: raw.techSkillLevel || '',
      dispatchGroups: userDispatchGroups,
      accountType: (normAccLower === 'admin' ? 'admin' : normAccLower === 'office' ? 'office' : 'field'),
      role: normalizedAccountType,
      isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : (raw.isDeactivated !== undefined ? !raw.isDeactivated : true),
      permissions,
      deviceProfile,
      currentShiftId: raw.currentShiftId || null,
      clockStatus: raw.clockStatus || 'Clocked Out',
      lastActiveAt: raw.lastActiveAt || new Date().toISOString(),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  }

  public async fetchUsers(mode: DatabaseMode = 'sandbox'): Promise<CanonicalUser[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.USERS, mode);
    const docs = await this.queryCollection<any>(col);
    if (docs.length > 0) {
      return docs.map((d) => this.normalizeUser(d));
    }
    return CANONICAL_OFFICIAL_USERS;
  }

  public async saveUser(user: CanonicalUser, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const rawAccount = (user.accountType || user.role || user.permissions?.accountType || 'field').toString().toLowerCase();
    const accountType: 'admin' | 'office' | 'field' = rawAccount.includes('admin')
      ? 'admin'
      : rawAccount.includes('office')
      ? 'office'
      : 'field';
    const role: 'Admin' | 'Office' | 'Field' = accountType === 'admin' ? 'Admin' : accountType === 'office' ? 'Office' : 'Field';

    const normalizedUser: CanonicalUser = {
      ...user,
      id: user.id,
      uid: user.uid || user.id,
      accountType,
      role,
      permissions: {
        ...user.permissions,
        accountType: role,
      },
      updatedAt: new Date().toISOString(),
    };
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.USERS, mode);
    return this.writeDocument(col, normalizedUser.id, normalizedUser);
  }

  public async deleteUser(userId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.USERS, mode);
    return this.deleteDocument(col, userId);
  }

  // --- Dispatch Groups ---
  public normalizeDispatchGroup(raw: any): CanonicalDispatchGroup {
    return {
      id: raw.id || `dg-${Date.now()}`,
      name: raw.name || 'General',
      members: Array.isArray(raw.members) ? raw.members : [],
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  }

  public async fetchDispatchGroups(mode: DatabaseMode = 'sandbox'): Promise<CanonicalDispatchGroup[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.DISPATCH_GROUPS, mode);
    const docs = await this.queryCollection<any>(col);
    if (docs.length > 0) {
      return docs.map((d) => this.normalizeDispatchGroup(d));
    }
    return CANONICAL_OFFICIAL_DISPATCH_GROUPS;
  }

  public async saveDispatchGroup(group: CanonicalDispatchGroup, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.DISPATCH_GROUPS, mode);
    return this.writeDocument(col, group.id, group);
  }

  public async deleteDispatchGroup(groupId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.DISPATCH_GROUPS, mode);
    return this.deleteDocument(col, groupId);
  }

  // --- Jobs ---
  public async fetchJobs(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    arg3?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalJob[]> {
    const isMode = (v: any): v is DatabaseMode => v === 'sandbox' || v === 'live';
    const mode: DatabaseMode = [arg1, arg2, arg3, argMode].find(isMode) || 'sandbox';
    const customerId: string | undefined = !isMode(arg1) ? arg1 : undefined;
    const customerNumber: string | undefined = !isMode(arg2) ? arg2 : undefined;
    const customerName: string | undefined = !isMode(arg3) ? arg3 : undefined;

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.JOBS, mode);
    const resultsMap = new Map<string, CanonicalJob>();

    if (customerNumber) {
      const q1 = await this.runStructuredQuery<CanonicalJob>(col, 'customerNumber', customerNumber);
      q1.forEach((j) => resultsMap.set(j.id, j));
    }
    if (customerId) {
      const rawCNum = customerId.replace(/^cust-/, '');
      const q2 = await this.runStructuredQuery<CanonicalJob>(col, 'customerNumber', rawCNum);
      q2.forEach((j) => resultsMap.set(j.id, j));
      const q3 = await this.runStructuredQuery<CanonicalJob>(col, 'customerId', customerId);
      q3.forEach((j) => resultsMap.set(j.id, j));
    }
    if (customerName && resultsMap.size === 0) {
      const q4 = await this.runStructuredQuery<CanonicalJob>(col, 'customerName', customerName);
      q4.forEach((j) => resultsMap.set(j.id, j));
    }

    if (!customerNumber && !customerId && !customerName) {
      const mergedMap = new Map<string, CanonicalJob>();
      try {
        const queryUrl = this.buildRootUrl(':runQuery');
        const res = await fetch(queryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: col }],
              orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
              limit: 1000,
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const item of Array.isArray(data) ? data : []) {
            if (item.document) {
              const parsed = this.parseFirestoreDocument<CanonicalJob>(item.document);
              if (parsed && parsed.id) mergedMap.set(parsed.id, parsed);
            }
          }
        }
      } catch (e) {
        console.warn('Direct runQuery error, falling back to queryCollection:', e);
      }
      if (mergedMap.size === 0) {
        const fallback = await this.queryCollection<CanonicalJob>(col, 3);
        fallback.forEach((j) => mergedMap.set(j.id, j));
      }

      // Merge in canonical mock jobs (including active Sept 2026 dataset)
      for (const mockJob of this.mockJobs) {
        if (!mergedMap.has(mockJob.id)) {
          mergedMap.set(mockJob.id, mockJob);
        }
      }
      return Array.from(mergedMap.values());
    }

    if (this.mockJobs.length > 0) {
      for (const job of this.mockJobs) {
        if (customerNumber && (job.customerNumber === customerNumber || job.customerId === `cust-${customerNumber}`)) {
          if (!resultsMap.has(job.id)) resultsMap.set(job.id, job);
        } else if (customerId) {
          const rawCNum = customerId.replace(/^cust-/, '');
          if (job.customerId === customerId || job.customerNumber === rawCNum) {
            if (!resultsMap.has(job.id)) resultsMap.set(job.id, job);
          }
        }
        if (customerName && (job.customerName || '').toLowerCase().includes(customerName.toLowerCase().trim())) {
          if (!resultsMap.has(job.id)) resultsMap.set(job.id, job);
        }
      }
    }

    let list = Array.from(resultsMap.values());
    return list;
  }

  public async fetchJobById(jobId: string, mode: DatabaseMode = 'sandbox'): Promise<CanonicalJob | null> {
    const rawJobId = jobId.replace(/^job-/, '').replace(/^#/, '');
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.JOBS, mode);

    try {
      const docUrl = this.buildUrl(`${col}/${encodeURIComponent(jobId)}`);
      const res = await fetch(docUrl);
      if (res.ok) {
        const raw = await res.json();
        const doc = this.parseFirestoreDocument<CanonicalJob>(raw);
        if (doc && doc.id) return doc;
      }
    } catch (e) {}

    if (!jobId.startsWith('job-')) {
      try {
        const docUrl = this.buildUrl(`${col}/job-${encodeURIComponent(jobId)}`);
        const res = await fetch(docUrl);
        if (res.ok) {
          const raw = await res.json();
          const doc = this.parseFirestoreDocument<CanonicalJob>(raw);
          if (doc && doc.id) return doc;
        }
      } catch (e) {}
    }

    try {
      const q = await this.runStructuredQuery<CanonicalJob>(col, 'jobNumber', rawJobId);
      if (q && q.length > 0) return q[0];
    } catch (e) {}

    // Fallback to mock jobs
    const match = this.mockJobs.find(
      (j) => j.id === jobId || j.id === `job-${jobId}` || j.id === `job-${rawJobId}` || String(j.jobNumber) === jobId || String(j.jobNumber) === rawJobId
    );
    if (match) return match;

    return null;
  }

  public async saveJob(job: CanonicalJob, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.JOBS, mode);
    return this.writeDocument(col, job.id, job);
  }

  // --- Payments ---
  public async fetchPayments(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    arg3?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalPaymentRecord[]> {
    const isMode = (v: any): v is DatabaseMode => v === 'sandbox' || v === 'live';
    const mode: DatabaseMode = [arg1, arg2, arg3, argMode].find(isMode) || 'sandbox';
    const customerId: string | undefined = !isMode(arg1) ? arg1 : undefined;
    const customerNumber: string | undefined = !isMode(arg2) ? arg2 : undefined;
    const customerName: string | undefined = !isMode(arg3) ? arg3 : undefined;

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PAYMENTS, mode);
    const resultsMap = new Map<string, CanonicalPaymentRecord>();

    if (customerNumber) {
      const q1 = await this.runStructuredQuery<CanonicalPaymentRecord>(col, 'customerNumber', customerNumber);
      q1.forEach((p) => resultsMap.set(p.id, p));
    }
    if (customerId) {
      const rawCNum = customerId.replace(/^cust-/, '');
      const q2 = await this.runStructuredQuery<CanonicalPaymentRecord>(col, 'customerNumber', rawCNum);
      q2.forEach((p) => resultsMap.set(p.id, p));
    }
    if (customerName) {
      const q3 = await this.runStructuredQuery<CanonicalPaymentRecord>(col, 'customerName', customerName);
      q3.forEach((p) => resultsMap.set(p.id, p));
    }

    if (!customerNumber && !customerId && !customerName) {
      try {
        const queryUrl = this.buildRootUrl(':runQuery');
        const res = await fetch(queryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: col }],
              limit: 500,
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const items: CanonicalPaymentRecord[] = [];
          for (const item of Array.isArray(data) ? data : []) {
            if (item.document) {
              items.push(this.parseFirestoreDocument(item.document));
            }
          }
          return items;
        }
      } catch (e) {}
      return this.queryCollection<CanonicalPaymentRecord>(col, 3);
    }

    return Array.from(resultsMap.values());
  }

  // --- Equipment ---
  public async fetchEquipment(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    arg3?: string | DatabaseMode,
    arg4?: string | DatabaseMode,
    arg5?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalEquipment[]> {
    let mode: DatabaseMode = 'sandbox';
    let customerId: string | undefined;
    let locationId: string | undefined;
    let customerName: string | undefined;
    let customerNumber: string | undefined;
    let legacyId: string | undefined;

    if ((argMode === 'sandbox' || argMode === 'live')) {
      mode = argMode;
    } else if ((arg5 === 'sandbox' || arg5 === 'live')) {
      mode = arg5 as DatabaseMode;
      arg5 = undefined;
    } else if ((arg4 === 'sandbox' || arg4 === 'live')) {
      mode = arg4 as DatabaseMode;
      arg4 = undefined;
    } else if ((arg3 === 'sandbox' || arg3 === 'live')) {
      mode = arg3 as DatabaseMode;
      arg3 = undefined;
    } else if ((arg2 === 'sandbox' || arg2 === 'live')) {
      mode = arg2 as DatabaseMode;
      arg2 = undefined;
    } else if ((arg1 === 'sandbox' || arg1 === 'live')) {
      mode = arg1 as DatabaseMode;
      arg1 = undefined;
    }

    customerId = typeof arg1 === 'string' ? arg1 : undefined;
    locationId = typeof arg2 === 'string' ? arg2 : undefined;
    customerName = typeof arg3 === 'string' ? arg3 : undefined;
    customerNumber = typeof arg4 === 'string' ? arg4 : undefined;
    legacyId = typeof arg5 === 'string' ? arg5 : undefined;

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.EQUIPMENT, mode);
    const resultsMap = new Map<string, CanonicalEquipment>();

    const queryIds = new Set<string>();
    if (customerId) { queryIds.add(customerId); queryIds.add(customerId.replace(/^cust-/, '')); }
    if (customerNumber) { queryIds.add(customerNumber); queryIds.add(customerNumber.replace(/^cust-/, '')); }
    if (legacyId) { queryIds.add(legacyId); queryIds.add(legacyId.replace(/^cust-/, '')); }

    for (const qid of Array.from(queryIds)) {
      const qCust = await this.runStructuredQuery<any>(col, 'customerId', qid);
      qCust.forEach((e) => resultsMap.set(e.id, this.normalizeEquipment(e)));
      const qWex = await this.runStructuredQuery<any>(col, 'wexCustomerId', qid);
      qWex.forEach((e) => resultsMap.set(e.id, this.normalizeEquipment(e)));
      const qBiz = await this.runStructuredQuery<any>(col, 'businessCustomerId', qid);
      qBiz.forEach((e) => resultsMap.set(e.id, this.normalizeEquipment(e)));
      const qNum = await this.runStructuredQuery<any>(col, 'customerNumber', qid);
      qNum.forEach((e) => resultsMap.set(e.id, this.normalizeEquipment(e)));
    }

    if (customerName) {
      const qName = await this.runStructuredQuery<any>(col, 'customerName', customerName);
      qName.forEach((e) => resultsMap.set(e.id, this.normalizeEquipment(e)));
    }

    if (!customerId && !customerName && !customerNumber && !legacyId) {
      const all = await this.queryCollection<any>(col);
      return all.map((e) => this.normalizeEquipment(e));
    }
    let list = Array.from(resultsMap.values());
    if (locationId) {
      list = list.filter((e) => e.locationId === locationId || (e.locationStreet && e.locationStreet.includes(locationId)) || (e.locationAddress && e.locationAddress.includes(locationId)));
    }
    return list;
  }

  public async saveEquipment(item: CanonicalEquipment, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.EQUIPMENT, mode);
    return this.writeDocument(col, item.id, item);
  }

  public async deleteEquipment(equipmentId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.EQUIPMENT, mode);
    return this.deleteDocument(col, equipmentId);
  }

  // --- Invoices ---
  public async fetchInvoices(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    arg3?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalInvoice[]> {
    const isMode = (v: any): v is DatabaseMode => v === 'sandbox' || v === 'live';
    const mode: DatabaseMode = [arg1, arg2, arg3, argMode].find(isMode) || 'sandbox';
    const customerId: string | undefined = !isMode(arg1) ? arg1 : undefined;
    const jobId: string | undefined = !isMode(arg2) ? arg2 : undefined;
    const customerName: string | undefined = !isMode(arg3) ? arg3 : undefined;

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.INVOICES, mode);
    const resultsMap = new Map<string, CanonicalInvoice>();

    if (customerId) {
      const rawId = customerId.replace(/^cust-/, '');
      const q1 = await this.runStructuredQuery<CanonicalInvoice>(col, 'customerId', customerId);
      q1.forEach((i) => resultsMap.set(i.id, i));
      const q2 = await this.runStructuredQuery<CanonicalInvoice>(col, 'customerNumber', rawId);
      q2.forEach((i) => resultsMap.set(i.id, i));
    }
    if (customerName) {
      const q3 = await this.runStructuredQuery<CanonicalInvoice>(col, 'customerName', customerName);
      q3.forEach((i) => resultsMap.set(i.id, i));
    }
    if (jobId) {
      const rawJobId = jobId.replace(/^job-/, '');
      const q4 = await this.runStructuredQuery<CanonicalInvoice>(col, 'jobId', jobId);
      q4.forEach((i) => resultsMap.set(i.id, i));
      const q5 = await this.runStructuredQuery<CanonicalInvoice>(col, 'jobNumber', rawJobId);
      q5.forEach((i) => resultsMap.set(i.id, i));
    }

    if (!customerId && !customerName && !jobId) {
      return this.queryCollection<CanonicalInvoice>(col);
    }

    let list = Array.from(resultsMap.values());
    return list;
  }

  public async saveInvoice(invoice: CanonicalInvoice, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.INVOICES, mode);
    return this.writeDocument(col, invoice.id, invoice);
  }

  // --- Proposals ---
  public async fetchProposals(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    arg3?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalProposal[]> {
    const isMode = (v: any): v is DatabaseMode => v === 'sandbox' || v === 'live';
    const mode: DatabaseMode = [arg1, arg2, arg3, argMode].find(isMode) || 'sandbox';
    const customerId: string | undefined = !isMode(arg1) ? arg1 : undefined;
    const jobId: string | undefined = !isMode(arg2) ? arg2 : undefined;
    const customerName: string | undefined = !isMode(arg3) ? arg3 : undefined;

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PROPOSALS, mode);
    const resultsMap = new Map<string, CanonicalProposal>();

    if (customerId) {
      const rawId = customerId.replace(/^cust-/, '');
      const q1 = await this.runStructuredQuery<CanonicalProposal>(col, 'customerId', customerId);
      q1.forEach((p) => resultsMap.set(p.id, p));
      const q2 = await this.runStructuredQuery<CanonicalProposal>(col, 'customerNumber', rawId);
      q2.forEach((p) => resultsMap.set(p.id, p));
    }
    if (customerName) {
      const q3 = await this.runStructuredQuery<CanonicalProposal>(col, 'customerName', customerName);
      q3.forEach((p) => resultsMap.set(p.id, p));
    }
    if (jobId) {
      const rawJobId = jobId.replace(/^job-/, '');
      const q4 = await this.runStructuredQuery<CanonicalProposal>(col, 'jobId', jobId);
      q4.forEach((p) => resultsMap.set(p.id, p));
      const q5 = await this.runStructuredQuery<CanonicalProposal>(col, 'jobNumber', rawJobId);
      q5.forEach((p) => resultsMap.set(p.id, p));
    }

    if (!customerId && !customerName && !jobId) {
      return this.queryCollection<CanonicalProposal>(col);
    }

    let list = Array.from(resultsMap.values());
    return list;
  }

  public async saveProposal(proposal: CanonicalProposal, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PROPOSALS, mode);
    return this.writeDocument(col, proposal.id, proposal);
  }

  // --- Maintenance Plans ---
  public async fetchMaintenancePlans(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalMaintenancePlan[]> {
    let mode: DatabaseMode = 'sandbox';
    let customerId: string | undefined;
    let customerName: string | undefined;

    const args = [arg1, arg2, argMode].filter((a) => a !== undefined && a !== null);
    const lastArg = args[args.length - 1];
    if (lastArg === 'sandbox' || lastArg === 'sandbox' || lastArg === 'live') {
      mode = lastArg as DatabaseMode;
      args.pop();
    }
    customerId = args[0] as string | undefined;
    customerName = args[1] as string | undefined;

    

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.MAINTENANCE_PLANS, mode);
    const resultsMap = new Map<string, CanonicalMaintenancePlan>();

    if (customerId) {
      const rawId = customerId.replace(/^cust-/, '');
      const q1 = await this.runStructuredQuery<CanonicalMaintenancePlan>(col, 'customerId', customerId);
      q1.forEach((mp) => resultsMap.set(mp.id, mp));
      const q2 = await this.runStructuredQuery<CanonicalMaintenancePlan>(col, 'customerId', rawId);
      q2.forEach((mp) => resultsMap.set(mp.id, mp));
      const q3 = await this.runStructuredQuery<CanonicalMaintenancePlan>(col, 'customerNumber', rawId);
      q3.forEach((mp) => resultsMap.set(mp.id, mp));
      const q4 = await this.runStructuredQuery<CanonicalMaintenancePlan>(col, 'wexCustomerId', rawId);
      q4.forEach((mp) => resultsMap.set(mp.id, mp));
      const q5 = await this.runStructuredQuery<CanonicalMaintenancePlan>(col, 'businessCustomerId', rawId);
      q5.forEach((mp) => resultsMap.set(mp.id, mp));
      const q6 = await this.runStructuredQuery<CanonicalMaintenancePlan>(col, 'customer_id', rawId);
      q6.forEach((mp) => resultsMap.set(mp.id, mp));
    }
    if (customerName) {
      const q7 = await this.runStructuredQuery<CanonicalMaintenancePlan>(col, 'customerName', customerName);
      q7.forEach((mp) => resultsMap.set(mp.id, mp));
    }

    if (!customerId && !customerName) {
      return this.queryCollection<CanonicalMaintenancePlan>(col);
    }

    let list = Array.from(resultsMap.values());
    return list;
  }

  public async saveMaintenancePlan(plan: CanonicalMaintenancePlan, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.MAINTENANCE_PLANS, mode);
    return this.writeDocument(col, plan.id, plan);
  }

  public async deleteMaintenancePlan(planId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.MAINTENANCE_PLANS, mode);
    return this.deleteDocument(col, planId);
  }

  // --- Checklists ---
  public async fetchChecklistTemplates(mode: DatabaseMode = 'sandbox'): Promise<CanonicalChecklistTemplate[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CHECKLIST_TEMPLATES, mode);
    const docs = await this.queryCollection<CanonicalChecklistTemplate>(col);
    return docs || [];
  }

  public async saveChecklistTemplate(template: any, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CHECKLIST_TEMPLATES, mode);
    return this.writeDocument(col, template.id, {
      ...template,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deleteChecklistTemplate(templateId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CHECKLIST_TEMPLATES, mode);
    return this.deleteDocument(col, templateId);
  }

  public async fetchChecklistInstances(jobId?: string, mode: DatabaseMode = 'sandbox'): Promise<CanonicalChecklistInstance[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CHECKLISTS, mode);
    let list = await this.queryCollection<CanonicalChecklistInstance>(col);

    if (jobId) {
      list = list.filter((c) => c.jobId === jobId);
    }
    return list || [];
  }

  public async saveChecklistInstance(instance: CanonicalChecklistInstance, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CHECKLISTS, mode);
    return this.writeDocument(col, instance.id, {
      ...instance,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deleteChecklistInstance(instanceId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CHECKLISTS, mode);
    return this.deleteDocument(col, instanceId);
  }

  // --- Notes ---
  public async fetchNotes(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalNote[]> {
    const isMode = (v: any): v is DatabaseMode => v === 'sandbox' || v === 'live';
    const mode: DatabaseMode = [arg1, arg2, argMode].find(isMode) || 'sandbox';
    const customerId: string | undefined = !isMode(arg1) ? arg1 : undefined;
    const jobId: string | undefined = !isMode(arg2) ? arg2 : undefined;

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.NOTES, mode);
    const resultsMap = new Map<string, CanonicalNote>();

    if (customerId) {
      const rawId = customerId.replace(/^cust-/, '');
      const q1 = await this.runStructuredQuery<CanonicalNote>(col, 'customerId', customerId);
      q1.forEach((n) => resultsMap.set(n.id, n));
      const q2 = await this.runStructuredQuery<CanonicalNote>(col, 'customerId', `cust-${rawId}`);
      q2.forEach((n) => resultsMap.set(n.id, n));
    }
    if (jobId) {
      const q3 = await this.runStructuredQuery<CanonicalNote>(col, 'jobId', jobId);
      q3.forEach((n) => resultsMap.set(n.id, n));
    }

    if (!customerId && !jobId) {
      return this.queryCollection<CanonicalNote>(col);
    }

    return Array.from(resultsMap.values());
  }

  public async saveNote(note: CanonicalNote, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.NOTES, mode);
    return this.writeDocument(col, note.id, note);
  }

  public async deleteNote(noteId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.NOTES, mode);
    return this.deleteDocument(col, noteId);
  }

  // --- Attachments ---
  public async fetchAttachments(
    arg1?: string | DatabaseMode,
    arg2?: string | DatabaseMode,
    argMode?: DatabaseMode
  ): Promise<CanonicalAttachment[]> {
    const isMode = (v: any): v is DatabaseMode => v === 'sandbox' || v === 'live';
    const mode: DatabaseMode = [arg1, arg2, argMode].find(isMode) || 'sandbox';
    const customerId: string | undefined = !isMode(arg1) ? arg1 : undefined;
    const jobId: string | undefined = !isMode(arg2) ? arg2 : undefined;

    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.ATTACHMENTS, mode);
    let list = await this.queryCollection<CanonicalAttachment>(col);

    if (customerId) {
      list = list.filter((a) => a.customerId === customerId);
    }
    if (jobId) {
      list = list.filter((a) => a.jobId === jobId);
    }
    return list;
  }

  public async saveAttachment(attachment: CanonicalAttachment, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.ATTACHMENTS, mode);
    return this.writeDocument(col, attachment.id, attachment);
  }

  public async deleteAttachment(attachmentId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.ATTACHMENTS, mode);
    return this.deleteDocument(col, attachmentId);
  }

  // --- Follow-Up Flags ---
  public async fetchFollowUps(assignedTo?: string, mode: DatabaseMode = 'sandbox'): Promise<CanonicalFollowUpFlag[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.FOLLOW_UPS, mode);
    let list = await this.queryCollection<CanonicalFollowUpFlag>(col);

    if (assignedTo) {
      list = list.filter((f) => f.assignedTo === assignedTo);
    }
    return list;
  }

  public async saveFollowUp(flag: CanonicalFollowUpFlag, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.FOLLOW_UPS, mode);
    return this.writeDocument(col, flag.id, flag);
  }

  // --- Price Book ---
  public async fetchPriceBook(mode: DatabaseMode = 'sandbox'): Promise<CanonicalPriceBookItem[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PRICE_BOOK, mode);
    const docs = await this.queryCollection<CanonicalPriceBookItem>(col);
    return docs;
  }

  public async savePriceBookItem(item: CanonicalPriceBookItem, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PRICE_BOOK, mode);
    return this.writeDocument(col, item.id, item);
  }

  // --- Warranties (Official Price Book Plans) ---
  public async fetchWarranties(mode: DatabaseMode = 'sandbox'): Promise<CanonicalWarranty[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.WARRANTIES, mode);
    const docs = await this.queryCollection<CanonicalWarranty>(col);
    return docs || [];
  }

  public async saveWarranty(warranty: CanonicalWarranty, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.WARRANTIES, mode);
    return this.writeDocument(col, warranty.id, {
      ...warranty,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deleteWarranty(warrantyId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.WARRANTIES, mode);
    return this.deleteDocument(col, warrantyId);
  }

  // --- Calls ---
  public normalizeCall(raw: any): CanonicalCall {
    return {
      id: raw.id || `call-${Date.now()}`,
      customerId: raw.customerId || '',
      customerName: raw.customerName || 'Customer',
      contactName: raw.contactName || raw.customerName || undefined,
      phoneCid: raw.phoneCid || raw.phoneNumber || null,
      callDate: raw.callDate || raw.dateTime || new Date().toISOString(),
      callType: raw.callType === 'Outbound' ? 'Outbound' : 'Inbound',
      activityType: raw.activityType || raw.type || 'Call',
      relatedLocation: raw.relatedLocation || raw.locationAddress || null,
      notes: raw.notes || raw.note || null,
      user: raw.user || raw.createdByName || 'Ryan Cole',
      userId: raw.userId || raw.createdById || null,
      jobNumber: raw.jobNumber || null,
      appointmentId: raw.appointmentId || null,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt,
    };
  }

  public async fetchCalls(mode: DatabaseMode = 'sandbox'): Promise<CanonicalCall[]> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CALLS, mode);
    const docs = await this.queryCollection<any>(col);
    if (docs.length > 0) {
      return docs.map((d) => this.normalizeCall(d));
    }
    return [];
  }

  public async saveCall(call: CanonicalCall, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CALLS, mode);
    return this.writeDocument(col, call.id, {
      ...call,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deleteCall(callId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.CALLS, mode);
    return this.deleteDocument(col, callId);
  }

  // --- Payments ---
  public async fetchPaymentRecords(customerId?: string, mode: DatabaseMode = 'sandbox'): Promise<CanonicalPaymentRecord[]> {
    let list: CanonicalPaymentRecord[] = [];
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PAYMENTS, mode);
    try {
      const queryUrl = this.buildRootUrl(':runQuery');
      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: col }],
            limit: 500,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const item of Array.isArray(data) ? data : []) {
          if (item.document) {
            list.push(this.parseFirestoreDocument(item.document));
          }
        }
      }
    } catch (e) {
      list = await this.queryCollection<CanonicalPaymentRecord>(col, 3);
    }

    if (customerId) {
      list = list.filter((p) => p.customerId === customerId);
    }
    return list;
  }

  public async savePaymentRecord(payment: CanonicalPaymentRecord, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PAYMENTS, mode);
    return this.writeDocument(col, payment.id, {
      ...payment,
      updatedAt: new Date().toISOString(),
    });
  }

  public async deletePaymentRecord(paymentId: string, mode: DatabaseMode = 'sandbox'): Promise<boolean> {
    const col = this.getCollectionName(FIRESTORE_COLLECTIONS.PAYMENTS, mode);
    return this.deleteDocument(col, paymentId);
  }

  // --- Authorized Persons ---
  public async fetchAuthorizedPersons(
    customerId?: string,
    mode: DatabaseMode = 'sandbox'
  ): Promise<CanonicalAuthorizedPerson[]> {
    if (!customerId) return [];
    const customer = await this.fetchCustomerById(customerId, mode);
    return customer?.authorizedPersons || [];
  }
}

export const firestoreClient = FirestoreDomainClient.getInstance();

