import QRCode from 'qrcode';
import {zipSync,strToU8} from 'fflate';
const valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export function terminalQrUrl(origin,sid,id){const u=new URL(origin);if(u.origin!==origin||!['https:','http:'].includes(u.protocol)||!valid(sid)||!valid(id))throw Error('Invalid public terminal link');return `${origin}/#/local/${sid}/${id}`;}
export async function terminalQrSvg(origin,sid,t){return QRCode.toString(terminalQrUrl(origin,sid,t.id),{type:'svg',margin:4,errorCorrectionLevel:'M'});}
export async function terminalQrPng(origin,sid,t){return QRCode.toDataURL(terminalQrUrl(origin,sid,t.id),{width:1800,margin:4,errorCorrectionLevel:'M'});}
const pdfText=s=>String(s).replace(/[\\()]/g,'\\$&').replace(/[^\x20-\x7e]/gu,c=>c.codePointAt(0)<=255?`\\${c.codePointAt(0).toString(8).padStart(3,'0')}`:'?');
// A4 vector QR pages. ASCII PDF syntax keeps byte offsets and stream lengths exact.
export function terminalQrPdf(origin,sid,terminals){
 if(!terminals.length||terminals.length>100)throw Error('Choose 1–100 terminals');
 const objects=['',''],pages=[];const add=s=>{objects.push(s);return objects.length;};
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 for(let offset=0;offset<terminals.length;offset+=6){
  let content='';for(const [i,t] of terminals.slice(offset,offset+6).entries()){
   const qr=QRCode.create(terminalQrUrl(origin,sid,t.id),{errorCorrectionLevel:'M'}),n=qr.modules.size,unit=180/(n+8),x=50+(i%2)*260,y=605-Math.floor(i/2)*250;
   content+=`BT /F1 10 Tf ${x} ${y+207} Td (${pdfText(String(t.name).slice(0,24)+(String(t.name).length>24?'...':''))}) Tj ET\nBT /F1 9 Tf ${x} ${y+190} Td (${pdfText(t.id)}) Tj ET\n`;
   for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.modules.get(r,c))content+=`${(x+(c+4)*unit).toFixed(4)} ${(y+(n-r+3)*unit).toFixed(4)} ${unit.toFixed(4)} ${unit.toFixed(4)} re f\n`;
  }
  const stream=add(`<< /Length ${content.length} >>\nstream\n${content}endstream`),page=add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`);pages.push(page);
 }
 objects[0]='<< /Type /Catalog /Pages 2 0 R >>';objects[1]=`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map(n=>`${n} 0 R`).join(' ')}] >>`;
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=pdf.length;
 pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return strToU8(pdf);
}
export async function terminalQrZip(origin,sid,terminals,pngBytes=async data=>new Uint8Array(await (await fetch(data)).arrayBuffer())){
 if(!terminals.length||terminals.length>100)throw Error('Choose 1–100 terminals');const files={};
 for(const t of terminals){const name=`terminal-${t.id}`;if(files[`${name}.svg`])throw Error('Duplicate terminal');files[`${name}.svg`]=strToU8(await terminalQrSvg(origin,sid,t));files[`${name}.png`]=await pngBytes(await terminalQrPng(origin,sid,t));}
 files['terminaux-A4.pdf']=terminalQrPdf(origin,sid,terminals);return zipSync(files,{level:0});
}
export function downloadQr(data,type,name){const href=typeof data==='string'&&data.startsWith('data:')?data:URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=href;a.download=name;a.click();if(!href.startsWith('data:'))setTimeout(()=>URL.revokeObjectURL(href),10000);}
