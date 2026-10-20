import sharp from 'sharp';
import {DomainError,requireThat} from '../core/validation.mjs';
import {mediaHash,mediaLimits} from '../core/media-state.mjs';
sharp.cache(false);sharp.concurrency(1);
let processing=false;
export async function processImage(encoded){
  requireThat(!processing,'MEDIA_BUSY');processing=true;
  try{return await decodeImage(encoded);}finally{processing=false;}
}
async function decodeImage(encoded){
  requireThat(typeof encoded==='string'&&encoded.length<=Math.ceil(mediaLimits.fileBytes/3)*4&&encoded.length>0&&encoded.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(encoded),'INVALID_IMAGE');
  const bytes=Buffer.from(encoded,'base64');requireThat(bytes.length<=mediaLimits.fileBytes,'IMAGE_TOO_LARGE');
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  requireThat(png||jpeg||webp,'INVALID_IMAGE');
  try{
    const options={limitInputPixels:mediaLimits.pixels,failOn:'warning'},meta=await sharp(bytes,options).metadata();
    requireThat(['jpeg','png','webp'].includes(meta.format)&&(!meta.pages||meta.pages===1),'INVALID_IMAGE');
    requireThat(meta.width<=mediaLimits.dimension&&meta.height<=mediaLimits.dimension&&meta.width*meta.height<=mediaLimits.pixels,'IMAGE_DIMENSIONS');
    const normalized=sharp(bytes,options).autoOrient();
    const source=await (meta.format==='png'?normalized.png():meta.format==='jpeg'?normalized.jpeg({quality:95}):normalized.webp({lossless:true})).toBuffer({resolveWithObject:true});
    const thumb=await sharp(source.data,options).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).webp({quality:75}).toBuffer();
    const mobile=await sharp(source.data,options).resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
    const total=source.data.length+thumb.length+mobile.length;requireThat(total<=mediaLimits.variantBytes,'IMAGE_TOO_LARGE');
    return {digest:mediaHash(bytes),width:source.info.width,height:source.info.height,bytes:total,variants:{original:{data:source.data,mime:`image/${meta.format}`},mobile:{data:mobile,mime:'image/webp'},thumb:{data:thumb,mime:'image/webp'}}};
  }catch(e){if(e instanceof DomainError)throw e;throw new DomainError('INVALID_IMAGE');}
}
// No public ACL, signed URL or Firebase download token. API checks each read.
export function bucketImages(bucket){return {
  async exists(path){const [exists]=await bucket.file(path).exists();return exists;},
  async ready(){const [exists]=await bucket.file('system/ready').exists();return exists;},
  async put(path,data,mime){await bucket.file(path).save(data,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:mime,cacheControl:'private, no-store'}});},
  async read(path){const [bytes]=await bucket.file(path).download();return bytes;},
  async remove(path){await bucket.file(path).delete({ignoreNotFound:true});},
};}
