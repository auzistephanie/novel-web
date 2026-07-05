"use client";

import { useEffect, useState } from "react";

export default function BookEntrance() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setShow(false), reduce ? 450 : 2150);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="entrance-stage" aria-hidden="true">
      <button
        onClick={() => setShow(false)}
        className="absolute top-5 right-5 text-gold-soft/80 text-xs tracking-widest hover:text-gold-soft z-10"
        aria-label="略過開場動畫"
      >
        略過 ✕
      </button>

      <div
        className="entrance-cover relative rounded-[4px_9px_9px_4px] overflow-hidden cloth-tex"
        style={{
          width: "min(340px, 78vw)",
          height: "min(460px, 64vh)",
          boxShadow:
            "24px 26px 40px rgba(0,0,0,.5), inset 0 0 46px rgba(0,0,0,.4)",
        }}
      >
        {/* 書脊暗帶 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3"
          style={{ background: "linear-gradient(90deg,#102a1e,#1f4a3a)" }}
        />
        {/* 花磚書脊帶 */}
        <div
          className="absolute top-0 bottom-0 tile-huazhuan-vertical"
          style={{
            left: "12px",
            width: "58px",
            boxShadow: "1px 0 0 rgba(214,189,126,.35)",
          }}
        />
        {/* 燙金外框 */}
        <div
          className="absolute rounded-[3px]"
          style={{
            left: "88px",
            right: "24px",
            top: "34px",
            bottom: "34px",
            border: "1.5px solid rgba(214,189,126,.42)",
            boxShadow: "0 1px 0 rgba(0,0,0,.3)",
          }}
        />
        {/* 燙金書名 */}
        <div
          className="absolute text-center"
          style={{
            left: "84px",
            right: "20px",
            top: "34%",
            color: "#e2c98f",
            textShadow: "0 1px 1px rgba(0,0,0,.55), 0 -1px 0 rgba(255,255,255,.2)",
          }}
        >
          <div
            className="font-serif font-black"
            style={{ fontSize: "56px", letterSpacing: "10px" }}
          >
            顧事
          </div>
          <div
            style={{
              width: "58px",
              height: "2px",
              background: "rgba(214,189,126,.6)",
              margin: "16px auto",
            }}
          />
          <div style={{ fontSize: "12px", letterSpacing: "8px", opacity: 0.85 }}>
            每 日 小 說
          </div>
        </div>
        {/* 書籤帶 */}
        <div
          className="absolute top-0"
          style={{
            left: "64%",
            width: "15px",
            height: "70px",
            background: "linear-gradient(90deg,#7a3b32,#a1503f)",
            boxShadow: "1px 1px 3px rgba(0,0,0,.4)",
            clipPath: "polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)",
          }}
        />
        {/* 受光 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(115deg,rgba(255,255,255,.12),transparent 32%)",
          }}
        />
      </div>
    </div>
  );
}
