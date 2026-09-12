// npm install --prefix /tmp/todago-audit @playwright/test
// Start the admin at http://127.0.0.1:5174, then run this file with node.
import { chromium, expect } from '/tmp/todago-audit/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: '/home/orven/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome' });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 393, height: 851 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const adminId = '00000000-0000-0000-0000-000000000001';
    const passengerId = '00000000-0000-0000-0000-000000000002';
    const driverId = '00000000-0000-0000-0000-000000000003';
    let completedFare = 50;
    const offsets = new Set();
    const now = new Date().toISOString();
    const profile = { id: adminId, role: 'admin', is_active: true, first_name: 'Test', last_name: 'Admin' };
    await page.addInitScript(({ adminId }) => {
      const user = { id: adminId, email: 'admin@example.test', role: 'authenticated', aud: 'authenticated', user_metadata: {}, app_metadata: {} };
      const access_token = btoa('{}') + '.' + btoa(JSON.stringify({ sub: adminId, exp: Math.floor(Date.now() / 1000) + 3600 })) + '.test';
      localStorage.setItem('sb-nbpzwbsptfcfyxjcpqgo-auth-token', JSON.stringify({ access_token, refresh_token: 'test', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
    }, { adminId });
    await page.route('**/auth/v1/**', route => route.fulfill({ json: { id: adminId, email: 'admin@example.test' } }));
    await page.route('**/rest/v1/**', async route => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').at(-1);
      if (table === 'profiles' && url.searchParams.has('id')) return route.fulfill({ json: profile });
      const fixtures = {
        profiles: [profile, { id: passengerId, role: 'passenger', is_active: true, first_name: 'Test', last_name: 'Passenger', created_at: now }, { id: driverId, role: 'driver', first_name: 'Test', last_name: 'Driver', created_at: now }],
        passengers: [{ id: passengerId, profile_id: passengerId, discount_document_status: 'VERIFIED' }],
        drivers: [{ id: driverId, profile_id: driverId, document_status: 'VERIFIED', created_at: now }],
        vehicle_types: [{ id: 'type' }],
        bookings: Array.from({ length: 1001 }, (_, index) => ({ id: `booking-${index}`, passenger_id: passengerId, driver_id: driverId, status: index === 1000 ? 'completed' : index === 0 ? 'paymentSent' : 'cancelled', cancelled_by: 'driver', estimated_fare: index === 1000 ? completedFare : 200, created_at: now, completed_at: index === 1000 ? now : null, pickup_address: 'Pickup', dropoff_address: 'Dropoff' })),
      };
      const rows = fixtures[table] || [];
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 500);
      if (table === 'bookings') offsets.add(offset);
      await route.fulfill({ json: rows.slice(offset, offset + limit) });
    });
    await page.goto('http://127.0.0.1:5174');
    const earnings = page.getByText('Total Earnings', { exact: true }).first().locator('..');
    await expect(earnings).toContainText('50', { timeout: 20000 });
    assert(offsets.has(1000), 'All booking pages must be fetched');
    await expect(earnings).not.toContainText('250');
    completedFare = 75;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(earnings).toContainText('75');
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(1);
    await page.screenshot({ path: `/tmp/todago-admin-offline-${viewport.width}.png` });
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(earnings).toContainText('75');
    await page.screenshot({ path: `/tmp/todago-admin-synced-${viewport.width}.png` });
    assert.equal(errors.length, 0, errors.join('\n'));
    await context.close();
  }
  console.log('PASS: desktop/mobile pagination, completed-only earnings, reconnect refresh and one offline popup');
} finally {
  await browser.close();
}
