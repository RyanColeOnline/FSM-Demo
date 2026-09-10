import { NextRequest, NextResponse } from 'next/server';
import { CanonicalJob, DatabaseMode, FirestoreDomainClient } from '@murphys/domain';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'fsm-demo-266c8';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCPDRqGnaIEmVlHmX_nD8z30YK4Af98Hm0';

// Memory cache for total document count (5 minutes TTL)
const countCache: Record<string, { total: number; timestamp: number }> = {};
const COUNT_CACHE_TTL = 5 * 60 * 1000;

function parseFirestoreDocument(doc: any): any {
  if (!doc) return null;
  const fields = doc.fields || {};
  const obj: any = {};
  const docId = doc.name ? doc.name.split('/').pop() : '';
  obj.id = docId;

  for (const [key, val] of Object.entries<any>(fields)) {
    if (val.stringValue !== undefined) obj[key] = val.stringValue;
    else if (val.integerValue !== undefined) obj[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) obj[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) obj[key] = val.booleanValue;
    else if (val.nullValue !== undefined) obj[key] = null;
    else if (val.timestampValue !== undefined) obj[key] = val.timestampValue;
    else if (val.arrayValue !== undefined) {
      obj[key] = (val.arrayValue.values || []).map((item: any) => parseFirestoreValue(item));
    } else if (val.mapValue !== undefined) {
      obj[key] = parseFirestoreDocument(val.mapValue);
    }
  }
  return obj;
}

function parseFirestoreValue(val: any): any {
  if (!val) return null;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map((item: any) => parseFirestoreValue(item));
  }
  if (val.mapValue !== undefined) {
    return parseFirestoreDocument(val.mapValue);
  }
  return val;
}

async function getTotalJobsCount(col: string): Promise<number> {
  const cached = countCache[col];
  if (cached && Date.now() - cached.timestamp < COUNT_CACHE_TTL) {
    return cached.total;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runAggregationQuery?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: {
            from: [{ collectionId: col }],
          },
          aggregations: [
            {
              alias: 'total_count',
              count: {},
            },
          ],
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const countVal = data?.[0]?.result?.aggregateFields?.total_count?.integerValue;
      if (countVal) {
        const total = parseInt(countVal, 10);
        countCache[col] = { total, timestamp: Date.now() };
        return total;
      }
    }
  } catch (e) {
    console.error('[API Jobs] Aggregation count failed:', e);
  }
  return 18814; // Safe fallback baseline count
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || 'All';
    const flagged = searchParams.get('flagged') === 'true';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const col = 'jobs';

    // 1. Search Query
    if (search) {
      const cleanSearch = search.replace(/^job-/, '').replace(/^#/, '').trim();
      const isNumeric = /^\d+$/.test(cleanSearch);

      const structuredQuery: any = {
        from: [{ collectionId: col }],
        limit: pageSize,
      };

      if (isNumeric) {
        structuredQuery.where = {
          compositeFilter: {
            op: 'OR',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'jobNumber' },
                  op: 'EQUAL',
                  value: { integerValue: cleanSearch },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'customerNumber' },
                  op: 'EQUAL',
                  value: { stringValue: cleanSearch },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'id' },
                  op: 'EQUAL',
                  value: { stringValue: `job-${cleanSearch}` },
                },
              },
            ],
          },
        };
      } else {
        structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: 'customerName' },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { stringValue: cleanSearch },
          },
        };
      }

      const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery }),
      });

      if (res.ok) {
        const rawData = await res.json();
        let jobs: CanonicalJob[] = (Array.isArray(rawData) ? rawData : [])
          .filter((d: any) => d.document)
          .map((d: any) => parseFirestoreDocument(d.document));

        if (flagged) {
          jobs = jobs.filter((j: any) => Boolean(j.isFlagged || (j.followUpFlag && j.followUpFlag !== 'N') || j.flagged));
        }

        return NextResponse.json({
          jobs,
          total: jobs.length,
          page: 1,
          pageSize,
          totalPages: 1,
        });
      }
    }

    // 2. Flagged Filter Query
    if (flagged) {
      const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: col }],
            limit: 200,
          },
        }),
      });

      if (res.ok) {
        const rawData = await res.json();
        let allJobs: CanonicalJob[] = (Array.isArray(rawData) ? rawData : [])
          .filter((d: any) => d.document)
          .map((d: any) => parseFirestoreDocument(d.document));

        let filtered = allJobs.filter((j: any) =>
          Boolean(j.isFlagged || (j.followUpFlag && j.followUpFlag !== 'N') || j.flagged)
        );

        if (status !== 'All') {
          const normStatus = status.toLowerCase();
          filtered = filtered.filter((j) => (j.status || '').toLowerCase() === normStatus);
        }

        const offset = (page - 1) * pageSize;
        const pageJobs = filtered.slice(offset, offset + pageSize);
        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize) || 1;

        return NextResponse.json({
          jobs: pageJobs,
          total,
          page,
          pageSize,
          totalPages,
        });
      }
    }

    // 3. Direct paginated structured query
    const offset = (page - 1) * pageSize;
    const structuredQuery: any = {
      from: [{ collectionId: col }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: pageSize,
      offset,
    };

    // Push down status filter if not 'All'
    if (status !== 'All') {
      const normStatus = status.toLowerCase() === 'closed' ? 'Closed' : status.toLowerCase() === 'abandoned' ? 'Abandoned' : 'Opened';
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: normStatus },
        },
      };
    }

    const [total, res] = await Promise.all([
      getTotalJobsCount(col),
      fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery }),
      }),
    ]);

    if (!res.ok) {
      throw new Error(`Firestore query error: ${res.statusText}`);
    }

    const rawData = await res.json();
    const jobs: CanonicalJob[] = (Array.isArray(rawData) ? rawData : [])
      .filter((d: any) => d.document)
      .map((d: any) => parseFirestoreDocument(d.document));

    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({
      jobs,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error: any) {
    console.error('[API Jobs Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}