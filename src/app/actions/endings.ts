"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deepseekChat, extractJsonArray, LANG_RULE } from "@/lib/deepseek";

type Story = {
  id: string;
  title: string;
  genre: string;
  content: string;
  story_type: string | null;
};

async function loadSerialStory(storyId: string): Promise<Story | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("novel_stories")
    .select("id, title, genre, content, story_type")
    .eq("id", storyId)
    .single();
  if (!data || data.story_type === "short") return null;
  return data as Story;
}

// 第一步：即場生成 3 個劇情分支畀讀者揀
export async function getChoices(
  storyId: string
): Promise<{ ok: true; choices: string[] } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "請先登入" };

    const story = await loadSerialStory(storyId);
    if (!story) return { ok: false, error: "找不到這篇連載故事" };

    const raw = await deepseekChat(
      [
        { role: "system", content: `你是一位中文網絡小說作家。${LANG_RULE}` },
        {
          role: "user",
          content:
            `以下是連載爽文《${story.title}》（類別：${story.genre}）的內文：\n\n` +
            `${story.content}\n\n` +
            `請根據以上劇情，提出 3 個關鍵抉擇，讓讀者決定主角接下來的走向。` +
            `每個抉擇需緊扣本故事的人物與情節、彼此方向分歧明顯、各在 20 字以內。` +
            `只輸出 JSON 陣列，例如：["抉擇一","抉擇二","抉擇三"]，不要任何多餘文字。`,
        },
      ],
      { temperature: 1.0, maxTokens: 300 }
    );

    const choices = extractJsonArray(raw).slice(0, 3);
    if (choices.length < 2) {
      return { ok: false, error: "生成分支失敗，請再試一次" };
    }
    return { ok: true, choices };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "生成分支失敗" };
  }
}

// 第二步：依讀者揀嘅分支生成專屬結局並存入結局本
export async function generateEnding(
  storyId: string,
  choice: string
): Promise<{ ok: true; ending: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "請先登入" };

    const story = await loadSerialStory(storyId);
    if (!story) return { ok: false, error: "找不到這篇連載故事" };

    const cleanChoice = choice.trim().slice(0, 100);
    if (!cleanChoice) return { ok: false, error: "請先選擇一個劇情走向" };

    const ending = await deepseekChat(
      [
        { role: "system", content: `你是一位中文網絡小說作家。${LANG_RULE}` },
        {
          role: "user",
          content:
            `以下是連載爽文《${story.title}》（類別：${story.genre}）的內文：\n\n` +
            `${story.content}\n\n` +
            `讀者為這個故事選擇的劇情走向是：「${cleanChoice}」。\n\n` +
            `請據此為這位讀者量身撰寫一個專屬結局延續，約 400 至 700 字。` +
            `結局需承接上述劇情走向、貼合原故事的世界觀、人物性格與語氣，` +
            `情節完整、收束漂亮，可比原故事更圓滿或更精彩。只輸出結局正文。`,
        },
      ],
      { temperature: 0.9, maxTokens: 1400 }
    );

    const { error } = await supabase.from("novel_endings").upsert(
      {
        user_id: user.id,
        story_id: storyId,
        choice_text: cleanChoice,
        ending_content: ending,
      },
      { onConflict: "user_id,story_id" }
    );
    if (error) return { ok: false, error: `儲存失敗：${error.message}` };

    revalidatePath("/my-endings");
    revalidatePath(`/story/${storyId}`);
    return { ok: true, ending };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "生成結局失敗" };
  }
}
