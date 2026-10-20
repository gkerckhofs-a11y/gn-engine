// Local UI fixture: fictional content only, never included in Hosting public/.
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='dist/action-point-preview';await mkdir(out,{recursive:true});
const js=await build({entryPoints:['test/ui/action-point-preview.mjs'],bundle:true,write:false,format:'esm'});
const css=await readFile('web/style.css','utf8');
await writeFile(`${out}/index.html`,`<!doctype html><html lang="fr"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GN Engine · vérification PA</title><style>${css}</style><body><header><strong>GN Engine · vérification locale</strong></header><main id="app"></main><script type="module">${js.outputFiles[0].text}</script></body></html>`);
