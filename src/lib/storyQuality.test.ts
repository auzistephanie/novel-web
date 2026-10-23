import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANNED_TOPIC_PROMPT,
  BANNED_TOPIC_WORDS,
  BUSINESS_WAR_PROMPT,
  BUSINESS_WAR_WORDS,
  CANTONESE_SAFE,
  FEMALE_GIVEN,
  FIRST_PERSON_PREMISE_RULE,
  MALE_GIVEN,
  QUALITY_REPAIR,
  SIMPLIFIED_ONLY,
  SURNAMES,
  assignCharacterPair,
  candidateNames,
  classifyQualityNote,
  createNameBlock,
  findBannedTopic,
  findBusinessWar,
  findEmptySerialHook,
  findLanguageLeak,
  findPreachyEnding,
  firstPersonIssues,
  hktDayKey,
  isHardBlocked,
  isReaderClear,
  laneContentFails,
  lanePremiseExtraRules,
  nameBlockFromStories,
  openingSections,
  premiseBlockReason,
  titleFormatFails,
  titleGlyphCount,
  qualityFailNotes,
  recentAngleSet,
  recentPremiseList,
  repeatedTitleOpening,
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

  it("blocks full names and protagonist given names for 14 days", () => {
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
    assert.equal(block.givenToday.has("知微"), true);
    assert.equal(block.givenToday.has("景行"), true);
    assert.equal(block.givenToday.has("書意"), false);
    assert.equal(block.givenToday.has("清和"), false);
    assert.equal(block.givenToday.has("予白"), false);
    assert.equal(candidateNames("F", block, false).some((n) => n.endsWith("晚寧")), false);
    assert.equal(candidateNames("F", block, false).some((n) => n.endsWith("知微")), false);
    assert.equal(candidateNames("M", block, false).some((n) => n.endsWith("景行")), false);
    assert.equal(candidateNames("F", block, false).includes("蘇知微"), false);
    assert.equal(candidateNames("F", block, false).includes("江書意"), false);
    assert.equal(candidateNames("F", block, false).some((n) => n.endsWith("書意")), true);
    assert.equal(candidateNames("F", block, false).includes("秦清和"), true);
  });

  it("still blocks a same-day given name that only appears in the text", () => {
    const now = new Date("2026-10-16T04:30:00.000Z");
    const block = nameBlockFromStories(
      [{ protagonist: "秦清和", content: "路人提起江書意。", created_at: "2026-10-16T01:00:00.000Z" }],
      now
    );
    assert.equal(block.givenToday.has("清和"), true);
    assert.equal(block.givenToday.has("書意"), true);
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
    assert.equal(isHardBlocked("沒有完整收尾"), true);
    assert.equal(isHardBlocked("沒有停在抉擇節點"), true);
    for (const note of ["道具未回收:杯子", "分節數不對（3節）", "字數不足(100<2600)", "粵語詞:嘅", "AI陳套詞:不禁", "大陸詞:軟件", "第一人稱:內文沒有使用「我」敘述"]) {
      assert.equal(isHardBlocked(note), true, note);
    }
  });
});

describe("written language leaks", () => {
  it("flags newly leaked simplified characters and leaves 姐 and 關係 alone", () => {
    const simplified: readonly string[] = SIMPLIFIED_ONLY;
    const cantonese: readonly string[] = CANTONESE_SAFE;
    assert.equal(simplified.includes("姐"), false);
    assert.equal(cantonese.includes("係"), false);
    assert.equal(findLanguageLeak("這是關係，小姐和姐姐、師姐都在。"), null);
    for (const ch of ["马", "给", "着", "账", "馆", "饭", "饼", "辆", "岁", "妈"]) {
      assert.equal(simplified.includes(ch), true, ch);
      assert.equal(findLanguageLeak(`這裡有${ch}字。`)?.note, `簡體字:${ch}`);
    }
  });

  it("flags the expanded Cantonese list and mainland admin terms", () => {
    const cantonese: readonly string[] = CANTONESE_SAFE;
    for (const word of ["啲", "喺", "畀", "俾", "咩", "點解", "咁", "仲", "佢哋", "我哋", "你哋", "嚟", "搵", "揾", "諗", "睇", "聽日", "琴日", "尋日", "而家", "嗰", "邊個", "點樣", "幾時", "係咪", "有冇", "㗎", "喎", "啫", "咋"]) {
      assert.equal(cantonese.includes(word), true, word);
      assert.equal(findLanguageLeak(`句中有${word}。`)?.note, `粵語詞:${word}`);
    }
    assert.equal(findLanguageLeak("公司要簽勞動合同。")?.note, "大陸詞:勞動合同");
    assert.equal(findLanguageLeak("請到街道司法所打印軟件。")?.note, "大陸詞:街道司法所");
  });
});

describe("cross-week angles, titles, and first-person lanes", () => {
  it("keeps an angle used 8 to 10 days later on the same lane", () => {
    const metas = Array.from({ length: 24 }, (_, i) => ({ lane: "warm_twist", angle: `warm-${i}`, premise: `warm-premise-${i}` }));
    metas.push({ lane: "kanbujian", angle: "撲滿墊錢", premise: "舊撲滿開局" });
    assert.equal(recentAngleSet(metas, "kanbujian").has("撲滿墊錢"), true);
    assert.equal(recentAngleSet(metas, "cozy_shop").has("撲滿墊錢"), false);
    assert.equal(recentPremiseList(metas, "kanbujian").includes("舊撲滿開局"), true);
    assert.equal(recentPremiseList(metas, "cozy_shop").includes("舊撲滿開局"), false);
    assert.equal(recentPremiseList(metas, "warm_twist").filter((item) => item === "warm-premise-0").length, 1);
  });

  it("blocks a repeated 誰准你 opening and hides later sections from the title source", () => {
    assert.equal(repeatedTitleOpening("誰准你替我請假？", ["誰准妳這樣做"]), "誰准你／妳");
    assert.equal(repeatedTitleOpening("誰准你替我請假？", ["她把信放回抽屜"]), null);
    const text = "第一節已經發生\n＊＊＊\n第二節仍在現場\n＊＊＊\n第三節才揭曉的秘密";
    const opening = openingSections(text);
    assert.equal(opening.includes("第一節"), true);
    assert.equal(opening.includes("第二節"), true);
    assert.equal(opening.includes("第三節"), false);
  });

  it("requires first-person narration on dark humor and blocks death plots on the two warm lanes", () => {
    assert.match(lanePremiseExtraRules("dark_humor"), new RegExp(FIRST_PERSON_PREMISE_RULE));
    assert.match(lanePremiseExtraRules("kanbujian"), /過世/);
    assert.match(lanePremiseExtraRules("cozy_shop"), /遺物/);
    assert.equal(lanePremiseExtraRules("warm_twist"), "");
    assert.equal(firstPersonIssues("林知微走進店裡。她沒有說話。\n「我明天再來。」", "林知微").some((note) => note.includes("沒有使用")), true);
    assert.deepEqual(firstPersonIssues("我走進店裡。我叫林知微。我把杯子放下。我叫了一聲。", "林知微"), []);
    assert.equal(firstPersonIssues("我走進店裡。我叫周晚寧。我把杯子放下。", "林知微").some((note) => note.includes("周晚寧")), true);
    assert.equal(laneContentFails("父親已經過世，留下遺物。", "kanbujian")[0], "禁題:過世");
    assert.equal(laneContentFails("父親已經過世。", "warm_twist").some((note) => note.startsWith("禁題")), false);
    assert.equal(laneContentFails("我今天去店裡。父親已經過世。", "dark_humor").some((note) => note.startsWith("禁題")), false);
    assert.equal(isReaderClear({ open: 6, logic: 5 }), false);
    assert.equal(isReaderClear({ open: 6, logic: 6 }), true);
    assert.equal(isReaderClear({ open: 5, logic: 8 }), false);
    assert.equal(isReaderClear(null), true);
  });
});

describe("title length and hook shape", () => {
  it("rejects two-to-six-character flat titles on every lane", () => {
    for (const title of ["慢半拍", "他不識字", "外婆的記帳本", "舊電扇"]) {
      const count = titleGlyphCount(title);
      assert.ok(count >= 2 && count <= 6, `${title}:${count}`);
      assert.match(titleFormatFails(title, "shuangwen").join("\n"), /平淡散文題/);
      assert.match(titleFormatFails(title, "kanbujian").join("\n"), /平淡散文題/);
      assert.match(titleFormatFails(title, "warm_twist").join("\n"), /標題長度/);
      assert.match(titleFormatFails(title, "cozy_shop").join("\n"), /標題長度/);
    }
  });

  it("requires a twelve-to-twenty-two-character contrast title on the warm lanes", () => {
    const ok = "我嫌他連買菜都慢半拍，直到我爸進急診室那晚";
    assert.equal(titleGlyphCount(ok), 20);
    assert.deepEqual(titleFormatFails(ok, "kanbujian"), []);
    assert.deepEqual(titleFormatFails(ok, "warm_twist"), []);
    assert.deepEqual(titleFormatFails(ok, "cozy_shop"), []);

    const noContrast = "雜貨店老闆娘今天又把帳本鎖上了";
    assert.equal(titleGlyphCount(noContrast), 15);
    assert.match(titleFormatFails(noContrast, "kanbujian").join("\n"), /標題句式/);
    assert.deepEqual(titleFormatFails(noContrast, "shuangwen"), []);

    const tooLong = "外婆臨搬家塞給我一本催債帳本，上面的人見了我卻全在哭";
    assert.equal(titleGlyphCount(tooLong), 25);
    assert.match(titleFormatFails(tooLong, "kanbujian").join("\n"), /標題長度/);
    assert.equal(titleFormatFails(tooLong, "kanbujian").some((note) => note.startsWith("標題句式")), false);
    assert.deepEqual(titleFormatFails(tooLong, "shuangwen"), []);

    const mid = "窗邊那盞燈今夜又亮了一次";
    assert.equal(titleGlyphCount(mid), 12);
    assert.deepEqual(titleFormatFails(mid, "shuangwen"), []);
    assert.match(titleFormatFails(mid, "cozy_shop").join("\n"), /標題句式/);
  });
});
