"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// 刪除一篇故事（server 端再驗證一次身份，唔淨係靠前端隱藏 UI）。
// novel_stories 嘅 DELETE RLS policy 本身都限死净 admin email 先過到，
// 呢度嘅檢查係第二重保險 + 早啲俾返清楚嘅錯誤訊息。
// 刪除會靠 novel_likes / novel_endings 嘅 FK ON DELETE CASCADE 自動連帶清走相關記錄。
export async function deleteStory(
  storyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return { ok: false, error: "冇權限刪除" };
    }

    const { error } = await supabase.from("novel_stories").delete().eq("id", storyId);
    if (error) return { ok: false, error: `刪除失敗：${error.message}` };

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/short");
    revalidatePath("/serial");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "刪除失敗" };
  }
}

// 2026-08-17：審核閘——生成完先落 status:'pending'，呢兩個 action 俾 admin 揀
// 批准（上公開頁）定唔要（唔刪，留低做「唔夠好」嘅診斷樣本，等下次先有嘢可以查）。
export async function approveStory(
  storyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return { ok: false, error: "冇權限批准" };
    }

    const { error } = await supabase
      .from("novel_stories")
      .update({ status: "published" })
      .eq("id", storyId);
    if (error) return { ok: false, error: `批准失敗：${error.message}` };

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/short");
    revalidatePath("/serial");
    revalidatePath("/categories");
    revalidatePath("/browse");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "批准失敗" };
  }
}

export async function rejectStory(
  storyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return { ok: false, error: "冇權限" };
    }

    // 唔用 delete——唔要嘅故事留喺 DB 做 status:'rejected'，方便之後翻查邊度唔夠好。
    const { error } = await supabase
      .from("novel_stories")
      .update({ status: "rejected" })
      .eq("id", storyId);
    if (error) return { ok: false, error: `操作失敗：${error.message}` };

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "操作失敗" };
  }
}
