import {gameTime} from './clock.mjs';
import {encounter,lootEligible} from './person-state.mjs';
import {personalLot} from './inventory-state.mjs';
const common={publicationState:'PUBLISHED',revision:1,minLevel:1,patientNature:null,test:'AUTO',threshold:0,cost:1,cooldownSeconds:600,bonusItems:[],consumable:null,extraConsumables:[],prerequisites:[],continuationSeconds:0,healAmount:0,reviveLevel:0,convalescenceSeconds:0,patientCooldownSeconds:0};
export const soLootProfiles=[
 {...common,id:'SO-LOOT-COMMON',kind:'LOOT_COMMON',name:'Fouille ordinaire',skillId:null,durationSeconds:60,durationByLevel:{},instructions:'À couvert sur une cible hors combat ou capturée : 60 secondes, 1 PA. La victime choisit une unité pillable. Une prise par rencontre, tous adversaires confondus ; récupération FOUILLE de dix minutes.'},
 {...common,id:'SO-TRA-02',kind:'LOOT_METHODICAL',name:'Fouille méthodique',skillId:'TRA-02',durationSeconds:120,durationByLevel:{1:120,2:105,3:90,4:75,5:60},instructions:'À couvert sur une cible hors combat ou capturée. Vous choisissez une unité pillable ; une prise par rencontre, tous adversaires confondus. Sans dé, 1 PA et récupération FOUILLE de dix minutes. Dissimulation est révélée seulement si votre niveau est au moins égal.'}
];
export const concealProfile={...common,id:'SO-CONCEAL',kind:'CONCEAL',name:'Dissimuler un objet',skillId:'DISSIMULATION',durationSeconds:120,durationByLevel:{1:120,2:105,3:90,4:75,5:60},instructions:'À couvert, préparez une cache pour une unité admissible de votre sac. 1 PA ; récupération de dix minutes ; cache valable trente minutes de jeu. Une seule unité à la fois. Utiliser, donner, vendre ou consommer l’objet met fin à la cache.'};
export const nativeLootProfiles=s=>s.spaceOutlaws?.personLootVersion===1?soLootProfiles:[];
export const nativeConcealProfiles=s=>s.spaceOutlaws?.concealmentVersion===1?[concealProfile]:[];
// In Space Outlaws thirty minutes is a protection against repeated looting,
// not automatic permission to loot the same affair again (V0.7 ch.6).
export const currentEncounter=(s,c,at)=>s.spaceOutlaws?.personLootVersion===1?(c.lootEncounter??{number:1,taken:false,freeSince:null,captureUntil:null,captureDeadline:null}):encounter(c,at);
export async function personLootEligible(tx,s,c,at){
 if(!s.spaceOutlaws?.personLootVersion)return lootEligible(s,c,at);
 if(c.survival?.dead)return false;
 if(c.hp===0||c.outOfCombat)return true;
 const cap=await tx.get(`sessions/${s.id}/soCaptivities/${c.id}`);
 return cap?.status==='ACTIVE'&&at<cap.expiresAt;
}
export const activeConcealment=(s,c,l,at)=>!!l&&s.spaceOutlaws?.concealmentVersion===1&&c.concealment?.lotId===l?.id&&c.concealment.lotRevision===l.revision&&l.quantity===1&&personalLot(l,c.id)&&gameTime(s.clock,at)<c.concealment.expiresAtGameMs?c.concealment:null;
export const concealableLot=(l,cid)=>l&&personalLot(l,cid)&&l.status==='AVAILABLE'&&l.quantity>0&&l.item.concealable===true&&!l.item.shipModule&&!l.boardingCustody;
