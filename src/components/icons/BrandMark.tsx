interface Props {
  size?: number;
  /** Decorative by default; pass `title` to make it labeled. */
  title?: string;
}

/**
 * Astra Flock signature — a stylized starburst on a moonstone→indigo gradient.
 * Mirrors the SVG used in the legacy drone-show.html top brand mark.
 */
export function BrandMark({ size = 22, title }: Props) {
  const labelled = Boolean(title);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      role={labelled ? 'img' : 'presentation'}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <path d="M11 3 L18 18 L14 18 L11 11 L8 18 L4 18 Z" fill="white" />
    </svg>
  );
}
