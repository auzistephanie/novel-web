import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deepseekChat, LANG_RULE } from "@/lib/deepseek";

// 2026-08-01：novel-story-generator 由 Cowork scheduled task 換做 Vercel Cron，
// 唔再靠 Claude agent 逐次人手判斷，全部驗收邏輯落實做 code + 一次輕量 DeepSeek 自我檢查。
// 需要 Fluid Compute 先可以用足 300 秒（Hobby 預設應已開啟；如部署後撞 10s/60s timeout，
// 去 Vercel → Project Settings → Functions 開 Fluid Compute）。
//
// 2026-08-13：加咗「骨架系統」（Stephanie 反饋成個網淨得一種故事覺得悶）——由「一條固定公式」
// 變做三個骨架隨機揀（身份反差揭穿／契約婚姻先婚後愛／雙強對峙），每個骨架用自己嘅slot池；
// 加埋 gen_meta 記低每篇用咗邊個骨架+slot，下次生成排除近期用過嘅組合，解決「似曾相識」根源。
// 詳細决策脈絡見 daily-novel CHANGELOG.md 同日條目。
export const maxDuration = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

// ---------- 骨架 A：身份反差揭穿（原有嘅4-slot生成器）----------
const HEROINE_SITUATIONS = [
  "被逼相親嘅普通上班族", "閨蜜懇求出手嘅工具人", "剛被劈腿嘅前女友", "家道中落嘅千金",
  "劇本裡嘅炮灰女配", "被誤認身份嘅路人甲", "代打/代班嘅臨時工", "發現未婚夫出軌嘅準新娘",
  "被裁員嘅背景板同事", "被家族逼婚嘅庶女/私生女", "相親市場滯銷嘅大齡剩女人設",
  "替身新娘/替嫁上場嘅妹妹", "被公司當炮灰派去談判嘅新人", "被誤會設局嘅實習生",
];

// 2026-08-13：原本8個非財富向設定入面4個都用「深藏/隱藏/扮」開首，讀落好單一（Stephanie 反饋人設扁平），
// 呢次重寫做唔同句式開首，保留反差張力但表達方式唔再撞句式
const HERO_IDENTITIES = [
  "傳說中冷面到犯法嘅上司", "變咗樣嘅青梅竹馬", "全城最難惹嘅人",
  "人人畏懼嘅冷面判官型人物", "曾經被拒絕現在身份反轉嘅舊識", "表面獨寵秘書實際另有目的嘅上司",
  // 2026-08-03：豪門財閥向 slot 應要求剔走（讀落太商業），換做非財富向嘅身份反差設定
  "退役特種兵，如今低調做保安主管", "履歷普通嘅新同事，其實係金牌外科醫生",
  "得獎作家/導演，用筆名匿名生活", "武術冠軍，退役後開咗間唔起眼嘅拳館",
  "王牌臥底特工，任務期間扮做普通職員", "過氣明星，息影多年獨自搬嚟呢個社區",
  "急救醫生/消防員，平時擺出一副拒人千里嘅樣", "米芝蓮主廚，卻情願喺街市大排檔掌廚",
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

// ---------- 骨架 B：契約婚姻／先婚後愛（2026-08-13 新增，冇隱藏身份，張力嚟自假關係變真感情）----------
const CONTRACT_REASONS = [
  "家族逼婚需要一個擋箭牌", "遺產繼承條件要求已經結婚", "簽證/居留身份出現危機",
  "幫朋友撐場臨時扮情侶", "醫院緊急聯絡人一欄要已婚先可以簽字", "海外進修/移民審查要求已婚身份",
  "為咗爭撫養權要證明關係穩定", "還債換取棲身之所嘅交換條件",
];

const CONTRACT_SPARKS = [
  "對方喺外人面前撐你撐到過晒火", "同居意外揭發對方不為人知嘅溫柔一面", "一場危機入面對方本能咁保護你",
  "對方喺你唔為意時默默記低你嘅生活習慣", "合約快到期，對方主動提出續約嘅理由講唔出口",
  "第三者出現，對方吃醋反應出賣咗自己", "一次假裝親密嘅動作，換嚟一個唔似係演戲嘅心跳",
];

// ---------- 骨架 C：雙強對峙（2026-08-13 新增，男女主都唔弱，冇身份要隱藏，張力嚟自對等較量）----------
// ⚠️ 揀嘅場景刻意避開商業/職場鬥爭（撞返 STYLE_2026 嘅禁區），淨用技藝/體能/司法呢類對等較量
const CLASH_ARENAS = [
  "格鬥/健身擂台上嘅勁敵", "法庭上嘅控辯雙方律師", "同一件藏品嘅競投對手",
  "廚藝比賽嘅決賽對手", "同一單案件嘅刑警與私家偵探", "同一個賽道嘅賽車/馬拉松對手",
  "音樂/舞蹈大賽嘅決賽對手",
];

const CLASH_TURNS = [
  "發現有共同敵人要暫時合作", "對方意外救咗你一命令形勢逆轉", "上級/評審要求你哋合作而唔係對戰",
  "一場意外令你哋要共享一個空間/資源", "對方唔按套路出牌打亂你部署，反而引起你興趣",
  "你哋各自嘅底牌被同一件事同時揭穿",
];

// ---------- 骨架 D：雙向救贖／虐戀治癒（2026-08-18 新增，兩個各自帶傷嘅人喺相處中治癒對方，
// 唔靠身份反差/揭穿/較量，張力嚟自「表面想要 vs 真正怕」嘅內在矛盾撞埋一齊。來源：2026 短劇市場《那年冬至》
// 《老板他暗恋我》兩類「雙向救贖/虐戀治癒」爆款，Stephanie 確認加。）----------
const HEALING_WOUNDS = [
  "曾經因為信錯人而傾家蕩產，從此唔敢再信任何人",
  "細個俾父母忽略，一直用死命工作證明自己值得被愛",
  "上一段感情因為自己嘅懦弱錯過咗，一直悔恨",
  "照顧患病嘅家人好多年，忘記咗點樣為自己而活",
  "曾經嘅夢想俾現實磨滅，而家得返個「過日子」",
  "細個經歷父母離婚，一直唔相信關係可以長久",
  "工作上一次重大失誤累到人受傷，一直活喺自責入面",
  "曾經係人群焦點，而家因為一件事跌落谷底，唔敢再面對人",
];

const HEALING_TRIGGERS = [
  "喺對方防備最低嗰一刻，撞見咗佢平時唔會俾人睇到嘅一面",
  "無意中講出一句戳中對方心事嘅說話，發現對方反應異常",
  "一件本身平常嘅小事，觸發咗對方壓抑好耐嘅情緒",
  "陪對方行返一次佢一直逃避嘅地方",
  "對方喺你面前第一次流露脆弱，冇再扮冇事",
  "發現大家因為各自嘅傷口，都做過同一種選擇",
];

// ---------- 骨架選擇（帶權重。2026-08-18：由 5:3:2 調做 4:3:2:3，降低 identity_reveal 佔比
// （原本一半故事都行呢條線，係「篇篇都似」嘅主因之一），四個骨架分佈更平均）----------
type Skeleton = "identity_reveal" | "contract_marriage" | "power_clash" | "mutual_healing";
const SKELETON_WEIGHTS: { key: Skeleton; weight: number }[] = [
  { key: "identity_reveal", weight: 4 },
  { key: "contract_marriage", weight: 3 },
  { key: "power_clash", weight: 2 },
  { key: "mutual_healing", weight: 3 },
];

function pickSkeleton(exclude: Set<Skeleton>): Skeleton {
  const pool = SKELETON_WEIGHTS.filter((s) => !exclude.has(s.key));
  const src = pool.length > 0 ? pool : SKELETON_WEIGHTS;
  const total = src.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (const s of src) {
    if (r < s.weight) return s.key;
    r -= s.weight;
  }
  return src[src.length - 1].key;
}

// 前台篩選用嘅粗分類標籤，按骨架分池，令 genre tag 同故事實際內容對得上
// ⚠️ 雙胞胎替身局／復仇歸來 兩個係研究到而未同 Stephanie 落實確認，暫列入池，如反對可刪走
// ⚠️「雙強對峙」呢個名已經俾 genreCategories.ts 攞咗做古言宮廷（period-drama）大類用，
// 呢度嘅雙強對峙骨架係現代設定，改用「強強交鋒」呢個新名避免撞名累到前台分錯大類。
const GENRE_TAGS_BY_SKELETON: Record<Skeleton, string[]> = {
  identity_reveal: [
    "潛入打臉", "穿書自救", "甜寵反轉", "退婚逆襲", "假戲真做",
    "身份反轉", "家族發瘋", "求而不得", "雙胞胎替身局", "復仇歸來",
  ],
  contract_marriage: ["契約婚姻", "假戲真做"],
  power_clash: ["強強交鋒"],
  mutual_healing: ["雙向救贖", "治癒系"], // 2026-08-18 新增，genreCategories.ts 已歸落 revenge-romance（虐戀屬性相近）
};

const SURNAMES = ["沈", "陸", "江", "顧", "蘇", "林", "周", "程", "宋", "謝", "封", "傅", "聞", "盛", "時", "樓", "席", "慕", "厲", "荀", "崔", "裴"];
const FEMALE_GIVEN = ["知微", "知意", "薏", "清昭", "念安", "疏影", "望舒", "宛卿", "憶蘿", "簡遙", "南星", "如晚", "青禾", "思螢", "蘇黎"];
const MALE_GIVEN = ["沉硏", "臨渊", "行舟", "景琛", "亦臻", "聞禮", "執", "衍之", "聲遠", "承宴", "修白", "緘言"];

// ---------- House Style（2026-08-18 精簡版：由十幾條清單式規則收做5條創作原則
// ——起因：Stephanie 反饋清單式規則令模型「逐條打勾」，寫出嚟係「達標文」唔係「作品」，
// 舊規則太多互相衝突（例如「每400字一個反轉」同「慢熱鋪陳先打動人」正面撞），
// 改用有層次嘅創作原則代替。詳細決策脈絡 → daily-novel CHANGELOG.md 2026-08-18）----------
const STYLE_2026 = `
【必須使用繁體字（Traditional Chinese），絕對唔可以出現簡體字（Simplified Chinese），呢個規定優先過任何其他規則】
${LANG_RULE}

【六條創作原則（2026-08-19 修訂，加崩防位）】
1. 具體壓倒抽象：全篇每個關鍵情緒/轉折位，一定要用一個具體到得返一次嘅細節（一個動作、一件物件、一句原話）嚟寫，唔可以用形容詞概括代替（唔准寫「佢很紳士」，要寫「佢幫你開門嗰陣，手指尾勾住門框」呢類具體畫面）。
2. 一場一景，唔准總結跳接：全篇淨可以有 1-2 個實際發生緊嘅場景，唔可以用「幾日後」「漸漸地」「相處左一段時間」呢類詞跳接時間，情感轉變一定要喺場景入面用一個具體時刻完成。開場即入場景（第一句就係現場嘅動作/對白/具體畫面），唔准用背景介紹起筆。
3. 表面想要 vs 真正怕：女主男主各自要有一個「表面想要嘅嘢」同一個「真正怕嘅嘢」，兩個要有矛盾——故事嘅張力嚟自呢個內在矛盾，唔淨係嚟自外部事件（相親/契約/對峙）。
4. 信任讀者：寫完一個動作或者對白之後，唔准即刻補一句解釋角色點解咁做/佢而家嘅心情——留返俾讀者自己睇得出。
5. 一個貫穿全篇嘅意象：開場揀一件具體物件或者細節，全篇最少出現三次，最後一次出現要帶住新意義（同開場嗰次唔一樣嘅感覺），令結尾可以扣返轉頭。
6. 一定要有崩防位：全篇最少一個位，主角原本壓住嘅情緒/防備要徹底崩潰一次——用具體反應寫出嚟（喊出聲、聲音變、手震），唔可以由頭到尾都係「忍住」「沒說話」帶過，冇宣洩位嘅故事唔算完整。

【底線技術要求（唔可以違反）】
- 女主/主角要「發瘋、反套路、夠飒」——用擺爛、將計就計、發瘋輸出等手段自救，唔靠傳統隱忍、哭泣、等人拯救。
- 深情要用主動付出、共同經歷嘅具體時刻嚟表現，唔可以寫成「長期記錄/監視對方一舉一動」（例如寫本子記低對方習慣、偷偷觀察好耐）——呢類寫法讀落有跟蹤狂感，唔係浪漫。
- 標題禁止「XX的YY」「XX之YY」呢類公式化句式。
- 絕對唔可以出現：商戰/職場鬥爭、鬼怪/靈異/恐怖元素。

【共鳴／落淚硬規（2026-08-13）】
- 故事核心情感要揀普通人親身經歷過嘅心理狀態（錯過、後悔、唔敢講出口、犧牲、被忽略），唔可以淨係靠身份反差/打臉嘅爽感撐全場。
- 全篇最後一句要寫到可以獨立截圖、唔使前文都睇得明、想令人分享出去嘅程度。

【揭露機制硬規（2026-08-13，2026-08-18 加第4選項）】
- 秘密／身份反差／心事點樣被發現，唔准用「翻舊物／搵到證物／解鎖舊裝置／偷睇日記」呢類方式——呢類寫法要解釋一大堆「點解物件會留喺度」「點解事隔幾年先發現」，愈解釋愈假，讀者一睇就出戲。
- 一律用以下其中一種：①即時撞破（當場撞見對方正在做緊嗰件事）②第三者當場講漏嘴（唔知情嘅旁人講出真相）③直接對峙（一方主動攤牌講出嚟）④心聲/內心話唔小心被聽到或者講咗出嚟。

※ 標題另外由generateTitle()獨立生成（2026-08-19），呢度唔使理標題，淨係專注寫內容。
`;

const SERIAL_STRUCTURE = `
【serial（連載，有互動結局功能）結構規定】字數 2200–8000字。
結尾唔淨係留鉤，仲要停喺一個具體嘅「抉擇/未揭曉節點」——例如對方即將講出關鍵答案嘅前一秒、
女主即將做一個攸關命運嘅選擇、秘密即將揭穿嘅前一刻、表白/肢體接觸嘅前一刻。
呢個節點要令讀者諗到至少兩種截然不同嘅後續發展方向（例如：佢會唔會揭穿我？定係會唔會原諒我？），
先啱後續互動結局分支發揮。純粹斬喺動作描寫中間、冇分支想像空間嘅停法，唔算合格。唔可以寫成大團圓結局。
秘密/身份反差嘅揭露跟返「揭露機制硬規」（即時撞破/第三者講漏嘴/直接對峙），停喺揭露前一秒最啱做呢個節點。
`;

const SHORT_STRUCTURE = `
【short（短篇，冇互動結局功能）結構規定】字數 1500–3000字。
結尾必須完整收尾，有明確情感爆發點/會心一笑/淚點，絕對唔可以留任何懸念或開放式結局。
容許寫成「求而不得」「暗戀落空」呢類令人想喊嘅淚點向結局，唔一定要 happy ending，
但無論結局係甜係苦，情節本身一定要完整解決，唔可以留手尾。
情感高潮跟返「共鳴／落淚硬規」——唔准直接講情緒，最後一句一定要係可以獨立截圖引用嘅句子。
`;

const SIMPLIFIED_ONLY = [
  "长", "这", "说", "时", "后", "门", "开", "还", "没", "远", "两", "汉", "华", "国", "学",
  "问", "间", "东", "车", "风", "么", "为", "来", "对", "实", "过", "经", "样", "关", "号",
  "当", "从", "应", "头", "进", "无", "气", "总", "让", "觉", "现", "视", "听", "写", "买",
  "卖", "阴", "阳", "龙", "飞", "汇", "价", "张", "历", "传", "确", "轻", "离", "难", "权",
  "环", "归", "续", "缘", "认", "识", "语", "话", "记", "许", "谁", "个", "见", "长",
];
const CANTONESE_SAFE = ["嘅", "唔", "佢", "咗", "冇", "呢個", "邊度", "依家", "㩒", "鍾意", "攞"];
const AI_CLICHES = [
  "夜幕降臨", "不禁", "彷彿整個世界", "哦我的天",
  "眼眶泛紅", "心裡湧起一陣暖流", "說不出的感動", "忍不住流下眼淚",
  "心裡五味雜陳", "整個人怔住", "心跳漏了一拍", "命運的安排", "不由自主地",
];
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

// gen_meta：記低今次生成用咗邊個骨架+slot組合，插入DB留返俾下次生成排除近期用過嘅組合
type GenMeta =
  | { skeleton: "identity_reveal"; situation: string; identity: string; event: string; twist: string }
  | { skeleton: "contract_marriage"; reason: string; spark: string }
  | { skeleton: "power_clash"; arena: string; turn: string }
  | { skeleton: "mutual_healing"; heroineWound: string; heroWound: string; trigger: string };

// 攞返近期（同骨架先計）用過嘅某個slot欄位嘅值，做排除集合
function recentSlotValues(metas: GenMeta[], skeleton: Skeleton, key: string, window = 8): Set<string> {
  return new Set(
    metas
      .filter((m) => m.skeleton === skeleton)
      .slice(0, window)
      .map((m) => (m as unknown as Record<string, string>)[key])
      .filter(Boolean)
  );
}

// 2026-08-19：validate 拆做content/title兩個函數，配合「先寫內容、後起標題」嘅兩次call設計
// ——起因：試過用同一次call「寫完內文先諗標題」，發現DeepSeek成日寫完內文就唔記得再輸出標題
// （finish_reason=stop但冇===TITLE===），改用獨立嘅generateTitle() call，保證標題一定睇住實際內文嚟諗。
function validateContent(content: string, storyType: StoryType): string[] {
  const fails: string[] = [];
  const minLen = storyType === "serial" ? 2200 : 1500;
  if (content.length < minLen) fails.push(`字數不足(${content.length}<${minLen})`);
  for (const ch of SIMPLIFIED_ONLY) {
    if (content.includes(ch)) fails.push(`簡體字:${ch}`);
  }
  for (const w of CANTONESE_SAFE) {
    if (content.includes(w)) fails.push(`粵語詞:${w}`);
  }
  for (const c of AI_CLICHES) {
    if (content.includes(c)) fails.push(`AI陳套詞:${c}`);
  }
  return fails;
}

function validateTitle(title: string, recentTitles: string[]): string[] {
  const fails: string[] = [];
  if (!title) fails.push("標題為空");
  if (TITLE_FORMULAIC.test(title)) fails.push("標題formulaic pattern");
  for (const ch of SIMPLIFIED_ONLY) {
    if (title.includes(ch)) fails.push(`簡體字:${ch}`);
  }
  for (const w of CANTONESE_SAFE) {
    if (title.includes(w)) fails.push(`粵語詞:${w}`);
  }
  for (const rt of recentTitles) {
    if (rt && (title.includes(rt) || rt.includes(title))) fails.push("標題撞近期");
  }
  return fails;
}

// 獨立標題生成：畀返實際已經寫低嘅內文AI，逼佢一定要根據真實內容諗標題，
// 唔會再出現「標題講咗個內文冇嘅戲劇化場面」嘅走數情況。
async function generateTitle(content: string, recentTitles: string[]): Promise<string> {
  const systemMsg =
    `你係專業網絡小說編輯，負責幫故事諗一個吸引嘅標題。\n` +
    `【標題規則】\n` +
    `- 標題一定要用全文入面真實出現過嘅具體畫面、對白或者情節嚟寫，唔可以作一個全文冇出現過嘅戲劇化場面。\n` +
    `- 唔准用「XX的YY」「XX之YY」句式，要用場景/衝突/懸念感嚟寫，令人一睇就有畫面、想知後續。\n` +
    `- 必須用繁體字，唔可以有簡體字或粵語口語詞（例如「嘅」「唔」「佢」「咗」「冇」）。\n` +
    `淨係輸出標題本身，唔好加引號、解釋或者其他文字。`;
  let userMsg =
    `以下係故事全文，請根據呢個故事嘅實際內容諗一個標題：\n\n${content}\n\n` +
    `近期已用標題（唔可以同呢啲重複或高度相似）：${recentTitles.join("、") || "無"}`;
  let lastTitle = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await deepseekChat(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      { model: "deepseek-chat", temperature: 1.0, maxTokens: 100, timeoutMs: 60_000 }
    );
    const title = raw.trim().replace(/^["「『]+|["」』]+$/g, "");
    lastTitle = title;
    const fails = validateTitle(title, recentTitles);
    if (fails.length === 0) return title;
    userMsg = `${userMsg}\n\n⚠️上一次個標題「${title}」唔合格，原因：${fails.join("；")}。請重新諗過。`;
  }
  return lastTitle;
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

function buildSkeletonPrompt(
  skeleton: Skeleton,
  recentMetas: GenMeta[]
): { skeletonPrompt: string; genMeta: GenMeta; genrePool: string[] } {
  if (skeleton === "identity_reveal") {
    const situation = pick(HEROINE_SITUATIONS, recentSlotValues(recentMetas, skeleton, "situation"));
    const identity = pick(HERO_IDENTITIES, recentSlotValues(recentMetas, skeleton, "identity"));
    const event = pick(TRIGGER_EVENTS, recentSlotValues(recentMetas, skeleton, "event"));
    const twist = pick(MIDPOINT_TWISTS, recentSlotValues(recentMetas, skeleton, "twist"));
    return {
      skeletonPrompt:
        `骨架：身份反差揭穿。\n女主處境：${situation}\n男主/對手身份反差：${identity}\n相遇/觸發事件：${event}\n中段反轉/爽點：${twist}`,
      genMeta: { skeleton, situation, identity, event, twist },
      genrePool: GENRE_TAGS_BY_SKELETON.identity_reveal,
    };
  }
  if (skeleton === "contract_marriage") {
    const reason = pick(CONTRACT_REASONS, recentSlotValues(recentMetas, skeleton, "reason"));
    const spark = pick(CONTRACT_SPARKS, recentSlotValues(recentMetas, skeleton, "spark"));
    return {
      skeletonPrompt:
        `骨架：契約婚姻/先婚後愛。呢個骨架冇秘密身份要隱藏，張力嚟自「假關係變真感情」，唔准加入身份反差/臥底/隱藏才華嗰套。\n` +
        `契約起因：${reason}\n弄假成真嘅觸發位：${spark}`,
      genMeta: { skeleton, reason, spark },
      genrePool: GENRE_TAGS_BY_SKELETON.contract_marriage,
    };
  }
  if (skeleton === "power_clash") {
    const arena = pick(CLASH_ARENAS, recentSlotValues(recentMetas, skeleton, "arena"));
    const turn = pick(CLASH_TURNS, recentSlotValues(recentMetas, skeleton, "turn"));
    return {
      skeletonPrompt:
        `骨架：雙強對峙。男女主雙方都要寫得同樣強、同樣有主見，唔准一方明顯強過另一方，冇秘密身份要隱藏，張力嚟自對等較量。\n` +
        `較量場景：${arena}\n轉折位：${turn}`,
      genMeta: { skeleton, arena, turn },
      genrePool: GENRE_TAGS_BY_SKELETON.power_clash,
    };
  }
  const heroineWound = pick(HEALING_WOUNDS, recentSlotValues(recentMetas, skeleton, "heroineWound"));
  const heroWoundExclude = new Set([...recentSlotValues(recentMetas, skeleton, "heroWound"), heroineWound]);
  const heroWound = pick(HEALING_WOUNDS, heroWoundExclude);
  const trigger = pick(HEALING_TRIGGERS, recentSlotValues(recentMetas, skeleton, "trigger"));
  return {
    skeletonPrompt:
      `骨架：雙向救贖/虐戀治癒。呢個骨架唔靠身份反差/揭穿/較量，張力嚟自兩個人各自帶嘅內在傷口——套用創作原則3（表面想要 vs 真正怕），兩人嘅傷口要喺相處入面慢慢浮現，唔可以一開波就攤晒出嚟。\n` +
      `女主嘅傷口：${heroineWound}\n男主嘅傷口：${heroWound}\n觸發治癒嘅契機：${trigger}`,
    genMeta: { skeleton, heroineWound, heroWound, trigger },
    genrePool: GENRE_TAGS_BY_SKELETON.mutual_healing,
  };
}

async function generateOne(
  storyType: StoryType,
  recentTitles: string[],
  recentSurnames: Set<string>,
  recentMetas: GenMeta[]
): Promise<{
  genre: string;
  title: string;
  protagonist: string;
  content: string;
  retries: number;
  validateNote: string;
  genMeta: GenMeta;
}> {
  const recentSkeletons = new Set(recentMetas.slice(0, 4).map((m) => m.skeleton));
  const skeleton = pickSkeleton(recentSkeletons);
  const { skeletonPrompt, genMeta, genrePool } = buildSkeletonPrompt(skeleton, recentMetas);
  const genre = pick(genrePool);

  const heroineName = pickName(recentSurnames, FEMALE_GIVEN);
  const heroSurnameExclude = new Set([...recentSurnames, heroineName[0]]);
  const heroName = pickName(heroSurnameExclude, MALE_GIVEN);

  const structure = storyType === "serial" ? SERIAL_STRUCTURE : SHORT_STRUCTURE;
  const systemMsg = `${STYLE_2026}\n${structure}`;

  const baseUserMsg =
    `${skeletonPrompt}\n` +
    `女主姓名：${heroineName}，男主姓名：${heroName}（可微調，但唔好改姓氏）。\n` +
    `story_type：${storyType}。\n` +
    `淨係寫全文內容，唔使諗標題（標題另外處理）。\n` +
    `輸出格式必須係：\n===CONTENT===\n（全文）\n===END===\n唔好加任何其他文字或解釋。`;

  let userMsg = baseUserMsg;
  let lastContent = "";
  let retries = 0;
  let validateNote = "";
  let content = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await deepseekChat(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      { model: "deepseek-chat", temperature: 1.05, maxTokens: 6000, timeoutMs: 120_000 }
    );
    content = (raw.split("===CONTENT===")[1]?.split("===END===")[0]?.trim()) || raw.trim();
    lastContent = content;

    const fails = validateContent(content, storyType);
    if (fails.length === 0) {
      const closureOk = await selfCheckClosure(content, storyType).catch(() => true);
      if (closureOk) {
        validateNote = "PASS";
        retries = attempt;
        break;
      }
      fails.push(storyType === "short" ? "冇完整收尾" : "冇停喺抉擇節點");
    }

    retries = attempt + 1;
    validateNote = fails.join("；");
    userMsg = `${baseUserMsg}\n\n⚠️重call:上一次唔合格，原因：${validateNote}。請修正返呢啲問題再寫一次。`;
  }

  const title = await generateTitle(content || lastContent, recentTitles);

  return {
    genre,
    title,
    protagonist: `${heroineName}、${heroName}`,
    content: content || lastContent,
    retries,
    validateNote: validateNote === "PASS" ? "PASS" : `⚠️未過validate：${validateNote}`,
    genMeta,
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
    .select("title, protagonist, gen_meta")
    .order("created_at", { ascending: false })
    .limit(12);

  const recentTitles = (recent ?? []).map((r) => r.title as string);
  const recentSurnames = new Set(
    (recent ?? [])
      .flatMap((r) => ((r.protagonist as string) ?? "").split("、"))
      .map((n) => n.trim()[0])
      .filter(Boolean)
  );
  const recentMetas: GenMeta[] = (recent ?? [])
    .map((r) => r.gen_meta as GenMeta | null)
    .filter((m): m is GenMeta => !!m);

  const results: Record<string, unknown>[] = [];

  for (const storyType of ["short", "serial"] as StoryType[]) {
    try {
      const story = await generateOne(storyType, recentTitles, recentSurnames, recentMetas);
      const { error } = await supabase.from("novel_stories").insert({
        genre: story.genre,
        title: story.title,
        protagonist: story.protagonist,
        content: story.content,
        story_type: storyType,
        gen_meta: story.genMeta,
      });
      results.push({
        storyType,
        title: story.title,
        genre: story.genre,
        skeleton: story.genMeta.skeleton,
        retries: story.retries,
        validateNote: story.validateNote,
        insertError: error?.message ?? null,
      });
      recentTitles.push(story.title); // 避免同一個run入面兩篇撞標題
      recentMetas.unshift(story.genMeta); // 避免同一個run入面兩篇撞骨架/slot
    } catch (e) {
      results.push({ storyType, error: e instanceof Error ? e.message : String(e) });
    }
  }

  await supabase
    .from("service_heartbeat")
    .upsert({ task_name: "novel-story-generator", last_beat_at: new Date().toISOString() }, { onConflict: "task_name" });

  return NextResponse.json({ ok: true, results });
}

