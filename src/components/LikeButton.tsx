"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleLike } from "@/app/actions/likes";

export default function LikeButton({
  storyId,
  liked,
  loggedIn,
}: {
  storyId: string;
  liked: boolean;
  loggedIn: boolean;
}) {
  const [isLiked, setIsLiked] = useState(liked);
  const [pending, startTransition] = useTransition();

  if (!loggedIn) {
    return (
      <Link href="/login" className="text-xs text-ink/40 hover:text-brick">
        登入先可以㩒鍾意
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const prev = isLiked;
          setIsLiked(!prev);
          const res = await toggleLike(storyId, prev);
          if (!res.ok) setIsLiked(prev);
        })
      }
      className={`text-lg leading-none transition-transform ${
        pending ? "opacity-50" : ""
      } ${isLiked ? "scale-110" : ""}`}
      aria-label="鍾意"
      aria-pressed={isLiked}
    >
      {isLiked ? "❤️" : "🤍"}
    </button>
  );
}
