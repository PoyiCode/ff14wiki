#!/usr/bin/env node
// 為 world 中作為「上層節點」的條目（zone／城市／城區）補上其轄下子節點清單，
// 與 enrich-region-zones（地區→zone）對稱，補完世界地理階層的反向視圖：
//   - 地標・村落（rank=landmark）→「地標・村落：…」
//   - 乙太之光／乙太網（rank=aetheryte）→「乙太之光：…」
// 並在 meta 補上反向 related（指向各子節點），讓 agent 讀單一條目即知此處有什麼。
// 子節點關係取自各條目既有的 parent 欄位（由 enrich-world-hierarchy / 生成器寫入）。
// 冪等且只追加：related 以尾端 id 去重並偏好限定式；.md 已含該行就跳過，不覆蓋內容。
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const W = path.join(root, 'content', 'world');
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const LM = { en: 'Landmarks here: ', ja: 'この地のランドマーク：', 'zh-CN': '本地地标・村落：', 'zh-TW': '本地地標・村落：' };
const AE = { en: 'Aetherytes here: ', ja: 'この地のエーテライト：', 'zh-CN': '本地以太之光：', 'zh-TW': '本地乙太之光：' };
const SEP = { en: ', ', ja: '、', 'zh-CN': '、', 'zh-TW': '、' };

// 收集 parent -> children（依 rank 分組）
const children = new Map();
for (const d of fs.readdirSync(W)) {
  const mp = path.join(W, d, 'meta.yaml');
  if (!fs.existsSync(mp)) continue;
  let m; try { m = yaml.load(fs.readFileSync(mp, 'utf8')) || {}; } catch { continue; }
  if (!m.parent) continue;
  const p = String(m.parent).split('/').pop();
  if (!children.has(p)) children.set(p, []);
  children.get(p).push({ slug: d, rank: m.rank });
}

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
const title = (slug, loc) => {
  const f = path.join(W, slug, `${loc}.md`);
  if (!fs.existsSync(f)) return '';
  const m = fs.readFileSync(f, 'utf8').match(/^title:\s*"?(.*?)"?\s*$/m);
  return m ? m[1] : '';
};
function appendBody(slug, loc, label, names) {
  if (!names.length) return false;
  const f = path.join(W, slug, `${loc}.md`);
  if (!fs.existsSync(f)) return false;
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes(label)) return false;
  fs.writeFileSync(f, content.replace(/\n*$/, '') + '\n\n' + label + names.join(SEP[loc]) + '\n');
  return true;
}

let metaUpd = 0, bodyUpd = 0;
for (const [parent, kids] of children) {
  if (!fs.existsSync(path.join(W, parent, 'meta.yaml'))) continue;
  const landmarks = kids.filter((k) => k.rank === 'landmark').map((k) => k.slug).sort();
  const aetherytes = kids.filter((k) => k.rank === 'aetheryte').map((k) => k.slug).sort();
  addRelated(path.join(W, parent, 'meta.yaml'), kids.map((k) => `world/${k.slug}`)); metaUpd++;
  for (const loc of LOCALES) {
    if (appendBody(parent, loc, LM[loc], landmarks.map((s) => title(s, loc)).filter(Boolean))) bodyUpd++;
    if (appendBody(parent, loc, AE[loc], aetherytes.map((s) => title(s, loc)).filter(Boolean))) bodyUpd++;
  }
}
console.log(`enrich-zone-landmarks：更新 meta ${metaUpd}，補上清單 ${bodyUpd} 個檔。`);
