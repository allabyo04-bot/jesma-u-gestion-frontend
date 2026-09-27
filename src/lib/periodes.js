// Raccourcis de période réutilisables sur tous les écrans avec un filtre de
// date (Dépenses, États, Historique des mouvements...). Toujours utilisés en
// complément d'une sélection manuelle libre (Du / Au), jamais à sa place.

// Formate en AAAA-MM-JJ à partir des composants LOCAUX de la date, jamais via
// toISOString() (qui convertit en UTC et peut faire reculer d'un jour dans
// les fuseaux horaires en avance sur UTC, ex. UTC+1 comme la Côte d'Ivoire
// voisine ou le Bénin — minuit local devient 23h la veille en UTC).
export function formatDatePeriode(d) {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export const RACCOURCIS_PERIODE = [
  { id: 'hier', label: 'Hier' },
  { id: 'aujourdhui', label: "Aujourd'hui" },
  { id: 'mois', label: 'Mois en cours' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'mois_precedent', label: 'Mois précédent' },
  { id: 'annee', label: 'Année en cours' },
];

// Renvoie { debut, fin } (chaînes AAAA-MM-JJ) pour l'identifiant de raccourci
// donné, ou null si l'identifiant est inconnu (ex: 'personnalise').
export function calculerRaccourci(id) {
  const auj = new Date();

  if (id === 'hier') {
    const d = new Date(auj);
    d.setDate(d.getDate() - 1);
    return { debut: formatDatePeriode(d), fin: formatDatePeriode(d) };
  }
  if (id === 'aujourdhui') {
    return { debut: formatDatePeriode(auj), fin: formatDatePeriode(auj) };
  }
  if (id === 'mois') {
    const debut = new Date(auj.getFullYear(), auj.getMonth(), 1);
    return { debut: formatDatePeriode(debut), fin: formatDatePeriode(auj) };
  }
  if (id === 'trimestre') {
    const moisDebut = Math.floor(auj.getMonth() / 3) * 3;
    const debut = new Date(auj.getFullYear(), moisDebut, 1);
    return { debut: formatDatePeriode(debut), fin: formatDatePeriode(auj) };
  }
  if (id === 'mois_precedent') {
    const debut = new Date(auj.getFullYear(), auj.getMonth() - 1, 1);
    const fin = new Date(auj.getFullYear(), auj.getMonth(), 0);
    return { debut: formatDatePeriode(debut), fin: formatDatePeriode(fin) };
  }
  if (id === 'annee') {
    const debut = new Date(auj.getFullYear(), 0, 1);
    return { debut: formatDatePeriode(debut), fin: formatDatePeriode(auj) };
  }
  return null;
}
