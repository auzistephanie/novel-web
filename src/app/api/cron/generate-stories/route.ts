import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deepseekChat, LANG_RULE } from "@/lib/deepseek";
import {
  assignCharacterPair,
  BANNED_TOPIC_PROMPT,
  BUSINESS_WAR_PROMPT,
  CANTONESE_SAFE,
  classifyQualityNote,
  FAIL_TYPES,
  findBannedTopic,
  findBusinessWar,
  findLaneDeathPlot,
  findLanguageLeak,
  findPreachyEnding,
  FIRST_PERSON_PREMISE_RULE,
  isDeathPlotBannedLane,
  isFirstPersonLane,
  isHardBlocked,
  isHookTitleLane,
  isReaderClear,
  laneContentFails,
  lanePremiseExtraRules,
  MAINLAND_ADMIN_WORDS,
  nameBlockFromStories,
  openingSections,
  titleFormatFails,
  titleGlyphCount,
  premiseBlockReason,
  QUALITY_REPAIR,
  qualityFailNotes,
  recentAngleSet,
  recentPremiseList,
  repeatedTitleOpening,
  SIMPLIFIED_ONLY,
  type FailType,
  type Gender,
} from "@/lib/storyQuality";
import { closureFailNote, nextSeriesOrder, pickLaneByWeight, resolveForcedLane } from "@/lib/lanePick";

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

// ================================================================================
// 2026-08-19（大改）：骨架+slot 隨機拼砌系統整套換走，改用「Hook 引擎 + Premise-First」。
// 起因：Stephanie 連續四輪反饋「悶、冇 feeling、冇人想睇」，其中最關鍵一個測試——
// 由 Claude 人手精寫、完全符合舊 STYLE_2026 規則嘅一篇，佢一樣評「悶」——證明問題唔喺
// model 能力，而喺「舊規則定義嘅好」本身就唔係目標市場要嘅嘢。舊規則（一場一景／信任讀者／
// 意象貫穿／克制留白）係純文學美學；目標市場係 2026 短劇爽文（每分鐘 3-4 個情緒爆點、
// 3 秒決定去留、打臉逆襲轉化率係純愛情向 2.3 倍）。經 Gemini 外部 review 確認同一診斷。
//
// ⚠️ 08-03 Stephanie 實際講嘅係「太商業」，「唔要豪門財閥」係我個人 translate（見
// 全部限制規則來源文檔）。2026-08-19 再澄清：商戰／豪門依然禁，但職場個人鬥爭（被搶
// 功勞、被誣陷、被逼頂罪）已經開放。下面 10 個 Hook 嘅「高風險籌碼」用個人向
// （手術費／官司／名聲／債／身份／同命契／職場處境），唔用集團股權嗰套。
// ================================================================================

type HookKey =
  | "deadline_choice"
  | "info_asymmetry"
  | "stakes_deal"
  | "mutual_hunt"
  | "moral_regret"
  | "wrong_identity"
  | "pretend_amnesia"
  | "social_humiliation"
  | "debt_collateral"
  | "shared_fate";

type HookEngine = {
  key: HookKey;
  name: string;
  driver: string; // 核心驅動力
  seed: string; // 示範 premise，界定張力水平（模型要寫到呢個強度，但唔可以照抄）
  genres: string[];
};

// 10 大爆款 Hook 引擎池。每次生成隨機抽一個，先寫 100 字內嘅極端衝突 premise，
// 過咗張力審查先展開全文。seed 係「張力標尺」唔係範本，prompt 會明確叫模型唔好照抄。
const HOOK_ENGINES: HookEngine[] = [
  {
    key: "deadline_choice",
    name: "倒數死線 + 兩難抉擇",
    driver: "時間壓迫到極限，兩個選擇都要付出慘痛代價",
    seed: "距離妹妹上手術檯只剩兩個小時，蘇念必須在「跪求當年退婚的那個人」與「交出足以毀掉亡母名聲的證據」之間選一樣。就在她舉起筆的那一刻，對方把支票撕成兩半：「我要的不是你的簽名。」",
    genres: ["家族發瘋", "退婚逆襲"],
  },
  {
    key: "info_asymmetry",
    name: "資訊差 + 誘敵深入",
    driver: "一方以為自己完全佔上風，其實從頭到尾都在對方掌握之中",
    seed: "陸行舟以為他用一紙協議困住了江晚，報了當年被退婚的那口氣。他不知道江晚手上有段錄音，一放出來整間公司都會垮。她心甘情願留在他身邊，只是為了等他親口說出那句話。",
    genres: ["復仇歸來", "身份反轉"],
  },
  {
    key: "stakes_deal",
    name: "條款陷阱 + 致命驚喜",
    driver: "為救人簽下一份表面荒謬的約，簽完才發現條款背後藏著恐怖真相",
    seed: "為了湊齊爸爸的醫藥費，林微答應扮演傅景琛亡妻的替身三個月。簽約第一晚，傅景琛帶她去墓地——墓碑上那張照片，是林微自己。",
    genres: ["契約婚姻", "假戲真做"],
  },
  {
    key: "mutual_hunt",
    name: "雙向互獵 + 強強試探",
    driver: "兩個勢均力敵的對手被逼入同一個絕境，只有一個可以贏",
    seed: "兩個追查同一案件的死對頭被困在同一間密室，只有一個人能拿到出口密碼。互相下死手的時候，兩人同時發現對方口袋裡，是同一枚五年前救過自己的襟章。",
    genres: ["強強交鋒"],
  },
  {
    key: "moral_regret",
    name: "遲到真相 + 極致追悔",
    driver: "親手摧毀了對方之後，才發現對方一直是默默救自己的那個人",
    seed: "顧言深當眾燒毀了江離的畫室，笑她一輩子都是攀附者。直到江離簽了離婚協議離開，他才在灰燼下面找到那張救回他母親一命的匿名捐贈同意書——落款是江離。",
    genres: ["求而不得", "復仇歸來"],
  },
  {
    key: "wrong_identity",
    name: "錯位替身 + 即時拆穿",
    driver: "頂替身份的第一秒，就被最不該識破的人識破",
    seed: "頂替久未露面的孿生姐姐出席死對頭的晚宴，第一晚就被對方堵在角落：「你扮得比你姐姐好。不過你姐姐不會用左手拿酒杯。」",
    genres: ["雙胞胎替身局", "身份反轉"],
  },
  {
    key: "pretend_amnesia",
    name: "偽裝失憶 + 危險重逢",
    driver: "假裝不認得對方，但身體與細節出賣了一切",
    seed: "離婚三年後在急診室重逢，她假裝不認得，問「請問你是哪位」。他一邊幫她止血一邊冷笑：「不記得我，也該記得你手上這枚戒指刻了什麼字。」",
    genres: ["復仇歸來", "求而不得"],
  },
  {
    key: "social_humiliation",
    name: "社交撕裂 + 極限翻盤",
    driver: "在人最多的場合被公開羞辱，下一秒身份反轉，全場低頭",
    seed: "在百人謝師宴上，前男友用投影片公開她當年窮到要做三份兼職的照片。下一秒，全場最德高望重的那位教授走過來，當著所有人叫她一聲「老師」。",
    genres: ["潛入打臉", "退婚逆襲"],
  },
  {
    key: "debt_collateral",
    name: "抵押清算 + 惡劣籌碼",
    driver: "去追討／清算的時候，發現對方把自己也抵押進了那張單據",
    seed: "她被派去處理亡父留下的爛債，第一天就發現：仇家把自己名下所有東西，連同他自己，一次抵押給了她。「現在我是你的資產，你打算怎麼處置我？」",
    genres: ["強強交鋒", "契約婚姻"],
  },
  {
    key: "shared_fate",
    name: "同生共死 + 命運綁定",
    driver: "想動手殺對方的那一刻，才發現傷他等於傷自己",
    seed: "他接到指令去接近宿敵，動手那一刻才發現兩家人早已簽下一份同命契——對方受傷，自己會同步流血。他一刀下去，兩個人一起跪倒。",
    genres: ["雙向救贖", "身份反轉"],
  },
];

function pickHook(exclude: Set<HookKey>): HookEngine {
  const pool = HOOK_ENGINES.filter((h) => !exclude.has(h.key));
  const src = pool.length > 0 ? pool : HOOK_ENGINES;
  return src[Math.floor(Math.random() * src.length)];
}

// 2026-08-19 次輪實測補鑊：premise prompt 原本喺要求入面直接列「親人的手術」做第一個例子，
// 結果連續兩篇 premise 都揀咗「媽媽手術費」做籌碼——即係 slot 化嘅老問題喺新架構重現。
// 改做獨立抽籤 + 記入 gen_meta 做近期排除，逼籌碼真正輪流轉。
const STAKE_TYPES = [
  "一場輸了就要坐牢的官司",
  "一個一旦傳開就會毀掉整個人生的謠言",
  "一筆到期還不出、追債的人已經上門的錢",
  "一個一旦被揭穿就身敗名裂的身份秘密",
  "一份能證明自己清白的關鍵證詞",
  "一個孩子的撫養權",
  "一間承載全部回憶、明天就要被收走的老房子",
  "一個苦讀多年、明天放榜就會被取消的資格",
  "一份簽了就會失去住所的租約",
  "一個唯一肯替自己作證的人，正準備反口",
  "一份足以推翻當年冤案的舊紀錄",
  "一次錯過就再沒有第二次的救命名額",
  // 2026-08-19 Stephanie 澄清職場鬥爭 OK 之後加（商戰仍然禁）——籌碼停留喺「人對人」層面
  "一個被同事當眾搶走、再也拿不回來的功勞",
  "一份被人動過手腳、足以令自己即刻被解僱的紀錄",
];

// ---------- House Style（2026-08-19 大改：由「純文學向創作原則」整套換做「2026 短劇爽文法則」
// ——起因：舊版六條原則（一場一景／信任讀者／意象貫穿／克制留白）係純文學美學，實測連人手
// 精寫嘅樣本 Stephanie 都評「一樣悶」。市場數據：每分鐘要 3-4 個情緒爆點、讀者 3 秒決定去留、
// 打臉逆襲轉化率係純愛情向 2.3 倍、純愛情向內容 2026 年已現觀眾疲勞。
// ⚠️ 呢份 prompt 刻意用書面中文寫指令（唔再用粵語落指令）——舊版粵語指令令模型跟錯 register，
// 成日輸出粵語口語詞觸發 validate retry。詳細決策脈絡 → daily-novel CHANGELOG.md 2026-08-19）----------
const STYLE_2026_HEAD = `
【必須使用繁體字（Traditional Chinese），絕對不可以出現簡體字（Simplified Chinese），這條規定優先於任何其他規則】
${LANG_RULE}

【2026 高情緒密度爽文／短劇創作法則】
你不是純文學作家。你是 2026 年爆款短劇與熱門網文的主筆。你唯一的目標是：讓讀者在前三秒被鉤住，在過程中感受極致的情緒壓迫，最後獲得徹底的翻盤爽感。

1. 開場即爆點（前 100 字）
   第一句必須直接進入極端衝突、羞辱、絕境或命運抉擇的現場。嚴禁任何背景介紹、環境描寫、天氣描寫、人物履歷交代。讀者看第一行就要知道「有大件事正在發生」。

2. 高風險籌碼（Stakes）
   主角必須有一樣「輸了就完蛋」的具體東西壓在檯面上——親人的手術、一場官司、一個名聲、一筆還不起的債、一個身份秘密。抽象的「內心創傷」不算籌碼。讀者要清楚知道：如果主角輸，會即刻失去甚麼。

3. 情緒曲線：壓迫 → 反轉 → 打臉 → 宣洩（2026-10-04：主要反轉 2-3 個，寧少勿亂；不要為了多反轉而疊加巧合）
   完整曲線必須是：①主角被壓迫／被質疑／被羞辱到極點 → ②第一層反轉（對手以為贏定）→ ③關鍵籌碼亮出／真身份浮現 → ④徹底打臉，情緒完全宣洩。
   每個反轉之前必須埋一個一句話的伏筆，不可以憑空掉下來。

4. 對白要有鋒芒
   對白必須短、狠、帶張力，敵意與深情要形成反差。嚴禁無意義的日常閒聊（問天氣、修燈泡、遞水、澆花、餵鴿子這一類）。每一句對白都要推進衝突或翻轉關係。

5. 節奏：不准溫吞
   情節必須持續推進，禁止用大段內心獨白、回憶、景物描寫拖慢節奏。角色的心理狀態要用行動和對白表現，不要用一整段去解釋。

6. 鉤子句結尾
   short（短篇）：在打臉或情感爆發的最頂峰戛然而止，最後一句要是有傳播力的金句。
   serial（連載）：停在一個可續的下一步前一秒（即將做的選擇、即將說出的一句話、正在發生的動作）。禁止只留「權限／計畫還沒交代」這種沒有下一步的空懸。

7. 女主要夠飒（2026-08-19 加返）
   女主／主角必須「發瘋、反套路、夠飒」——用擺爛、將計就計、當場拆穿、發瘋輸出等手段自救，
   不可以靠傳統的隱忍、哭泣、等人來拯救。她可以哭，但哭完一定要自己出手翻盤，不是等男主救。

8. 情感要有共鳴底（作為金句規則的輔助條件）
   主角的核心情緒，盡量選普通人親身經歷過的心理狀態做底色——錯過、後悔、不敢說出口、犧牲、被忽略、被信任的人背叛。這不是要放慢節奏或加大段內心獨白，而是讓翻盤打臉那一刻的「爽」有真實情緒撐住，不是空有爽感的空殼。
`;

const STYLE_2026_TAIL = `
【揭露機制硬規】
秘密／身份／真相被發現的方式，不可以用「翻舊物、搜到證物、解鎖舊裝置、偷看日記」這一類（要解釋太多巧合，讀者一看就出戲）。
必須用以下其中一種：①即時撞破（當場撞見）②第三者當場講漏嘴 ③直接對峙攤牌 ④心聲／內心話不小心被聽見。

※ 標題由獨立程序生成，這裡不需要處理標題，專注寫正文。
`;

const SERIAL_STRUCTURE = `
【serial（連載，有互動結局功能）結構規定】
⚠️ 字數硬性下限 3600 字，目標 4000–6500 字。少於 3600 字一律不合格會被打回重寫，所以必須寫足。
如果覺得情節不夠長，就多加一層衝突或多寫一個爆點場面，不要草草收尾。
節奏要求：分 4 至 5 節，每節結尾都要留一個鉤子；全篇主要反轉 2 至 3 個，每個都要有伏筆。不可以連續兩大段沒有推進。
結尾必須停在一個可續的下一步：對方即將講出關鍵答案的前一秒、主角即將做出攸關命運的選擇、
秘密即將揭穿的前一刻、關鍵籌碼即將亮出的前一刻。下一步必須是具體的選擇、一句即將說出口的話，或一個正在發生的動作。
這個節點要令讀者能想到至少兩種截然不同的後續發展（例如：他會不會揭穿我？他會不會原諒我？），才適合後續互動結局分支。
單純斬在動作描寫中間、沒有分支想像空間的停法，不算合格。
禁止「權限／計畫／真相還沒交代」這種沒有下一步的空懸：懸念可以留，但讀者必須知道有人正要做一件具體的事。
不可以寫成大團圓結局。
`;

const SHORT_STRUCTURE = `
【short（短篇，沒有互動結局功能）結構規定】字數 3000–5000字，硬性下限 2600 字。
節奏要求：分 4 至 5 節，每節結尾都要留一個鉤子；全篇主要反轉 2 至 3 個，每個都要有伏筆。
結尾必須完整收尾：開頭拋出的核心問題要得到回答，衝突要有結果，情緒必須落地，絕對不可以留懸念或開放式結局。
容許苦結局（求而不得、遲來的真相），不一定要 happy ending，但情節本身一定要解決，不可以留手尾。
最後一句必須是可以獨立截圖傳播的金句。
`;

// ================================================================================
// 2026-10-04：「故事線」制度（Stephanie：想要唔同題材、唔同文風、令人想睇晒成篇）
// 起因：08-19 之後全站得一套爽文法則＋10 個同屬女頻復仇嘅 Hook，出嚟篇篇似。
// 而家分 4 條線輪流出（爽文逆襲＝主線，保留原 Hook 引擎；黑色幽默／溫情反轉／腦洞奇想係新線），
// 每條線有自己嘅文風指引、開局切入點池同張力標尺。懸疑推理／古風宮鬥 Stephanie 明確唔要。
// 所有線共用：COMMON_READ_THROUGH（核心問題＋分節鉤子＋反轉 2-3 個）同 SHARED_BANS（正向寫作＋原有禁區）。
// ================================================================================

const SECTION_MARK = "＊＊＊";

const COMMON_READ_THROUGH = `
【全線共用：讓讀者一口氣讀到最後】
0. 先讓人看得懂（最優先，高於懸念與文采）：第一節的頭 300 字內必須用平白的句子交代清楚——主角是誰、身處哪裡、想要什麼、眼前出了什麼事。第一次提到的對話或事件要直接寫出內容，禁止用「那句話」「那六個字」「那件事」這類讀者還不知道的指代吊胃口。如果有特殊規則（例如奇怪的 App、能力），必須在第一節用兩三句直白說清楚它能做什麼、代價是什麼；規則一經確立，全文不可以自相矛盾，也不可以用數字額度、次數換算之類容易算錯的設定。每條伏筆、每個神秘線索都必須在結尾前回收；人物做出反常行為（例如說狠話、疏遠對方），必須先在前文鋪墊動機。普通讀者一次讀完就能向朋友複述劇情，才算合格。
1. 核心問題：開頭 100 字內必須拋出一個具體、讀者急著想知道答案的問題（例如「她為甚麼要替仇人作證？」「明天的訊息是誰發的？」），這個問題貫穿全文。short 必須在最後一節才回答；serial 必須把答案推到揭曉前一秒。不可以中途提早揭曉。
2. 分節：全文分成 4 至 5 節，節與節之間單獨一行只寫「${SECTION_MARK}」（三個全形星號），不要寫節標題或編號。每一節的最後一句都必須是鉤子：一個新的疑點、一個未完成的動作、或一句令人不安的話。連載最後一節的鉤子必須是可續的下一步（選擇、即將說出的話、或正在發生的動作），不可以只留「權限／計畫未交代」。
3. 反轉：全篇主要反轉 2 至 3 個，寧少勿亂。每個反轉之前，前文必須已經埋下讀者看得見的伏筆。禁止靠連串巧合推進——讀者一旦不信，就不會讀到最後。
4. 段落短：1 至 3 句一段，關鍵句獨立成段，適合手機閱讀。
5. 結尾最後一句要短、有力、可以獨立截圖傳播。
6. 設定要簡單：全篇最多一條特殊規則，第一節講清楚；不要多層反轉套多層設定。
7. 結尾禁止說教或總結人生道理（例如「有時候……」「原來……」「好運非零和」「這件事讓我明白」）。最後一段必須用畫面或對白收尾，不准升華。說教式收尾會被判不合格。
`;

const SHARED_BANS = `
【必須使用繁體字（Traditional Chinese），絕對不可以出現簡體字（Simplified Chinese），這條規定優先於任何其他規則】
${LANG_RULE}

【正向寫作】
1. 場面看得見：每一場都要寫出具體的人、地點和正在發生的動作，讀者能在腦中看見畫面。
2. 情緒靠行為：用動作、對白和選擇表現情緒，不要用形容詞直接宣告心情。
3. 對白有利害：每一句對白都要有人想得到什麼、怕失去什麼，禁止無關的日常閒聊。
4. 一句一事：一句話只推進一件事，不要在同一句裡堆疊背景、心情和結局。
5. 細節可拍攝：細節必須是鏡頭拍得到的物件、動作或聲音，不要用抽象比喻代替。
6. 金句從情節長出來：有傳播力的句子必須從剛剛發生的事裡長出來，不要硬貼空泛金句。
7. 少 AI 腔：用詞乾淨、具體。禁止：夜幕降臨、不禁、彷彿整個世界、心跳漏了一拍、眼眶泛紅、五味雜陳。

【共用禁區】
- ${BUSINESS_WAR_PROMPT}
- ${BANNED_TOPIC_PROMPT}
- 嚴禁豪門、財閥、總裁、繼承人、家族聯姻設定。主角是普通人。
- 嚴禁鬼怪、靈異、恐怖、血腥元素。
- 嚴禁代孕、懷孕測試、墮胎、亂倫或親屬間戀愛暗示、未成年情節、性交易。如有感情線，雙方必須是對等成年人。
- 嚴禁把深情寫成長期監視、偷偷記錄對方一舉一動。
- 秘密被揭開的方式不可以用「翻舊物、搜到證物、解鎖舊裝置、偷看日記」，要用：當場撞破、第三者講漏嘴、直接對峙、心聲被聽見，或者由前文伏筆自然推出。
- 嚴禁 AI 陳套：夜幕降臨、不禁、彷彿整個世界、心跳漏了一拍、眼眶泛紅、五味雜陳。
- 嚴禁命案、兇手、綁架、追殺、警察查案（本站不寫懸疑推理）。可以有誤會、秘密、謊言，但不要有人被殺，也不可以有人失蹤。
- 嚴禁「買賣／刪除／移植／偷取別人記憶」類設定，也不要用「真假記憶」套娃詭計（讀者看不懂）。
- 嚴禁嘲笑外貌、體型、年齡、性別或職業的笑點。
- 嚴禁以寵物或親人的死亡、安樂死、絕症、喪事作為故事核心（太沉重，讀者不想看）。傷感可以有，但整體要讓人想看下去，不是讓人心情低落。
- 嚴禁大段對白交代過去（一個人連續講超過三句回憶）。過去要用物件、場景和短對白帶出。
- 情節必須在現實中說得通（例如簽名不能「重複使用」、物件不能憑空出現）；不合常理的細節寧可不寫。
`;

// 爽文法則不再自帶禁忌清單，改掛 SHARED_BANS（正向寫作在前、禁區在後）。
const STYLE_2026_SHUANGWEN = `${STYLE_2026_HEAD}
${SHARED_BANS}
${STYLE_2026_TAIL}`;

type LaneKey =
  | "shuangwen"
  | "dark_humor"
  | "warm_twist"
  | "high_concept"
  | "trend_hook"
  | "sweet_romcom"
  | "cozy_shop"
  | "reunion"
  | "kanbujian";

type Lane = {
  key: LaneKey;
  name: string;
  weight: number;
  types: StoryType[];
  genres: string[]; // 寫入 novel_stories.genre（要喺 genreCategories.ts 有對應大類）
  style: string; // 文風指引（爽文線用 STYLE_2026_SHUANGWEN）
  premiseGuide: string; // 開局要包含乜
  judgeHint: string; // 開局審查時本線特有嘅合格條件
  angles: string[]; // 切入點池（近期用過嘅會排除）
  seeds: string[]; // 張力標尺（唔准照抄）
};

const DARK_HUMOR_STYLE = `
【黑色幽默線文風】
- 第一人稱「我」，毒舌、自嘲先行：主角先損自己，再損世界。
- 冷幽默公式：荒謬事件 × 普通人日常的類比。大事反應淡定得離譜，小事卻耿耿於懷。
- 每 2 至 3 段要有一個笑點（反差、歪理、吐槽），但每個笑點同時要推進情節，不可以變成段子堆砌。
- 前提可以荒謬，但內在邏輯必須嚴謹：一個荒謬前提，所有後果都按它的規則認真推演。
- 主角要靠自己的歪主意、將計就計或當場拆穿來解決麻煩，不靠別人拯救。
- 結尾要有一個反轉，把前面的笑點變成一記重擊（笑著笑著發現很心酸，或者爽到拍桌）。
- 嚴禁過氣網絡梗、嚴禁說教。
- 嚴禁拿外貌、體型、年齡當笑點；笑點要來自處境和人的行為。
`;

const WARM_TWIST_STYLE = `
【溫情反轉線文風】
- 第三人稱貼身或第一人稱，語氣平實克制，帶一點生活幽默。
- 從第一段開始就要有一處「不對勁」的細節，讓讀者隱約不安、想知道為甚麼——這就是核心問題。
- 之後每一節都多出一個不對勁的細節，全部最後指向同一個真相；結尾一擊揭曉，讓讀者回頭發現伏筆一直都在。
- 情緒用動作與細節寫，禁止「他很感動」「她哭了很久」式概括。
- 淚點要落在被忽略的日常細節上（永遠剩下的最後一份菜、一直沒刪的語音訊息）。
- 節奏不准拖：沒有大段回憶、沒有大段景物或內心獨白。每一節都要往真相推近一步。
- 結局可以苦，但真相一定要落地，不可以開放式。
`;

const HIGH_CONCEPT_STYLE = `
【腦洞奇想線文風】
- 只用一個清晰的奇想設定，前 100 字內講清楚規則，之後所有情節都由這條規則推出來。
- 設定要有代價或限制；中段的危機要是規則本身反咬主角。
- 主角是現代都市的普通人，要用聰明的方法利用規則翻盤，不可以中途新增設定救場。
- 語氣輕快，節奏明快，對白短而有鋒芒。
- 奇想是「規則」不是「鬼」：嚴禁鬼怪、靈異、恐怖、血腥。規則只可以改變資訊、運氣、時間、社會規則這類東西，不准涉及記憶，嚴禁憑空生出人、分身、複製人、怪物，嚴禁半夜驚嚇場面。
- 結尾要有一個讀者沒想到、但回頭看完全符合規則的反轉。
`;

const TREND_HOOK_STYLE = `
【話題腦洞線文風】
- 抓一個人人有共鳴的現實話題（物價、薪水、運氣、職場、性別處境）＋一條一句話講得完的荒謬設定。
- 輕快、有笑點，可以用第一人稱或第三人稱；前 100 字內講清楚規則與主角的具體麻煩。
- 規則只可以改變金錢數字、運氣、社會規則或性別外觀，嚴禁涉及記憶、生死、鬼怪。
- 性別互換只寫生活與社會處境的反差（別人怎樣對待、日常不便、朋友反應），不准有任何性描寫；雙方均為成年人。
- 一個荒謬前提，所有後果按規則認真推演；中段規則要反咬主角一次；結尾要有讀者沒想到、但回頭看完全符合規則的反轉。
`;

const SWEET_ROMCOM_STYLE = `
【甜寵輕喜劇線文風】
- 輕快、甜、有笑點。兩位成年人因為一個「不得不互動」的原因綁在一起（假扮情侶、先婚後愛、鄰居、同事、被困）。
- 走向：誤會或嫌棄 → 被迫靠近 → 一個小危機 → 說開、甜蜜收尾。
- 每一節都要有一個「心動瞬間」：用動作和細節寫（遞過來的外套、記得對方不吃香菜），不要用內心獨白交代心動。
- 對白要有火花，互相拆台但藏著在意。
- 嚴禁虐戀、第三者撕逼、豪門總裁、誤會拖到結尾才解。結局要甜，要落地。
`;

const COZY_SHOP_STYLE = `
【治癒小店線文風】
- 第三人稱，語氣平實溫暖，多用食物、氣味、物件的細節。
- 一間小店（麵店、花店、舊書店、洗衣店、修鞋攤）＋一位常客或新客＋一個小心願或小秘密。
- 慢熱但每一節都要有一個小懸念（客人為什麼每週三都來？為什麼只點那一樣？），最後一節揭曉。
- 淚點與暖點落在被忽略的日常細節，嚴禁大道理、嚴禁絕症與死亡情節。不可出現過世、去世、離世、遺物、靈堂、喪禮，不可把師傅、店主或常客寫成已經去世。
- 結尾溫柔、有餘韻，真相要落地。
`;

const REUNION_STYLE = `
【重逢遺憾線文風】
- 人物都是成年人（二十五歲以上）；重逢場景要具體（同學會、機場轉機、喜宴、老房子拆遷前）。
- 兩人之間有一件當年沒有說開的事，這就是核心問題；前文用物件與細節埋伏筆，最後一節說開。
- 對白克制，不爭吵，不灑狗血；情緒靠停頓、動作和沒說出口的話。
- 結局苦中帶甜：說開了，但不一定在一起；要讓人心裡一暖又一酸。
- 回憶只輕輕帶過，不寫未成年人的戀愛情節。
`;

// 全文自檢同讀者評分共用。開局審查只睇道具有冇出場；callback 同收口喺成篇先驗。
export const KANBUJIAN_CLOSURE_CHECK =
  "一件具體實物道具必須在故事前半已經出現，並在最後一段被再次提起（callback）；結局必須收口，不可以是開放結局；不說教，不直述感情。";

const KANBUJIAN_STYLE = `
【看不見的好文風】
本線覆寫上面「不可用翻舊物揭秘」那一條，而且只限生活實物：心意要靠一件早已出場的日常物件被看懂。仍然禁止卷宗、警方紀錄、舊手機、解鎖舊裝置，也禁止用長篇日記把過去講完。

結構必須依序寫完，不可缺步：
1. 反差開頭：第一段就讓人物看起來冷淡、遲鈍、小氣或幫倒忙。
2. 緊接著寫出三個具體的日常細節。用動作、物件和短對白，不要概括，也不要無關閒聊。
3. 轉折落在長輩，或一段被重新理解的回憶。回憶只可短，不可整節倒敘。
4. 用一件實物道具揭示真正的好意。這件道具必須在前半已經被讀者看見或使用，不可以在結尾才第一次出現。
5. 結尾回到這件道具（callback）。最後一句只留一句短金句。金句必須從這件道具長出來，用畫面或對白，不可解釋道理。

- 不說教，不把道理講破。禁止「有時候」「原來」「這件事讓我明白」。
- 不直述感情。禁止「他很愛她」「她很感動」「其實他一直很關心」。感情只通過物件、動作和沒說出口的話。
- 本線硬性禁止：失蹤、車禍、警察、猝死、產權、商戰、開放結局、過世、去世、離世、遺物、靈堂、喪禮。長輩必須是在世的人，不可以寫成已故。
- 短篇必須收口：開頭的問題有答案，最後一段同時完成道具 callback 與一句短金句。
`;

// 六條具體切入點，同時係 13–14 字標題示範。發表標題仍要過 titleFormatFails 的 10–14 字、一逗到底。
export const KANBUJIAN_HOOKS = [
  "不識字的爸，衣櫃鎖著三十封信",
  "嫌他慢半拍，直到我爸進急診室",
  "記滿欠帳的老闆娘，從不准人還錢",
  "拿外婆帳本討債，欠錢的人卻哭了",
  "爸說順路載我，卻瞞了我整整八年",
  "五年沒壞的電扇，其實被修過十次",
] as const;

export const LANES: Lane[] = [
  {
    key: "shuangwen",
    name: "爽文逆襲",
    weight: 3,
    types: ["short", "serial"],
    genres: [], // 用 Hook 引擎自己嘅 genres
    style: "", // 用 STYLE_2026_SHUANGWEN
    premiseGuide: "",
    judgeHint: "",
    angles: [],
    seeds: [],
  },
  {
    key: "dark_humor",
    name: "黑色幽默",
    weight: 2,
    types: ["short", "serial"],
    genres: ["都市荒誕", "社畜求生", "黑色喜劇"],
    style: DARK_HUMOR_STYLE,
    premiseGuide:
      "一個荒謬但可信的處境＋主角必須在限期內解決的具體麻煩＋一個讓人想知道「這要怎麼收場」的核心問題。第一人稱，第一句就要好笑。",
    judgeHint: "第一句就有笑點或荒謬感，而且處境裡有真實的麻煩（不只是好笑）",
    angles: [
      "主角被迫為自己最討厭的人辦一件極其重要的事",
      "一個小謊言滾雪球，變成全公司／全家族都信以為真",
      "主角在一個極度正式的場合，必須隱藏一件荒謬的事",
      "在規則荒謬的小世界（大廈業主群組、家長群組、相親局）裡打一場硬仗",
      "主角被誤認成另一個身份，只能將錯就錯",
      "一份做不到就完蛋的任務，期限只有二十四小時",
      "主角的社死瞬間被全網直播",
      "主角要在同一場聚會上應付三個絕對不能碰面的人",
      "一件家電／一隻寵物／一份外賣引發一連串災難",
      "主角為了省一點錢做的決定，代價越滾越大",
      "主角被安排去培訓一個將會取代自己的新人",
      "主角在婚禮／畢業典禮上被迫臨時上台發言",
    ],
    seeds: [
      "公司裁員名單出來那天，我排第一。負責通知我的，是我自己——人事部只剩我一個人。",
      "相親第三次見面，對方打開一份簡報，標題是《關於你配不配得上我的可行性分析》。我瞄了一眼頁碼：共四十七頁。",
    ],
  },
  {
    key: "warm_twist",
    name: "溫情反轉",
    weight: 2,
    types: ["short"],
    genres: ["親情催淚", "溫情反轉", "暗戀成真"],
    style: WARM_TWIST_STYLE,
    premiseGuide:
      "一段普通人之間的關係＋一處第一眼就讓人覺得「不對勁」的日常細節＋一個藏在細節背後、讀者急著想知道的真相問題。",
    judgeHint: "開局裡有一個具體、讓人隱約不安的細節，讀者會想知道背後的真相",
    angles: [
      "父親與女兒",
      "母親與兒子",
      "祖母／祖父與孫輩",
      "相識多年、漸漸疏遠的老朋友",
      "暗戀多年卻從沒說出口的兩個人",
      "分手多年的前任",
      "兄弟姊妹之間的心結",
      "老師與多年前的學生",
      "住了十年卻沒說過幾句話的鄰居",
      "外賣員與天天叫同一份餐的常客",
      "一直互相嫌棄的上司與下屬",
      "收養的家人",
    ],
    seeds: [
      "爸爸在家族群組發了張照片，配字：「今天終於學會用美顏了。」照片裡是醫院的天花板。",
      "我媽最近迷上網購，每天都有包裹寄到我公司。收件人寫我的名字，裡面全是我小學時穿的那款襪子。",
    ],
  },
  {
    key: "high_concept",
    name: "腦洞奇想",
    weight: 2,
    types: ["short", "serial"],
    genres: ["腦洞奇想", "都市奇想"],
    style: HIGH_CONCEPT_STYLE,
    premiseGuide:
      "一條清晰的奇想規則（今次指定，見下）＋主角因為這條規則陷入的具體危機＋一個讓人想知道「規則背後是甚麼／他要怎樣破局」的核心問題。",
    judgeHint: "奇想規則一句講得清楚，而且已經即刻給主角帶來具體麻煩；沒有分身、複製人、怪物或驚嚇恐怖場面",
    angles: [
      "每天早上收到一條來自明天的訊息",
      "能聽見別人說謊時的心跳聲",
      "每週三，全城人的座位和住所會隨機對調一天，只有主角固定不動",
      "看得見每個人頭上顯示的「今天剩餘好運值」",
      "說出口的抱怨會在二十四小時內成真",
      "全城所有人突然有一天只能說真話",
      "每個人的影子會提前三秒做出他下一個動作",
      "全城的鬧鐘同時提早了一小時，只有主角的沒有",
      "收到一張萬能優惠券，任何店都收，但每個人一生只能用一次",
      "寵物突然能用手機打字傳訊息，但只肯說真話",
      "能看見每段關係剩下的倒數時間",
    ],
    seeds: [
      "每天早上七點，我會收到一條來自明天的訊息。今天那條只有四個字：別開門，快。",
      "我能聽見別人說謊時的心跳聲。求婚那晚，他單膝跪下說「我愛你」，我聽見他的心跳快得像在逃命。",
    ],
  },
  {
    key: "trend_hook",
    name: "話題腦洞",
    weight: 3,
    types: ["short", "serial"],
    genres: ["話題腦洞"],
    style: TREND_HOOK_STYLE,
    premiseGuide:
      "一個現實話題（物價、薪水、運氣、性別處境）＋一條一句話講完的荒謬規則＋主角因此遇上的具體麻煩＋一個讓人想知道「這要怎麼收場」的核心問題。",
    judgeHint: "規則一句講得清楚，主角已經有具體麻煩；一般人看完會想轉發給朋友說『這也太荒謬了』；不涉及記憶、生死、性描寫",
    angles: [
      "全城物價一夜之間降了一半，人人歡呼，但主角的薪水也同步降了一半，錢包一點沒變",
      "全城人的月薪突然顯示在頭像旁邊，主角成了全公司最尷尬的人",
      "主角被同事公認是錦鯉體質，所有人排隊來借運，但他自己覺得倒楣透頂",
      "公司門口的錦鯉池流傳『誰餵魚誰升職』，主角是唯一餵了反而被炒的人",
      "主角養的錦鯉游向哪邊，他當天的運氣就往哪邊走",
      "一覺醒來，主角和自己的死對頭互換了性別，而今天剛好是兩人要談合作的日子",
      "和相親對象一起醒來，發現彼此性別對調，但雙方都不敢告訴對方",
      "全城所有人一夜之間性別互換，只有主角沒變，因此成了全城唯一『不懂行情』的人",
      "超市收銀機按顧客今天有多開心來定價，越開心越貴",
      "收到一張全城通用的萬能優惠券，只能用一次，全城人都在算計怎麼用最划算",
      "全公司同時收到通知：從明天起，每句說出口的話都要附上理由",
      "所有店家的價錢一夜之間改成『看你像不像有錢人』，主角被誤認成富豪",
    ],
    seeds: [
      "全城物價一夜降了一半，新聞稱這是史上最大德政。只有我發現，我的薪水也自動降了一半，房租卻一分沒少。",
      "公司傳出我是錦鯉體質，三個同事排隊跟我握手借運。他們不知道，我今早剛被房東通知要加租三成。",
      "一覺醒來，我和隔壁那個處處跟我作對的同事互換了性別，而十點鐘，我們要一起上台簡報。",
    ],
  },
  {
    key: "sweet_romcom",
    name: "甜寵輕喜劇",
    weight: 2,
    types: ["short", "serial"],
    genres: ["甜寵輕喜劇"],
    style: SWEET_ROMCOM_STYLE,
    premiseGuide:
      "兩位成年人一開局就有一個『不得不互動』的原因＋第一句對白就有火花或笑點＋一個讓人想知道『他們最後會怎樣』的核心問題。",
    judgeHint: "兩個人一開局就有不得不互動的理由，第一個場面就有火花或笑點，沒有虐戀或第三者",
    angles: [
      "因為一次認錯人，被迫假扮情侶去見對方家長",
      "先登記後見面的閃婚，新婚第一晚才發現對方是自己的死對頭",
      "鄰居每晚都在牆那邊練習告白台詞，而主角是唯一的聽眾",
      "同事打賭誰先脫單，兩個輸家被迫互相幫忙",
      "網購退貨退錯，收到陌生人的一整箱生活用品，順藤摸瓜找到對方",
      "搬家公司搞錯地址，兩個陌生人被迫同住一個單位一星期",
      "暗戀的人突然問主角：能不能陪我演一場戲",
      "每次相親都遇到同一個人",
      "在朋友婚禮上被迫當伴娘和伴郎，彼此都是被安排的",
      "電梯故障，兩個互相嫌棄的人被困兩小時",
      "共享充電寶讓兩個陌生人一再碰面",
      "前公司的死對頭成了主角的新房東",
    ],
    seeds: [
      "相親才五分鐘，對方的前任衝進餐廳，指著我說：「原來你就是她口中那個比我好的人！」我根本不認識這個人。",
      "搬家公司把我的紙箱送去了別人家，而別人的沙發，被送進了我的客廳。更慘的是，那個人正拿著我的紙箱站在門口。",
    ],
  },
  {
    key: "cozy_shop",
    name: "治癒小店",
    weight: 2,
    types: ["short"],
    genres: ["治癒小店"],
    style: COZY_SHOP_STYLE,
    premiseGuide:
      "一間具體的小店＋一位行為有點特別的客人＋一個藏在店裡日常細節背後、讀者想知道答案的小疑問。不可寫過世、去世、離世、遺物、靈堂或喪禮。",
    judgeHint: "場景具體（有食物、氣味或物件），客人的行為有一個讓人好奇的小細節，沒有絕症或死亡情節，也沒有過世、去世、離世、遺物、靈堂、喪禮",
    angles: [
      "深夜麵店裡，常客每週三都只點一碗不加料的麵",
      "花店的客人每週買同一束花，卻每次送往不同的地址",
      "舊書店老闆收到一本寫滿批註的舊書，批註的口吻像在跟他說話",
      "修鞋攤上，同一個人第三次拿同一雙鞋來修",
      "麵包店關門前，總有一個人來買最後一個麵包",
      "租書店歸還的書裡夾著一張寫給下一位讀者的紙條",
      "自助洗衣店裡，有人每天都洗同一件很小的外套",
      "糖水舖的老闆記得每位客人的口味，唯獨一位客人從不重複點",
      "理髮店裡，一位老先生每月來剪一次已經不長的頭髮",
      "配鑰匙的老師傅，收到一把不屬於任何門的鑰匙",
      "照相館收到一卷二十年前沒人領的底片",
      "便利店深夜店員，每晚替同一位客人把熱食多加熱一分鐘",
    ],
    seeds: [
      "巷口麵店的老闆娘每天傍晚六點，會多煮一碗麵放在窗邊。從來沒有人來吃，但那碗麵每天都是空的。",
      "舊書店新來的夥計發現，店裡每一本書的第十七頁，都夾著同一張被摺得很小的火車票。",
    ],
  },
  {
    key: "reunion",
    name: "重逢遺憾",
    weight: 2,
    types: ["short"],
    genres: ["重逢遺憾"],
    style: REUNION_STYLE,
    premiseGuide:
      "兩位成年人在一個具體場景重逢＋一件當年沒有說開的事（用一個物件或一句話暗示）＋一個讓人想知道『當年到底發生了什麼』的核心問題。",
    judgeHint: "重逢場景具體，開局已暗示當年有一件沒說開的事，兩人都是成年人，不靠狗血爭吵",
    angles: [
      "同學會上，對方坐在主角對面，說他從沒收到過那年的那封信",
      "十年後在機場轉機時重遇前任，兩人的航班都延誤了",
      "前同事在新公司成了主角的客戶，雙方都假裝不認識",
      "喜宴上遇到當年沒說出口告白的人，對方是新郎的朋友",
      "老房子拆遷前回去收拾，遇到了當年的舊鄰居",
      "兩個曾經的好友斷交十年，在共同恩師的退休宴上重逢",
      "重逢時，對方假裝不認識主角",
      "同一班飛機、相鄰座位，兩個十年沒聯絡的人",
      "在異地城市的咖啡店，遇到當年不告而別的人",
      "舊情人托主角把一樣東西交還給另一個人",
      "兄弟因為一件舊事不說話十年，被迫一起整理父母的老家",
      "年少時的搭檔，在同一個比賽現場成了對手",
    ],
    seeds: [
      "同學會的名牌上寫著他的名字。我盯了很久，直到他把一個舊鐵盒放在桌上：「這個，當年你忘了帶走。」",
      "機場廣播說所有航班延誤。我回頭，看見十年沒見的她，手上提著跟我同一款的行李箱。",
    ],
  },
  {
    key: "kanbujian",
    name: "看不見的好",
    weight: 2, // 其他 short 線中位／多數權重係 2；會入每日 short 輪換。?lane=kanbujian 仍然可以手動指定。
    types: ["short"],
    genres: ["溫情反轉"],
    style: KANBUJIAN_STYLE,
    premiseGuide:
      "反差開頭（人物看起來冷淡、遲鈍或小氣）＋一件已經出場的具體實物＋一個讓人想知道這件東西最後代表什麼的問題。結局要收口，不可寫成開放結局。長輩必須在世，不可寫過世、去世、離世、遺物、靈堂或喪禮。",
    judgeHint:
      "道具要在開局早出現，並讓人看出它會在最後一段 callback；結局要收口，不可開放。開局不可出現失蹤、車禍、警察、猝死、產權或商戰，也不可出現過世、去世、離世、遺物、靈堂、喪禮。",
    angles: [
      "被人當成冷淡的長輩，每天重複一個沒有人明白的小動作",
      "店裡人人說老闆吝嗇，一個日常容器卻總在打烊前被補滿",
      "家裡最慢的那個人，在急事裡做對了別人忘掉的一件事",
      "孩子以為父母不識字就不關心學業，直到一幅畫把話補上",
      "多年不被道謝的鄰居，留下一樣對方天天用得上的東西",
      "被笑幫倒忙的人，記得所有人忽略的細節",
      "攤主被嫌小氣，磅秤底下壓著一疊替街坊記的帳",
      "母親從不說加油，卻把孩子的工牌天天擦乾淨",
      ...KANBUJIAN_HOOKS,
    ],
    seeds: [...KANBUJIAN_HOOKS],
  },
];

// 敘事形式：每篇兩稿，B 稿有一半機會試唔同形式，交俾 AI 讀者評分決定邊個好睇
const NARRATIVE_FORMS = [
  { key: "normal", instruction: "用一般敘事方式。" },
  {
    key: "chat_log",
    instruction:
      "全篇以手機訊息／群組對話為主體（格式如「媽媽：……」一行一則），穿插少量第一人稱敘述交代動作與場景，對話本身就要推進情節。",
  },
  {
    key: "flash_forward",
    instruction: "第一節先寫結局前最緊張的一幕（不揭曉答案），第二節起回到事情開始的時候，最後一節追上第一節並揭曉。",
  },
  { key: "second_person", instruction: "全篇用第二人稱「你」來寫，讓讀者代入主角。" },
  { key: "third_person", instruction: "全篇用第三人稱（他／她／人名）敘述，不要用「我」做敘述者。" },
  {
    key: "letters",
    instruction:
      "全篇以書信、留言或信件往來為主體，每封信有稱呼與落款，信與信之間用情節銜接，讓讀者逐步拼出真相；仍然要用單獨一行「＊＊＊」分節。",
  },
  {
    key: "diary",
    instruction:
      "全篇以日記體寫成，每則以日期（例如「三月四日　晴」）開頭，語氣私密真實，一則比一則逼近事件核心；仍然要用單獨一行「＊＊＊」分節。",
  },
  {
    key: "interview",
    instruction:
      "全篇以訪談或問答紀錄為主體（記者：／受訪者：），穿插少量場景描述，讓真相在問答中一層層揭開；仍然要用單獨一行「＊＊＊」分節。",
  },
];

function pickLane(storyType: StoryType, exclude: Set<LaneKey>): Lane {
  // 權重 0 唔入池；浮點貼近 1 時亦不可跌返一條權重 0 的尾線。
  return pickLaneByWeight(LANES, storyType, exclude);
}

function castGenders(laneKey: LaneKey): [Gender, Gender] {
  if (laneKey === "shuangwen") return ["F", "M"];
  return Math.random() < 0.5 ? ["F", "M"] : ["M", "F"];
}

// 每條線容許嘅敘事形式（黑色幽默固定第一人稱，所以唔用第二人稱；serial 要停喺揭曉前，所以唔用倒敘）
export const LANE_FORMS: Record<LaneKey, string[]> = {
  shuangwen: ["normal", "flash_forward", "chat_log"],
  dark_humor: ["normal", "chat_log", "flash_forward"],
  warm_twist: ["normal", "chat_log", "flash_forward", "second_person", "letters", "diary", "third_person"],
  high_concept: ["normal", "chat_log", "flash_forward", "second_person", "interview", "third_person"],
  trend_hook: ["normal", "chat_log", "diary", "interview", "third_person"],
  sweet_romcom: ["normal", "chat_log", "diary", "third_person"],
  cozy_shop: ["normal", "letters", "third_person"],
  reunion: ["normal", "letters", "flash_forward", "third_person"],
  kanbujian: ["normal", "letters", "diary", "third_person"],
};

// A 稿預設一般敘事；非「我」本位嘅線有 40% 機會改用第三人稱，打破「篇篇都係我」
export const THIRD_PERSON_LANES: LaneKey[] = ["warm_twist", "high_concept", "trend_hook", "sweet_romcom", "reunion", "kanbujian"];

function pickForm(lane: LaneKey, storyType: StoryType) {
  const keys = LANE_FORMS[lane].filter((k) => k !== "normal" && !(storyType === "serial" && k === "flash_forward"));
  const key = keys.length ? keys[Math.floor(Math.random() * keys.length)] : "normal";
  return NARRATIVE_FORMS.find((f) => f.key === key) ?? NARRATIVE_FORMS[0];
}

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

type StoryType = "serial" | "short";

// 2026-08-19：gen_meta 由「骨架+slot 組合」改記「Hook 引擎 + 實際生成嘅 premise」。
// ⚠️ 舊資料（skeleton 形態）讀返出嚟 m.hook 會係 undefined，下面全部用 filter(Boolean) 擋住，
// 唔會 crash，只係舊資料唔會參與排除計算——可以接受，因為舊故事本身就係要淘汰嗰批。
// 2026-10-04：加 lane（故事線）／angle（非爽文線切入點）／form（敘事形式）／judge（雙稿 AI 讀者評分）。
// 爽文線先有 hook／stake；舊資料冇 lane，當爽文處理。
// 2026-10-22：kanbujian 手動線額外寫 series（key／title／order）同 teaser。
type JudgeRecord = {
  form: string;
  pass: boolean;
  total: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  end: number | null;
  open: number | null;
  logic: number | null;
  issue: string;
  drop: string;
  picked: boolean;
};
type SeriesMeta = {
  key: string;
  title: string;
  order: number;
};
type GenMeta = {
  lane?: LaneKey;
  hook?: HookKey;
  stake?: string;
  angle?: string;
  premise: string;
  form?: string;
  judge?: JudgeRecord[];
  teaser?: string;
  series?: SeriesMeta;
};

// 排除近期用過嘅 Hook 引擎（10 個引擎，排除最近 5 個 → 保證兩星期內唔會撞同一個 hook）
function recentHooks(metas: GenMeta[], window = 5): Set<HookKey> {
  return new Set(metas.slice(0, window).map((m) => m?.hook).filter(Boolean) as HookKey[]);
}

// 排除近期用過嘅籌碼類型（12 個，排除最近 6 個）
// 非爽文線切入點：最近 24 篇，再加上同一條線最近 6 篇，避免隔 8–10 日再抽中同一 angle。

// 最近一個 run（2 篇）用過嘅故事線，今日盡量唔重複
function recentLanes(metas: GenMeta[], window = 2): Set<LaneKey> {
  return new Set(metas.slice(0, window).map((m) => m?.lane ?? "shuangwen"));
}

function recentStakes(metas: GenMeta[], window = 6): Set<string> {
  return new Set(metas.slice(0, window).map((m) => m?.stake).filter(Boolean) as string[]);
}

// 2026-08-19：validate 拆做content/title兩個函數，配合「先寫內容、後起標題」嘅兩次call設計
// ——起因：試過用同一次call「寫完內文先諗標題」，發現DeepSeek成日寫完內文就唔記得再輸出標題
// （finish_reason=stop但冇===TITLE===），改用獨立嘅generateTitle() call，保證標題一定睇住實際內文嚟諗。
function validateContent(content: string, storyType: StoryType, laneKey?: LaneKey, protagonist?: string): string[] {
  const fails: string[] = [];
  const minLen = storyType === "serial" ? 3600 : 2600;
  if (content.length < minLen) fails.push(`字數不足(${content.length}<${minLen})`);
  for (const ch of SIMPLIFIED_ONLY) {
    if (content.includes(ch)) fails.push(`簡體字:${ch}`);
  }
  for (const w of CANTONESE_SAFE) {
    if (content.includes(w)) fails.push(`粵語詞:${w}`);
  }
  for (const word of MAINLAND_ADMIN_WORDS) {
    if (content.includes(word)) fails.push(`大陸詞:${word}`);
  }
  for (const c of AI_CLICHES) {
    if (content.includes(c)) fails.push(`AI陳套詞:${c}`);
  }
  fails.push(...qualityFailNotes(content, storyType));
  for (const note of laneContentFails(content, laneKey, protagonist)) {
    if (!fails.includes(note)) fails.push(note);
  }
  return fails;
}

function assertWrittenLanguage(text: string): string {
  const leak = findLanguageLeak(text);
  if (leak) throw new Error(`LANG:${leak.note}`);
  return text;
}

function languageFail(err: unknown): FailHit | null {
  const msg = err instanceof Error ? err.message : "";
  if (!msg.startsWith("LANG:")) return null;
  const note = msg.slice("LANG:".length);
  return {
    failType: note.startsWith("簡體字") ? "SIMPLIFIED" : "CANTONESE",
    reason: `開局出現${note}，必須改成繁體書面語`,
  };
}

async function readPremise(task: () => Promise<string>): Promise<{ text: string; lang: FailHit | null }> {
  try {
    return { text: await task(), lang: null };
  } catch (err) {
    return { text: "", lang: languageFail(err) };
  }
}

function premiseQualityFail(text: string, laneKey: LaneKey): FailHit | null {
  const blocked = premiseBlockReason(text);
  if (blocked) return blocked;
  if (isDeathPlotBannedLane(laneKey)) {
    const death = findLaneDeathPlot(text);
    if (death) return { failType: "BANNED_TOPIC", reason: `開局出現死亡情節「${death}」，必須改成在世的人` };
  }
  const leak = findLanguageLeak(text);
  if (leak) return { failType: leak.failType, reason: `開局出現${leak.note}，必須改成繁體書面語` };
  return null;
}

// 2026-10-13：judge／重寫／返修共用嘅失敗類型。重寫唔再盲重寫成篇，按 failType 出針對性指示。
// 2026-10-16：BANNED_TOPIC／EMPTY_HOOK／PREACHY 同商戰詞表喺 storyQuality.ts。
type FailHit = { failType: FailType; reason: string };
type PremiseJudge = { pass: boolean; failType: FailType | null; reason: string };
const FAIL_TYPE_SET = new Set<string>(FAIL_TYPES);

function classifyValidateFail(note: string): FailType {
  const quality = classifyQualityNote(note);
  if (quality) return quality;
  if (note.startsWith("字數不足")) return "LENGTH";
  if (note.startsWith("分節")) return "SECTION";
  if (note.startsWith("簡體字")) return "SIMPLIFIED";
  if (note.startsWith("粵語") || note.startsWith("大陸詞")) return "CANTONESE";
  if (note.startsWith("AI陳套")) return "CLICHE";
  if (note.startsWith("第一人稱")) return "OTHER";
  if (note.startsWith("道具未回收")) return "LOGIC";
  if (note.includes("沒有完整收尾")) return "CLOSURE_SHORT";
  if (note.includes("沒有停在抉擇")) return "CLOSURE_SERIAL";
  if (note.startsWith("開頭") || note.includes("看不懂")) return "OPEN";
  if (note.startsWith("邏輯")) return "LOGIC";
  return "OTHER";
}

function groupFails(notes: string[]): FailHit[] {
  const map = new Map<FailType, string[]>();
  for (const note of notes.map((n) => n.trim()).filter(Boolean)) {
    const t = classifyValidateFail(note);
    const arr = map.get(t) ?? [];
    arr.push(note);
    map.set(t, arr);
  }
  return [...map.entries()].map(([failType, reasons]) => ({ failType, reason: reasons.join("、") }));
}

function failInstruction(failType: FailType, storyType: StoryType, reason: string): string {
  const minLen = storyType === "serial" ? 3600 : 2600;
  switch (failType) {
    case "LENGTH":
      return `只擴寫至不少於 ${minLen} 字。保留原有情節、人物與分節，用場面和對白補足長度，不要另起一個故事。`;
    case "SECTION":
      return `只修正＊＊＊分節：全文分成 4 至 5 節，節與節之間單獨一行只寫「${SECTION_MARK}」，不要改情節。`;
    case "SIMPLIFIED":
    case "CANTONESE":
      return "只改用詞，情節不動。簡體字改成繁體字，粵語口語改成書面語，大陸行政用語改成通用書面語（公司、聘僱合約、租約、調解會、社區、解僱、列印、軟體），其餘句子保持原樣。";
    case "CLICHE":
      return "只改陳套句。換掉或刪掉 AI 陳套（夜幕降臨、不禁、彷彿整個世界、心跳漏了一拍、眼眶泛紅、五味雜陳），情節與結構不動。";
    case "BUSINESS_WAR":
      return QUALITY_REPAIR.BUSINESS_WAR;
    case "BANNED_TOPIC":
      return QUALITY_REPAIR.BANNED_TOPIC;
    case "CLOSURE_SHORT":
      return "只重寫尾節。短篇必須完整收尾：衝突有結果、疑問有答案、情緒落地。餘韻式收尾可以，不可留下未回答的核心懸念，也不可以改成說教。前面各節不要改。";
    case "CLOSURE_SERIAL":
      return "只重寫尾節。連載必須停在可續的下一步（具體抉擇、即將說出的話、或正在發生的動作），讓讀者能想到至少兩種不同後續。禁止「權限／計畫未交代」式空懸，也不要一次解決整個衝突。前面各節不要改。";
    case "EMPTY_HOOK":
      return QUALITY_REPAIR.EMPTY_HOOK;
    case "PREACHY":
      return QUALITY_REPAIR.PREACHY;
    case "OPEN":
      return "只改第一節前約 300 字。用平白句子交代主角是誰、在哪裡、想要什麼、眼前發生什麼事；禁止未說明的指代。後面各節不要改。";
    case "LOGIC":
      if (reason.includes("道具未回收")) {
        return "補上實物道具：道具必須在前半已經出現，最後一段 callback；結局收口。不說教，不直述感情，不要改成開放結局。只改道具出場那一筆和最後一段，不要另起一個故事。";
      }
      return "只修邏輯與伏筆回收：去掉前後矛盾，補上動機，讓線索在結尾前回收，情節要說得通。不要重寫整篇。";
    case "PREMISE_TENSION":
    case "PREMISE_LANE":
      return `按原因重抽 premise，不要沿用不合格的開局。原因：${reason || "開局條件不足"}。`;
    default:
      if (reason.includes("第一人稱")) {
        return "改回第一人稱「我」。第一個主角名字就是「我」的本名，不可另取新名，也不可改成第三人稱。只調整人稱與名字，不要另起一個故事。";
      }
      return `最小必要修改。只處理：${reason || "不合格"}。不要改動無關段落。`;
  }
}

function repairBrief(hits: FailHit[], storyType: StoryType): string {
  const list = hits.length > 0 ? hits : [{ failType: "OTHER" as const, reason: "不合格" }];
  return (
    `失敗類型：${list.map((h) => h.failType).join("、")}\n` +
    `原因：${list.map((h) => `${h.failType}：${h.reason}`).join("；")}\n` +
    `針對性指示：\n${list.map((h) => `${h.failType}：${failInstruction(h.failType, storyType, h.reason)}`).join("\n")}`
  );
}

function priorPremiseBlock(prior: FailHit | null | undefined): string {
  if (!prior) return "";
  return `\n\n【上一版開局不合格，必須重抽 premise，不要微調舊稿】\n${repairBrief([prior], "short")}\n`;
}

function parsePremiseJudge(raw: string, fallbackFail: FailType): PremiseJudge {
  try {
    const text = raw.replace(/```(?:json)?/gi, "").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { pass: true, failType: null, reason: "" };
    const parsed = JSON.parse(m[0]) as { pass?: boolean | string; failType?: string | null; reason?: unknown };
    const failed = parsed.pass === false || parsed.pass === "false";
    if (!failed) return { pass: true, failType: null, reason: "" };
    const ft =
      typeof parsed.failType === "string" && FAIL_TYPE_SET.has(parsed.failType)
        ? (parsed.failType as FailType)
        : fallbackFail;
    const reason = String(parsed.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    return { pass: false, failType: ft, reason };
  } catch {
    return { pass: true, failType: null, reason: "" };
  }
}

// 2026-10-04：首頁 6 張卡 6 個標題都係「XX那刻/那夜，YY」——源頭係 generateTitle() 嘅例子
// 本身就係呢個句式。例子已換走，再加 code 層「句式指紋」：同一句式唔准連續出現，
// 「時間點」句式（那刻/那夜/當晚…）因為已經用濫，近 6 篇內最多一次。
type TitleShape = "time_moment" | "question" | "two_clause" | "single_phrase";
const TIME_MOMENT_RE = /(那刻|那一刻|那夜|那一夜|那晚|那天|那日|那年|當晚|當天|當夜|當日|之夜|之後|瞬間|之時|時候)[，,]/;
const SHAPE_LABEL: Record<TitleShape, string> = {
  time_moment: "「某時刻，某結果」時間點句式（例如帶那刻／那夜／當晚）",
  question: "問句",
  two_clause: "逗號分兩截的句式",
  single_phrase: "一句到底、沒有逗號的句式",
};
function titleShape(title: string): TitleShape {
  if (TIME_MOMENT_RE.test(title)) return "time_moment";
  if (/[？?]$/.test(title)) return "question";
  if (/[，,]/.test(title)) return "two_clause";
  return "single_phrase";
}
function shapeFails(title: string, recentTitles: string[], laneKey?: string | null): string[] {
  const shape = titleShape(title);
  const recentShapes = recentTitles.filter(Boolean).map(titleShape);
  if (shape === "time_moment" && recentShapes.slice(0, 6).includes("time_moment")) {
    return [`句式重複：近期已用過${SHAPE_LABEL.time_moment}，今次不可以再用`];
  }
  // 暖線標題必須用逗號或轉折，不能再因為「連續兩截句」被打回頭。
  if (isHookTitleLane(laneKey) && shape === "two_clause") return [];
  if (recentShapes.length >= 2 && recentShapes[0] === shape && recentShapes[1] === shape) {
    return [`句式重複：最近兩篇都是${SHAPE_LABEL[shape]}，今次必須換另一種句式`];
  }
  return [];
}

function validateTitle(title: string, recentTitles: string[], laneKey?: string | null): string[] {
  const fails: string[] = [];
  fails.push(...shapeFails(title, recentTitles, laneKey));
  fails.push(...titleFormatFails(title, laneKey));
  if (!title) fails.push("標題為空");
  if (title.startsWith("我") && recentTitles.slice(0, 4).some((t) => t.startsWith("我"))) fails.push("近期已有「我」開頭的標題，今次不可以再用");
  if (TITLE_FORMULAIC.test(title)) fails.push("標題formulaic pattern");
  const leak = findLanguageLeak(title);
  if (leak) fails.push(leak.note);
  const repeatedOpening = repeatedTitleOpening(title, recentTitles);
  if (repeatedOpening) fails.push(`開頭句式重複：近期已用過「${repeatedOpening}」，今次不可以再用`);
  for (const rt of recentTitles) {
    if (rt && (title.includes(rt) || rt.includes(title))) fails.push("標題撞近期");
  }
  const topic = findBannedTopic(title);
  if (topic) fails.push(`禁題:${topic}`);
  const biz = findBusinessWar(title);
  if (biz) fails.push(`商戰詞:${biz}`);
  return fails;
}

export function buildTitleSystem(laneKey?: string | null): string {
  const hookLane = isHookTitleLane(laneKey);
  const lengthRule = hookLane
    ? `3. 字數必須是 10–14 字（標點不算）。嚴禁 2–6 字的平淡散文題或單純名詞，也不要寫成超過 15 字的長句。必須一逗到底：前半句是反差設定或嫌棄，後半句是一個反常動作或懸念。不可劇透尾段真相。`
    : `3. 字數控制在 8-16 字。`;
  const kanbujianExamples =
    laneKey === "kanbujian"
      ? `\n【看不見的好：標準示範（13–14 字，一逗到底。只學力度。其他故事不可照抄這些人物、物件和情節。發表標題必須是 10–14 字，不可超過 15 字，也不可寫完尾段真相）】\n${KANBUJIAN_HOOKS.map((hook) => `- ${hook}`).join("\n")}\n`
      : "";
  return (
    `${LANG_RULE}\n\n` +
    `你是 2026 年爆款短劇與網文的標題大師。請只根據故事第 1–2 節已經寫出的內容，想一個點擊率極高的標題。\n\n` +
    `【標題要點】\n` +
    `1. 要讓人一看就想知道「到底發生甚麼事」：用強烈衝突、反差或懸念，但「懸念」不等於「劇透」。\n` +
    `2. 標題提到的畫面或情節，必須是第 1–2 節正在發生、被寫出來的場面，不可以編造內文沒有的場面。\n` +
    `${lengthRule}\n` +
    `4. 不可以誇大：標題的嚴重程度要和故事實際一致（小事不要寫成「騙局」「陰謀」）。\n` +
    `5. 不要用行話或專有名詞（例如「感應器」「協議書第三條」），要用一般人一看就懂的詞。\n` +
    (hookLane
      ? `6. 一次輸出 5 個候選，每行一個，不要編號、不要解釋；你認為最想點的排第一。五個都必須一逗到底，只換字眼，不要改成問句或一句到底。\n\n`
      : `6. 一次輸出 5 個不同句式的候選標題，每行一個，不要編號、不要解釋；你認為最想點的排第一。\n\n`) +
    `【硬性規則】\n` +
    `標題只可取材自第 1–2 節已出現的設定與動作，嚴禁劇透第 3 節或之後才揭曉的秘密或反轉，嚴禁捏造內文沒有的身份或事件；且不得與近期標題開頭句式重複（如「誰准你／妳」）。\n` +
    (hookLane
      ? `本線標題必須一逗到底。前半句先寫反差或嫌棄，後半句只放一件說不過去的動作或物件；尾段真相留到後面，標題本身不可以講完。\n`
      : "") +
    `\n` +
    `【句式參考（只學句法，不要帶入任何具體身份、職業、罪名或情節；每次換一種）】\n` +
    `- 用第 1–2 節已經說出口的一句短對白做標題。不要自造對白。\n` +
    `- 用反問句製造壓力。疑問必須來自第 1–2 節已經發生的動作，不要用「誰准你」或「誰准妳」開頭。\n` +
    `- 用身份或處境的反差直述。只可使用正文已經寫明的身份，不可自造職位或頭銜。\n` +
    `- 用正文第 1–2 節已經出現的數字製造懸念。數字必須在這兩節裡出現過。\n` +
    `- 用一個已經發生的動作，接一個已經發生的後果。動作和後果都必須在第 1–2 節出現過。\n` +
    `- 不要用「某時刻（那刻／那夜／那天／當晚／之後），某結果」這種時間點開頭的句式。\n` +
    kanbujianExamples +
    `\n【禁止】\n` +
    `- 嚴禁只有 2–6 字的平淡散文題或單純名詞（例如「慢半拍」「他不識字」「外婆的記帳本」「舊電扇」）。\n` +
    `- 禁止「XX的YY」「XX之YY」這類老土句式。\n` +
    `- 必須用繁體字，不可以有簡體字或粵語口語詞（例如「嘅」「唔」「佢」「咗」「冇」）。\n` +
    `- 禁止出現會被誤讀成粗話的字組合（例如「她媽的」「他媽的」）。要提到母親一律寫「母親」或「媽媽留下的」，不要用「她媽的X」這種寫法。\n\n` +
    `只輸出 5 行標題，不要加引號、編號、解釋或其他文字。`
  );
}

// 獨立標題生成：畀返實際已經寫低嘅內文AI，逼佢一定要根據真實內容諗標題，
// 唔會再出現「標題講咗個內文冇嘅戲劇化場面」嘅走數情況。
async function generateTitle(
  content: string,
  recentTitles: string[],
  deadline = Infinity,
  laneKey?: string | null
): Promise<string> {
  const systemMsg = buildTitleSystem(laneKey);
  const opening = openingSections(content, 2);
  const recentPrefixes = recentTitles
    .map((title) => title.trim().slice(0, 4))
    .filter((prefix) => prefix.length >= 2)
    .slice(0, 8);
  let userMsg =
    `以下只提供故事第 1–2 節。標題只能使用這裡已經出現的設定與動作，不可以猜後面的秘密，也不可以編造這裡沒有的身份或事件：\n\n${opening}\n\n` +
    `近期已用標題（不可以與這些重複或高度相似，句式也要不同）：${recentTitles.slice(0, 12).join("、") || "無"}\n` +
    `近期標題開頭（不得重複，尤其不得再用「誰准你」「誰准妳」）：${recentPrefixes.join("、") || "無"}`;
  let lastTitle = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0 && Date.now() > deadline) break; // 時間唔夠就用住上一個
    const raw = await deepseekChat(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      { model: "deepseek-chat", temperature: 0.95, maxTokens: 300, timeoutMs: 40_000 }
    );
    const cands = raw
      .split("\n")
      .map((l) => l.replace(/^\s*(\d+[.、)）]\s*)?/, "").trim().replace(/^["「『]+|["」』]+$/g, ""))
      .filter((l) => {
        const count = titleGlyphCount(l);
        return count >= 2 && count <= 40;
      })
      .slice(0, 6);
    if (!lastTitle && cands[0]) lastTitle = cands[0];
    let firstFails: string[] = [];
    for (const c of cands) {
      const fails = validateTitle(c, recentTitles, laneKey);
      if (fails.length === 0) return c;
      if (c === cands[0]) firstFails = fails;
    }
    userMsg = `${userMsg}\n\n⚠️上一批候選（${cands.join("／")}）都不合格，第一個的原因：${firstFails.join("；") || "未知"}。請重新想 5 個。`;
  }
  const leak = lastTitle ? findLanguageLeak(lastTitle) : null;
  const repeatedOpening = lastTitle ? repeatedTitleOpening(lastTitle, recentTitles) : null;
  const formatFails = titleFormatFails(lastTitle, laneKey);
  if (leak || repeatedOpening || findBannedTopic(lastTitle) || findBusinessWar(lastTitle) || formatFails.length > 0) {
    throw new Error(`標題仍不合格，不發佈：${lastTitle}`);
  }
  return lastTitle;
}

// 一句話簡介（顯示喺首頁卡片同故事頁頂）：製造好奇，唔劇透
async function generateTeaser(content: string, title: string): Promise<string> {
  try {
    const raw = await deepseekChat(
      [
        {
          role: "system",
          content:
            `${LANG_RULE}\n你是小說平台的編輯，為故事寫一句話簡介。要求：繁體中文書面語，25 至 45 字；只寫開局和懸念，讓人好奇想看下去；絕對不可以劇透結局或反轉；不要重複標題；不要用省略號；不可以有簡體字、粵語口語或大陸行政用語；只輸出簡介本身。`,
        },
        { role: "user", content: `標題：${title}\n\n故事全文：\n${content}` },
      ],
      { model: "deepseek-chat", temperature: 0.7, maxTokens: 150, timeoutMs: 30_000 }
    );
    const t = raw.trim().replace(/^["「『]+|["」』]+$/g, "").replace(/\n+/g, "");
    if (t.length < 12 || t.length > 80) return "";
    if (findLanguageLeak(t)) return "";
    if (findBannedTopic(t) || findBusinessWar(t) || findPreachyEnding(t)) return "";
    return t;
  } catch {
    return "";
  }
}

// 輕量 DeepSeek 自我檢查：closure(short)/cliffhanger(serial) 呢啲要閱讀理解嘅檢查，code 做唔到
async function selfCheckClosure(content: string, storyType: StoryType, laneKey?: LaneKey): Promise<boolean> {
  const question =
    storyType === "short"
      ? "以下短篇故事的結局是否完整收尾（衝突有結果、疑問有答案、情緒已經落地；餘韻式或安靜的收尾也算合格，只要沒有留下未回答的核心懸念）？若結尾在說教或總結人生道理（例如「有時候」「原來」「好運非零和」），回答不合格。"
      : "以下連載故事的結尾是否停在一個可續寫的節點：讀者能想到至少兩種不同的下一步，而且下一步是具體的選擇、即將說出的話，或正在發生的動作？已經完整解決整個衝突，回答不合格。只留下「權限／計畫／真相還沒交代」這類沒有下一步的空懸，也回答不合格。";
  const extra =
    laneKey === "kanbujian"
      ? `\n另外必須同時滿足，缺一不可：${KANBUJIAN_CLOSURE_CHECK}任何一項不滿足都回答不合格。`
      : "";
  const excerpt = laneKey === "kanbujian" ? content : content.slice(-600);
  const label = laneKey === "kanbujian" ? "故事全文" : "故事結尾部分";
  const raw = await deepseekChat(
    [
      { role: "system", content: "你是嚴格的編輯，只回答「合格」或「不合格」，不要加任何其他文字。" },
      { role: "user", content: `${question}${extra}\n\n${label}：\n${excerpt}` },
    ],
    { model: "deepseek-chat", temperature: 0, maxTokens: 10, timeoutMs: 30_000 }
  );
  return raw.includes("合格") && !raw.includes("不合格");
}

// ================================================================================
// Premise-First 第一階段：先生成一個 100 字內嘅極端衝突 premise，過咗張力審查先寫全文。
// 呢個係今次大改嘅核心——舊系統直接由「骨架+slot」拼砌就寫全文，拼出嚟只係「設定」，
// 冇「一句話講到你想睇落去」嘅衝突。分開兩階段之後，可以喺好平嘅成本下重試 premise，
// 唔使成篇 3000 字寫完先發現個故事本身唔吸引。
// ================================================================================
export function buildShuangwenPremiseSystem(hook: { name: string; driver: string; seed: string }, stake: string): string {
  return (
    `${LANG_RULE}\n\n` +
    `你是 2026 年爆款短劇的首席編劇。你的工作是想出一句話就能讓人想追下去的極端衝突開局。\n\n` +
    `【要求】\n` +
    `- 100 字以內，繁體中文，寫成一段連貫的敘述（不要分點、不要標題、不要解釋）。\n` +
    `- 必須包含：①主角當下面對的極端困境或羞辱 ②今次指定的籌碼（見下）③一個立刻讓人意外的轉折或懸念。\n` +
    `- 必須是「正在發生」的場面，不是背景設定。\n` +
    // 2026-08-19 次輪實測補鑊：模型將男主寫成女主親生父親（「妳是我三年前弄丟的女兒」），
    // 完全破壞言情關係。要明文鎖死男女主必須係可以發展感情嘅對等成年人。
    `- 男主女主必須是可以發展感情關係的對等成年人。嚴禁把兩人寫成父女、母子、兄妹、姊弟或任何血緣親屬關係。\n` +
    // 2026-08-19 Stephanie 澄清：職場鬥爭 OK，商戰唔要。原本兩樣綁埋一齊禁，而家拆開。
    `- ${BUSINESS_WAR_PROMPT}但職場上的個人衝突（被上司針對、被同事搶功、被誣陷、被逼頂罪）可以寫，而且鼓勵。\n` +
    `- ${BANNED_TOPIC_PROMPT}\n` +
    `- 嚴禁鬼怪靈異恐怖。籌碼要用個人向的東西。\n` +
    `- 嚴禁寫成平靜的日常相處、合租同居、兩個人慢慢互相理解。\n` +
    // 2026-08-19 首輪實測補鑊：新 prompt 一放開「極端衝突」，模型即刻衝去獵奇題材
    // （代孕合約、驗孕棒、收養證明揭發兄妹關係）同埋返晒去豪門總裁設定——前者品味出事，
    // 後者係 08-03 Stephanie 反饋「太商業」之後剔走嘅方向（註：佢原話只係「太商業」，
    // 「唔要豪門財閥」係當時 implement 嘅方式，唔係佢落嘅硬規；08-19 已同佢澄清清楚）。
    `- 嚴禁豪門、財閥、總裁、繼承人、家族聯姻這類設定。主角必須是普通人，籌碼必須是普通人有共鳴的東西。\n` +
    `- 嚴禁用獵奇題材製造衝擊：不可以出現代孕、懷孕測試、墮胎、亂倫或兄妹戀暗示、未成年情節、性交易。\n` +
    `  衝突必須來自「處境的壓迫」同「主角要做的選擇」，不是來自禁忌題材本身。\n\n` +
    `【今次要用的 Hook 引擎】\n` +
    `類型：${hook.name}\n核心驅動力：${hook.driver}\n\n` +
    `【今次指定的籌碼（必須用這個，不可以換成別的，尤其不可以又寫成親人做手術籌醫藥費）】\n${stake}\n\n` +
    `【張力標尺（示範這個強度，但嚴禁抄襲它的情節、職業、場景或對白）】\n${hook.seed}\n\n` +
    `你必須寫一個跟示範完全不同的故事——不同的處境、不同的關係、不同的籌碼、不同的轉折。`
  );
}

async function generatePremise(
  hook: HookEngine,
  stake: string,
  heroineName: string,
  heroName: string,
  recentPremises: string[],
  priorFail?: FailHit | null
): Promise<string> {
  const systemMsg = buildShuangwenPremiseSystem(hook, stake);

  const userMsg =
    `女主姓名：${heroineName}，男主姓名：${heroName}。\n` +
    (recentPremises.length
      ? `\n【近期已經用過的開局，必須完全避開，不可以寫類似的情境】\n${recentPremises.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`
      : "") +
    priorPremiseBlock(priorFail) +
    `\n只輸出 premise 本身，不要加任何前綴、引號或說明。`;

  const raw = await deepseekChat(
    [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
    { model: "deepseek-chat", temperature: 1.1, maxTokens: 300, timeoutMs: 45_000 }
  );
  return assertWrittenLanguage(raw.trim().replace(/^["「『]+|["」』]+$/g, ""));
}

// Premise 張力閘門：maxTokens 80，輸出 pass／failType／reason。攔住悶開局，唔使浪費成篇長文先發現唔掂。
// fail-safe：judge 本身出錯或 JSON 解唔到就當 pass，唔可以因為個 judge 掛咗就成日冇故事生成。
async function judgePremiseTension(premise: string): Promise<PremiseJudge> {
  const prompt =
    `以下是一個短劇故事的開局設定。請嚴格評估它是否達到 2026 年爆款短劇的標準。\n\n` +
    `合格條件（必須全部滿足）：\n` +
    `1. 有立即的、正在發生的高壓衝突（不是背景交代）\n` +
    `2. 有明確而具體的籌碼（輸了會即刻失去某樣東西）\n` +
    `3. 有讓人想知道「然後呢」的懸念或意外轉折\n` +
    `4. 沒有失蹤、車禍、警察、殯儀館、猝死，也沒有產權、法院拍賣、授權書、標金這類商戰\n\n` +
    `開局：「${premise}」\n\n` +
    `只輸出 JSON，不要其他文字。合格：{"pass":true,"failType":null,"reason":""}。不合格：{"pass":false,"failType":"PREMISE_TENSION","reason":"40字內說明哪一條不合格"}。\n` +
    `failType 只可以是：${FAIL_TYPES.join("、")}。本關不合格時 failType 必須是 PREMISE_TENSION。`;
  try {
    const raw = await deepseekChat([{ role: "user", content: prompt }], {
      model: "deepseek-chat",
      temperature: 0,
      maxTokens: 80,
      timeoutMs: 20_000,
    });
    return parsePremiseJudge(raw, "PREMISE_TENSION");
  } catch {
    return { pass: true, failType: null, reason: "" }; // fail-safe
  }
}

// 非爽文線嘅開局生成（爽文線沿用上面 generatePremise）
export function buildLanePremiseSystem(lane: Lane, angle: string): string {
  const extra = lanePremiseExtraRules(lane.key);
  return (
    `你是熱門網絡小說的策劃編輯，專門想出讓人一看就停不下來的開局。\n\n` +
    `【本篇故事線】${lane.name}\n` +
    `【開局必須包含】${lane.premiseGuide}\n` +
    `【今次指定的切入點（必須用）】${angle}\n\n` +
    `【要求】\n` +
    `- 100 字以內，繁體中文，寫成一段連貫敘述（不要分點、不要標題、不要解釋）。\n` +
    `- 必須是「正在發生」的場面，不是背景設定。\n` +
    `- 讀完要讓人立刻冒出一個具體問題，而且很想知道答案。\n` +
    `- 必須一次看懂：交代清楚誰、在做什麼、發生什麼事；不可以用「那句話」「那件事」這類沒說明的指代；奇想規則要簡單到一句話講完，禁止數字額度、次數換算之類的機制。\n` +
    (lane.key === "kanbujian"
      ? `- 開局必須已經看見一件具體實物。全文會走：反差開頭、三個具體日常細節、長輩或回憶轉折、實物道具揭示、結尾道具 callback 加一句短金句。不說教，不直述感情。禁止失蹤、車禍、警察、猝死、產權、商戰、開放結局、過世、去世、離世、遺物。長輩必須在世。\n`
      : "") +
    (extra ? `${extra}\n` : "") +
    `${SHARED_BANS}\n` +
    (lane.key === "kanbujian"
      ? `【鉤子示範（示範一逗到底的標題力度：前半句反差或嫌棄，後半句反常動作。切入點必須照寫，開局仍要寫成正在發生的場面，不可只輸出標題。若某一則示範同今次指定切入點是同一件事，就寫那一件，不得把該示範當成禁題。其餘示範的情節、職業、場景或對白不可照抄）】\n${lane.seeds.join("\n")}`
      : `【張力標尺（示範這個吸引力水平，但嚴禁抄襲它的情節、職業、場景或對白）】\n${lane.seeds.join("\n")}`)
  );
}

async function generateLanePremise(
  lane: Lane,
  angle: string,
  names: string,
  recentPremises: string[],
  priorFail?: FailHit | null
): Promise<string> {
  const systemMsg = buildLanePremiseSystem(lane, angle);
  const userMsg =
    `主要人物姓名：${names}（必須使用這些姓名，不要改姓，也不要改名；可以只用其中一個）。\n` +
    (recentPremises.length
      ? `\n【近期已經用過的開局，必須完全避開】\n${recentPremises.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`
      : "") +
    priorPremiseBlock(priorFail) +
    `\n只輸出開局本身，不要加任何前綴、引號或說明。`;
  const raw = await deepseekChat(
    [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
    { model: "deepseek-chat", temperature: 1.1, maxTokens: 300, timeoutMs: 45_000 }
  );
  return assertWrittenLanguage(raw.trim().replace(/^["「『]+|["」』]+$/g, ""));
}

async function judgeLanePremise(premise: string, lane: Lane): Promise<PremiseJudge> {
  const hint =
    lane.key === "kanbujian"
      ? `${lane.judgeHint}這是開局審查：只確認道具已經出場、禁題沒有出現。最後一段 callback 與收口由全文自檢，不要因為開局還沒寫到結局而判不合格。`
      : lane.judgeHint;
  const prompt =
    `以下是一個「${lane.name}」類網絡小說的開局。請嚴格評估它能不能讓普通讀者想繼續看下去。\n\n` +
    `合格條件（必須全部滿足）：\n` +
    `1. 是正在發生的場面，不是背景交代\n` +
    `2. 讀完會冒出一個具體、想知道答案的問題\n` +
    `3. ${hint}\n` +
    `4. 一次就能看懂：沒有未說明的指代，規則或設定簡單清楚，不靠數字額度\n` +
    `5. 沒有失蹤、車禍、警察、殯儀館、猝死，也沒有產權、法院拍賣、授權書、標金這類商戰\n\n` +
    `開局：「${premise}」\n\n` +
    `只輸出 JSON，不要其他文字。合格：{"pass":true,"failType":null,"reason":""}。不合格：{"pass":false,"failType":"PREMISE_LANE","reason":"40字內說明哪一條不合格"}。\n` +
    `failType 只可以是：${FAIL_TYPES.join("、")}。本關不合格時 failType 必須是 PREMISE_LANE。`;
  try {
    const raw = await deepseekChat([{ role: "user", content: prompt }], {
      model: "deepseek-chat",
      temperature: 0,
      maxTokens: 80,
      timeoutMs: 20_000,
    });
    return parsePremiseJudge(raw, "PREMISE_LANE");
  } catch {
    return { pass: true, failType: null, reason: "" }; // fail-safe
  }
}

// 模型有時會寫 *** / * * * / ＊ ＊ ＊，統一做 SECTION_MARK
function normalizeSections(content: string): string {
  return content
    .split("\n")
    .map((line) => (/^\s*([*＊]\s*){3,}\s*$/.test(line) ? SECTION_MARK : line))
    .join("\n")
    .replace(new RegExp(`^\\s*${SECTION_MARK}\\s*\\n`), "") // 開頭唔應該有分隔
    .replace(new RegExp(`\\n\\s*${SECTION_MARK}\\s*$`), ""); // 結尾唔應該有分隔
}

function sectionCount(content: string): number {
  return content.split("\n").filter((l) => l.trim() === SECTION_MARK).length + 1;
}

// ---- AI 讀者評分：喺 25%／50%／75% 位置插標記，叫一個「好易棄書」嘅讀者逐點打分 ----
type ReaderScore = { p25: number; p50: number; p75: number; end: number; total: number; drop: string; open: number; logic: number; issue: string };

function insertReadMarks(content: string): string {
  const paras = content.split("\n");
  const total = content.length;
  const marks = [0.25, 0.5, 0.75];
  const out: string[] = [];
  let acc = 0;
  let mi = 0;
  for (const p of paras) {
    out.push(p);
    acc += p.length + 1;
    while (mi < marks.length && acc >= total * marks[mi]) {
      out.push(`【讀者位置 ${marks[mi] * 100}%】`);
      mi++;
    }
  }
  return out.join("\n");
}

async function readerJudge(content: string, laneKey?: LaneKey): Promise<ReaderScore | null> {
  const kanbujianNote =
    laneKey === "kanbujian"
      ? `本篇是「看不見的好」。${KANBUJIAN_CLOSURE_CHECK}生活實物的 callback 是指定寫法，不要因為「用物件揭示心意」而把 logic 打低。若道具太晚才第一次出現、最後一段沒有 callback、結局開放、或用道理代替金句，logic 低於 6 分。失蹤、車禍、警察、猝死、產權、商戰仍然一律低於 6 分。\n`
      : "";
  const prompt =
    `你是一個每天在手機上看網絡小說的普通讀者，口味挑剔、很容易棄書：一覺得悶、看不懂、不相信，就會立刻關掉。\n` +
    `下面的故事中插入了【讀者位置 25%】【讀者位置 50%】【讀者位置 75%】三個標記。\n` +
    `請你誠實地代入這個讀者，在每個標記處評分「此刻有多想繼續看下去」（1-10 分），讀完後再評「讀完的滿足感」（1-10 分）。\n` +
    `評分要嚴格：普通的故事只值 5-6 分，只有真正讓人停不下來的才給 8 分以上。\n\n` +
    `另外請再做兩項「看不看得懂」檢查（1-10 分，嚴格）：\n` +
    `- open：只看開頭約 300 字，你能不能清楚說出誰在哪裡、發生什麼事、特殊規則是什麼？有未說明的指代（如「那句話」）或一頭霧水就低於 6 分。\n` +
    `- logic：全文設定有沒有前後矛盾（規則、次數、時間線）、人物反常行為有沒有鋪墊動機、神秘線索有沒有回收、結局有沒有交代清楚？情節在現實中是否說得通（例如簽名可以被重複使用就是不通）？標題講的畫面是否真的在故事裡發生？結尾若出現說教式總結道理（例如「有時候」「原來」「好運非零和」）、或真相靠翻舊紀錄／證物揭曉、或內容屬命案懸疑、失蹤、車禍、警察、殯儀館、猝死、產權法院拍賣、記憶買賣，logic 一律低於 6 分。連載若結尾只留「權限／計畫未交代」而沒有下一步行動，logic 也低於 6 分。有明顯矛盾或沒回收也低於 6 分。\n` +
    kanbujianNote +
    `\n` +
    `${insertReadMarks(content)}\n\n` +
    `只輸出 JSON，不要其他文字：{"p25":分數,"p50":分數,"p75":分數,"end":分數,"open":分數,"logic":分數,"issue":"最大的看不懂之處，25 字內","drop":"最可能棄書的位置與原因，20 字內"}`;
  try {
    const raw = await deepseekChat([{ role: "user", content: prompt }], {
      model: "deepseek-chat",
      temperature: 0,
      maxTokens: 220,
      timeoutMs: 50_000,
    });
    const m = raw.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as Partial<ReaderScore>;
    const n = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 10 ? v : 0);
    const s = { p25: n(j.p25), p50: n(j.p50), p75: n(j.p75), end: n(j.end) };
    return {
      ...s,
      total: s.p25 + s.p50 + s.p75 + s.end,
      drop: String(j.drop ?? "").slice(0, 40),
      open: n(j.open),
      logic: n(j.logic),
      issue: String(j.issue ?? "").slice(0, 50),
    };
  } catch {
    return null;
  }
}

type Draft = {
  content: string;
  pass: boolean;
  validateNote: string;
  retries: number;
  form: string;
  score: ReaderScore | null;
};

async function writeDraft(
  systemMsg: string,
  baseUserMsg: string,
  storyType: StoryType,
  form: (typeof NARRATIVE_FORMS)[number],
  temperature: number,
  deadline: number,
  hardEnd: number,
  laneKey?: LaneKey,
  protagonist?: string
): Promise<Draft> {
  const firstMsg = `${baseUserMsg}\n\n【敘事形式】${form.instruction}`;
  let userMsg = firstMsg;
  let content = "";
  let validateNote = "";
  let retries = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    // 第二次重寫要預留時間俾評分＋標題，唔夠就唔重寫（Vercel 上限 300 秒）
    if (attempt > 0 && Date.now() > deadline) break;
    const raw = await deepseekChat(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      { model: "deepseek-chat", temperature, maxTokens: 11000, timeoutMs: Math.max(30_000, Math.min(165_000, hardEnd - Date.now())) }
    );
    const c = normalizeSections(
      (raw.split("===CONTENT===")[1]?.split("===END===")[0]?.trim()) || raw.trim()
    );
    if (c) content = c;

    const fails = validateContent(content, storyType, laneKey, protagonist);
    const n = sectionCount(content);
    if (n < 4 || n > 6) fails.push(`分節數不對（${n}節，要4-5節，用單獨一行${SECTION_MARK}分隔）`);
    if (fails.length === 0) {
      const closureOk = await selfCheckClosure(content, storyType, laneKey).catch(() => true);
      if (closureOk) return { content, pass: true, validateNote: "PASS", retries: attempt, form: form.key, score: null };
      fails.push(closureFailNote(storyType, laneKey));
    }
    retries = attempt + 1;
    validateNote = fails.join("；");
    userMsg =
      `${firstMsg}\n\n⚠️重寫：上一次不合格。請只按針對性指示修改，不要整篇另起一個故事。\n` +
      `${repairBrief(groupFails(fails), storyType)}`;
  }
  return { content, pass: false, validateNote, retries, form: form.key, score: null };
}

// 兩稿都唔可用（睇唔明／太短）時，用編輯意見喺最好嗰稿上修一次，再評分
async function repairDraft(
  systemMsg: string,
  d: Draft,
  storyType: StoryType,
  hardEnd: number,
  laneKey?: LaneKey,
  protagonist?: string
): Promise<Draft | null> {
  const hits = groupFails(d.validateNote && d.validateNote !== "PASS" ? d.validateNote.split("；") : []);
  if (d.score && d.score.open < 6 && !hits.some((h) => h.failType === "OPEN")) {
    hits.push({ failType: "OPEN", reason: `開頭看不懂：${d.score.issue || "頭 300 字交代不清"}` });
  }
  if (d.score && d.score.logic < 6 && !hits.some((h) => h.failType === "LOGIC")) {
    hits.push({ failType: "LOGIC", reason: `邏輯或伏筆不足：${d.score.issue || "前後矛盾或線索沒有回收"}` });
  }
  if (laneKey === "kanbujian") {
    const propReason = closureFailNote(storyType, laneKey);
    const logic = hits.find((h) => h.failType === "LOGIC");
    if (logic && !logic.reason.includes("道具未回收")) logic.reason = `${logic.reason}、${propReason}`;
    else if (!logic && (d.validateNote.includes("道具未回收") || (d.score && d.score.logic < 6))) {
      hits.push({ failType: "LOGIC", reason: propReason });
    }
  }
  if (hits.length === 0) hits.push({ failType: "OTHER", reason: d.score?.issue || "設定交代不清" });
  const userMsg =
    `以下是一篇已寫好的故事。請只按針對性指示修改，保留其餘劇情、人物和結構，輸出完整全文。\n` +
    `${repairBrief(hits, storyType)}\n` +
    `輸出格式必須是：\n===CONTENT===\n（全文）\n===END===\n不要加任何其他文字。\n\n【原稿】\n${d.content}`;
  try {
    const raw = await deepseekChat(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      { model: "deepseek-chat", temperature: 0.8, maxTokens: 11000, timeoutMs: Math.max(30_000, Math.min(165_000, hardEnd - Date.now())) }
    );
    const c = normalizeSections((raw.split("===CONTENT===")[1]?.split("===END===")[0]?.trim()) || raw.trim());
    if (!c) return null;
    const fails = validateContent(c, storyType, laneKey, protagonist);
    const n = sectionCount(c);
    if (n < 4 || n > 6) fails.push(`分節數不對（${n}節）`);
    if (fails.length === 0) {
      const closureOk = await selfCheckClosure(c, storyType, laneKey).catch(() => true);
      if (!closureOk) fails.push(closureFailNote(storyType, laneKey));
    }
    const score = await readerJudge(c, laneKey);
    return { content: c, pass: fails.length === 0, validateNote: fails.length ? fails.join("；") : "PASS", retries: d.retries + 1, form: `${d.form}+repair`, score };
  } catch {
    return null;
  }
}

async function generateOne(
  storyType: StoryType,
  lane: Lane,
  recentTitles: string[],
  cast: [string, string],
  recentMetas: GenMeta[],
  forcedHook?: HookEngine,
  seriesOrder?: number
): Promise<{
  genre: string;
  title: string;
  protagonist: string;
  content: string;
  retries: number;
  validateNote: string;
  genMeta: GenMeta;
}> {
  const t0 = Date.now();
  const recentPremises = recentPremiseList(recentMetas, lane.key);

  let genre: string;
  let protagonist: string;
  let premise = "";
  let premiseNote = "";
  let genMeta: GenMeta;
  let systemMsg: string;
  let laneLine: string;

  if (lane.key === "shuangwen") {
    // ---- 爽文線：沿用 08-19 Hook 引擎＋籌碼＋男女主 ----
    const hook = forcedHook ?? pickHook(recentHooks(recentMetas));
    const stake = pick(STAKE_TYPES, recentStakes(recentMetas));
    genre = pick(hook.genres);
    const heroineName = cast[0];
    const heroName = cast[1];
    protagonist = `${heroineName}、${heroName}`;

    let priorFail: FailHit | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const got = await readPremise(() => generatePremise(hook, stake, heroineName, heroName, recentPremises, priorFail));
      if (got.lang) {
        priorFail = got.lang;
        premiseNote = got.lang.reason.slice(0, 120);
        continue;
      }
      const p = got.text;
      if (!p) continue;
      premise = p;
      // 禁題／商戰詞／死亡情節／語言喺 premise 層就要攔（正文層攔唔到，因為 retry 會用返同一個 premise）
      const blocked = premiseQualityFail(p, lane.key);
      if (blocked) {
        premiseNote = `premise撞${blocked.failType}(${blocked.reason})`.slice(0, 120);
        priorFail = blocked;
        continue;
      }
      const judged = await judgePremiseTension(p);
      if (judged.pass) {
        premiseNote = attempt === 0 ? "premise一次過" : "premise重試1次";
        break;
      }
      priorFail = { failType: judged.failType ?? "PREMISE_TENSION", reason: judged.reason || "張力不足" };
      premiseNote = `premise張力不足(${priorFail.failType}:${priorFail.reason})`.slice(0, 120);
    }
    genMeta = { lane: lane.key, hook: hook.key, stake, premise };
    systemMsg = `${STYLE_2026_SHUANGWEN}\n${COMMON_READ_THROUGH}`;
    laneLine =
      `【Hook 類型】${hook.name}——${hook.driver}\n` +
      `女主姓名：${heroineName}，男主姓名：${heroName}（必須使用這兩個姓名，不要改姓，也不要改名）。`;
  } else {
    // ---- 其他線：切入點池＋本線開局指引 ----
    const angle = pick(lane.angles, recentAngleSet(recentMetas, lane.key));
    genre = pick(lane.genres);
    const mainName = cast[0];
    const sideName = cast[1];
    protagonist = `${mainName}、${sideName}`;

    let priorFail: FailHit | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const got = await readPremise(() =>
        generateLanePremise(lane, angle, `${mainName}、${sideName}`, recentPremises, priorFail)
      );
      if (got.lang) {
        priorFail = got.lang;
        premiseNote = got.lang.reason.slice(0, 120);
        continue;
      }
      const p = got.text;
      if (!p) continue;
      premise = p;
      const blocked = premiseQualityFail(p, lane.key);
      if (blocked) {
        premiseNote = `premise撞${blocked.failType}(${blocked.reason})`.slice(0, 120);
        priorFail = blocked;
        continue;
      }
      const judged = await judgeLanePremise(p, lane);
      if (judged.pass) {
        premiseNote = attempt === 0 ? "premise一次過" : "premise重試1次";
        break;
      }
      priorFail = { failType: judged.failType ?? "PREMISE_LANE", reason: judged.reason || "開局條件不足" };
      premiseNote = `premise張力不足(${priorFail.failType}:${priorFail.reason})`.slice(0, 120);
    }
    genMeta = { lane: lane.key, angle, premise };
    systemMsg = `${SHARED_BANS}\n${lane.style}\n${COMMON_READ_THROUGH}`;
    laneLine = `【故事線】${lane.name}\n【切入點】${angle}\n主要人物：${mainName}、${sideName}（必須使用這兩個姓名，不要改名；不一定要寫成愛情）。`;
    if (isFirstPersonLane(lane.key)) {
      laneLine += `\n【人稱】${FIRST_PERSON_PREMISE_RULE}全文必須用「我」敘述，不可改成第三人稱。`;
    }
    if (lane.key === "kanbujian") {
      laneLine +=
        "\n【本線結構】反差開頭，然後三個具體日常細節，再轉到長輩或回憶，用早已出場的實物揭示好意。最後一段 callback 這件道具，並以一句短金句收口。不說教，不直述感情。禁止失蹤、車禍、警察、猝死、產權、商戰、開放結局。長輩必須在世。";
    }
    if (isDeathPlotBannedLane(lane.key)) {
      laneLine += "\n【本線】嚴禁過世、去世、離世、遺物、靈堂、喪禮，不可把長輩、師傅或店主寫成已經去世。";
    }
  }

  if (lane.key === "kanbujian") {
    genMeta.series = {
      key: "kanbujian",
      title: "看不見的好",
      order: seriesOrder ?? nextSeriesOrder(recentMetas, "kanbujian"),
    };
  }

  const stillBlocked = premiseQualityFail(premise, lane.key);
  if (!premise.trim() || stillBlocked) {
    throw new Error(`開局未過硬性禁區（${stillBlocked?.reason || premiseNote || "開局為空"}），這篇不生成`);
  }

  const structure = storyType === "serial" ? SERIAL_STRUCTURE : SHORT_STRUCTURE;
  systemMsg = `${systemMsg}\n${structure}`;
  const baseUserMsg =
    `【故事開局（必須嚴格按這個開局展開，不可以改成另一個故事）】\n${premise}\n\n` +
    `${laneLine}\nstory_type：${storyType}。\n\n` +
    `請由這個開局展開（以現場畫面開場，但頭 300 字內必須讓讀者清楚知道人物是誰、在哪裡、發生什麼事，不要用指代吊胃口），寫成完整正文，分 4 至 5 節，節與節之間單獨一行寫「${SECTION_MARK}」。\n` +
    `只寫正文，不需要想標題（標題另外處理）。\n` +
    `輸出格式必須是：\n===CONTENT===\n（全文）\n===END===\n不要加任何其他文字或解釋。`;

  // ---- 雙稿並行：A 稿一般敘事；B 稿一半機會試其他敘事形式 ----
  const formA =
    THIRD_PERSON_LANES.includes(lane.key) && Math.random() < 0.4
      ? NARRATIVE_FORMS.find((f) => f.key === "third_person") ?? NARRATIVE_FORMS[0]
      : NARRATIVE_FORMS[0];
  const formB = Math.random() < 0.5 ? pickForm(lane.key, storyType) : NARRATIVE_FORMS[0];
  const deadline = t0 + 110_000; // 過咗呢個時間就唔重寫（長文一次要 2-3 分鐘）
  const hardEnd = t0 + 215_000; // 單次生成最遲收尾時間，留 ~80 秒俾評分＋標題
  const draftResults = await Promise.allSettled([
    writeDraft(systemMsg, baseUserMsg, storyType, formA, 1.0, deadline, hardEnd, lane.key, protagonist),
    writeDraft(systemMsg, baseUserMsg, storyType, formB, 1.1, deadline, hardEnd, lane.key, protagonist),
  ]);
  const drafts = draftResults
    .filter((r): r is PromiseFulfilledResult<Draft> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((d) => d.content);
  if (drafts.length === 0) {
    const reason = draftResults.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw new Error(`兩稿都失敗：${reason?.reason instanceof Error ? reason.reason.message : String(reason?.reason)}`);
  }

  // ---- AI 讀者評分（兩稿並行），優先揀過驗收嘅，再揀分高 ----
  const scores = await Promise.all(drafts.map((d) => readerJudge(d.content, lane.key)));
  drafts.forEach((d, i) => (d.score = scores[i]));
  // 看得懂：open 或 logic 低於 6 都不算過關（readerJudge 寫明有缺陷的 logic 低於 6）。沒有評分時不在這裡擋。
  const clear = (d: Draft) => isReaderClear(d.score);
  // validate 失敗的稿（字數、分節、粵語、簡體、陳套、收尾、道具）isHardBlocked，不能繞過 repairDraft 直接上架。
  const minUsableLen = storyType === "serial" ? 3000 : 2200; // 低過呢個先當太短排除（目標下限 3600／2600 靠 repair 補）
  // 硬性不合格返修完仍在就唔發佈。唔會改動已上線故事。
  const usable = (d: Draft) => clear(d) && !isHardBlocked(d.validateNote) && d.content.length >= minUsableLen;
  let ranked = drafts
    .filter(usable)
    .sort(
      (a, b) =>
        Number(b.pass) - Number(a.pass) ||
        (b.score ? b.score.total + b.score.logic : -1) + (b.form.startsWith("normal") ? 0 : 1.5) -
          ((a.score ? a.score.total + a.score.logic : -1) + (a.form.startsWith("normal") ? 0 : 1.5))
    );
  if (ranked.length === 0) {
    // 兩稿都唔可用：喺最高分（冇簡體字）嗰稿上按編輯意見修，最多兩輪（每輪約 40-60 秒）
    let cur = drafts
      .filter((d) => !d.validateNote.includes("簡體字"))
      .sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1))[0];
    for (let round = 0; round < 2 && cur && Date.now() < t0 + 170_000; round++) {
      const fixed = await repairDraft(systemMsg, cur, storyType, t0 + 250_000, lane.key, protagonist);
      if (!fixed) break;
      drafts.push(fixed);
      if (usable(fixed)) {
        ranked = [fixed];
        break;
      }
      cur = fixed.validateNote.includes("簡體字") ? cur : fixed;
    }
  }
  const best = ranked[0];
  if (!best) {
    // 修完仍然唔可用（睇唔明／簡體字／太短）：寧願今日少出一篇，都唔放問題稿上去
    throw new Error(
      `兩稿都不可用，不發佈：${drafts.map((d) => `${d.form} open=${d.score?.open} logic=${d.score?.logic} ${d.score?.issue} ${d.validateNote.slice(0, 30)}`).join(" | ")}`
    );
  }

  genMeta.form = best.form;
  genMeta.judge = drafts.map((d) => ({
    form: d.form,
    pass: d.pass,
    total: d.score?.total ?? null,
    p25: d.score?.p25 ?? null,
    p50: d.score?.p50 ?? null,
    p75: d.score?.p75 ?? null,
    end: d.score?.end ?? null,
    open: d.score?.open ?? null,
    logic: d.score?.logic ?? null,
    issue: d.score?.issue ?? "",
    drop: d.score?.drop ?? "",
    picked: d === best,
  }));

  const title = await generateTitle(best.content, recentTitles, t0 + 275_000, lane.key);
  if (Date.now() < t0 + 270_000) {
    const teaser = await generateTeaser(best.content, title);
    if (teaser) genMeta.teaser = teaser;
  }

  return {
    genre,
    title,
    protagonist,
    content: best.content,
    retries: best.retries,
    validateNote:
      `${best.pass ? "PASS" : `⚠️未過validate：${best.validateNote}`}｜${premiseNote}｜` +
      `稿數${drafts.length}｜評分 ${drafts.map((d) => `${d.form}:${d.score?.total ?? "?"}`).join(" vs ")}`,
    genMeta,
  };
}

async function loadKanbujianOrder(
  supabase: ReturnType<typeof admin>,
  recentMetas: GenMeta[]
): Promise<number> {
  const collected: GenMeta[] = [...recentMetas];
  const { data, error } = await supabase
    .from("novel_stories")
    .select("gen_meta")
    .contains("gen_meta", { series: { key: "kanbujian" } });
  if (!error && data) {
    for (const row of data) {
      const meta = row.gen_meta as GenMeta | null;
      if (meta) collected.push(meta);
    }
  }
  return nextSeriesOrder(collected, "kanbujian");
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runStart = Date.now();
  const supabase = admin();

  const { data: recent } = await supabase
    .from("novel_stories")
    .select("title, protagonist, content, gen_meta, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  const recentTitles = (recent ?? []).map((r) => r.title as string);
  const recentMetas: GenMeta[] = (recent ?? [])
    .map((r) => r.gen_meta as GenMeta | null)
    .filter((m): m is GenMeta => !!m);
  // 近 14 日全名硬性排除；近 14 日主角名字（given）一併排除，唔再只限同一香港日。正文／標題／premise 一併掃。
  const nameBlock = nameBlockFromStories(
    (recent ?? []).map((r) => {
      const meta = r.gen_meta as GenMeta | null;
      return {
        protagonist: (r.protagonist as string | null) ?? null,
        title: (r.title as string | null) ?? null,
        content: (r.content as string | null) ?? null,
        premise: meta?.premise ?? null,
        created_at: (r.created_at as string | null) ?? null,
      };
    }),
    new Date()
  );

  // 2026-08-19：short / serial 由順序執行改做並行（Gemini review 建議）——加咗 premise
  // 階段之後 call 數上升，並行可以將 wall-clock 由「兩篇相加」變成「較慢嗰篇」，
  // 留返足夠 headroom 俾 Vercel 300 秒上限。
  // ⚠️ 代價：兩篇唔會再互相排除標題/hook（原本順序跑會將前一篇 unshift 入 recentMetas）。
  // 補償做法：預先幫兩篇各自 reserve 一個唔同嘅 hook，以及一組唔撞嘅姓名。
  const reservedHooks = new Set(recentHooks(recentMetas));
  const hookForShort = pickHook(reservedHooks);
  reservedHooks.add(hookForShort.key);
  const hookForSerial = pickHook(reservedHooks);

  // 2026-10-04：故事線——同一個 run 兩篇一定唔同線，並盡量避開上一個 run 用過嘅線。
  // 可以用 ?lane=dark_humor 之類強制指定（淨係方便人手測試；cron 唔會帶）。
  // kanbujian 權重 2，short 日常輪換會抽中；?lane=kanbujian 仍然有效。serial 冇呢條。
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const requestedLane = req.nextUrl.searchParams.get("lane");
  const laneExclude = recentLanes(recentMetas);
  const laneForShort = resolveForcedLane(LANES, requestedLane, "short") ?? pickLane("short", laneExclude);
  const laneForSerial =
    resolveForcedLane(LANES, requestedLane, "serial") ??
    pickLane("serial", new Set([...laneExclude, laneForShort.key]));

  const shortCast = assignCharacterPair(nameBlock, castGenders(laneForShort.key));
  const serialCast = assignCharacterPair(nameBlock, castGenders(laneForSerial.key));
  const kanbujianBase =
    laneForShort.key === "kanbujian" || laneForSerial.key === "kanbujian"
      ? await loadKanbujianOrder(supabase, recentMetas)
      : undefined;
  const seriesOrderFor = (storyType: StoryType, lane: Lane): number | undefined => {
    if (lane.key !== "kanbujian" || kanbujianBase == null) return undefined;
    if (storyType === "serial" && laneForShort.key === "kanbujian") return kanbujianBase + 1;
    return kanbujianBase;
  };

  const settled = await Promise.allSettled(
    ([
      ["short", laneForShort, hookForShort, shortCast],
      ["serial", laneForSerial, hookForSerial, serialCast],
    ] as [StoryType, Lane, HookEngine, [string, string]][]).map(([storyType, lane, forcedHook, cast]) =>
      generateOne(storyType, lane, recentTitles, cast, recentMetas, forcedHook, seriesOrderFor(storyType, lane)).then(
        (story) => ({ storyType, story })
      )
    )
  );

  const results: Record<string, unknown>[] = [];

  for (const outcome of settled) {
    if (outcome.status === "rejected") {
      results.push({
        error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      });
      continue;
    }
    const { storyType, story } = outcome.value;
    // ?dry=1：試跑模式，唔寫入資料庫，直接回傳全文（人手測試用；仍然要 CRON_SECRET）
    if (dryRun) {
      results.push({ storyType, title: story.title, genre: story.genre, protagonist: story.protagonist,
        validateNote: story.validateNote, genMeta: story.genMeta, content: story.content });
      continue;
    }
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
      lane: story.genMeta.lane,
      hook: story.genMeta.hook ?? null,
      angle: story.genMeta.angle ?? null,
      form: story.genMeta.form,
      premise: story.genMeta.premise,
      series: story.genMeta.series ?? null,
      teaser: story.genMeta.teaser ?? null,
      judge: story.genMeta.judge,
      retries: story.retries,
      validateNote: story.validateNote,
      insertError: error?.message ?? null,
    });
  }

  if (dryRun) return NextResponse.json({ ok: true, dryRun: true, ms: Date.now() - runStart, results });

  await supabase
    .from("service_heartbeat")
    .upsert({ task_name: "novel-story-generator", last_beat_at: new Date().toISOString() }, { onConflict: "task_name" });

  return NextResponse.json({ ok: true, results });
}

