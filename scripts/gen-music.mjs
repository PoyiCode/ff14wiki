#!/usr/bin/env node
// 從 scripts/music-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Orchestrion，即管弦樂機關樂曲；英/日原文，簡中取自 thewakingsands，
// 繁中以 OpenCC 由簡轉繁）生成 content/music/。冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'music');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'music-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${m.slug}\ncategory: music\ntype: orchestrion\nmusic: ${Q(m.en)}\ntags: [music, orchestrion]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = m.n[loc] || m.n.en;
    let s, b;
    if (loc === 'en') { s = `A piece of Eorzean music.`;
      b = `**${n}** is a track from Final Fantasy XIV — an orchestrion roll a resident might play, hum, or chat about with players. In-game title: ${m.en}.`; }
    else if (loc === 'ja') { s = `エオルゼアの楽曲。`;
      b = `**${n}**はFF14の楽曲（オーケストリオン譜）。住民が流したり口ずさんだり、プレイヤーと語り合ったりする一曲。ゲーム内の曲名：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `艾欧泽亚的乐曲。`;
      b = `**${n}** 是《最终幻想14》中的乐曲（管弦乐机关乐谱），居民可能会播放、哼唱，或和玩家聊起的一首曲子。游戏内曲名：${m.en}。`; }
    else { s = `艾歐澤亞的樂曲。`;
      b = `**${n}** 是《Final Fantasy XIV》中的樂曲（管弦樂機關樂譜），居民可能會播放、哼唱，或和玩家聊起的一首曲子。遊戲內曲名：${m.en}。`; }
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, b));
  }
  created++;
}
console.log(`gen-music：新增 ${created}，跳過 ${skipped}。共 ${data.length} 首樂曲。`);
