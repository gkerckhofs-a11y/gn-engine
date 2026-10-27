import {requireRecetteEnvironment,origin} from './config.mjs';
import {identities,syntheticAssertion} from './identities.mjs';

export async function createRecetteIdentities(env){
  requireRecetteEnvironment(env,{running:true});
  const tokens={},uids={};
  for(const person of identities){
    const jwt=syntheticAssertion(person.id,x=>Buffer.from(JSON.stringify(x)).toString('base64url'));
    const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:origin,postBody:`id_token=${jwt}&providerId=google.com`,returnSecureToken:true})});
    const data=await response.json();if(!response.ok||!data.idToken||!data.localId)throw new Error('Identité fictive non créée');
    tokens[person.id]=data.idToken;uids[person.id]=data.localId;
  }
  return {tokens,uids};
}
