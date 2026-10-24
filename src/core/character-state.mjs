import {requireThat} from './validation.mjs';
import {naturePatch} from './character-nature.mjs';
import {narrativeInput} from './narrative.mjs';

const text=(value,max,required=false)=>{requireThat(typeof value==='string'&&value.length<=max&&(!required||value.trim()),'INVALID_TEXT');return value.trim();};
const optional=(value,max)=>text(value??'',max);
const status=(value,allowed)=>{requireThat(allowed.includes(value),'INVALID_STATUS');return value;};
// Shared native character cleaner. Historical callers retain the same semantics.
export const characterInput = (input, id, existing={}) => ({...existing,id,...naturePatch(input,existing),
  public: {displayName:text(input.displayName,150,true), profession:optional(input.profession,150),
    description:optional(input.description,4000), publicationState:status(input.publicationState,['DRAFT','READY','PUBLISHED'])},
  publicationState:input.publicationState, biography:optional(input.biography,20000),
  roleplay:optional(input.roleplay,10000), playerSecrets:optional(input.playerSecrets,20000),
  gmNotes:optional(input.gmNotes,20000),
  objectives:input.objectives===undefined ? existing.objectives??[] : narrativeInput(input.objectives,'objectives'),
  relations:input.relations===undefined ? existing.relations??[] : narrativeInput(input.relations,'relations'),
  hp:existing.hp??null,maxHp:existing.maxHp??null,historyStarted:true,
  contentRevision:(existing.contentRevision??(existing.id?1:0))+1});
