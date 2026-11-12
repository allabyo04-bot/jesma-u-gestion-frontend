// Convertit un numéro ivoirien local (ex: 0708735901) au format international
// pour wa.me. En Côte d'Ivoire, le zéro de tête fait partie du numéro et doit
// être CONSERVÉ (225 0708735901, jamais 225708735901 qui est invalide).
// Tolérant sur la saisie : espaces/tirets ignorés, "+225" ou "225" déjà présent
// accepté (retiré puis reconstruit), pour ne pas dépendre d'un format unique
// de saisie du numéro client.
export function numeroWhatsApp(telephone) {
  if (!telephone) return null;
  let chiffres = telephone.replace(/\D/g, '');
  if (chiffres.length === 13 && chiffres.startsWith('225')) {
    chiffres = chiffres.slice(3);
  } else if (chiffres.length === 12 && chiffres.startsWith('225')) {
    chiffres = chiffres.slice(2); // cas rare : 225 suivi d'un numero a 9 chiffres (0 deja retire)
  }
  if (chiffres.length !== 10) return null;
  return `225${chiffres}`;
}

// Message de remerciement WhatsApp : le même après une vente et dans « Clients à remercier ».
export function construireMessageWhatsAppVente() {
  return [
    "Merci d'être passé(e) chez JESMA U !",
    'C\'était un plaisir de vous accueillir.',
    'Au plaisir de vous revoir très bientôt en boutique !',
    '',
    "_JESMA U — L'art d'accueillir la vie et de l'entretenir._",
  ].join('\n');
}
