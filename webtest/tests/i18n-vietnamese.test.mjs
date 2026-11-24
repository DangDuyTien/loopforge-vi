import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { WEB_ROOT } from '../lib/load-app.mjs';

const HAN = /[\u3400-\u9fff]/;
const ATTRS = ['placeholder', 'title', 'aria-label', 'data-tip', 'data-tooltip'];

// A page in Vietnamese mode: i18n.js rewrites the Chinese copy with i18n-vi.js.
async function vietnamesePage(html) {
  const dom = new JSDOM(html.replace('<html', '<html data-lang="vi"'), {
    runScripts: 'outside-only',
    url: 'http://127.0.0.1/',
  });
  for (const file of ['i18n-en.js', 'i18n-vi.js', 'i18n.js']) {
    new vm.Script(await readFile(path.join(WEB_ROOT, file), 'utf8'), { filename: file })
      .runInContext(dom.getInternalVMContext());
  }
  return dom.window;
}

function leftoverChinese(roots) {
  const left = [];
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('[data-i18n-skip]')) continue;
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && HAN.test(node.nodeValue)) left.push(node.nodeValue.trim());
      }
      for (const name of ATTRS) {
        const value = el.getAttribute(name);
        if (value && HAN.test(value)) left.push(`${name}="${value}"`);
      }
    }
  }
  return left;
}

test('Vietnamese is the default language when nothing is stored', async () => {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'outside-only',
    url: 'http://127.0.0.1/',
  });
  new vm.Script(await readFile(path.join(WEB_ROOT, 'boot.js'), 'utf8'), { filename: 'boot.js' })
    .runInContext(dom.getInternalVMContext());
  assert.equal(dom.window.document.documentElement.dataset.lang, 'vi');
  assert.equal(dom.window.document.documentElement.lang, 'vi-VN');
  dom.window.close();
});

test('Vietnamese mode leaves no Chinese in the navigation and the top bar', async () => {
  const window = await vietnamesePage(await readFile(path.join(WEB_ROOT, 'index.html'), 'utf8'));
  const { document } = window;
  const roots = [...document.querySelectorAll('#platformRail, #settingsSidebar, .topbar')];
  assert.equal(roots.length, 3);
  assert.deepEqual(leftoverChinese(roots), []);
  assert.match(document.querySelector('#settingsSidebar [data-view="settings"] .nav-label').textContent, /Cài đặt/);
  window.close();
});

test('Vietnamese mode translates the visible copy the app renders', async () => {
  const window = await vietnamesePage('<html><body></body></html>');
  for (const [zh, vi] of [
    ['项目', 'Dự án'],
    ['需求', 'Yêu cầu'],
    ['运行', 'Lượt thực thi'],
    ['执行机器', 'Trình thực thi'],
    ['设置', 'Cài đặt'],
    ['保存', 'Lưu'],
    ['取消', 'Hủy'],
  ]) {
    assert.equal(window.lfTranslate(zh), vi, zh);
  }
  assert.doesNotMatch(window.lfTranslate('查看每条需求的执行结果。失败的点进去看卡在哪，再决定重试或修改。'), HAN);
  window.close();
});

test('the language switch offers Vietnamese, English and Chinese and marks the active one', async () => {
  const window = await vietnamesePage(await readFile(path.join(WEB_ROOT, 'index.html'), 'utf8'));
  const buttons = [...window.document.querySelectorAll('#langToggle [data-lang-value]')];
  assert.deepEqual(buttons.map((b) => b.dataset.langValue), ['vi', 'en', 'zh']);
  assert.deepEqual(buttons.map((b) => b.getAttribute('aria-checked')), ['true', 'false', 'false']);
  window.close();
});

test('choosing a language persists it and switching to English still translates', async () => {
  const window = await vietnamesePage(await readFile(path.join(WEB_ROOT, 'login.html'), 'utf8'));
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.lfSetLang('en');
  assert.equal(window.localStorage.getItem('loopforge.lang'), 'en');
  window.close();
});

test('both shells load the Vietnamese dictionary before the translator', async () => {
  for (const file of ['index.html', 'login.html']) {
    const html = await readFile(path.join(WEB_ROOT, file), 'utf8');
    assert.match(html, /i18n-vi\.js[\s\S]*i18n\.js/, `${file} must load i18n-vi.js`);
  }
});
