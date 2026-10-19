import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('public',{recursive:true});
await build({entryPoints:['web/app.mjs'],outfile:'public/app.js',bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'eof'});
for(const f of ['index.html','style.css']) await copyFile(`web/${f}`,`public/${f}`);
await writeFile('public/version.json',JSON.stringify({version:JSON.parse(await readFile('package.json')).version}));
console.log('Interface compilée dans public/');
