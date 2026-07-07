import Link from "next/link";
import Image from "next/image";

type Copy = {
  badge: string;
  pre: string;
  accent: string;
  post: string;
  sub: string;
};

const COPY: Copy[] = [
  {
    badge: "今日新章 · 已上架",
    pre: "翻開，就",
    accent: "回不去",
    post: "了",
    sub: "重生、逆襲、穿書、馬甲——踏進去，便是另一場人生。",
  },
  {
    badge: "你選 · AI 為你續寫",
    pre: "誰說結局，不能",
    accent: "重寫",
    post: "？",
    sub: "揀一個劇情走向，故事的收筆，交由你決定。",
  },
  {
    badge: "每日上新",
    pre: "這一次，換你當",
    accent: "主角",
    post: "",
    sub: "選一個世界，活一段你從未活過的人生。",
  },
  {
    badge: "顧事 · 每日小說",
    pre: "你錯過的人生，這裡",
    accent: "都有",
    post: "",
    sub: "一日一個故事，替你補完每一種可能。",
  },
  {
    badge: "互動結局 · 由你決定",
    pre: "看到最後一頁，你會",
    accent: "捨不得",
    post: "",
    sub: "短篇一次讀完，或親手為故事寫下專屬結局。",
  },
  {
    badge: "今日新故事 · 已上架",
    pre: "今日，你想成為",
    accent: "誰",
    post: "？",
    sub: "重生逆襲，還是穿書反派？選一個世界，縱身跳入。",
  },
  {
    badge: "顧事 · 每日小說",
    pre: "好故事，總得有人",
    accent: "顧著",
    post: "",
    sub: "一日一個故事，替你守著每一段未說完的人生。",
  },
];

export default function Hero({
  loggedIn = false,
  storyCount = 0,
}: {
  loggedIn?: boolean;
  storyCount?: number;
}) {
  const copy = COPY[Math.floor(Math.random() * COPY.length)];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-10 -left-10 w-64 h-64 rounded-full opacity-[.12]"
          style={{ background: "radial-gradient(circle, #c1503a, transparent 70%)" }}
        />
        <div
          className="absolute top-10 right-0 w-72 h-72 rounded-full opacity-[.10]"
          style={{ background: "radial-gradient(circle, #3a5f8a, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-5 pt-14 pb-8 grid md:grid-cols-[1.1fr_.9fr] gap-8 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-brick bg-brick/10 px-3 py-1.5 rounded-full mb-5">
            🔥 {copy.badge}
          </div>
          <h1 className="font-serif font-black text-3xl sm:text-4xl leading-tight mb-4">
            {copy.pre}
            <span className="text-brick">{copy.accent}</span>
            {copy.post}
          </h1>
          <p className="text-ink/70 text-sm sm:text-base max-w-md mb-6">
            {copy.sub}
          </p>
          <div className="flex gap-3 flex-wrap">
            {!loggedIn && (
              <Link
                href="/login"
                className="bg-brick text-cream font-bold rounded-md px-6 py-3 shadow-[4px_4px_0_rgba(43,37,32,0.7)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
              >
                登入開始閱讀 →
              </Link>
            )}
            <Link
              href="/short"
              className={
                loggedIn
                  ? "bg-brick text-cream font-bold rounded-md px-6 py-3 shadow-[4px_4px_0_rgba(43,37,32,0.7)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
                  : "border-2 border-ink font-bold rounded-md px-6 py-3"
              }
            >
              短篇故事 →
            </Link>
            <Link
              href="/serial"
              className="border-2 border-ink font-bold rounded-md px-6 py-3"
            >
              互動結局 →
            </Link>
          </div>
        </div>

        <div className="relative h-48 sm:h-56 hidden sm:flex items-end justify-center" aria-hidden="true">
          <Image
            src="/hero-cat.png"
            alt=""
            width={832}
            height={814}
            priority
            className="w-auto h-full object-contain drop-shadow-[4px_6px_0_rgba(43,37,32,0.12)]"
          />
        </div>
      </div>

      <div className="flex gap-8 max-w-4xl mx-auto px-5 pb-2 flex-wrap">
        <div>
          <b className="font-serif font-black text-2xl text-indigo block">25</b>
          <span className="text-xs text-ink/50">加權題材池</span>
        </div>
        <div>
          <b className="font-serif font-black text-2xl text-indigo block">2</b>
          <span className="text-xs text-ink/50">每日更新批次</span>
        </div>
        <div>
          <b className="font-serif font-black text-2xl text-indigo block">{storyCount}</b>
          <span className="text-xs text-ink/50">已生成故事</span>
        </div>
      </div>
    </section>
  );
}
