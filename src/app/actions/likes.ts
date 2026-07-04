"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleLike(storyId: string, currentlyLiked: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入" };
  }

  if (currentlyLiked) {
    await supabase
      .from("novel_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("story_id", storyId);
  } else {
    await supabase
      .from("novel_likes")
      .insert({ user_id: user.id, story_id: storyId });
  }

  revalidatePath("/");
  revalidatePath(`/story/${storyId}`);
  return { ok: true };
}
