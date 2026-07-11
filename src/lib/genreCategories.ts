// 大類（顯示分組用）— 唔改資料庫 genre 值，純前端 mapping
// 2026-07-11 落實：23個現存細類 + daily-novel SYSTEMS.md phase2 新增細類，全部歸落 7 個大類
// 判斷準則：跟「核心情緒賣點」分類，唔跟「敘事機制」（重生/穿越/系統呢啲淨係手法）

export type CategoryColor = {
  bar: string;
  text: string;
  bg: string;
};

export type ParentCategory = {
  key: string;
  label: string;
  genres: string[];
  color: CategoryColor;
};

// 大類固定色（復古花磚色系）— 揀新色時避開現有色，7 大類已用晒 7 隻分明色
// 加新大類記得同時加 color，唔好留空跌 fallback 灰
export const PARENT_CATEGORIES: ParentCategory[] = [
  {
    key: "sweet-ceo",
    label: "總裁甜寵",
    genres: ["總裁甜寵", "甜寵逆襲", "暗戀"],
    color: { bar: "#c1503a", text: "#c1503a", bg: "rgba(193,80,58,0.1)" }, // 磚紅橙
  },
  {
    key: "revenge-romance",
    label: "復仇虐戀",
    genres: [
      "死遁離婚",
      "復仇歸來",
      "前任悔恨記",
      "重生虐戀復仇",
      "追妻火葬場",
      "雙重生",
    ],
    color: { bar: "#7a3b32", text: "#7a3b32", bg: "rgba(122,59,50,0.1)" }, // 酒紅棕
  },
  {
    key: "hidden-identity",
    label: "馬甲身份",
    genres: [
      "穿書反派",
      "馬甲千金",
      "馬甲文",
      "團寵真千金",
      "豪門真假身份",
      "懸疑言情",
    ],
    color: { bar: "#3a5f8a", text: "#3a5f8a", bg: "rgba(58,95,138,0.1)" }, // 靛藍
  },
  {
    key: "comeback",
    label: "翻身逆襲",
    genres: [
      "職場逆襲",
      "學霸裝弱",
      "商戰逆襲",
      "重生逆襲",
      "重生", // 舊 tag，等同「重生逆襲」
      "打臉爽文",
      "贅婿稱王",
    ],
    color: { bar: "#c99a3c", text: "#a97e26", bg: "rgba(201,154,60,0.15)" }, // 金黃
  },
  {
    key: "period-drama",
    label: "古言宮廷",
    genres: ["古言寵妃", "替嫁先婚後愛", "宮鬥", "穿越古代稱霸", "雙強對峙"],
    color: { bar: "#8c2f3a", text: "#8c2f3a", bg: "rgba(140,47,58,0.1)" }, // 硃紅
  },
  {
    key: "system-scifi",
    label: "系統腦洞",
    genres: ["系統流", "末世腦洞", "玄學風水", "漫畫感爽文"],
    color: { bar: "#5c4a7a", text: "#5c4a7a", bg: "rgba(92,74,122,0.1)" }, // 紫
  },
  {
    key: "urban-life",
    label: "都市日常",
    genres: [
      "家庭倫理",
      "都市隱世強者",
      "都市情緒流",
      "都市", // 舊 tag，等同「都市日常」
    ],
    color: { bar: "#2f4a3e", text: "#2f4a3e", bg: "rgba(47,74,62,0.1)" }, // 墨綠
  },
];

const FALLBACK_KEY = "other";
const FALLBACK_LABEL = "其他";
const FALLBACK_COLOR: CategoryColor = {
  bar: "#8a8378",
  text: "#8a8378",
  bg: "rgba(138,131,120,0.1)",
}; // 灰 — 未歸類大類嘅預設色，加新大類時記得補返個正式 color

// genre 字串 → 大類 lookup（建構一次，之後 O(1) 查）
const GENRE_TO_PARENT = new Map<string, ParentCategory>();
for (const parent of PARENT_CATEGORIES) {
  for (const g of parent.genres) {
    GENRE_TO_PARENT.set(g, parent);
  }
}

export function getParentCategory(genre: string): ParentCategory {
  return (
    GENRE_TO_PARENT.get(genre) ?? {
      key: FALLBACK_KEY,
      label: FALLBACK_LABEL,
      genres: [genre],
      color: FALLBACK_COLOR,
    }
  );
}

export function getParentByKey(key: string): ParentCategory | undefined {
  return PARENT_CATEGORIES.find((p) => p.key === key);
}
