#!/usr/bin/env node
// 從 scripts/mount-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Mount；簡中取自 thewakingsands，繁中以 OpenCC 由簡轉繁）生成 content/mounts/。
// 冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'mounts');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'mount-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${m.slug}\ncategory: mounts\ntype: mount\nmount: ${Q(m.en)}\ntags: [mount, travel]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = m.n[loc] || m.n.en;
    let s, b;
    if (loc === 'en') { s = `A mount for getting around.`;
      b = `**${n}** is a mount — a creature or vehicle a resident can ride to travel, and that players love to show off. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `移動に使う乗り物（マウント）。`;
      b = `**${n}**はマウント（騎乗用の乗り物）。住民が移動に使い、プレイヤーが見せ合うことも。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `代步用的坐骑。`;
      b = `**${n}** 是一种坐骑（可骑乘的生物或载具），居民用来代步旅行，也是玩家爱炫耀的对象。游戏内名称：${m.en}。`; }
    else { s = `代步用的坐騎。`;
      b = `**${n}** 是一種坐騎（可騎乘的生物或載具），居民用來代步旅行，也是玩家愛炫耀的對象。遊戲內名稱：${m.en}。`; }
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, b));
  }
  created++;
}
console.log(`gen-mounts：新增 ${created}，跳過 ${skipped}。共 ${data.length} 個坐騎。`);
