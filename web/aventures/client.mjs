import auth from '../firebase-client.mjs';
import {onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {mountTickets} from './ui.mjs';
const render=mountTickets({logged:()=>!!auth.currentUser,login:()=>signInWithPopup(auth,new GoogleAuthProvider()),logout:()=>signOut(auth),async api(action,input){
 const token=await auth.currentUser?.getIdToken();
 const response=await fetch('/api/command',{method:'POST',headers:{'content-type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,input}),cache:'no-store'});
 const data=await response.json();if(!response.ok||data.error)throw Error(data.error??'NETWORK');return data.result;
}});
onAuthStateChanged(auth,render);
