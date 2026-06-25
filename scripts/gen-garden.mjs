#!/usr/bin/env node
// 從 scripts/garden-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// HousingYardObject → Item，即戶外庭具／造景；英/日原文，簡中取自
// thewakingsands，繁中以 OpenCC 由簡轉繁；只取風味敘述）生成 content/garden/。
// 冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'garden');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'garden-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
const pick = (o, loc) => (o && (o[loc] || o.en)) || '';
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  const idval = /^\d+$/.test(m.slug) ? Q(m.slug) : m.slug;
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${idval}\ncategory: garden\ntype: yard_object\nfurnishing: ${Q(m.en)}\ntags: [garden, housing, outdoor]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = pick(m.n, loc);
    const desc = m.desc ? pick(m.desc, loc) : '';
    let s, lead;
    if (loc === 'en') { s = `An outdoor furnishing.`;
      lead = `**${n}** is an outdoor furnishing residents place to decorate their home exterior and garden. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `屋外の庭具・エクステリア。`;
      lead = `**${n}**は住民が家の外観や庭を飾るために置く屋外の庭具。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `户外庭具造景。`;
      lead = `**${n}** 是居民用来布置房屋外观与庭院的户外庭具。游戏内名称：${m.en}。`; }
    else { s = `戶外庭具造景。`;
      lead = `**${n}** 是居民用來布置房屋外觀與庭院的戶外庭具。遊戲內名稱：${m.en}。`; }
    const body = desc ? `${lead}\n\n${desc}` : lead;
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body));
  }
  created++;
}
console.log(`gen-garden：新增 ${created}，跳過 ${skipped}。共 ${data.length} 件庭具。`);
