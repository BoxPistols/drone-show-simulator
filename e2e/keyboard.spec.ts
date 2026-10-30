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

  test('settings button opens the tweaks panel and the lite toggle persists', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('#tweaks-panel');
    await page.getByRole('button', { name: /演出設定/ }).click();
    await expect(panel).toHaveClass(/open/);

    const lite = page.getByRole('switch', { name: /軽量モード/ });
    await expect(lite).toHaveAttribute('aria-checked', 'false');
    await lite.click();
    await expect(lite).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await page.getByRole('button', { name: /演出設定/ }).click();
    await expect(page.getByRole('switch', { name: /軽量モード/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('Space toggles the play/pause button aria-pressed state', async ({ page }) => {
    await page.goto('/');
    const playBtn = page.getByRole('button', { name: /一時停止|再生/ }).first();
    await expect(playBtn).toBeVisible();
    const initial = await playBtn.getAttribute('aria-pressed');
    await page.keyboard.press(' ');
    await expect(playBtn).not.toHaveAttribute('aria-pressed', initial ?? 'true');
  });

  test('C cycles camera modes and the view pill offers a way back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('toolbar', { name: '再生コントロール' })).toBeVisible();
    await expect(page.locator('.view-pill')).toHaveCount(0);

    await page.keyboard.press('c');
    const pill = page.locator('.view-pill');
    await expect(pill).toContainText('機体目線');
    await expect(pill).toContainText(/AS-\d{3}/);

    await page.keyboard.press('c');
    await expect(pill).toContainText('360');

    await page.getByRole('button', { name: '観客の視点に戻る' }).click();
    await expect(page.locator('.view-pill')).toHaveCount(0);
  });

  test('V switches to another drone and M toggles the ambient music', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('toolbar', { name: '再生コントロール' })).toBeVisible();
    await page.keyboard.press('v');
    const pill = page.locator('.view-pill');
    const first = await pill.locator('.vp-id').textContent();
    await page.getByRole('button', { name: /別の機体の目線へ/ }).click();
    await expect(pill.locator('.vp-id')).not.toHaveText(first ?? '');

    const music = page.getByRole('button', { name: /アンビエント音楽/ });
    await expect(music).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('m');
    await expect(music).toHaveAttribute('aria-pressed', 'true');
    await music.click();
    await expect(music).toHaveAttribute('aria-pressed', 'false');
  });
});
