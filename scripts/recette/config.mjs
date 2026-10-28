import {identities} from './identities.mjs';

export const projectId='demo-gn-engine';
export const bucket='demo-gn-engine-media';
export const origin='http://127.0.0.1:4173';
export const hosts={FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'};
export function requireRecetteEnvironment(env,{running=false}={}){
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','GCP_PROJECT'])if(env[key]&&env[key]!==projectId)throw new Error(`${key} doit valoir ${projectId}`);
  if(env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('Retirer GOOGLE_APPLICATION_CREDENTIALS pour la recette locale');
  if(env.MEDIA_BUCKET&&env.MEDIA_BUCKET!==bucket)throw new Error('MEDIA_BUCKET doit désigner le bucket fictif');
  if(env.OWNER_EMAIL&&env.OWNER_EMAIL!==identities[0].email)throw new Error('OWNER_EMAIL doit désigner le propriétaire fictif');
  if(env.FIREBASE_CONFIG){
    let config;try{config=JSON.parse(env.FIREBASE_CONFIG);}catch{throw new Error('FIREBASE_CONFIG doit être un objet JSON local explicite');}
    if(!config||config.projectId!==projectId||config.storageBucket&&![bucket,`${projectId}.appspot.com`].includes(config.storageBucket)||config.databaseURL&&config.databaseURL!==`https://${projectId}.firebaseio.com`)
      throw new Error('FIREBASE_CONFIG ne correspond pas à la recette locale');
  }
  for(const [key,value] of Object.entries(hosts))if((running||env[key])&&env[key]!==value)throw new Error(`${key} doit valoir ${value}`);
  if(running&&env.GCLOUD_PROJECT!==projectId)throw new Error('Projet des émulateurs absent');
  return {...env,GCLOUD_PROJECT:projectId,GOOGLE_CLOUD_PROJECT:projectId,FIREBASE_CONFIG:JSON.stringify({projectId,storageBucket:bucket}),MEDIA_BUCKET:bucket,OWNER_EMAIL:identities[0].email};
}
export function requireRuntimes(nodeVersion,javaOutput){
  if(Number(nodeVersion.split('.')[0])<22)throw new Error('Node 22 ou supérieur requis');
  const major=Number(javaOutput.match(/version\s+"(\d+)/)?.[1]);
  if(!Number.isInteger(major)||major<21)throw new Error('Java 21 ou supérieur requis pour les émulateurs');
}
