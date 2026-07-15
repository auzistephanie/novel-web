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
