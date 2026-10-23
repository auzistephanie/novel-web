import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closureFailNote, nextSeriesOrder, pickLaneByWeight, resolveForcedLane } from "./lanePick";
import { buildLanePremiseSystem, buildShuangwenPremiseSystem, buildTitleSystem, KANBUJIAN_CLOSURE_CHECK, LANES, LANE_FORMS, THIRD_PERSON_LANES } from "../app/api/cron/generate-stories/route";

const FIXTURE = [
  { key: "alpha", weight: 3, types: ["short", "serial"] },
  { key: "beta", weight: 2, types: ["short"] },
  { key: "zero", weight: 0, types: ["short"] },
] as const;

describe("weight 0 lanes stay out of rotation", () => {
  it("never returns a zero-weight lane, including when it is last and random is almost 1", () => {
    const real = Math.random;
    try {
      for (const roll of [0, 0.0000001, 0.5, 0.999999999]) {
        Math.random = () => roll;
        for (let i = 0; i < 20; i++) {
          const picked = pickLaneByWeight(FIXTURE, "short", new Set());
          assert.notEqual(picked.key, "zero");
          assert.ok(picked.weight > 0);
        }
      }
    } finally {
      Math.random = real;
    }
  });

  it("falls back to other positive lanes when the preferred ones are excluded", () => {
    const real = Math.random;
    try {
      Math.random = () => 0;
      const picked = pickLaneByWeight(FIXTURE, "short", new Set(["alpha", "beta"]));
      assert.equal(picked.key, "alpha");
    } finally {
      Math.random = real;
    }
    assert.throws(() => pickLaneByWeight([{ key: "zero", weight: 0, types: ["short"] }], "short", new Set()), /正權重/);
  });

  it("still resolves a manual lane request when weight is 0", () => {
    assert.equal(resolveForcedLane(FIXTURE, "zero", "short")?.key, "zero");
    assert.equal(resolveForcedLane(FIXTURE, "zero", "serial"), null);
    assert.equal(resolveForcedLane(FIXTURE, "missing", "short"), null);
    assert.equal(resolveForcedLane(FIXTURE, null, "short"), null);
    assert.equal(resolveForcedLane(FIXTURE, "", "short"), null);
  });
});

describe("series order", () => {
  it("starts at 1 and increments only inside the same series", () => {
    assert.equal(nextSeriesOrder(null, "kanbujian"), 1);
    assert.equal(nextSeriesOrder([], "kanbujian"), 1);
    assert.equal(
      nextSeriesOrder(
        [
          { series: { key: "kanbujian", order: 1 } },
          { series: { key: "other", order: 9 } },
          null,
          { series: null },
          { series: { key: "kanbujian", order: Number.NaN } },
          { series: { key: "kanbujian", order: 4 } },
        ],
        "kanbujian"
      ),
      5
    );
    assert.equal(nextSeriesOrder([{ series: { key: "kanbujian", order: 2.9 } }], "kanbujian"), 3);
  });
});

describe("kanbujian lane", () => {
  const lane = LANES.find((item) => item.key === "kanbujian");

  it("uses the median short-lane weight and the existing warm genre", () => {
    assert.ok(lane);
    assert.equal(lane?.name, "看不見的好");
    const otherShort = LANES.filter((item) => item.key !== "kanbujian" && item.types.includes("short")).map((item) => item.weight).sort((a, b) => a - b);
    const mid = Math.floor(otherShort.length / 2);
    const median = otherShort.length % 2 === 0 ? (otherShort[mid - 1] + otherShort[mid]) / 2 : otherShort[mid];
    assert.equal(median, 2);
    assert.equal(lane?.weight, median);
    assert.deepEqual(lane?.types, ["short"]);
    assert.deepEqual(lane?.genres, ["溫情反轉"]);
    assert.ok(lane && lane.angles.length >= 3);
    assert.deepEqual(lane?.seeds, [
      "社區廚房打烊前，義工把最後一鍋湯盛進保溫袋。新人以為他要帶回家，直到看見袋子被掛在晚班清潔工一定會經過的門把上。",
      "琴行老師每天把學生落下的樂譜收進抽屜。學生以為被沒收，下一堂打開，每一處折角都被熨平，鉛筆註記還在。",
    ]);
    for (const angle of [
      "他不識字，年邁的父親仍在世，女兒在衣櫃底找到一盒用畫寫成的信",
      "醫院裡人人說他慢半拍，他卻記得帶上父親最愛的杯子",
      "雜貨店收銀機旁的撲滿，裡面是老闆替街坊墊付的錢",
      "外婆搬離舊居前交出寫滿「欠款」的記帳本，孫女去討才發現全是外婆怕鄰居難堪而寫成借據的救急錢",
      "父親退休前每天說順路載女兒去車站，她考了駕照看導航才發現那條路繞了半個城市",
      "租屋處老電扇吹了五年沒壞，搬家那天房東太太才說漏嘴，樓下木訥的房東兒子每半年趁她上班時換一次零件",
    ]) {
      assert.equal(lane?.angles.includes(angle), true, angle);
    }
    const seedText = lane?.seeds.join("\n") ?? "";
    for (const blocked of ["衣櫃", "撲滿", "記帳本", "導航", "電扇", "不識字"]) {
      assert.equal(seedText.includes(blocked), false, blocked);
    }
  });

  it("states the prop callback in written Chinese and bans the listed topics", () => {
    assert.ok(lane);
    const prose = [lane?.style, lane?.premiseGuide, lane?.judgeHint, KANBUJIAN_CLOSURE_CHECK].join("\n");
    for (const word of ["反差", "日常細節", "長輩", "實物", "callback", "金句", "不說教", "不直述感情", "收口"]) {
      assert.equal(prose.includes(word), true, word);
    }
    for (const ban of ["失蹤", "車禍", "警察", "猝死", "產權", "商戰", "開放結局", "過世", "去世", "離世", "遺物"]) {
      assert.equal(lane?.style.includes(ban), true, ban);
    }
    const cozy = LANES.find((item) => item.key === "cozy_shop");
    assert.match(cozy?.style ?? "", /過世/);
    assert.match(cozy?.style ?? "", /遺物/);
    for (const spoken of ["嘅", "唔", "佢", "咗", "冇"]) {
      assert.equal(lane?.style.includes(spoken), false, spoken);
      assert.equal(lane?.premiseGuide.includes(spoken), false, spoken);
      assert.equal(lane?.judgeHint.includes(spoken), false, spoken);
    }
    assert.match(KANBUJIAN_CLOSURE_CHECK, /前半/);
    assert.match(KANBUJIAN_CLOSURE_CHECK, /最後一段/);
    assert.equal(closureFailNote("short", "kanbujian"), "道具未回收:道具要早出現，最後一段 callback，結局要收口");
    assert.equal(closureFailNote("short", "warm_twist"), "沒有完整收尾");
    assert.equal(closureFailNote("serial"), "沒有停在抉擇節點");
  });

  it("can be picked in the daily short rotation, and ?lane= still works", () => {
    for (const item of LANES) {
      assert.ok(LANE_FORMS[item.key]?.includes("normal"), item.key);
    }
    assert.ok(LANE_FORMS.kanbujian.includes("third_person"));
    assert.ok(THIRD_PERSON_LANES.includes("kanbujian"));
    assert.equal(resolveForcedLane(LANES, "kanbujian", "short")?.key, "kanbujian");
    assert.equal(resolveForcedLane(LANES, "kanbujian", "serial"), null);

    const otherShort = LANES.filter((item) => item.types.includes("short") && item.key !== "kanbujian").map((item) => item.key);
    assert.equal(pickLaneByWeight(LANES, "short", new Set(otherShort)).key, "kanbujian");

    let shortHits = 0;
    for (let i = 0; i < 400; i++) {
      const picked = pickLaneByWeight(LANES, "short", new Set());
      if (picked.key === "kanbujian") shortHits += 1;
      assert.ok(picked.weight > 0);
      assert.ok(picked.types.includes("short"));
    }
    assert.ok(shortHits > 0);

    for (let i = 0; i < 80; i++) {
      const picked = pickLaneByWeight(LANES, "serial", new Set());
      assert.notEqual(picked.key, "kanbujian");
      assert.ok(picked.types.includes("serial"));
    }
  });
});

describe("generation prompts", () => {
  it("locks written Chinese, abstract titles, and first-person premise rules", () => {
    const premise = buildShuangwenPremiseSystem({ name: "倒數死線", driver: "時間壓迫", seed: "示範開局" }, "一筆還不出的錢");
    assert.match(premise, /主角必須是普通人，籌碼必須是普通人有共鳴的東西/);
    assert.equal(premise.includes("主角要係普通人"), false);
    assert.match(premise, /用人單位/);
    assert.match(premise, /絕對禁止任何粵語/);

    const humor = LANES.find((item) => item.key === "dark_humor");
    const kanbujian = LANES.find((item) => item.key === "kanbujian");
    assert.ok(humor && kanbujian);
    const humorPrompt = buildLanePremiseSystem(humor, humor.angles[0]);
    assert.match(humorPrompt, /第一個主角名字即為第一人稱「我」的本名，內文「我」不得另取新名/);
    const kanPrompt = buildLanePremiseSystem(kanbujian, "被人當成冷淡的長輩，每天重複一個沒有人明白的小動作");
    assert.match(kanPrompt, /嚴禁抄襲它的情節、職業、場景/);
    assert.match(kanPrompt, /過世/);
    assert.equal(kanPrompt.includes("撲滿"), false);
    assert.equal(kanPrompt.includes("衣櫃"), false);

    const title = buildTitleSystem();
    assert.match(title, /標題只可取材自第 1–2 節已出現的設定與動作/);
    assert.match(title, /誰准你／妳/);
    assert.equal(title.includes("被我開除的實習生，是新來的總監"), false);
    assert.equal(title.includes("誰准你替我認罪"), false);
    assert.equal(title.includes("實習生"), false);
  });
});
