#!/usr/bin/env node
// Translation coverage gate for the LoopForge UI dictionaries.
//
// The interface renders Chinese source copy and i18n.js rewrites it at runtime
// with i18n-en.js or i18n-vi.js. A key that exists in Chinese but not in the
// selected dictionary silently falls back to Chinese, which is exactly the
// half-translated state this gate is meant to catch.
//
// Usage:
//   node scripts/i18n-check.mjs            # gate: fail on any gap
//   node scripts/i18n-check.mjs --verbose  # list every problem
//   node scripts/i18n-check.mjs --json     # machine-readable report

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const WEB = path.join(ROOT, 'web');
const HAN = /[\u3400-\u9fff]/;
// Literal commands a user must type stay in their original form on purpose.
const LITERAL_ALLOWLIST = [/绑定账号/];
const ATTRS = ['placeholder', 'title', 'aria-label', 'data-tip', 'data-tooltip'];
const PLACEHOLDER = /\{\{[^}]+\}\}|\{[a-zA-Z0-9_.]+\}|%[sdvq]|\$[0-9]/g;

const args = new Set(process.argv.slice(2));
const verbose = args.has('--verbose');
const json = args.has('--json');

function loadDictionary(file) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(path.join(WEB, file), 'utf8'), sandbox, { filename: file });
  const name = Object.keys(sandbox.window).find((k) => k.startsWith('LF_I18N_'));
  return sandbox.window[name] || {};
}

function placeholders(value) {
  return (String(value).match(PLACEHOLDER) || []).sort().join('|');
}

function countDuplicateKeys(file) {
  const source = readFileSync(path.join(WEB, file), 'utf8');
  const seen = new Map();
  const duplicates = [];
  for (const block of source.split('Object.assign(').slice(1)) {
    const start = block.indexOf('{');
    const end = block.lastIndexOf('}');
    if (start < 0 || end < start) continue;
    let parsed;
    try {
      parsed = JSON.parse(block.slice(start, end + 1));
    } catch {
      continue;
    }
    for (const key of Object.keys(parsed)) {
      seen.set(key, (seen.get(key) || 0) + 1);
      if (seen.get(key) === 2) duplicates.push(key);
    }
  }
  return duplicates;
}

function htmlStrings() {
  const found = [];
  for (const file of readdirSync(WEB).filter((f) => f.endsWith('.html'))) {
    let html = readFileSync(path.join(WEB, file), 'utf8');
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    const seen = new Set();
    for (const match of html.matchAll(/>([^<>]+)</g)) {
      const text = match[1].trim();
      if (text && HAN.test(text) && !seen.has(text)) {
        seen.add(text);
        found.push({ file, text, kind: 'text' });
      }
    }
    for (const name of ATTRS) {
      const re = new RegExp(`${name}="([^"]*)"`, 'g');
      for (const match of html.matchAll(re)) {
        const value = match[1].trim();
        if (value && HAN.test(value) && !seen.has(value)) {
          seen.add(value);
          found.push({ file, text: value, kind: name });
        }
      }
    }
  }
  return found;
}

const en = loadDictionary('i18n-en.js');
const vi = loadDictionary('i18n-vi.js');
const zhKeys = Object.keys(en);

const report = {
  source: { keys: zhKeys.length, file: 'web/i18n-en.js' },
  vietnamese: { keys: Object.keys(vi).length, file: 'web/i18n-vi.js' },
  missing: [],
  extra: [],
  empty: [],
  untranslated: [],
  chinese: [],
  placeholders: [],
  duplicates: { en: countDuplicateKeys('i18n-en.js'), vi: countDuplicateKeys('i18n-vi.js') },
  html: [],
};

for (const key of zhKeys) {
  if (!Object.prototype.hasOwnProperty.call(vi, key)) {
    report.missing.push(key);
    continue;
  }
  const value = String(vi[key]);
  if (!value.trim()) report.empty.push(key);
  if (value === key && HAN.test(key)) report.untranslated.push(key);
  if (HAN.test(value) && !LITERAL_ALLOWLIST.some((re) => re.test(value))) report.chinese.push(key);
  if (placeholders(en[key]) !== placeholders(value)) {
    report.placeholders.push({ key, en: en[key], vi: value });
  }
}
for (const key of Object.keys(vi)) {
  if (!Object.prototype.hasOwnProperty.call(en, key)) report.extra.push(key);
}
for (const entry of htmlStrings()) {
  if (!Object.prototype.hasOwnProperty.call(vi, entry.text)) report.html.push(entry);
}

const failures =
  report.missing.length +
  report.extra.length +
  report.empty.length +
  report.untranslated.length +
  report.chinese.length +
  report.placeholders.length +
  report.html.length;

if (json) {
  console.log(JSON.stringify({ ...report, failures }, null, 2));
} else {
  const line = (label, items) => {
    const count = Array.isArray(items) ? items.length : items;
    console.log(`${count === 0 ? 'ok  ' : 'FAIL'} ${label}: ${count}`);
    if (verbose && Array.isArray(items)) {
      for (const item of items.slice(0, 40)) {
        console.log('     ', typeof item === 'string' ? item : JSON.stringify(item));
      }
      if (items.length > 40) console.log(`      … ${items.length - 40} more`);
    }
  };
  console.log(`Vietnamese dictionary: ${report.vietnamese.keys} keys against ${report.source.keys} Chinese keys`);
  line('missing Vietnamese keys', report.missing);
  line('extra keys not in the Chinese source', report.extra);
  line('empty translations', report.empty);
  line('values left identical to the Chinese key', report.untranslated);
  line('values still containing Chinese characters', report.chinese);
  line('placeholder / interpolation mismatches', report.placeholders);
  line('visible Chinese strings in web/*.html outside the dictionary', report.html);
  if (report.duplicates.en.length) {
    console.log(`warn duplicate keys inside i18n-en.js: ${report.duplicates.en.length} (upstream, merged last-wins)`);
  }
  if (report.duplicates.vi.length) {
    console.log(`FAIL duplicate keys inside i18n-vi.js: ${report.duplicates.vi.length}`);
  }
  console.log(failures === 0 ? '\nPASS translation coverage is complete.' : `\nFAIL ${failures} coverage problem(s).`);
}

process.exit(failures === 0 && report.duplicates.vi.length === 0 ? 0 : 1);
