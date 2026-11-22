import assert from 'node:assert/strict';
import test from 'node:test';
import app,{parseShare,captchaSign,inspectShare} from './worker.js';
const url='https://pan.xunlei.com/s/VP3FQ4Mmxj-uuFrQErrhHDw9A1?pwd=rf3x&path=%2Ffolder';
test('parse url and path',()=>assert.deepEqual(parseShare(url),{shareId:'VP3FQ4Mmxj-uuFrQErrhHDw9A1',passCode:'rf3x',pathSegments:['folder']}));
test('reject malicious domains',()=>{for(const u of ['https://evil.test/s/VP3FQ4Mmxj-uuFrQErrhHDw9A1','https://pan.xunlei.com.evil.test/s/VP3FQ4Mmxj-uuFrQErrhHDw9A1','http://pan.xunlei.com/s/VP3FQ4Mmxj-uuFrQErrhHDw9A1'])assert.throws(()=>parseShare(u));});
test('captcha sign deterministic',()=>{const s=captchaSign('123','abc');assert.match(s,/^1\.[a-f0-9]{32}$/);assert.equal(s,captchaSign('123','abc'));});
test('shared folder lists files and direct links',async()=>{
 let calls=0;
 const mock=async u=>{calls++;const p=new URL(u).pathname,q=new URL(u).searchParams;if(p.endsWith('captcha/init'))return {captcha_token:'test'};if(p.endsWith('/share'))return {pass_code_token:'test',files:[{id:'d',name:'folder',kind:'drive#folder'}]};if(p.endsWith('/share/detail'))return {files:[{id:'a',name:'video.mp4',size:512,web_content_link:'https://cdn.example.com/a'},{id:'b',name:'locked.zip',size:2048}]};if(p.endsWith('/share/file_info')){assert.equal(q.get('file_id'),'b');return {file_info:{id:'b'}}}throw Error('unexpected URL '+u)};
 const r=await inspectShare(url,mock);assert.equal(calls,4);assert.equal(r.summary.total,2);assert.equal(r.summary.resolved,1);assert.equal(r.summary.missing,1);
});
test('http shows page and rejects cross-origin',async()=>{
 const home=await app.fetch(new Request('https://app.example/'));assert.equal(home.status,200);assert.match(await home.text(),/Share Inspector/);
 const bad=await app.fetch(new Request('https://app.example/api/inspect',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.test'},body:JSON.stringify({url})}));assert.equal(bad.status,403);
});

test('network fetch failure gives an actionable stage code',async()=>{
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>{throw new TypeError('connection refused')};
 try{
  const r=await app.fetch(new Request('https://app.example/api/inspect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})}));
  assert.equal(r.status,502);const data=await r.json();assert.equal(data.code,'NETWORK_CAPTCHA');
  assert.doesNotMatch(JSON.stringify(data),/connection refused/);
 }finally{globalThis.fetch=prior}
});
test('upstream redirection is diagnosed instead of shown as connection failure',async()=>{
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>new Response('',{status:302,headers:{location:'https://outside.example/'}});
 try{
  const r=await app.fetch(new Request('https://app.example/api/inspect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})}));
  assert.equal(r.status,502);assert.equal((await r.json()).code,'REDIRECT_CAPTCHA');
 }finally{globalThis.fetch=prior}
});
