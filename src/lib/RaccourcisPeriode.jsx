import { RACCOURCIS_PERIODE, calculerRaccourci } from './periodes';

// Menu déroulant compact de raccourci (Hier, Aujourd'hui, Mois en cours,
// Trimestre, Mois précédent, Année en cours), à placer à côté des deux champs
// de date manuels. `raccourciActif` vaut 'personnalise' dès que l'utilisateur
// touche un champ de date à la main, pour que le menu revienne alors sur
// "Période rapide…" plutôt que de garder un choix qui ne correspond plus.
export default function RaccourcisPeriode({ raccourciActif, onChangerPeriode }) {
  function choisir(id) {
    if (!id) return;
    const periode = calculerRaccourci(id);
    onChangerPeriode(id, periode);
  }

  const valeurAffichee = RACCOURCIS_PERIODE.some((r) => r.id === raccourciActif) ? raccourciActif : '';

  return (
    <select value={valeurAffichee} onChange={(e) => choisir(e.target.value)} style={styles.select}>
      <option value="">Période rapide…</option>
      {RACCOURCIS_PERIODE.map((r) => (
        <option key={r.id} value={r.id}>{r.label}</option>
      ))}
    </select>
  );
}

const styles = {
  select: {
    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)',
    fontSize: 13, background: 'var(--white)', cursor: 'pointer',
  },
};
