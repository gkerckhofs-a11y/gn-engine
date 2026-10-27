import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const output=resolve(root,'dist/so-recette');
export async function buildRecette(){
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  const metadata={mode:'LOCAL_EMULATORS',projectId:'demo-gn-engine',commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),dirty:!!git('status','--porcelain'),builtAt:new Date().toISOString(),humanAcceptance:'NOT_EXECUTED'};
  await mkdir(output,{recursive:true});
  await build({entryPoints:[resolve(root,'web/app.mjs')],outfile:resolve(output,'app.js'),bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'eof',plugins:[{
    name:'local-auth-only',setup(b){b.onResolve({filter:/^\.\/firebase-client\.mjs$/},args=>args.importer===resolve(root,'web/app.mjs')?{path:resolve(root,'scripts/recette/firebase-client.mjs')}:null);},
  }]});
  const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
  const toolbar=`<aside class="panel recette-toolbar" aria-label="Recette locale"><strong>RECETTE LOCALE · DONNÉES FICTIVES</strong><p>Commit ${metadata.commit}${metadata.dirty?' · fichiers locaux modifiés':''}. Émulateurs uniquement. <a href="/recette.html">Parcours et relevé des résultats</a></p><label>Identité de test<select id="recette-identity"></select></label><button id="recette-login" type="button">Connexion fictive</button><p id="recette-status" role="status"></p></aside>`;
  const html=(await readFile(resolve(root,'web/index.html'),'utf8')).replace('{{APP_VERSION}}',version).replace('</head>','<link rel="stylesheet" href="/recette.css"></head>').replace('<body>',`<body>${toolbar}`);
  await writeFile(resolve(output,'index.html'),html);
  await copyFile(resolve(root,'scripts/recette/style.css'),resolve(output,'recette.css'));
  for(const name of ['style.css','galactic.css'])await copyFile(resolve(root,'web',name),resolve(output,name));
  await mkdir(resolve(output,'masters'),{recursive:true});
  for(const name of await readdir(resolve(root,'assets/masters')))if(name.endsWith('.xlsx'))await copyFile(resolve(root,'assets/masters',name),resolve(output,'masters',name));
  await writeFile(resolve(output,'version.json'),JSON.stringify({version}));
  await writeFile(resolve(output,'recette-build.json'),JSON.stringify(metadata,null,2));
  await build({entryPoints:[resolve(root,'scripts/recette/report-client.mjs')],outfile:resolve(output,'recette-report.js'),bundle:true,minify:true,format:'esm',target:'es2022'});
  return metadata;
}
