import {zipSync,unzipSync} from 'fflate';
export const archiveFileLimit=128*1024*1024,manifestFileLimit=2*1024*1024;
const requireArchive=(condition,code='INVALID_SCENARIO_PACKAGE')=>{if(!condition){const e=new Error(code);e.code=code;throw e;}};
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export const archiveBase64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=32768)result+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(result);};
export const archiveBytes=data=>Uint8Array.from(atob(data),c=>c.charCodeAt(0));
export async function packScenarioArchive(manifest,files){
  const copy=structuredClone(manifest),entries=Object.create(null);let total=0;
  for(const image of copy.images){const bytes=files[image.source.path];requireArchive(bytes instanceof Uint8Array&&bytes.length===image.source.bytes,'SCENARIO_FILE_MISMATCH');image.source.sha256=await sha256(bytes);entries[image.source.path]=bytes;total+=bytes.length;}
  const content=new TextEncoder().encode(JSON.stringify(copy));requireArchive(content.length<=manifestFileLimit&&total+content.length<=archiveFileLimit-100000,'SCENARIO_PACKAGE_TOO_LARGE');
  entries['manifest.json']=content;return zipSync(entries,{level:0});
}
export async function readScenarioArchive(bytes){
  requireArchive(bytes instanceof Uint8Array&&bytes.length<=archiveFileLimit,'SCENARIO_PACKAGE_TOO_LARGE');
  const names=new Set();let total=0,files;
  try{files=unzipSync(bytes,{filter:file=>{
    requireArchive(!names.has(file.name)&&names.size<251);names.add(file.name);
    requireArchive(file.name==='manifest.json'||/^images\/[A-Za-z0-9_-]{1,128}\.(png|jpg|webp)$/.test(file.name));
    // Our format stores entries without ZIP compression: size is bounded before extraction.
    requireArchive(file.compression===0&&file.size===file.originalSize&&file.size>0&&file.size<=(file.name==='manifest.json'?manifestFileLimit:16*1024*1024));
    total+=file.originalSize;requireArchive(total<=archiveFileLimit,'SCENARIO_PACKAGE_TOO_LARGE');return true;
  }});}catch(e){if(e.code==='SCENARIO_PACKAGE_TOO_LARGE')throw e;requireArchive(false);}
  let manifest;try{manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files['manifest.json']));}catch{requireArchive(false);}
  requireArchive(manifest?.format==='gn-engine-scenario'&&manifest.version===1&&Array.isArray(manifest.images)&&manifest.images.length<=250&&Object.keys(files).length===manifest.images.length+1);
  const used=new Set();for(const image of manifest.images){
    const source=image?.source;requireArchive(source&&typeof image.id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(image.id)&&image.version===1);
    const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[source.mime];requireArchive(ext&&source.path===`images/${image.id}.${ext}`&&!used.has(source.path));used.add(source.path);
    const file=files[source.path];requireArchive(file&&file.length===source.bytes&&/^[a-f0-9]{64}$/.test(source.sha256)&&await sha256(file)===source.sha256,'SCENARIO_FILE_MISMATCH');
  }
  return {manifest,files};
}
