import { expect, test } from '@playwright/test';

test.describe('Choreography editor', () => {
  test('add → duplicate → delete cycle increments and decrements the formation count', async ({
    page,
  }) => {
    await page.goto('/choreography');
    const programmeFormations = page.locator('.form-item');
    await expect(programmeFormations).toHaveCount(9);

    // Add picker
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByRole('menuitem', { name: /球体/ }).click();
    await expect(programmeFormations).toHaveCount(10);

    // Duplicate
    await page.getByRole('button', { name: '複製' }).click();
    await expect(programmeFormations).toHaveCount(11);

    // Delete
    await page.getByRole('button', { name: '削除' }).click();
    await expect(programmeFormations).toHaveCount(10);
  });

  test('Cmd/Ctrl+Z undoes the last add', async ({ page }) => {
    await page.goto('/choreography');
    const items = page.locator('.form-item');
    await expect(items).toHaveCount(9);

    await page.getByRole('button', { name: '追加' }).click();
    await page.getByRole('menuitem', { name: /熊/ }).click();
    await expect(items).toHaveCount(10);

    await page.keyboard.press('ControlOrMeta+z');
    await expect(items).toHaveCount(9);
  });

  test('seeking inside the current formation while paused redraws the preview', async ({
    page,
  }) => {
    await page.goto('/choreography');
    await page.getByRole('button', { name: '一時停止' }).click();
    await page.waitForTimeout(300);
    const canvas = page.locator('.ch-preview canvas');
    const before = await canvas.screenshot();

    // 演目 1 は 0〜42 秒（全体の約 11%）。その内側の 5% 地点へシークする（演目は変わらない）
    const track = page.locator('.music-track');
    const box = await track.boundingBox();
    if (!box) throw new Error('music track not visible');
    await track.click({ position: { x: box.width * 0.05, y: box.height / 2 } });
    await page.waitForTimeout(300);

    const after = await canvas.screenshot();
    expect(before.equals(after)).toBe(false);
  });
});
