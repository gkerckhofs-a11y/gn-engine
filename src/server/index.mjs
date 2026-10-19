import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {onRequest} from 'firebase-functions/v2/https';
import {defineString} from 'firebase-functions/params';
import {firestoreStore} from '../adapters/firestore.mjs';
import {createWorkflow} from '../core/workflow.mjs';
import {DomainError} from '../core/validation.mjs';

initializeApp();
const ownerEmail=defineString('OWNER_EMAIL',{default:'gkerckhofs@gmail.com',description:'Compte Google vérifié propriétaire de GN Engine'});
const store=firestoreStore(getFirestore());
export const api=onRequest({region:'europe-west1',serviceAccount:'gn-engine-runtime@gn-engine.iam.gserviceaccount.com',maxInstances:3,minInstances:0,memory:'256MiB',timeoutSeconds:60,invoker:'public'},async(req,res)=>{
  res.set('Cache-Control','private, no-store'); res.set('X-Content-Type-Options','nosniff');
  if(req.method!=='POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  if(!req.is('application/json') || Buffer.byteLength(JSON.stringify(req.body ?? {}))>128000)
    return res.status(400).json({error:'INVALID_BODY'});
  try {
    let actor=null;
    if(req.headers.authorization) {
      const match=/^Bearer (\S+)$/.exec(req.headers.authorization);
      if(!match) return res.status(401).json({error:'LOGIN_REQUIRED'});
      const claims=await getAuth().verifyIdToken(match[1],true);
      actor={uid:claims.uid,email:claims.email,emailVerified:claims.email_verified,
        provider:claims.firebase?.sign_in_provider,authTime:claims.auth_time};
    }
    const workflow=createWorkflow({store,ownerEmail:ownerEmail.value()});
    const result=await workflow.dispatch(req.body.action,actor,req.body.input ?? {});
    return res.json({result});
  } catch(error) {
    if(error instanceof DomainError) return res.status(error.code==='LOGIN_REQUIRED'?401:error.code==='FORBIDDEN'?403:400).json({error:error.code});
    if(error.code?.startsWith('auth/')) return res.status(401).json({error:'LOGIN_REQUIRED'});
    // No request bodies, invitation tokens or personal answers in logs.
    console.error('API_FAILURE',typeof error.code==='string'?error.code:'internal');
    return res.status(500).json({error:'SERVER_ERROR'});
  }
});
