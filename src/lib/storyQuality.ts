// 2026-10-16 質素報告：姓名撞名、禁題、產權商戰、連載空懸、說教結局。
// 呢度放純函數，生成 route 同測試共用。唔會讀 DB、唔會改已發佈故事。

export const SURNAMES = [
  "沈", "陸", "江", "顧", "蘇", "林", "周", "程", "宋", "謝", "封", "傅", "聞", "盛", "時", "樓", "席", "慕", "厲", "荀", "崔", "裴",
  "秦", "韓", "唐", "許", "蕭", "葉", "白", "孟", "霍", "岑", "溫", "梁", "趙", "鄭", "馮", "陳", "何", "吳", "蔡", "潘", "姜", "方",
  "任", "袁", "鄧", "喬", "邵", "尹", "魏", "鍾", "賀", "羅", "高", "夏", "曹", "侯",
] as const;

export const FEMALE_GIVEN = [
  "知微", "知意", "薏", "清昭", "念安", "疏影", "望舒", "宛卿", "憶蘿", "簡遙", "南星", "如晚", "青禾", "思螢", "蘇黎",
  "晚寧", "清和", "書意", "予安", "明溪", "秋遲", "聽南", "知夏", "以寧", "澄意", "小滿", "念初", "照晚", "懷瑾", "言蹊",
  "棠梨", "舒晚", "宜修", "清越", "南枝", "寄南", "安然", "星遙", "嘉木", "晚晴", "知許", "清嘉", "念慈", "疏桐", "明昭",
  "初夏", "靜宜", "若白", "盼兮", "清妍",
] as const;

export const MALE_GIVEN = [
  "沉硏", "臨淵", "行舟", "景琛", "亦臻", "聞禮", "執", "衍之", "聲遠", "承宴", "修白", "緘言",
  "承澤", "景行", "予白", "明川", "知衡", "修遠", "安之", "衡之", "見川", "北辰", "言川", "敬之", "則明", "時安", "念舟",
  "望川", "既明", "予川", "澄川", "書白", "照野", "維舟", "行止", "承安", "司年", "朗月", "清衡", "硯秋", "卓然", "知遠",
  "懷谷", "青岑", "述之", "晏清", "歸舟", "明允", "敘之",
] as const;

const GIVEN_POOL = {
  F: FEMALE_GIVEN,
  M: MALE_GIVEN,
} as const;

export type Gender = "F" | "M";

export const BUSINESS_WAR_WORDS = [
  "法院拍賣", "司法拍賣", "拍賣公告", "產權證",
  "收購", "併購", "股權", "股份", "董事會", "上市", "估值", "融資",
  "商戰", "競標", "併吞", "控股", "集團利益", "商業機密",
  "產權", "法拍", "授權書", "標金", "查封", "競買", "流拍", "委託書",
] as const;

export const BANNED_TOPIC_WORDS = [
  "下落不明", "人間蒸發", "人間蒸发", "尋人啟事", "交通意外", "被車撞",
  "殯儀館", "火葬場", "派出所", "猝然離世", "突然暴斃",
  "失蹤", "失踪", "失聯", "車禍", "撞車", "追撞",
  "警察", "警方", "警員", "警官", "刑警", "交警", "警車", "警局", "報警", "報案",
  "殯儀", "靈堂", "喪禮", "喪事", "葬禮", "出殯", "告別式",
  "猝死", "暴斃", "猝逝",
] as const;

export const BUSINESS_WAR_PROMPT =
  "嚴禁商戰與產權爭奪：企業收購、股權爭奪、集團鬥爭、董事會奪權、估值談判、產權、法院拍賣、法拍、司法拍賣、授權書、標金、查封、委託書。職場上人與人之間的衝突可以寫。";

export const BANNED_TOPIC_PROMPT =
  "硬性禁題（正文、對白、標題、背景、伏筆都不可出現）：失蹤、下落不明、人間蒸發、失聯、車禍、交通意外、撞車、警察、警方、警員、派出所、刑警、報警、殯儀館、殯儀、靈堂、火葬場、喪禮、葬禮、出殯、告別式、猝死、暴斃。";

export const FAIL_TYPES = [
  "LENGTH",
  "SECTION",
  "SIMPLIFIED",
  "CANTONESE",
  "CLICHE",
  "BUSINESS_WAR",
  "BANNED_TOPIC",
  "CLOSURE_SHORT",
  "CLOSURE_SERIAL",
  "EMPTY_HOOK",
  "PREACHY",
  "OPEN",
  "LOGIC",
  "PREMISE_TENSION",
  "PREMISE_LANE",
  "OTHER",
] as const;

export type FailType = (typeof FAIL_TYPES)[number];

export const QUALITY_REPAIR = {
  BUSINESS_WAR:
    "改為人際衝突。把企業收購、股權、董事會、產權、法院拍賣、授權書、標金、查封，改成人之間的針對、搶功、誣陷或頂罪。不要寫公司對公司的攻防。",
  BANNED_TOPIC:
    "刪掉禁題並改寫該段情節。不可出現失蹤、車禍、警察、殯儀館、猝死，以及下落不明、交通意外、警方、靈堂、喪禮、告別式、暴斃等同義說法，也不可以把它們留成背景。改成不靠這些事件的衝突。",
  PREACHY:
    "只重寫最後一段。刪掉說教、人生道理和「有時候／原來／非零和／這件事讓我明白」式總結，改用畫面或對白收尾，不准升華。前面各節不要改。",
  EMPTY_HOOK:
    "只重寫尾節。連載必須留下可續的下一步：一個具體選擇、一句即將說出口的話、或一個正在發生的動作。禁止用「權限／計畫／真相還沒交代」這種沒有下一步的空懸，也不要一次解決整個衝突。前面各節不要改。",
} as const;

const PUBLICATION_BLOCK_MARKERS = [
  "簡體字",
  "商戰詞",
  "禁題",
  "說教結尾",
  "空懸結尾",
  "沒有停在抉擇節點",
  "沒有完整收尾",
  "道具未回收",
  "分節數不對",
  "字數不足",
  "粵語詞",
  "AI陳套詞",
  "大陸詞",
  "第一人稱",
] as const;

export function isHardBlocked(validateNote: string): boolean {
  return PUBLICATION_BLOCK_MARKERS.some((marker) => validateNote.includes(marker));
}

export function classifyQualityNote(
  note: string
): "BUSINESS_WAR" | "BANNED_TOPIC" | "PREACHY" | "EMPTY_HOOK" | null {
  if (note.startsWith("商戰")) return "BUSINESS_WAR";
  if (note.startsWith("禁題")) return "BANNED_TOPIC";
  if (note.startsWith("說教")) return "PREACHY";
  if (note.startsWith("空懸")) return "EMPTY_HOOK";
  return null;
}

function findListedWord(text: string, words: readonly string[]): string | undefined {
  let hit: string | undefined;
  for (const word of words) {
    if (!word) continue;
    if (text.includes(word) && (!hit || word.length > hit.length)) hit = word;
  }
  return hit;
}

export function findBusinessWar(text: string): string | undefined {
  return findListedWord(text, BUSINESS_WAR_WORDS);
}

export function findBannedTopic(text: string): string | undefined {
  return findListedWord(text, BANNED_TOPIC_WORDS);
}

export function premiseBlockReason(
  text: string
): { failType: "BUSINESS_WAR" | "BANNED_TOPIC"; reason: string } | null {
  const topic = findBannedTopic(text);
  if (topic) {
    return { failType: "BANNED_TOPIC", reason: `開局出現禁題「${topic}」，必須改寫，不可留成背景` };
  }
  const biz = findBusinessWar(text);
  if (biz) {
    return { failType: "BUSINESS_WAR", reason: `開局出現商戰詞「${biz}」，必須改成人與人之間的衝突` };
  }
  return null;
}

const PREACHY_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /非零和|並非零和|不是零和|不是一場零和/, label: "非零和" },
  { re: /(^|[。！？\n])有時候[，,]/, label: "有時候" },
  { re: /(^|\n)原來[，,]/, label: "原來" },
  { re: /這件事(讓|教)(我|人)/, label: "這件事讓我" },
  { re: /這(告訴|教會)(了)?(我|我們)/, label: "這告訴我們" },
  { re: /人生(就是|總是|不過)/, label: "人生就是" },
  { re: /(我們|我)學(會|到)了/, label: "學會了" },
  { re: /我學到的是/, label: "我學到的是" },
  { re: /善有善報/, label: "善有善報" },
  { re: /真正重要的是/, label: "真正重要的是" },
  { re: /好運(並)?不是/, label: "好運不是" },
  { re: /值得(我們)?(反思|深思)/, label: "值得反思" },
  { re: /這就是(人生|生活|愛情|幸運)/, label: "這就是人生" },
];

const EMPTY_HOOK_PATTERNS: { re: RegExp; label: string }[] = [
  {
    re: /(權限|計劃|計畫|方案|密碼|真相|身份|內情|來歷|理由).{0,18}(未交代|沒交代|沒有交代|尚未交代|未說明|沒有說明|尚未說明|沒說清楚|仍不清楚|還不清楚)/,
    label: "未交代",
  },
  {
    re: /(未交代|沒有交代|尚未說明|沒說清楚).{0,12}(權限|計劃|計畫|方案|真相)/,
    label: "未交代",
  },
];

export function endingTail(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const parts = normalized.split(/\n\s*＊＊＊\s*\n/);
  const last = (parts[parts.length - 1] ?? normalized).trim();
  const paras = last.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const joined = paras.slice(-3).join("\n");
  return joined.length > 360 ? joined.slice(-360) : joined;
}

export function findPreachyEnding(content: string): string | undefined {
  const tail = endingTail(content);
  return PREACHY_PATTERNS.find((p) => p.re.test(tail))?.label;
}

export function findEmptySerialHook(content: string): string | undefined {
  const tail = endingTail(content);
  return EMPTY_HOOK_PATTERNS.find((p) => p.re.test(tail))?.label;
}

export function qualityFailNotes(content: string, storyType: "serial" | "short"): string[] {
  const fails: string[] = [];
  const topic = findBannedTopic(content);
  if (topic) fails.push(`禁題:${topic}`);
  const biz = findBusinessWar(content);
  if (biz) fails.push(`商戰詞:${biz}`);
  const preach = findPreachyEnding(content);
  if (preach) fails.push(`說教結尾:${preach}`);
  if (storyType === "serial") {
    const empty = findEmptySerialHook(content);
    if (empty) fails.push(`空懸結尾:${empty}`);
  }
  return fails;
}

export type RecentNameSource = {
  protagonist?: string | null;
  title?: string | null;
  content?: string | null;
  premise?: string | null;
  created_at?: string | null;
};

export type NameBlock = {
  full: Set<string>;
  givenToday: Set<string>;
  recentSurnames: Set<string>;
};

export function createNameBlock(): NameBlock {
  return { full: new Set(), givenToday: new Set(), recentSurnames: new Set() };
}

export function hktDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isWithinDays(iso: string | null | undefined, now: Date, days: number): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  const delta = now.getTime() - t;
  return delta <= days * 24 * 60 * 60 * 1000 && delta >= -60_000;
}

export function protagonistNames(protagonist: string | null | undefined): string[] {
  return (protagonist ?? "")
    .split(/[、,，/／]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 4);
}

let poolNameRe: RegExp | null = null;

function poolFullNames(): string[] {
  const names: string[] = [];
  for (const surname of SURNAMES) {
    for (const given of [...FEMALE_GIVEN, ...MALE_GIVEN]) {
      if (given.length < 2) continue;
      names.push(surname + given);
    }
  }
  return names;
}

function poolNamePattern(): RegExp {
  if (!poolNameRe) {
    const names = poolFullNames().sort((a, b) => b.length - a.length);
    poolNameRe = new RegExp(names.join("|"), "g");
  }
  return poolNameRe;
}

export function extractUsedNames(text: string): string[] {
  if (!text) return [];
  const re = poolNamePattern();
  re.lastIndex = 0;
  return [...new Set(text.match(re) ?? [])];
}

function remember(block: NameBlock, full: string, blockGiven: boolean) {
  const name = full.trim();
  if (name.length < 2 || name.length > 4) return;
  block.full.add(name);
  const surname = name[0] ?? "";
  const given = name.slice(1);
  if (surname) block.recentSurnames.add(surname);
  // givenToday 係近 14 日要避開的名字集合：主角名字整段窗口都擋，其餘名字仍只擋當日。
  if (blockGiven && given) block.givenToday.add(given);
}

export function nameBlockFromStories(stories: RecentNameSource[], now: Date): NameBlock {
  const block = createNameBlock();
  const today = hktDayKey(now);
  for (const story of stories) {
    if (!isWithinDays(story.created_at, now, 14)) continue;
    const created = story.created_at ? new Date(story.created_at) : now;
    const sameDay = !story.created_at || !Number.isFinite(created.getTime()) || hktDayKey(created) === today;
    const protagonists = protagonistNames(story.protagonist);
    const protagonistSet = new Set(protagonists);
    const blob = [story.title, story.content, story.premise].filter(Boolean).join("\n");
    const names = new Set<string>([...protagonists, ...extractUsedNames(blob)]);
    for (const name of names) remember(block, name, protagonistSet.has(name) || sameDay);
  }
  return block;
}

export function candidateNames(gender: Gender, block: NameBlock, avoidRecentSurnames: boolean): string[] {
  const out: string[] = [];
  for (const surname of SURNAMES) {
    if (avoidRecentSurnames && block.recentSurnames.has(surname)) continue;
    for (const given of GIVEN_POOL[gender]) {
      if (block.givenToday.has(given)) continue;
      const full = surname + given;
      if (block.full.has(full)) continue;
      out.push(full);
    }
  }
  return out;
}

export function assignCharacterPair(
  block: NameBlock,
  genders: [Gender, Gender],
  rng: () => number = Math.random
): [string, string] {
  return [takeName(genders[0], block, rng), takeName(genders[1], block, rng)];
}

function takeName(gender: Gender, block: NameBlock, rng: () => number): string {
  const preferred = candidateNames(gender, block, true);
  const pool = preferred.length > 0 ? preferred : candidateNames(gender, block, false);
  if (pool.length === 0) {
    throw new Error(`姓名池不足，無法在避開近14日全名與近14日主角名字的前提下取名（${gender}）`);
  }
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  const name = pool[index] ?? pool[0];
  remember(block, name, true);
  return name;
}

// 正文／開局／標題／一句話簡介共用。單字「係」故意不收，避免「關係」誤殺。
// 「姐」亦不收：它是繁體常用字（姐姐、小姐、師姐），不是單向簡體。
export const SIMPLIFIED_ONLY = [
  "长", "这", "说", "时", "后", "门", "开", "还", "没", "远", "两", "汉", "华", "国", "学",
  "问", "间", "东", "车", "风", "么", "为", "来", "对", "实", "过", "经", "样", "关", "号",
  "当", "从", "应", "头", "进", "无", "气", "总", "让", "觉", "现", "视", "听", "写", "买",
  "卖", "阴", "阳", "龙", "飞", "汇", "价", "张", "历", "传", "确", "轻", "离", "难", "权",
  "环", "归", "续", "缘", "认", "识", "语", "话", "记", "许", "谁", "个", "见", "长",
  "马", "给", "着", "账", "馆", "饭", "饼", "辆", "岁", "妈",
] as const;

export const CANTONESE_SAFE = [
  "嘅", "唔", "佢", "咗", "冇", "呢個", "邊度", "依家", "㩒", "鍾意", "攞",
  "啲", "喺", "畀", "俾", "咩", "點解", "咁", "仲", "佢哋", "我哋", "你哋", "嚟", "搵", "揾", "諗", "睇",
  "聽日", "琴日", "尋日", "而家", "嗰", "邊個", "點樣", "幾時", "係咪", "有冇", "㗎", "喎", "啫", "咋",
] as const;

export const MAINLAND_ADMIN_WORDS = [
  "用人單位", "勞動合同", "租賃合同", "街道司法所", "小區", "立即清退", "打印", "軟件",
] as const;

export const LANE_DEATH_WORDS = ["過世", "去世", "離世", "遺物", "靈堂", "喪禮"] as const;

export const DEATH_PLOT_LANES = ["cozy_shop", "kanbujian"] as const;

export const FIRST_PERSON_LANES = ["dark_humor"] as const;

export const FIRST_PERSON_PREMISE_RULE =
  "第一個主角名字即為第一人稱「我」的本名，內文「我」不得另取新名。";

const WHO_TITLE_RE = /誰准[你妳您]/;

export type LanguageLeak = { failType: "SIMPLIFIED" | "CANTONESE"; note: string };

function longestListed(text: string, words: readonly string[]): string | undefined {
  return [...words].sort((a, b) => b.length - a.length).find((word) => word && text.includes(word));
}

export function findSimplified(text: string): string | undefined {
  return SIMPLIFIED_ONLY.find((ch) => text.includes(ch));
}

export function findCantonese(text: string): string | undefined {
  return longestListed(text, CANTONESE_SAFE);
}

export function findMainlandAdmin(text: string): string | undefined {
  return longestListed(text, MAINLAND_ADMIN_WORDS);
}

export function findLanguageLeak(text: string): LanguageLeak | null {
  const simplified = findSimplified(text);
  if (simplified) return { failType: "SIMPLIFIED", note: `簡體字:${simplified}` };
  const cantonese = findCantonese(text);
  if (cantonese) return { failType: "CANTONESE", note: `粵語詞:${cantonese}` };
  const admin = findMainlandAdmin(text);
  if (admin) return { failType: "CANTONESE", note: `大陸詞:${admin}` };
  return null;
}

export function findLaneDeathPlot(text: string): string | undefined {
  return longestListed(text, LANE_DEATH_WORDS);
}

export function isDeathPlotBannedLane(laneKey: string | null | undefined): boolean {
  return !!laneKey && (DEATH_PLOT_LANES as readonly string[]).includes(laneKey);
}

export function isFirstPersonLane(laneKey: string | null | undefined): boolean {
  return !!laneKey && (FIRST_PERSON_LANES as readonly string[]).includes(laneKey);
}

export function lanePremiseExtraRules(laneKey: string): string {
  const lines: string[] = [];
  if (isFirstPersonLane(laneKey)) {
    lines.push(`- 本線必須用第一人稱「我」。${FIRST_PERSON_PREMISE_RULE}不可改成第三人稱敘述。`);
  }
  if (isDeathPlotBannedLane(laneKey)) {
    lines.push(
      `- 本線嚴禁死亡情節：不可出現${LANE_DEATH_WORDS.join("、")}，不可把長輩、師傅或店主寫成已經去世。`
    );
  }
  return lines.join("\n");
}

function looksLikeDifferentName(stated: string, protagonist: string): boolean {
  const given = protagonist.slice(1);
  if (!stated || stated === given || stated === protagonist || protagonist.endsWith(stated) || stated.endsWith(given)) {
    return false;
  }
  const poolGivens = new Set<string>([...FEMALE_GIVEN, ...MALE_GIVEN]);
  if (poolGivens.has(stated)) return true;
  const surname = stated[0] ?? "";
  if (surname && (SURNAMES as readonly string[]).includes(surname)) {
    const rest = stated.slice(1);
    if (poolGivens.has(rest) || (rest.length >= 1 && rest.length <= 2)) return true;
  }
  return false;
}

export function firstPersonIssues(content: string, protagonist?: string | null): string[] {
  const issues: string[] = [];
  const narration = content.replace(/「[^」]*」/g, "").replace(/『[^』]*』/g, "");
  if (!narration.includes("我")) issues.push("第一人稱:內文沒有使用「我」敘述");
  const first = protagonistNames(protagonist)[0];
  if (!first) return issues;
  const patterns = [
    /我叫([\u4e00-\u9fff]{2,4})/g,
    /我名叫([\u4e00-\u9fff]{2,4})/g,
    /我的名字(?:是|叫)([\u4e00-\u9fff]{2,4})/g,
  ];
  for (const re of patterns) {
    for (const match of content.matchAll(re)) {
      const stated = match[1] ?? "";
      if (!looksLikeDifferentName(stated, first)) continue;
      issues.push(`第一人稱:「我」另取了名字「${stated}」，應為${first}`);
      return issues;
    }
  }
  return issues;
}

export function laneContentFails(content: string, laneKey?: string | null, protagonist?: string | null): string[] {
  const fails: string[] = [];
  if (isDeathPlotBannedLane(laneKey)) {
    const death = findLaneDeathPlot(content);
    if (death) fails.push(`禁題:${death}`);
  }
  if (isFirstPersonLane(laneKey)) fails.push(...firstPersonIssues(content, protagonist));
  return fails;
}

export type RecentStoryMeta = {
  lane?: string | null;
  angle?: string | null;
  premise?: string | null;
};

export function recentAngleSet(
  metas: readonly RecentStoryMeta[],
  laneKey?: string | null,
  globalWindow = 24,
  laneWindow = 6
): Set<string> {
  const angles = new Set<string>();
  for (const meta of metas.slice(0, globalWindow)) {
    if (meta?.angle) angles.add(meta.angle);
  }
  if (!laneKey) return angles;
  let seen = 0;
  for (const meta of metas) {
    if (meta?.lane !== laneKey) continue;
    if (meta.angle) angles.add(meta.angle);
    seen += 1;
    if (seen >= laneWindow) break;
  }
  return angles;
}

export function recentPremiseList(
  metas: readonly RecentStoryMeta[],
  laneKey?: string | null,
  globalWindow = 24,
  laneWindow = 6
): string[] {
  const ordered: string[] = [];
  const push = (premise: string | null | undefined) => {
    const text = premise?.trim();
    if (!text || ordered.includes(text)) return;
    ordered.push(text);
  };
  for (const meta of metas.slice(0, globalWindow)) push(meta?.premise);
  if (!laneKey) return ordered;
  let seen = 0;
  for (const meta of metas) {
    if (meta?.lane !== laneKey) continue;
    seen += 1;
    push(meta?.premise);
    if (seen >= laneWindow) break;
  }
  return ordered;
}

export function openingSections(content: string, count = 2): string {
  const parts = content.replace(/\r\n/g, "\n").trim().split(/\n[ \t]*＊＊＊[ \t]*\n/);
  return parts.slice(0, Math.max(1, count)).join("\n＊＊＊\n");
}

export function repeatedTitleOpening(title: string, recentTitles: readonly string[]): string | null {
  if (WHO_TITLE_RE.test(title) && recentTitles.some((item) => WHO_TITLE_RE.test(item))) return "誰准你／妳";
  return null;
}

export function isReaderClear(score: { open: number; logic: number } | null | undefined): boolean {
  if (!score) return true;
  return score.open >= 6 && score.logic >= 6;
}

export const HOOK_TITLE_LANES = ["kanbujian", "warm_twist", "cozy_shop"] as const;

const TITLE_PUNCT_RE = /[《》「」『』“”"'「」\s，,。！？?!、：:；;（）()．.·—\-]/g;

export function isHookTitleLane(laneKey?: string | null): boolean {
  return !!laneKey && (HOOK_TITLE_LANES as readonly string[]).includes(laneKey);
}

export function titleGlyphCount(title: string): number {
  return [...title.replace(TITLE_PUNCT_RE, "")].length;
}

export function titleFormatFails(title: string, laneKey?: string | null): string[] {
  const count = titleGlyphCount(title);
  const fails: string[] = [];
  if (count >= 2 && count <= 6) {
    fails.push(`平淡散文題:${count}字，不可只用2至6字的散文題或單純名詞`);
  }
  if (!isHookTitleLane(laneKey)) return fails;
  if (count < 12 || count > 22) {
    fails.push(`標題長度:${count}字，本線必須是12至22字`);
  }
  if (!/[，,]|卻|直到|其實|才發現/.test(title)) {
    fails.push("標題句式:本線必須是表面嫌棄或誤會，加上一個反常的具體舉動或物件懸念");
  }
  return fails;
}
