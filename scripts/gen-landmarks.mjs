#!/usr/bin/env node
// 從 scripts/landmark-data.json（由官方遊戲資料 MapMarker × Map × PlaceName join 而成：
// 各 overworld 地區內具名的地標、聚落、村落；簡中取自 thewakingsands，繁中以 OpenCC
// 由簡轉繁，日英取官方原文）生成 content/world/ 下 rank=landmark 的「地標・村落」條目，
// 補滿世界地理階層的最底層。每個條目 parent 指向其所屬 zone（world/<zone>）。
// 冪等：資料夾已存在就跳過，保留手寫條目與既有 zone/aetheryte。
import fs from 'node:fs';
import path from 'node:path';

const WORLD = path.join(process.cwd(), 'content', 'world');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'landmark-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const exists = (slug) => fs.existsSync(path.join(WORLD, slug));
const md = (title, summary, body) => `---\ntitle: ${Q(title)}\nsummary: ${Q(summary)}\n---\n\n${body}\n`;

// 部分官方 PlaceName 名稱內含換行（地圖上分兩行顯示，簡中以 \r\n[第二行] 表示）。
// 清掉換行：第二行的 [..] 轉為（..），其餘換行併為空格，避免汙染名稱與標題。
const clean = (s) => String(s ?? '')
  .replace(/\s*[\r\n]+\s*\[(.+?)\]\s*$/, '（$1）')
  .replace(/\s*[\r\n]+\s*/g, ' ')
  .trim();

let created = 0, skipped = 0;
for (const raw of data) {
  const m = { ...raw, en: clean(raw.en), ja: clean(raw.ja), cn: clean(raw.cn), tw: clean(raw.tw),
    zone: Object.fromEntries(Object.entries(raw.zone).map(([k, v]) => [k, clean(v)])),
    region: Object.fromEntries(Object.entries(raw.region).map(([k, v]) => [k, clean(v)])) };
  if (!m.slug || exists(m.slug)) { skipped++; continue; }
  const dir = path.join(WORLD, m.slug);
  fs.mkdirSync(dir, { recursive: true });

  const z = (loc) => m.zone[loc] || m.zone.en;
  const r = (loc) => m.region[loc] || m.region.en;
  const zTW = m.tw || m.cn, zCN = m.cn || m.tw;
  const locales = {
    'zh-TW': md(zTW || m.en, `「${z('zh-TW')}」的地標。`,
      `**${zTW || m.en}** 是「${z('zh-TW')}」（${r('zh-TW')}）境內的一處地標。居民在這一帶活動、相約或閒逛時會提到的地點。遊戲內英文名：${m.en}。`),
    'zh-CN': md(zCN || m.en, `「${z('zh-CN')}」的地标。`,
      `**${zCN || m.en}** 是「${z('zh-CN')}」（${r('zh-CN')}）境内的一处地标。居民在这一带活动、相约或闲逛时会提到的地点。游戏内英文名：${m.en}。`),
    ja: md(m.ja || m.en, `「${z('ja')}」の名所。`,
      `**${m.ja || m.en}**は「${z('ja')}」（${r('ja')}）にある名所・ランドマーク。住民がこの界隈で過ごしたり待ち合わせたりするときに口にする場所。ゲーム内英語名：${m.en}。`),
    en: md(m.en, `A landmark in ${z('en')}.`,
      `**${m.en}** is a landmark in ${z('en')} (${r('en')}). A spot residents mention when spending time, meeting up, or wandering around this area.`),
  };
  const meta =
    `id: ${m.slug}\ncategory: world\ntype: landmark\nrank: landmark\nparent: world/${m.parent}\n` +
    `landmark: ${Q(m.en)}\nzone: ${Q(m.zone.en)}\nregion: ${Q(m.region.en)}\n` +
    `related: [world/${m.parent}]\ntags: [landmark, world, travel]\nstatus: stable\n`;
  fs.writeFileSync(path.join(dir, 'meta.yaml'), meta);
  for (const loc of LOCALES) fs.writeFileSync(path.join(dir, `${loc}.md`), locales[loc]);
  created++;
}
console.log(`gen-landmarks：新增 ${created}，跳過（已存在）${skipped}。資料 ${data.length} 筆。`);
