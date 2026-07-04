import Link from "next/link";
import LikeButton from "./LikeButton";

type Story = {
  id: string;
  genre: string;
  title: string;
  protagonist: string | null;
  content: string;
  created_at: string;
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

  return (
    <div className="border border-ink/15 rounded-xl bg-white/60 p-5 flex flex-col gap-3 shadow-[3px_3px_0_rgba(43,37,32,0.15)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-indigo bg-indigo/10 px-2 py-1 rounded-full">
          {story.genre}
        </span>
        <LikeButton storyId={story.id} liked={liked} loggedIn={loggedIn} />
      </div>
      <Link
        href={`/story/${story.id}`}
        className="font-serif font-bold text-lg leading-snug hover:text-brick"
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
