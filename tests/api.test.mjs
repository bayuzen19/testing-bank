import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createBank} from '../server/app.mjs';
let bank,server,base;const logs=[];const origin='http://localhost:5174',password='SyntheticDemo!2026';
before(async()=>{
 bank=await createBank({databaseUrl:process.env.DATABASE_URL||'postgresql://banklab:synthetic-lab-only@127.0.0.1:15432/banklab',piiKey:'12'.repeat(32),lookupKey:'34'.repeat(32),origin,log:x=>logs.push(x)});
 server=bank.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(bank)await bank.close();});
async function request(path,{method='GET',body,cookie,csrf,key,from=origin}={}){
 const headers={'Content-Type':'application/json',Origin:from};
 if(cookie)headers.Cookie=cookie;if(csrf)headers['X-CSRF-Token']=csrf;if(key)headers['Idempotency-Key']=key;
 const r=await fetch(base+'/api'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie'),headers:r.headers};
}
async function user(){const email='demo'+randomUUID().replaceAll('-','')+'@example.test';const r=await request('/auth/register',{method:'POST',body:{name:'Demo Alya',email,password,consentVersion:'2026-09-24'}});assert.equal(r.status,201);return {email,cookie:r.cookie.split(';')[0],csrf:r.body.csrf};}
test('health reaches real PostgreSQL',async()=>assert.equal((await request('/health')).body.status,'ok'));
test('registration minimizes PII and rejects real identity domains',async()=>{
 assert.equal((await request('/auth/register',{method:'POST',body:{name:'Demo A',email:'real@gmail.com',password,consentVersion:'2026-09-24'}})).status,400);
 assert.equal((await request('/auth/register',{method:'POST',body:{name:'Demo A',email:'demo-x@example.test',password,consentVersion:'old'}})).status,400);
});
test('encrypted identity and session secrets never stored as plaintext',async()=>{
 const u=await user();assert.match(u.cookie,/bank_session=/);
 const session=await request('/session',u);assert.equal(session.status,200);assert.equal(session.body.name,'Demo Alya');assert.ok(session.body.email.includes('***'));
 const {rows}=await bank.pool.query('SELECT email_cipher,name_cipher,password_hash FROM users ORDER BY created_at DESC LIMIT 1');
 assert.ok(!rows[0].email_cipher.includes(u.email));assert.ok(!rows[0].name_cipher.includes('Demo Alya'));assert.ok(!rows[0].password_hash.includes(password));
 const {rows:sessions}=await bank.pool.query('SELECT token_hash FROM sessions');assert.ok(!sessions.some(s=>u.cookie.includes(s.token_hash)));
});
test('login validates password, sets HttpOnly SameSite, logout revokes session',async()=>{
 const u=await user();assert.equal((await request('/auth/login',{method:'POST',body:{email:u.email,password:'invalid-password'}})).status,401);
 const login=await request('/auth/login',{method:'POST',body:{email:u.email,password}});assert.equal(login.status,200);assert.match(login.cookie,/HttpOnly/);assert.match(login.cookie,/SameSite=Strict/);
 const c={cookie:login.cookie.split(';')[0],csrf:login.body.csrf};assert.equal((await request('/auth/logout',{...c,method:'POST',body:{}})).status,200);assert.equal((await request('/session',c)).status,401);
});
test('auth, Origin and CSRF gates fail closed',async()=>{
 assert.equal((await request('/accounts')).status,401);const u=await user();
 assert.equal((await request('/privacy/consent',{cookie:u.cookie,method:'PATCH',body:{marketing:true}})).status,403);
 assert.equal((await request('/privacy/consent',{...u,method:'PATCH',body:{marketing:true},from:'https://evil.example'})).status,403);
});
test('transfer debits and credits exactly once on replay',async()=>{
 const u=await user(),key=randomUUID(),args={...u,method:'POST',key,body:{destination:'DEMO-1001',amount:125000}};
 const a=await request('/transfers',args),b=await request('/transfers',args);assert.equal(a.status,201);assert.equal(b.status,200);assert.equal(a.body.id,b.body.id);assert.equal(b.body.replayed,true);
 const accounts=await request('/accounts',u);assert.equal(accounts.body[0].balance,4875000);
 const changed=await request('/transfers',{...args,body:{destination:'DEMO-1001',amount:1}});assert.equal(changed.status,409);
});
test('parallel transfer cannot overdraw a balance',async()=>{
 const u=await user();const r=await Promise.all([0,1].map(()=>request('/transfers',{...u,method:'POST',key:randomUUID(),body:{destination:'DEMO-1002',amount:4000000}})));
 assert.deepEqual(r.map(x=>x.status).sort(),[201,409]);assert.equal((await request('/accounts',u)).body[0].balance,1000000);
 assert.equal((await request('/transfers',u)).body.length,1);
});
test('cross-account object access is rejected',async()=>{
 const a=await user(),b=await user();const t=await request('/transfers',{...a,method:'POST',key:randomUUID(),body:{destination:'DEMO-1001',amount:1000}});
 assert.equal((await request('/transfers/'+t.body.id,b)).status,404);assert.equal((await request('/transfers',b)).body.length,0);assert.equal((await request('/transfers/'+t.body.id,a)).status,200);
});
test('money validation rejects fractions, negatives, strings and overflow',async()=>{
 const u=await user();for(const amount of [0,-1,0.1,'100',1e15,null]){assert.equal((await request('/transfers',{...u,method:'POST',key:randomUUID(),body:{destination:'DEMO-1001',amount}})).status,400);}
 assert.equal((await request('/accounts',u)).body[0].balance,5000000);
});
test('privacy preferences, authenticated export and erasure request',async()=>{
 const u=await user();assert.equal((await request('/session',u)).body.marketing,false);
 assert.equal((await request('/privacy/consent',{...u,method:'PATCH',body:{marketing:true}})).body.marketing,true);
 assert.equal((await request('/privacy/consent',{...u,method:'PATCH',body:{marketing:false}})).body.marketing,false);
 assert.equal((await request('/privacy/export',{...u,method:'POST',body:{password:'wrong'}})).status,401);
 const exported=await request('/privacy/export',{...u,method:'POST',body:{password}});assert.equal(exported.status,200);assert.equal(exported.body.email,u.email);assert.ok(!JSON.stringify(exported.body).includes('password_hash'));
 const r=await request('/privacy/requests',{...u,method:'POST',body:{type:'erasure'}});assert.equal(r.status,202);assert.equal((await request('/privacy/requests',u)).body[0].status,'received');
 assert.equal((await request('/accounts',u)).status,200);
});
test('responses restrict caching and audit avoids direct PII',async()=>{
 const u=await user();const r=await request('/session',u);assert.equal(r.headers.get('cache-control'),'no-store');assert.ok(r.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
 const serialized=JSON.stringify(logs);assert.ok(!serialized.includes('@'));assert.ok(!serialized.includes(password));assert.ok(!serialized.includes('Demo Alya'));
 const {rows}=await bank.pool.query('SELECT * FROM audit_events');assert.ok(rows.length>0);assert.ok(!JSON.stringify(rows).includes('@'));
});
