import {readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const f of readdirSync('server').filter(x=>x.endsWith('.mjs'))){const r=spawnSync(process.execPath,['--check','server/'+f],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const s=readFileSync('src/App.jsx','utf8')+readFileSync('src/styles.css','utf8');
if(/https?:\/\/(?:fonts\.|images\.unsplash|www\.google-analytics)/.test(s))throw new Error('External UI assets/trackers forbidden');
console.log('Syntax and external asset checks passed');
