import {createHash,randomBytes} from 'node:crypto';

const CLIENT_ID='Xqp0kJBXWhwaTpB6';
const CLIENT_VERSION='1.92.89';
const API='https://api-pan.xunlei.com/drive/v1';
const CAPTCHA='https://xluser-ssl.xunlei.com/v1/shield/captcha/init';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const SALTS=['q1FLg','OECaw0higFYs7qCdOWvMEe','1UQvF/CWht+RATnmBnyakvJFHL1jaAb8MRYvdVHQLZ','OV+xWBsbnAehPNmDEUnjcVT','bbuvyCYHdJwBOtJ8Cdeg','9ROgxnyRfQInpATpkchBTZW','vXA2EpRk8','oEd','QCBQwX/','P5NlYzyVtGjJUI/dIzi+SOL+mf0Wl17','7GRbxu7OmpasI841c66J','PEVQN9w+A4wRbGoX','CJ3yz0fu1kqhPDOyL438W','tD75Q'];
class UserError extends Error {constructor(message,status=422){super(message);this.status=status;}}
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export function parseShare(raw){
 if(typeof raw!=='string'||raw.length>3000) throw new UserError('共有URLの形式が正しくありません。',400);
 let u;try{u=new URL(raw.trim());}catch{throw new UserError('迅雷の共有URLを入力してください。',400);}
 if(u.protocol!=='https:'||u.hostname!=='pan.xunlei.com'||u.port||u.username||u.password)throw new UserError('pan.xunlei.com の公式共有URLのみ対応しています。',400);
 const m=/^\/s\/([A-Za-z0-9_-]{12,100})\/?$/.exec(u.pathname);
 if(!m)throw new UserError('迅雷の共有リンクではありません。',400);
 const passCode=u.searchParams.get('pwd')||u.searchParams.get('password')||'';
 const path=u.searchParams.get('path')||'';
 if(passCode.length>48||path.length>1000)throw new UserError('URL内のパラメータが長すぎます。',400);
 const pathSegments=path.split('/').filter(Boolean);
 if(pathSegments.some(s=>s.length>150||s==='.'||s==='..'))throw new UserError('不正なフォルダ指定です。',400);
 return {shareId:m[1],passCode,pathSegments};
}
export function captchaSign(ts,id){
 let s=CLIENT_ID+CLIENT_VERSION+'pan.xunlei.com'+id+ts;
 for(const salt of SALTS)s=createHash('md5').update(s+salt).digest('hex');
 return '1.'+s;
}
const unwrap=x=>x?.data&&typeof x.data==='object'&&!x.files?x.data:x||{};
const name=x=>String(x?.name||x?.file_name||x?.fileName||'');
const id=x=>String(x?.id||x?.file_id||x?.fileId||'');
const folder=x=>x?.kind==='drive#folder'||x?.kind==='folder'||x?.type==='folder'||x?.is_dir===true||x?.is_folder===true||x?.file_category==='FOLDER';
const size=x=>{const n=Number(x?.size||x?.file_size||x?.fileSize||0);return Number.isFinite(n)&&n>=0?n:0;};
function direct(x){
 const c=[x?.web_content_link,x?.download_url,x?.downloadUrl,x?.play_url,x?.playUrl];
 const links=x?.links;
 if(links&&typeof links==='object')for(const k of ['download','download_url','downloadUrl','web_content_link','url','play_url','playUrl']){
  const v=links[k];if(typeof v==='string')c.push(v);else if(v&&typeof v==='object')c.push(v.web_content_link,v.url,v.download_url);
 }
 for(const v of c)if(typeof v==='string'&&v.length<=8000)try{const u=new URL(v);if(u.protocol==='https:'&&u.hostname&&!u.username&&!u.password)return u.href;}catch{}
 return null;
}
function remoteClient(){
 let calls=0;
 return async (url,options={})=>{
  if(++calls>35)throw new UserError('APIの取得回数上限に達しました。フォルダを指定してください。');
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),11000);
  try{
   const r=await fetch(url,{...options,signal:ctrl.signal,redirect:'error'});
   if(r.status===401||r.status===403)throw new UserError('迅雷のログインまたはアクセス権が必要です。',r.status);
   if(r.status===429)throw new UserError('迅雷側でアクセス制限されています。',429);
   if(!r.ok)throw new UserError('迅雷のAPIからエラーが返されました。',502);
   const str=await r.text();if(str.length>1800000)throw new UserError('APIの応答が大きすぎます。',502);
   let data;try{data=JSON.parse(str);}catch{throw new UserError('APIが正しいJSONを返しませんでした。',502);}
   if(data?.error||(typeof data?.code==='string'&&!['0','200'].includes(data.code))){
    const code=String(data.error||data.error_code||data.code).toUpperCase();
    if(/PASS_CODE|PASSWORD/.test(code))throw new UserError('抽出コードが間違っています。');
    if(/EXPIRED|NOT_FOUND|CANCELED/.test(code))throw new UserError('リンクが無効か期限切れです。',404);
    if(/CAPTCHA|RISK|RATE/.test(code))throw new UserError('迅雷のアクセス制限により取得できません。',429);
    if(/AUTH|LOGIN|TOKEN|PERMISSION|FORBIDDEN/.test(code))throw new UserError('ログインが必要な共有の可能性があります。',401);
    throw new UserError('迅雷のAPIがリクエストを拒否しました。',502);
   }
   return data;
  }catch(e){
   if(e?.name==='AbortError')throw new UserError('迅雷への接続がタイムアウトしました。',504);
   if(e instanceof UserError)throw e;
   throw new UserError('迅雷に接続できませんでした。',502);
  }finally{clearTimeout(timer);}
 };
}
export async function inspectShare(url,request=remoteClient()){
 const {shareId,passCode,pathSegments}=parseShare(url);
 const device=randomBytes(16).toString('hex'),ts=String(Date.now());
 const captcha=await request(CAPTCHA,{method:'POST',headers:{'content-type':'application/json','x-client-id':CLIENT_ID,'x-client-version':CLIENT_VERSION,'x-device-id':device,'user-agent':UA},body:JSON.stringify({client_id:CLIENT_ID,action:'get:/drive/v1/share',device_id:device,meta:{username:'',phone_number:'',email:'',package_name:'pan.xunlei.com',client_version:CLIENT_VERSION,captcha_sign:captchaSign(ts,device),timestamp:ts,user_id:'0'}})});
 if(!captcha?.captcha_token)throw new UserError('迅雷の確認トークンを取得できませんでした。',502);
 const headers={'accept':'application/json','x-client-id':CLIENT_ID,'x-client-version':CLIENT_VERSION,'x-device-id':device,'x-captcha-token':captcha.captcha_token,'referer':'https://pan.xunlei.com/','user-agent':UA};
 let token='',truncated=false;
 async function list(parent=''){
  let page='',pages=0;const results=[];
  do{
   const q=new URLSearchParams({share_id:shareId,limit:'100',space:'',scene:'NORMAL'});
   if(parent){q.set('parent_id',parent);q.set('pass_code_token',token);}
   else{q.set('pass_code',passCode);if(token)q.set('pass_code_token',token);}
   if(page)q.set('page_token',page);
   const r=unwrap(await request(API+(parent?'/share/detail':'/share')+'?'+q,{headers}));
   token=r.pass_code_token||r.share_info?.pass_code_token||token;
   const files=Array.isArray(r.files)?r.files:Array.isArray(r.files?.list)?r.files.list:[];
   results.push(...files.filter(x=>x&&id(x)&&name(x)));
   const next=String(r.next_page_token||r.page_token_next||'');
   if(!next||next===page)break;
   page=next;if(++pages>=5){truncated=true;break;}
  }while(true);
  return results;
 }
 let current=await list(),selectedPath='',parent='';
 for(const s of pathSegments){
  const next=current.find(x=>folder(x)&&name(x)===s);
  if(!next)throw new UserError('指定されたフォルダが見つかりません: '+s,404);
  selectedPath+=s+'/';parent=id(next);current=await list(parent);
 }
 const queue=current.map(x=>({item:x,path:selectedPath,depth:0,parent})),seen=new Set(),files=[];
 while(queue.length){
  const {item,path,depth,parent}=queue.shift(),fid=id(item);
  if(!fid||seen.has(fid))continue;seen.add(fid);
  if(folder(item)){
   if(depth>=8){truncated=true;continue;}
   const children=await list(fid);
   for(const child of children)queue.push({item:child,path:path+name(item)+'/',depth:depth+1,parent:fid});
   continue;
  }
  if(files.length>=300){truncated=true;break;}
  files.push({id:fid,name:name(item),path,size:size(item),downloadUrl:direct(item),parentId:parent});
 }
 let checked=0;
 for(const file of files){
  if(file.downloadUrl||checked>=20)continue;checked++;
  const q=new URLSearchParams({share_id:shareId,file_id:file.id,pass_code:passCode,pass_code_token:token,folder_id:file.parentId||'',space:'',scene:'NORMAL'});
  try{
   const data=unwrap(await request(API+'/share/file_info?'+q,{headers}));
   file.downloadUrl=direct(data.file_info||data.info||data);
  }catch(e){if(e instanceof UserError&&/回数上限/.test(e.message)){truncated=true;break;}}
 }
 const resolved=files.filter(f=>f.downloadUrl).length;
 return {shareId,selectedPath,files:files.map(({parentId,...x})=>x),summary:{total:files.length,resolved,missing:files.length-resolved,checked,truncated},notice:resolved?'迅雷が返した直接URLのみ表示しています。有効期限がある場合があります。':'ファイル情報は取得できましたが、直接URLはありませんでした。ログインが必要な可能性があります。'};
}
const html='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>迅雷 Share Inspector</title>'+
'<style>:root{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#182623;background:#f5f5f2;--accent:#116357;--line:#ccd2cc}*{box-sizing:border-box}body{margin:0}header,footer{padding:20px max(20px,calc((100vw - 960px)/2));border-bottom:1px solid var(--line)}header{font-weight:700}main{max-width:960px;margin:0 auto;padding:55px 20px 90px}h1{font-size:clamp(29px,4.7vw,48px);letter-spacing:-.06em;line-height:1.25;max-width:700px}p{max-width:690px;color:#52615d;line-height:1.8}label{display:block;font-size:14px;font-weight:700;margin:32px 0 10px}textarea{width:100%;min-height:108px;padding:14px;font:14px/1.5 ui-monospace,monospace;border:1px solid #aab4b0;border-radius:7px;resize:vertical}textarea:focus{outline:3px solid #9bd2c8}button{background:var(--accent);color:white;border:0;border-radius:5px;padding:13px 22px;font-weight:700;cursor:pointer;margin:14px 15px 14px 0}button:disabled{opacity:.55;cursor:wait}small{color:#65716e}#error{color:#a3312d;white-space:pre-wrap}#results{margin-top:42px}section[hidden],[hidden]{display:none!important}.stats{border-bottom:1px solid var(--line);padding:12px 0 20px;display:flex;gap:28px;flex-wrap:wrap}.stats strong{font-size:21px}table{width:100%;border-collapse:collapse}th,td{font-size:13px;padding:13px 7px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}td:first-child{overflow-wrap:anywhere}th:last-child,td:last-child{text-align:right}a{color:var(--accent);font-weight:700}.path{display:block;font-size:11px;color:#66736f;margin-top:5px}footer{border-bottom:0;border-top:1px solid var(--line);font-size:12px;color:#67736f}@media(max-width:600px){main{padding-top:26px}th:nth-child(2),td:nth-child(2){display:none}}</style></head><body>'+
'<header>迅雷 / Share Inspector</header><main><h1>共有リンクから、取得可能なファイルを探す。</h1><p>中国の電話番号や迅雷アカウントを登録せず、共有ファイルを解析します。ログイン制限の解除は行いません。</p>'+
'<form id="f"><label for="u">迅雷の共有URL</label><textarea id="u" required spellcheck="false" placeholder="https://pan.xunlei.com/s/...?pwd=...&path=..."></textarea><div><button id="go">リンクを解析</button><small id="state">URLはデータベースに保存されません</small></div></form><p id="error" role="alert" hidden></p>'+
'<section id="results" hidden><h2>解析結果</h2><div class="stats"><span>ファイル数 <strong id="total">0</strong></span><span>直接URLあり <strong id="yes">0</strong></span><span>直接URLなし <strong id="no">0</strong></span></div><p id="notice"></p><table><thead><tr><th>ファイル名</th><th>容量</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table></section></main>'+
'<footer>非公式の試作です。API変更により動作しない場合があります。ダウンロードにはファイルの利用許諾を確認してください。</footer>'+
'<script>const g=id=>document.getElementById(id);const f=g("f"),go=g("go"),state=g("state"),err=g("error"),results=g("results");function bytes(n){if(!Number.isFinite(n)||n<0)return "不明";if(!n)return "0 B";const i=Math.min(4,Math.floor(Math.log(n)/Math.log(1024)));return (n/1024**i).toLocaleString("ja-JP",{maximumFractionDigits:1})+" "+["B","KB","MB","GB","TB"][i]}f.addEventListener("submit",async e=>{e.preventDefault();err.hidden=true;results.hidden=true;go.disabled=true;state.textContent="取得中…";try{const r=await fetch("/api/inspect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:g("u").value.trim()})});const data=await r.json();if(!r.ok)throw new Error(data.error||"解析できませんでした");g("total").textContent=data.summary.total;g("yes").textContent=data.summary.resolved;g("no").textContent=data.summary.missing;g("notice").textContent=data.notice+(data.summary.truncated?" 一部のみ表示しています。":"");g("rows").replaceChildren();for(const x of data.files){const tr=document.createElement("tr"),td=document.createElement("td"),sz=document.createElement("td"),act=document.createElement("td");td.textContent=x.name;if(x.path){const s=document.createElement("span");s.className="path";s.textContent=x.path;td.append(s)}sz.textContent=bytes(x.size);if(x.downloadUrl){const a=document.createElement("a");a.href=x.downloadUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="ダウンロード";act.append(a)}else{act.textContent="取得不可"}tr.append(td,sz,act);g("rows").append(tr)}results.hidden=false;state.textContent="解析完了"}catch(x){err.textContent=x.message||"エラーが発生しました";err.hidden=false;state.textContent="解析失敗"}finally{go.disabled=false}})</script></body></html>';
export default {async fetch(req){
 const url=new URL(req.url);
 if(req.method==='GET'&&url.pathname==='/')return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
 if(url.pathname!=='/api/inspect')return reply({error:'ページが見つかりません。'},404);
 if(req.method!=='POST')return reply({error:'POSTのみ対応しています。'},405);
 const origin=req.headers.get('origin');if(origin&&origin!==url.origin)return reply({error:'このページから操作してください。'},403);
 if(!(req.headers.get('content-type')||'').startsWith('application/json'))return reply({error:'JSON形式で送信してください。'},415);
 if(Number(req.headers.get('content-length')||0)>5000)return reply({error:'リクエストが大きすぎます。'},413);
 try{
  const body=await req.text();if(body.length>5000)return reply({error:'リクエストが大きすぎます。'},413);
  let input;try{input=JSON.parse(body);}catch{return reply({error:'JSON形式が不正です。'},400);}
  if(typeof input?.url!=='string')return reply({error:'URLを入力してください。'},400);
  return reply(await inspectShare(input.url));
 }catch(e){return e instanceof UserError?reply({error:e.message},e.status):reply({error:'解析に失敗しました。'},500);}
}};
