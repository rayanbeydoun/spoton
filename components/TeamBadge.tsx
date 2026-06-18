/* eslint-disable @next/next/no-img-element */
// Team crest / national flag. Uses a plain <img> because the sources are a mix
// of remote SVG and PNG (no Next image config needed). Renders nothing if the
// crest is missing (e.g. a not-yet-decided knockout fixture).

export function TeamBadge({
  src,
  alt,
  size = 22,
}: {
  src: string | null;
  alt: string;
  size?: number;
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className="inline-block shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
