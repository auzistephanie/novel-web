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

// 顧事 House Style（Voice Profile v1 精華；正本在 novel-web/VOICE_PROFILE.md）
const VOICE_RULE =
  "顧事House Style：段落短（1至3句一段），關鍵句獨立成段；" +
  "結局必須承接原文的敘事聲道與節奏（快節奏熱血短句／冷幽默第一人稱毒舌／溫情細節催淚，依原文而定）；" +
  "用具體場景、對白、動作推進情節與情感，禁止「他很感動」「她哭了很久」式概括，禁止說教、無鋪墊開掛、翻譯腔；" +
  "結尾要收在情緒最高點，末句要短、有力、可獨立引用。";

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
): Promise<
  | { ok: true; ending: string; id: string; created_at: string }
  | { ok: false; error: string }
> {
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
        {
          role: "system",
          content: `你是「顧事」的駐站作者。${LANG_RULE}${VOICE_RULE}`,
        },
        {
          role: "user",
          content:
            `以下是連載爽文《${story.title}》（類別：${story.genre}）的內文：\n\n` +
            `${story.content}\n\n` +
            `讀者為這個故事選擇的劇情走向是：「${cleanChoice}」。\n\n` +
            `請據此為這位讀者量身撰寫一個專屬結局延續，約 400 至 700 字。` +
            `結局需承接上述劇情走向、貼合原故事的世界觀、人物性格與語氣，` +
            `情節完整、收束漂亮，可比原故事更圓滿或更精彩。` +
            `結尾收在情緒最高點，最後一句要短、可獨立引用。只輸出結局正文。`,
        },
      ],
      { temperature: 0.9, maxTokens: 1400 }
    );

    // 2026-07-11 起：同一個故事可以生成多個結局（唔同分支），
    // 唔再 upsert 覆蓋，改做 insert 新一行，等讀者可以揀第二個分支再睇多個結局。
    // 帶返 id/created_at，等前端（結局本嗰邊）唔使 refetch 都可以就地加返新結局落個列表。
    const { data: inserted, error } = await supabase
      .from("novel_endings")
      .insert({
        user_id: user.id,
        story_id: storyId,
        choice_text: cleanChoice,
        ending_content: ending,
      })
      .select("id, created_at")
      .single();
    if (error || !inserted) return { ok: false, error: `儲存失敗：${error?.message}` };

    revalidatePath("/my-endings");
    revalidatePath(`/story/${storyId}`);
    return { ok: true, ending, id: inserted.id, created_at: inserted.created_at };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "生成結局失敗" };
  }
}

// 刪除結局本入面一個結局
export async function deleteEnding(
  endingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "請先登入" };

    const { error } = await supabase
      .from("novel_endings")
      .delete()
      .eq("id", endingId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: `刪除失敗：${error.message}` };

    revalidatePath("/my-endings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "刪除失敗" };
  }
}
