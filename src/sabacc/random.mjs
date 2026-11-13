import {randomBytes,createHmac} from 'node:crypto';
// A private command seed fixes retries without exposing future cards to clients.
export const newSeed=()=>randomBytes(32);
export function randomSource(seed){let counter=0;return max=>{if(!Number.isSafeInteger(max)||max<1||max>0xffffffff)throw Error('INVALID_RANDOM_BOUND');const limit=0x100000000-(0x100000000%max);let n;do{n=createHmac('sha256',seed).update(String(counter++)).digest().readUInt32BE();}while(n>=limit);return n%max;};}
export function shuffle(cards,rng){const a=[...cards];for(let i=a.length-1;i>0;i--){const j=rng(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
