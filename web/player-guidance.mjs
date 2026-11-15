import {escapeHtml as esc} from './groups.mjs';
// First-use help only. It describes existing journeys and grants no command.
export const playerGuidance={
 identity:'Retrouvez ici l’histoire, les objectifs et les secrets de votre personnage. Ouvrez Action pour agir, ou votre Sac pour consulter vos objets.',
 skills:'Consultez ce que permet chaque compétence. Ouvrez ses conditions avant de l’utiliser ; les règles complètes restent accessibles dans le volet détaillé.',
 bag:'Consultez vos objets et les remises en attente. Un don doit être accepté ; un achat payé doit encore être retiré avant de rejoindre votre sac.',
 wallet:'Vérifiez vos crédits disponibles avant de payer. Les sommes déjà engagées et les crédits réservés à certains usages ne sont pas toujours dépensables librement.',
 health:'Déclarez les dégâts réellement reçus, à l’abri. Lisez le récapitulatif avant de confirmer ; ce formulaire ne sert pas à soigner votre personnage.',
 protection:'Déclarez une protection perdue après une touche. Pour la restaurer, utilisez une intervention compatible plutôt que de modifier la valeur à la hausse.',
 infos:'Ouvrez les informations reçues par votre personnage. Certaines peuvent être montrées ou copiées ; seuls les partages autorisés sont proposés.',
 notes:'Rédigez vos notes personnelles. Vérifiez le destinataire et le mode de partage avant de transmettre un texte.',
 groups:'Ouvrez un groupe pour consulter les informations qui vous sont accessibles. Les responsabilités et les accès peuvent différer entre les membres.',
 group:'Consultez les informations partagées et vos responsabilités dans ce groupe. Les commandes proposées dépendent de vos autorisations.',
 action:'Choisissez l’action voulue, puis identifiez le lieu, le personnage ou l’objet concerné. Vérifiez les conditions et le coût affichés avant de commencer.',
 terminal:'Choisissez un vaisseau ou un service accessible. Pour une opération en cours, ouvrez son suivi avant d’en commencer une autre.',
 shops:'Choisissez une offre et une quantité, puis vérifiez le prix. Après paiement, le retrait des objets auprès du comptoir doit encore être confirmé.',
 market:'Consultez les offres et votre stock commercial. L’achat, le paiement et le déplacement des marchandises restent des étapes distinctes.',
 contracts:'Ouvrez un contrat pour relire vos engagements, les preuves demandées et la récompense prévue. Vérifiez les conséquences avant d’accepter ou de contester.',
 missions:'Consultez les propositions qui vous sont accessibles. Répondre à une annonce ne garantit pas qu’une mission vous sera attribuée.',
 intelligence:'Choisissez une offre pour vérifier son prix et ses conditions avant d’acheter le renseignement. Son titre ne révèle pas le contenu privé.',
 bounties:'Ouvrez une prime accessible pour consulter ses conditions et la preuve attendue. La récompense dépend de la validation prévue pour cette prime.',
 customs:'Choisissez le contrôle autorisé pour votre rôle. Vérifiez le dossier et ses conséquences avant toute saisie, retenue ou restitution.',
 cargo:'Ouvrez une cargaison pour préparer son déplacement. Attendez la durée indiquée puis confirmez sa réception ; son propriétaire reste le même.',
 ship:'Ouvrez une rubrique du vaisseau pour préparer ou suivre une opération. Votre poste ne remplace ni les compétences ni les accords nécessaires.',
 'space-maintenance':'Ouvrez l’intervention proposée pour vérifier le travail, le matériel, le coût et la durée. L’accord, le démarrage et la fin des travaux sont des étapes séparées.',
 'module-mandates':'Consultez l’accord du propriétaire avant de commencer un montage ou un retrait. Les points d’action et le matériel sont engagés au démarrage du travail.',
 flight:'Vérifiez le vaisseau et les conditions du départ. Une préparation de vol ne remplace ni le carburant nécessaire ni l’accord du pilote.',
 'space-combats':'Ouvrez la rencontre pour consulter les commandes disponibles. Vérifiez la manœuvre et son coût avant de donner un ordre.',
 'space-rescues':'Ouvrez la proposition d’assistance pour vérifier le carburant, le prix et la durée. Une proposition seule ne termine pas le dépannage.',
 learning:'Consultez les apprentissages proposés et leurs prérequis. Vérifiez le coût et les conséquences avant de confirmer une nouvelle compétence.'
};
const aliases={play:'identity',character:'identity',knowledge:'infos',note:'notes',actions:'action',interactions:'action',shop:'shops',contract:'contracts',mission:'missions',application:'missions',bounty:'bounties',hold:'cargo','cargo-transfer':'cargo','cargo-port':'cargo',account:'wallet',accounts:'wallet','space-combat':'space-combats'};
export function playerGuidanceHtml(route){const text=playerGuidance[aliases[route?.page]??route?.page];return text?`<aside class="hrp player-help" aria-label="Conseil pratique"><p>${esc(text)}</p></aside>`:'';}
export const gameTermsHtml=()=>'<p class="hrp game-terms"><abbr title="Points d’action">PA</abbr> : points d’action · <abbr title="Points de vie">PV</abbr> : points de vie · Cr : crédits · QR : code à scanner.</p>';
