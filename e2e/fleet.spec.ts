import { expect, test } from '@playwright/test';

test.describe('Fleet operations', () => {
  test('search narrows the visible drone count', async ({ page }) => {
    await page.goto('/fleet');
    const counter = page.getByRole('status').first();
    await expect(counter).toContainText('660 / 660');

    await page.getByRole('searchbox').fill('AS-042');
    await expect(counter).toContainText('1 / 660');
  });

  test('clicking a drone opens the drawer with its id', async ({ page }) => {
    await page.goto('/fleet');
    await page
      .getByRole('option', { name: /AS-001|001/ })
      .first()
      .click();
    const drawer = page.getByRole('complementary', { name: /AS-/ });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { name: /AS-/ })).toBeVisible();
  });

  test('view-mode radio toggles between grid and table', async ({ page }) => {
    await page.goto('/fleet');
    await expect(page.getByRole('listbox', { name: /格子表示/ })).toBeVisible();

    await page.getByRole('radio', { name: '一覧' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('listbox', { name: /格子表示/ })).toBeHidden();
  });
});
