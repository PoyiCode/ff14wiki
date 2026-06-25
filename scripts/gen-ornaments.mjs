#!/usr/bin/env node
// 從 scripts/ornament-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Ornament 表，即時尚配飾；英/日原文，簡中取自 thewakingsands，繁中以
// OpenCC 由簡轉繁）生成 content/ornaments/。冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'ornaments');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'ornament-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${m.slug}\ncategory: ornaments\ntype: ornament\nornament: ${Q(m.en)}\ntags: [ornament, fashion]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = m.n[loc] || m.n.en;
    let s, b;
    if (loc === 'en') { s = `A fashion accessory.`;
      b = `**${n}** is a fashion accessory — a wearable item a resident can equip purely to look good, strike a pose, or accent an outfit. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `ファッションアクセサリー。`;
      b = `**${n}**はファッションアクセサリー。住民が見た目のために身につけ、ポーズを取ったり装いを引き立てたりする一品。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `时尚配饰。`;
      b = `**${n}** 是一件时尚配饰，居民可以纯粹为了好看而装备，用来摆拍或点缀穿搭。游戏内名称：${m.en}。`; }
    else { s = `時尚配飾。`;
      b = `**${n}** 是一件時尚配飾，居民可以純粹為了好看而裝備，用來擺拍或點綴穿搭。遊戲內名稱：${m.en}。`; }
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, b));
  }
  created++;
}
console.log(`gen-ornaments：新增 ${created}，跳過 ${skipped}。共 ${data.length} 件時尚配飾。`);
