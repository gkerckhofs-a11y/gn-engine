import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {targetedProfiles} from './ci-targeted.mjs';

const decode=raw=>raw===undefined||raw===''?null:JSON.parse(raw);
export function applicationCommand(raw,exists=existsSync){
 const files=decode(raw);
 if(files===null)return {command:'npm',args:['test']};
 if(!Array.isArray(files)||files.length===0||files.length>40||new Set(files).size!==files.length||files.some(p=>typeof p!=='string'||!/^test\/[a-z0-9-]+\.test\.mjs$/.test(p)||!exists(p)))throw Error('Invalid targeted application test selection');
 return {command:process.execPath,args:['--test',...files]};
}
export function httpCommand(raw,source=()=>readFileSync('test/integration/http.test.mjs','utf8')){
 const pattern=decode(raw),args=['--test'];
 if(pattern!==null){if(typeof pattern!=='string'||!Object.values(targetedProfiles).some(p=>p.httpPattern===pattern))throw Error('Invalid targeted HTTP pattern');const names=[...source().matchAll(/\btest\(['"]([^'"\n]+)['"],/g)].map(m=>m[1]);if(!names.some(name=>new RegExp(pattern).test(name)))throw Error('Targeted HTTP pattern matches no declared test');args.push(`--test-name-pattern=${pattern}`);}
 return {command:process.execPath,args:[...args,'test/integration/http.test.mjs']};
}
export function testCommand(mode,env){
 if(!['application','http'].includes(mode))throw Error('Unknown CI test mode');
 const scoped=env.GN_CI_PROFILE?.startsWith('targeted-'),name=scoped?env.GN_CI_PROFILE.slice(9):null,profile=scoped&&Object.hasOwn(targetedProfiles,name)?targetedProfiles[name]:null;
 const raw=mode==='application'?env.GN_APPLICATION_TESTS:env.GN_HTTP_PATTERN,selection=decode(raw);
 if(scoped){
  if(!profile||selection===null)throw Error('Targeted CI requires an explicit test selection');
  const expected=mode==='application'?profile.tests:profile.httpPattern;
  if(JSON.stringify(selection)!==JSON.stringify(expected))throw Error('Selection differs from targeted CI profile');
 }else if(selection!==null)throw Error('Restricted tests require an explicit targeted profile');
 return mode==='application'?applicationCommand(raw):httpCommand(raw);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const run=testCommand(process.argv[2],process.env);
 console.log('CI test selection:',JSON.stringify(run.args));
 try{execFileSync(run.command,run.args,{stdio:'inherit'});}catch(e){process.exitCode=Number.isInteger(e.status)&&e.status>0?e.status:1;}
}
