import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type EndingRow = {
  id: string;
  ending_content: string;
  created_at: string;
  story_id: string;
  novel_stories: { title: string; genre: string } | null;
};

export default async function MyEndingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: endings } = await supabase
    .from("novel_endings")
    .select("id, ending_content, created_at, story_id, novel_stories(title, genre)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<EndingRow[]>();

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10">
      <h1 className="font-serif font-black text-3xl mb-1">我的結局</h1>
      <p className="text-ink/60 mb-8">
        您喜歡過的故事，AI 為您撰寫的專屬結局都在這裡。
      </p>

      {(!endings || endings.length === 0) && (
        <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
          尚未有結局，請先到故事牆點擊喜歡幾個故事。
        </div>
      )}

      <div className="space-y-6">
        {endings?.map((e) => (
          <div key={e.id} className="border border-ink/15 rounded-xl p-5 bg-white/60">
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/story/${e.story_id}`}
                className="font-serif font-bold hover:text-brick"
              >
                {e.novel_stories?.title}
              </Link>
              <span className="text-xs text-indigo">{e.novel_stories?.genre}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink/80 leading-7">
              {e.ending_content}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
