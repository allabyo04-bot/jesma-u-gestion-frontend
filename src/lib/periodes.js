// Raccourcis de période réutilisables sur tous les écrans avec un filtre de
// date (Dépenses, États, Historique des mouvements...). Toujours utilisés en
// complément d'une sélection manuelle libre (Du / Au), jamais à sa place.

export function formatDatePeriode(d) {
  return d.toISOString().slice(0, 10);
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
