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
          <p className="text-ink/70 text-sm sm:text-base max-w-md mb-3">
            重生逆襲、馬甲文、系統流、穿書反派任您選擇——點擊喜歡記錄您的偏好，
            AI 將為您生成這個故事的專屬結局。
          </p>
          <p className="text-ink/50 text-xs sm:text-sm max-w-md mb-6">
            想追更就睇「每日連載」，想一次睇晒就揀「短篇故事」——兩種節奏，任您揀。
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
              href="#short-stories"
              className={
                loggedIn
                  ? "bg-brick text-cream font-bold rounded-md px-6 py-3 shadow-[4px_4px_0_rgba(43,37,32,0.7)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
                  : "border-2 border-ink font-bold rounded-md px-6 py-3"
              }
            >
              查看短篇故事 →
            </a>
            <a
              href="#serial-stories"
              className="border-2 border-ink font-bold rounded-md px-6 py-3"
            >
              查看每日連載 →
            </a>
          </div>
        </div>

        <div className="relative h-40 sm:h-48 hidden sm:block" aria-hidden="true">
          <svg viewBox="0 0 260 200" width="100%" height="100%">
            <defs>
              <pattern id="heroTile" width="24" height="15" patternUnits="userSpaceOnUse">
                <rect width="24" height="15" fill="#f6efe0" />
                <path
                  d="M12 1.5 L22.5 7.5 L12 13.5 L1.5 7.5Z"
                  fill="none"
                  stroke="#3a5f8a"
                  strokeWidth="1.3"
                />
                <circle cx="0" cy="0" r="1.6" fill="#c1503a" />
                <circle cx="24" cy="15" r="1.6" fill="#c1503a" />
              </pattern>
              <clipPath id="heroBookShape">
                <path d="M50 55 L130 40 L210 55 L210 165 L130 150 L50 165 Z" />
              </clipPath>
            </defs>

            <g className="float-el" style={{ transformOrigin: "60px 32px" }}>
              <circle cx="60" cy="32" r="9" fill="#c99a3c" />
              <line x1="60" y1="23" x2="60" y2="16" stroke="#2b2520" strokeWidth="2" />
            </g>
            <g className="float-el" style={{ transformOrigin: "205px 28px", animationDelay: "1.2s" }}>
              <circle cx="205" cy="28" r="7" fill="#c1503a" />
              <line x1="205" y1="21" x2="205" y2="14" stroke="#2b2520" strokeWidth="2" />
            </g>

            <path
              d="M50 55 L130 40 L210 55 L210 165 L130 150 L50 165 Z"
              fill="#fff"
              stroke="#2b2520"
              strokeWidth="3"
            />
            <g clipPath="url(#heroBookShape)">
              <rect x="40" y="30" width="180" height="145" fill="url(#heroTile)" />
            </g>
            <path
              d="M50 55 L130 40 L210 55 L210 165 L130 150 L50 165 Z"
              fill="none"
              stroke="#2b2520"
              strokeWidth="3"
            />
            <line x1="130" y1="40" x2="130" y2="150" stroke="#2b2520" strokeWidth="2.5" />

            <circle cx="130" cy="95" r="24" fill="#c1503a" stroke="#2b2520" strokeWidth="2.5" />
            <text
              x="130"
              y="90"
              textAnchor="middle"
              fontFamily="Noto Serif TC, serif"
              fontWeight="900"
              fontSize="12"
              fill="#f6efe0"
            >
              顧
            </text>
            <text
              x="130"
              y="104"
              textAnchor="middle"
              fontFamily="Noto Serif TC, serif"
              fontWeight="900"
              fontSize="12"
              fill="#f6efe0"
            >
              事
            </text>
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
