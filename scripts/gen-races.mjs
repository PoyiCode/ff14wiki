#!/usr/bin/env node
// 從 scripts/race-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Race / Tribe；簡中取自 thewakingsands，繁中以 OpenCC 由簡轉繁）生成
// content/lore/ 下的種族條目。冪等：資料夾已存在就跳過（保留手寫的 miqote）。
import fs from 'node:fs';
import path from 'node:path';

const LORE = path.join(process.cwd(), 'content', 'lore');
const races = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'race-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (title, summary, body) => `---\ntitle: ${Q(title)}\nsummary: ${Q(summary)}\n---\n\n${body}\n`;

let created = 0, skipped = 0;
for (const r of races) {
  const dir = path.join(LORE, r.slug);
  if (fs.existsSync(dir)) { skipped++; continue; }
  fs.mkdirSync(dir, { recursive: true });

  const tEn = r.tribes.map((t) => t.en);
  const meta =
    `id: ${r.slug}\ncategory: lore\ntype: race\n` +
    `tribes: [${tEn.map(Q).join(', ')}]\ntags: [race, people]\nstatus: stable\n`;
  fs.writeFileSync(path.join(dir, 'meta.yaml'), meta);

  for (const loc of LOCALES) {
    const n = r.n[loc] || r.n.en;
    const t = r.tribes.map((x) => x[loc] || x.en);
    let summary, body;
    if (loc === 'en') {
      summary = `One of the peoples of the world, split into the ${t[0]} and ${t[1]} clans.`;
      body = `**${n}** are one of the peoples of the world, divided into two clans: the **${t[0]}** and the **${t[1]}**. A resident may meet folk of this race anywhere in their travels. In-game name: ${r.en}.`;
    } else if (loc === 'ja') {
      summary = `世界の種族のひとつ。「${t[0]}」と「${t[1]}」の二部族に分かれる。`;
      body = `**${n}**は世界の種族のひとつで、「${t[0]}」と「${t[1]}」の二つの部族に分かれる。旅のなかでこの種族の人々とはどこでも出会う。ゲーム内名称：${r.en}。`;
    } else {
      const w = loc === 'zh-CN' ? '种族' : '種族';
      const bu = loc === 'zh-CN' ? '部族' : '部族';
      const lv = loc === 'zh-CN' ? '游戏' : '遊戲';
      summary = `世界的一支${w}，分為「${t[0]}」與「${t[1]}」兩個${bu}。`
        .replace('分為', loc === 'zh-CN' ? '分为' : '分為').replace('與', loc === 'zh-CN' ? '与' : '與');
      body = (loc === 'zh-CN'
        ? `**${n}** 是世界的一支种族，分为「${t[0]}」与「${t[1]}」两个部族。旅途中在各地都可能遇到这个种族的人。游戏内名称：${r.en}。`
        : `**${n}** 是世界的一支種族，分為「${t[0]}」與「${t[1]}」兩個部族。旅途中在各地都可能遇到這個種族的人。遊戲內名稱：${r.en}。`);
    }
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, summary, body));
  }
  created++;
}
console.log(`gen-races：新增 ${created}，跳過（已存在）${skipped}。共 ${races.length} 個種族。`);
