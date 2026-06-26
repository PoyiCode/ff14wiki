import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { CATEGORY_KEYS, LOCALES, getCategory, type Locale } from '@/lib/config';
import { getEntries, pickLocale, type Entry } from '@/lib/content';

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => CATEGORY_KEYS.map((category) => ({ lang, category })));
}

// world 分類的階層（rank）顯示標籤與排序。
const RANK_LABEL: Record<string, Record<Locale, string>> = {
  region: { 'zh-TW': '地區', 'zh-CN': '地区', ja: '地域', en: 'Region' },
  city: { 'zh-TW': '城市', 'zh-CN': '城市', ja: '都市', en: 'City' },
  landmark: { 'zh-TW': '地標・村落', 'zh-CN': '地标・村落', ja: '名所・集落', en: 'Landmark' },
  aetheryte: { 'zh-TW': '乙太之光', 'zh-CN': '以太之光', ja: 'エーテライト', en: 'Aetheryte' },
};
const RANK_ORDER: Record<string, number> = { region: 0, city: 1, landmark: 2, aetheryte: 3 };
const parentSlug = (e: Entry): string | null =>
  e.meta.parent ? String(e.meta.parent).split('/').pop() ?? null : null;

interface TreeNode { entry: Entry; title: string; children: TreeNode[] }

// 依 parent/rank 由扁平條目建出樹；root 為 rank=region（或無 parent 者）。
function buildWorldTree(entries: Entry[], lang: Locale): TreeNode[] {
  const childrenOf = new Map<string, Entry[]>();
  const roots: Entry[] = [];
  for (const e of entries) {
    const p = parentSlug(e);
    if (e.meta.rank === 'region' || !p) roots.push(e);
    else (childrenOf.get(p) ?? childrenOf.set(p, []).get(p)!).push(e);
  }
  const make = (e: Entry): TreeNode => ({
    entry: e,
    title: pickLocale(e, lang)?.title ?? e.slug,
    children: (childrenOf.get(e.slug) ?? [])
      .map(make)
      .sort(
        (a, b) =>
          (RANK_ORDER[String(a.entry.meta.rank)] ?? 9) - (RANK_ORDER[String(b.entry.meta.rank)] ?? 9) ||
          a.title.localeCompare(b.title),
      ),
  });
  return roots.map(make).sort((a, b) => a.title.localeCompare(b.title));
}

function TreeBranch({ node, lang, cat }: { node: TreeNode; lang: Locale; cat: string }) {
  const rank = String(node.entry.meta.rank ?? '');
  return (
    <li>
      <Link href={`/${lang}/${cat}/${node.entry.slug}/`}>{node.title}</Link>
      {RANK_LABEL[rank] && <span className="rank-tag">{RANK_LABEL[rank][lang]}</span>}
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <TreeBranch key={c.entry.slug} node={c} lang={lang} cat={cat} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CategoryPage({ params }: { params: { lang: string; category: string } }) {
  const lang = params.lang as Locale;
  const cat = getCategory(params.category);
  if (!LOCALES.includes(lang) || !cat) notFound();

  const entries = getEntries(cat.key);
  const links = Object.fromEntries(
    LOCALES.map((l) => [l, `/${l}/${cat.key}/`]),
  ) as Record<Locale, string>;

  return (
    <>
      <SiteHeader locale={lang} links={links} />
      <div className="container">
        <div className="crumbs">
          <Link href={`/${lang}/`}>首頁</Link> / {cat.label[lang]}
        </div>
        <h1>{cat.label[lang]}</h1>
        <p className="summary">{cat.description[lang]}</p>
        {cat.key === 'world' ? (
          <ul className="world-tree">
            {buildWorldTree(entries, lang).map((node) => (
              <TreeBranch key={node.entry.slug} node={node} lang={lang} cat={cat.key} />
            ))}
          </ul>
        ) : (
          <div className="grid">
            {entries.map((entry) => {
              const view = pickLocale(entry, lang);
              return (
                <Link key={entry.slug} href={`/${lang}/${cat.key}/${entry.slug}/`} className="card">
                  <div className="title">{view?.title ?? entry.slug}</div>
                  {view?.summary && <div className="desc">{view.summary}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export const dynamicParams = false;
