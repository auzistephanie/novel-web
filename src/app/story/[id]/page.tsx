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
      <div className="bg-cream border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-[4px_4px_0_rgba(43,37,32,0.12)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs font-bold tracking-wide text-indigo bg-indigo/10 px-2.5 py-1 rounded-full">
            {story.genre}
          </span>
          <LikeButton storyId={story.id} liked={liked} loggedIn={!!user} />
        </div>

        <h1 className="font-serif font-black text-2xl leading-snug mt-4">
          {story.title}
        </h1>
        {story.protagonist && (
          <p className="text-sm text-ink/50 mt-1">主角：{story.protagonist}</p>
        )}

        <article className="mt-6 whitespace-pre-wrap leading-8 text-ink/85">
          {story.content}
        </article>
      </div>

      {story.story_type === "short" ? (
        <div className="mt-8 bg-ink/5 border border-ink/10 rounded-2xl p-6 sm:p-8">
          <p className="text-sm text-ink/50">
            這是一篇完整短篇，故事本身已有結局，不會再另外生成專屬結局。點擊上方「喜歡」可以收藏這篇故事。
          </p>
        </div>
      ) : (
        <div className="mt-8 bg-mustard/10 border border-mustard/30 rounded-2xl p-6 sm:p-8">
          <h2 className="font-serif font-bold text-lg mb-3">專屬結局</h2>

          {!user && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-ink/60">
                登入並點擊喜歡，系統會為您生成專屬結局。
              </p>
              <LikeButton storyId={story.id} liked={false} loggedIn={false} size="lg" />
            </div>
          )}

          {user && !liked && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-ink/60">
                點擊下方按鈕表示喜歡，系統將為您生成專屬結局。
              </p>
              <LikeButton storyId={story.id} liked={liked} loggedIn={!!user} size="lg" />
            </div>
          )}

          {user && liked && !ending && (
            <p className="text-sm text-ink/60">
              正在生成中，請耐心等候下一次系統排程完成。
            </p>
          )}

          {ending && (
            <p className="whitespace-pre-wrap leading-8 text-ink/85">{ending}</p>
          )}
        </div>
      )}
    </main>
  );
}
