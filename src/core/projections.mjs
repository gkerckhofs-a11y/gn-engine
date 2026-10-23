import {naturePatch} from './character-nature.mjs';
import {mediaFields} from './media-state.mjs';
import {playerAbilities} from './abilities.mjs';
import { requireThat } from './validation.mjs';

// Une projection construit une liste blanche. Ne pas étendre ces résultats
// avec l'objet source : les notes MJ et allégeances ne sont pas envoyées.
export function publicCharacter(character) {
  const visible = character.public;
  requireThat(visible?.publicationState === 'PUBLISHED'
    && typeof visible.displayName === 'string', 'PUBLIC_IDENTITY_MISSING');
  return {
    ...mediaFields(character,['portrait']),
    id: character.id,
    displayName: visible.displayName,
    profession: visible.profession ?? '',
    description: visible.description ?? '',
    publicCode: character.publicCode,
  };
}
export function participantCharacter(character, assignment, uid) {
  requireThat(assignment?.active === true && assignment.uid === uid
    && assignment.characterId === character.id && assignment.sessionId === character.sessionId,
  'FORBIDDEN');
  requireThat(character.publicationState === 'PUBLISHED', 'CONTENT_UNPUBLISHED');
  return {
    ...publicCharacter(character),
    ...naturePatch(character),
    ...mediaFields(character,['portrait','private']),
    biography: character.biography ?? '',
    roleplay: character.roleplay ?? '',
    secrets: character.playerSecrets ?? '',
    contentRevision:character.contentRevision??1,
    relations:(character.relations??[]).filter(x=>x.published===true)
      .map(x=>({id:x.id,title:x.title,description:x.description??''})),
    objectives: (character.objectives ?? []).filter(x => x.published === true)
      .map(x => ({id: x.id, title: x.title, description: x.description ?? '',
        steps: (x.steps ?? []).filter(s => s.published === true)
          .map(s => ({id: s.id, title: s.title, description: s.description ?? ''}))})),
    abilities: playerAbilities(character.abilityProfile),
    hp: character.hp,
    maxHp: character.maxHp,
  };
}
