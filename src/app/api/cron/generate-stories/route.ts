import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deepseekChat, LANG_RULE } from "@/lib/deepseek";

// 2026-08-01：novel-story-generator 由 Cowork scheduled task 換做 Vercel Cron，
// 唔再靠 Claude agent 逐次人手判斷，全部驗收邏輯落實做 code + 一次輕量 DeepSeek 自我檢查。
// 需要 Fluid Compute 先可以用足 300 秒（Hobby 預設應已開啟；如部署後撞 10s/60s timeout，
// 去 Vercel → Project Settings → Functions 開 Fluid Compute）。
export const maxDuration = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

// ---------- 4-slot 設定生成器（取代舊嘅固定類別清單，排列組合上萬種）----------
const HEROINE_SITUATIONS = [
  "被逼相親嘅普通上班族", "閨蜜懇求出手嘅工具人", "剛被劈腿嘅前女友", "家道中落嘅千金",
  "劇本裡嘅炮灰女配", "被誤認身份嘅路人甲", "代打/代班嘅臨時工", "發現未婚夫出軌嘅準新娘",
  "被裁員嘅背景板同事", "被家族逼婚嘅庶女/私生女", "相親市場滯銷嘅大齡剩女人設",
  "替身新娘/替嫁上場嘅妹妹", "被公司當炮灰派去談判嘅新人", "被誤會設局嘅實習生",
];

const HERO_IDENTITIES = [
  "深藏不露嘅總裁", "傳說中冷面到犯法嘅上司", "扮窮嘅富豪", "隱藏富商後代",
  "被誤認做普通職員嘅集團繼承人", "變咗樣嘅青梅竹馬", "全城最難惹嘅人",
  "宮鬥劇裡嘅帝王/世子", "傳聞中六親不認嘅隱世家族繼承人", "表面紈絝實則深藏心機嘅世子/少爺",
  "被全家否定嘅庶出繼承人", "人人畏懼嘅冷面判官型人物", "曾經被拒絕現在身份反轉嘅舊識",
  "表面獨寵秘書實際另有目的嘅上司",
];

const TRIGGER_EVENTS = [
  "相親坐錯桌", "應徵做臨時女友/司機/秘書", "醉酒簽咗份合約", "被抓包假扮身份",
  "閨蜜託付潛入搞破壞", "被公司隨機抽中做測試對象", "婚禮/酒會上被錯認",
  "穿書穿成即將被休嘅女配", "被抓去頂替相睇對象出席飯局", "因一場意外車禍/受傷被誤認做另一個人",
  "被指派做「假想夫妻」拍宣傳照/應付家族聚會", "意外撿到對方遺失嘅重要物品搭上線",
  "被塞去做臨時保姆/管家應急", "應徵演員/替身工作意外撞正真人",
];

const MIDPOINT_TWISTS = [
  "對方一早知道你身份卻配合演戲", "你意外掌握對方把柄反將一軍", "你隨口一句話拆穿對方精心設計嘅局",
  "你嘅「缺點」竟然正中對方心意", "對方默默做過嘅隱藏善舉被揭穿", "你哋雙方原來各自都有秘密任務，撞埋一齊",
  "對方其實一直保護緊你唔知道嘅過去", "你隨手嘅一個決定意外救咗對方一命/一局",
  "你被誤會嘅「壞名聲」原來係對方刻意保護你嘅結果", "你發現眼前人竟然係當年幫過你嘅陌生人",
  "對方主動送上把柄考驗你嘅選擇", "一場意外揭發第三者才是真正嘅幕後黑手",
  "你以為輸咗嘅籌碼原來一早已經贏定", "對方遞出嘅條件背後藏住一份唔敢講出口嘅心意",
];

// 前台篩選用嘅粗分類標籤，可以重複——唔重複嘅責任落晒去標題/內文（靠上面4個slot組合）
// ⚠️ 雙胞胎替身局／復仇歸來 兩個係研究到而未同 Stephanie 落實確認，暫列入池，如反對可刪走
const GENRE_TAGS = [
  "潛入打臉", "穿書自救", "甜寵反轉", "退婚逆襲", "假戲真做",
  "身份反轉", "家族發瘋", "求而不得", "雙胞胎替身局", "復仇歸來",
];

const SURNAMES = ["沈", "陸", "江", "顧", "蘇", "林", "周", "程", "宋", "謝", "封", "傅", "聞", "盛", "時", "樓", "席", "慕", "厲", "荀", "崔", "裴"];
const FEMALE_GIVEN = ["知微", "知意", "薏", "清昭", "念安", "疏影", "望舒", "宛卿", "憶蘿", "簡遙", "南星", "如晚", "青禾", "思螢", "蘇黎"];
const MALE_GIVEN = ["沉硏", "臨渊", "行舟", "景琛", "亦臻", "聞禮", "執", "衍之", "聲遠", "承宴", "修白", "緘言"];

// ---------- House Style（2026 番茄風向修正版）----------
const STYLE_2026 = `
【必須使用繁體字（Traditional Chinese），絕對唔可以出現簡體字（Simplified Chinese），呢個規定優先過任何其他規則】
${LANG_RULE}

【2026 番茄風向修正版 House Style】
- 女主/主角要「發瘋、反套路、夠飒」——用擺爛、將計就計、發瘋輸出等手段自救，唔靠傳統隱忍、哭泣、等人拯救。
- 開場100–150字內必須拋出核心衝突同埋一個爽點/鉤子，唔可以慢熱鋪陳背景。第一句就要係衝突現場或者一句反常對白。
- 對白要夠張力，帶推進劇情或者打臉效果，唔好寫成閒聊。
- 每400字左右一個小反轉或爆點。
- 絕對唔可以出現：商戰/職場鬥爭、鬼怪/靈異/恐怖元素。
- 開頭第一句禁止用背景介紹起筆，必須由衝突現場、對白或動作切入。
- 標題禁止「XX的YY」「XX之YY」呢類公式化句式。
`;

const SERIAL_STRUCTURE = `
【serial（連載，有互動結局功能）結構規定】字數 2200–8000字。
結尾唔淨係留鉤，仲要停喺一個具體嘅「抉擇/未揭曉節點」——例如對方即將講出關鍵答案嘅前一秒、
女主即將做一個攸關命運嘅選擇、秘密即將揭穿嘅前一刻、表白/肢體接觸嘅前一刻。
呢個節點要令讀者諗到至少兩種截然不同嘅後續發展方向（例如：佢會唔會揭穿我？定係會唔會原諒我？），
先啱後續互動結局分支發揮。純粹斬喺動作描寫中間、冇分支想像空間嘅停法，唔算合格。唔可以寫成大團圓結局。
`;

const SHORT_STRUCTURE = `
【short（短篇，冇互動結局功能）結構規定】字數 1500–3000字。
結尾必須完整收尾，有明確情感爆發點/會心一笑/淚點，絕對唔可以留任何懸念或開放式結局。
容許寫成「求而不得」「暗戀落空」呢類令人想喊嘅淚點向結局，唔一定要 happy ending，
但無論結局係甜係苦，情節本身一定要完整解決，唔可以留手尾。
`;

const SIMPLIFIED_ONLY = [
  "长", "这", "说", "时", "后", "门", "开", "还", "没", "远", "两", "汉", "华", "国", "学",
  "问", "间", "东", "车", "风", "么", "为", "来", "对", "实", "过", "经", "样", "关", "号",
  "当", "从", "应", "头", "进", "无", "气", "总", "让", "觉", "现", "视", "听", "写", "买",
  "卖", "阴", "阳", "龙", "飞", "汇", "价", "张", "历", "传", "确", "轻", "离", "难", "权",
  "环", "归", "续", "缘", "认", "识", "语", "话", "记", "许", "谁", "个", "见", "长",
];
const CANTONESE_SAFE = ["嘅", "唔", "佢", "咗", "冇", "呢個", "邊度", "依家", "㩒", "鍾意", "攞"];
const AI_CLICHES = ["夜幕降臨", "不禁", "彷彿整個世界", "哦我的天"];
const TITLE_FORMULAIC = /^.{2,6}(的|之).{2,6}$/;

function pick<T>(arr: T[], exclude: Set<T> = new Set()): T {
  const pool = arr.filter((x) => !exclude.has(x));
  const src = pool.length > 0 ? pool : arr;
  return src[Math.floor(Math.random() * src.length)];
}

function pickName(recentSurnames: Set<string>, givenPool: string[]): string {
  const surname = pick(SURNAMES, recentSurnames);
  const given = givenPool[Math.floor(Math.random() * givenPool.length)];
  return surname + given;
}

type StoryType = "serial" | "short";

function validate(
  content: string,
  title: string,
  storyType: StoryType,
  recentTitles: string[]
): string[] {
  const fails: string[] = [];
  const minLen = storyType === "serial" ? 2200 : 1500;
  if (content.length < minLen) fails.push(`字數不足(${content.length}<${minLen})`);
  if (TITLE_FORMULAIC.test(title)) fails.push("標題formulaic pattern");
  for (const ch of SIMPLIFIED_ONLY) {
    if (content.includes(ch) || title.includes(ch)) fails.push(`簡體字:${ch}`);
  }
  for (const w of CANTONESE_SAFE) {
    if (content.includes(w) || title.includes(w)) fails.push(`粵語詞:${w}`);
  }
  for (const c of AI_CLICHES) {
    if (content.includes(c)) fails.push(`AI陳套詞:${c}`);
  }
  for (const rt of recentTitles) {
    if (rt && (title.includes(rt) || rt.includes(title))) fails.push("標題撞近期");
  }
  return fails;
}

// 輕量 DeepSeek 自我檢查：closure(short)/cliffhanger(serial) 呢啲要閱讀理解嘅檢查，code 做唔到
async function selfCheckClosure(content: string, storyType: StoryType): Promise<boolean> {
  const question =
    storyType === "short"
      ? "以下短篇故事結局係咪完整收尾（衝突有結果、疑問有答案、有明確情感爆發點），冇留低任何懸念或開放式結局？"
      : "以下連載故事結尾係咪停喺一個具體嘅抉擇/未揭曉節點（令讀者諗到至少兩種唔同後續發展），而唔係已經完整解決咗成個衝突？";
  const raw = await deepseekChat(
    [
      { role: "system", content: "你是嚴格嘅編輯，只答「合格」或「不合格」，唔好加任何其他文字。" },
      { role: "user", content: `${question}\n\n故事結尾部分：\n${content.slice(-600)}` },
    ],
    { model: "deepseek-chat", temperature: 0, maxTokens: 10, timeoutMs: 30_000 }
  );
  return raw.includes("合格") && !raw.includes("不合格");
}

async function generateOne(
  storyType: StoryType,
  recentTitles: string[],
  recentSurnames: Set<string>
): Promise<{ genre: string; title: string; protagonist: string; content: string; retries: number; validateNote: string }> {
  const situation = pick(HEROINE_SITUATIONS);
  const identity = pick(HERO_IDENTITIES);
  const event = pick(TRIGGER_EVENTS);
  const twist = pick(MIDPOINT_TWISTS);
  const genre = pick(GENRE_TAGS);
  const heroineName = pickName(recentSurnames, FEMALE_GIVEN);
  const heroSurnameExclude = new Set([...recentSurnames, heroineName[0]]);
  const heroName = pickName(heroSurnameExclude, MALE_GIVEN);

  const structure = storyType === "serial" ? SERIAL_STRUCTURE : SHORT_STRUCTURE;
  const systemMsg = `${STYLE_2026}\n${structure}\n近期已用標題（唔可以同呢啲重複或高度相似）：${recentTitles.join("、")}`;

  const baseUserMsg =
    `女主處境：${situation}\n男主/對手身份反差：${identity}\n相遇/觸發事件：${event}\n中段反轉/爽點：${twist}\n` +
    `女主姓名：${heroineName}，男主姓名：${heroName}（可微調，但唔好改姓氏）。\n` +
    `story_type：${storyType}。\n` +
    `為呢個故事定一個吸引嘅標題（唔好用「XX的YY」句式，要有具體反差/懸念）。\n` +
    `輸出格式必須係：\n===TITLE===\n（標題）\n===CONTENT===\n（全文）\n===END===\n唔好加任何其他文字或解釋。`;

  let userMsg = baseUserMsg;
  let lastTitle = "";
  let lastContent = "";
  let retries = 0;
  let validateNote = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await deepseekChat(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      { model: "deepseek-chat", temperature: 1.05, maxTokens: 6000, timeoutMs: 120_000 }
    );
    const titleMatch = raw.split("===TITLE===")[1]?.split("===CONTENT===")[0]?.trim() ?? "";
    let content = raw.split("===CONTENT===")[1]?.trim() ?? "";
    content = content.replace(/===END===\s*$/, "").trim();
    lastTitle = titleMatch;
    lastContent = content;

    const fails = validate(content, titleMatch, storyType, recentTitles);
    if (fails.length === 0) {
      const closureOk = await selfCheckClosure(content, storyType).catch(() => true);
      if (closureOk) {
        return { genre, title: titleMatch, protagonist: `${heroineName}、${heroName}`, content, retries: attempt, validateNote: "PASS" };
      }
      fails.push(storyType === "short" ? "冇完整收尾" : "冇停喺抉擇節點");
    }

    retries = attempt + 1;
    validateNote = fails.join("；");
    userMsg = `${baseUserMsg}\n\n⚠️重call:上一次唔合格，原因：${validateNote}。請修正返呢啲問題再寫一次。`;
  }

  return {
    genre,
    title: lastTitle,
    protagonist: `${heroineName}、${heroName}`,
    content: lastContent,
    retries,
    validateNote: `⚠️未過validate：${validateNote}`,
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin();

  const { data: recent } = await supabase
    .from("novel_stories")
    .select("title, protagonist")
    .order("created_at", { ascending: false })
    .limit(12);

  const recentTitles = (recent ?? []).map((r) => r.title as string);
  const recentSurnames = new Set(
    (recent ?? [])
      .flatMap((r) => ((r.protagonist as string) ?? "").split("、"))
      .map((n) => n.trim()[0])
      .filter(Boolean)
  );

  const results: Record<string, unknown>[] = [];

  for (const storyType of ["short", "serial"] as StoryType[]) {
    try {
      const story = await generateOne(storyType, recentTitles, recentSurnames);
      const { error } = await supabase.from("novel_stories").insert({
        genre: story.genre,
        title: story.title,
        protagonist: story.protagonist,
        content: story.content,
        story_type: storyType,
      });
      results.push({ storyType, title: story.title, genre: story.genre, retries: story.retries, validateNote: story.validateNote, insertError: error?.message ?? null });
      recentTitles.push(story.title); // 避免同一個run入面兩篇撞標題
    } catch (e) {
      results.push({ storyType, error: e instanceof Error ? e.message : String(e) });
    }
  }

  await supabase
    .from("service_heartbeat")
    .upsert({ task_name: "novel-story-generator", last_beat_at: new Date().toISOString() }, { onConflict: "task_name" });

  return NextResponse.json({ ok: true, results });
}
