type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  variant?: "tile" | "mark";
};

const sizeClass = {
  sm: "brand-mark-sm",
  md: "brand-mark-md",
  lg: "brand-mark-lg",
};

export function BrandMark({ size = "md", variant = "tile" }: BrandMarkProps) {
  const src = variant === "tile" ? "/brand/rdw-icon.svg" : "/brand/rdw-mark-indigo.svg";

  return (
    <img
      src={src}
      className={`brand-asset ${sizeClass[size]}`}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
}

export function BrandLockup() {
  return (
    <picture>
      <source srcSet="/brand/rdw-lockup-dark.svg" media="(prefers-color-scheme: dark)" />
      <img src="/brand/rdw-lockup-light.svg" className="brand-lockup" alt="RDW" decoding="async" />
    </picture>
  );
}
