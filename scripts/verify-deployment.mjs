import {fieldCommands} from '../src/core/field-actions.mjs';
import {masterCommands} from '../src/core/masters.mjs';
import {campaignCommands} from '../src/core/campaigns.mjs';
import {actionPointCommands} from '../src/core/action-points.mjs';
import {archiveCommands} from '../src/core/scenario-archives.mjs';
import {mediaCommands} from '../src/core/media.mjs';
import {bountyCommands} from '../src/core/bounties.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {waitForPublishedPage,waitForPublishedVersion} from './deployment-checks.mjs';

const origin='https://gn-engine.web.app';
// Le premier raccordement Hosting -> Cloud Run peut répondre brièvement 404.
// Réessayer seulement les erreurs de disponibilité ; un accès privé accepté
// à tort (HTTP 200 au lieu de 401) reste immédiatement bloquant.
async function waitForAvailability(url,options={}) {
  for(let attempt=1;attempt<=12;attempt++) {
    let response;
    try {
      response=await fetch(url,{...options,signal:AbortSignal.timeout(10_000)});
    } catch(error) {
      if(attempt===12)throw error;
    }
    if(response && response.status!==404 && response.status<500)return response;
    if(attempt===12)return response;
    await response?.body?.cancel();
    console.log(`Propagation de la publication : tentative ${attempt}/12.`);
    await new Promise(resolve=>setTimeout(resolve,5_000));
  }
}
const expected=JSON.parse(await readFile(new URL('../package.json',import.meta.url))).version;
await waitForPublishedPage({origin,expected,onPending:({attempt,observed})=>console.log(`Page ${observed??'indisponible'} ; attente de ${expected}, tentative ${attempt}/12.`)});
await waitForPublishedVersion({origin,expected,onPending:({attempt,observed})=>console.log(`Manifeste ${observed??'indisponible'} ; attente de ${expected}, tentative ${attempt}/12.`)});
for(const name of ['Master_Campagne','Master_Session','Exemple_Campagne','Exemple_Session']){
  const filename=`GN_Engine_${name}.xlsx`,response=await waitForAvailability(`${origin}/masters/${filename}`);
  assert.equal(response.status,200,`Le fichier ${filename} doit être disponible`);
  assert.ok(Buffer.from(await response.arrayBuffer()).equals(await readFile(new URL(`../assets/masters/${filename}`,import.meta.url))),`Le fichier ${filename} doit correspondre à la version testée`);
}
console.log('Quatre masters XLSX publiés et identiques aux fichiers validés.');

for(const action of [...fieldCommands,...masterCommands,...campaignCommands,...actionPointCommands,...archiveCommands,...mediaCommands,...bountyCommands,'dashboard','myNotes','noteDetail','shareNote','prepareAbilityProfile','setAbilityProfile','abilityHistory','myHealth','prepareDamage','applyDamage','prepareTreatment','applyTreatment','correctHealth','healthHistory','myInventory','previewInventory','saveItem','saveSessionItem','prepareStartingInventory','setStartingInventory','prepareGrantItem','grantItem','correctLot','itemHistory','prepareLotTransfer','proposeLotTransfer','lotTransferDetail','acceptLotTransfer','declineLotTransfer','cancelLotTransfer','myWallet','previewWallet','preparePayment','payCredits','saveScenarioEconomy','saveSessionEconomy','prepareStartingCredits','setStartingCredits','prepareCreditAdjustment','applyCreditAdjustment','walletHistory','prepareGroupWallet','setGroupWallet','myAccounts','readAccount','previewAccount','prepareAccountPayment','payFromAccount','prepareLotSale','proposeLotSale','lotSaleDetail','prepareLotPurchase','buyLot','declineLotSale','cancelLotSale','offerSalePickup','confirmSalePickup','market','marketListing','prepareMarketListing','publishMarketListing','prepareMarketPurchase','buyMarketListing','withdrawMarketListing','sessionMarket','withdrawSessionListing','sessionAnnouncements','prepareAnnouncement','saveAnnouncement','announcementHistory','sessionApplications','sessionApplication','prepareApplicationReply','replyApplication','announcements','announcementDetail','myApplications','applicationDetail','prepareAnnouncementResponse','respondAnnouncement','withdrawApplication','markApplicationRead','sessionContracts','sessionContract','prepareMissionContract','proposeMissionContract','prepareContractReview','reviewContract','prepareContractClosure','closeContract','myContracts','contractDetail','prepareContractAcceptance','acceptContract','declineContract','prepareContractProof','submitContractProof','markContractRead']){
  const api=await waitForAvailability(`${origin}/api/check`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action,input:{sessionId:'verification',noteId:'verification',requestId:'verification'}}),
  });
  assert.equal(api.status,401,`La lecture/écriture privée anonyme ${action} doit être refusée`);
  assert.equal((await api.json()).error,'LOGIN_REQUIRED');
}
console.log(`Version ${expected} accessible et API privée refusant les accès anonymes.`);

