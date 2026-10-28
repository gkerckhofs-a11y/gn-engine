import {requireThat} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {gameTime} from './clock.mjs';
import {admissionKeys} from './admission-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {soMissionAccess,soMissionRunning,soMissionFunding} from './space-outlaws-mission-state.mjs';

export const hasSoBounties=s=>s.spaceOutlaws?.bountyVersion===1&&s.spaceOutlaws.missionsVersion===1&&s.spaceOutlaws.appealFinanceVersion===1;
export const bountyAllocated=b=>b.terms.spaceOutlaws?b.awardedCount:b.paidCount;
export function soBountyAccess(tx,s,action,input){
 if(!s.spaceOutlaws)return;
 requireThat(hasSoBounties(s),'SO_GAMEPLAY_NOT_OPEN');soMissionAccess(tx,s);authorizeSpaceOutlaws(tx,s,'BOUNTIES');
 const reads=['sessionBounties','sessionBounty','bounties','bountyDetail'];
 if(reads.includes(action))return;
 requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
 if(action.endsWith('Closure')||action==='closeBounty')requireThat(['EN_JEU','PAUSE','FINISHED'].includes(s.stage),'SESSION_NOT_RUNNING');else soMissionRunning(s);
 const setup=['prepareBounty','openBounty'].includes(action),proof=['prepareBountyClaim','submitBountyClaim'].includes(action),review=['prepareBountyReview','reviewBounty'].includes(action);
 admissionKeys(input,['sessionId',...(setup?['announcementId','amount','funding','sourceAccountId','reason']:['bountyId',...(proof?['body','consent']:review?['claimId','decision','reason']:['reason'])]),...(!action.startsWith('prepare')?['requestId','confirmation']:[])]);
 if(proof)requireThat(input.consent===true,'SO_BOUNTY_CONSENT_REQUIRED');
}
export function soBountyMetadata(s,a){
 if(!s.spaceOutlaws)return {};
 return {awardedCount:0,missionId:a.missionId,missionVersionId:a.missionVersionId,giverCharacterId:a.giverCharacterId};
}
export function soBountyAudience(s,a){return s.spaceOutlaws?{missionVersionId:a.missionVersionId,requiredKnowledgeIds:a.requiredKnowledgeIds??[]}:{};}
export async function soBountySource(tx,s,a,source){
 if(!s.spaceOutlaws)return null;
 requireThat(hasSoBounties(s)&&a.missionVersionId===s.spaceOutlaws.versionId&&a.participation==='PERSONAL'&&a.mode==='OPEN_BOUNTY'&&!(a.rewardItems?.length),'SO_BOUNTY_UNSUPPORTED');
 return soMissionFunding(tx,s,a,source);
}
export async function awardSoBounty(tx,s,b,c,actor,at,eventId,reason){
 // The amount already belongs to the bounty's funded reserve. Assigning one
 // quota transfers responsibility to this native contract, without reserving
 // or paying it a second time. Only the contract service settles the award.
 const id=hash(`so-bounty:${b.id}:${c.id}`),path=`sessions/${s.id}/contracts/${id}`;
 requireThat(!await tx.get(path),'BOUNTY_CLAIM_EXISTS');
 const terms={spaceOutlaws:true,openBounty:true,title:b.terms.title,description:b.terms.description,sponsor:b.terms.sponsor,applicant:c.participant,announcementReward:`${b.terms.amount} ${b.terms.currency.unit}`,amount:b.terms.amount,currency:b.terms.currency,funding:'ACCOUNT',durationMinutes:null,conditions:b.terms.conditions,proofExpected:b.terms.proofExpected,confidentiality:'Preuve et règlement réservés au titulaire et aux MJ.',failureTerms:'La récompense attribuée suit la contestation, la médiation et les recours du contrat.',validator:'MJ',advance:0,guarantee:0};
 const termsHash=hash(JSON.stringify(terms)),g=gameTime(s.clock,at);
 const contract={id,revision:1,status:'REVIEWED',bountyId:b.id,bountyClaimId:c.id,announcementId:b.id,announcementRevision:b.announcementRevision,applicationId:null,participant:c.participant,characterId:c.characterId,applicantUid:c.applicantUid,applicantVersion:c.applicantVersion,terms,termsHash,acceptedTermsHash:termsHash,briefing:'',missionId:b.missionId,missionVersionId:b.missionVersionId,giverCharacterId:b.giverCharacterId,missionSteps:[],sourceAccountId:b.sourceAccountId,sourceGuard:null,sourceName:b.sourceName,reason,approvedBy:{uid:actor.uid,email:actor.email,emailVerified:true,provider:actor.provider},createdAt:at,updatedAt:at,lastReadRevision:0,acceptedAt:c.submittedAt,acceptedGameMs:c.submittedGameMs,acceptedBy:c.applicantUid,deadlineGameMs:null,proof:{body:c.body,at:c.submittedAt,gameMs:c.submittedGameMs},contestUntilGameMs:g+600000,paidAmount:0,disputedAmount:0};
 tx.set(path,contract);tx.set(`${path}/history/${eventId}`,{id:eventId,action:'awardOpenBounty',at,actorUid:actor.uid,publicReason:reason,decision:'PAY',body:c.body,amount:b.terms.amount,bountyId:b.id,claimId:c.id});
 return {contractId:id,awardedAt:at};
}
