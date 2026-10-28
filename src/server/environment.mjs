import {recetteResources,recetteOwner} from '../shared/recette-target.mjs';

export function serverEnvironment(env){
  if(!env.GN_DEPLOYMENT_ENV){
    if(env.GN_RECETTE_PROJECT)throw new Error('Mode de recette manquant');
    // Preserve the existing production and local-emulator entry points.
    return {appOptions:undefined,ownerEmail:'gkerckhofs@gmail.com',mediaBucket:env.MEDIA_BUCKET||'gn-engine-media-936415509528',serviceAccount:'gn-engine-runtime@gn-engine.iam.gserviceaccount.com'};
  }
  if(env.GN_DEPLOYMENT_ENV!=='recette')throw new Error('Mode de déploiement inconnu');
  const target=recetteResources(env.GN_RECETTE_PROJECT);
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','GCP_PROJECT'])if(env[key]&&env[key]!==target.projectId)throw new Error('Projet serveur incompatible avec la recette');
  for(const key of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST','STORAGE_EMULATOR_HOST'])if(env[key])throw new Error('Émulateur interdit dans le paquet Firebase de recette');
  if(env.FIREBASE_CONFIG){
    let config;try{config=JSON.parse(env.FIREBASE_CONFIG);}catch{throw new Error('FIREBASE_CONFIG de recette doit être un objet JSON explicite');}
    if(!config||config.projectId!==target.projectId||config.storageBucket&&config.storageBucket!==target.mediaBucket)throw new Error('FIREBASE_CONFIG incompatible avec la recette');
  }
  if(env.MEDIA_BUCKET!==target.mediaBucket)throw new Error('Bucket de recette explicite requis');
  return {appOptions:{projectId:target.projectId,storageBucket:target.mediaBucket},ownerEmail:recetteOwner(env.OWNER_EMAIL),mediaBucket:target.mediaBucket,serviceAccount:target.runtimeServiceAccount};
}
