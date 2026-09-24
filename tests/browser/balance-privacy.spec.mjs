import { test, expect } from '@playwright/test';

test('balance privacy toggle removes amount from the DOM and remains keyboard accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nama Lengkap').fill('Demo Rekaman');
  await page.getByLabel('Email', { exact: true }).fill(`demo.record${Date.now()}@example.test`);
  await page.getByLabel(/Kata Sandi/).fill('SyntheticRecording!2026');
  await page.getByLabel('Saya memahami penggunaan data sintetis').check();
  await page.getByRole('button', { name: 'Daftar Sekarang' }).click();
  await expect(page.locator('.balance')).toContainText('5.000.000');
  const hide = page.getByRole('button', { name: 'Sembunyikan saldo', exact: true });
  await expect(hide).toHaveAttribute('aria-pressed', 'false');
  await hide.focus();
  await page.keyboard.press('Enter');
  const show = page.getByRole('button', { name: 'Tampilkan saldo', exact: true });
  await expect(show).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.balance')).toHaveText('Saldo disembunyikan');
  expect(await page.locator('.passbook').innerHTML()).not.toContain('5.000.000');
  await show.click();
  await expect(page.locator('.balance')).toContainText('5.000.000');
  await page.setViewportSize({ width: 390, height: 844 });
  await hide.click();
  await expect(show).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.locator('.balance')).toContainText('5.000.000');
});
