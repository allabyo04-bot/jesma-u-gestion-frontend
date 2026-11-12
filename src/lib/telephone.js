// Téléphone ivoirien : mêmes règles que le serveur (src/lib/coordonnees.js côté backend).
// 10 chiffres commençant par 0 ou 2 ; +225, 00225 et 225, espaces, points, tirets et
// parenthèses acceptés et retirés ; un numéro d'un seul chiffre répété est refusé.
// Renvoie les 10 chiffres, ou null si le numéro n'est pas valide.
export function normaliserTelephone(brut) {
  if (brut === null || brut === undefined) return null;
  let t = String(brut).replace(/[\s.\-()]/g, '');
  if (t.startsWith('+225')) t = t.slice(4);
  else if (t.startsWith('00225')) t = t.slice(5);
  else if (t.length === 13 && t.startsWith('225')) t = t.slice(3);
  return /^[02]\d{9}$/.test(t) && !/^(\d)\1{9}$/.test(t) ? t : null;
}

// Lien WhatsApp (wa.me) vers un numéro ivoirien, ou null si le numéro n'est pas valide.
export function lienWhatsApp(brut) {
  const tel = normaliserTelephone(brut);
  return tel ? `https://wa.me/225${tel}` : null;
}
