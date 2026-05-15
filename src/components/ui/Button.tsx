import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'ch-btn primary',
  ghost: 'ch-btn ghost',
  danger: 'ch-btn ghost danger',
  icon: 'ch-btn ghost ch-icon',
};

/**
 * Reuses the legacy .ch-btn styles (defined in choreography page CSS) so the
 * visual treatment stays identical during the SPA migration. Will be replaced
 * with a token-driven variant system in P9.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'ghost', className, type = 'button', children, ...rest },
  ref
) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});
