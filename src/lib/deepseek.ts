const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// 純繁體書面語 · 禁粵語 —— 全 app 共用的語言鎖
export const LANG_RULE =
  "你只可使用純正繁體中文書面語（標準白話文），" +
  "絕對禁止任何粵語／廣東話詞彙或語法。" +
  "例如必須用「的」而非「嘅」、「不」而非「唔」、「他/她」而非「佢」、" +
  "「了」而非「咗」、「沒有」而非「冇」、「是」而非「係」、「這個」而非「呢個」。";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function deepseekChat(
  messages: Msg[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY 未設定");

  const timeoutMs = opts.timeoutMs ?? 55_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: opts.temperature ?? 0.9,
        max_tokens: opts.maxTokens ?? 1200,
      }),
      // 避免 Next fetch 快取
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("DeepSeek 回應逾時，請再試一次");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek 回應錯誤 ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 回應為空");
  return content.trim();
}

// 從模型回覆中抽出 JSON 陣列（容錯：可能夾雜 ```json 或前後文字）
export function extractJsonArray(raw: string): string[] {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) {
      return arr.map((x) => String(x).trim()).filter(Boolean);
    }
  } catch {
    // 落到下面 fallback
  }
  return [];
}
