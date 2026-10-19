import {createHash} from 'node:crypto';
import {requireThat} from './validation.mjs';

export const staffPath = (sessionId,email) => `sessionStaff/${createHash('sha256').update(`${sessionId}:${email.toLowerCase()}`).digest('hex')}`;
export const capabilities = role => ({
  reception:['OWNER','MJ','RECEPTION'].includes(role),
  content:['OWNER','MJ'].includes(role),
  rhythm:['OWNER','MJ'].includes(role),
  staff:role==='OWNER',
});
export const sessionCommands = {
  saveSessionCharacter:'content',setStage:'rhythm',setRegistrationOpen:'reception',
  setRegistrationStatus:'reception',assign:'reception',issueInvitation:'reception',
  revokeAccess:'reception',setStaff:'staff',
  saveSessionGroup:'content',setGroupModule:'content',
};
export function staffEmail(value) {
  requireThat(typeof value==='string' && value.length<=254,'INVALID_EMAIL');
  const email=value.trim().toLowerCase();
  requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'INVALID_EMAIL');
  return email;
}
// Reception receives an explicit list of permitted fields, never character content.
export const receptionCharacter = c => ({id:c.id,assignedUid:c.assignedUid,
  publicationState:c.publicationState,contentRevision:c.contentRevision??1,
  public:{displayName:c.public.displayName,profession:c.public.profession??''}});
