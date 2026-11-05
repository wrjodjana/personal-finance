export function MerchantAvatar({ name, logoUrl, size = 32 }: { name: string; logoUrl: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full border border-edge bg-white object-cover"
        style={style}
      />
    );
  }
  const letter = name.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full border border-edge bg-surface font-medium text-muted"
      style={{ ...style, fontSize: size * 0.4 }}
    >
      {letter}
    </span>
  );
}
