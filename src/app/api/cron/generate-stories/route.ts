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
    seed: "距離妹妹上手術檯只剩兩個鐘，蘇念要喺「跪低求返當年退婚嗰個人」同「交出足以毀掉亡母名聲嘅證據」之間揀一樣。就喺佢舉起筆嗰刻，對方將張支票撕成兩半：「我要嘅唔係你嘅簽名。」",
    genres: ["家族發瘋", "退婚逆襲"],
  },
  {
    key: "info_asymmetry",
    name: "資訊差 + 誘敵深入",
    driver: "一方以為自己完全佔上風，其實由頭到尾都喺對方掌握之中",
    seed: "陸行舟以為佢用一紙協議困住咗江晚，報返當年被退婚嗰浸氣。佢唔知江晚手上有段錄音，一放出嚟成頭家都散。佢心甘情願留喺佢身邊，只係為咗等佢親口講出嗰句話。",
    genres: ["復仇歸來", "身份反轉"],
  },
  {
    key: "stakes_deal",
    name: "條款陷阱 + 致命驚喜",
    driver: "為救人簽落一份表面荒謬嘅約，簽完先發現條款背後藏住恐怖真相",
    seed: "為咗湊夠爸爸嘅醫藥費，林微答應扮演傅景琛亡妻嘅替身三個月。簽約第一晚，傅景琛帶佢去墓地——墓碑上面嗰張相，係林微自己。",
    genres: ["契約婚姻", "假戲真做"],
  },
  {
    key: "mutual_hunt",
    name: "雙向互獵 + 強強試探",
    driver: "兩個勢均力敵嘅對手被逼入同一個絕境，只有一個可以贏",
    seed: "兩個追查同一單案嘅死對頭被困喺同一間密室，得一個人可以攞到出口密碼。互相落死手嗰陣，兩人同時發現對方袋入面，係同一枚五年前救過自己嘅襟章。",
    genres: ["強強交鋒"],
  },
  {
    key: "moral_regret",
    name: "遲到真相 + 極致追悔",
    driver: "親手摧毀咗對方之後，先發現對方一直係默默救自己嗰個",
    seed: "顧言深當眾燒毀咗江離嘅畫室，笑佢一世都係個攀附者。直到江離簽咗離婚協議走人，佢先喺灰燼下面搵到嗰張救返佢阿媽一命嘅匿名捐贈同意書——落款係江離。",
    genres: ["求而不得", "復仇歸來"],
  },
  {
    key: "wrong_identity",
    name: "錯位替身 + 即時拆穿",
    driver: "頂替身份第一秒就被最唔應該識穿嗰個人識穿",
    seed: "頂替失蹤嘅孖生家姐出席死對頭嘅晚宴，第一晚就俾對方堵喺角落：「你扮得比你家姐好。不過你家姐唔會用左手攞酒杯。」",
    genres: ["雙胞胎替身局", "身份反轉"],
  },
  {
    key: "pretend_amnesia",
    name: "偽裝失憶 + 危險重逢",
    driver: "扮唔認得對方，但身體同細節出賣咗一切",
    seed: "離婚三年後喺急症室重逢，佢扮唔認得，問「請問你係邊位」。佢一路幫佢止血一路冷笑：「唔記得我，都應該記得你手上呢隻戒指刻咗咩字。」",
    genres: ["復仇歸來", "求而不得"],
  },
  {
    key: "social_humiliation",
    name: "社交撕裂 + 極限翻盤",
    driver: "喺最多人嘅場合被公開羞辱，下一秒身份反轉全場跪低",
    seed: "喺百人謝師宴上面，前男友用投影片公開佢當年窮到要做三份兼職嘅相。下一秒，全場最德高望重嗰位教授行埋嚟，當住所有人叫佢一聲「老師」。",
    genres: ["潛入打臉", "退婚逆襲"],
  },
  {
    key: "debt_collateral",
    name: "抵押清算 + 惡劣籌碼",
    driver: "去追討／清算嘅時候，發現對方將自己都抵押埋落張單度",
    seed: "佢被派去處理亡父留低嘅爛債，第一日就發現：仇家將自己名下所有嘢，連埋佢自己，一次過抵押咗俾佢。「而家我係你嘅資產，你想點處置我？」",
    genres: ["強強交鋒", "契約婚姻"],
  },
  {
    key: "shared_fate",
    name: "同生共死 + 命運綁定",
    driver: "想落手殺對方嗰刻，先發現傷佢等於傷自己",
    seed: "佢接到指令去接近宿敵，落手嗰刻先發現兩家人早就簽落一份同命契——對方受傷，自己會同步流血。佢一刀落去，兩個人一齊跪低。",
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
  "一份簽了就再也拿不回來的授權書",
  "一個唯一肯替自己作證的人，正準備反口",
  "一份足以推翻當年冤案的舊紀錄",
  "一次錯過就再沒有第二次的救命名額",
  // 2026-08-19 Stephanie 澄清職場鬥爭 OK 之後加（商戰仍然禁）——籌碼停留喺「人對人」層面
  "一個被同事當眾搶走、再也拿不回來的功勞",
  "一份被人動過手腳、足以令自己即刻被解僱的紀錄",
];

const SURNAMES = ["沈", "陸", "江", "顧", "蘇", "林", "周", "程", "宋", "謝", "封", "傅", "聞", "盛", "時", "樓", "席", "慕", "厲", "荀", "崔", "裴"];
const FEMALE_GIVEN = ["知微", "知意", "薏", "清昭", "念安", "疏影", "望舒", "宛卿", "憶蘿", "簡遙", "南星", "如晚", "青禾", "思螢", "蘇黎"];
const MALE_GIVEN = ["沉硏", "臨渊", "行舟", "景琛", "亦臻", "聞禮", "執", "衍之", "聲遠", "承宴", "修白", "緘言"];

// ---------- House Style（2026-08-19 大改：由「純文學向創作原則」整套換做「2026 短劇爽文法則」
// ——起因：舊版六條原則（一場一景／信任讀者／意象貫穿／克制留白）係純文學美學，實測連人手
// 精寫嘅樣本 Stephanie 都評「一樣悶」。市場數據：每分鐘要 3-4 個情緒爆點、讀者 3 秒決定去留、
// 打臉逆襲轉化率係純愛情向 2.3 倍、純愛情向內容 2026 年已現觀眾疲勞。
// ⚠️ 呢份 prompt 刻意用書面中文寫指令（唔再用粵語落指令）——舊版粵語指令令模型跟錯 register，
// 成日輸出粵語口語詞觸發 validate retry。詳細決策脈絡 → daily-novel CHANGELOG.md 2026-08-19）----------
const STYLE_2026_SHUANGWEN = `
【必須使用繁體字（Traditional Chinese），絕對不可以出現簡體字（Simplified Chinese），這條規定優先於任何其他規則】
${LANG_RULE}

【2026 高情緒密度爽文／短劇創作法則】
你不是純文學作家。你是 2026 年爆款短劇與熱門網文的主筆。你唯一的目標是：讓讀者在前三秒被鉤住，在過程中感受極致的情緒壓迫，最後獲得徹底的翻盤爽感。

1. 開場即爆點（前 100 字）
   第一句必須直接進入極端衝突、羞辱、絕境或命運抉擇的現場。嚴禁任何背景介紹、環境描寫、天氣描寫、人物履歷交代。讀者看第一行就要知道「有大件事正在發生」。

2. 高風險籌碼（Stakes）
   主角必須有一樣「輸咗就完蛋」的具體東西壓在檯面上——親人的手術、一場官司、一個名聲、一筆還不起的債、一個身份秘密。抽象的「內心創傷」不算籌碼。讀者要清楚知道：如果主角輸，會即刻失去甚麼。

3. 情緒曲線：壓迫 → 反轉 → 打臉 → 宣洩（2026-10-04：主要反轉 2-3 個，寧少勿亂；不要為了多反轉而疊加巧合）
   完整曲線必須是：①主角被壓迫／被質疑／被羞辱到極點 → ②第一層反轉（對手以為贏定）→ ③關鍵籌碼亮出／真身份浮現 → ④徹底打臉，情緒完全宣洩。
   每個反轉之前必須埋一個一句話的伏筆，不可以憑空掉下來。

4. 對白要有鋒芒
   對白必須短、狠、帶張力，敵意與深情要形成反差。嚴禁無意義的日常閒聊（問天氣、修燈泡、遞水、澆花、餵鴿子這一類）。每一句對白都要推進衝突或翻轉關係。

5. 節奏：不准溫吞
   情節必須持續推進，禁止用大段內心獨白、回憶、景物描寫拖慢節奏。角色的心理狀態要用行動和對白表現，不要用一整段去解釋。

6. 鉤子句結尾
   short（短篇）：在打臉或情感爆發的最頂峰戛然而止，最後一句要是有傳播力的金句。
   serial（連載）：停在身份即將揭穿／關鍵抉擇落地的前一秒。

7. 女主要夠飒（2026-08-19 加返）
   女主／主角必須「發瘋、反套路、夠飒」——用擺爛、將計就計、當場拆穿、發瘋輸出等手段自救，
   不可以靠傳統的隱忍、哭泣、等人來拯救。她可以哭，但哭完一定要自己出手翻盤，不是等男主救。

8. 情感要有共鳴底（2026-08-19 加返，作為第6條金句規則嘅輔助條件）
   主角嘅核心情緒盡量揀普通人親身經歷過嘅心理狀態做底色——錯過、後悔、唔敢講出口、犧牲、被忽略、
   被信任嘅人背叛。呢個唔係要放慢節奏或加內心獨白，而係令翻盤打臉嗰刻嘅「爽」有真實情緒撐住，
   唔係得個爽字得個殼。

【絕對禁忌】
- 嚴禁靜物文青風：不要專注描寫花草、石頭、鴿子、薄荷、路燈、光影這一類意象，更不要讓某件靜物貫穿全篇當主角。
- 嚴禁寫成無衝突的同居日常、合租日常、慢熱相處。
- 嚴禁「兩個受傷的人在室內平靜地互相理解」這種零外部衝突的寫法。
- 嚴禁商戰情節：企業收購、股權爭奪、集團鬥爭、董事會奪權、公司估值談判這一類，一律不准寫。
  但「職場上的個人衝突」可以寫，而且鼓勵：被上司針對、被同事搶功、被誣陷偷資料、被排擠、被逼頂罪、升遷被人做手腳。
  分界線：衝突發生在「人與人之間」可以；變成「公司與公司之間的生意攻防」就不行。
- 嚴禁鬼怪／靈異／恐怖元素。
- 嚴禁把深情寫成長期監視、偷偷記錄對方一舉一動（讀起來像跟蹤狂，不是浪漫）。
- 嚴禁豪門、財閥、總裁、繼承人、家族聯姻這類設定。主角是普通人，籌碼要是普通人有共鳴的東西。
- 嚴禁用獵奇題材製造衝擊：不可以出現代孕、懷孕測試、墮胎、亂倫或兄妹戀暗示、未成年情節、性交易。
  張力必須來自處境壓迫與抉擇，不是來自禁忌題材本身。
- 男女主必須是可以發展感情關係的對等成年人。嚴禁把兩人寫成父女、母子、兄妹、姊弟或任何血緣親屬關係。

【揭露機制硬規】
秘密／身份／真相被發現的方式，不可以用「翻舊物、搜到證物、解鎖舊裝置、偷看日記」這一類（要解釋太多巧合，讀者一看就出戲）。
必須用以下其中一種：①即時撞破（當場撞見）②第三者當場講漏嘴 ③直接對峙攤牌 ④心聲／內心話不小心被聽見。

※ 標題由獨立程序生成，這裡不需要處理標題，專注寫正文。
`;

const SERIAL_STRUCTURE = `
【serial（連載，有互動結局功能）結構規定】
⚠️ 字數硬性下限 2200 字，目標 2800–4500 字。少於 2200 字一律不合格會被打回重寫，所以必須寫足。
如果覺得情節不夠長，就多加一層衝突或多寫一個爆點場面，不要草草收尾。
節奏要求：分 3 至 4 節，每節結尾都要留一個鉤子；全篇主要反轉 2 至 3 個，每個都要有伏筆。不可以連續兩大段沒有推進。
結尾必須停在一個具體的「抉擇／未揭曉節點」——對方即將講出關鍵答案的前一秒、主角即將做出攸關命運的選擇、
秘密即將揭穿的前一刻、關鍵籌碼即將亮出的前一刻。
這個節點要令讀者能想到至少兩種截然不同的後續發展（例如：他會不會揭穿我？他會不會原諒我？），才適合後續互動結局分支。
單純斬在動作描寫中間、沒有分支想像空間的停法，不算合格。不可以寫成大團圓結局。
`;

const SHORT_STRUCTURE = `
【short（短篇，沒有互動結局功能）結構規定】字數 1500–3000字。
節奏要求：分 3 至 4 節，每節結尾都要留一個鉤子；全篇主要反轉 2 至 3 個，每個都要有伏筆。
結尾必須完整收尾：開頭拋出的核心問題要得到回答，衝突要有結果，情緒必須落地，絕對不可以留懸念或開放式結局。
容許苦結局（求而不得、遲來的真相），不一定要 happy ending，但情節本身一定要解決，不可以留手尾。
最後一句必須是可以獨立截圖傳播的金句。
`;

// ================================================================================
// 2026-10-04：「故事線」制度（Stephanie：想要唔同題材、唔同文風、令人想睇晒成篇）
// 起因：08-19 之後全站得一套爽文法則＋10 個同屬女頻復仇嘅 Hook，出嚟篇篇似。
// 而家分 4 條線輪流出（爽文逆襲＝主線，保留原 Hook 引擎；黑色幽默／溫情反轉／腦洞奇想係新線），
// 每條線有自己嘅文風指引、開局切入點池同張力標尺。懸疑推理／古風宮鬥 Stephanie 明確唔要。
// 所有線共用：COMMON_READ_THROUGH（核心問題＋分節鉤子＋反轉 2-3 個）同 COMMON_BANS（原有禁區）。
// ================================================================================

const SECTION_MARK = "＊＊＊";

const COMMON_READ_THROUGH = `
【全線共用：讓讀者一口氣讀到最後】
1. 核心問題：開頭 100 字內必須拋出一個具體、讀者急著想知道答案的問題（例如「她為甚麼要替仇人作證？」「明天的訊息是誰發的？」），這個問題貫穿全文。short 必須在最後一節才回答；serial 必須把答案推到揭曉前一秒。不可以中途提早揭曉。
2. 分節：全文分成 3 至 4 節，節與節之間單獨一行只寫「${SECTION_MARK}」（三個全形星號），不要寫節標題或編號。每一節的最後一句都必須是鉤子：一個新的疑點、一個未完成的動作、或一句令人不安的話。
3. 反轉：全篇主要反轉 2 至 3 個，寧少勿亂。每個反轉之前，前文必須已經埋下讀者看得見的伏筆。禁止靠連串巧合推進——讀者一旦不信，就不會讀到最後。
4. 段落短：1 至 3 句一段，關鍵句獨立成段，適合手機閱讀。
5. 結尾最後一句要短、有力、可以獨立截圖傳播。
`;

const COMMON_BANS = `
【必須使用繁體字（Traditional Chinese），絕對不可以出現簡體字（Simplified Chinese），這條規定優先於任何其他規則】
${LANG_RULE}

【共用禁區】
- 嚴禁商戰：企業收購、股權爭奪、集團鬥爭、董事會奪權、估值談判。職場上人與人之間的衝突可以寫。
- 嚴禁豪門、財閥、總裁、繼承人、家族聯姻設定。主角是普通人。
- 嚴禁鬼怪、靈異、恐怖、血腥元素。
- 嚴禁代孕、懷孕測試、墮胎、亂倫或親屬間戀愛暗示、未成年情節、性交易。如有感情線，雙方必須是對等成年人。
- 嚴禁把深情寫成長期監視、偷偷記錄對方一舉一動。
- 秘密被揭開的方式不可以用「翻舊物、搜到證物、解鎖舊裝置、偷看日記」，要用：當場撞破、第三者講漏嘴、直接對峙、心聲被聽見，或者由前文伏筆自然推出。
- 嚴禁 AI 陳套：夜幕降臨、不禁、彷彿整個世界、心跳漏了一拍、眼眶泛紅、五味雜陳。
`;

type LaneKey = "shuangwen" | "dark_humor" | "warm_twist" | "high_concept";

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
- 奇想是「規則」不是「鬼」：嚴禁鬼怪、靈異、恐怖、血腥。
- 結尾要有一個讀者沒想到、但回頭看完全符合規則的反轉。
`;

const LANES: Lane[] = [
  {
    key: "shuangwen",
    name: "爽文逆襲",
    weight: 4,
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
      "主角在婚禮／喪禮／畢業典禮上被迫臨時上台發言",
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
    judgeHint: "奇想規則一句講得清楚，而且已經即刻給主角帶來具體麻煩",
    angles: [
      "每天早上收到一條來自明天的訊息",
      "能聽見別人說謊時的心跳聲",
      "可以把一天重來一次，但每重來一次就會忘記一個人",
      "看得見每個人頭上顯示的「今天剩餘好運值」",
      "說出口的抱怨會在二十四小時內成真",
      "全城所有人突然有一天只能說真話",
      "手機多了一個 App，可以撤回自己現實中說過的一句話",
      "每個人的影子會提前三秒做出他下一個動作",
      "可以花錢買別人的一小時記憶",
      "每次說「沒事」，身邊的人就會真的忘掉那件事",
      "每天醒來都會多出一項陌生的技能，同時失去一項舊技能",
      "能看見每段關係剩下的倒數時間",
    ],
    seeds: [
      "每天早上七點，我會收到一條來自明天的訊息。今天那條只有四個字：別開門，快。",
      "我能聽見別人說謊時的心跳聲。求婚那晚，他單膝跪下說「我愛你」，我聽見他的心跳快得像在逃命。",
    ],
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
];

function pickWeighted<T extends { weight: number }>(arr: T[]): T {
  const total = arr.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of arr) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return arr[arr.length - 1];
}

function pickLane(storyType: StoryType, exclude: Set<LaneKey>): Lane {
  const eligible = LANES.filter((l) => l.types.includes(storyType));
  const pool = eligible.filter((l) => !exclude.has(l.key));
  return pickWeighted(pool.length > 0 ? pool : eligible);
}

// 每條線容許嘅敘事形式（黑色幽默固定第一人稱，所以唔用第二人稱；serial 要停喺揭曉前，所以唔用倒敘）
const LANE_FORMS: Record<LaneKey, string[]> = {
  shuangwen: ["normal", "flash_forward", "chat_log"],
  dark_humor: ["normal", "chat_log", "flash_forward"],
  warm_twist: ["normal", "chat_log", "flash_forward", "second_person"],
  high_concept: ["normal", "chat_log", "flash_forward", "second_person"],
};

function pickForm(lane: LaneKey, storyType: StoryType) {
  const keys = LANE_FORMS[lane].filter((k) => k !== "normal" && !(storyType === "serial" && k === "flash_forward"));
  const key = keys.length ? keys[Math.floor(Math.random() * keys.length)] : "normal";
  return NARRATIVE_FORMS.find((f) => f.key === key) ?? NARRATIVE_FORMS[0];
}

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

// 2026-08-19：Stephanie 澄清「職場鬥爭 OK，商戰唔要」之後實測發現——單靠 prompt 擋唔住，
// 模型會由「被同事搶功勞」自己升級去「總部收購目標」。所以加 code 層黑名單，
// premise 同正文兩層都 check，撞到就重生成。
// ⚠️ 揀詞準則：只收「公司對公司嘅生意攻防」用語，唔收「人對人嘅職場衝突」用語
//（所以冇收「主管」「同事」「升職」「解僱」呢啲——嗰啲而家係容許嘅）。
const BUSINESS_WAR_WORDS = [
  "收購", "併購", "股權", "股份", "董事會", "上市", "估值", "融資",
  "商戰", "競標", "併吞", "控股", "集團利益", "商業機密",
];

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

// 2026-08-19：gen_meta 由「骨架+slot 組合」改記「Hook 引擎 + 實際生成嘅 premise」。
// ⚠️ 舊資料（skeleton 形態）讀返出嚟 m.hook 會係 undefined，下面全部用 filter(Boolean) 擋住，
// 唔會 crash，只係舊資料唔會參與排除計算——可以接受，因為舊故事本身就係要淘汰嗰批。
// 2026-10-04：加 lane（故事線）／angle（非爽文線切入點）／form（敘事形式）／judge（雙稿 AI 讀者評分）。
// 爽文線先有 hook／stake；舊資料冇 lane，當爽文處理。
type JudgeRecord = {
  form: string;
  pass: boolean;
  total: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  end: number | null;
  drop: string;
  picked: boolean;
};
type GenMeta = {
  lane?: LaneKey;
  hook?: HookKey;
  stake?: string;
  angle?: string;
  premise: string;
  form?: string;
  judge?: JudgeRecord[];
};

// 排除近期用過嘅 Hook 引擎（10 個引擎，排除最近 5 個 → 保證兩星期內唔會撞同一個 hook）
function recentHooks(metas: GenMeta[], window = 5): Set<HookKey> {
  return new Set(metas.slice(0, window).map((m) => m?.hook).filter(Boolean) as HookKey[]);
}

// 排除近期用過嘅籌碼類型（12 個，排除最近 6 個）
// 非爽文線切入點：排除最近 8 篇用過嘅
function recentAngles(metas: GenMeta[], window = 8): Set<string> {
  return new Set(metas.slice(0, window).map((m) => m?.angle).filter(Boolean) as string[]);
}

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
  for (const w of BUSINESS_WAR_WORDS) {
    if (content.includes(w)) fails.push(`商戰詞:${w}`);
  }
  return fails;
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
function shapeFails(title: string, recentTitles: string[]): string[] {
  const shape = titleShape(title);
  const recentShapes = recentTitles.filter(Boolean).map(titleShape);
  if (shape === "time_moment" && recentShapes.slice(0, 6).includes("time_moment")) {
    return [`句式重複：近期已用過${SHAPE_LABEL.time_moment}，今次不可以再用`];
  }
  if (recentShapes.length >= 2 && recentShapes[0] === shape && recentShapes[1] === shape) {
    return [`句式重複：最近兩篇都是${SHAPE_LABEL[shape]}，今次必須換另一種句式`];
  }
  return [];
}

function validateTitle(title: string, recentTitles: string[]): string[] {
  const fails: string[] = [];
  fails.push(...shapeFails(title, recentTitles));
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
async function generateTitle(content: string, recentTitles: string[], deadline = Infinity): Promise<string> {
  const systemMsg =
    `你是 2026 年爆款短劇與網文的標題大師。請根據故事實際內容，想一個點擊率極高的標題。\n\n` +
    `【標題三要點】\n` +
    `1. 必須包含強烈衝突、極端反差或懸念對白。要讓人一看就想知道「到底發生甚麼事」。\n` +
    `2. 標題提到的畫面或情節，必須是全文真實出現過的，不可以編造一個內文沒有的場面。\n` +
    `3. 字數控制在 8-16 字。\n\n` +
    // 2026-10-04：舊例子「簽下離婚協議那夜…」「替嫁當晚…」令模型篇篇寫「XX那刻/那夜，YY」，已換走。
    `【句式參考（學結構，不要抄內容；每次換一種，不要總是用同一種）】\n` +
    `- 角色最狠的一句對白，例如：叫我一聲老公，這條命給你\n` +
    `- 一句反問，例如：誰准你替我認罪？\n` +
    `- 身份反差直述，例如：被我開除的實習生，是新來的總監\n` +
    `- 帶數字的懸念，例如：第三張診斷書上，寫著我的名字\n` +
    `- 一個動作加一個後果，例如：我撕了同意書，全場不敢出聲\n` +
    `- 不要用「某時刻（那刻／那夜／那天／當晚／之後），某結果」這種時間點開頭的句式。\n\n` +
    `【禁止】\n` +
    `- 禁止「XX的YY」「XX之YY」這類老土句式。\n` +
    `- 必須用繁體字，不可以有簡體字或粵語口語詞（例如「嘅」「唔」「佢」「咗」「冇」）。\n` +
    // 2026-08-19 實測補鑊：出過「她媽的錄音帶，藏著他爸的命」——語意上係「她母親的錄音帶」，
    // 但「她媽的」三個字連讀似粗口，做標題好易俾人誤讀。要明文避開。
    `- 禁止出現會被誤讀成粗話的字組合（例如「她媽的」「他媽的」）。要提到母親一律寫「母親」或「媽媽留下的」，不要用「她媽的X」這種寫法。\n\n` +
    `只輸出標題本身，不要加引號、解釋或其他文字。`;
  let userMsg =
    `以下是故事全文，請根據這個故事的實際內容想一個標題：\n\n${content}\n\n` +
    `近期已用標題（不可以與這些重複或高度相似，句式也要不同）：${recentTitles.join("、") || "無"}`;
  let lastTitle = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0 && Date.now() > deadline) break; // 時間唔夠就用住上一個
    const raw = await deepseekChat(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      { model: "deepseek-chat", temperature: 0.95, maxTokens: 100, timeoutMs: 40_000 }
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

// ================================================================================
// Premise-First 第一階段：先生成一個 100 字內嘅極端衝突 premise，過咗張力審查先寫全文。
// 呢個係今次大改嘅核心——舊系統直接由「骨架+slot」拼砌就寫全文，拼出嚟只係「設定」，
// 冇「一句話講到你想睇落去」嘅衝突。分開兩階段之後，可以喺好平嘅成本下重試 premise，
// 唔使成篇 3000 字寫完先發現個故事本身唔吸引。
// ================================================================================
async function generatePremise(
  hook: HookEngine,
  stake: string,
  heroineName: string,
  heroName: string,
  recentPremises: string[]
): Promise<string> {
  const systemMsg =
    `你是 2026 年爆款短劇的首席編劇。你的工作是想出一句話就能讓人想追下去的極端衝突開局。\n\n` +
    `【要求】\n` +
    `- 100 字以內，繁體中文，寫成一段連貫的敘述（不要分點、不要標題、不要解釋）。\n` +
    `- 必須包含：①主角當下面對的極端困境或羞辱 ②今次指定的籌碼（見下）③一個立刻讓人意外的轉折或懸念。\n` +
    `- 必須是「正在發生」的場面，不是背景設定。\n` +
    // 2026-08-19 次輪實測補鑊：模型將男主寫成女主親生父親（「妳是我三年前弄丟的女兒」），
    // 完全破壞言情關係。要明文鎖死男女主必須係可以發展感情嘅對等成年人。
    `- 男主女主必須是可以發展感情關係的對等成年人。嚴禁把兩人寫成父女、母子、兄妹、姊弟或任何血緣親屬關係。\n` +
    // 2026-08-19 Stephanie 澄清：職場鬥爭 OK，商戰唔要。原本兩樣綁埋一齊禁，而家拆開。
    `- 嚴禁商戰：企業收購、股權爭奪、集團鬥爭、董事會奪權這一類不准寫。但職場上的個人衝突（被上司針對、被同事搶功、被誣陷、被逼頂罪）可以寫，而且鼓勵。\n` +
    `- 嚴禁鬼怪靈異恐怖。籌碼要用個人向的東西。\n` +
    `- 嚴禁寫成平靜的日常相處、合租同居、兩個人慢慢互相理解。\n` +
    // 2026-08-19 首輪實測補鑊：新 prompt 一放開「極端衝突」，模型即刻衝去獵奇題材
    // （代孕合約、驗孕棒、收養證明揭發兄妹關係）同埋返晒去豪門總裁設定——前者品味出事，
    // 後者係 08-03 Stephanie 反饋「太商業」之後剔走嘅方向（註：佢原話只係「太商業」，
    // 「唔要豪門財閥」係當時 implement 嘅方式，唔係佢落嘅硬規；08-19 已同佢澄清清楚）。
    `- 嚴禁豪門、財閥、總裁、繼承人、家族聯姻這類設定。主角要係普通人，籌碼要係普通人有共鳴的東西。\n` +
    `- 嚴禁用獵奇題材製造衝擊：不可以出現代孕、懷孕測試、墮胎、亂倫或兄妹戀暗示、未成年情節、性交易。\n` +
    `  衝突必須來自「處境的壓迫」同「主角要做的選擇」，不是來自禁忌題材本身。\n\n` +
    `【今次要用的 Hook 引擎】\n` +
    `類型：${hook.name}\n核心驅動力：${hook.driver}\n\n` +
    `【今次指定的籌碼（必須用這個，不可以換成別的，尤其不可以又寫成親人做手術籌醫藥費）】\n${stake}\n\n` +
    `【張力標尺（示範這個強度，但嚴禁抄襲它的情節、職業、場景或對白）】\n${hook.seed}\n\n` +
    `你必須寫一個跟示範完全不同的故事——不同的處境、不同的關係、不同的籌碼、不同的轉折。`;

  const userMsg =
    `女主姓名：${heroineName}，男主姓名：${heroName}。\n` +
    (recentPremises.length
      ? `\n【近期已經用過的開局，必須完全避開，不可以寫類似的情境】\n${recentPremises.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`
      : "") +
    `\n只輸出 premise 本身，不要加任何前綴、引號或說明。`;

  const raw = await deepseekChat(
    [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
    { model: "deepseek-chat", temperature: 1.1, maxTokens: 300, timeoutMs: 45_000 }
  );
  return raw.trim().replace(/^["「『]+|["」』]+$/g, "");
}

// Premise 張力閘門：好平（maxTokens 30）嘅一次 call，攔住悶開局，唔使浪費成篇長文先發現唔掂。
// fail-safe：judge 本身出錯就當 pass，唔可以因為個 judge 掛咗就成日冇故事生成。
async function judgePremiseTension(premise: string): Promise<boolean> {
  const prompt =
    `以下是一個短劇故事的開局設定。請嚴格評估它是否達到 2026 年爆款短劇的標準。\n\n` +
    `合格條件（必須全部滿足）：\n` +
    `1. 有立即的、正在發生的高壓衝突（不是背景交代）\n` +
    `2. 有明確而具體的籌碼（輸了會即刻失去某樣東西）\n` +
    `3. 有讓人想知道「然後呢」的懸念或意外轉折\n\n` +
    `開局：「${premise}」\n\n` +
    `只輸出 JSON，不要其他文字：{"pass": true} 或 {"pass": false}`;
  try {
    const raw = await deepseekChat([{ role: "user", content: prompt }], {
      model: "deepseek-chat",
      temperature: 0,
      maxTokens: 30,
      timeoutMs: 20_000,
    });
    const m = raw.match(/\{[\s\S]*?\}/);
    if (!m) return true;
    const parsed = JSON.parse(m[0]) as { pass?: boolean };
    return parsed.pass ?? true;
  } catch {
    return true; // fail-safe
  }
}

// 非爽文線嘅開局生成（爽文線沿用上面 generatePremise）
async function generateLanePremise(
  lane: Lane,
  angle: string,
  names: string,
  recentPremises: string[]
): Promise<string> {
  const systemMsg =
    `你是熱門網絡小說的策劃編輯，專門想出讓人一看就停不下來的開局。\n\n` +
    `【本篇故事線】${lane.name}\n` +
    `【開局必須包含】${lane.premiseGuide}\n` +
    `【今次指定的切入點（必須用）】${angle}\n\n` +
    `【要求】\n` +
    `- 100 字以內，繁體中文，寫成一段連貫敘述（不要分點、不要標題、不要解釋）。\n` +
    `- 必須是「正在發生」的場面，不是背景設定。\n` +
    `- 讀完要讓人立刻冒出一個具體問題，而且很想知道答案。\n` +
    `${COMMON_BANS}\n` +
    `【張力標尺（示範這個吸引力水平，但嚴禁抄襲它的情節、職業、場景或對白）】\n${lane.seeds.join("\n")}`;
  const userMsg =
    `主要人物姓名：${names}（可以只用其中一個，但不要改姓氏）。\n` +
    (recentPremises.length
      ? `\n【近期已經用過的開局，必須完全避開】\n${recentPremises.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`
      : "") +
    `\n只輸出開局本身，不要加任何前綴、引號或說明。`;
  const raw = await deepseekChat(
    [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
    { model: "deepseek-chat", temperature: 1.1, maxTokens: 300, timeoutMs: 45_000 }
  );
  return raw.trim().replace(/^["「『]+|["」』]+$/g, "");
}

async function judgeLanePremise(premise: string, lane: Lane): Promise<boolean> {
  const prompt =
    `以下是一個「${lane.name}」類網絡小說的開局。請嚴格評估它能不能讓普通讀者想繼續看下去。\n\n` +
    `合格條件（必須全部滿足）：\n` +
    `1. 是正在發生的場面，不是背景交代\n` +
    `2. 讀完會冒出一個具體、想知道答案的問題\n` +
    `3. ${lane.judgeHint}\n\n` +
    `開局：「${premise}」\n\n` +
    `只輸出 JSON，不要其他文字：{"pass": true} 或 {"pass": false}`;
  try {
    const raw = await deepseekChat([{ role: "user", content: prompt }], {
      model: "deepseek-chat",
      temperature: 0,
      maxTokens: 30,
      timeoutMs: 20_000,
    });
    const m = raw.match(/\{[\s\S]*?\}/);
    if (!m) return true;
    return (JSON.parse(m[0]) as { pass?: boolean }).pass ?? true;
  } catch {
    return true; // fail-safe
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
type ReaderScore = { p25: number; p50: number; p75: number; end: number; total: number; drop: string };

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

async function readerJudge(content: string): Promise<ReaderScore | null> {
  const prompt =
    `你是一個每天在手機上看網絡小說的普通讀者，口味挑剔、很容易棄書：一覺得悶、看不懂、不相信，就會立刻關掉。\n` +
    `下面的故事中插入了【讀者位置 25%】【讀者位置 50%】【讀者位置 75%】三個標記。\n` +
    `請你誠實地代入這個讀者，在每個標記處評分「此刻有多想繼續看下去」（1-10 分），讀完後再評「讀完的滿足感」（1-10 分）。\n` +
    `評分要嚴格：普通的故事只值 5-6 分，只有真正讓人停不下來的才給 8 分以上。\n\n` +
    `${insertReadMarks(content)}\n\n` +
    `只輸出 JSON，不要其他文字：{"p25":分數,"p50":分數,"p75":分數,"end":分數,"drop":"最可能棄書的位置與原因，20 字內"}`;
  try {
    const raw = await deepseekChat([{ role: "user", content: prompt }], {
      model: "deepseek-chat",
      temperature: 0,
      maxTokens: 120,
      timeoutMs: 40_000,
    });
    const m = raw.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as Partial<ReaderScore>;
    const n = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 10 ? v : 0);
    const s = { p25: n(j.p25), p50: n(j.p50), p75: n(j.p75), end: n(j.end) };
    return { ...s, total: s.p25 + s.p50 + s.p75 + s.end, drop: String(j.drop ?? "").slice(0, 40) };
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
  deadline: number
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
      { model: "deepseek-chat", temperature, maxTokens: 6000, timeoutMs: 110_000 }
    );
    const c = normalizeSections(
      (raw.split("===CONTENT===")[1]?.split("===END===")[0]?.trim()) || raw.trim()
    );
    if (c) content = c;

    const fails = validateContent(content, storyType);
    const n = sectionCount(content);
    if (n < 3 || n > 5) fails.push(`分節數不對（${n}節，要3-4節，用單獨一行${SECTION_MARK}分隔）`);
    if (fails.length === 0) {
      const closureOk = await selfCheckClosure(content, storyType).catch(() => true);
      if (closureOk) return { content, pass: true, validateNote: "PASS", retries: attempt, form: form.key, score: null };
      fails.push(storyType === "short" ? "冇完整收尾" : "冇停喺抉擇節點");
    }
    retries = attempt + 1;
    validateNote = fails.join("；");
    userMsg = `${firstMsg}\n\n⚠️重寫：上一次不合格，原因：${validateNote}。請修正這些問題再寫一次。`;
  }
  return { content, pass: false, validateNote, retries, form: form.key, score: null };
}

async function generateOne(
  storyType: StoryType,
  lane: Lane,
  recentTitles: string[],
  recentSurnames: Set<string>,
  recentMetas: GenMeta[],
  forcedHook?: HookEngine
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
  const recentPremises = recentMetas
    .map((m) => m?.premise)
    .filter(Boolean)
    .slice(0, 6) as string[];

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
    const heroineName = pickName(recentSurnames, FEMALE_GIVEN);
    const heroName = pickName(new Set([...recentSurnames, heroineName[0]]), MALE_GIVEN);
    protagonist = `${heroineName}、${heroName}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const p = await generatePremise(hook, stake, heroineName, heroName, recentPremises).catch(() => "");
      if (!p) continue;
      premise = p;
      // 商戰詞喺 premise 層就要攔（正文層攔唔到，因為 retry 會用返同一個 premise）
      const bizHit = BUSINESS_WAR_WORDS.find((w) => p.includes(w));
      if (bizHit) {
        premiseNote = `premise撞商戰詞(${bizHit})`;
        continue;
      }
      if (await judgePremiseTension(p)) {
        premiseNote = attempt === 0 ? "premise一次過" : "premise重試1次";
        break;
      }
      premiseNote = "premise張力不足(已用最後一次)";
    }
    genMeta = { lane: lane.key, hook: hook.key, stake, premise };
    systemMsg = `${STYLE_2026_SHUANGWEN}\n${COMMON_READ_THROUGH}`;
    laneLine =
      `【Hook 類型】${hook.name}——${hook.driver}\n` +
      `女主姓名：${heroineName}，男主姓名：${heroName}（名字可微調，但不要改姓氏）。`;
  } else {
    // ---- 其他線：切入點池＋本線開局指引 ----
    const angle = pick(lane.angles, recentAngles(recentMetas));
    genre = pick(lane.genres);
    const mainPool = Math.random() < 0.5 ? FEMALE_GIVEN : MALE_GIVEN;
    const mainName = pickName(recentSurnames, mainPool);
    const sideName = pickName(
      new Set([...recentSurnames, mainName[0]]),
      mainPool === FEMALE_GIVEN ? MALE_GIVEN : FEMALE_GIVEN
    );
    protagonist = `${mainName}、${sideName}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const p = await generateLanePremise(lane, angle, `${mainName}、${sideName}`, recentPremises).catch(() => "");
      if (!p) continue;
      premise = p;
      const bizHit = BUSINESS_WAR_WORDS.find((w) => p.includes(w));
      if (bizHit) {
        premiseNote = `premise撞商戰詞(${bizHit})`;
        continue;
      }
      if (await judgeLanePremise(p, lane)) {
        premiseNote = attempt === 0 ? "premise一次過" : "premise重試1次";
        break;
      }
      premiseNote = "premise張力不足(已用最後一次)";
    }
    genMeta = { lane: lane.key, angle, premise };
    systemMsg = `${COMMON_BANS}\n${lane.style}\n${COMMON_READ_THROUGH}`;
    laneLine = `【故事線】${lane.name}\n【切入點】${angle}\n主要人物：${mainName}、${sideName}（名字可微調，但不要改姓氏；不一定要寫成愛情）。`;
  }

  const structure = storyType === "serial" ? SERIAL_STRUCTURE : SHORT_STRUCTURE;
  systemMsg = `${systemMsg}\n${structure}`;
  const baseUserMsg =
    `【故事開局（必須嚴格按這個開局展開，不可以改成另一個故事）】\n${premise}\n\n` +
    `${laneLine}\nstory_type：${storyType}。\n\n` +
    `請由這個開局的第一秒寫起（第一句就是現場，不要重新交代背景），寫成完整正文，分 3 至 4 節，節與節之間單獨一行寫「${SECTION_MARK}」。\n` +
    `只寫正文，不需要想標題（標題另外處理）。\n` +
    `輸出格式必須是：\n===CONTENT===\n（全文）\n===END===\n不要加任何其他文字或解釋。`;

  // ---- 雙稿並行：A 稿一般敘事；B 稿一半機會試其他敘事形式 ----
  const formB = Math.random() < 0.5 ? pickForm(lane.key, storyType) : NARRATIVE_FORMS[0];
  const deadline = t0 + 150_000;
  const draftResults = await Promise.allSettled([
    writeDraft(systemMsg, baseUserMsg, storyType, NARRATIVE_FORMS[0], 1.0, deadline),
    writeDraft(systemMsg, baseUserMsg, storyType, formB, 1.1, deadline),
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
  const scores = await Promise.all(drafts.map((d) => readerJudge(d.content)));
  drafts.forEach((d, i) => (d.score = scores[i]));
  const ranked = [...drafts].sort(
    (a, b) => Number(b.pass) - Number(a.pass) || (b.score?.total ?? -1) - (a.score?.total ?? -1)
  );
  const best = ranked[0];

  genMeta.form = best.form;
  genMeta.judge = drafts.map((d) => ({
    form: d.form,
    pass: d.pass,
    total: d.score?.total ?? null,
    p25: d.score?.p25 ?? null,
    p50: d.score?.p50 ?? null,
    p75: d.score?.p75 ?? null,
    end: d.score?.end ?? null,
    drop: d.score?.drop ?? "",
    picked: d === best,
  }));

  const title = await generateTitle(best.content, recentTitles, t0 + 270_000);

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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runStart = Date.now();
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

  // 2026-08-19：short / serial 由順序執行改做並行（Gemini review 建議）——加咗 premise
  // 階段之後 call 數上升，並行可以將 wall-clock 由「兩篇相加」變成「較慢嗰篇」，
  // 留返足夠 headroom 俾 Vercel 300 秒上限。
  // ⚠️ 代價：兩篇唔會再互相排除標題/hook（原本順序跑會將前一篇 unshift 入 recentMetas）。
  // 補償做法：預先幫兩篇各自 reserve 一個唔同嘅 hook，避免同一個 run 入面撞同一個 hook。
  const reservedHooks = new Set(recentHooks(recentMetas));
  const hookForShort = pickHook(reservedHooks);
  reservedHooks.add(hookForShort.key);
  const hookForSerial = pickHook(reservedHooks);

  // 2026-10-04：故事線——同一個 run 兩篇一定唔同線，並盡量避開上一個 run 用過嘅線。
  // 可以用 ?lane=dark_humor 之類強制指定（淨係方便人手測試；cron 唔會帶）。
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const forceLane = LANES.find((l) => l.key === req.nextUrl.searchParams.get("lane"));
  const laneExclude = recentLanes(recentMetas);
  const laneForShort = forceLane && forceLane.types.includes("short") ? forceLane : pickLane("short", laneExclude);
  const laneForSerial =
    forceLane && forceLane.types.includes("serial")
      ? forceLane
      : pickLane("serial", new Set([...laneExclude, laneForShort.key]));

  const settled = await Promise.allSettled(
    ([
      ["short", laneForShort, hookForShort],
      ["serial", laneForSerial, hookForSerial],
    ] as [StoryType, Lane, HookEngine][]).map(([storyType, lane, forcedHook]) =>
      generateOne(storyType, lane, recentTitles, recentSurnames, recentMetas, forcedHook).then(
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

