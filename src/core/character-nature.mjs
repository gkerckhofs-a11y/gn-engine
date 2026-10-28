import {characterNatures,acceptsPatientNature} from '../shared/character-nature.mjs';
import {requireThat} from './validation.mjs';

export function natureInput(value) {
  requireThat(value === null || (typeof value === 'string' && Object.hasOwn(characterNatures,value)),'INVALID_CHARACTER_NATURE');
  return value;
}
export function naturePatch(input, previous = {}, field = 'nature') {
  const value = input[field] === undefined ? previous?.[field] : input[field];
  return value === undefined ? {} : {[field]:natureInput(value)};
}
export function preserveSessionNature(input, character) {
  if(input.nature !== undefined) requireThat(natureInput(input.nature) === (character.nature ?? null),'CHARACTER_NATURE_LOCKED');
}
export function requirePatientNature(profile, character) {
  requireThat(acceptsPatientNature(profile,character),'PATIENT_NATURE_MISMATCH');
}
