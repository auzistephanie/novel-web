import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-ink/10 bg-cream/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link href="/" className="font-serif font-black text-lg">
          顧事
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-ink/70 hover:text-ink">
            每日連載
          </Link>
          {user && (
            <Link href="/my-endings" className="text-ink/70 hover:text-ink">
              我的結局本
            </Link>
          )}
          {user ? (
            <form action={logout}>
              <button className="text-brick font-bold" type="submit">
                登出
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-brick font-bold">
              登入
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
