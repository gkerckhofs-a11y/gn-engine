import { requireThat, whole } from './validation.mjs';

// Les dates viennent du serveur appelant, jamais de la déclaration du joueur.
export function createClock() { return {elapsedMs: 0, runningSince: null}; }
export function gameTime(clock, wallNow) {
  whole(wallNow); whole(clock.elapsedMs);
  if (clock.runningSince === null) return clock.elapsedMs;
  whole(clock.runningSince);
  requireThat(wallNow >= clock.runningSince, 'CLOCK_MOVED_BACKWARDS');
  return whole(clock.elapsedMs + wallNow - clock.runningSince, 'CLOCK_OVERFLOW');
}
export function resumeClock(clock, wallNow) {
  gameTime(clock, wallNow);
  requireThat(clock.runningSince === null, 'CLOCK_ALREADY_RUNNING');
  return {...clock, runningSince: wallNow};
}
export function pauseClock(clock, wallNow) {
  requireThat(clock.runningSince !== null, 'CLOCK_ALREADY_PAUSED');
  return {elapsedMs: gameTime(clock, wallNow), runningSince: null};
}
export function invitationIsValid(invitation, wallNow) {
  whole(wallNow); whole(invitation.expiresAt);
  return invitation.status === 'ACTIVE' && wallNow < invitation.expiresAt;
}
