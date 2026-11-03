import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** a11y.spec.ts と同じ基準（既知の負債は警告扱い、critical のみで落とす） */
const ALLOWED_DEBT = new Set<string>(['color-contrast', 'region', 'aria-required-children']);

test.describe('Per-drone view', () => {
  test('fleet drawer opens the show in drone view for that drone', async ({ page }) => {
    await page.goto('/fleet');
    await page.getByRole('searchbox').fill('AS-042');
    await page.getByRole('option', { name: /042/ }).first().click();
    const drawer = page.getByRole('complementary', { name: /AS-042/ });
    await drawer.getByRole('link', { name: /この機体の視点で見る/ }).click();

    await expect(page).toHaveURL(/\/\?pov=AS-042$/);
    const pill = page.locator('.view-pill');
    await expect(pill).toContainText('機体目線');
    await expect(pill.locator('.vp-id')).toHaveText('AS-042');
  });

  test('pov URL param is honoured and [ / ] step through drones by ID', async ({ page }) => {
    await page.goto('/?pov=AS-100');
    const id = page.locator('.view-pill .vp-id');
    await expect(id).toHaveText('AS-100');
    await page.keyboard.press(']');
    await expect(id).toHaveText('AS-101');
    await expect(page).toHaveURL(/pov=AS-101/);
    await page.keyboard.press('[');
    await page.keyboard.press('[');
    await expect(id).toHaveText('AS-099');
  });

  test('an unknown pov id is reported, not silently ignored', async ({ page }) => {
    await page.goto('/?pov=AS-999');
    await expect(page.getByText(/「AS-999」に当たる機体がありません/)).toBeVisible();
  });

  test('pick a drone by ID, add two PiPs, promote one, and pass axe', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /演出設定/ }).click();
    const input = page.getByLabel('機体を指定');

    await input.fill('AS-007');
    await input.press('Enter');
    await expect(page.locator('.view-pill .vp-id')).toHaveText('AS-007');

    await input.fill('abc');
    await input.press('Enter');
    await expect(input).toHaveAttribute('aria-invalid', 'true');

    const add = page.getByRole('button', { name: '小窓に追加' });
    await input.fill('AS-010');
    await add.click();
    await input.fill('200');
    await add.click();

    const list = page.getByRole('list', { name: '小窓で見ている機体' });
    await expect(list).toContainText('AS-010');
    await expect(list).toContainText('AS-200');
    await expect(page).toHaveURL(/pip=AS-010%2CAS-200|pip=AS-010,AS-200/);

    // 小窓は機体 ID の名前と、座標の文字による代替を持つ
    const pip1 = page.getByRole('button', { name: /小窓 1: AS-010/ });
    const pip2 = page.getByRole('button', { name: /小窓 2: AS-200/ });
    await expect(pip1).toBeVisible();
    await expect(pip2).toBeVisible();
    await expect(page.locator('#pip-desc-9')).toHaveText(/x -?\d+\.\d y -?\d+\.\d z -?\d+\.\d m/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('#canvas-root canvas')
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' && !ALLOWED_DEBT.has(v.id)
    );
    if (blocking.length > 0) console.error(JSON.stringify(blocking, null, 2));
    expect(blocking).toEqual([]);

    // 小窓を押すとメインと入れ替わる
    await pip2.click();
    await expect(page.locator('.view-pill .vp-id')).toHaveText('AS-200');
    await expect(list).toContainText('AS-007');
    await expect(list).not.toContainText('AS-200');

    await page.getByRole('button', { name: 'AS-007 の小窓を閉じる' }).first().click();
    await expect(list).not.toContainText('AS-007');
  });

  test('phones get at most two PiPs', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto('/?pov=AS-001&pip=AS-010,AS-020,AS-030');
    await expect(page.locator('.pip-frame')).toHaveCount(2);
    await ctx.close();
  });
});
