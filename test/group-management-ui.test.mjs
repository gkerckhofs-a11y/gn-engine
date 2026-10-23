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
