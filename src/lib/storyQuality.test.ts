import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANNED_TOPIC_PROMPT,
  BANNED_TOPIC_WORDS,
  BUSINESS_WAR_PROMPT,
  BUSINESS_WAR_WORDS,
  FEMALE_GIVEN,
  MALE_GIVEN,
  QUALITY_REPAIR,
  SURNAMES,
  assignCharacterPair,
  candidateNames,
  classifyQualityNote,
  createNameBlock,
  findBannedTopic,
  findBusinessWar,
  findEmptySerialHook,
  findPreachyEnding,
  hktDayKey,
  isHardBlocked,
  nameBlockFromStories,
  premiseBlockReason,
  qualityFailNotes,
} from "./storyQuality";

const SIMPLIFIED = ["渊", "国", "这", "说", "时", "车", "风", "为", "来", "对", "过", "经", "样", "关", "当", "从", "应", "头", "进", "无", "气", "让", "觉", "现", "视", "听", "写", "买", "卖", "龙", "飞", "汇", "价", "历", "传", "轻", "离", "难", "权", "环", "归", "续", "缘", "认", "识", "语", "话", "记", "许", "谁", "个", "见", "长", "东", "问", "汉", "华", "学", "门", "开", "还", "没", "远", "两", "钟", "邓", "叶", "萧", "赵", "郑", "冯", "吴"];

describe("name pool", () => {
  it("expands surnames and given names without duplicates or simplified characters", () => {
    assert.ok(SURNAMES.length >= 50);
    assert.ok(FEMALE_GIVEN.length >= 40);
    assert.ok(MALE_GIVEN.length >= 40);
    assert.equal(new Set(SURNAMES).size, SURNAMES.length);
    assert.equal(new Set([...FEMALE_GIVEN, ...MALE_GIVEN]).size, FEMALE_GIVEN.length + MALE_GIVEN.length);
    const blob = [...SURNAMES, ...FEMALE_GIVEN, ...MALE_GIVEN].join("");
    for (const ch of SIMPLIFIED) assert.equal(blob.includes(ch), false, ch);
  });

  it("blocks full names for 14 days and given names on the same Hong Kong calendar day", () => {
    const now = new Date("2026-10-16T04:30:00.000Z");
    assert.equal(hktDayKey(now), "2026-10-16");
    assert.equal(hktDayKey(new Date("2026-10-15T16:30:00.000Z")), "2026-10-16");
    assert.equal(hktDayKey(new Date("2026-10-15T15:30:00.000Z")), "2026-10-15");

    const block = nameBlockFromStories(
      [
        {
          protagonist: "林晚寧、周承澤",
          created_at: "2026-10-16T02:00:00.000Z",
        },
        {
          protagonist: "蘇知微、裴景行",
          content: "路人提起江書意。",
          created_at: "2026-10-06T04:00:00.000Z",
        },
        {
          protagonist: "秦清和、唐予白",
          created_at: "2026-09-01T04:00:00.000Z",
        },
      ],
      now
    );

    assert.equal(block.full.has("林晚寧"), true);
    assert.equal(block.givenToday.has("晚寧"), true);
    assert.equal(block.givenToday.has("承澤"), true);
    assert.equal(candidateNames("F", block, false).some((n) => n.endsWith("晚寧")), false);
    assert.equal(candidateNames("F", block, false).includes("沈知微"), true);
    assert.equal(candidateNames("F", block, false).includes("蘇知微"), false);
    assert.equal(candidateNames("F", block, false).includes("江書意"), false);
    assert.equal(candidateNames("F", block, false).includes("秦清和"), true);
    assert.equal(block.givenToday.has("知微"), false);
  });

  it("reserves names across two stories so the same run cannot reuse a given name", () => {
    const block = createNameBlock();
    const first = assignCharacterPair(block, ["F", "M"], () => 0);
    const second = assignCharacterPair(block, ["F", "M"], () => 0);
    const givens = [...first, ...second].map((n) => n.slice(1));
    assert.equal(new Set(givens).size, 4);
    assert.equal(new Set([...first, ...second]).size, 4);
  });

  it("falls back to recent surnames but never reuses a blocked full name or today's given name", () => {
    const block = createNameBlock();
    for (const surname of SURNAMES) block.recentSurnames.add(surname);
    block.full.add("沈知微");
    block.givenToday.add("晚寧");
    const [name] = assignCharacterPair(block, ["F", "M"], () => 0);
    assert.notEqual(name, "沈知微");
    assert.equal(name.endsWith("晚寧"), false);
  });

  it("throws when today's given names exhaust the pool", () => {
    const block = createNameBlock();
    for (const given of FEMALE_GIVEN) block.givenToday.add(given);
    assert.throws(() => assignCharacterPair(block, ["F", "M"], () => 0), /姓名池不足/);
  });
});

describe("hard bans and business-war lexicon", () => {
  it("catches the Friday report topics and clear synonyms", () => {
    for (const word of ["失蹤", "車禍", "警察", "殯儀館", "猝死"]) {
      assert.equal(findBannedTopic(`治癒小店裡發生${word}。`), word);
      assert.equal(BANNED_TOPIC_PROMPT.includes(word), true);
    }
    assert.equal(findBannedTopic("她下落不明，店員報了警。"), "下落不明");
    assert.equal(findBannedTopic("巷口有一場交通意外。"), "交通意外");
    assert.equal(findBannedTopic("警方把人帶走。"), "警方");
    assert.equal(findBannedTopic("靈堂裡只剩一盞燈。"), "靈堂");
    assert.equal(findBannedTopic("老闆暴斃之後店還開著。"), "暴斃");
    assert.equal(findBannedTopic("她在車站跟他告別。"), undefined);
  });

  it("catches court-auction property plots without flagging a normal shop", () => {
    for (const word of ["產權", "法院拍賣", "授權書", "標金"]) {
      assert.ok(findBusinessWar(`這次爭的是${word}。`), word);
      assert.equal(BUSINESS_WAR_PROMPT.includes(word), true);
    }
    assert.equal(findBusinessWar("法院拍賣公告寫著標金。"), "法院拍賣");
    assert.equal(findBusinessWar("糖水舖記得每位客人的口味。"), undefined);
    assert.equal(BUSINESS_WAR_WORDS.includes("授權書"), true);
  });

  it("turns banned premise text into a fail reason", () => {
    assert.equal(premiseBlockReason("她在殯儀館等到警察。")?.failType, "BANNED_TOPIC");
    assert.equal(premiseBlockReason("房子明天法院拍賣。")?.failType, "BUSINESS_WAR");
    assert.equal(premiseBlockReason("她把最後一碗麵推過去。"), null);
  });
});

describe("serial empty hooks and preachy endings", () => {
  it("flags an unresolved plan with no next beat, only at the serial ending", () => {
    const opening = "那份權限沒有交代。\n＊＊＊\n他握住門把：「現在就決定。」";
    assert.equal(findEmptySerialHook(opening), undefined);
    const empty = "他站住。\n＊＊＊\n至於那份計劃，到最後也沒有交代。";
    assert.equal(findEmptySerialHook(empty), "未交代");
    assert.deepEqual(qualityFailNotes(empty, "short"), []);
    assert.equal(qualityFailNotes(empty, "serial")[0], "空懸結尾:未交代");
    assert.match(QUALITY_REPAIR.EMPTY_HOOK, /權限／計畫/);
  });

  it("flags a moralizing tail and ignores the same phrase earlier in the story", () => {
    const early = "有時候，他會想起那天。\n＊＊＊\n她把熱湯推過去。\n「明天還來。」";
    assert.equal(findPreachyEnding(early), undefined);
    const lecture = "她放下碗。\n＊＊＊\n有時候，人要學會放下。";
    assert.equal(findPreachyEnding(lecture), "有時候");
    const named = "燈還亮著。\n＊＊＊\n她終於懂了：好運非零和。";
    assert.equal(findPreachyEnding(named), "非零和");
    assert.equal(qualityFailNotes(named, "short")[0], "說教結尾:非零和");
    assert.match(QUALITY_REPAIR.PREACHY, /非零和/);
  });

  it("classifies notes and hard-blocks publication of banned drafts", () => {
    assert.equal(classifyQualityNote("禁題:警察"), "BANNED_TOPIC");
    assert.equal(classifyQualityNote("商戰詞:標金"), "BUSINESS_WAR");
    assert.equal(classifyQualityNote("說教結尾:非零和"), "PREACHY");
    assert.equal(classifyQualityNote("空懸結尾:未交代"), "EMPTY_HOOK");
    assert.equal(classifyQualityNote("沒有完整收尾"), null);
    assert.equal(isHardBlocked("禁題:猝死；商戰詞:產權"), true);
    assert.equal(isHardBlocked("簡體字:車"), true);
    assert.equal(isHardBlocked("PASS"), false);
    assert.equal(isHardBlocked("沒有完整收尾"), false);
    assert.equal(isHardBlocked("沒有停在抉擇節點"), true);
  });
});
