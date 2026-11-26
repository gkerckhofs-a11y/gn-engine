import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from '../test/support/memory.mjs';
import {ticketFixture} from '../test/support/tickets-suite.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const roles={visitor:'Visiteur',new:'Nouvel inscrit',pending:'Paiement en attente',paid:'Payé sans rôle',selected:'Payé avec rôle',owner:'Régie'};
const css='position:relative;background:#322734;color:#fff4db;font:14px system-ui;padding:.6rem 3vw;display:flex;align-items:center;gap:.45rem;flex-wrap:wrap';
const banner=`<aside aria-label="Profils fictifs" style="${css}"><strong>Démo locale</strong><label>Profil <select id="demo-profile">${Object.entries(roles).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label><span>Identités et paiements simulés</span></aside>`;
const boot=`const d=await (await fetch('/demo/account')).json();document.querySelector('#demo-profile').value=d.profile;
window.demoSwitch=async function(profile,navigate=true){const r=await fetch('/demo/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile})});if(!r.ok)throw Error('Profil indisponible');const next=await r.json();if(navigate)location.assign(next.url);else location.reload();};
document.querySelector('#demo-profile').onchange=e=>demoSwitch(e.target.value);window.demoAccount=d;`;
const authFixture=`export const auth={currentUser:window.demoAccount?.user?{...window.demoAccount.user,getIdToken:async()=>'local-test'}:null};
export class GoogleAuthProvider{setCustomParameters(){}}
export const onAuthStateChanged=(a,cb)=>{queueMicrotask(cb);return ()=>{}},setPersistence=async()=>{},browserSessionPersistence={},signInWithPopup=()=>window.demoSwitch('new',false),reauthenticateWithPopup=signInWithPopup,signOut=()=>window.demoSwitch('visitor');export default auth;`;
const mime={html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css',webp:'image/webp'};
export async function demoAssets(){
 const {build}=await import('esbuild');
 const assets=new Map(),plugins=[{name:'local-auth-fixture',setup(b){b.onResolve({filter:/firebase-client\.mjs$|^firebase\/auth$/},()=>({path:'test-identity',namespace:'demo'}));b.onLoad({filter:/.*/,namespace:'demo'},()=>({contents:authFixture}));}}];
 for(const [url,entry] of [['/aventures/billets.js','web/aventures/client.mjs'],['/app.js','web/app.mjs']]){
  const result=await build({absWorkingDir:root,entryPoints:[entry],write:false,bundle:true,format:'esm',target:'es2022',minify:true,plugins});
  assets.set(url,result.outputFiles[0].contents);
 }
 for(const [url,path] of [['/','public/index.html'],['/aventures/','public/aventures/index.html'],['/style.css','public/style.css'],['/galactic.css','public/galactic.css'],...['billets.css','port.webp','equipage.webp'].map(n=>['/aventures/'+n,'public/aventures/'+n])]){
  const content=await readFile(root+path);
  if(!url.endsWith('/')){assets.set(url,content);continue;}
  // Keep the production router and views. Only the identity provider is simulated.
  assets.set(url,content.toString().replace('<body>','<body>'+banner).replace(/<script type="module" src="([^"]+)"><\/script>/,(_,src)=>'<script type="module">'+boot+'await import('+JSON.stringify(src)+');</script>'));
 }
 return assets;
}
export async function startTicketDemo(port=0,precompiled=null){
 const f=await ticketFixture(()=>new MemoryStore());f.advance(Date.now()-1000000);
 const actor=()=>({...f.player,uid:randomUUID(),email:randomUUID()+'@example.invalid',authTime:Math.ceil(Date.now()/1000)});
 const profiles={visitor:null,new:actor(),pending:actor(),paid:actor(),selected:actor(),owner:f.owner};
 await f.open(5,['vigie','guide','courrier','vigile','escorte']);
 for(const id of ['pending','paid','selected']){
  const user=profiles[id],e=await f.call('ticketPage',{},null),o=await f.cmd('ticketReserve',{revision:e.revision,policyVersion:e.policyVersion,price:e.price,name:roles[id]+' fictif',consent:true},user);
  if(id!=='pending')await f.pay(user,o.attempt);
  if(id==='selected'){const g=await f.call('ticketGallery',{},user);await f.cmd('ticketSelect',{roleId:'courrier',revision:g.revision,orderRevision:g.orderRevision,confirm:true},user);}
 }
 const assets=precompiled?new Map(Object.entries(precompiled).map(([k,v])=>[k,Buffer.from(v,'base64')])):await demoAssets();
 let last=Date.now();
 const server=http.createServer(async(req,res)=>{
  const origin='http://127.0.0.1:'+server.address().port;
  const json=(status,obj)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj));};
  if(req.headers.host!==new URL(origin).host)return json(403,{error:'LOCAL_ONLY'});
  const path=new URL(req.url,origin).pathname,who=(req.headers.cookie??'').match(/(?:^|; )ticket_profile=(\w+)/)?.[1]??'visitor';
  const user=Object.hasOwn(profiles,who)?profiles[who]:null;
  try{
   if(req.method==='GET'&&assets.has(path)){const type=path.endsWith('/')?'html':path.split('.').pop();res.writeHead(200,{'content-type':mime[type],'cache-control':'no-store'});res.end(assets.get(path));return;}
   if(req.method==='GET'&&path==='/demo/account')return json(200,{profile:who,user:user?{uid:user.uid,email:user.email,displayName:roles[who]}:null});
   if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']!=='application/json')return json(403,{error:'LOCAL_ONLY'});
   let body='';for await(const chunk of req){body+=chunk;if(body.length>128000)return json(400,{error:'INVALID_BODY'});}
   const input=JSON.parse(body);
   if(path==='/demo/profile'){
    if(!Object.hasOwn(profiles,input.profile))return json(400,{error:'INVALID_PROFILE'});
    res.setHeader('Set-Cookie','ticket_profile='+input.profile+'; Path=/; HttpOnly; SameSite=Strict');
    const url=input.profile==='owner'?'/#/billetterie-admin/'+f.sid:['visitor','new'].includes(input.profile)?'/aventures/':'/aventures/#/moi';
    return json(200,{url});
   }
   if(path!=='/api/command')return json(404,{error:'NOT_FOUND'});
   const now=Date.now();f.advance(now-last);last=now;
   const result=await f.wf.dispatch(input.action,user,input.input??{});return json(200,{result});
  }catch(err){return json(err.code==='FORBIDDEN'?403:err.code==='LOGIN_REQUIRED'?401:400,{error:err.code??'INVALID_BODY'});}
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
 return {url:'http://127.0.0.1:'+server.address().port+'/aventures/',sessionId:f.sid,close:()=>new Promise(ok=>server.close(ok))};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const assets=process.argv.includes('--portable')?JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8')):null;
 const demo=await startTicketDemo(Number(process.env.TICKET_DEMO_PORT??4179),assets);console.log('Démo billetterie en mémoire · '+demo.url);
}
