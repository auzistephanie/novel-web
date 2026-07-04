import { loginWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[.05] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #3a5f8a 0 2px, transparent 2px 18px)",
        }}
      />
      <div className="relative w-full max-w-sm bg-white border-2 border-ink rounded-xl p-8 shadow-[5px_5px_0_rgba(43,37,32,0.9)]">
        <div
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-mustard border-2 border-ink flex items-center justify-center text-xs font-black rotate-12"
          aria-hidden="true"
        >
          顧
        </div>
        <h1 className="font-serif text-2xl font-black mb-1">顧事</h1>
        <p className="text-sm text-ink/60 mb-6">
          登入即可閱讀故事、記錄喜歡，並獲得專屬結局。
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
            className="w-full flex items-center justify-center gap-2 border-2 border-ink rounded-md py-3 font-bold bg-white shadow-[3px_3px_0_rgba(43,37,32,0.25)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.98v2.33A9 9 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.05l2.99-2.33Z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.95l2.99 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
            </svg>
            使用 Google 帳號登入
          </button>
        </form>

        <p className="text-xs text-ink/40 mt-6 text-center">
          目前僅支援 Google 帳號登入
        </p>
      </div>
    </main>
  );
}
