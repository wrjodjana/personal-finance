type Props = { name: string; logoUrl: string | null; size?: number; shape?: "circle" | "square" };

export function MerchantAvatar({ name, logoUrl, size = 32, shape = "circle" }: Props) {
  const style = { width: size, height: size };
  const rounding = shape === "square" ? "rounded-md" : "rounded-full";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 ${rounding} border border-edge bg-white object-cover`}
        style={style}
      />
    );
  }
  const letter = name.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${rounding} border border-edge bg-surface font-medium text-muted`}
      style={{ ...style, fontSize: Math.max(size * 0.42, 9) }}
    >
      {letter}
    </span>
  );
}
