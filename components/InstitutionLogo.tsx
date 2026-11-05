type Props = { name: string; logoUrl: string | null; color: string | null; size?: number };

export function InstitutionLogo({ name, logoUrl, color, size = 32 }: Props) {
  const style = { width: size, height: size };
  const rounding = size >= 24 ? "rounded-lg" : "rounded";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 ${rounding} border border-edge bg-white object-contain`}
        style={style}
      />
    );
  }
  const letter = name.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${rounding} font-medium ${color ? "text-white" : "border border-edge bg-surface text-muted"}`}
      style={{ ...style, fontSize: Math.max(size * 0.42, 9), backgroundColor: color ?? undefined }}
    >
      {letter}
    </span>
  );
}
