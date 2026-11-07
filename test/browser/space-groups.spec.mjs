import {spaceGroupWalletFixture} from '../support/space-group-wallets-suite.mjs';
import {groupRequestsFixture} from '../support/space-group-requests-suite.mjs';
import {groupDefinitionsFixture} from '../support/space-group-definitions-suite.mjs';
import {test,expect} from 'playwright/test';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {MemoryStore} from '../support/memory.mjs';
import {spaceGroupsFixture} from '../support/space-groups-suite.mjs';
let template,bundle;
test.beforeAll(async()=>{const css=await readFile('web/style.css','utf8')+'\n'+await readFile('web/galactic.css','utf8');template=(await readFile('web/index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*rel="stylesheet"[^>]*>/g,'').replace('</head>',`<style>${css}</style></head>`);bundle=(await build({stdin:{contents:"export * from './web/group-management.mjs'; export {createCollectiveUi} from './web/collective-accounts.mjs';",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'Groups',write:false})).outputFiles[0].text;});
async function mount(page,f){
 const remote=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{remote.push(r.request().url());return r.abort();});await page.exposeBinding('__read',(_,a,p)=>f.read(a,p));await page.exposeBinding('__cmd',(_,a,p)=>f.cmd(a,p));await page.setContent(template);await page.addScriptTag({content:bundle});
 await page.evaluate(async()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const helpers={button:(label,a,attrs='',cls='')=>`<button type="button" class="${cls}" data-action="${a}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`,input:(label,name,value='',type='text',required=false)=>`<label>${label}<input name="${name}" value="${esc(value)}" type="${type}" ${required?'required':''}></label>`,textarea:(label,name,value='')=>`<label>${label}<textarea name="${name}">${esc(value)}</textarea></label>`};
  const ui=Groups.createGroupManagementUi(helpers),wallet=Groups.createCollectiveUi(helpers);
  let d,pending,busy=false;const app=document.querySelector('#app'),dialog=document.querySelector('#dialog'),modal=html=>{dialog.innerHTML=html;if(!dialog.open)dialog.showModal();},refresh=async()=>{d=await window.__read('groupManagement',{});app.innerHTML=ui.page(d);};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='rosterEdit')modal(ui.editor(d,d.groups.find(g=>g.id===b.dataset.id),'new-team'));if(b.dataset.action==='rosterPrepared'){const p=d.preparedMemberships.find(p=>p.characterId===b.dataset.character&&p.groupId===b.dataset.group);modal(ui.member(d,p.characterId,null,p));}if(b.dataset.action==='rosterMember')modal(ui.member(d,b.dataset.id));
   if(b.dataset.action==='groupWalletConfig')modal(wallet.configure({id:d.sessionId,revision:d.revision},'session',d.groups.find(g=>g.id===b.dataset.id)));
  });
  document.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const form=e.target,v=Object.fromEntries(new FormData(form));try{
   if(form.dataset.form==='rosterFilter'){app.innerHTML=ui.page(d,v.query,v.state);return;}
   if(form.dataset.form==='rosterSave')await window.__cmd('saveGroupRoster',{...v,groupId:form.dataset.id,groupRevision:Number(form.dataset.revision),capacity:v.capacity===''?null:Number(v.capacity),leaderId:v.leaderId||null});
   else if(form.dataset.form==='rosterPrepare'){const p=Groups.membershipInput(v,d.sessionId,form.dataset.character),q=await window.__read('prepareGroupMembership',p);pending={...p,confirmation:q.confirmation};modal(ui.confirmation(q));return;}
   else if(form.dataset.form==='rosterApply')await window.__cmd('applyGroupMembership',pending);
   else if(form.dataset.form==='groupWalletConfig'){
    const p={groupId:form.dataset.group,revision:Number(form.dataset.revision),label:v.label,reason:v.reason};
    modal(wallet.configConfirm(await window.__read('prepareGroupWallet',p),p));return;
   }
   else if(form.dataset.form==='accountCommand')await window.__cmd(form.dataset.command,JSON.parse(form.dataset.payload));
   else return;
   dialog.close();await refresh();
  }catch(e){window.__uiError=e.message;}finally{busy=false;}});await refresh();
 });
 return async(info,name)=>{expect(errors).toEqual([]);expect(remote).toEqual([]);expect(await page.evaluate(()=>window.__uiError??null)).toBeNull();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(name+'.png'),fullPage:true});};
}
test('Régie SO : création, permissions privées puis transfert sans héritage',async({page},info)=>{
 const f=await spaceGroupsFixture(()=>new MemoryStore());await f.config('b');const check=await mount(page,f);await page.getByRole('button',{name:'Créer un groupe',exact:true}).click();const dialog=page.locator('#dialog');await dialog.getByLabel('Nom',{exact:true}).fill('Équipe de test');await dialog.locator('select[name=kind]').selectOption('TEAM');await dialog.getByLabel('Publication du contenu de groupe').selectOption('PUBLISHED');await dialog.getByLabel('Briefing',{exact:true}).fill('SECRET_NOUVEAU');await dialog.getByLabel('Motif',{exact:true}).fill('Création de recette');await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect(page.getByRole('heading',{name:'Équipe de test',exact:true})).toBeVisible();
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Ari Test',exact:true})});await card.getByRole('button',{name:'Affecter, déplacer ou retirer'}).click();await dialog.locator('select[name=targetGroupId]').selectOption('new-team');await dialog.locator('[name=permission_readBriefing]').check();await dialog.locator('[name=revealed]').check();await dialog.locator('[name=authorizePermissions]').check();expect(await dialog.locator('[name=permission_payWallet]').isChecked()).toBe(false);await dialog.getByLabel('Motif',{exact:true}).fill('Affectation explicite');await dialog.getByRole('button',{name:'Vérifier les conséquences'}).click();await expect(dialog.getByRole('heading',{name:'Confirmer l’opération'})).toBeVisible();expect((await f.group('new-team')).members).toEqual([]);await dialog.locator('[data-form=rosterApply] button[type=submit]').click();await expect(dialog).not.toBeVisible();expect((await f.read('myGroup',{groupId:'new-team'},f.player)).group.briefing).toBe('SECRET_NOUVEAU');await check(info,'groupe-affecte');
 await card.getByRole('button',{name:'Affecter, déplacer ou retirer'}).click();await dialog.locator('select[name=sourceGroupId]').selectOption('new-team');await dialog.locator('select[name=targetGroupId]').selectOption('b');await dialog.locator('[name=revealed]').check();await dialog.getByLabel('Motif',{exact:true}).fill('Transfert sans reprise des secrets');await dialog.getByRole('button',{name:'Vérifier les conséquences'}).click();await dialog.locator('[data-form=rosterApply] button[type=submit]').click();await expect(dialog).not.toBeVisible();await expect(f.read('myGroup',{groupId:'new-team'},f.player)).rejects.toMatchObject({code:'FORBIDDEN'});expect((await f.read('myGroup',{groupId:'b'},f.player)).group.briefing).toBeUndefined();await check(info,'transfert-sans-heritage');
});
test('Régie SO : STOP interdit les formulaires de mutation',async({page},info)=>{const f=await spaceGroupsFixture(()=>new MemoryStore());await f.config('a');await f.cmd('stopSafety',{reason:'STOP'},f.player);const check=await mount(page,f);expect(await page.locator('[data-action=rosterEdit],[data-action=rosterMember],[data-action=rosterArchive]').count()).toBe(0);await check(info,'stop');});

test('Régie M2 : groupe configuré puis affectation prévue explicitement autorisée',async({page},info)=>{
 const f=await groupDefinitionsFixture(()=>new MemoryStore()),check=await mount(page,f),dialog=page.locator('#dialog');await expect(page.getByRole('heading',{name:'Appartenances prévues dans M2'})).toBeVisible();expect(await page.locator('[data-action=rosterPrepared]').count()).toBe(0);
 await page.locator('[data-action=rosterEdit][data-id=prepared]').click();await dialog.locator('select[name=kind]').selectOption('FACTION');await dialog.locator('[name=capacity]').fill('3');await dialog.getByLabel('Motif',{exact:true}).fill('Configuration de la cellule M2');await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect(dialog).not.toBeVisible();await page.locator(`[data-action=rosterPrepared][data-character="${f.cid}"]`).click();expect(await dialog.locator('[name=permission_readBriefing]').isChecked()).toBe(true);expect(await dialog.locator('[name=authorizePermissions]').isChecked()).toBe(false);await dialog.getByLabel('Motif',{exact:true}).fill('Vérifier la proposition M2');await dialog.locator('[name=authorizePermissions]').check();await dialog.getByRole('button',{name:'Vérifier les conséquences'}).click();expect((await f.get('groups/prepared')).members).toEqual([]);await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(f.read('myGroup',{groupId:'prepared'},f.player)).rejects.toMatchObject({code:'FORBIDDEN'});
 await page.locator(`[data-action=rosterPrepared][data-character="${f.cid}"]`).click();await dialog.getByLabel('Motif',{exact:true}).fill('Affectation M2 confirmée');await dialog.locator('[name=authorizePermissions]').check();await dialog.getByRole('button',{name:'Vérifier les conséquences'}).click();await dialog.locator('[data-form=rosterApply] button[type=submit]').click();await expect(dialog).not.toBeVisible();expect((await f.read('myGroup',{groupId:'prepared'},f.player)).group.briefing).toBe('SECRET_M2_BRIEFING');await expect(f.read('myGroup',{groupId:'prepared'},f.other)).rejects.toMatchObject({code:'FORBIDDEN'});await check(info,'m2-affectation-confirmee');
});

test('Souhaits privés : recherche et affectation sans groupe ni droits prédéduits',async({page},info)=>{
 const f=await groupRequestsFixture(()=>new MemoryStore());await f.config();const check=await mount(page,f),dialog=page.locator('#dialog');await expect(page.getByRole('heading',{name:'Souhaits privés d’amis',exact:true})).toBeVisible();expect(await page.locator('.private-friend-requests article').count()).toBe(2);expect(await page.locator('.private-friend-requests img').count()).toBe(0);await page.locator('[name=query]').fill('secret_amis_a');await page.getByRole('button',{name:'Filtrer',exact:true}).click();expect(await page.locator('.private-friend-requests article').count()).toBe(1);await expect(page.getByRole('heading',{name:'Ari Test',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Bela Test',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Gérer l’appartenance',exact:true}).click();expect(await dialog.locator('[name=targetGroupId]').inputValue()).toBe('');expect(await dialog.locator('[name=permission_readBriefing]').isChecked()).toBe(false);expect(await dialog.locator('[name=authorizePermissions]').isChecked()).toBe(false);await dialog.locator('[name=targetGroupId]').selectOption('phare');await dialog.locator('[name=revealed]').check();await dialog.locator('[name=permission_readBriefing]').check();await dialog.locator('[name=authorizePermissions]').check();await dialog.getByLabel('Motif',{exact:true}).fill('Coordination validée');await dialog.getByRole('button',{name:'Vérifier les conséquences'}).click();expect((await f.group('phare')).members).toEqual([]);await dialog.locator('[data-form=rosterApply] button[type=submit]').click();await expect(dialog).not.toBeVisible();expect((await f.read('myGroup',{groupId:'phare'},f.player)).group.briefing).toBe('BRIEFING_DU_GROUPE');expect(JSON.stringify(await f.group('phare'))).not.toMatch(/SECRET_AMIS_A|SECRET_AMIS_B/);await check(info,'souhait-prive-affectation');
});

test('Catalogue : réserves consultables et recherche du successeur par ancien nom',async({page},info)=>{
 const f=await spaceGroupsFixture(()=>new MemoryStore());await f.death();await f.succeed(await f.previewSuccession());const before=await f.assets(),check=await mount(page,f);
 await page.locator('[name=state]').selectOption('RESERVE');await page.getByRole('button',{name:'Filtrer',exact:true}).click();await expect(page.getByRole('heading',{name:'Eli Réserve',exact:true})).toBeVisible();expect(await page.locator('[data-action=rosterMember]').count()).toBe(0);await check(info,'catalogue-reserves');
 await page.locator('[name=state]').selectOption('ACTIVE');await page.locator('[name=query]').fill('Ari Test');await page.getByRole('button',{name:'Filtrer',exact:true}).click();await expect(page.getByRole('heading',{name:'Dana Réserve',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Bela Test',exact:true})).toHaveCount(0);await check(info,'catalogue-successeur');expect(await f.assets()).toEqual(before);
});


test('Caisse SO : confirmation explicite en régie, ouverte à zéro',async({page},info)=>{
 const f=await spaceGroupWalletFixture(()=>new MemoryStore(),{fund:false}),check=await mount(page,f);
 const dialog=page.locator('#dialog');
 await page.getByRole('button',{name:'Ouvrir une caisse',exact:true}).click();
 await dialog.getByLabel('Libellé visible par les contreparties des paiements').fill('Comptoir des Dunes');
 await dialog.getByLabel('Motif réservé au MJ').fill('Ouverture demandée par le groupe');
 await dialog.getByRole('button',{name:'Vérifier la configuration'}).click();
 await expect(dialog.getByText('Ouverture à zéro crédit.')).toBeVisible();
 expect(await f.get(f.walletPath)).toBeNull();
 await dialog.getByRole('button',{name:'Confirmer cette configuration'}).click();
 await expect(dialog).not.toBeVisible();
 expect((await f.get(f.walletPath)).balance).toBe(0);
 await expect(page.getByRole('button',{name:'Historique de la caisse'})).toBeVisible();
 await check(info,'caisse-ouverte');
});
