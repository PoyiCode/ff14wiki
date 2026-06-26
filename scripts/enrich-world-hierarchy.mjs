#!/usr/bin/env node
// 為 content/world/ 的條目建立多階層：在每個 meta.yaml 加上 rank 與 parent，
// 讓「地區/城市 → 乙太之光／地標村落」的樹狀關係可被 agent 與網站遍歷。
//
//   rank：region（地區）｜ city（城市）｜ aetheryte（乙太之光）｜ landmark（地標、村落）
//   parent：限定式 world/<id>，指向其上層節點（region 無 parent，為樹根）
//
// 階層不靠資料夾巢狀（維持扁平 content/world/<slug>/），而以 parent 連結表示，
// 不破壞既有資料模型／路由／validate。冪等：已含 rank 的條目跳過，可安全重跑。
//
// 用法：node scripts/enrich-world-hierarchy.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const APPLY = process.argv.includes('--apply');
const WORLD = path.join(process.cwd(), 'content', 'world');
const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// 撇號在歷史 slug 中有時被移除（Abalathia's Spine → abalathias-spine）、有時轉為
// 分隔（Rhalgr's Reach → rhalgr-s-reach），故試多個候選，回傳實際存在的 slug。
const slugVariants = (name) => [slugify(name), slugify(String(name).replace(/['’]/g, ''))];

// 載入全部 world 條目
const entries = [];
for (const d of fs.readdirSync(WORLD, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const mp = path.join(WORLD, d.name, 'meta.yaml');
  if (!fs.existsSync(mp)) continue;
  let m;
  try { m = yaml.load(fs.readFileSync(mp, 'utf8')) || {}; } catch { continue; }
  entries.push({ slug: d.name, mp, m });
}
const slugs = new Set(entries.map((e) => e.slug));
const byType = (t) => entries.filter((e) => String(e.m.type || '').trim() === t);
const cities = byType('city-state').concat(byType('city_area').length ? [] : []); // city-state ids
const citySlugs = entries
  .filter((e) => String(e.m.type || '').trim().startsWith('city-state'))
  .map((e) => e.slug);

const RANK = (type) => {
  const t = String(type || '').trim();
  if (t === 'region') return 'region';
  if (t.startsWith('city-state')) return 'city';
  if (t === 'aetheryte') return 'aetheryte';
  return 'landmark'; // zone, city_area, housing_district, landmark, village…
};

// 解析父節點 slug（須為實際存在的 world 條目），回傳 slug 或 null
const findSlug = (name) => (name ? slugVariants(name).find((s) => slugs.has(s)) || null : null);

function resolveParent(e) {
  const t = String(e.m.type || '').trim();
  const regionSlug = findSlug(e.m.region);
  const zoneSlug = findSlug(e.m.zone);
  const cityPrefix = citySlugs.find((c) => e.slug.startsWith(c + '-'));

  if (t === 'region') return null; // 樹根
  if (t.startsWith('city-state')) return regionSlug;
  if (t === 'city_area') return cityPrefix || regionSlug; // 城市分區 → 其城市，否則地區
  if (t === 'aetheryte') {
    if (zoneSlug) return zoneSlug; // 最具體：所在 zone
    if (cityPrefix) return cityPrefix;
    if (regionSlug) return regionSlug;
    for (const r of e.m.related || []) { // 退而求其次：related 首個存在的條目
      const id = String(r).includes('/') ? String(r).split('/').pop() : String(r);
      if (slugs.has(id)) return id;
    }
    return null;
  }
  return regionSlug; // zone / housing_district / 其他 → 所屬地區
}

let updated = 0, already = 0, orphanRegions = 0, unresolved = [];
const rankCount = {};
for (const e of entries) {
  const rank = RANK(e.m.type);
  rankCount[rank] = (rankCount[rank] || 0) + 1;
  const parent = resolveParent(e);
  if (rank !== 'region' && !parent) unresolved.push(`${e.slug} (type=${String(e.m.type).trim()})`);
  if (rank === 'region') orphanRegions++;

  if ('rank' in e.m) { already++; continue; } // 冪等

  // 在 type: 行後插入 rank（與 parent）
  let txt = fs.readFileSync(e.mp, 'utf8');
  const ins = `rank: ${rank}\n` + (parent ? `parent: world/${parent}\n` : '');
  if (/^type:.*$/m.test(txt)) txt = txt.replace(/^(type:.*\n)/m, `$1${ins}`);
  else if (/^category:.*$/m.test(txt)) txt = txt.replace(/^(category:.*\n)/m, `$1${ins}`);
  else txt = ins + txt;
  if (APPLY) fs.writeFileSync(e.mp, txt);
  updated++;
}

console.log(`${APPLY ? 'APPLIED' : 'DRY-RUN'} enrich-world-hierarchy`);
console.log(`  條目 ${entries.length}：更新 ${updated}，已有 rank 跳過 ${already}`);
console.log(`  rank 分布：${Object.entries(rankCount).map(([k, v]) => `${k}=${v}`).join('，')}`);
console.log(`  region 樹根 ${orphanRegions}，非 region 但無法解析 parent：${unresolved.length}`);
if (unresolved.length) unresolved.slice(0, 40).forEach((x) => console.log(`    ⚠ ${x}`));
