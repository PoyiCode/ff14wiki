#!/usr/bin/env node
// 建立 food（料理）↔ ingredients（食材）的雙向關聯，讓 agent 能回答「這道菜用什麼
// 食材」「這個食材能做什麼料理」。來源：scripts/recipe-link-data.json（由官方 Recipe ×
// Item 表 join、依名稱對應到既有 food/ingredients 條目而成；常見食材的反向連結上限 15）。
// 正向：food 條目補 related（指向 ingredients）與「用到的食材：…」。
// 反向：ingredients 條目補 related（指向 food）與「可入菜：…」。
// 冪等且只追加：related 以尾端 id 去重並偏好限定式；.md 已含該行就跳過，不覆蓋既有內容。
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const data = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'recipe-link-data.json'), 'utf8'));
const FLBL = { en: 'Ingredients used: ', ja: '使う食材：', 'zh-CN': '用到的食材：', 'zh-TW': '用到的食材：' };
const ILBL = { en: 'Used in dishes: ', ja: '使われる料理：', 'zh-CN': '可入菜：', 'zh-TW': '可入菜：' };
const SEP = { en: ', ', ja: '、', 'zh-CN': '、', 'zh-TW': '、' };

function addRelated(metaFile, refs) {
  if (!fs.existsSync(metaFile) || !refs.length) return;
  let meta = fs.readFileSync(metaFile, 'utf8');
  const m = meta.match(/^related:\s*\[([^\]]*)\]/m);
  const existing = m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
  const tail = (s) => (s.includes('/') ? s.slice(s.indexOf('/') + 1) : s);
  const byTail = new Map();
  for (const s of [...existing, ...refs]) {
    const t = tail(s), cur = byTail.get(t);
    if (!cur || (s.includes('/') && !cur.includes('/'))) byTail.set(t, s);
  }
  const merged = [...byTail.values()];
  if (merged.length === existing.length && merged.every((v, i) => v === existing[i])) return;
  const line = `related: [${merged.join(', ')}]`;
  if (m) meta = meta.replace(/^related:\s*\[[^\]]*\]/m, line);
  else if (/^tags:/m.test(meta)) meta = meta.replace(/^tags:/m, line + '\ntags:');
  else meta = meta.replace(/\n*$/, '') + '\n' + line + '\n';
  fs.writeFileSync(metaFile, meta);
}
function title(category, slug, loc) {
  const f = path.join(root, 'content', category, slug, `${loc}.md`);
  if (!fs.existsSync(f)) return '';
  const m = fs.readFileSync(f, 'utf8').match(/^title:\s*"?(.*?)"?\s*$/m);
  return m ? m[1] : '';
}
function appendBody(category, slug, loc, label, names) {
  if (!names.length) return false;
  const f = path.join(root, 'content', category, slug, `${loc}.md`);
  if (!fs.existsSync(f)) return false;
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes(label)) return false;
  fs.writeFileSync(f, content.replace(/\n*$/, '') + '\n\n' + label + names.join(SEP[loc]) + '\n');
  return true;
}

let fMeta = 0, fBody = 0, iMeta = 0, iBody = 0;
// 正向：food → ingredients
for (const [slug, ings] of Object.entries(data.food)) {
  addRelated(path.join(root, 'content', 'food', slug, 'meta.yaml'), ings.map((s) => `ingredients/${s}`)); fMeta++;
  for (const loc of LOCALES) {
    const names = ings.map((s) => title('ingredients', s, loc)).filter(Boolean);
    if (appendBody('food', slug, loc, FLBL[loc], names)) fBody++;
  }
}
// 反向：ingredients → food
for (const [slug, dishes] of Object.entries(data.ingredient)) {
  addRelated(path.join(root, 'content', 'ingredients', slug, 'meta.yaml'), dishes.map((s) => `food/${s}`)); iMeta++;
  for (const loc of LOCALES) {
    const names = dishes.map((s) => title('food', s, loc)).filter(Boolean);
    if (appendBody('ingredients', slug, loc, ILBL[loc], names)) iBody++;
  }
}
console.log(`enrich-food-ingredients：food 更新 meta ${fMeta}／body ${fBody}，ingredients 更新 meta ${iMeta}／body ${iBody}。`);
