import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {actionPointRulesInput,actionPointMaximum,actionPointState,actionPointSchedule,actionPointPath,globalLevel} from './action-point-state.mjs';

const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const writes=new Set(['saveActionPointRules','adjustActionPoints','setGlobalLevel']);
export const actionPointCommands=[...writes,'prepareActionPointRules','prepareAdjustActionPoints','prepareGlobalLevel'];
export const actionPointAction=a=>actionPointCommands.includes(a);
export function createActionPointService({store,signed,checkSession,checkScenario,now,uuid}){
  return async(action,actor,input)=>{
    signed(actor);const at=now(),eventId=uuid();
    return store.runTransaction(async tx=>{
      requireThat(!!input.scenarioId!==!!input.sessionId,'INVALID_ACTION_POINTS');
      const session=!!input.sessionId,id=documentId(input.sessionId??input.scenarioId),base=`${session?'sessions':'scenarios'}/${id}`;
      const parent=session?await checkSession(tx,actor,id):await checkScenario(tx,actor,id);
      requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
      const write=writes.has(action),op=write?`operations/${createHash('sha256').update(`${actor.uid}:${documentId(input.requestId)}`).digest('hex')}`:null;
      const fingerprint=hash([action,input]),previous=write?await tx.get(op):null;
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
      requireThat(input.revision===parent.revision,'STALE_REVISION');
      const reason=session?input.reason:'Configuration du scénario';
      requireThat(typeof reason==='string'&&reason.trim()&&reason.length<=500,'INVALID_ACTION_POINTS');
      const all=action.endsWith('ActionPointRules'),adjust=action.endsWith('AdjustActionPoints')||action==='adjustActionPoints';
      const chars=all?await tx.list(`${base}/characters`):[await tx.get(`${base}/characters/${documentId(input.characterId)}`)];
      requireThat(chars.every(Boolean),'NOT_FOUND');
      const stored=session?await Promise.all(chars.map(c=>tx.get(actionPointPath(id,c.id)))):chars.map(()=>null);
      const changes=[],nextChars=[],nextBalances=[];let nextParent={...parent,revision:parent.revision+1};
      let proposedRules=parent.actionPointRules,proposedSchedule=parent.actionPointSchedule??null;
      if(all){
        proposedRules=actionPointRulesInput(input.rules);
        if(session){
          const time=gameTime(parent.clock,at),nextAt=parent.actionPointRules?actionPointSchedule(parent,time).nextAtGameMs:actionPointSchedule({actionPointRules:proposedRules},time).nextAtGameMs;
          let nextAtGameMs=nextAt;
          if(input.nextAtGameMs!=null){whole(input.nextAtGameMs,'INVALID_ACTION_POINTS');requireThat(input.nextAtGameMs>time,'INVALID_ACTION_POINTS');nextAtGameMs=input.nextAtGameMs;}
          whole(nextAtGameMs,'INVALID_ACTION_POINTS');proposedSchedule={nextAtGameMs};
        }
        nextParent={...nextParent,actionPointRules:proposedRules,actionPointSchedule:proposedSchedule,actionPointRulesRevision:(parent.actionPointRulesRevision??0)+1};
      }
      if(adjust)requireThat(session&&parent.actionPointRules?.enabled,'ACTION_POINTS_DISABLED');
      for(let i=0;i<chars.length;i++){
        const c=chars[i],nextChar=all||adjust?c:{...c,globalLevel:globalLevel(input.level)};
        let before=null,after=null;
        if(parent.actionPointRules&&session)before=actionPointState(parent,c,stored[i],at);
        if(proposedRules){
          // Validate every configured level, including when this optional module is disabled.
          const maximum=actionPointMaximum(proposedRules,nextChar);
          if(session){
            after=before?{...before}:actionPointState(nextParent,nextChar,null,at);
            requireThat(after.reserved<=maximum,'ACTION_POINTS_RESERVED');after.available=Math.min(after.available,maximum-after.reserved);
            if(adjust){
              requireThat(['SET','REFILL'].includes(input.mode),'INVALID_ACTION_POINTS');
              const amount=input.mode==='REFILL'?maximum-after.reserved:whole(input.amount,'INVALID_ACTION_POINTS');
              requireThat(amount<=maximum-after.reserved,'INVALID_ACTION_POINTS');after.available=amount;
            }
            after.revision++;
          }
        }
        nextChars.push(nextChar);nextBalances.push(after);
        changes.push({id:c.id,name:c.public.displayName,levelBefore:c.globalLevel??1,levelAfter:nextChar.globalLevel??1,before:before?{...before,maximum:actionPointMaximum(parent.actionPointRules,c)}:null,
          after:after?{...after,maximum:actionPointMaximum(proposedRules,nextChar)}:null});
      }
      const result={scope:session?'session':'scenario',id,beforeRules:parent.actionPointRules??null,afterRules:proposedRules??null,nextAtGameMs:proposedSchedule?.nextAtGameMs??null,changes};
      // Prepare/save names differ; hash the semantic proposal, never the request verb.
      result.confirmation=hash([parent.revision,proposedRules,proposedSchedule,chars,stored,changes,input.mode??null]);
      if(!write)return result;
      requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
      for(let i=0;i<chars.length;i++){
        if(!all&&!adjust)tx.set(`${base}/characters/${chars[i].id}`,nextChars[i]);
        if(session&&nextBalances[i])tx.set(actionPointPath(id,chars[i].id),nextBalances[i]);
      }
      tx.set(base,nextParent);
      tx.set(`${base}/actionPointHistory/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,reason:reason.trim(),...result});
      if(session)tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,reason:reason.trim(),characterIds:chars.map(c=>c.id)});
      tx.set(op,{fingerprint,result,at});return result;
    });
  };
}
