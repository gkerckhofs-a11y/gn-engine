import {mkdir,copyFile,readFile,writeFile,readdir,cp} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('public',{recursive:true});
await build({entryPoints:['web/app.mjs'],outfile:'public/app.js',bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'eof'});
const version=JSON.parse(await readFile('package.json')).version;
const template=await readFile('web/index.html','utf8');
if(!template.includes('{{APP_VERSION}}'))throw new Error('Version placeholder missing from the page');
await writeFile('public/index.html',template.replace('{{APP_VERSION}}',version));
await copyFile('web/style.css','public/style.css');
await copyFile('web/galactic.css','public/galactic.css');
await mkdir('public/masters',{recursive:true});
for(const name of await readdir('assets/masters'))if(name.endsWith('.xlsx'))await copyFile(`assets/masters/${name}`,`public/masters/${name}`);
await writeFile('public/version.json',JSON.stringify({version}));
console.log('Interface compilée dans public/');

await cp('web/cockpit','public/cockpit',{recursive:true});

await copyFile('src/shared/starfighter-duel.mjs','public/cockpit/duel-model.mjs');
const bridge=await readFile('web/cockpit/duel.html','utf8');
await writeFile('public/cockpit/console.html',bridge.match(/<body>([\s\S]*?)<script/)[1]);
const cockpitTemplate=await readFile('web/cockpit/index.html','utf8');
await writeFile('public/cockpit/live.html',cockpitTemplate.replace('<body>','<body data-connected="true">').replace('src="./cockpit.mjs"','src="./connected.js"'));
await build({entryPoints:['web/cockpit/connected.mjs'],outfile:'public/cockpit/connected.js',bundle:true,minify:true,format:'esm',target:'es2022'});

await mkdir('public/sabacc',{recursive:true});
for(const file of ['index.html','sabacc.css','sw.js'])await copyFile(`web/sabacc/${file}`,`public/sabacc/${file}`);
await build({entryPoints:['web/sabacc/app.mjs'],outfile:'public/sabacc/app.js',bundle:true,minify:true,format:'esm',target:'es2022'});

await mkdir('public/aventures',{recursive:true});
for(const f of ['index.html','billets.css','port.webp','equipage.webp'])await copyFile('web/aventures/'+f,'public/aventures/'+f);
await build({entryPoints:['web/aventures/client.mjs'],outfile:'public/aventures/billets.js',bundle:true,minify:true,format:'esm',target:'es2022'});

await build({entryPoints:['web/cockpit/training-access.mjs'],outfile:'public/cockpit/training-access.js',bundle:true,minify:true,format:'esm',target:'es2022'});
for(const [kind,page,module] of [['VOYAGE','starfighter','flight-ui'],['DUEL','duel','duel-ui'],['ASTEROIDS','asteroids','asteroids']]){
 const original=await readFile('web/cockpit/'+page+'.html','utf8');
 const scheduled=original.replace('<body',`<body hidden data-exercise="${kind}"`).replace(`src="./${module}.mjs"`,'src="./training-access.js"');
 await writeFile('public/cockpit/exercise-'+page+'.html',scheduled);
}
