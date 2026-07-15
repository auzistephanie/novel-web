// Admin 白名單——目前得 Stephanie 一個帳戶可以入 /admin 同刪故事。
// 日後要加多個 admin，落呢個 array 加多個 email 就得。
const ADMIN_EMAILS = ["auzistephanie@gmail.com"];

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
