import {requireThat} from './validation.mjs';
// Uses the native M6 action, knowledge receipts, cooldowns and transactions.
export function requireMerchantAnalysis(session,target){
 if(session.spaceOutlaws&&target?.profiles?.ANALYZE?.skillId==='COU-03')requireThat(session.spaceOutlaws.merchantContactsVersion===1&&session.spaceOutlaws.actionsVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 if(session.spaceOutlaws&&target?.profiles?.ANALYZE?.skillId==='COU-01')requireThat(session.spaceOutlaws.merchantAnalysisVersion===1&&session.spaceOutlaws.actionsVersion===1,'SO_GAMEPLAY_NOT_OPEN');
}
export function merchantProfile(target,profile,level){
 if(profile.skillId!=='COU-01'||target.rewards.some(r=>r.bonus&&r.minLevel<=level))return profile;
 return {...profile,test:'AUTO',threshold:0,bonusItems:[]};
}

export const contactQuota=level=>level>=5?4:level>=3?3:2;
export const contactUsage=(session,use)=>use?.sessionId===session.id&&use.episode===(session.campaignEpisode??1)?use.contactUses??0:0;
