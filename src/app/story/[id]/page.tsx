import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LikeButton from "@/components/LikeButton";
import EndingFlow from "@/components/EndingFlow";

export const revalidate = 0;
// 畀 EndingFlow 嘅 server actions（getChoices/generateEnding）足夠時間等 DeepSeek 回應
export const maxDuration = 60;

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pick?: string }>;
}) {
  const { id } = await params;
  const { pick } = await searchParams;
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

  const isShort = story.story_type === "short";

  let liked = false;
  let ending: string | null = null;
  let choice: string | null = null;
  if (user) {
    const { data: like } = await supabase
      .from("novel_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("story_id", id)
      .maybeSingle();
    liked = !!like;

    // 同一個故事而家可以有多個結局（唔同分支），呢度攞返最新嗰個做預設顯示，
    // 全部結局要睇返可以去「我的結局本」。
    const { data: endingRows } = await supabase
      .from("novel_endings")
      .select("ending_content, choice_text")
      .eq("user_id", user.id)
      .eq("story_id", id)
      .order("created_at", { ascending: false })
      .limit(1);
    ending = endingRows?.[0]?.ending_content ?? null;
    choice = endingRows?.[0]?.choice_text ?? null;
  }

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10">
      <div className="bg-cream border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-[4px_4px_0_rgba(43,37,32,0.12)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs font-bold tracking-wide text-indigo bg-indigo/10 px-2.5 py-1 rounded-full">
            {story.genre}
          </span>
          {/* 短篇：like 掣留喺頂部作收藏；連載：like 掣搬到結局之後 */}
          {isShort && (
            <LikeButton storyId={story.id} liked={liked} loggedIn={!!user} />
          )}
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

      {isShort ? (
        <div className="mt-8 bg-ink/5 border border-ink/10 rounded-2xl p-6 sm:p-8">
          <p className="text-sm text-ink/50">
            這是一篇完整短篇，故事本身已有結局，不會再另外生成專屬結局。點擊上方「喜歡」可以收藏這篇故事。
          </p>
        </div>
      ) : (
        <div className="mt-8 bg-mustard/10 border border-mustard/30 rounded-2xl p-6 sm:p-8">
          <h2 className="font-serif font-bold text-lg mb-4">你的專屬結局</h2>
          <EndingFlow
            storyId={story.id}
            loggedIn={!!user}
            liked={liked}
            initialEnding={ending}
            initialChoice={choice}
            autoPick={pick === "1"}
          />
        </div>
      )}
    </main>
  );
}
