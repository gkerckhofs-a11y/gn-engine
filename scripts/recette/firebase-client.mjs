import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {identities,syntheticAssertion,requireLocalPage} from './identities.mjs';

requireLocalPage(window.location);
const auth=getAuth(initializeApp({apiKey:'fake-key',authDomain:'127.0.0.1',projectId:'demo-gn-engine',appId:'demo-recette'}));
connectAuthEmulator(auth,'http://127.0.0.1:9099');
const select=document.querySelector('#recette-identity'),button=document.querySelector('#recette-login'),status=document.querySelector('#recette-status');
for(const person of identities){const option=document.createElement('option');option.value=person.id;option.textContent=`${person.label} · ${person.email}`;select.append(option);}
button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
    const encode=value=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
    await signInWithCredential(auth,GoogleAuthProvider.credential(syntheticAssertion(select.value,encode)));
    status.textContent='Identité fictive connectée. Utilisez des profils de navigateur distincts pour jouer simultanément.';
  }catch{status.textContent='Connexion fictive impossible : vérifier les émulateurs locaux.';}
  finally{button.disabled=false;}
});
export default auth;
