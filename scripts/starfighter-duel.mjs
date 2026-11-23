// Isolated two-station training room. No campaign credentials or persistent data.
import {createServer} from 'node:http';
import {createServer as createTLS} from 'node:https';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {duel,step,controls,decision,STEP} from '../web/cockpit/duel-model.mjs';
const room=duel(), seats=[0,1].map(()=>({key:randomBytes(24).toString('hex'), input:{}, stream:null, updated:0}));
const files=new Set(['duel.html','duel-ui.mjs','duel-model.mjs']);
function send(seat,type,data) {seat.stream?.write(JSON.stringify({type,data})+'\n');}
function resetCall() { room.linked.fill(false); for (const seat of seats) send(seat,'hangup',null); }
async function handle(req,res) {
  res.setHeader('Cache-Control','no-store');
  const path=req.url.split('?')[0];
  const file=path==='/'?'duel.html':path.slice(1);
  if(req.method==='GET' && files.has(file)) {
    res.setHeader('Content-Type',file.endsWith('html')?'text/html; charset=utf-8':'application/javascript');
    return res.end(await readFile(new URL('../web/cockpit/'+file,import.meta.url)));
  }
  const i=seats.findIndex(s=>req.headers.authorization==='Bearer '+s.key);
  if(i<0){res.writeHead(403);return res.end();}
  const seat=seats[i],other=seats[1-i];
  if(req.method==='GET' && path==='/stream') {
    if(seat.stream){res.writeHead(409);return res.end();}
    seat.stream=res;seat.input={};
    res.writeHead(200,{'Content-Type':'application/x-ndjson'});send(seat,'seat',i);resetCall();
    res.on('close',()=>{if(seat.stream===res){seat.stream=null;seat.input={};resetCall();}});
    return;
  }
  if(req.method!=='POST'||path!=='/command'||!seat.stream){res.writeHead(409);return res.end();}
  let body=''; for await(const part of req){body+=part;if(body.length>64000){res.writeHead(413);return res.end();}}
  const {type,data}=JSON.parse(body);
  if(type==='input'){seat.input=controls(data);seat.updated=Date.now();}
  else if(type==='signal' && ['appel','parole'].includes(room.phase)) send(other,'signal',data);
  else if(type==='hangup') resetCall();
  else if(seats.every(s=>s.stream)) decision(room,i,type);
  res.end('{}');
}
const tls=process.env.DUEL_CERT && process.env.DUEL_KEY;
const listener=(req,res)=>handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(400);res.end();});
const server=tls?createTLS({cert:await readFile(process.env.DUEL_CERT),key:await readFile(process.env.DUEL_KEY)},listener):createServer(listener);
setInterval(()=>{
  const ready=seats.every(s=>s.stream);
  if(ready)step(room,seats.map(s=>Date.now()-s.updated<450?s.input:{}));
  for(const s of seats)send(s,'frame',{room,ready});
},STEP*1000).unref();
server.listen(Number(process.env.PORT||8787),process.env.DUEL_HOST||'127.0.0.1',()=>{
  const base=process.env.DUEL_ORIGIN||((tls?'https':'http')+'://localhost:'+server.address().port);
  seats.forEach((s,i)=>console.log('Cockpit '+(i+1)+' '+base+'/#'+s.key));
});
