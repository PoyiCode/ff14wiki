#!/usr/bin/env node
// 從 scripts/minion-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Companion；簡中取自 thewakingsands；繁中以 OpenCC 由簡轉繁）生成 content/minions/。
// 冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'minions');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'minion-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${m.slug}\ncategory: minions\ntype: minion\nminion: ${Q(m.en)}\ntags: [minion, companion]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = m.n[loc] || m.n.en;
    let s, b;
    if (loc === 'en') { s = `A minion that follows you around.`;
      b = `**${n}** is a minion — a small companion that trots along beside a resident, purely for company and charm, and that players love to collect and show off. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `傍らに連れ歩く小さなミニオン。`;
      b = `**${n}**はミニオン（小さな連れ歩きのお供）。住民の傍らをついて回り、日常を彩る存在で、プレイヤーが集めて見せ合うことも。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `跟在身边的小宠物。`;
      b = `**${n}** 是一只宠物（ミニオン），会跟在居民身边小跑，纯粹为了陪伴与可爱，也是玩家爱收藏炫耀的对象。游戏内名称：${m.en}。`; }
    else { s = `跟在身邊的小寵物。`;
      b = `**${n}** 是一隻寵物（ミニオン），會跟在居民身邊小跑，純粹為了陪伴與可愛，也是玩家愛收藏炫耀的對象。遊戲內名稱：${m.en}。`; }
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, b));
  }
  created++;
}
console.log(`gen-minions：新增 ${created}，跳過 ${skipped}。共 ${data.length} 個寵物。`);
