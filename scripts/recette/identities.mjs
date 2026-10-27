// Synthetic identities for the local Auth Emulator only. No real Google account.
export const identities=[
  {id:'owner',label:'Propriétaire',email:'owner@recette.example.invalid'},
  {id:'mj',label:'MJ',email:'mj@recette.example.invalid'},
  {id:'reception',label:'Accueil',email:'accueil@recette.example.invalid'},
  {id:'player',label:'Ari · joueur',email:'ari@recette.example.invalid'},
  {id:'other',label:'Bela · autre joueur',email:'bela@recette.example.invalid'},
  {id:'outsider',label:'Tiers sans accès',email:'tiers@recette.example.invalid'},
];
export function syntheticAssertion(id,encode){
  const identity=identities.find(x=>x.id===id);
  if(!identity)throw new Error('Identité de recette inconnue');
  return `${encode({alg:'none',typ:'JWT'})}.${encode({sub:`so-recette-${id}`,email:identity.email,email_verified:true,name:identity.label})}.`;
}
export function requireLocalPage(location){
  if(location.protocol!=='http:'||!['127.0.0.1','localhost'].includes(location.hostname)||location.port!=='4173')
    throw new Error('La recette doit être ouverte sur http://127.0.0.1:4173');
}
