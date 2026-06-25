#!/usr/bin/env node
// 從 scripts/housing-fixture-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Item 表中房屋部件類別（ItemUICategory 65–75：屋頂、外牆、窗、門、屋頂裝飾、
// 外牆裝飾、門牌、圍欄、內牆、地板、照明）；英/日原文，簡中取自 thewakingsands，
// 繁中以 OpenCC 由簡轉繁；只取風味敘述）生成 content/housing-fixtures/。
// 冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'housing-fixtures');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'housing-fixture-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
const pick = (o, loc) => (o && (o[loc] || o.en)) || '';
const TYPE = {
  'roof': { 'zh-TW': '屋頂', 'zh-CN': '屋顶', ja: '屋根', en: 'roof' },
  'exterior-wall': { 'zh-TW': '外牆', 'zh-CN': '外墙', ja: '外壁', en: 'exterior wall' },
  'window': { 'zh-TW': '窗戶', 'zh-CN': '窗户', ja: '窓', en: 'window' },
  'door': { 'zh-TW': '門', 'zh-CN': '门', ja: '扉', en: 'door' },
  'roof-decoration': { 'zh-TW': '屋頂裝飾', 'zh-CN': '屋顶装饰', ja: '屋根装飾', en: 'roof decoration' },
  'exterior-wall-decoration': { 'zh-TW': '外牆裝飾', 'zh-CN': '外墙装饰', ja: '外壁装飾', en: 'exterior wall decoration' },
  'placard': { 'zh-TW': '門牌', 'zh-CN': '门牌', ja: '看板', en: 'placard' },
  'fence': { 'zh-TW': '圍欄', 'zh-CN': '围栏', ja: 'フェンス', en: 'fence' },
  'interior-wall': { 'zh-TW': '內牆', 'zh-CN': '内墙', ja: '内壁', en: 'interior wall' },
  'flooring': { 'zh-TW': '地板', 'zh-CN': '地板', ja: '床', en: 'flooring' },
  'ceiling-light': { 'zh-TW': '照明', 'zh-CN': '照明', ja: '照明', en: 'ceiling light' },
};
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  const idval = /^\d+$/.test(m.slug) ? Q(m.slug) : m.slug;
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${idval}\ncategory: housing-fixtures\ntype: fixture\nfixture: ${Q(m.en)}\nfixture_type: ${m.fixtureType}\ntags: [housing, fixture, ${m.fixtureType}]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = pick(m.n, loc);
    const desc = m.desc ? pick(m.desc, loc) : '';
    const t = (TYPE[m.fixtureType] && TYPE[m.fixtureType][loc]) || m.fixtureType;
    let s, lead;
    if (loc === 'en') { s = `A house ${t}.`;
      lead = `**${n}** is a house fixture — a ${t} a resident can fit when building or remodelling their home. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `家の${t}（部材）。`;
      lead = `**${n}**は家の部材（${t}）。住民が家を建てたり改装したりするときに取り付ける。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `房屋部件（${t}）。`;
      lead = `**${n}** 是房屋部件（${t}），居民在建造或改装房屋时可以安装。游戏内名称：${m.en}。`; }
    else { s = `房屋部件（${t}）。`;
      lead = `**${n}** 是房屋部件（${t}），居民在建造或改裝房屋時可以安裝。遊戲內名稱：${m.en}。`; }
    const body = desc ? `${lead}\n\n${desc}` : lead;
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body));
  }
  created++;
}
console.log(`gen-housing-fixtures：新增 ${created}，跳過 ${skipped}。共 ${data.length} 件房屋部件。`);
