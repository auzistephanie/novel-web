import Link from "next/link";
import Image from "next/image";

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
