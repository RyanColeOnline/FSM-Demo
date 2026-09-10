/**
 * Backfill Firestore collections to BigQuery changelog tables in fsm_analytics
 * Murphy's FSM Platform
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const fbConfigPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const fbConfig = JSON.parse(fs.readFileSync(fbConfigPath, 'utf8'));
let accessToken = fbConfig.tokens.access_token;
const refreshToken = fbConfig.tokens.refresh_token;
const projectId = 'murphys-fsm-staging';
const datasetId = 'fsm_analytics';

const targetCollections = [
  // Live Operational Collections
  'customers',
  'jobs',
  'appointments',
  'invoices',
  'equipment',
  'proposals',
  'maintenancePlans',
  'payments',
  'notes',
  'priceBook',
  'users',
  'dispatchGroups',
  'warranties',
  'calls',
  'timeClock',
  'time_entries',

  // Archive Collections (Pre-Jan 10, 2025)
  'archive_jobs',
  'archive_appointments',
  'archive_invoices',
  'archive_proposals',
  'archive_maintenancePlans',
  'archive_equipment',
  'archive_customers'
];

function refreshAuthToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: fbConfig.user.azp || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      refresh_token: refreshToken
    }).toString();

    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.access_token) {
            accessToken = parsed.access_token;
            console.log('Successfully refreshed OAuth token.');
            resolve(accessToken);
          } else {
            console.log('Token refresh warning:', d);
            resolve(accessToken);
          }
        } catch (e) {
          resolve(accessToken);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    let data = null;
    if (body) {
      data = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(url, {
      method: options.method || 'GET',
      headers
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: resData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function parseFirestoreValue(val) {
  if (val === null || val === undefined) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) {
    const d = new Date(val.timestampValue);
    return {
      _seconds: Math.floor(d.getTime() / 1000),
      _nanoseconds: (d.getTime() % 1000) * 1000000
    };
  }
  if ('nullValue' in val) return null;
  if ('mapValue' in val) {
    const res = {};
    const sub = val.mapValue.fields || {};
    for (const k of Object.keys(sub)) {
      res[k] = parseFirestoreValue(sub[k]);
    }
    return res;
  }
  if ('arrayValue' in val) {
    const vals = val.arrayValue.values || [];
    return vals.map(parseFirestoreValue);
  }
  if ('geoPointValue' in val) return val.geoPointValue;
  if ('referenceValue' in val) return val.referenceValue;
  return val;
}

function parseFirestoreDoc(doc) {
  const result = {};
  const fields = doc.fields || {};
  for (const k of Object.keys(fields)) {
    result[k] = parseFirestoreValue(fields[k]);
  }
  return result;
}

async function streamToBigQuery(tableName, rows) {
  if (rows.length === 0) return 0;
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableName}/insertAll`;
  const bqRows = rows.map((r, idx) => ({
    insertId: `${r.document_id}_import_${Date.now()}_${idx}`,
    json: r
  }));

  const res = await request(url, { method: 'POST' }, {
    kind: 'bigquery#tableDataInsertAllRequest',
    rows: bqRows
  });

  if (res.status !== 200) {
    console.error(`Error streaming to ${tableName}:`, JSON.stringify(res.data));
    return 0;
  }
  if (res.data.insertErrors && res.data.insertErrors.length > 0) {
    console.error(`Insert errors in ${tableName}:`, JSON.stringify(res.data.insertErrors.slice(0, 3)));
  }
  return rows.length;
}

async function backfillCollection(colName) {
  const targetTable = `${colName}_raw_changelog`;
  console.log(`\n==================================================`);
  console.log(`Starting backfill: Firestore [${colName}] -> BigQuery [${targetTable}]`);
  console.log(`==================================================`);

  let pageToken = null;
  let totalDocs = 0;
  let totalStreamed = 0;

  do {
    let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${colName}?pageSize=300`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const res = await request(url);
    if (res.status !== 200) {
      console.error(`Error reading ${colName} (status ${res.status}):`, res.data);
      break;
    }

    const docs = res.data.documents || [];
    if (docs.length === 0) break;

    totalDocs += docs.length;

    const bqRecords = docs.map(doc => {
      const docName = doc.name;
      const parts = docName.split('/');
      const docId = parts[parts.length - 1];
      const parsedData = parseFirestoreDoc(doc);
      if (!parsedData.id) parsedData.id = docId;

      return {
        timestamp: '1970-01-01T00:00:00.000Z',
        event_id: '',
        document_name: docName,
        operation: 'IMPORT',
        data: JSON.stringify(parsedData),
        old_data: null,
        document_id: docId,
        path_params: null
      };
    });

    const streamed = await streamToBigQuery(targetTable, bqRecords);
    totalStreamed += streamed;
    process.stdout.write(`  Transferred: ${totalStreamed} records...\r`);

    pageToken = res.data.nextPageToken || null;
  } while (pageToken);

  console.log(`\nCompleted [${colName}]: ${totalStreamed} total records backfilled into ${targetTable}.`);
  return totalStreamed;
}

async function main() {
  console.log(`Initiating BigQuery Backfill for project [${projectId}], dataset [${datasetId}]...`);
  await refreshAuthToken();

  const summary = {};
  for (const col of targetCollections) {
    try {
      const count = await backfillCollection(col);
      summary[col] = count;
    } catch (err) {
      console.error(`Failed backfill for [${col}]:`, err.message);
      summary[col] = `Error: ${err.message}`;
    }
  }

  console.log(`\n==================================================`);
  console.log(`BIGQUERY BACKFILL SUMMARY`);
  console.log(`==================================================`);
  console.table(summary);
}

main().catch(console.error);
