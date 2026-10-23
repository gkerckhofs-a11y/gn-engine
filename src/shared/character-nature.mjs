// A missing value belongs to a historical character/profile; it is never inferred.
export const characterNatures = {HUMANOID:'Humanoïde biologique',DROID:'Droïde'};
export const natureLabel = value => characterNatures[value] ?? 'Non renseignée (historique)';
export const acceptsPatientNature = (profile, character) => profile.patientNature == null || profile.patientNature === character.nature;
