export default function TileDivider({ dark = false }: { dark?: boolean }) {
  const bg = dark ? "%23221a17" : "%23f6efe0";
  const line = dark ? "%23c99a3c" : "%233a5f8a";
  const dot = "%23c1503a";

  const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='22'%3E%3Crect width='36' height='22' fill='${bg}'/%3E%3Cpath d='M18 3 L33 11 L18 19 L3 11Z' fill='none' stroke='${line}' stroke-width='2'/%3E%3Ccircle cx='18' cy='11' r='1.8' fill='${dot}'/%3E%3C/svg%3E`;

  return (
    <div
      className="w-full h-[22px]"
      style={{
        backgroundImage: `url("${svg}")`,
        backgroundRepeat: "repeat-x",
      }}
      aria-hidden="true"
    />
  );
}
