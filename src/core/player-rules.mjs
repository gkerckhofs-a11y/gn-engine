// Only player-facing rules; never expose the session record or audit reasons.
export function playerRules(session){
 const ap=session.actionPointRules,h=session.healthRules,e=session.economyRules;
 return {
  actionPoints:ap?.enabled?{renewalMinutes:ap.renewalMinutes,cost:ap.cost,cooldownSeconds:ap.cooldownSeconds,patientCooldownSeconds:ap.patientCooldownSeconds,revision:session.actionPointRulesRevision??1}:null,
  health:h?.enabled?{returnMode:h.returnMode}:null,
  economy:e?.enabled?{name:e.name,unit:e.unit}:null
 };
}
