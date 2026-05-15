import { expect, test } from '@playwright/test';

test.describe('Show page keyboard shortcuts', () => {
  test('? opens the keyboard hints dialog and Esc closes it', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('toolbar', { name: '再生コントロール' })).toBeVisible();

    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog', { name: 'キーボードショートカット' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('T toggles the tweaks panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('toolbar', { name: '再生コントロール' })).toBeVisible();

    const panel = page.locator('#tweaks-panel');
    await expect(panel).not.toHaveClass(/open/);

    await page.keyboard.press('t');
    await expect(panel).toHaveClass(/open/);

    await page.keyboard.press('Escape');
    await expect(panel).not.toHaveClass(/open/);
  });

  test('Space toggles the play/pause button aria-pressed state', async ({ page }) => {
    await page.goto('/');
    const playBtn = page.getByRole('button', { name: /一時停止|再生/ }).first();
    await expect(playBtn).toBeVisible();
    const initial = await playBtn.getAttribute('aria-pressed');
    await page.keyboard.press(' ');
    await expect(playBtn).not.toHaveAttribute('aria-pressed', initial ?? 'true');
  });
});
