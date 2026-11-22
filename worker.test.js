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

test('no direct URL is distinguished from a detail failure',async()=>{
 const base='https://pan.xunlei.com/s/VP3FQ4Mmxj-uuFrQErrhHDw9A1?pwd=rf3x';
 const mock=async target=>{
  const u=new URL(target);
  if(u.pathname.endsWith('/captcha/init'))return {captcha_token:'t'};
  if(u.pathname.endsWith('/share'))return {files:[{id:'a',name:'first.rar',size:100},{id:'b',name:'second.rar',size:200},{id:'c',name:'readme.txt',web_content_link:'https://example.com/file'}]};
  if(u.pathname.endsWith('/share/file_info')){
   if(u.searchParams.get('file_id')==='a')return {file_info:{id:'a'}};
   const e=new Error('Blocked');e.code='HTTP_403_FILE_INFO';e.status=403;throw e;
  }
  throw Error('unknown');
 };
 const r=await inspectShare(base,mock);
 assert.equal(r.summary.total,3);
 assert.equal(r.summary.resolved,1);
 assert.equal(r.files[0].downloadStatus,'NO_DIRECT_URL');
 assert.equal(r.files[1].downloadStatus,'ACCESS_RESTRICTED');
 assert.equal(r.files[1].statusDetail,'HTTP_403_FILE_INFO');
 assert.equal(r.files[2].downloadStatus,'READY');
 assert.ok(!JSON.stringify(r).includes('Blocked'));
});
test('unexpected file detail errors are not misreported as login required',async()=>{
 const mock=async target=>{
  const u=new URL(target);
  if(u.pathname.endsWith('/captcha/init'))return {captcha_token:'t'};
  if(u.pathname.endsWith('/share'))return {files:[{id:'a',name:'archive.rar'}]};
  if(u.pathname.endsWith('/share/file_info'))throw new Error('bad upstream');
  throw Error('unknown');
 };
 const r=await inspectShare('https://pan.xunlei.com/s/VP3FQ4Mmxj-uuFrQErrhHDw9A1',mock);
 assert.equal(r.files[0].downloadStatus,'DETAIL_FAILED');
 assert.equal(r.files[0].statusDetail,'UNKNOWN');
});
