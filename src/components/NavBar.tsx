import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: genreRows } = await supabase.from("novel_stories").select("genre");
  const genreCounts = new Map<string, number>();
  for (const row of genreRows ?? []) {
    genreCounts.set(row.genre, (genreCounts.get(row.genre) ?? 0) + 1);
  }
  const genres = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);

  const linkClass =
    "text-sm text-ink/70 hover:text-ink hover:bg-ink/5 rounded-md px-3 py-2 transition-colors";

  return (
    <>
      {/* 桌面版：左側直向 side menu */}
      <aside className="hidden md:flex md:flex-col md:w-52 md:shrink-0 md:h-screen md:sticky md:top-0 md:relative border-r border-ink/10 bg-cream/90 backdrop-blur px-4 py-6 overflow-y-auto">
        <div
          className="absolute inset-0 tile-pattern-bg opacity-[.05] pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative flex flex-col flex-1">
          <Link href="/" className="font-serif font-black text-xl mb-8 px-3">
            顧事
          </Link>
          <nav className="flex flex-col gap-1">
            <Link href="/#short-stories" className={linkClass}>
              短篇故事
            </Link>
            <Link href="/#serial-stories" className={linkClass}>
              每日連載
            </Link>
            {user && (
              <Link href="/my-endings" className={linkClass}>
                我的結局本
              </Link>
            )}
          </nav>

          {genres.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-ink/40 px-3 mb-1 tracking-wide">類別</p>
              <nav className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                {genres.map(([genre, count]) => (
                  <Link
                    key={genre}
                    href={`/?genre=${encodeURIComponent(genre)}#stories`}
                    className="text-xs text-ink/60 hover:text-ink hover:bg-ink/5 rounded-md px-3 py-1.5 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{genre}</span>
                    <span className="text-ink/30 shrink-0">{count}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}

          <div className="flex-1" />

          <div className="px-3 pt-4">
            {user ? (
              <form action={logout}>
                <button className="text-brick font-bold text-sm" type="submit">
                  登出
                </button>
              </form>
            ) : (
              <Link href="/login" className="text-brick font-bold text-sm">
                登入
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* 手機版：頂部橫向 bar */}
      <header className="flex md:hidden border-b border-ink/10 bg-cream/90 backdrop-blur sticky top-0 z-50">
        <div className="w-full px-5 py-3 flex items-center justify-between">
          <Link href="/" className="font-serif font-black text-lg">
            顧事
          </Link>
          <nav className="flex items-center gap-3 text-sm overflow-x-auto">
            <Link href="/#short-stories" className="text-ink/70 hover:text-ink whitespace-nowrap">
              短篇
            </Link>
            <Link href="/#serial-stories" className="text-ink/70 hover:text-ink whitespace-nowrap">
              連載
            </Link>
            {user && (
              <Link href="/my-endings" className="text-ink/70 hover:text-ink whitespace-nowrap">
                結局本
              </Link>
            )}
            {user ? (
              <form action={logout}>
                <button className="text-brick font-bold whitespace-nowrap" type="submit">
                  登出
                </button>
              </form>
            ) : (
              <Link href="/login" className="text-brick font-bold whitespace-nowrap">
                登入
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
