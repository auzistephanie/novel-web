export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-ink text-cream/70">
      <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-serif font-black text-cream">
          <span className="w-2.5 h-2.5 rounded-full bg-brick inline-block" />
          顧事
        </div>
        <p className="text-xs">
          © {new Date().getFullYear()} 顧事 · AI 生成中文網絡小說
        </p>
      </div>
    </footer>
  );
}
