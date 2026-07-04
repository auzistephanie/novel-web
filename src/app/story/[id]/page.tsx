import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LikeButton from "@/components/LikeButton";

export const revalidate = 0;

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: story } = await supabase
    .from("novel_stories")
    .select("*")
    .eq("id", id)
    .single();

  if (!story) notFound();

  let liked = false;
  let ending: string | null = null;
  if (user) {
    const { data: like } = await supabase
      .from("novel_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("story_id", id)
      .maybeSingle();
    liked = !!like;

    const { data: endingRow } = await supabase
      .from("novel_endings")
      .select("ending_content")
      .eq("user_id", user.id)
      .eq("story_id", id)
      .maybeSingle();
    ending = endingRow?.ending_content ?? null;
  }

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10">
      <span className="text-xs font-bold tracking-wide text-indigo bg-indigo/10 px-2 py-1 rounded-full">
        {story.genre}
      </span>
      <div className="flex items-start justify-between gap-4 mt-3">
        <h1 className="font-serif font-black text-2xl leading-snug">
          {story.title}
        </h1>
        <LikeButton storyId={story.id} liked={liked} loggedIn={!!user} />
      </div>
      {story.protagonist && (
        <p className="text-sm text-ink/50 mt-1">主角：{story.protagonist}</p>
      )}

      <article className="mt-6 whitespace-pre-wrap leading-8 text-ink/85">
        {story.content}
      </article>

      <div className="mt-10 border-t border-ink/15 pt-6">
        <h2 className="font-bold text-lg mb-2">專屬結局</h2>
        {!user && (
          <p className="text-sm text-ink/50">
            登入＋㩒鍾意，等 scheduled task 幫你生成專屬結局。
          </p>
        )}
        {user && !liked && (
          <p className="text-sm text-ink/50">㩒下面個心先，先會幫你生成結局。</p>
        )}
        {user && liked && !ending && (
          <p className="text-sm text-ink/50">
            生成緊……下次 scheduled task 跑完就有。
          </p>
        )}
        {ending && (
          <p className="whitespace-pre-wrap leading-8 text-ink/85 bg-mustard/10 rounded-lg p-4">
            {ending}
          </p>
        )}
      </div>
    </main>
  );
}
