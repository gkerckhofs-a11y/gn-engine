import {requireThat} from './validation.mjs';

export const isTechnicalAnalysis=t=>t?.kind==='ANALYSIS'&&t.profiles?.ANALYZE?.skillId==='MEC-01';
export const requireTechnicalAnalysis=s=>requireThat(s?.spaceOutlaws?.technicalAnalysisVersion===1&&s.spaceOutlaws.actionsVersion===1,'SO_GAMEPLAY_NOT_OPEN');
