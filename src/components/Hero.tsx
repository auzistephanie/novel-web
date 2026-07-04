import Link from "next/link";

export default function Hero({
  loggedIn = false,
  storyCount = 0,
}: {
  loggedIn?: boolean;
  storyCount?: number;
}) {
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

      <div className="relative max-w-4xl mx-auto px-5 pt-14 pb-10 grid md:grid-cols-[1.1fr_.9fr] gap-8 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-brick bg-brick/10 px-3 py-1.5 rounded-full mb-5">
            🔥 AI 定時更新 · 一日兩批
          </div>
          <h1 className="font-serif font-black text-3xl sm:text-4xl leading-tight mb-4">
            每日一篇，
            <br />
            <span className="text-brick">精彩</span>到停不下來
          </h1>
          <p className="text-ink/70 text-sm sm:text-base max-w-md mb-6">
            重生逆襲、馬甲文、系統流、穿書反派任您選擇——點擊喜歡記錄您的偏好，
            AI 將為您生成這個故事的專屬結局。
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
            <a
              href="#stories"
              className={
                loggedIn
                  ? "bg-brick text-cream font-bold rounded-md px-6 py-3 shadow-[4px_4px_0_rgba(43,37,32,0.7)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
                  : "border-2 border-ink font-bold rounded-md px-6 py-3"
              }
            >
              查看今日故事 →
            </a>
          </div>
        </div>

        <div className="relative h-40 sm:h-48 hidden sm:block" aria-hidden="true">
          <svg viewBox="0 0 260 200" width="100%" height="100%">
            <rect
              x="30"
              y="50"
              width="200"
              height="120"
              rx="8"
              fill="#f6efe0"
              stroke="#2b2520"
              strokeWidth="3"
            />
            <rect x="30" y="50" width="200" height="28" fill="#c1503a" stroke="#2b2520" strokeWidth="3" />
            <text
              x="130"
              y="70"
              textAnchor="middle"
              fontFamily="Noto Serif TC, serif"
              fontWeight="900"
              fontSize="15"
              letterSpacing="6"
              fill="#f6efe0"
            >
              顧　事
            </text>
            <g>
              <rect x="46" y="96" width="18" height="24" fill="#3a5f8a" />
              <rect x="68" y="92" width="18" height="28" fill="#c99a3c" />
              <rect x="90" y="98" width="18" height="22" fill="#c1503a" />
              <rect x="112" y="94" width="18" height="26" fill="#2f4a3e" />
              <rect x="134" y="98" width="18" height="22" fill="#3a5f8a" />
              <rect x="156" y="92" width="18" height="28" fill="#c1503a" />
              <rect x="178" y="96" width="18" height="24" fill="#c99a3c" />
            </g>
            <g className="float-el" style={{ transformOrigin: "50px 30px" }}>
              <circle cx="50" cy="30" r="10" fill="#c99a3c" />
              <line x1="50" y1="20" x2="50" y2="12" stroke="#2b2520" strokeWidth="2" />
            </g>
            <g className="float-el" style={{ transformOrigin: "215px 25px", animationDelay: "1.2s" }}>
              <circle cx="215" cy="25" r="8" fill="#c1503a" />
              <line x1="215" y1="17" x2="215" y2="10" stroke="#2b2520" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>

      <div className="flex gap-8 max-w-4xl mx-auto px-5 pb-2 flex-wrap">
        <div>
          <b className="font-serif font-black text-2xl text-indigo block">25</b>
          <span className="text-xs text-ink/50">加權類別池</span>
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
