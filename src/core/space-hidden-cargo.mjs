import {randomInt} from 'node:crypto';
import {requireThat,documentId,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash,publicLot} from './inventory-state.mjs';
import {warehouseStock,stockVolume} from './storage-state.mjs';
import {hasHiddenCargo,activeModuleOutages} from './space-module-flight.mjs';
import {standardShipModuleQuote} from '../shared/space-ship-modules.mjs';
import {gameTime} from './clock.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,resolveActionPoints,releaseActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {portCustomsStatuses} from '../shared/space-customs-rules.mjs';

// Decision B (4 November 2026): an outage blocks new storage only.
export {hasHiddenCargo};
export const concealedIn=(lot,shipId)=>lot.hiddenCargo?.concealed===true&&lot.hiddenCargo.shipId===shipId&&lot.location?.kind==='HOLD'&&lot.location.id===shipId;
export const hiddenFromOrdinary=(lot,shipId)=>concealedIn(lot,shipId)&&lot.hiddenCargo.discovered!==true;
export function hiddenCargoCapacity(ship,time){
 const m=ship.modules?.find(m=>m.code==='MOD-04'&&m.status==='OPERATIONAL'&&m.size===ship.soProfile?.size);
 const q=standardShipModuleQuote(m);return q&&!activeModuleOutages(ship,time).some(n=>n.lotId===m.lotId)?q.hiddenCargoCapacity:0;
}
const visit=ship=>ship.portVisitId??`INITIAL:${ship.id}`;
const idle=ship=>ship?.enabled&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId&&!ship.convoy&&!ship.convoyOffer;
const fit=(c,time,id=null)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeNavigationId&&!c.activeVoyageId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&(!c.activeMaintenanceId||c.activeMaintenanceId===id)&&!(c.convalescentUntilGameMs>time);
const fields={customsDesk:[],customsLicenseQuote:['code','referenceValue','shipId'],customsLicenseScopePreview:['shipId','lotIds','routeId','applicantCharacterId'],myCustomsConsents:[],prepareCustomsLotConsent:['shipId','lotId','routeId','applicantCharacterId'],grantCustomsLotConsent:['shipId','lotId','routeId','applicantCharacterId','confirmation','consent'],revokeCustomsLotConsent:['lotId','confirmation','confirmed'],prepareCustomsShipConsent:['shipId','routeId','applicantCharacterId'],grantCustomsShipConsent:['shipId','routeId','applicantCharacterId','confirmation','consent'],revokeCustomsShipConsent:['shipId','confirmation','confirmed'],hiddenCargo:['shipId'],prepareCargoConcealment:['shipId','lotId','conceal'],setCargoConcealment:['shipId','lotId','conceal','confirmation','present'],customsAdmin:[],setCustomsAuthority:['characterId','level','portId','authorityRevision','reason'],authorizeCustomsRetry:['shipId','confirmation','reason'],prepareCustomsInspection:['shipId','kind'],startCustomsInspection:['shipId','kind','confirmation','present'],prepareCustomsInspectionAdmin:['shipId','kind','agentId'],startCustomsInspectionAdmin:['shipId','kind','agentId','confirmation','present'],customsInspection:['inspectionId'],customsInspectionAdmin:['inspectionId'],finishCustomsInspection:['inspectionId','confirmation','present','performed'],finishCustomsInspectionAdmin:['inspectionId','confirmation','present','performed'],cancelCustomsInspection:['inspectionId','confirmation','reason'],cancelCustomsInspectionAdmin:['inspectionId','confirmation','reason']};
export const hiddenCargoActions=Object.keys(fields);
const reads=new Set(['customsDesk','customsLicenseQuote','customsLicenseScopePreview','myCustomsConsents','prepareCustomsLotConsent','prepareCustomsShipConsent','hiddenCargo','prepareCargoConcealment','customsAdmin','prepareCustomsInspection','prepareCustomsInspectionAdmin','customsInspection','customsInspectionAdmin']);
const admins=new Set(['customsAdmin','customsLicenseQuote','customsLicenseScopePreview','setCustomsAuthority','authorizeCustomsRetry','prepareCustomsInspectionAdmin','startCustomsInspectionAdmin','customsInspectionAdmin','finishCustomsInspectionAdmin','cancelCustomsInspectionAdmin']);
const jobs=['prepareCustomsInspection','startCustomsInspection','prepareCustomsInspectionAdmin','startCustomsInspectionAdmin'];
// Read-only reference quotation. This neither issues a permit nor settles a fee.
const feeFromReference=cr=>{const cents=cr*2n>5000n?cr*2n:5000n,units=cents/100n,part=cents%100n;return String(units)+(part?'.'+String(part).padStart(2,'0'):'');};
// Keep decimal hundredths exactly: no unapproved rounding rule is applied.
export function customsLicenseReferenceQuote(code,referenceValue){
 requireThat(['LIC-01','LIC-02','LIC-03'].includes(code),'SO_CUSTOMS_LICENSE_KIND');
 // Only LIC-02 has a numeric reference base. A stray value must not be
 // mistaken for a settled fee or a permitted exceptional authorization.
 requireThat(code==='LIC-02'||referenceValue===undefined,'SO_CUSTOMS_LICENSE_VALUE');
 if(code==='LIC-01')return {code,title:'Licence commerciale',exactFeeCr:'100',
  scope:'Activité marchande régulière ; permanente sauf révocation',requiresPayment:true,issued:false,
  requiredEvidence:['Titulaire identifié','Émetteur MJ identifié','Activité marchande régulière','Paiement réel à vérifier','Révocation éventuelle à contrôler']};
 if(code==='LIC-03')return {code,title:'Autorisation exceptionnelle',exactFeeCr:null,
  scope:'Mission, biens et durée à définir expressément par le MJ',requiresPayment:null,issued:false,
  requiredEvidence:['Titulaire identifié','Émetteur MJ identifié','Mission explicitement désignée','Biens concernés identifiés','Début et fin de validité définis','Tarif et paiement éventuel décidés par le MJ']};
 requireThat(Number.isSafeInteger(referenceValue)&&referenceValue>0,'SO_CUSTOMS_LICENSE_VALUE');

 return {code,title:'Permis de marchandises réglementées',referenceValue,
  exactFeeCr:feeFromReference(BigInt(referenceValue)),
  ratePercent:2,minimumCr:50,scope:'Cargaison et voyage autorisés',
  requiresPayment:true,issued:false,
  requiredEvidence:['Titulaire identifié','Émetteur MJ identifié','Cargaison réelle identifiée','Voyage autorisé identifié','Valeur réelle des lots recoupée','Paiement réel à vérifier']};
}
// The port must belong to the SAME published session version; never assume
// an unknown category is free or use a diagnostic as a payable licence.
export function publishedCustomsCargoAssessment({ship,port,sessionVersionId,stock}){
 let status='PUBLISHED';
 if(!ship?.docked||ship.journey)status='SHIP_NOT_DOCKED';
 else if(!port)status='PORT_UNAVAILABLE';
 else if(!sessionVersionId||port.versionId!==sessionVersionId||port.id!==ship.portId)status='VERSION_MISMATCH';
 else if(port.customsRules===undefined)status='NOT_CONFIGURED';
 else{
  const seen=new Set(),rules=port.customsRules;
  if(!Array.isArray(rules)||rules.length>100||!rules.every(r=>{
   if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==2||!Object.hasOwn(r,'itemId')||!Object.hasOwn(r,'status')||
     typeof r.itemId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(r.itemId)||!portCustomsStatuses.includes(r.status)||seen.has(r.itemId))return false;
   seen.add(r.itemId);return true;
  }))status='INVALID_POLICY';
 }
 const policies=status==='PUBLISHED'?new Map(port.customsRules.map(r=>[r.itemId,r.status])):new Map();
 let subtotal=0n,missing=0,unknown=0,prohibited=0,free=0,regulated=0;
 const lots=stock.map(l=>{
  const customsStatus=policies.get(l.item?.id)??'UNKNOWN';
  const referenceUnitValueCr=Number.isSafeInteger(l.item?.referenceUnitValueCr)&&l.item.referenceUnitValueCr>0?l.item.referenceUnitValueCr:null;
  const referenceTotalCr=referenceUnitValueCr!==null&&Number.isSafeInteger(l.quantity)&&l.quantity>0?String(BigInt(referenceUnitValueCr)*BigInt(l.quantity)):null;
  if(customsStatus==='REGULATED'){regulated++;if(referenceTotalCr===null)missing++;else subtotal+=BigInt(referenceTotalCr);}
  else if(customsStatus==='PROHIBITED')prohibited++;else if(customsStatus==='FREE')free++;else unknown++;
  return {id:l.id,name:l.item.name,quantity:l.quantity,unit:l.item.unit??'unité',status:l.status,
   ownerType:l.ownerType??'CHARACTER',ownerId:l.ownerId,concealed:concealedIn(l,ship.id),
   customsStatus,referenceUnitValueCr,referenceTotalCr};
 });
 return {portPolicy:{portId:ship.portId??null,status},lots,regulatedKnownSubtotalCr:String(subtotal),
  regulatedLots:regulated,regulatedMissingReference:missing,unclassifiedLots:unknown,prohibitedLots:prohibited,freeLots:free};
}
// One authenticated personal owner can consent for one native lot, applicant,
// route, and port visit. Group/shop property cannot use this player action.
async function customsConsentBinding(tx,s,owner,ownerVersion,input){
 const b=`sessions/${s.id}`,sh=await tx.get(`${b}/ships/${documentId(input.shipId)}`);
 requireThat(sh?.soProfile&&idle(sh),'SO_CUSTOMS_CONSENT_SHIP');
 const lot=await tx.get(`${b}/inventory/${documentId(input.lotId)}`);
 requireThat(lot&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.ownerId===owner.id&&
  lot.location?.kind==='HOLD'&&lot.location.id===sh.id&&lot.status==='AVAILABLE'&&
  Number.isSafeInteger(lot.quantity)&&lot.quantity>0&&!lot.cargoTransferId&&!lot.fieldActionId&&
  !lot.boardingCustody&&!lot.customsDetention&&!lot.transportContractId,'SO_CUSTOMS_CONSENT_LOT');
 const port=await tx.get(`${b}/ports/${documentId(sh.portId)}`);
 const a=publishedCustomsCargoAssessment({ship:sh,port,sessionVersionId:s.versionId,stock:[lot]});
 requireThat(a.portPolicy.status==='PUBLISHED'&&a.lots[0].customsStatus==='REGULATED'&&
  a.lots[0].referenceTotalCr!==null,'SO_CUSTOMS_CONSENT_POLICY');
 const route=await tx.get(`${b}/routes/${documentId(input.routeId)}`);
 const dest=route?.toPort?await tx.get(`${b}/ports/${documentId(route.toPort)}`):null;
 requireThat(route?.versionId===s.versionId&&route.fromPort===sh.portId&&route.toPort!==sh.portId&&
  route.enabled!==false&&dest?.versionId===s.versionId&&dest.id===route.toPort,'SO_CUSTOMS_CONSENT_ROUTE');
 const applicant=await inventoryParty(tx,s.id,documentId(input.applicantCharacterId));
 requireThat(applicant.active&&!applicant.c.survival?.dead,'SO_CUSTOMS_CONSENT_APPLICANT');
 const binding={ownerId:owner.id,ownerVersion,lotId:lot.id,lotRevision:lot.revision,quantity:lot.quantity,
  itemId:lot.item.id,itemRevision:lot.item.revision,unitReferenceCr:lot.item.referenceUnitValueCr,
  shipId:sh.id,portId:sh.portId,portVisitId:visit(sh),routeId:route.id,toPort:route.toPort,
  masterVersionId:s.versionId,applicantId:applicant.c.id,applicantVersion:applicant.version};
 return {binding,shipName:sh.name,lotName:lot.item.name,unit:lot.item.unit??'unité',
  routeName:route.name,applicantName:applicant.c.public.displayName,
  referenceTotalCr:a.lots[0].referenceTotalCr};
}
// The vessel-use agreement is separate from a cargo owner's consent.
// It neither transfers control of the ship nor supplies a pilot/route permit.
async function customsShipConsentBinding(tx,s,owner,ownerVersion,input){
 const base=`sessions/${s.id}`,ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);
 requireThat(ship?.soProfile&&(ship.ownerType??'CHARACTER')==='CHARACTER'&&ship.ownerId===owner.id&&idle(ship),
  'SO_CUSTOMS_SHIP_CONSENT_SHIP');
 const port=await tx.get(`${base}/ports/${documentId(ship.portId)}`);
 const status=publishedCustomsCargoAssessment({ship,port,sessionVersionId:s.versionId,stock:[]}).portPolicy.status;
 requireThat(status==='PUBLISHED','SO_CUSTOMS_SHIP_CONSENT_POLICY');
 const route=await tx.get(`${base}/routes/${documentId(input.routeId)}`);
 const dest=route?.toPort?await tx.get(`${base}/ports/${documentId(route.toPort)}`):null;
 requireThat(route?.versionId===s.versionId&&route.fromPort===ship.portId&&route.toPort!==ship.portId&&
  route.enabled!==false&&dest?.versionId===s.versionId&&dest.id===route.toPort,'SO_CUSTOMS_SHIP_CONSENT_ROUTE');
 const applicant=await inventoryParty(tx,s.id,documentId(input.applicantCharacterId));
 requireThat(applicant.active&&!applicant.c.survival?.dead,'SO_CUSTOMS_SHIP_CONSENT_APPLICANT');
 const binding={ownerId:owner.id,ownerVersion,shipId:ship.id,shipRevision:ship.revision,
  portId:ship.portId,portVisitId:visit(ship),routeId:route.id,toPort:route.toPort,
  masterVersionId:s.versionId,applicantId:applicant.c.id,applicantVersion:applicant.version};
 return {binding,shipName:ship.name,routeName:route.name,applicantName:applicant.c.public.displayName};
}
const consentToken=(s,v,data)=>hash(JSON.stringify([s.id,s.versionId,v,data]));
export function createHiddenCargoService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();let die;
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasHiddenCargo(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');
   const session={id:s.id,stage:s.stage,safetyStopped:!!s.safetyStop?.active};
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   const prior=op?await tx.get(op):null;
   const token=(...data)=>hash(JSON.stringify([s.id,s.revision,version??null,...data]));
   const replay=()=>{if(!prior)return null;requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||prior.guard===version,'FORBIDDEN');return prior.result;};
   const running=()=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
   const write=(result,before,after,reason='')=>{authorizeSpaceOutlaws(tx,s,'HIDDEN_CARGO');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after,reason});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(action==='myCustomsConsents'){
    const [ships,inventory,ports,routes,people,records]=await Promise.all([
     tx.list(`${base}/ships`),tx.list(`${base}/inventory`),tx.list(`${base}/ports`),
     tx.list(`${base}/routes`),tx.list(`${base}/characters`),tx.list(`${base}/customsConsents`,['ownerId',c.id])]);
    const shipRecords=await tx.list(`${base}/customsShipConsents`,['ownerId',c.id]);
    const byShip=new Map(ships.filter(idle).map(sh=>[sh.id,sh])),byPort=new Map(ports.map(p=>[p.id,p]));
    const eligible=inventory.filter(l=>(l.ownerType??'CHARACTER')==='CHARACTER'&&l.ownerId===c.id&&
     l.location?.kind==='HOLD'&&byShip.has(l.location.id)&&l.status==='AVAILABLE'&&
     !l.cargoTransferId&&!l.fieldActionId&&!l.boardingCustody&&!l.customsDetention&&!l.transportContractId&&
     Number.isSafeInteger(l.quantity)&&l.quantity>0).flatMap(l=>{
     const sh=byShip.get(l.location.id),a=publishedCustomsCargoAssessment({
      ship:sh,port:byPort.get(sh.portId),sessionVersionId:s.versionId,stock:[l]});
     if(a.portPolicy.status!=='PUBLISHED'||a.lots[0].customsStatus!=='REGULATED'||a.lots[0].referenceTotalCr===null)return [];
     const choices=routes.filter(r=>r.versionId===s.versionId&&r.fromPort===sh.portId&&r.toPort!==sh.portId&&
      r.enabled!==false&&byPort.get(r.toPort)?.versionId===s.versionId).map(r=>({id:r.id,name:r.name,toPort:r.toPort}));
     return choices.length?[{lotId:l.id,shipId:sh.id,shipName:sh.name,lotName:l.item.name,
      quantity:l.quantity,unit:l.item.unit??'unité',referenceTotalCr:a.lots[0].referenceTotalCr,routeChoices:choices}]:[];
    });
    const eligibleShips=ships.filter(sh=>idle(sh)&&(sh.ownerType??'CHARACTER')==='CHARACTER'&&sh.ownerId===c.id&&
     publishedCustomsCargoAssessment({ship:sh,port:byPort.get(sh.portId),sessionVersionId:s.versionId,stock:[]}).portPolicy.status==='PUBLISHED')
     .flatMap(sh=>{
      const routeChoices=routes.filter(r=>r.versionId===s.versionId&&r.fromPort===sh.portId&&
       r.toPort!==sh.portId&&r.enabled!==false&&byPort.get(r.toPort)?.versionId===s.versionId)
       .map(r=>({id:r.id,name:r.name,toPort:r.toPort}));
      return routeChoices.length?[{id:sh.id,name:sh.name,portId:sh.portId,
       portVisitId:visit(sh),routeChoices}]:[];
     }).slice(0,100);
    return {session,eligible:eligible.slice(0,100),eligibleShips,
     shipConsents:shipRecords.filter(r=>r.ownerId===c.id).slice(0,100).map(r=>({
      shipId:r.shipId,routeId:r.routeId,applicantId:r.applicantId,status:r.status,
      revision:r.revision,validity:'RECHECK_ON_USE',confirmation:consentToken(s,version,r)})),
     applicantChoices:people.filter(p=>p.assignedUid&&p.publicationState==='PUBLISHED'&&
     p.public?.publicationState==='PUBLISHED'&&p.public.displayName).map(p=>({id:p.id,name:p.public.displayName})),
     consents:records.filter(r=>r.ownerId===c.id).slice(0,100).map(r=>({
      lotId:r.lotId,shipId:r.shipId,routeId:r.routeId,applicantId:r.applicantId,
      status:r.status,revision:r.revision,confirmation:consentToken(s,version,r),
      validity:'RECHECK_ON_USE'}))};
   }
   if(action==='prepareCustomsLotConsent'||action==='grantCustomsLotConsent'){
    const candidate=await customsConsentBinding(tx,s,c,version,input);
    const path=`${base}/customsConsents/${candidate.binding.lotId}`,existing=await tx.get(path);
    if(action==='grantCustomsLotConsent'&&prior)return replay();
    requireThat(existing?.status!=='GRANTED','SO_CUSTOMS_CONSENT_OPEN');
    const confirmation=consentToken(s,version,[candidate.binding,existing?.revision??0]);
    if(action==='prepareCustomsLotConsent')return {...candidate,confirmation,
     note:'Autorisation d’un lot pour un titulaire, une route et cette escale seulement.'};
    running();requireThat(input.consent===true,'SO_CUSTOMS_CONSENT_CONFIRMATION');
    requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const record={id:candidate.binding.lotId,customsConsentVersion:1,...candidate.binding,
     status:'GRANTED',revision:(existing?.revision??0)+1,grantedAt:at,actorUid:actor.uid};
    authorizeSpaceOutlaws(tx,s,'CUSTOMS_CONSENT');tx.set(path,record);
    tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,lotId:record.lotId,
     shipId:record.shipId,routeId:record.routeId,applicantId:record.applicantId});
    const result={lotId:record.lotId,status:record.status,revision:record.revision};
    tx.set(op,{fingerprint,guard:version,result,at});return result;
   }
   if(action==='revokeCustomsLotConsent'){
    const lotId=documentId(input.lotId),path=`${base}/customsConsents/${lotId}`,r=await tx.get(path);
    requireThat(r?.customsConsentVersion===1&&r.ownerId===c.id,'FORBIDDEN');
    if(prior)return replay();
    requireThat(r.status==='GRANTED','SO_CUSTOMS_CONSENT_CLOSED');
    requireThat(input.confirmation===consentToken(s,version,r),'STALE_REVISION');
    running();requireThat(input.confirmed===true,'SO_CUSTOMS_CONSENT_CONFIRMATION');
    const next={...r,status:'REVOKED',revision:r.revision+1,revokedAt:at,revokedBy:actor.uid};
    authorizeSpaceOutlaws(tx,s,'CUSTOMS_CONSENT');tx.set(path,next);
    tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,lotId,shipId:r.shipId,applicantId:r.applicantId});
    const result={lotId,status:next.status,revision:next.revision};
    tx.set(op,{fingerprint,guard:version,result,at});return result;
   }
   if(action==='prepareCustomsShipConsent'||action==='grantCustomsShipConsent'){
    const candidate=await customsShipConsentBinding(tx,s,c,version,input);
    const path=`${base}/customsShipConsents/${candidate.binding.shipId}`,existing=await tx.get(path);
    if(action==='grantCustomsShipConsent'&&prior)return replay();
    requireThat(existing?.status!=='GRANTED','SO_CUSTOMS_SHIP_CONSENT_OPEN');
    const confirmation=consentToken(s,version,[candidate.binding,existing?.revision??0]);
    if(action==='prepareCustomsShipConsent')return {...candidate,confirmation,
     note:'Accord sur ce vaisseau, cette liaison et cette escale, sans droit de pilotage ni permis.'};
    running();requireThat(input.consent===true,'SO_CUSTOMS_SHIP_CONSENT_CONFIRMATION');
    requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const record={id:candidate.binding.shipId,customsShipConsentVersion:1,...candidate.binding,
     status:'GRANTED',revision:(existing?.revision??0)+1,grantedAt:at,actorUid:actor.uid};
    authorizeSpaceOutlaws(tx,s,'CUSTOMS_SHIP_CONSENT');tx.set(path,record);
    tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,shipId:record.shipId,
     routeId:record.routeId,applicantId:record.applicantId});
    const result={shipId:record.shipId,status:record.status,revision:record.revision};
    tx.set(op,{fingerprint,guard:version,result,at});return result;
   }
   if(action==='revokeCustomsShipConsent'){
    const shipId=documentId(input.shipId),path=`${base}/customsShipConsents/${shipId}`,record=await tx.get(path);
    requireThat(record?.customsShipConsentVersion===1&&record.ownerId===c.id,'FORBIDDEN');
    if(prior)return replay();
    requireThat(record.status==='GRANTED','SO_CUSTOMS_SHIP_CONSENT_CLOSED');
    requireThat(input.confirmation===consentToken(s,version,record),'STALE_REVISION');
    running();requireThat(input.confirmed===true,'SO_CUSTOMS_SHIP_CONSENT_CONFIRMATION');
    const next={...record,status:'REVOKED',revision:record.revision+1,revokedAt:at,revokedBy:actor.uid};
    authorizeSpaceOutlaws(tx,s,'CUSTOMS_SHIP_CONSENT');tx.set(path,next);
    tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,shipId,applicantId:record.applicantId});
    const result={shipId,status:next.status,revision:next.revision};
    tx.set(op,{fingerprint,guard:version,result,at});return result;
   }
   if(action==='customsLicenseQuote'){
    const quote=customsLicenseReferenceQuote(input.code,input.referenceValue);
    requireThat(input.code==='LIC-02'||input.shipId===undefined,'SO_CUSTOMS_LICENSE_SHIP');
    if(input.shipId===undefined)return quote;
    const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);
    requireThat(ship?.soProfile,'SO_CUSTOMS_LICENSE_SHIP');
    const stock=await warehouseStock(tx,s.id,ship.id,'HOLD');
    const portId=typeof ship.portId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(ship.portId)?ship.portId:null;
    const port=ship.docked&&!ship.journey&&portId?await tx.get(`${base}/ports/${portId}`):null;
    const assessment=publishedCustomsCargoAssessment({ship,port,sessionVersionId:s.versionId,stock});
    const routeChoices=assessment.portPolicy.status==='PUBLISHED'?(await tx.list(`${base}/routes`)).filter(r=>r.versionId===s.versionId&&r.fromPort===ship.portId&&r.toPort!==ship.portId&&r.enabled!==false).map(r=>({id:r.id,name:r.name,toPort:r.toPort})):[];
    // Candidate route and possible applicant identities: neither is an authorization.
    const applicantChoices=assessment.portPolicy.status==='PUBLISHED'?(await tx.list(`${base}/characters`))
      .filter(ch=>ch.assignedUid&&ch.publicationState==='PUBLISHED'&&ch.public?.publicationState==='PUBLISHED'&&ch.public?.displayName)
      .map(ch=>({id:ch.id,name:ch.public.displayName})):[];
    return {...quote,cargoContext:{
     ship:{id:ship.id,name:ship.name,portId:ship.portId??null,portVisitId:ship.portVisitId??null,docked:ship.docked,revision:ship.revision},
     voyage:ship.journey?{id:ship.journey.id,routeId:ship.journey.routeId,fromPort:ship.journey.fromPort??null,toPort:ship.journey.toPort??null}:null,
     ...assessment,sessionId:s.id,routeChoices,applicantChoices,referenceValueVerified:false,regulatedStatusVerified:false
    }};
   }
   if(action==='customsLicenseScopePreview'){
    requireThat(Array.isArray(input.lotIds)&&input.lotIds.length>=1&&input.lotIds.length<=100,'SO_CUSTOMS_LICENSE_SCOPE');
    const lotIds=input.lotIds.map(documentId);
    requireThat(new Set(lotIds).size===lotIds.length,'SO_CUSTOMS_LICENSE_SCOPE');
    const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);
    requireThat(ship?.soProfile&&idle(ship),'SO_CUSTOMS_LICENSE_SHIP');
    const port=await tx.get(`${base}/ports/${documentId(ship.portId)}`);
    const stock=await warehouseStock(tx,s.id,ship.id,'HOLD');
    const assessed=publishedCustomsCargoAssessment({ship,port,sessionVersionId:s.versionId,stock});
    requireThat(assessed.portPolicy.status==='PUBLISHED','SO_CUSTOMS_LICENSE_POLICY');
    const route=await tx.get(`${base}/routes/${documentId(input.routeId)}`);
    const destination=route?.toPort?await tx.get(`${base}/ports/${documentId(route.toPort)}`):null;
    requireThat(route?.versionId===s.versionId&&route.fromPort===ship.portId&&route.toPort!==ship.portId&&
      route.enabled!==false&&destination?.versionId===s.versionId&&destination.id===route.toPort,'SO_CUSTOMS_LICENSE_ROUTE');
    // Identity is checked against the native active, published character roster.
    // It does not grant consent from a third-party owner or a licence.
    const applicantId=input.applicantCharacterId===undefined?null:documentId(input.applicantCharacterId);
    const party=applicantId?await inventoryParty(tx,s.id,applicantId):null;
    requireThat(!party||party.active&&!party.c.survival?.dead,'SO_CUSTOMS_LICENSE_APPLICANT');
    const applicant=party?{id:party.c.id,name:party.c.public.displayName}:null;
    // Entire lots only. Explicit splits, transport contracts and custody are handled elsewhere.
    const rows=new Map(assessed.lots.map(l=>[l.id,l])),raw=new Map(stock.map(l=>[l.id,l]));
    const selected=lotIds.map(id=>{
     const row=rows.get(id),lot=raw.get(id);
     requireThat(row&&lot,'SO_CUSTOMS_LICENSE_LOT');
     requireThat(lot.status==='AVAILABLE'&&!lot.cargoTransferId&&!lot.boardingCustody&&!lot.customsDetention,
       'SO_CUSTOMS_LICENSE_LOT_UNAVAILABLE');
     requireThat(row.customsStatus==='REGULATED','SO_CUSTOMS_LICENSE_NOT_REGULATED');
     requireThat(row.referenceTotalCr!==null,'SO_CUSTOMS_LICENSE_VALUE_MISSING');
     return row;
    });
    // Factual ownership matrix, not a collection of signed mandates.
    const ownershipEvidence=[];
    for(const l of selected){
     const agreement=applicant&&l.ownerType==='CHARACTER'?await tx.get(`${base}/customsConsents/${l.id}`):null;
     const owner=agreement?.ownerId===l.ownerId?await inventoryParty(tx,s.id,l.ownerId):null;
     const original=raw.get(l.id);
     const consentVerified=!!(agreement?.customsConsentVersion===1&&agreement.status==='GRANTED'&&
      agreement.ownerId===l.ownerId&&owner?.active&&agreement.ownerVersion===owner.version&&
      agreement.applicantId===applicant?.id&&agreement.applicantVersion===party?.version&&
      agreement.shipId===ship.id&&agreement.portId===ship.portId&&agreement.portVisitId===visit(ship)&&
      agreement.routeId===route.id&&agreement.toPort===route.toPort&&agreement.masterVersionId===s.versionId&&
      agreement.lotId===l.id&&agreement.lotRevision===original.revision&&agreement.quantity===l.quantity&&
      agreement.itemId===original.item.id&&agreement.itemRevision===original.item.revision&&
      agreement.unitReferenceCr===l.referenceUnitValueCr);
     ownershipEvidence.push({lotId:l.id,ownerType:l.ownerType,ownerId:l.ownerId,
      relation:!applicant?'NOT_EVALUATED':l.ownerType==='CHARACTER'?
       (l.ownerId===applicant.id?'DIRECT_OWNER':'THIRD_PARTY'):'NON_PERSONAL_OWNER',
      consentVerified,mandateVerified:false});
    }
    const shipAgreement=applicant&&(ship.ownerType??'CHARACTER')==='CHARACTER'?
     await tx.get(`${base}/customsShipConsents/${ship.id}`):null;
    const shipOwner=shipAgreement?.ownerId===ship.ownerId?await inventoryParty(tx,s.id,ship.ownerId):null;
    const shipUseConsentVerified=!!(shipAgreement?.customsShipConsentVersion===1&&shipAgreement.status==='GRANTED'&&
     shipOwner?.active&&shipAgreement.ownerId===ship.ownerId&&shipAgreement.ownerVersion===shipOwner.version&&
     shipAgreement.applicantId===applicant?.id&&shipAgreement.applicantVersion===party?.version&&
     shipAgreement.shipId===ship.id&&shipAgreement.shipRevision===ship.revision&&
     shipAgreement.portId===ship.portId&&shipAgreement.portVisitId===visit(ship)&&
     shipAgreement.routeId===route.id&&shipAgreement.toPort===route.toPort&&
     shipAgreement.masterVersionId===s.versionId);
    const shipOwnershipEvidence={ownerType:ship.ownerType??'CHARACTER',ownerId:ship.ownerId,
     consentVerified:shipUseConsentVerified,
     relation:!applicant?'NOT_EVALUATED':(ship.ownerType??'CHARACTER')==='CHARACTER'?
       (ship.ownerId===applicant.id?'DIRECT_OWNER':'THIRD_PARTY'):'NON_PERSONAL_OWNER',
     mandateVerified:false};
    const voyageScopeEvidence={sourcePortVisitId:visit(ship),fromPort:route.fromPort,toPort:route.toPort,
     routeId:route.id,masterVersionId:s.versionId,actualVoyageId:null,validityWindowDefined:false,
     departureAuthorized:false};
    const amount=selected.reduce((sum,lot)=>sum+BigInt(lot.referenceTotalCr),0n);
    requireThat(amount>0n,'SO_CUSTOMS_LICENSE_VALUE_MISSING');
    return {code:'LIC-02',sessionId:s.id,issued:false,referenceValueVerified:false,scopeAuthorized:false,
     voyageAuthorizationVerified:false,ownerMandatesVerified:false,amountPaid:false,
     ship:{id:ship.id,name:ship.name,portId:ship.portId,portVisitId:visit(ship),revision:ship.revision},
     route:{id:route.id,name:route.name,fromPort:route.fromPort,toPort:route.toPort},
     applicant,ownershipEvidence,shipOwnershipEvidence,voyageScopeEvidence,
     selectedLots:selected,totalReferenceCr:String(amount),exactFeeCr:feeFromReference(amount)};
   }
   if(action==='customsAdmin'){
    const ships=await tx.list(`${base}/ships`),characters=await tx.list(`${base}/characters`),ports=await tx.list(`${base}/ports`),records=await tx.list(`${base}/shipMaintenance`);
    return {session,ships:ships.filter(x=>x.soProfile).map(x=>({id:x.id,name:x.name,portId:x.portId,canInspect:idle(x),canRetry:idle(x)&&x.customsAttempt?.visitId===visit(x)&&!x.customsAttempt.retryAuthorized,attempt:x.customsAttempt??null,confirmation:token(x)})),characters:characters.map(x=>({id:x.id,name:x.public.displayName,player:!!x.birth||!!x.assignedUid,authority:x.customsAuthorization??null})),ports:ports.map(x=>({id:x.id,name:x.name})),inspections:records.filter(r=>r.customsInspectionVersion===1).map(r=>({id:r.id,shipName:r.shipName,kind:r.kind,status:r.status,pnj:r.pnj}))};
   }
   if(action==='setCustomsAuthority'){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');const target=await tx.get(`${base}/characters/${documentId(input.characterId)}`),level=whole(input.level,'INVALID_CUSTOMS_AUTHORITY'),port=await tx.get(`${base}/ports/${documentId(input.portId)}`);
    requireThat(target&&level<=5&&port?.versionId===s.versionId,'INVALID_CUSTOMS_AUTHORITY');if(prior)return replay();requireThat(input.authorityRevision===(target.customsAuthorization?.revision??0),'STALE_REVISION');
    const reason=admissionText(input.reason,500,true),grant={level,portId:port.id,revision:input.authorityRevision+1,grantedAt:at,grantedBy:actor.uid};
    tx.set(`${base}/characters/${target.id}`,{...target,customsAuthorization:grant});return write({id:target.id,authority:grant},target.customsAuthorization??null,grant,reason);
   }
   if(['hiddenCargo','prepareCargoConcealment','setCargoConcealment'].includes(action)){
    const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);requireThat(ship?.ownerType==='CHARACTER'&&ship.ownerId===c.id,'FORBIDDEN');
    const stock=await warehouseStock(tx,s.id,ship.id,'HOLD'),capacity=hiddenCargoCapacity(ship,time),used=stockVolume(stock.filter(l=>concealedIn(l,ship.id)));
    if(action==='hiddenCargo')return {session,ship:{id:ship.id,name:ship.name,capacity:ship.capacity},hiddenCapacity:capacity,hiddenInstalledCapacity:standardShipModuleQuote(ship.modules?.find(m=>m.code==='MOD-04'))?.hiddenCargoCapacity??0,hiddenUsed:used,canMove:s.stage==='EN_JEU'&&!s.safetyStop?.active&&idle(ship)&&fit(c,time)&&(c.spacePortId??s.transportRules?.homePort)===ship.portId,stock:stock.filter(l=>l.ownerId===c.id&&(l.ownerType??'CHARACTER')==='CHARACTER').map(l=>({...publicLot(l),concealed:concealedIn(l,ship.id),discovered:l.hiddenCargo?.discovered===true})),confirmation:token(ship,stock)};
    const module=ship.modules?.find(m=>m.code==='MOD-04'),mounted=module?await tx.get(`${base}/inventory/${module.lotId}`):null;
    requireThat(!input.conceal||mounted?.status==='INSTALLED'&&!mounted.fieldActionId&&!mounted.cargoTransferId&&mounted.item?.kind==='INDIVIDUAL'&&!mounted.item.consumable&&mounted.transferable===true&&mounted.resellable===true&&(mounted.ownerType??'CHARACTER')==='CHARACTER'&&mounted.quantity===1&&mounted.ownerId===ship.ownerId&&mounted.holderId===ship.id&&mounted.location?.kind==='SHIP_MODULE'&&mounted.location.id===ship.id&&mounted.item?.shipModule?.code==='MOD-04'&&mounted.item.shipModule.size===module.size,'MODULE_LOT_UNAVAILABLE');
    running();requireThat(idle(ship)&&fit(c,time)&&(c.spacePortId??s.transportRules?.homePort)===ship.portId,'SHIP_NOT_LOCAL');requireThat(typeof input.conceal==='boolean','INVALID_ADMISSION');
    requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    const lot=stock.find(l=>l.id===documentId(input.lotId));requireThat(lot&&lot.ownerId===c.id&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.status==='AVAILABLE'&&!lot.boardingCustody&&!lot.transportContractId,'FORBIDDEN');
    const volume=stockVolume([lot]);requireThat(volume>0&&(!input.conceal||capacity>0&&used-(concealedIn(lot,ship.id)?volume:0)+volume<=capacity),'HIDDEN_CARGO_FULL');
    if(prior)return replay();const confirmation=token(ship,stock,lot,input.conceal),preview={lotId:lot.id,name:lot.item.name,volume,conceal:input.conceal,discovered:lot.hiddenCargo?.discovered===true,confirmation};if(action==='prepareCargoConcealment')return preview;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const next={...lot,hiddenCargo:{...lot.hiddenCargo,shipId:ship.id,concealed:input.conceal,discovered:lot.hiddenCargo?.discovered===true},revision:lot.revision+1};
    tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,before:lot.hiddenCargo??null,after:next.hiddenCargo});tx.set(`${base}/ships/${ship.id}`,{...ship,revision:ship.revision+1});return write({id:lot.id,concealed:input.conceal},lot.hiddenCargo??null,next.hiddenCargo);
   }
   if(action==='customsDesk'){
    requireThat(c.customsAuthorization?.level>=1,'FORBIDDEN');const fleet=await tx.list(`${base}/ships`),records=await tx.list(`${base}/shipMaintenance`);
    return {session,level:c.customsAuthorization.level,ships:fleet.filter(x=>x.docked&&!x.journey&&x.portId===(c.spacePortId??s.transportRules?.homePort)).map(x=>({id:x.id,name:x.name,canInspect:idle(x)})),inspections:records.filter(r=>r.customsInspectionVersion===1&&r.agentId===c.id).map(r=>({id:r.id,shipName:r.shipName,kind:r.kind,status:r.status}))};
   }
   if(action==='authorizeCustomsRetry'){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);requireThat(idle(ship)&&ship.customsAttempt?.visitId===visit(ship),'CUSTOMS_ATTEMPT_UNAVAILABLE');if(prior)return replay();requireThat(input.confirmation===token(ship),'STALE_REVISION');const reason=admissionText(input.reason,500,true),next={...ship,customsAttempt:{...ship.customsAttempt,retryAuthorized:true,retryReason:reason},revision:ship.revision+1};tx.set(`${base}/ships/${ship.id}`,next);return write({id:ship.id,retryAuthorized:true},ship.customsAttempt,next.customsAttempt,reason);
   }
   let r=jobs.includes(action)?null:await tx.get(`${base}/shipMaintenance/${documentId(input.inspectionId)}`);if(r)requireThat(r.customsInspectionVersion===1,'FORBIDDEN');
   requireThat(jobs.includes(action)||r,'FORBIDDEN');const cancelling=action.startsWith('cancel'),agentId=r?.agentId??(admin?documentId(input.agentId):c.id),agent=await tx.get(`${base}/characters/${agentId}`),grant=agent?.customsAuthorization;
   const p=agent?.birth?await inventoryParty(tx,s.id,agent.id):null,pnj=!!agent&&!agent.birth&&!agent.assignedUid;
   const oversight=admin&&['customsInspectionAdmin','cancelCustomsInspectionAdmin'].includes(action);
   if(!oversight)requireThat(grant?.level>=1&&grant.level<=5&&(admin?pnj:agent.id===c.id&&p?.active&&p.version===version),'FORBIDDEN');
   if(r&&!oversight)requireThat(grant?.revision===r.authorityRevision&&(admin?r.pnj:r.actorVersion===version),'FORBIDDEN');
   const ship=await tx.get(`${base}/ships/${r?.shipId??documentId(input.shipId)}`);requireThat(ship?.soProfile,'CARGO_UNAVAILABLE');
   if(prior)return replay();
   const confirmation=token(ship,r,grant),view=record=>({session,inspection:{id:record.id,shipId:record.shipId,shipName:record.shipName,kind:record.kind,status:record.status,pnj:record.pnj,canFinish:record.status==='ACTIVE'&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&time>=record.readyAtGameMs&&(!admin||record.pnj)&&grant?.level>=1&&grant.revision===record.authorityRevision,canCancel:record.status==='ACTIVE'&&['EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,remainingSeconds:record.status==='ACTIVE'?Math.max(0,Math.ceil((record.readyAtGameMs-time)/1000)):0,...(record.result?{result:record.result}:{})},confirmation});
   if(jobs.includes(action)){
    running();requireThat(['ORDINARY','DEEP'].includes(input.kind),'INVALID_CUSTOMS_KIND');requireThat(idle(ship),'SPACE_SHIP_BUSY');requireThat((pnj?grant.portId:(agent.spacePortId??s.transportRules?.homePort))===ship.portId,'SHIP_NOT_LOCAL');requireThat(pnj?!agent.activeMaintenanceId:fit(agent,time),'OUT_OF_COMBAT');
    requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    requireThat(input.kind!=='DEEP'||ship.customsAttempt?.visitId!==visit(ship)||ship.customsAttempt.retryAuthorized,'CUSTOMS_ATTEMPT_USED');
    const points=pnj?null:actionPointState(s,agent,await tx.get(actionPointPath(s.id,agent.id)),at),reserved=!pnj&&input.kind==='DEEP'?reserveActionPoints(points,1):points;
    const preview={shipName:ship.name,kind:input.kind,level:grant.level,seconds:120,actionPoints:pnj||input.kind==='ORDINARY'?0:1,confirmation};if(action.startsWith('prepare'))return preview;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const next={id,customsInspectionVersion:1,status:'ACTIVE',kind:input.kind,shipId:ship.id,shipName:ship.name,portId:ship.portId,visitId:visit(ship),agentId:agent.id,pnj,authorityRevision:grant.revision,actorVersion:pnj?null:version,level:grant.level,reservedActionPoints:pnj||input.kind==='ORDINARY'?0:1,readyAtGameMs:time+120000,revision:1};
    tx.set(`${base}/shipMaintenance/${id}`,next);tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:id,revision:ship.revision+1});tx.set(`${base}/characters/${agent.id}`,{...agent,activeMaintenanceId:id});if(next.reservedActionPoints)tx.set(actionPointPath(s.id,agent.id),reserved);return write({id,status:'ACTIVE'},null,next);
   }
   if(['customsInspection','customsInspectionAdmin'].includes(action))return view(r);
   requireThat(r.status==='ACTIVE'&&ship.maintenanceId===r.id&&visit(ship)===r.visitId&&ship.portId===r.portId,'CUSTOMS_INSPECTION_CLOSED');
   requireThat(agent?.activeMaintenanceId===r.id,'CUSTOMS_INSPECTION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU'||cancelling&&s.stage==='PAUSE','SESSION_NOT_RUNNING');requireThat(input.confirmation===confirmation,'STALE_REVISION');
   if(!cancelling){requireThat(input.present===true&&input.performed===true,'FIELD_PRESENCE_REQUIRED');requireThat(time>=r.readyAtGameMs,'CUSTOMS_NOT_READY');requireThat(pnj||fit(agent,time,r.id),'OUT_OF_COMBAT');requireThat((pnj?grant.portId:(agent.spacePortId??s.transportRules?.homePort))===ship.portId,'SHIP_NOT_LOCAL');requireThat(ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId,'SHIP_NOT_LOCAL');}
   const points=!r.pnj&&r.reservedActionPoints?actionPointState(s,agent,await tx.get(actionPointPath(s.id,agent.id)),at):null;if(points)requireThat(points.reserved>=1,'CUSTOMS_RESERVATION');
   const stock=!cancelling?await warehouseStock(tx,s.id,ship.id,'HOLD'):[];const reason=cancelling?admissionText(input.reason,500,true):'';
   // A previous discovery remains valid across later inspections and may not
   // become a fresh discovery (or acquire a new discovery timestamp).
   const newlyHidden=stock.filter(l=>hiddenFromOrdinary(l,ship.id));
   const alreadyKnown=stock.filter(l=>concealedIn(l,ship.id)&&l.hiddenCargo?.discovered===true);
   let result=null;if(!cancelling){if(r.kind==='DEEP'){die??=rollD6();requireThat(Number.isInteger(die)&&die>=1&&die<=6,'INVALID_DIE');const success=die+r.level>=7;result={roll:die,level:r.level,total:die+r.level,success,discovered:success?newlyHidden.map(publicLot):[],knownCargo:alreadyKnown.map(publicLot)};}else result={documentsChecked:true,hiddenCargoRevealed:false,knownCargo:stock.filter(l=>l.hiddenCargo?.discovered===true).map(publicLot)};}
   if(result?.success)for(const lot of newlyHidden){const next={...lot,hiddenCargo:{...lot.hiddenCargo,discovered:true,discoveredAt:at},revision:lot.revision+1};tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,inspectionId:r.id,before:lot.hiddenCargo,after:next.hiddenCargo});}
   if(points)tx.set(actionPointPath(s.id,agent.id),cancelling?releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,agent)):resolveActionPoints(points,1));tx.set(`${base}/characters/${agent.id}`,{...agent,activeMaintenanceId:null});
   const next={...r,status:cancelling?'CANCELLED':'COMPLETED',result,closedAt:at,revision:r.revision+1};tx.set(`${base}/shipMaintenance/${r.id}`,next);tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:null,...(!cancelling&&r.kind==='DEEP'?{customsAttempt:{visitId:r.visitId,inspectionId:r.id,used:true,retryAuthorized:false}}:{}),revision:ship.revision+1});return write({id:r.id,status:next.status,...(result?{result}:{})},r,next,reason);
  });
 };
}
