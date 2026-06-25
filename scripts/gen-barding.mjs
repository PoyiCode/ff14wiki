#!/usr/bin/env node
// 從 scripts/barding-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// BuddyEquip 表，即陸行鳥馬具／鞍具；英/日原文，簡中取自 thewakingsands，
// 繁中以 OpenCC 由簡轉繁）生成 content/barding/。冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'barding');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'barding-data.json'), 'utf8'));
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
    `id: ${m.slug}\ncategory: barding\ntype: barding\nbarding: ${Q(m.en)}\ntags: [barding, chocobo, companion]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = pick(m.n, loc);
    let s, b;
    if (loc === 'en') { s = `Chocobo barding.`;
      b = `**${n}** is barding — saddle or armour a resident dresses their chocobo companion in, to ride in style or show off their trusty bird. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `チョコボのバルディング。`;
      b = `**${n}**は相棒のチョコボに着せる鞍やバルディング（装甲）。颯爽と駆けたり、愛鳥を見せびらかしたりするための装い。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `陆行鸟马具。`;
      b = `**${n}** 是陆行鸟马具——居民为自己的陆行鸟伙伴穿戴的鞍具或装甲，用来神气地驰骋或炫耀爱驹。游戏内名称：${m.en}。`; }
    else { s = `陸行鳥馬具。`;
      b = `**${n}** 是陸行鳥馬具——居民為自己的陸行鳥夥伴穿戴的鞍具或裝甲，用來神氣地馳騁或炫耀愛駒。遊戲內名稱：${m.en}。`; }
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, b));
  }
  created++;
}
console.log(`gen-barding：新增 ${created}，跳過 ${skipped}。共 ${data.length} 件馬具。`);
