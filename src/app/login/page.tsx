import { login, signup, loginWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-white border-2 border-ink rounded-xl p-8 shadow-[5px_5px_0_rgba(43,37,32,0.9)]">
        <h1 className="font-serif text-2xl font-black mb-1">爽文快遞</h1>
        <p className="text-sm text-ink/60 mb-6">
          登入睇故事、記錄鍾意，換返專屬結局。
        </p>

        {params.error && (
          <p className="mb-4 text-sm text-brick bg-brick/10 rounded-md px-3 py-2">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="mb-4 text-sm text-indigo bg-indigo/10 rounded-md px-3 py-2">
            {params.message}
          </p>
        )}

        <form action={loginWithGoogle}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 border-2 border-ink rounded-md py-2 font-bold bg-white shadow-[3px_3px_0_rgba(43,37,32,0.25)] mb-5"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.98v2.33A9 9 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.05l2.99-2.33Z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.95l2.99 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
            </svg>
            用 Google 登入
          </button>
        </form>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-ink/15" />
          <span className="text-xs text-ink/40">或者用 email</span>
          <div className="flex-1 h-px bg-ink/15" />
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink/60 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-ink/30 rounded-md px-3 py-2 bg-cream/60"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink/60 mb-1">
              密碼（最少 6 位）
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border border-ink/30 rounded-md px-3 py-2 bg-cream/60"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              formAction={login}
              className="flex-1 bg-brick text-cream font-bold rounded-md py-2 shadow-[3px_3px_0_rgba(43,37,32,0.6)]"
            >
              登入
            </button>
            <button
              formAction={signup}
              className="flex-1 border-2 border-ink font-bold rounded-md py-2"
            >
              註冊
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
