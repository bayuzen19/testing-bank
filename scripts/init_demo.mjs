import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env')){console.log('.env already exists; keys preserved.');process.exit(0);}
writeFileSync('.env',[
 'DATABASE_URL=postgresql://banklab:synthetic-lab-only@127.0.0.1:15432/banklab',
 'PII_KEY_HEX='+randomBytes(32).toString('hex'),
 'LOOKUP_KEY_HEX='+randomBytes(32).toString('hex'),
 'APP_ORIGIN=http://localhost:5174','PORT=4100','DEMO_MODE=true','SECURE_COOKIE=false',''
].join('\n'),{mode:0o600});
console.log('Local synthetic .env generated. Keys are not displayed or committed.');
