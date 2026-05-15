import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  { path: '/', label: 'Show', anchor: { role: 'toolbar' as const, name: '再生コントロール' } },
  { path: '/fleet', label: 'Fleet', anchor: { role: 'heading' as const, name: '機体管理' } },
  {
    path: '/choreography',
    label: 'Choreography',
    anchor: { role: 'heading' as const, name: '振付エディタ' },
  },
  {
    path: '/schedule',
    label: 'Schedule',
    anchor: { role: 'heading' as const, name: '運航スケジュール' },
  },
  {
    path: '/this-route-does-not-exist',
    label: '404',
    anchor: { role: 'heading' as const, name: '見つかりません' },
  },
] as const;

/**
 * Rules excluded from the gate (still scanned, still printed to the
 * console, but don't fail the build). These are heritage design issues
 * tracked for a follow-up token-driven design pass:
 *   - color-contrast: legacy palette uses 9px text at 2.8:1 in places
 *   - region: parts of the show overlay aren't wrapped in landmarks
 *   - aria-required-children: axe can't traverse the calendar's
 *     `display:contents` row wrappers (semantics are correct in the
 *     accessibility tree; this is a known axe limitation)
 */
const ALLOWED_DEBT = new Set<string>(['color-contrast', 'region', 'aria-required-children']);

for (const route of ROUTES) {
  test(`${route.label} has no critical a11y violations (axe)`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole(route.anchor.role, { name: route.anchor.name })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('#canvas-root canvas')
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' && !ALLOWED_DEBT.has(v.id)
    );
    const warnings = results.violations.filter(
      (v) => v.impact === 'serious' || ALLOWED_DEBT.has(v.id)
    );

    if (warnings.length > 0) {
      console.warn(
        `${route.label}: ${String(warnings.length)} non-blocking a11y warnings (${warnings.map((w) => w.id).join(', ')})`
      );
    }
    if (blocking.length > 0) {
      console.error(JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });
}
