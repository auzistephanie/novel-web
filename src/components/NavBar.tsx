import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const linkClass =
    "text-sm text-ink/70 hover:text-ink hover:bg-ink/5 rounded-md px-3 py-2 transition-colors";

  return (
    <>
      {/* 桌面版：左側直向 side menu */}
      <aside className="hidden md:flex md:flex-col md:w-52 md:shrink-0 md:h-screen md:sticky md:top-0 border-r border-ink/10 bg-cream/90 backdrop-blur px-4 py-6">
        <Link href="/" className="font-serif font-black text-xl mb-8 px-3">
          顧事
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
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
        <div className="px-3">
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
