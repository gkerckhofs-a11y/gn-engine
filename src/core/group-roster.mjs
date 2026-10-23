import {documentId,requireThat,whole} from './validation.mjs';

export function rosterKeys(value,keys){requireThat(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k)),'INVALID_GROUP_ROSTER');}
export function rosterInput(value){
 rosterKeys(value,['kind','capacity','leaderId','archived']);
 requireThat(['TEAM','FACTION'].includes(value.kind)&&typeof value.archived==='boolean','INVALID_GROUP_ROSTER');
 const capacity=value.capacity===null?null:whole(value.capacity,'INVALID_GROUP_ROSTER');
 const leaderId=value.leaderId===null?null:documentId(value.leaderId);
 return {kind:value.kind,capacity,leaderId,archived:value.archived};
}
export function validateRosters(groups){
 const teams=new Map();
 for(const g of groups){
  if(!g.roster)continue;const r=rosterInput(g.roster),active=g.members.filter(m=>m.active);
  requireThat(r.capacity===null||active.length<=r.capacity,'GROUP_CAPACITY_FULL');
  requireThat(!r.leaderId||active.some(m=>m.characterId===r.leaderId),'GROUP_LEADER_NOT_MEMBER');
  requireThat(!r.archived||(active.length===0&&r.leaderId===null&&g.members.every(m=>!Object.values(m.permissions).some(Boolean))),'GROUP_ARCHIVED');
  if(r.kind==='TEAM'&&!r.archived)for(const m of active){requireThat(!teams.has(m.characterId),'GROUP_PRIMARY_CONFLICT');teams.set(m.characterId,g.id);}
 }
}
