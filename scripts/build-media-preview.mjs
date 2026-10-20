// Local-only interface fixture; never copied to Firebase Hosting public/.
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';
const output=resolve(process.argv[2]??'dist/media-preview');await mkdir(output,{recursive:true});
const result=await build({entryPoints:['test/ui/media-preview.mjs'],bundle:true,write:false,format:'esm',target:'es2022'});
const fixtures={};for(const [id,color] of [['portrait','#b9aa91'],['objet','#819d88'],['mission','#93acbe']]){const b=await sharp({create:{width:640,height:480,channels:4,background:color}}).png().toBuffer();fixtures[id]=b.toString('base64');await writeFile(`${output}/${id}.png`,b);}
const css=await readFile('web/style.css','utf8');await writeFile(`${output}/preview.html`,`<!doctype html><html lang="fr"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GN Engine · recette médiathèque</title><style>${css}</style><body><header><strong>GN Engine · recette de l’interface</strong><span>Données fictives · aucun accès à la production</span></header><main id="app"></main><p id="notice" role="status"></p><footer id="calls"></footer><script type="application/json" id="fixture-images">${JSON.stringify(fixtures)}</script><script type="module">${result.outputFiles[0].text}</script></body></html>`);
console.log(`Recette locale : ${output}/preview.html`);
