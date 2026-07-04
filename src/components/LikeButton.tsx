"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleLike } from "@/app/actions/likes";

export default function LikeButton({
  storyId,
  liked,
  loggedIn,
  size = "sm",
}: {
  storyId: string;
  liked: boolean;
  loggedIn: boolean;
  size?: "sm" | "lg";
}) {
  const [isLiked, setIsLiked] = useState(liked);
  const [pending, startTransition] = useTransition();

  const base =
    "inline-flex items-center gap-2 rounded-full font-bold transition-all border-2";
  const sizing =
    size === "lg" ? "px-5 py-2.5 text-sm" : "px-3.5 py-1.5 text-xs";

  if (!loggedIn) {
    return (
      <Link
        href="/login"
        className={`${base} ${sizing} border-ink/30 text-ink/60 hover:border-brick hover:text-brick`}
      >
        <span>🤍</span>登入後即可喜歡
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
      className={`${base} ${sizing} ${
        pending ? "opacity-50" : ""
      } ${
        isLiked
          ? "bg-brick border-brick text-cream"
          : "border-ink/30 text-ink/70 hover:border-brick hover:text-brick"
      }`}
      aria-pressed={isLiked}
    >
      <span>{isLiked ? "❤️" : "🤍"}</span>
      {isLiked ? "已喜歡" : "喜歡"}
    </button>
  );
}
