import { login, signup } from "./actions";

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
