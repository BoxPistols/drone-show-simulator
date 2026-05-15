import { expect, test } from '@playwright/test';

test.describe('SPA smoke', () => {
  test('Show page renders chrome (Three.js mount tested separately)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Astra Flock|星群/);
    // Brand mark + nav + transport always render, regardless of WebGL availability
    await expect(page.getByText('星群', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: /プライマリ/ })).toBeVisible();
    await expect(page.getByRole('toolbar', { name: '再生コントロール' })).toBeVisible();
    // The canvas root exists even if WebGL failed; checking presence in DOM rather than visibility
    await expect(page.locator('#canvas-root')).toHaveCount(1);
  });

  test('Fleet page renders KPIs and the 660 grid', async ({ page }) => {
    await page.goto('/fleet');
    await expect(page.getByRole('heading', { name: '機体管理' })).toBeVisible();
    await expect(page.getByRole('listbox', { name: /格子表示/ })).toBeVisible();
  });

  test('Choreography page renders the timeline', async ({ page }) => {
    await page.goto('/choreography');
    await expect(page.getByRole('heading', { name: '振付エディタ' })).toBeVisible();
    await expect(page.getByText('Programme Timeline')).toBeVisible();
  });

  test('Schedule page renders the calendar grid', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page.getByRole('heading', { name: '運航スケジュール' })).toBeVisible();
    await expect(page.getByRole('grid', { name: '日付グリッド' })).toBeVisible();
  });

  test('404 route renders nav back to home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText('404 — Not Found')).toBeVisible();
    await expect(page.getByRole('link', { name: '観賞へ戻る' })).toBeVisible();
  });
});
