import { useEffect, useState } from 'react';
import { appelApi } from '../lib/api';
import RaccourcisPeriode from '../lib/RaccourcisPeriode';
import { calculerRaccourci } from '../lib/periodes';

// Rapport « Collecte des coordonnées » (administrateur) : sur la période, part des ventes dont
// le client est identifié (nom + téléphone), par caissière, motifs de dérogation. Regarder ce
// pourcentage AVANT d'allumer la règle dit d'où l'on part. Le bouton du haut allume ou éteint la
// règle « coordonnées obligatoires » à la caisse.
export default function EtatCoordonnees() {
  const periodeInitiale = calculerRaccourci('mois');
  const [dateDebut, setDateDebut] = useState(periodeInitiale.debut);
  const [dateFin, setDateFin] = useState(periodeInitiale.fin);
  const [raccourciActif, setRaccourciActif] = useState('mois');
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [basculeEnCours, setBasculeEnCours] = useState(false);

  function charger() {
    setChargement(true);
    setErreur('');
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    appelApi('GET', `/etats/coordonnees?${params.toString()}`)
      .then(setDonnees)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => { charger(); }, [dateDebut, dateFin]);

  async function basculerRegle() {
    const activer = !donnees.regleActive;
    const message = activer
      ? "Activer la règle ?\n\nÀ chaque vente, la caisse exigera le nom et le téléphone du client. Si le client ne souhaite pas les donner, la caissière choisira un motif et la vente restera possible, mais elle sera comptée dans ce rapport."
      : 'Éteindre la règle ? La caisse ne demandera plus les coordonnées du client.';
    if (!window.confirm(message)) return;
    setBasculeEnCours(true);
    try {
      await appelApi('PUT', '/clients/regle-coordonnees', { obligatoire: activer });
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setBasculeEnCours(false);
    }
  }

  const f = (n) => Number(n).toLocaleString('fr-FR');

  return (
    <div>
      <div style={styles.carteRegle}>
        <div>
          <div style={{ fontWeight: 700 }}>
            Coordonnées obligatoires à la caisse :{' '}
            <span style={{ color: donnees?.regleActive ? '#1E6B36' : 'var(--error)' }}>
              {donnees ? (donnees.regleActive ? 'ACTIVE' : 'inactive') : '…'}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--brown-soft)' }}>
            Active : la caisse demande le nom et le téléphone du client. Vendre sans coordonnées reste possible avec un motif,
            et chaque cas est compté ci-dessous.
          </div>
        </div>
        {donnees && (
          <button onClick={basculerRegle} disabled={basculeEnCours} style={styles.boutonPrincipal}>
            {basculeEnCours ? '…' : donnees.regleActive ? 'Éteindre' : 'Activer'}
          </button>
        )}
      </div>

      <div style={styles.filtres}>
        <RaccourcisPeriode
          raccourciActif={raccourciActif}
          onChangerPeriode={(id, periode) => {
            setRaccourciActif(id);
            if (periode) { setDateDebut(periode.debut); setDateFin(periode.fin); }
          }}
        />
        <label style={styles.champLabel}>
          Du
          <input type="date" style={styles.champInput} value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setRaccourciActif('personnalise'); }} />
        </label>
        <label style={styles.champLabel}>
          Au
          <input type="date" style={styles.champInput} value={dateFin} onChange={(e) => { setDateFin(e.target.value); setRaccourciActif('personnalise'); }} />
        </label>
      </div>

      {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}
      {chargement && <p style={styles.muet}>Chargement…</p>}

      {!chargement && donnees && (
        <>
          <div style={styles.grille}>
            <div style={styles.carte}><div style={styles.libelle}>Ventes</div><div style={styles.valeur}>{f(donnees.total.ventes)}</div></div>
            <div style={styles.carte}><div style={styles.libelle}>Avec client identifié</div><div style={styles.valeur}>{f(donnees.total.identifiees)} <span style={styles.pct}>({donnees.total.pourcentageIdentifiees} %)</span></div></div>
            <div style={styles.carte}><div style={styles.libelle}>Sans client identifié</div><div style={styles.valeur}>{f(donnees.total.sansClient)}</div></div>
            <div style={styles.carte}><div style={styles.libelle}>Dérogations (motif noté)</div><div style={styles.valeur}>{f(donnees.total.derogations)}</div></div>
          </div>

          <h3 style={styles.titre}>Par caissière</h3>
          {donnees.parCaissiere.length === 0 && <p style={styles.muet}>Aucune vente sur la période.</p>}
          {donnees.parCaissiere.map((l) => (
            <div key={l.utilisateurId} style={styles.ligne}>
              <span style={{ fontWeight: 600 }}>{l.nom}</span>
              <span style={styles.muet}>
                {l.ventes} vente(s) — {l.identifiees} identifiée(s) — {l.sansClient} sans client ({f(l.montantSansClient)} F) — {l.derogations} dérogation(s)
              </span>
              <span style={{ fontWeight: 700, color: l.pourcentageIdentifiees >= 80 ? '#1E6B36' : l.pourcentageIdentifiees >= 50 ? '#8A4B00' : 'var(--error)' }}>
                {l.pourcentageIdentifiees} %
              </span>
            </div>
          ))}

          <h3 style={styles.titre}>Motifs des ventes sans coordonnées</h3>
          {donnees.parMotif.map((m) => (
            <div key={m.code} style={styles.ligne}><span>{m.libelle}</span><strong>{m.nombre}</strong></div>
          ))}

          {donnees.dernieresDerogations.length > 0 && (
            <>
              <h3 style={styles.titre}>Dernières ventes sans coordonnées</h3>
              {donnees.dernieresDerogations.map((d) => (
                <div key={d.numero} style={styles.ligne}>
                  <span>{d.numero} — {new Date(d.date).toLocaleDateString('fr-FR')} — {d.caissiere}</span>
                  <span style={styles.muet}>{d.motif}{d.detail ? ` (${d.detail})` : ''}</span>
                  <strong>{f(d.montant)} F</strong>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  carteRegle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'var(--cream)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, flexWrap: 'wrap' },
  boutonPrincipal: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  filtres: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 },
  champLabel: { display: 'flex', flexDirection: 'column', fontSize: 13, gap: 4 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 8 },
  carte: { background: 'var(--white)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--cream-deep)' },
  libelle: { fontSize: 12, color: 'var(--brown-soft)' },
  valeur: { fontSize: 22, fontWeight: 700 },
  pct: { fontSize: 13, fontWeight: 600, color: 'var(--brown-soft)' },
  titre: { fontSize: 15, margin: '18px 0 6px' },
  ligne: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--cream-deep)', fontSize: 13.5, flexWrap: 'wrap' },
  muet: { color: 'var(--brown-soft)', fontSize: 12.5 },
};
