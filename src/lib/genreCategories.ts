// 大類（顯示分組用）— 唔改資料庫 genre 值，純前端 mapping
// 2026-07-11 落實：23個現存細類 + daily-novel SYSTEMS.md phase2 新增細類，全部歸落 7 個大類
// 判斷準則：跟「核心情緒賣點」分類，唔跟「敘事機制」（重生/穿越/系統呢啲淨係手法）

export type ParentCategory = {
  key: string;
  label: string;
  genres: string[];
};

export const PARENT_CATEGORIES: ParentCategory[] = [
  {
    key: "sweet-ceo",
    label: "總裁甜寵",
    genres: ["總裁甜寵", "甜寵逆襲", "暗戀"],
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
  },
  {
    key: "period-drama",
    label: "古言宮廷",
    genres: ["古言寵妃", "替嫁先婚後愛", "宮鬥", "穿越古代稱霸", "雙強對峙"],
  },
  {
    key: "system-scifi",
    label: "系統腦洞",
    genres: ["系統流", "末世腦洞", "玄學風水", "漫畫感爽文"],
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
  },
];

const FALLBACK_KEY = "other";
const FALLBACK_LABEL = "其他";

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
    }
  );
}

export function getParentByKey(key: string): ParentCategory | undefined {
  return PARENT_CATEGORIES.find((p) => p.key === key);
}
