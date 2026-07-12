// Canal de synchronisation entre l'écran vendeur et l'écran client (double écran caisse).
// Utilise BroadcastChannel : communication native entre fenêtres/onglets du même navigateur,
// sur la même origine — aucune connexion réseau ni backend nécessaire.
const NOM_CANAL = 'jesma-caisse';

let canal = null;

function obtenirCanal() {
  if (!canal) {
    canal = new BroadcastChannel(NOM_CANAL);
  }
  return canal;
}

// Depuis l'écran vendeur : pousse l'état courant du panier vers l'écran client.
export function diffuserEtatPanier(etat) {
  obtenirCanal().postMessage({ type: 'ETAT_PANIER', payload: etat });
}

// Depuis l'écran vendeur : signale qu'une vente vient d'être validée (affichage de remerciement).
export function diffuserVenteValidee(vente) {
  obtenirCanal().postMessage({ type: 'VENTE_VALIDEE', payload: vente });
}

// Depuis l'écran client, à l'ouverture : demande l'état actuel, car BroadcastChannel ne
// transmet que les messages envoyés APRÈS que l'écoute a démarré (rien de "rejouable").
export function demanderEtatActuel() {
  obtenirCanal().postMessage({ type: 'DEMANDE_ETAT' });
}

// Écoute tous les messages du canal. Retourne une fonction de nettoyage.
export function ecouterCanal(gestionnaire) {
  const c = obtenirCanal();
  const handler = (event) => gestionnaire(event.data);
  c.addEventListener('message', handler);
  return () => c.removeEventListener('message', handler);
}
