#!/usr/bin/env node
// 從 scripts/sightseeing-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Adventure 表，即探險手帳的風景名勝；英/日原文含風景敘述，簡中取自
// thewakingsands，繁中以 OpenCC 由簡轉繁；並 join PlaceName／Emote／Weather
// 取得地點、指定動作與天氣，建立 related 跨參照）生成 content/sightseeing/。
// 冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'sightseeing');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'sightseeing-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
const pick = (obj, loc) => (obj && (obj[loc] || obj.en)) || '';
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });

  // 結構化事實 + related 跨參照（只連已存在的條目）
  const related = [];
  if (m.place && m.place.linked) related.push(m.place.slug);
  if (m.emote && m.emote.linked) related.push(m.emote.slug);
  if (m.weather && m.weather.linked) related.push(m.weather.slug);
  let meta = `id: ${m.slug}\ncategory: sightseeing\ntype: vista\n`;
  if (m.place) meta += `place: ${Q(m.place.en)}\n`;
  if (m.time) meta += `time: [${Q(m.time[0])}, ${Q(m.time[1])}]\n`;
  if (m.weather) meta += `weather: ${Q(m.weather.en)}\n`;
  if (m.emote) meta += `emote: ${Q(m.emote.command)}\n`;
  if (related.length) meta += `related: [${related.join(', ')}]\n`;
  meta += `tags: [sightseeing, vista, travel]\nstatus: stable\n`;
  fs.writeFileSync(path.join(dir, 'meta.yaml'), meta);

  for (const loc of LOCALES) {
    const n = pick(m.n, loc);
    const place = m.place ? pick(m.place, loc) : '';
    const weather = m.weather ? pick(m.weather.n, loc) : '';
    const cmd = m.emote ? m.emote.command : '';
    const imp = m.impression ? pick(m.impression, loc) : '';
    const t = m.time ? `${m.time[0]}–${m.time[1]}` : '';
    let s, lead, howParts;
    if (loc === 'en') {
      s = place ? `A vista at ${place}.` : `A sightseeing vista.`;
      lead = `**${n}** is a sightseeing spot from the Sightseeing Log${place ? `, found at ${place}` : ''}.`;
      howParts = [];
      if (place) howParts.push(`go to **${place}**`);
      if (t) howParts.push(`between **${t}** Eorzea time`);
      if (weather) howParts.push(`when the weather is **${weather}**`);
      const how = howParts.length ? `To take it in, ${howParts.join(', ')}${cmd ? `, then use the \`${cmd}\` emote` : ''}.` : '';
      const body = [lead, imp ? `> ${imp}` : '', how].filter(Boolean).join('\n\n');
      fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body)); continue;
    } else if (loc === 'ja') {
      s = place ? `${place}の絶景。` : `観光の絶景。`;
      lead = `**${n}**は探検手帳の名所${place ? `。場所は**${place}**` : ''}。`;
      howParts = [];
      if (place) howParts.push(`**${place}**へ行き`);
      if (t) howParts.push(`エオルゼア時間**${t}**`);
      if (weather) howParts.push(`天候が**${weather}**のときに`);
      const how = howParts.length ? `${howParts.join('、')}${cmd ? `、\`${cmd}\`のしぐさで眺める。` : '眺める。'}` : '';
      const body = [lead, imp ? `> ${imp}` : '', how].filter(Boolean).join('\n\n');
      fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body)); continue;
    } else if (loc === 'zh-CN') {
      s = place ? `${place}的风景名胜。` : `观光风景。`;
      lead = `**${n}** 是探险手账收录的风景名胜${place ? `，位于**${place}**` : ''}。`;
      howParts = [];
      if (place) howParts.push(`前往**${place}**`);
      if (t) howParts.push(`在艾欧泽亚时间**${t}**`);
      if (weather) howParts.push(`天气为**${weather}**时`);
      const how = howParts.length ? `${howParts.join('、')}${cmd ? `，使用 \`${cmd}\` 动作即可欣赏。` : '即可欣赏。'}` : '';
      const body = [lead, imp ? `> ${imp}` : '', how].filter(Boolean).join('\n\n');
      fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body)); continue;
    } else {
      s = place ? `${place}的風景名勝。` : `觀光風景。`;
      lead = `**${n}** 是探險手帳收錄的風景名勝${place ? `，位於**${place}**` : ''}。`;
      howParts = [];
      if (place) howParts.push(`前往**${place}**`);
      if (t) howParts.push(`在艾歐澤亞時間**${t}**`);
      if (weather) howParts.push(`天氣為**${weather}**時`);
      const how = howParts.length ? `${howParts.join('、')}${cmd ? `，使用 \`${cmd}\` 動作即可欣賞。` : '即可欣賞。'}` : '';
      const body = [lead, imp ? `> ${imp}` : '', how].filter(Boolean).join('\n\n');
      fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body)); continue;
    }
  }
  created++;
}
console.log(`gen-sightseeing：新增 ${created}，跳過 ${skipped}。共 ${data.length} 個觀光景點。`);
