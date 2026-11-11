import test from 'node:test';
import assert from 'node:assert/strict';
import {audit,READS,summarize,checkEnvironment,PROJECT,BUCKET} from '../scripts/audit-firebase-recovery.mjs';

const sample=()=>({
 database:{name:'projects/gn-engine/databases/(default)',locationId:'europe-west1'},
 backups:[{database:'projects/gn-engine/databases/(default)',state:'READY',snapshotTime:'2026-11-11T12:00:00Z'}],
 schedules:[{name:'projects/gn-engine/databases/(default)/backupSchedules/fixture'}],
 bucket:{name:BUCKET,softDeletePolicy:{retentionDurationSeconds:604800}}
});

test('Audit Firebase : seules les commandes de lecture et le projet prévu sont autorisés',()=>{
 assert.equal(READS.length,4);
 for(const {args} of READS){
  assert.ok(args.includes('--project='+PROJECT));
  assert.equal(args.at(-1),'--format=json');
  assert.doesNotMatch(args.join(' '),/\b(export|import|restore|delete|create|deploy|update|patch|write)\b/i);
 }
 assert.throws(()=>checkEnvironment({GCLOUD_PROJECT:'other'}),/Contradictory/);
 checkEnvironment({GOOGLE_CLOUD_PROJECT:'gn-engine'});
});

test('Audit Firebase : une sauvegarde READY ne vaut jamais validation de restauration',()=>{
 const report=summarize(sample(),'2026-11-11T17:00:00Z');
 assert.equal(report.firestore.databaseVerified,true);
 assert.equal(report.firestore.readyBackups,1);
 assert.equal(report.firestore.latestSnapshotTime,'2026-11-11T12:00:00Z');
 assert.equal(report.media.bucketVerified,true);
 assert.equal(report.media.softDeleteRetentionSeconds,604800);
 assert.equal(report.publicationAuthorized,false);
 assert.equal(report.restoreTest,'NOT_EXECUTED');
 assert.ok(report.blockers.includes('RESTORE_NOT_TESTED'));
 assert.doesNotMatch(JSON.stringify(report),/fixture|token|secret|email/);
});

test('Audit Firebase : mauvais projet, absence de sauvegarde ou politique média non attestée bloquent',()=>{
 const input=sample();
 input.database.name='projects/other/databases/(default)';
 input.backups=[];
 input.bucket.softDeletePolicy=null;
 const report=summarize(input);
 assert.ok(report.blockers.includes('DATABASE_NOT_VERIFIED'));
 assert.ok(report.blockers.includes('NO_READY_BACKUP'));
 assert.ok(report.blockers.includes('MEDIA_RECOVERY_POLICY_NOT_VERIFIED'));
 assert.equal(report.publicationAuthorized,false);
});

test('Audit Firebase : droit de lecture manquant signalé sans fuite des erreurs authentifiées',async()=>{
 const fixture=sample();
 const calls=[];
 const report=await audit({env:{},now:()=>'2026-11-11T18:00:00Z',read:async(args,key)=>{
  calls.push(key);assert.ok(args.includes('--project=gn-engine'));
  if(key==='backups')throw Error('PRIVATE_AUTH_TOKEN');
  return fixture[key];
 }});
 assert.deepEqual(calls,['database','backups','schedules','bucket']);
 assert.ok(report.blockers.includes('READ_FAILED_BACKUPS'));
 assert.ok(report.blockers.includes('BACKUP_INVENTORY_UNAVAILABLE'));
 assert.equal(report.publicationAuthorized,false);
 assert.doesNotMatch(JSON.stringify(report),/PRIVATE_AUTH_TOKEN/);
});
