import { createClient } from "@/lib/supabase/server";

export type Story = {
  id: string;
  genre: string;
  title: string;
  protagonist: string | null;
  content: string;
  created_at: string;
  story_type?: string;
};

// 共用 select 欄位
export const COLS =
  "id, genre, title, protagonist, content, created_at, story_type";

// 共用：取得 supabase client、目前用戶、佢收藏過嘅 story ids
export async function loadContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let likedIds: string[] = [];
  if (user) {
    const { data: likes } = await supabase
      .from("novel_likes")
      .select("story_id")
      .eq("user_id", user.id);
    likedIds = (likes ?? []).map((l) => l.story_id as string);
  }

  return { supabase, user, likedIds };
}
