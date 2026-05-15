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
});
