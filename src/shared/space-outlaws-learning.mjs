import {initialClassSkills} from './initial-character-profile.mjs';

// V0.7 chapters 3, 13 and 15. Descriptive technical IDs are used where the
// canonical book supplies a name only; they do not invent another rule code.
const extra=[
 ['ENTRETIEN_PROTECTION','Entretien de protection','EVOLVING',false],
 ['RIPOSTE','Riposte','FIXED',true],['GARDE_DU_CORPS','Garde du corps','FIXED',false],
 ['SABOTAGE','Sabotage','EVOLVING',true],['DISSIMULATION','Dissimulation','EVOLVING',false],
 ['FIL-01','Pistage','EVOLVING',false],['TOXI-01','Toxicologie','EVOLVING',true],
 ['ESC-01','Escorte spatiale','EVOLVING',true],['EFF-01','Effacement de traces','EVOLVING',true],
 ['LAS-01','Maîtrise du sabre laser','FIXED',true],
].map(([id,name,kind,rare])=>({id,name,kind,rare,classId:null}));
export const soLearningCatalogue=Object.freeze([...initialClassSkills,...extra].map(s=>Object.freeze({
 ...s,rare:s.rare??false,classOnly:['COM-01','ROG-01'].includes(s.id),
 prerequisites:s.id==='PIL-03'?[{id:'PIL-02',level:1}]:[],
})));
export const learningSkill=id=>soLearningCatalogue.find(s=>s.id===id);
export const learningCost=(skill,level)=>skill.kind==='FIXED'?4:2*level;
export const learningDescription=skill=>skill.kind==='FIXED'?'Technique acquise (sans niveau).':`Niveau ${skill.level}`;
export function learningAbilityProfile(profile,previous={}){
 return {...previous,published:true,revision:(previous.revision??0)+1,
  class:{id:profile.classId,name:profile.className,description:previous.class?.description??''},
  skills:profile.skills.map(k=>({id:k.id,name:k.name,kind:'PASSIVE',level:k.level??1,revision:(previous.skills?.find(s=>s.id===k.id)?.revision??0)+1,description:learningDescription(k),instructions:'',category:k.source,healing:null}))};
}
export const learningMessages={
 SO_LEARNING_CLOSED:'Les apprentissages sont ouverts au briefing de l’épisode suivant, avant le début du jeu.',
 SO_LEARNING_USED:'Votre apprentissage de cette intersession est déjà utilisé.',
 SO_LEARNING_XP:'Vous ne disposez pas d’assez de XP pour ce choix.',
 SO_LEARNING_FULL:'Les cinq places de compétences secondaires sont occupées.',
 SO_LEARNING_RARE:'Un déblocage par le MJ est nécessaire avant cet apprentissage.',
 SO_LEARNING_PREREQUISITE:'Vous devez conserver les compétences prérequises.',
 SO_LEARNING_CLASS_ONLY:'Cette capacité est réservée à sa classe principale.',
 SO_LEARNING_MAX:'Cette technique est déjà acquise ou son niveau maximum est atteint.',
 SO_LEARNING_RETRAIN:'Le MJ doit approuver ce remplacement précis de compétence secondaire.',
 SO_LEARNING_STALE:'Votre fiche ou l’autorisation a changé. Vérifiez un nouvel aperçu.',
 SO_LEARNING_BUSY:'Une action ou un ordre réserve encore des capacités. Terminez-le avant un remplacement.',
 SO_LEARNING_PROFILE:'La fiche de compétences doit être vérifiée par la régie.',
 SO_LEARNING_DEAD:'Un personnage mort ne peut pas apprendre.',
};
