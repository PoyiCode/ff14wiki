#!/usr/bin/env node
// 從 scripts/title-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Title 表；英/日原文，簡中取自 thewakingsands，繁中以 OpenCC 由簡轉繁）
// 生成 content/titles/。冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'titles');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'title-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  let meta = `id: ${m.slug}\ncategory: titles\ntype: title\ntitle: ${Q(m.en)}\nplacement: ${m.prefix ? 'prefix' : 'suffix'}\n`;
  if (m.fem && m.fem.en) meta += `feminine: ${Q(m.fem.en)}\n`;
  meta += `tags: [title, identity]\nstatus: stable\n`;
  fs.writeFileSync(path.join(dir, 'meta.yaml'), meta);
  for (const loc of LOCALES) {
    const n = m.n[loc] || m.n.en;
    const fem = m.fem && (m.fem[loc] || null);
    let place, s, b;
    if (loc === 'en') {
      place = m.prefix ? `shown before the name` : `shown after the name`;
      s = `An adventurer's title.`;
      b = `**${n}** is a title a character can display — ${place}. Titles mark identity and achievement, and residents wear them with pride. In-game title: ${m.en}.`;
      if (fem) b += ` Feminine form: ${fem}.`;
    } else if (loc === 'ja') {
      place = m.prefix ? `名前の前に表示される` : `名前の後ろに表示される`;
      s = `冒険者の称号。`;
      b = `**${n}**はキャラクターが掲げられる称号で、${place}。称号は身分や実績の証で、住民は誇らしげに身につける。ゲーム内称号：${m.en}。`;
      if (fem) b += ` 女性形：${fem}。`;
    } else if (loc === 'zh-CN') {
      place = m.prefix ? `显示在名字前面` : `显示在名字后面`;
      s = `冒险者的称号。`;
      b = `**${n}** 是角色可以挂上的称号，${place}。称号象征身份与成就，居民会自豪地佩戴。游戏内称号：${m.en}。`;
      if (fem) b += ` 女性形式：${fem}。`;
    } else {
      place = m.prefix ? `顯示在名字前面` : `顯示在名字後面`;
      s = `冒險者的稱號。`;
      b = `**${n}** 是角色可以掛上的稱號，${place}。稱號象徵身分與成就，居民會自豪地佩戴。遊戲內稱號：${m.en}。`;
      if (fem) b += ` 女性形式：${fem}。`;
    }
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, b));
  }
  created++;
}
console.log(`gen-titles：新增 ${created}，跳過 ${skipped}。共 ${data.length} 個稱號。`);
