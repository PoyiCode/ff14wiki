#!/usr/bin/env node
// 從 scripts/food-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Item 表中 ItemUICategory=46「料理」；英/日原文，簡中取自 thewakingsands，
// 繁中以 OpenCC 由簡轉繁。只取風味敘述，刻意捨棄食物加成等遊戲性數值）
// 生成 content/food/。冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'food');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'food-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
const pick = (o, loc) => (o && (o[loc] || o.en)) || '';
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${m.slug}\ncategory: food\ntype: dish\ndish: ${Q(m.en)}\ntags: [food, cuisine]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = pick(m.n, loc);
    const desc = m.desc ? pick(m.desc, loc) : '';
    let s, lead;
    if (loc === 'en') { s = `A dish of Eorzea.`;
      lead = `**${n}** is a dish residents cook and eat — served at taverns and home tables across Eorzea. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `エオルゼアの料理。`;
      lead = `**${n}**はエオルゼアの住民が作って食べる料理。酒場や家庭の食卓に並ぶ一品。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `艾欧泽亚的料理。`;
      lead = `**${n}** 是艾欧泽亚居民会烹调与享用的料理，常见于酒馆与家庭餐桌。游戏内名称：${m.en}。`; }
    else { s = `艾歐澤亞的料理。`;
      lead = `**${n}** 是艾歐澤亞居民會烹調與享用的料理，常見於酒館與家庭餐桌。遊戲內名稱：${m.en}。`; }
    const body = desc ? `${lead}\n\n${desc}` : lead;
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body));
  }
  created++;
}
console.log(`gen-food：新增 ${created}，跳過 ${skipped}。共 ${data.length} 道料理。`);
