#!/usr/bin/env node
// Fetch the active ngrok public https URL and write it to .env.development as EXPO_PUBLIC_API

const fs = require('fs');
const path = require('path');

async function main() {
  const apiUrl = 'http://127.0.0.1:4040/api/tunnels';
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`ngrok API ${apiUrl} returned ${res.status}`);
    const data = await res.json();
    const tunnels = Array.isArray(data.tunnels) ? data.tunnels : [];
    // Only accept real ngrok https tunnels targeting port 8000
    const isNgrokHost = (u) => /\.ngrok\.(io|app)$/.test(u.hostname) || u.hostname.includes('ngrok-free.app');
    const httpsNgrok = tunnels
      .map(t => ({ t, urlStr: t && t.public_url }))
      .filter(x => typeof x.urlStr === 'string' && x.urlStr.startsWith('https://'))
      .map(x => ({ ...x, url: new URL(x.urlStr) }))
      .filter(x => isNgrokHost(x.url));

    if (httpsNgrok.length === 0) {
      throw new Error('No https ngrok tunnels found. Start one with: ngrok http 8000');
    }

    // Prefer tunnels whose backend addr includes :8000
    const pick = httpsNgrok.find(x => String(x.t?.config?.addr || '').includes('8000')) || httpsNgrok[0];
    const url = pick.url.toString();
    const envPath = path.resolve(process.cwd(), '.env.development');

    // Read existing content if any and replace EXPO_PUBLIC_API line
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf8'); } catch {}

    const lines = content.split('\n').filter(Boolean).filter(l => !l.startsWith('EXPO_PUBLIC_API='));
    lines.push(`EXPO_PUBLIC_API=${url}`);
    const next = lines.join('\n') + '\n';
    fs.writeFileSync(envPath, next, 'utf8');

    console.log(`Set EXPO_PUBLIC_API to ${url} in ${envPath}`);
    console.log('Restart Expo for changes to take effect.');
  } catch (e) {
    console.error('[set-ngrok-api] Failed:', e?.message || e);
    process.exit(1);
  }
}

main();
