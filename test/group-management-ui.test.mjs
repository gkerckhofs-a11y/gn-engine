import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroupManagementUi,membershipInput,rosterCharacterMatches} from '../web/group-management.mjs';
import {createGroupsUi,escapeHtml as esc,permissionLabels} from '../web/groups.mjs';
const helpers={button:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,link:(label,path)=>`<a href="#/${path}">${label}</a>`,input:(label,name,value='')=>`<label>${label}<input name="${name}" value="${esc(value)}"></label>`,textarea:(label,name,value='')=>`<label>${label}<textarea name="${name}">${esc(value)}</textarea></label>`,pill:esc};
const ui=createGroupManagementUi(helpers),character={id:'c',name:'<img onerror=alert(1)>',assigned:true,outOfCombat:false};
const group={id:'g',name:'<script>nom</script>',visibility:'SECRET',publicationState:'PUBLISHED',members:[{characterId:'c',active:true,permissions:{readWallet:true}}],roster:{kind:'TEAM',capacity:1,leaderId:'c',archived:false}};
const data={sessionId:'s',groupsEnabled:true,closed:false,characters:[character],groups:[group],events:[]};
test('Régie UI : champs échappés, accès par personnage, états disponibles et groupe historique explicite',()=>{
 const html=ui.page({...data,groups:[group,{...group,id:'old',roster:undefined}]});assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/data-action="rosterMember"/);assert.match(html,/configuration explicite requise/);assert.match(html,/Hors combat ne signifie pas décédé/);
 assert.equal(rosterCharacterMatches(character,'IMG','ASSIGNED'),true);assert.equal(rosterCharacterMatches(character,'','UNASSIGNED'),false);assert.equal(rosterCharacterMatches(character,'','OUT'),false);
});
test('Régie UI : nouveaux mandats sans cases précochées et retrait ignore les champs destinataires',()=>{
 const html=ui.member(data,'c');assert.doesNotMatch(html,/checked/);for(const p of Object.keys(permissionLabels))assert.match(html,new RegExp(`name="permission_${p}"`));assert.match(html,/name="authorizePermissions"/);
 const p=membershipInput({sourceGroupId:'g',targetGroupId:'',permission_payWallet:'on',authorizePermissions:'on',reason:'Retrait'},'s','c');assert.equal(p.membership,null);assert.equal(p.authorizePermissions,false);
 const q=membershipInput({targetGroupId:'g',permission_readWallet:'on',authorizePermissions:'on'},'s','c');assert.equal(q.membership.permissions.readWallet,true);assert.equal(q.membership.permissions.payWallet,false);assert.equal(q.membership.revealed,false);
});
test('Régie UI : contre-opération liée, confirmations avant mutation et lecture seule après clôture',()=>{
 const html=ui.member(data,'c',{id:'e',fromGroupId:null,toGroupId:'g'});assert.match(html,/data-reverses="e"/);assert.match(html,/name="sourceGroupId" value="g"/);assert.match(html,/name="targetGroupId" value=""/);assert.doesNotMatch(html,/checked/);
 const p=ui.confirmation({character,source:{name:'A',member:{permissions:{payWallet:true}}},target:null,reason:'<motif>',clearsLeader:true});assert.match(p,/Droits retirés : Payer/);assert.match(p,/data-form="rosterApply"/);assert.match(p,/sera libéré/);assert.doesNotMatch(p,/<motif>/);
 const closed=ui.page({...data,closed:true,events:[{id:'e',action:'applyGroupMembership',characterId:'c',at:1}]});assert.doesNotMatch(closed,/data-action="roster(Edit|Archive|Member|Reverse)"/);assert.match(closed,/consultation uniquement/);
 assert.match(ui.archive({...group,roster:{...group.roster,archived:true}}),/ne réactive aucune/);
});
test('Régie UI : éditeur historique ne propose plus de changer les membres gérés',()=>{
 const html=createGroupsUi(helpers).editor(group,[{id:'c',public:{displayName:'Nom'}}],'session');assert.doesNotMatch(html,/data-members|addGroupMembers|removeGroupMember/);assert.match(html,/régie des groupes/);
});

test('Régie UI SO : seules permissions raccordées, décès et accès versionné',()=>{
 const so={...data,availablePermissions:['readBriefing','readMembers'],connected:true,characters:[{...character,dead:true}]},member=ui.member(so,'c');
 assert.match(member,/permission_readBriefing/);assert.match(member,/permission_readMembers/);assert.doesNotMatch(member,/permission_payWallet|permission_pilotShip|permission_withdrawStock/);assert.match(ui.page(so),/Décédé/);assert.match(ui.page({...so,connected:false,closed:true}),/ne sont pas raccordés/);
});

test('Groupes UI SO : régie versionnée, aucun bouton historique non raccordé',()=>{
 const ui=createGroupsUi(helpers),html=ui.adminPanel({...data,id:'s',spaceOutlaws:{groupsVersion:1}},'session');assert.match(html,/#\/group-admin\/s/);assert.doesNotMatch(html,/editGroup|groupModule/);assert.doesNotMatch(ui.adminPanel({...data,spaceOutlaws:{}},'session'),/href=/);
});

test('Régie UI M2 : proposition distincte des droits actifs et validation explicite',()=>{
 const membership={role:'Contact <privé>',revealed:true,visibleToMembers:true,publicAffiliation:false,permissions:{readBriefing:true,readMembers:true}},p={groupId:'g',groupName:'Cellule <M2>',characterId:'c',name:character.name,membership,active:true,born:true,configured:true,alreadyMember:false,canPrepare:true},d={...data,availablePermissions:['readBriefing','readMembers'],preparedMemberships:[p]};
 assert.match(ui.page(d),/Appartenances prévues dans M2/);assert.match(ui.page(d),/data-action="rosterPrepared"/);assert.doesNotMatch(ui.page({...d,preparedMemberships:[{...p,born:false,canPrepare:false}]}),/data-action="rosterPrepared"/);const h=ui.member(d,'c',null,p);assert.match(h,/Proposition M2/);assert.match(h,/name="permission_readBriefing" checked/);assert.doesNotMatch(h,/name="authorizePermissions" checked|<privé>|<M2>/);assert.match(h,/value="g" selected/);assert.doesNotMatch(ui.page({...d,closed:true}),/data-action="rosterPrepared"/);
});

test('Régie UI : souhaits privés échappés, recherche commune et aucun groupe déduit du texte',()=>{
 const r={name:character.name,wish:'PHARE <img src=x onerror=alert(1)>',characterId:'c',state:'CURRENT',outOfCombat:false,canManage:true},d={...data,friendRequests:[r]},h=ui.page(d,'phare');assert.match(h,/Souhaits privés d’amis/);assert.match(h,/Gérer l’appartenance/);assert.match(h,/data-action="rosterMember" data-id="c"/);assert.match(h,/PHARE &lt;img/);assert.doesNotMatch(h,/<img src=x/);assert.match(h,/data-action="rosterMember"/);assert.equal(rosterCharacterMatches(character,'phare','ASSIGNED',r.wish),true);assert.equal(rosterCharacterMatches(character,'phare','UNASSIGNED',r.wish),false);assert.doesNotMatch(ui.page({...d,friendRequests:[{...r,characterId:null,state:'UNBORN',canManage:false}]}),/Gérer l’appartenance/);assert.doesNotMatch(ui.page({...d,closed:true}),/Gérer l’appartenance/);
 const member=ui.member(d,'c');assert.doesNotMatch(member,/checked|PHARE/);assert.match(member,/value="" selected/);
});

test('Catalogue UI : filtres, liens réciproques et réserves sans formulaire de mandat',()=>{
 const rows=[{...character,id:'old',name:'Ari',rosterState:'REPLACED',canManageMembership:false,successor:{id:'new',name:'Dana'}},{...character,id:'new',name:'Dana',rosterState:'ACTIVE',canManageMembership:true,predecessor:{id:'old',name:'Ari'}},{...character,id:'reserve',name:'Réserve <img>',rosterState:'RESERVE',canManageMembership:false}];
 assert.equal(rosterCharacterMatches(rows[1],'Ari','ACTIVE'),true);assert.equal(rosterCharacterMatches(rows[2],'','RESERVE'),true);assert.equal(rosterCharacterMatches(rows[2],'','ACTIVE'),false);
 const d={...data,characters:rows};assert.match(ui.page(d,'','RESERVE'),/Réserve non incarnée/);assert.doesNotMatch(ui.page(d,'','RESERVE'),/data-action="rosterMember"|<img/);for(const id of ['old','reserve'])assert.doesNotMatch(ui.member(d,id),/data-form=|name="targetGroupId"/);assert.match(ui.member(d,'new'),/name="targetGroupId"/);
});
