import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {unzipSync,strFromU8} from 'fflate';
import {terminalQrUrl,terminalQrPng,terminalQrSvg,terminalQrPdf,terminalQrZip} from '../web/contextual-qr.mjs';
const origin='https://game.invalid',sid='session',t={id:'desk',name:'Comptoir impérial (côté quai)'},url=terminalQrUrl(origin,sid,t.id);
const decode=async bytes=>{const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});return jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data;};
test('ACT-13 : PNG haute résolution et SVG vectoriel décodables, lien public sans secret',async()=>{
 const png=Buffer.from((await terminalQrPng(origin,sid,t)).split(',')[1],'base64');assert.equal((await sharp(png).metadata()).width,1800);assert.equal(await decode(png),url);
 const svg=await terminalQrSvg(origin,sid,t);assert.match(svg,/<svg/);assert.equal(await decode(Buffer.from(svg)),url);
 for(const id of ['../secret','a/b','bad?key=secret'])assert.throws(()=>terminalQrUrl(origin,sid,id));assert.throws(()=>terminalQrUrl('https://game.invalid/else',sid,'desk'));
});
test('ACT-13 : PDF A4 vectoriel, offsets/streams valides et matrice QR décodable',async()=>{
 const bytes=terminalQrPdf(origin,sid,[t]),pdf=strFromU8(bytes);assert.match(pdf,/^%PDF-1.4/);assert.match(pdf,/MediaBox \[0 0 595.28 841.89\]/);assert.match(pdf,/\/Count 1/);
 const start=Number(/startxref\n(\d+)/.exec(pdf)[1]);assert.equal(pdf.slice(start,start+4),'xref');
 const rows=pdf.slice(start).split('\n');for(let n=1;n<Number(rows[1].split(' ')[1]);n++){const offset=Number(rows[n+2].slice(0,10));assert.equal(pdf.slice(offset,offset+`${n} 0 obj`.length),`${n} 0 obj`);}
 const m=/<< \/Length (\d+) >>\nstream\n([\s\S]*?)endstream/.exec(pdf);assert.equal(m[2].length,Number(m[1]));
 const rects=[...m[2].matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re f/g)].map(([,x,y,w,h])=>`<rect x="${x}" y="${841.89-Number(y)-Number(h)}" width="${w}" height="${h}"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1191" height="1684" viewBox="0 0 595.28 841.89"><rect width="595.28" height="841.89" fill="white"/><g fill="black">${rects}</g></svg>`;assert.equal(await decode(Buffer.from(svg)),url);
});
test('ACT-13 : ZIP individuel et lot, trois formats et destinations stables',async()=>{
 const zip=unzipSync(await terminalQrZip(origin,sid,[t,{id:'quay',name:'Quai'}]));assert.deepEqual(Object.keys(zip).sort(),['terminal-desk.png','terminal-desk.svg','terminal-quay.png','terminal-quay.svg','terminaux-A4.pdf']);assert.equal(await decode(Buffer.from(zip['terminal-quay.png'])),terminalQrUrl(origin,sid,'quay'));assert.match(strFromU8(zip['terminaux-A4.pdf']),/%PDF/);
 assert.throws(()=>terminalQrPdf(origin,sid,[]));await assert.rejects(terminalQrZip(origin,sid,[t,t]),/Duplicate/);
 const paginated=strFromU8(terminalQrPdf(origin,sid,Array.from({length:7},(_,i)=>({id:`terminal-${i}`,name:`Terminal ${i}`}))));assert.match(paginated,/\/Count 2/);
});
