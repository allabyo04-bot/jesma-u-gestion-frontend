import { RACCOURCIS_PERIODE, calculerRaccourci } from './periodes';

// Ligne de boutons de raccourci (Hier, Aujourd'hui, Mois en cours, Trimestre,
// Mois précédent, Année en cours) au-dessus des deux champs de date manuels.
// `raccourciActif` vaut 'personnalise' dès que l'utilisateur touche un champ
// de date à la main, pour qu'aucun bouton ne reste surligné à tort.
export default function RaccourcisPeriode({ raccourciActif, onChangerPeriode }) {
  function choisir(id) {
    const periode = calculerRaccourci(id);
    onChangerPeriode(id, periode);
  }

  return (
    <div style={styles.ligne}>
      {RACCOURCIS_PERIODE.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => choisir(r.id)}
          style={r.id === raccourciActif ? styles.actif : styles.inactif}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  ligne: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  actif: { padding: '6px 14px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  inactif: { padding: '6px 14px', borderRadius: 20, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
};
