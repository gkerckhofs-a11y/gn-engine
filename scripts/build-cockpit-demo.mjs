import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const result=await build({entryPoints:['web/cockpit/cockpit.mjs'],bundle:true,format:'iife',write:false,target:'es2022',minify:true});
const css=await readFile('web/cockpit/cockpit.css','utf8');
const html=(await readFile('web/cockpit/index.html','utf8'))
 .replace('<link rel="stylesheet" href="./cockpit.css">',`<style>${css}</style>`)
 .replace('<script type="module" src="./cockpit.mjs"></script>',`<script>${result.outputFiles[0].text.replaceAll('</script','<\\/script')}</script>`)
 .replace('href="../"','href="https://gn-engine.web.app/"');
await mkdir('docs/demos',{recursive:true});
await writeFile('docs/demos/Space_Outlaws_Cockpit.html',html);
console.log('Démonstration autonome : docs/demos/Space_Outlaws_Cockpit.html');
