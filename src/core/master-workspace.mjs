import {dotationsProjection} from './master-dotations-projection.mjs';
import {parameterProjection} from './master-parameters-projection.mjs';
import {masterCollections} from '../shared/master-schema.mjs';
import {workshopModules} from '../shared/workshop-modules.mjs';
import {accountId,groupAccountId} from './economy-state.mjs';
import {requireThat} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {masterEditorProjection} from './master-editor-projection.mjs';
import {masterEditor} from '../shared/master-editors.mjs';

export const masterEditable=(ctx,at)=>!ctx.session||(ctx.parent.stage==='PREPARATION'&&!ctx.parent.campaignSealed&&gameTime(ctx.parent.clock,at)===0);
export function moduleMeta(ctx,module){
 return [{format:'gn-engine-master',version:'1',type:ctx.session?'SESSION':'CAMPAGNE',destination_id:ctx.id,campaign_id:ctx.parent.campaignId??'',base_revision:String(ctx.parent.revision),module}];
}
// An authenticated owner-only projection of existing definitions, never balances or played state.
export async function masterWorkspace(tx,ctx,at,newId,module,sheet){
 if(module!==undefined)requireThat(masterEditor(module),'INVALID_MASTER_MODULE');
 if(sheet!==undefined)requireThat(typeof sheet==='string'&&masterEditor(module,sheet),'INVALID_MASTER_SHEET');
 if(module!==undefined)requireThat(!ctx.session||!masterEditor(module,sheet).scenarioOnly,'INVALID_MASTER_SHEET');
 if(sheet==='Dotations')return {...dotationsProjection(await tx.list(`${ctx.base}/characters`)),session:ctx.session,meta:moduleMeta(ctx,module),revision:ctx.parent.revision};
 if(sheet==='Parametres')return {...parameterProjection(ctx.parent,module,ctx.session),meta:moduleMeta(ctx,module),revision:ctx.parent.revision,editable:masterEditable(ctx,at)};
 const records=Object.fromEntries(await Promise.all(Object.values(masterCollections).map(async k=>[k,await tx.list(`${ctx.base}/${k}`)])));
 const allStamps=[...(ctx.parent.masterRowBaseline??[]),...await tx.list(`${ctx.base}/masterRows`)];
 if(module!==undefined)return {...masterEditorProjection({module,sheet,records,stamps:allStamps,session:ctx.session,newId}),meta:moduleMeta(ctx,module),revision:ctx.parent.revision,editable:masterEditable(ctx,at)};
 const stamps=new Map(allStamps.filter(r=>r.sheet==='Tarifs').map(r=>[r.rowId,r.version]));
 const count=sheet=>masterCollections[sheet]?records[masterCollections[sheet]].length:
  sheet==='Objectifs'?records.characters.reduce((n,c)=>n+(c.objectives?.length??0),0):null;
 const tariffs=records.cargoTariffs.sort((a,b)=>a.id.localeCompare(b.id)).map(t=>{
  const c=records.characters.find(c=>accountId(c.id)===t.recipientAccountId),g=records.groups.find(g=>groupAccountId(g.id)===t.recipientAccountId);
  requireThat(!t.recipientAccountId||c||g,'INVALID_CARGO_TARIFF');
  return {archived:t.masterArchived===true,row:{id:t.id,operation:'MODIFIER',version:String((stamps.get(t.id)??0)+1),titre:t.title,description:t.description||'!EFFACER',nature:t.kind,mouvement:t.direction,objet_id:t.itemId||'!EFFACER',montant_fixe:String(t.flatAmount),montant_unitaire:String(t.unitAmount),beneficiaire_type:c?'CHARACTER':g?'GROUP':'SINK',beneficiaire_id:c?.id??g?.id??'!EFFACER',actif:t.enabled?'OUI':'NON'}};
 });
 return {revision:ctx.parent.revision,editable:masterEditable(ctx,at),modules:workshopModules.map(m=>({id:m.id,counts:Object.fromEntries(m.sheets.map(s=>[s,count(s)]))})),
  meta:moduleMeta(ctx,'economie'),newTariff:{id:newId,operation:'CREER',version:'1'},tariffs,
  items:records.items.map(i=>({id:i.id,name:i.name})),
  beneficiaries:[...records.characters.map(c=>({type:'CHARACTER',id:c.id,name:c.public.displayName})),...records.groups.filter(g=>g.walletConfig).map(g=>({type:'GROUP',id:g.id,name:g.walletConfig.label}))]};
}
