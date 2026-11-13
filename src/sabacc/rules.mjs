// Immutable product profile: S4C ranking selected by Guillaume, 2026-11-13.
export const ruleset=Object.freeze({id:'corellian_spike_so_v1',rounds:3,minPlayers:2,maxPlayers:8,maxCards:5,
 source:'https://www.sabaccforcharity.com/fr/guides',
 categories:[['PURE','Sabacc pur',[0,0]],['FULL','Full Sabacc',[10,10,-10,-10,0]],['FLEET','Flotte',[2,2,-2,-2,0]],['YEEHAA','Yee-Haa',[2,-2,0]],['RHYLET','Rhylet',[2,2,2,-3,-3]],['SQUADRON','Escadron',[2,2,-2,-2]],['GEEWHIZ','Gee Whiz',[1,2,3,4,-10]],['KHYRON','Suite Khyron',[2,-3,-4,5]],['BANTHAS','Banthas Wild',[4,4,4,-3,-9]],['TWOPAIR','Règle des Deux',[4,-4,7,-7]],['PAIR','Paire',[3,-3]],['SABACC','Sabacc non classé',[2,3,-5]],['NULRHEK','Nulrhek',[2,3]]].map(([id,name,example])=>Object.freeze({id,name,example:Object.freeze(example)})),
 tieHelp:'À distance de zéro égale : catégorie pour les Sabacc, puis plus petite valeur du motif classé. Ensuite : plus de cartes, total positif plutôt que négatif, somme positive la plus élevée, plus haute carte positive. Une égalité parfaite partage le pot ; les crédits restants vont, un par un, aux gagnants dans l’ordre des sièges après le donneur.',
 steps:['Deux cartes par joueur et deux antes, une par pot.','Trois rounds : une action de carte par joueur, un tour de mises, puis deux dés.','Un double remplace toutes les mains actives par autant de cartes.','Le gagnant reçoit le pot principal. À zéro, il reçoit aussi le pot Sabacc.','Si tous les autres se couchent, le dernier joueur reçoit seulement le pot principal.'],
 actions:{STAND:'Garder',GAIN:'Piocher',REPLACE:'Défausser et piocher',SWAP:'Échanger avec la défausse',CHECK:'Parole',BET:'Miser',CALL:'Suivre',RAISE:'Relancer',FOLD:'Se coucher'}});
export const templates=Object.freeze([
 {tier:1,name:'Cantina',ante:5,sabaccAnte:5,minBet:5,maxBet:25,minRaise:5,turnSeconds:60,confirmAbove:25},
 {tier:2,name:'Casino',ante:25,sabaccAnte:25,minBet:25,maxBet:100,minRaise:25,turnSeconds:60,confirmAbove:100},
 {tier:3,name:'High Stakes',ante:100,sabaccAnte:100,minBet:100,maxBet:500,minRaise:100,turnSeconds:60,confirmAbove:500}]);
export function deck(){return [...['CIRCLE','TRIANGLE','SQUARE'].flatMap(suit=>Array.from({length:20},(_,i)=>({id:`${suit}_${i}`,value:i<10?i+1:9-i,suit}))),...Array.from({length:2},(_,i)=>({id:`SYLOP_${i}`,value:0,suit:'SYLOP'}))];}
export const sum=cards=>cards.reduce((n,c)=>n+(typeof c==='number'?c:c.value),0);
export function score(cards){
 const v=cards.map(c=>typeof c==='number'?c:c.value),total=sum(v),abs=v.filter(Boolean).map(Math.abs).sort((a,b)=>a-b),counts=Object.fromEntries(abs.map(n=>[n,abs.filter(x=>x===n).length])),signed=Object.fromEntries(v.map(n=>[n,v.filter(x=>x===n).length]));
 const groups=n=>Object.keys(counts).map(Number).filter(k=>counts[k]>=n).sort((a,b)=>a-b),pairs=groups(2),triples=groups(3),quads=groups(4),zeros=v.filter(n=>n===0).length;
 let id='NULRHEK',motif=[];
 if(total===0){
  if(v.length===2&&zeros===2)id='PURE';
  else if(v.length===5&&zeros===1&&counts[10]===4)id='FULL';
  else if(v.length===5&&zeros===1&&quads.length){id='FLEET';motif=quads;}
  else if(zeros&&pairs.length){id='YEEHAA';motif=pairs;}
  else if(v.length===5&&Object.values(signed).includes(3)&&Object.values(signed).includes(2)){id='RHYLET';motif=triples;}
  else if(quads.length){id='SQUADRON';motif=quads;}
  else if(v.length===5&&abs.join(',')==='1,2,3,4,10')id='GEEWHIZ';
  else if(v.length===4&&abs.every((n,i)=>!i||n===abs[i-1]+1)){id='KHYRON';motif=[abs[0]];}
  else if(triples.length){id='BANTHAS';motif=triples;}
  else if(pairs.length>=2){id='TWOPAIR';motif=pairs;}
  else if(pairs.length){id='PAIR';motif=pairs;}
  else id='SABACC';
 }
 const category=ruleset.categories.findIndex(c=>c.id===id),positive=v.filter(n=>n>0);
 return {total,category:id,name:ruleset.categories[category].name,key:[Math.abs(total),category,motif[0]??0,motif[1]??0,-v.length,total<0?1:0,-sum(positive),-Math.max(0,...positive)]};
}
export function compare(a,b){const x=score(a).key,y=score(b).key;for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]??0)-(y[i]??0);if(d)return d;}return 0;}
export function splitPot(amount,seats,dealer,maxSeats=8){const ordered=[...seats].sort((a,b)=>((a-dealer-1+maxSeats)%maxSeats)-((b-dealer-1+maxSeats)%maxSeats));return Object.fromEntries(ordered.map((s,i)=>[s,Math.floor(amount/seats.length)+(i<amount%seats.length?1:0)]));}
