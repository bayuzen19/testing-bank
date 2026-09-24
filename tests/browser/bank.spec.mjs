import {test,expect} from '@playwright/test';
const password='SyntheticDemo!2026';
const errors=new WeakMap();
test.beforeEach(async({page})=>{errors.set(page,[]);page.on('pageerror',e=>errors.get(page).push(e.message));});
test.afterEach(async({page})=>{expect(errors.get(page),'No unhandled browser errors').toEqual([]);});
async function register(page){
 const email=`demo${Date.now()}${Math.random().toString(36).slice(2,7)}@example.test`;
 await page.goto('/');
 await page.getByLabel('Nama Lengkap').fill('Demo Alya');
 await page.getByLabel('Email',{exact:true}).fill(email);
 await page.getByLabel(/Kata Sandi/).fill(password);
 await page.getByLabel('Saya memahami penggunaan data sintetis').check();
 await page.getByRole('button',{name:'Daftar Sekarang'}).click();
 await expect(page.getByText('Saldo Tersedia',{exact:true})).toBeVisible();
 await expect(page.getByText(/5\.000\.000/).first()).toBeVisible();
 return email;
}
async function prepareTransfer(page){await page.getByLabel('Penerima',{exact:true}).selectOption({label:'Demo Yayasan Pendidikan'});await page.getByLabel('Jumlah (IDR)',{exact:true}).fill('125000');await page.getByRole('button',{name:'Tinjau Transfer',exact:true}).click();}
test('onboarding, reviewed transfer, privacy rights and revoked logout',async({page},info)=>{
 await page.goto('/');await page.screenshot({path:info.outputPath('onboarding.png'),fullPage:true});
 const email=await register(page);await page.screenshot({path:info.outputPath('account.png'),fullPage:true});
 await prepareTransfer(page);
 await expect(page.getByRole('heading',{name:'Konfirmasi Transfer'})).toBeVisible();
 await page.getByRole('button',{name:'Kirim Simulasi',exact:true}).click();
 await expect(page.getByText('Simulasi selesai. Tidak ada uang nyata yang dipindahkan.',{exact:true})).toBeVisible();
 await expect(page.getByText(/4\.875\.000/).first()).toBeVisible();
 await page.screenshot({path:info.outputPath('transfer.png'),fullPage:true});
 await page.getByRole('button',{name:'Privasi',exact:true}).click();
 await expect(page.getByText('Non-aktif',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Aktifkan Penawaran'}).click();await expect(page.getByText('Aktif',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Matikan Penawaran'}).click();await expect(page.getByText('Non-aktif',{exact:true})).toBeVisible();
 await page.getByLabel('Konfirmasi Kata Sandi',{exact:true}).fill(password);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Unduh Data Saya'}).click();
 const file=await download;await file.saveAs(info.outputPath('own-profile.json'));
 const data=JSON.parse(await (await import('node:fs/promises')).readFile(info.outputPath('own-profile.json'),'utf8'));expect(data.email).toBe(email);
 await expect(page.getByLabel('Konfirmasi Kata Sandi',{exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'Ajukan Penghapusan',exact:true}).click();
 await expect(page.getByText(/Pemenuhan memerlukan verifikasi/)).toBeVisible();
 expect((await(await page.request.get('/api/privacy/requests')).json()).length).toBe(1);
 await page.screenshot({path:info.outputPath('privacy.png'),fullPage:true});
 await page.getByRole('button',{name:'Log Out',exact:true}).click();
 expect((await page.request.get('/api/session')).status()).toBe(401);
 await expect(page.getByLabel(/Kata Sandi/)).toHaveValue('');
 await page.reload();await expect(page.getByRole('heading',{name:'Buka akun demo',exact:true})).toBeVisible();
});
test('restored session reloads account data',async({page})=>{await register(page);await page.reload();await expect(page.getByText(/5\.000\.000/).first()).toBeVisible();await expect(page.getByLabel('Penerima',{exact:true}).locator('option')).toHaveCount(3);});
test('network interruption after commit reuses idempotency key',async({page})=>{
 await register(page);await prepareTransfer(page);let first=true;const keys=[];
 await page.route('**/api/transfers',async route=>{if(route.request().method()!=='POST')return route.continue();keys.push(route.request().headers()['idempotency-key']);if(first){first=false;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByRole('button',{name:'Kirim Simulasi',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
 await page.getByRole('button',{name:'Kirim Simulasi',exact:true}).click();await expect(page.getByText('Simulasi selesai. Tidak ada uang nyata yang dipindahkan.',{exact:true})).toBeVisible();
 expect(keys).toHaveLength(2);expect(keys[1]).toBe(keys[0]);expect((await(await page.request.get('/api/transfers')).json()).length).toBe(1);
});
test('mobile fits viewport and retains working navigation',async({page},info)=>{await page.setViewportSize({width:390,height:844});await register(page);await expect(page.getByRole('button',{name:'Privasi',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('mobile.png'),fullPage:true});});

test('existing account signs in after logout with no unsafe inline assets',async({page})=>{
 const email=await register(page);await page.getByRole('button',{name:'Log Out',exact:true}).click();
 await page.getByRole('button',{name:'Masuk di sini'}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Kata Sandi',{exact:true}).fill(password);await page.getByRole('button',{name:'Masuk',exact:true}).click();
 await expect(page.getByText(/5\.000\.000/).first()).toBeVisible();
 expect(await page.locator('[style],script:not([src]),link[href^="https://"]').count()).toBe(0);
 const response=await page.request.get('/api/session');expect(response.headers()['cache-control']).toBe('no-store');expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
});
