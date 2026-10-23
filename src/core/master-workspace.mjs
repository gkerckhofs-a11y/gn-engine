import {dotationsProjection} from './master-dotations-projection.mjs';
import {parameterProjection} from './master-parameters-projection.mjs';
import {masterCollections} from '../shared/master-schema.mjs';
import {workshopModules} from '../shared/workshop-modules.mjs';
import {accountId,groupAccountId} from './economy-state.mjs';
import {requireThat} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {masterEditorProjection} from './master-editor-projection.mjs';
import {masterEditor,masterEditorsFor} from '../shared/master-editors.mjs';

export const masterEditable=(ctx,at)=>!ctx.session||(ctx.parent.stage==='PREPARATION'&&!ctx.parent.campaignSealed&&gameTime(ctx.parent.clock,at)===0);
export function moduleMeta(ctx,module){
 return [{format:'gn-engine-master',version:'1',type:ctx.session?'SESSION':'CAMPAGNE',destination_id:ctx.id,campaign_id:ctx.parent.campaignId??'',base_revision:String(ctx.parent.revision),module}];
}
// An authenticated owner-only projection of existing definitions, never balances or played state.
export async function masterWorkspace(tx,ctx,at,newId,module,sheet,bundle=false){
 requireThat(typeof bundle==='boolean'&&(!bundle||(module!==undefined&&sheet===undefined)),'INVALID_MASTER_MODULE');
 if(module!==undefined)requireThat(masterEditor(module),'INVALID_MASTER_MODULE');
 if(sheet!==undefined)requireThat(typeof sheet==='string'&&masterEditor(module,sheet),'INVALID_MASTER_SHEET');
 if(module!==undefined)requireThat(!ctx.session||!masterEditor(module,sheet).scenarioOnly,'INVALID_MASTER_SHEET');
 if(sheet==='Dotations')return {...dotationsProjection(await tx.list(`${ctx.base}/characters`)),session:ctx.session,meta:moduleMeta(ctx,module),revision:ctx.parent.revision};
 if(sheet==='Parametres')return {...parameterProjection(ctx.parent,module,ctx.session),meta:moduleMeta(ctx,module),revision:ctx.parent.revision,editable:masterEditable(ctx,at)};
 const records=Object.fromEntries(await Promise.all(Object.values(masterCollections).map(async k=>[k,await tx.list(`${ctx.base}/${k}`)])));
 const allStamps=[...(ctx.parent.masterRowBaseline??[]),...await tx.list(`${ctx.base}/masterRows`)];
 if(module!==undefined&&!bundle)return {...masterEditorProjection({module,sheet,records,stamps:allStamps,session:ctx.session,newId}),meta:moduleMeta(ctx,module),revision:ctx.parent.revision,editable:masterEditable(ctx,at)};
 const tariffs=module===undefined||module==='economie'?tariffProjection(records,allStamps):[];
 if(bundle){
  const meta=moduleMeta(ctx,module),common={meta,revision:ctx.parent.revision,editable:masterEditable(ctx,at)};
  const definitions=masterEditorsFor(module).filter(d=>!d.readOnly&&(!ctx.session||!d.scenarioOnly));
  const workspaces=definitions.map(d=>({...common,...(d.sheet==='Parametres'?parameterProjection(ctx.parent,module,ctx.session):masterEditorProjection({module,sheet:d.sheet,records,stamps:allStamps,session:ctx.session,newId}))}));
  const referenceIndex=Object.fromEntries(Object.entries(masterCollections).map(([sheet,collection])=>[sheet,records[collection].map(r=>({id:r.id,archived:r.masterArchived===true}))]));
  return {module,bundle:true,session:ctx.session,...common,workspaces,referenceIndex,...(module==='economie'?{tariffs}:{})};
 }
 const count=sheet=>masterCollections[sheet]?records[masterCollections[sheet]].length:
  sheet==='Objectifs'?records.characters.reduce((n,c)=>n+(c.objectives?.length??0),0):null;
 return {revision:ctx.parent.revision,editable:masterEditable(ctx,at),modules:workshopModules.map(m=>({id:m.id,counts:Object.fromEntries(m.sheets.map(s=>[s,count(s)]))})),
  meta:moduleMeta(ctx,'economie'),newTariff:{id:newId,operation:'CREER',version:'1'},tariffs,
  items:records.items.map(i=>({id:i.id,name:i.name})),
  beneficiaries:[...records.characters.map(c=>({type:'CHARACTER',id:c.id,name:c.public.displayName})),...records.groups.filter(g=>g.walletConfig).map(g=>({type:'GROUP',id:g.id,name:g.walletConfig.label}))]};
}

function tariffProjection(records,allStamps){
 const stamps=new Map(allStamps.filter(r=>r.sheet==='Tarifs').map(r=>[r.rowId,r.version]));
 const tariffs=records.cargoTariffs.sort((a,b)=>a.id.localeCompare(b.id)).map(t=>{
  const c=records.characters.find(c=>accountId(c.id)===t.recipientAccountId),g=records.groups.find(g=>groupAccountId(g.id)===t.recipientAccountId);
  requireThat(!t.recipientAccountId||c||g,'INVALID_CARGO_TARIFF');
  return {archived:t.masterArchived===true,row:{id:t.id,operation:'MODIFIER',version:String((stamps.get(t.id)??0)+1),titre:t.title,description:t.description||'!EFFACER',nature:t.kind,mouvement:t.direction,objet_id:t.itemId||'!EFFACER',montant_fixe:String(t.flatAmount),montant_unitaire:String(t.unitAmount),beneficiaire_type:c?'CHARACTER':g?'GROUP':'SINK',beneficiaire_id:c?.id??g?.id??'!EFFACER',actif:t.enabled?'OUI':'NON'}};
 });
 return tariffs;
}
