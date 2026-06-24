#!/usr/bin/env node
// 從 scripts/aetheryte-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Aetheryte / PlaceName / TerritoryType；簡中取自 thewakingsands，繁中以 OpenCC
// 由簡轉繁）生成 content/world/ 下的「地區」與「傳送點」條目。
// 冪等：資料夾已存在就跳過，保留手寫的城市/地區條目。
import fs from 'node:fs';
import path from 'node:path';

const WORLD = path.join(process.cwd(), 'content', 'world');
const { regions, aetherytes } = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scripts', 'aetheryte-data.json'), 'utf8'),
);
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const exists = (slug) => fs.existsSync(path.join(WORLD, slug));
const md = (title, summary, body) => `---\ntitle: ${Q(title)}\nsummary: ${Q(summary)}\n---\n\n${body}\n`;
function write(slug, meta, locales) {
  const dir = path.join(WORLD, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.yaml'), meta);
  for (const loc of LOCALES) fs.writeFileSync(path.join(dir, `${loc}.md`), locales[loc]);
}

const byRegion = {};
for (const a of aetherytes) (byRegion[a.regionSlug] ||= []).push(a);

let created = 0, skipped = 0;

// ── 地區 ──
for (const r of regions) {
  if (!r.slug || exists(r.slug)) { skipped++; continue; }
  const names = (byRegion[r.slug] || []).map((a) => a.aetheryte_en);
  const N = (loc) => r.n[loc] || r.n.en;
  const join = { 'zh-TW': '、', 'zh-CN': '、', ja: '、', en: ', ' };
  const list = (loc) => names.join(join[loc]);
  const locales = {
    'zh-TW': md(N('zh-TW'), `世界的一個區域，含 ${names.length} 個傳送點。`,
      `**${N('zh-TW')}** 是這個世界的一個區域。${names.length ? `域內傳送點：${list('zh-TW')}。` : ''}`),
    'zh-CN': md(N('zh-CN'), `世界的一个区域，含 ${names.length} 个传送点。`,
      `**${N('zh-CN')}** 是这个世界的一个区域。${names.length ? `域内传送点：${list('zh-CN')}。` : ''}`),
    ja: md(N('ja'), `世界の地域のひとつ。エーテライト${names.length}カ所。`,
      `**${N('ja')}**は世界の地域のひとつ。${names.length ? `域内のエーテライト：${list('ja')}。` : ''}`),
    en: md(N('en'), `A region of the world, with ${names.length} aetheryte(s).`,
      `**${N('en')}** is one of the world's regions.${names.length ? ` Aetherytes here: ${list('en')}.` : ''}`),
  };
  const meta = `id: ${r.slug}\ncategory: world\ntype: region\ntags: [region, geography]\nstatus: stable\n`;
  write(r.slug, meta, locales);
  created++;
}

// ── 傳送點 ──
for (const a of aetherytes) {
  if (!a.slug || exists(a.slug)) { skipped++; continue; }
  const region = a.region || {};
  const RG = (loc) => region[loc] || region.en || '';
  const showZone = a.zone && a.zone.en && a.zone.en !== a.n.en && a.zone.en !== region.en;
  const ZN = (loc) => (showZone ? a.zone[loc] || a.zone.en : '');
  const N = (loc) => a.n[loc] || a.n.en;
  const locales = {
    'zh-TW': md(N('zh-TW'), `位於「${RG('zh-TW')}」的傳送點（以太之光）。`,
      `**${N('zh-TW')}** 是位於「${RG('zh-TW')}」的以太之光（傳送點）${ZN('zh-TW') ? `，所在區域「${ZN('zh-TW')}」` : ''}。居民要前往這一帶，通常先傳送到這裡。遊戲內名稱：${a.aetheryte_en}。`),
    'zh-CN': md(N('zh-CN'), `位于「${RG('zh-CN')}」的传送点（以太之光）。`,
      `**${N('zh-CN')}** 是位于「${RG('zh-CN')}」的以太之光（传送点）${ZN('zh-CN') ? `，所在区域「${ZN('zh-CN')}」` : ''}。居民要前往这一带，通常先传送到这里。游戏内名称：${a.aetheryte_en}。`),
    ja: md(N('ja'), `「${RG('ja')}」のエーテライト（転移ポイント）。`,
      `**${N('ja')}**は「${RG('ja')}」にあるエーテライト${ZN('ja') ? `（エリア：${ZN('ja')}）` : ''}。住民がこの地へ向かうときは、まずここへ転移するのが基本。ゲーム内名称：${a.aetheryte_en}。`),
    en: md(N('en'), `An aetheryte (teleport point) in ${RG('en')}.`,
      `**${N('en')}** is an aetheryte in **${RG('en')}**${ZN('en') ? ` (zone: ${ZN('en')})` : ''}. Teleporting here is how a resident usually reaches this area. In-game name: ${a.aetheryte_en}.`),
  };
  const relLine = a.regionSlug ? `\nrelated: [${a.regionSlug}]` : '';
  const zoneLine = showZone ? `\nzone: ${Q(a.zone.en)}` : '';
  const meta =
    `id: ${a.slug}\ncategory: world\ntype: aetheryte\n` +
    `aetheryte: ${Q(a.aetheryte_en)}\nregion: ${Q(RG('en'))}${zoneLine}\n` +
    `tags: [aetheryte, travel, teleport]${relLine}\nstatus: stable\n`;
  write(a.slug, meta, locales);
  created++;
}

console.log(`gen-geo：新增 ${created}，跳過（已存在）${skipped}。地區 ${regions.length}、傳送點 ${aetherytes.length}。`);
