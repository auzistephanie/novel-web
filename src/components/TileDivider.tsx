export default function TileDivider({ dark = false }: { dark?: boolean }) {
  const bg = dark ? "#221a17" : "#efe4cc";
  const line = dark ? "#c99a3c" : "#3a5f8a";
  const dot = "#c1503a";
  const id = dark ? "tileDividerDark" : "tileDividerLight";

  return (
    <svg
      className="tile-divider"
      height="22"
      viewBox="0 0 400 22"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="36" height="22" patternUnits="userSpaceOnUse">
          <rect width="36" height="22" fill={bg} />
          <path
            d="M18 2 L34 11 L18 20 L2 11Z"
            fill="none"
            stroke={line}
            strokeWidth="2"
          />
          <circle cx="0" cy="0" r="2.5" fill={dot} />
          <circle cx="36" cy="22" r="2.5" fill={dot} />
        </pattern>
      </defs>
      <rect width="400" height="22" fill={`url(#${id})`} />
    </svg>
  );
}
