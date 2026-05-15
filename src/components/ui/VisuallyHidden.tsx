import type { CSSProperties, ReactNode } from 'react';

const STYLE: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

interface Props {
  children: ReactNode;
  /** Render `children` as actual visible text (e.g. for debugging). */
  visible?: boolean;
}

/**
 * Hides children visually but keeps them readable to screen readers.
 * Standard sr-only pattern, no external CSS dependency.
 */
export function VisuallyHidden({ children, visible = false }: Props) {
  if (visible) return <>{children}</>;
  return <span style={STYLE}>{children}</span>;
}
