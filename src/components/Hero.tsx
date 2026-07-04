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
              <linearGradient id="catFur" x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stopColor="#f3d888" />
                <stop offset="55%" stopColor="#d9a94e" />
                <stop offset="100%" stopColor="#9c6f2e" />
              </linearGradient>
              <linearGradient id="catFurDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c98f3f" />
                <stop offset="100%" stopColor="#7a5323" />
              </linearGradient>
            </defs>

            {/* ground shadow */}
            <ellipse cx="130" cy="184" rx="95" ry="7" fill="#2b2520" opacity="0.08" />

            {/* book stack */}
            <g>
              <rect x="42" y="148" width="176" height="24" rx="4" fill="#3a5f8a" stroke="#2b2520" strokeWidth="2.5" />
              <line x1="60" y1="150" x2="60" y2="170" stroke="#f6efe0" strokeWidth="1.5" opacity="0.35" />
            </g>
            <g transform="rotate(-2 130 136)">
              <rect x="56" y="124" width="148" height="26" rx="4" fill="#c1503a" stroke="#2b2520" strokeWidth="2.5" />
              <line x1="76" y1="126" x2="76" y2="148" stroke="#f6efe0" strokeWidth="1.5" opacity="0.35" />
            </g>
            <g transform="rotate(2 130 110)">
              <rect x="68" y="98" width="122" height="28" rx="4" fill="#c99a3c" stroke="#2b2520" strokeWidth="2.5" />
              <line x1="86" y1="100" x2="86" y2="124" stroke="#f6efe0" strokeWidth="1.5" opacity="0.35" />
            </g>

            {/* sleeping cat, curled on top of the stack */}
            <path
              d="M185 90 Q205 82 202 55 Q200 34 178 32 Q170 30 168 42"
              fill="none"
              stroke="#2b2520"
              strokeWidth="18"
              strokeLinecap="round"
            />
            <path
              d="M185 90 Q205 82 202 55 Q200 34 178 32 Q170 30 168 42"
              fill="none"
              stroke="url(#catFur)"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <circle cx="168" cy="42" r="10" fill="url(#catFur)" stroke="#2b2520" strokeWidth="2.5" />

            <ellipse
              cx="138"
              cy="78"
              rx="50"
              ry="30"
              transform="rotate(-6 138 78)"
              fill="url(#catFur)"
              stroke="#2b2520"
              strokeWidth="2.5"
            />

            <ellipse cx="108" cy="97" rx="14" ry="9" fill="url(#catFur)" stroke="#2b2520" strokeWidth="2.5" />

            <circle cx="88" cy="68" r="27" fill="url(#catFur)" stroke="#2b2520" strokeWidth="2.5" />

            <path d="M70 50 L64 32 L82 46Z" fill="url(#catFurDark)" stroke="#2b2520" strokeWidth="2" />
            <path d="M88 44 L96 26 L106 44Z" fill="url(#catFurDark)" stroke="#2b2520" strokeWidth="2" />
            <path d="M70 46 L67 36 L78 44Z" fill="#c1503a" opacity="0.7" />
            <path d="M91 42 L96 32 L101 42Z" fill="#c1503a" opacity="0.7" />

            <g stroke="#2b2520" strokeWidth="1.5" strokeLinecap="round" opacity="0.55">
              <line x1="115" y1="50" x2="110" y2="40" />
              <line x1="140" y1="47" x2="138" y2="36" />
              <line x1="163" y1="54" x2="170" y2="44" />
              <line x1="178" y1="70" x2="188" y2="64" />
            </g>

            <path d="M76 68 Q80 72 84 68" fill="none" stroke="#2b2520" strokeWidth="2" strokeLinecap="round" />
            <path d="M90 68 Q94 72 98 68" fill="none" stroke="#2b2520" strokeWidth="2" strokeLinecap="round" />
            <path d="M85 76 L91 76 L88 80Z" fill="#c1503a" />
            <path
              d="M88 80 Q84 84 79 81 M88 80 Q92 84 97 81"
              fill="none"
              stroke="#2b2520"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <g stroke="#2b2520" strokeWidth="1" strokeLinecap="round" opacity="0.5">
              <line x1="60" y1="72" x2="40" y2="68" />
              <line x1="60" y1="77" x2="40" y2="78" />
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
