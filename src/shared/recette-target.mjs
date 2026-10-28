// Offline checks only: resource existence, ownership and IAM still need review.
export function recetteProject(projectId){
  if(typeof projectId!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)||projectId==='gn-engine'||projectId.startsWith('demo-'))throw new Error('Projet de recette explicite, distinct de la production et des émulateurs, requis');
  return projectId;
}

export function recetteOwner(email){
  if(typeof email!=='string'||!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)||email.length>254)throw new Error('Adresse du propriétaire de recette requise');
  return email;
}

export function recetteResources(projectId){
  recetteProject(projectId);
  return {projectId,region:'europe-west1',origin:`https://${projectId}.web.app`,authDomain:`${projectId}.firebaseapp.com`,
    mediaBucket:`${projectId}.firebasestorage.app`,runtimeServiceAccount:`gn-engine-runtime@${projectId}.iam.gserviceaccount.com`,
    buildServiceAccount:`projects/${projectId}/serviceAccounts/gn-engine-build@${projectId}.iam.gserviceaccount.com`,
    artifactRepository:`projects/${projectId}/locations/europe-west1/repositories/gn-engine-functions`};
}

export function recetteTarget(input){
  const keys=['projectId','projectNumber','apiKey','appId','ownerEmail'];
  if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).length!==keys.length||keys.some(k=>!Object.hasOwn(input,k)))throw new Error('Configuration de recette : cinq champs explicites requis, aucun champ supplémentaire');
  const resources=recetteResources(input.projectId);
  if(typeof input.projectNumber!=='string'||!/^\d{6,20}$/.test(input.projectNumber)||input.projectNumber==='936415509528')throw new Error('Numéro de projet de recette requis');
  if(typeof input.apiKey!=='string'||!/^AIza[\w-]{35}$/.test(input.apiKey)||input.apiKey==='AIzaSyDs4zDSGu495sVrOhrqf9nO5w1979ipMgI')throw new Error('Configuration publique Firebase de recette requise');
  if(typeof input.appId!=='string'||!new RegExp(`^1:${input.projectNumber}:web:[a-f0-9]+$`).test(input.appId))throw new Error('App ID incompatible avec le numéro de projet');
  return {...resources,ownerEmail:recetteOwner(input.ownerEmail),firebase:{projectId:input.projectId,authDomain:resources.authDomain,apiKey:input.apiKey,appId:input.appId}};
}
