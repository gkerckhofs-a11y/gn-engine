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

test('Confidentialité UI : aucune réponse privée tardive ne rouvre une image après déconnexion',async()=>{
  const {createMediaController}=await import('../web/media.mjs');
  const saved=Object.fromEntries(['document','window','MutationObserver','IntersectionObserver'].map(k=>[k,globalThis[k]]));
  try{
    for(const action of ['enlarge','original','picker','removal','batch']){
      const handlers={},dialogs=[];let resolve;
      globalThis.window={addEventListener(){}};globalThis.MutationObserver=class{observe(){}};globalThis.IntersectionObserver=class{observe(){}unobserve(){}};
      globalThis.document={body:{append:d=>dialogs.push(d)},querySelectorAll:()=>[],addEventListener:(n,f)=>handlers[n]=f,createElement:()=>({open:false,innerHTML:'',showModal(){this.open=true;},close(){this.open=false;}})};
      const ui=createMediaController({api:()=>new Promise(r=>resolve=r),mutate:async()=>{},auth:{},notice:()=>{}}),b={disabled:false,dataset:{mediaAction:action,id:'image',request:JSON.stringify({context:{mode:'player'}}),target:JSON.stringify({scope:'session',scopeId:'s',kind:'character',id:'c',slot:'private'})},closest:()=>null};
      const pending=handlers.click({target:{closest:()=>b},preventDefault(){}});ui.clear();resolve({mime:'image/png',data:'SECRET_PRIVATE_BYTES',images:[],rows:[],scenarios:[],sessions:[]});await pending;assert.equal(dialogs.length,0,action);
    }
  }finally{for(const [k,v] of Object.entries(saved))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});

test('Éditeur ouvert : attribuer une image ne masque pas une modification de texte concurrente',async()=>{
  const {mediaEditorSnapshot}=await import('../web/media.mjs'),opened={id:'session',revision:4,characters:[{id:'c',biography:'Texte au moment de l’ouverture'}]},onlyImage={...opened,revision:5},concurrent={...opened,revision:6,characters:[{id:'c',biography:'Nouvelle biographie d’un autre MJ'}]};
  assert.equal(mediaEditorSnapshot(opened,onlyImage),onlyImage,'Notre seule attribution peut avancer la révision');
  assert.equal(mediaEditorSnapshot(opened,concurrent),opened,'Le formulaire garde la révision périmée ; le serveur refusera de remplacer la nouvelle biographie');
  assert.equal(mediaEditorSnapshot(opened,{...onlyImage,id:'autre-session'}),opened);
});
