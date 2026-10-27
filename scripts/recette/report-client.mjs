import {acceptanceReport} from './cases.mjs';
const response=await fetch('/recette.json',{cache:'no-store'});
if(!response.ok)throw new Error('Contexte de recette indisponible');
const metadata=await response.json(),form=document.querySelector('#recette-report'),status=document.querySelector('#report-status');
form.addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const rows=[...form.querySelectorAll('[data-case]')].map(field=>({id:field.dataset.case,...Object.fromEntries([...field.querySelectorAll('[name]')].map(input=>[input.name,input.value]))}));
    const report=acceptanceReport(metadata,{operator:form.elements.operator.value,performedAt:form.elements.performedAt.value},rows),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');
    a.href=url;a.download=`so-recette-${metadata.commit.slice(0,7)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Relevé exporté. Les résultats sont les déclarations de l’opérateur.';
  }catch(error){status.textContent=error.message;}
});
