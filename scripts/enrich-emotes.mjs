#!/usr/bin/env node
// 為既有的 emotes 條目補上官方「聊天顯示訊息」（log message）。
// 來源：xivapi/ffxiv-datamining 的 Emote.LogMessageUntargeted → LogMessage.Text
// （英/日原文；簡中取自 thewakingsands，繁中以 OpenCC 由簡轉繁；已清除主詞巨集
// 並補上主詞），預先整理成 scripts/emote-desc-data.json（slug → 各語訊息）。
// 冪等且只追加：若該語 .md 已含此訊息就跳過，絕不覆蓋既有內容。
import fs from 'node:fs';
import path from 'node:path';
const LOCALES = ['zh-TW', 'zh-CN', 'ja', 'en'];
const FRAME = {
  en: (m) => `When a resident uses this emote, it reads in chat as: *${m}*`,
  ja: (m) => `このエモートを使うと、チャットには「${m}」と表示される。`,
  'zh-CN': (m) => `使用此动作时，聊天栏会显示：「${m}」`,
  'zh-TW': (m) => `使用此動作時，聊天欄會顯示：「${m}」`,
};
const map = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'emote-desc-data.json'), 'utf8'));
const base = path.join(process.cwd(), 'content', 'emotes');
let enriched = 0, already = 0, missing = 0;
for (const [slug, msgs] of Object.entries(map)) {
  const dir = path.join(base, slug);
  if (!fs.existsSync(dir)) { missing++; continue; }
  for (const loc of LOCALES) {
    const m = msgs[loc] || msgs.en;
    if (!m) continue;
    const file = path.join(dir, `${loc}.md`);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(m)) { already++; continue; }
    fs.writeFileSync(file, content.replace(/\n*$/, '') + '\n\n' + FRAME[loc](m) + '\n');
    enriched++;
  }
}
console.log(`enrich-emotes：補上訊息 ${enriched} 個檔，已存在跳過 ${already}，缺資料夾 ${missing}。`);
