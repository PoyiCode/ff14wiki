#!/usr/bin/env node
// 建立 professions（職業）↔ world（其公會所在地）的雙向關聯，讓 agent 知道
// 「在哪裡練這一行 / 這個公會屬於什麼職業」。職業對應公會是固定的世界設定事實，
// 故以對照表表示；公會據點條目來自 gen-aethernet（乙太網水晶）。
//   - 職業 → 公會：.md 加「本行公會：…」，meta 補 related（world/<guild>）。
//   - 公會 → 職業：.md 加「相關職業：…」，meta 補 related（professions/<prof>）。
// 註：鍛冶匠／鎧甲匠／刻木匠的公會目前不在 world 資料中（乙太網來源未收錄），故略過。
// 冪等且只追加：related 以尾端 id 去重並偏好限定式；.md 已含該行就跳過，不覆蓋內容。
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const GUILD = {
  alchemist: 'alchemists-guild',
  botanist: 'botanists-guild',
  culinarian: 'culinarians-guild',
  fisher: 'fishermen-s-guild',
  goldsmith: 'goldsmiths-guild',
  leatherworker: 'leatherworkers-guild-shaded-bower',
  miner: 'miners-guild',
  weaver: 'weavers-guild',
};
const GLBL = { en: 'Trade guild: ', ja: 'このギルド：', 'zh-CN': '本行公会：', 'zh-TW': '本行公會：' };
const PLBL = { en: 'Related profession: ', ja: '関連職業：', 'zh-CN': '相关职业：', 'zh-TW': '相關職業：' };

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
const title = (cat, slug, loc) => {
  const f = path.join(root, 'content', cat, slug, `${loc}.md`);
  if (!fs.existsSync(f)) return '';
  const m = fs.readFileSync(f, 'utf8').match(/^title:\s*"?(.*?)"?\s*$/m);
  return m ? m[1] : '';
};
function appendBody(cat, slug, loc, label, name) {
  if (!name) return false;
  const f = path.join(root, 'content', cat, slug, `${loc}.md`);
  if (!fs.existsSync(f)) return false;
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes(label)) return false;
  fs.writeFileSync(f, content.replace(/\n*$/, '') + '\n\n' + label + name + '\n');
  return true;
}

let profMeta = 0, profBody = 0, guildMeta = 0, guildBody = 0, missing = 0;
for (const [prof, guild] of Object.entries(GUILD)) {
  const profMetaPath = path.join(root, 'content', 'professions', prof, 'meta.yaml');
  const guildMetaPath = path.join(root, 'content', 'world', guild, 'meta.yaml');
  if (!fs.existsSync(profMetaPath) || !fs.existsSync(guildMetaPath)) { missing++; continue; }
  // 職業 → 公會
  addRelated(profMetaPath, [`world/${guild}`]); profMeta++;
  for (const loc of LOCALES) if (appendBody('professions', prof, loc, GLBL[loc], title('world', guild, loc))) profBody++;
  // 公會 → 職業
  addRelated(guildMetaPath, [`professions/${prof}`]); guildMeta++;
  for (const loc of LOCALES) if (appendBody('world', guild, loc, PLBL[loc], title('professions', prof, loc))) guildBody++;
}
console.log(`enrich-profession-guild：職業更新 meta ${profMeta}／body ${profBody}，公會更新 meta ${guildMeta}／body ${guildBody}，缺公會略過 ${missing}。`);
