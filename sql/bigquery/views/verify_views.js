const fs = require('fs');
const path = require('path');
const https = require('https');

const fbConfig = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const token = fbConfig.tokens.access_token;
const projectId = 'murphys-fsm-staging';

const views = [
  'vw_all_jobs',
  'vw_all_invoices',
  'vw_all_appointments',
  'vw_all_customers',
  'vw_all_equipment',
  'vw_ar_aging',
  'vw_job_profitability',
  'vw_technician_productivity',
  'vw_tax_liability'
];

function queryView(v) {
  return new Promise((resolve) => {
    const postBody = JSON.stringify({
      query: `SELECT COUNT(*) as count FROM \`murphys-fsm-staging.fsm_analytics.${v}\``,
      useLegacySql: false
    });
    const req = https.request(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.rows) {
            resolve(parsed.rows[0].f[0].v);
          } else {
            resolve('Error: ' + JSON.stringify(parsed.error ? parsed.error.message : parsed));
          }
        } catch (e) {
          resolve('JSON error');
        }
      });
    });
    req.write(postBody);
    req.end();
  });
}

async function main() {
  console.log('Verifying all 9 analytical views in BigQuery...');
  const results = {};
  for (const v of views) {
    const count = await queryView(v);
    results[v] = count;
  }
  console.table(results);
}

main();
