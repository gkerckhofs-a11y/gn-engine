import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaFigure,mediaPickerButton} from '../web/media.mjs';
import {createAnnouncementUi} from '../web/announcements.mjs';
import {createContractUi} from '../web/contracts.mjs';
import {createInventoryUi} from '../web/inventory.mjs';
const button=(label,a,attrs='')=>`<button data-action="${a}" ${attrs}>${label}</button>`,link=(label,path)=>`<a href="#/${path}">${label}</a>`;
test('Médiathèque UI : contenu sans image lisible, contexte échappé, aucune URL de téléchargement',()=>{
  assert.match(mediaFigure(null,{}),/Sans image/);const html=mediaFigure({id:'secret',version:1},{mode:'player',scope:'session',scopeId:'s',kind:'character',id:'x\" onerror=evil'});assert.match(html,/&quot;/);assert.doesNotMatch(html,/https:|secret|onerror="evil/);assert.match(mediaPickerButton('session','s','character','c','private'),/type="button"/);
});
test('Médiathèque UI : objets, missions et contrats utilisent leurs droits de contenu',()=>{
  const inv=createInventoryUi({button,link}),a={id:'i',revision:1,kind:'STACKABLE',name:'Objet',unit:'unité',mediaImages:{illustration:{id:'image',version:1}}};
  const bag=inv.page({session:{id:'s'},preview:false,character:{id:'c',name:'Joueur'},lots:[{id:'lot',item:a,status:'AVAILABLE',quantity:1}],ownedElsewhere:[],heldForOthers:[],sales:[],transfers:[]});assert.match(bag,/inventory/);assert.match(bag,/player/);
  const ann=createAnnouncementUi({button,link}),html=ann.detail({session:{id:'s'},announcement:{id:'m',mediaImages:a.mediaImages,sponsor:{kind:'NPC',name:'Alias'},deadline:1000},canRespond:false});assert.match(html,/data-media-request/);assert.doesNotMatch(html,/briefing.*data-media-request/);
  const c=createContractUi({button,link}),page=c.detail({session:{id:'s'},admin:false,contract:{id:'c',revision:1,status:'PROPOSED',terms:{title:'Contrat',currency:{unit:'cr'},applicant:{kind:'PERSONAL',name:'Moi'},sponsor:{name:'Alias'}},mediaImages:a.mediaImages,briefing:null},history:[]});assert.match(page,/contract/);assert.match(page,/Le briefing réservé sera ouvert après acceptation/);
});
