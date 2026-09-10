/**
 * Deploy BigQuery Analytical Views
 * Project: murphys-fsm-staging
 * Dataset: fsm_analytics
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const fbConfig = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
let accessToken = fbConfig.tokens.access_token;
const refreshToken = fbConfig.tokens.refresh_token;
const projectId = 'murphys-fsm-staging';

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
            resolve(accessToken);
          } else {
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

function runQuery(query) {
  return new Promise((resolve, reject) => {
    const postBody = JSON.stringify({
      query,
      useLegacySql: false
    });

    const req = https.request(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: d });
        }
      });
    });

    req.on('error', reject);
    req.write(postBody);
    req.end();
  });
}

async function main() {
  await refreshAuthToken();
  const sqlFile = path.join(__dirname, 'deploy_all_views.sql');
  const content = fs.readFileSync(sqlFile, 'utf8');

  // Split by CREATE OR REPLACE VIEW
  const statements = content.split(/(?=CREATE OR REPLACE VIEW)/g).filter(s => s.trim().startsWith('CREATE OR REPLACE VIEW'));

  console.log(`Found ${statements.length} view statements to deploy...`);

  for (let i = 0; i < statements.length; i++) {
    const rawSql = statements[i].trim().replace(/;$/, '');
    const viewNameMatch = rawSql.match(/CREATE OR REPLACE VIEW `[^`]+\.([^`]+)`/);
    const viewName = viewNameMatch ? viewNameMatch[1] : `View_${i+1}`;

    process.stdout.write(`Deploying ${viewName}... `);
    const res = await runQuery(rawSql);

    if (res.status === 200 && !res.data.error) {
      console.log('SUCCESS');
    } else {
      console.log('FAILED');
      console.error(JSON.stringify(res.data, null, 2));
    }
  }

  console.log('\nAll view deployments finished.');
}

main().catch(console.error);
