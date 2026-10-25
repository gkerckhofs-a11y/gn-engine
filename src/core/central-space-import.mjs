import {centralSpaceInput,centralSpaceEditable} from './central-space.mjs';

const common={nom:['name'],description:['description',''],notes_mj:['gmNotes','']};
const fields={
 shipModel:{...common,profil_id:['profileId']},
 port:{...common,code_navigation:['navigationCode'],lieu_id:['locationTargetId',null]},
 route:{...common,origine_port_id:['fromPort'],destination_port_id:['toPort'],distance_id:['distanceId'],risque_id:['riskId'],code_navigation:['navigationCode']},
};
export function importedSpace(type,row,old){
 const data=old?centralSpaceEditable(type,old.data):{};
 for(const [column,[key,cleared]] of Object.entries(fields[type])){
  let value=row[column];if(value===undefined||value==='')continue;
  try{
   if(value==='!EFFACER'){if(cleared===undefined)throw new Error('Ce champ obligatoire ne peut pas être effacé.');value=cleared;}
   else if(value.startsWith('!!'))value=value.slice(1);
   // Validate each cell with the native validator, without storing probe values.
   const probe={name:'Validation',...(type==='shipModel'?{profileId:'FIGHTER'}:type==='port'?{navigationCode:'Validation'}:{navigationCode:'Validation',distanceId:'SHORT',riskId:'SECURED',fromPort:value==='origin'?'other':'origin',toPort:value==='destination'?'other':'destination'})};
   centralSpaceInput(type,{...probe,[key]:value},row.id);data[key]=value;
  }catch(e){e.column=column;throw e;}
 }
 for(const [column,[key,cleared]] of Object.entries(fields[type]))if(cleared===undefined&&!data[key])throw Object.assign(new Error('Champ obligatoire à renseigner.'),{column});
 if(type==='route'&&data.fromPort===data.toPort)throw Object.assign(new Error('Les ports de départ et d’arrivée doivent être distincts.'),{column:'destination_port_id'});
 return centralSpaceInput(type,data,row.id,old?.data);
}
export function exportedSpace(c){
 const row={id:c.entityId,operation:c.operation==='ARCHIVE'?'ARCHIVER':'MODIFIER',revision:c.data.revision};if(c.operation==='ARCHIVE')return row;
 for(const [column,[key]] of Object.entries(fields[c.type])){const v=c.data[key];row[column]=v==null?'':typeof v==='string'&&v.startsWith('!')?`!${v}`:v;}return row;
}
export const spaceImportColumn=(type,field)=>Object.entries(fields[type]).find(([, [key]])=>field===key)?.[0]??field;
