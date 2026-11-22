import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const script=await build({entryPoints:['web/cockpit/flight-ui.mjs'],bundle:true,format:'iife',write:false});
const template=await readFile('web/cockpit/starfighter.html','utf8');
await mkdir('dist/starfighter',{recursive:true});
await writeFile('dist/starfighter/STARFIGHTER.html',template.replace('<script type="module" src="./flight-ui.mjs"></script>',()=>'<script>'+script.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>'));
