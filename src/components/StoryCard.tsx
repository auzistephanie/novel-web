import Link from "next/link";
import LikeButton from "./LikeButton";
import { getGenreColor } from "@/lib/genreColor";

type Story = {
  id: string;
  genre: string;
  title: string;
  protagonist: string | null;
  content: string;
  created_at: string;
  story_type?: string;
};

export default function StoryCard({
  story,
  liked,
  loggedIn,
}: {
  story: Story;
  liked: boolean;
  loggedIn: boolean;
}) {
  const excerpt = story.content.slice(0, 90).trim();
  const color = getGenreColor(story.genre);

  return (
    <div
      className="group relative border border-ink/15 rounded-xl bg-white/60 p-5 pl-6 flex flex-col gap-3 shadow-[3px_3px_0_rgba(43,37,32,0.15)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[5px_6px_0_rgba(43,37,32,0.2)]"
    >
      <span
        className="absolute left-0 top-3 bottom-3 w-1.5 rounded-full"
        style={{ background: color.bar }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-xs font-bold tracking-wide px-2 py-1 rounded-full"
            style={{ color: color.text, background: color.bg }}
          >
            {story.genre}
          </span>
          {story.story_type === "short" && (
            <span className="text-xs font-bold tracking-wide px-2 py-1 rounded-full bg-ink/8 text-ink/50">
              完整短篇
            </span>
          )}
        </div>
        <LikeButton storyId={story.id} liked={liked} loggedIn={loggedIn} />
      </div>
      <Link
        href={`/story/${story.id}`}
        className="font-serif font-bold text-lg leading-snug group-hover:text-brick transition-colors"
      >
        {story.title}
      </Link>
      {story.protagonist && (
        <p className="text-xs text-ink/50">主角：{story.protagonist}</p>
      )}
      <p className="text-sm text-ink/70 line-clamp-3">{excerpt}...</p>
      <Link
        href={`/story/${story.id}`}
        className="text-sm font-bold text-brick self-start"
      >
        繼續閱讀 →
      </Link>
    </div>
  );
}
