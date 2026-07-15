import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { isAdmin } from "@/lib/admin";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = isAdmin(user?.email);

  const linkClass =
    "text-sm text-ink/70 hover:text-ink hover:bg-ink/5 rounded-md px-3 py-2 transition-colors";

  const navItems = (
    <>
      <Link href="/" className={linkClass}>
        首頁
      </Link>
      <Link href="/short" className={linkClass}>
        短篇故事
      </Link>
      <Link href="/serial" className={linkClass}>
        互動結局
      </Link>
      <Link href="/categories" className={linkClass}>
        題材
      </Link>
      {user && (
        <Link href="/my-endings" className={linkClass}>
          我的結局本
        </Link>
      )}
      {admin && (
        <Link href="/admin" className={linkClass}>
          Admin
        </Link>
      )}
    </>
  );

  return (
    <>
      {/* 桌面版：左側直向 side menu */}
      <aside className="hidden md:flex md:flex-col md:w-52 md:shrink-0 md:h-screen md:sticky md:top-0 md:relative border-r border-ink/10 bg-cream/90 backdrop-blur px-4 py-6 overflow-y-auto">
        <div
          className="absolute top-0 right-0 bottom-0 w-[3px]"
          style={{ background: "linear-gradient(180deg, #7a3b32, #c99a3c 50%, #7a3b32)" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col flex-1">
          <Link href="/" className="font-serif font-black text-xl px-3 block">
            顧事
          </Link>
          <div
            className="h-px mx-3 mb-8 mt-2"
            style={{ background: "linear-gradient(90deg, #7a3b32, #c99a3c, transparent)" }}
            aria-hidden="true"
          />
          <nav className="flex flex-col gap-1">{navItems}</nav>

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
      <header className="relative flex md:hidden bg-cream/90 backdrop-blur sticky top-0 z-50">
        <div
          className="absolute left-0 right-0 bottom-0 h-[3px]"
          style={{ background: "linear-gradient(90deg, #7a3b32, #c99a3c, #7a3b32)" }}
          aria-hidden="true"
        />
        <div className="w-full px-5 py-3 flex items-center justify-between">
          <Link href="/" className="font-serif font-black text-lg">
            顧事
          </Link>
          <nav className="flex items-center gap-3 text-sm overflow-x-auto">
            <Link href="/short" className="text-ink/70 hover:text-ink whitespace-nowrap">
              短篇
            </Link>
            <Link href="/serial" className="text-ink/70 hover:text-ink whitespace-nowrap">
              互動結局
            </Link>
            <Link href="/categories" className="text-ink/70 hover:text-ink whitespace-nowrap">
              題材
            </Link>
            {user && (
              <Link href="/my-endings" className="text-ink/70 hover:text-ink whitespace-nowrap">
                結局本
              </Link>
            )}
            {admin && (
              <Link href="/admin" className="text-ink/70 hover:text-ink whitespace-nowrap">
                Admin
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
