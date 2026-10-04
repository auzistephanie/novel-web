"use client";

// 2026-10-04：故事內文分節＋閱讀進度。生成時用單獨一行「＊＊＊」分節（route.ts SECTION_MARK）；
// 舊故事冇分節就當一節，淨顯示進度條。
import { useEffect, useRef, useState } from "react";

const SECTION_MARK = "＊＊＊";
const CN_NUM = ["一", "二", "三", "四", "五", "六"];

export default function StoryReader({ content }: { content: string }) {
  const sections = content
    .split("\n")
    .reduce<string[][]>(
      (acc, line) => {
        if (line.trim() === SECTION_MARK) acc.push([]);
        else acc[acc.length - 1].push(line);
        return acc;
      },
      [[]]
    )
    .map((lines) => lines.join("\n").trim())
    .filter(Boolean);
  const total = sections.length;
  const minutes = Math.max(1, Math.round(content.length / 500));

  const articleRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const readable = rect.height - window.innerHeight * 0.6;
      const p = readable > 0 ? Math.min(1, Math.max(0, -rect.top / readable)) : 1;
      setProgress(p);
      // 目前節＝最後一個頂部已經過咗畫面 40% 嘅節
      let cur = 1;
      sectionRefs.current.forEach((s, i) => {
        if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) cur = i + 1;
      });
      setCurrent(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      {/* 頂部閱讀進度條 */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-ink/5" aria-hidden="true">
        <div className="h-full bg-brick transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      <p className="mt-3 text-xs text-ink/45">
        約 {minutes} 分鐘讀完{total > 1 ? ` · 共 ${total} 節` : ""}
      </p>

      <article ref={articleRef} className="mt-6 leading-8 text-ink/85">
        {sections.map((text, i) => (
          <section
            key={i}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
          >
            {total > 1 && (
              <div className={`flex items-center gap-3 text-ink/35 ${i === 0 ? "mb-5" : "mt-9 mb-5"}`} aria-label={`第${CN_NUM[i] ?? i + 1}節`}>
                <span className="flex-1 h-px bg-ink/10" />
                <span className="font-serif text-sm tracking-[0.3em]">{CN_NUM[i] ?? i + 1}</span>
                <span className="flex-1 h-px bg-ink/10" />
              </div>
            )}
            <div className="whitespace-pre-wrap">{text}</div>
          </section>
        ))}
      </article>

      {/* 目前讀到第幾節（多過一節先顯示） */}
      {total > 1 && progress > 0.02 && progress < 0.99 && (
        <div className="fixed bottom-4 right-4 z-40 text-xs font-bold bg-ink text-cream/90 rounded-full px-3 py-1.5 shadow-lg">
          第 {current}／{total} 節 · {Math.round(progress * 100)}%
        </div>
      )}
    </>
  );
}
