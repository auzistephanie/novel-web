import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closureFailNote, nextSeriesOrder, pickLaneByWeight, resolveForcedLane } from "./lanePick";
import { KANBUJIAN_CLOSURE_CHECK, LANES, LANE_FORMS, THIRD_PERSON_LANES } from "../app/api/cron/generate-stories/route";

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

  it("is a manual-only short lane in the existing warm genre", () => {
    assert.ok(lane);
    assert.equal(lane?.name, "看不見的好");
    assert.equal(lane?.weight, 0);
    assert.deepEqual(lane?.types, ["short"]);
    assert.deepEqual(lane?.genres, ["溫情反轉"]);
    assert.ok(lane && lane.angles.length >= 3);
    assert.deepEqual(lane?.seeds, [
      "《他不識字》：阿昌不識字，年邁仍在世；女兒在衣櫃底找到一盒用畫寫成的信。",
      "《慢半拍》：父親入院那晚只有他不慌，記得帶父親最愛的杯子。",
      "《收銀機旁的撲滿》：撲滿裡全是老闆娘替街坊墊付的錢。",
    ]);
  });

  it("states the prop callback in written Chinese and bans the listed topics", () => {
    assert.ok(lane);
    const prose = [lane?.style, lane?.premiseGuide, lane?.judgeHint, KANBUJIAN_CLOSURE_CHECK].join("\n");
    for (const word of ["反差", "日常細節", "長輩", "實物", "callback", "金句", "不說教", "不直述感情", "收口"]) {
      assert.equal(prose.includes(word), true, word);
    }
    for (const ban of ["失蹤", "車禍", "警察", "猝死", "產權", "商戰", "開放結局"]) {
      assert.equal(lane?.style.includes(ban), true, ban);
    }
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

  it("has a form list and is excluded from both random rotations", () => {
    for (const item of LANES) {
      assert.ok(LANE_FORMS[item.key]?.includes("normal"), item.key);
    }
    assert.ok(LANE_FORMS.kanbujian.includes("third_person"));
    assert.ok(THIRD_PERSON_LANES.includes("kanbujian"));
    assert.equal(resolveForcedLane(LANES, "kanbujian", "short")?.key, "kanbujian");
    assert.equal(resolveForcedLane(LANES, "kanbujian", "serial"), null);
    for (const storyType of ["short", "serial"] as const) {
      for (let i = 0; i < 80; i++) {
        const picked = pickLaneByWeight(LANES, storyType, new Set());
        assert.notEqual(picked.key, "kanbujian");
        assert.ok(picked.weight > 0);
        assert.ok(picked.types.includes(storyType));
      }
    }
    const positiveShort = LANES.filter((item) => item.types.includes("short") && item.weight > 0).map((item) => item.key);
    const fallback = pickLaneByWeight(LANES, "short", new Set(positiveShort));
    assert.notEqual(fallback.key, "kanbujian");
  });
});
