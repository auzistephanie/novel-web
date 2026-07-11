import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecommendedStories from "@/components/RecommendedStories";
import EndingBookshelf from "@/components/EndingBookshelf";

export const revalidate = 0;

type EndingRow = {
  id: string;
  ending_content: string;
  choice_text: string | null;
  created_at: string;
  story_id: string;
  novel_stories: { title: string; genre: string; content: string } | null;
};

export default async function MyEndingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: endings } = await supabase
    .from("novel_endings")
    .select("id, ending_content, choice_text, created_at, story_id, novel_stories(title, genre, content)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<EndingRow[]>();

  const hasEndings = endings && endings.length > 0;

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10">
      <h1 className="font-serif font-black text-3xl mb-1">我的結局本</h1>
      <p className="text-ink/60 mb-8">
        由您親自選擇劇情走向，AI 為您撰寫的專屬結局都在這裡。
      </p>

      {!hasEndings && (
        <div className="relative border-2 border-dashed border-ink/25 rounded-2xl p-10 text-center overflow-hidden">
          <svg
            className="mx-auto mb-4"
            width="72"
            height="72"
            viewBox="0 0 72 72"
            aria-hidden="true"
          >
            <circle cx="36" cy="36" r="34" fill="rgba(193,80,58,0.08)" />
            <path
              d="M36 52c-9-6-18-13-18-24a11 11 0 0 1 18-8 11 11 0 0 1 18 8c0 11-9 18-18 24Z"
              fill="none"
              stroke="#c1503a"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M24 34l6 6 12-13"
              fill="none"
              stroke="#3a5f8a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-ink/60 mb-5">
            尚未有結局，請先到每日連載點擊喜歡幾個故事，AI 就會為您撰寫專屬結局。
          </p>
          <Link
            href="/#stories"
            className="inline-flex items-center gap-2 bg-brick text-cream font-bold rounded-md px-5 py-2.5 shadow-[3px_3px_0_rgba(43,37,32,0.7)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
          >
            前往每日連載 →
          </Link>
        </div>
      )}

      {hasEndings && <EndingBookshelf endings={endings} />}

      <div className="mt-12">
        <RecommendedStories limit={4} />
      </div>
    </main>
  );
}
