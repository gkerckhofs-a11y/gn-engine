import {parameterFields,parameterRows} from '../shared/master-parameters-editor.mjs';
const text=v=>v==null?'':String(v),flag=v=>v==null?'':v?'OUI':'NON';
export function parameterProjection(parent,module,session){
 const pa=parent.actionPointRules,health=parent.healthRules,money=parent.economyRules;
 const all={groupes_actifs:flag(parent.modules?.groups),pa_actifs:flag(pa?.enabled),pa_niveau_1:text(pa?.maxByLevel?.[1]),pa_niveau_2:text(pa?.maxByLevel?.[2]),pa_renouvellement_minutes:text(pa?.renewalMinutes),pa_cout:text(pa?.cost),pa_recuperation_secondes:text(pa?.cooldownSeconds),pa_recuperation_patient_secondes:text(pa?.patientCooldownSeconds),sante_active:flag(health?.enabled),pv_max_defaut:text(health?.defaultMaxHp),economie_active:flag(money?.enabled),monnaie_nom:text(money?.name),monnaie_unite:text(money?.unit),astroport_id:text(parent.transportRules?.homePort)};
 const values=Object.fromEntries(parameterFields(module,session).map(f=>[f.name,all[f.name]]));
 return {module,sheet:'Parametres',session,values,parameterRows:parameterRows(module,session,values),configured:{pa:!!pa,health:!!health,money:!!money},errors:[],references:{},rows:[]};
}
