"use client";

import { useState } from "react";

export default function StoryExcerptToggle({ content }: { content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-bold text-indigo hover:text-brick transition-colors"
      >
        {open ? "收起故事全文 ▴" : "展開故事全文 ▾"}
      </button>
      {open && (
        <div className="mt-3 pl-3 border-l-2 border-ink/10">
          <p className="whitespace-pre-wrap text-sm text-ink/70 leading-7">{content}</p>
        </div>
      )}
    </div>
  );
}
