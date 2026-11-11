import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const exec=promisify(execFile);
export const PROJECT='gn-engine';
export const BUCKET='gn-engine-media-936415509528';
const DATABASE='projects/'+PROJECT+'/databases/(default)';

// Explicit non-mutating allowlist: this tool cannot export, restore or deploy.
export const READS=Object.freeze([
 {key:'database',args:['firestore','databases','describe','--database=(default)','--project='+PROJECT,'--format=json']},
 {key:'backups',args:['firestore','backups','list','--project='+PROJECT,'--format=json']},
 {key:'schedules',args:['firestore','backups','schedules','list','--database=(default)','--project='+PROJECT,'--format=json']},
 {key:'bucket',args:['storage','buckets','describe','gs://'+BUCKET,'--project='+PROJECT,'--format=json']},
]);

export function checkEnvironment(env={}){
 for(const name of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','GCP_PROJECT','CLOUDSDK_CORE_PROJECT'])
  if(env[name]&&env[name]!==PROJECT)throw Error('Contradictory project variable '+name);
}
export async function gcloudRead(args){
 const {stdout}=await exec('gcloud',args,{timeout:30000,maxBuffer:4*1024*1024});
 return JSON.parse(stdout);
}
const array=x=>Array.isArray(x)?x:null;
export function summarize(raw,at='1970-01-01T00:00:00Z'){
 const blockers=[];
 const db=raw.database;
 const correct=!!db&&db.name===DATABASE;
 if(!correct)blockers.push('DATABASE_NOT_VERIFIED');
 const backups=array(raw.backups);
 if(!backups)blockers.push('BACKUP_INVENTORY_UNAVAILABLE');
 const ready=(backups??[]).filter(b=>b&&b.database===DATABASE&&b.state==='READY');
 if(backups&&!ready.length)blockers.push('NO_READY_BACKUP');
 const newest=ready.map(b=>b.snapshotTime).filter(t=>typeof t==='string'&&Number.isFinite(Date.parse(t))).sort().at(-1)??null;
 const schedules=array(raw.schedules);
 if(!schedules)blockers.push('SCHEDULES_UNAVAILABLE');
 const nSchedules=(schedules??[]).filter(x=>typeof x?.name==='string'&&x.name.startsWith(DATABASE+'/backupSchedules/')).length;
 const bucketName=raw.bucket?.name;
 const bucketVerified=bucketName===BUCKET||bucketName==='gs://'+BUCKET;
 if(!bucketVerified)blockers.push('MEDIA_BUCKET_NOT_VERIFIED');
 const p=raw.bucket?.softDeletePolicy??raw.bucket?.soft_delete_policy;
 const d=p?.retentionDurationSeconds??p?.retention_duration_seconds;
 const rawSeconds=typeof d==='number'?d:typeof d==='string'&&/^\d+s$/.test(d)?Number(d.slice(0,-1)):0;
 const softDeleteSeconds=Number.isFinite(rawSeconds)&&rawSeconds>0?rawSeconds:null;
 if(bucketVerified&&!softDeleteSeconds)blockers.push('MEDIA_RECOVERY_POLICY_NOT_VERIFIED');
 // A live snapshot is never evidence that a restore was tested.
 blockers.push('RESTORE_NOT_TESTED','MEDIA_RESTORE_NOT_TESTED','RULES_AUTH_NOT_PART_OF_BACKUP');
 return {
  schemaVersion:1,projectId:PROJECT,checkedAt:at,mode:'READ_ONLY',
  firestore:{databaseVerified:correct,locationId:correct&&typeof db.locationId==='string'?db.locationId:null,
   readyBackups:ready.length,latestSnapshotTime:newest,scheduleCount:nSchedules},
  media:{bucketVerified,softDeleteRetentionSeconds:softDeleteSeconds},
  restoreTest:'NOT_EXECUTED',publicationAuthorized:false,blockers
 };
}
export async function audit({read=gcloudRead,env=process.env,now=()=>new Date().toISOString()}={}){
 checkEnvironment(env);
 const data={},errors=[];
 for(const query of READS){
  try{data[query.key]=await read(query.args,query.key);}
  catch{data[query.key]=null;errors.push('READ_FAILED_'+query.key.toUpperCase());}
 }
 const result=summarize(data,now());
 return {...result,blockers:[...errors,...result.blockers]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const report=await audit();
  const json=JSON.stringify(report,null,2)+'\n';
  if(process.env.GN_FIREBASE_RECOVERY_REPORT)
   await writeFile(process.env.GN_FIREBASE_RECOVERY_REPORT,json,{mode:0o600});
  process.stdout.write(json);
  if(report.blockers.some(b=>b.startsWith('READ_FAILED_')||b==='DATABASE_NOT_VERIFIED'||b==='MEDIA_BUCKET_NOT_VERIFIED'))process.exitCode=2;
 }catch(error){
  process.stderr.write('Read-only Firebase audit stopped: '+error.message+'\n');
  process.exitCode=2;
 }
}
