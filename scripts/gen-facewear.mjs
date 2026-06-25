#!/usr/bin/env node
// 從 scripts/facewear-data.json（源自官方遊戲資料 xivapi/ffxiv-datamining 的
// Glasses 表，即臉部裝飾／フェイスウェア；英/日原文，簡中取自 thewakingsands，
// 繁中以 OpenCC 由簡轉繁）生成 content/facewear/。冪等：資料夾已存在就跳過。
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'content', 'facewear');
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'facewear-data.json'), 'utf8'));
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const Q = (s) => JSON.stringify(s);
const md = (t, s, b) => `---\ntitle: ${Q(t)}\nsummary: ${Q(s)}\n---\n\n${b}\n`;
const pick = (o, loc) => (o && (o[loc] || o.en)) || '';
let created = 0, skipped = 0;
for (const m of data) {
  if (!m.slug || fs.existsSync(path.join(DIR, m.slug))) { skipped++; continue; }
  const dir = path.join(DIR, m.slug);
  fs.mkdirSync(dir, { recursive: true });
  const idval = /^\d+$/.test(m.slug) ? Q(m.slug) : m.slug;
  fs.writeFileSync(path.join(dir, 'meta.yaml'),
    `id: ${idval}\ncategory: facewear\ntype: facewear\nfacewear: ${Q(m.en)}\ntags: [facewear, fashion, appearance]\nstatus: stable\n`);
  for (const loc of LOCALES) {
    const n = pick(m.n, loc);
    const desc = m.desc ? pick(m.desc, loc) : '';
    let s, lead;
    if (loc === 'en') { s = `A piece of facewear.`;
      lead = `**${n}** is a piece of facewear a resident can wear on the face — glasses, an eyepatch or similar — to accent a look. In-game name: ${m.en}.`; }
    else if (loc === 'ja') { s = `フェイスウェア。`;
      lead = `**${n}**は顔につけるフェイスウェア（メガネやアイマスクなど）。装いのアクセントになる一品。ゲーム内名称：${m.en}。`; }
    else if (loc === 'zh-CN') { s = `面部配饰。`;
      lead = `**${n}** 是戴在脸上的面部配饰（眼镜、眼罩之类），用来点缀造型。游戏内名称：${m.en}。`; }
    else { s = `臉部裝飾。`;
      lead = `**${n}** 是戴在臉上的臉部裝飾（眼鏡、眼罩之類），用來點綴造型。遊戲內名稱：${m.en}。`; }
    const body = desc ? `${lead}\n\n${desc}` : lead;
    fs.writeFileSync(path.join(dir, `${loc}.md`), md(n, s, body));
  }
  created++;
}
console.log(`gen-facewear：新增 ${created}，跳過 ${skipped}。共 ${data.length} 件臉部裝飾。`);
