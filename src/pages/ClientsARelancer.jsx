import { useEffect, useState } from 'react';
import { appelApi } from '../lib/api';
import { lienWhatsApp } from '../lib/telephone';

// « Clients à relancer » (administrateur) : clients qui ont déjà acheté, ont un téléphone, et n'ont
// rien acheté depuis N mois (délai réglable, 3 mois au départ). On les contacte puis on coche
// « Message envoyé » pour ne pas les relancer deux fois. Un client qui rachète sort de la liste.
export default function ClientsARelancer() {
  const [mois, setMois] = useState(() => Number(localStorage.getItem('archange_relance_mois')) || 3);
  const [masquerRelances, setMasquerRelances] = useState(false);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  function charger() {
    setChargement(true);
    setErreur('');
    appelApi('GET', `/clients/a-relancer?mois=${mois}`)
      .then(setDonnees)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    localStorage.setItem('archange_relance_mois', String(mois));
    charger();
  }, [mois]);

  async function basculerRelance(client) {
    try {
      await appelApi('POST', `/clients/${client.id}/relance`, { fait: !client.dejaRelance });
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const liste = (donnees?.clients || []).filter((c) => !(masquerRelances && c.dejaRelance));
  const f = (n) => Number(n).toLocaleString('fr-FR');

  return (
    <div>
      <div style={styles.barre}>
        <label style={styles.champLabel}>
          Sans achat depuis plus de
          <select style={styles.champInput} value={mois} onChange={(e) => setMois(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 9, 12, 18, 24].map((n) => <option key={n} value={n}>{n} mois</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={masquerRelances} onChange={(e) => setMasquerRelances(e.target.checked)} />
          Masquer ceux déjà relancés
        </label>
        {donnees && (
          <span style={styles.muet}>{liste.length} client(s) à contacter sur {donnees.total}</span>
        )}
      </div>

      {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}
      {chargement && <p style={styles.muet}>Chargement…</p>}
      {!chargement && donnees && liste.length === 0 && (
        <p style={styles.muet}>Aucun client à relancer avec ces réglages.</p>
      )}

      {liste.map((c) => {
        const wa = lienWhatsApp(c.telephone);
        return (
          <div key={c.id} style={styles.carte}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700 }}>{c.nomComplet}</div>
              <div style={styles.muet}>
                {c.telephone}
                {wa && (
                  <>
                    {' — '}
                    <a href={wa} target="_blank" rel="noopener noreferrer" style={{ color: '#1E6B36', fontWeight: 600 }}>WhatsApp</a>
                  </>
                )}
              </div>
              <div style={styles.muet}>
                {c.nbAchats} achat(s) — {f(c.totalDepense)} F au total — dernier achat le {new Date(c.dernierAchat).toLocaleDateString('fr-FR')} (il y a {c.joursDepuisDernierAchat} jours)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {c.dejaRelance ? (
                <>
                  <div style={styles.badgeOk}>Message envoyé le {new Date(c.derniereRelanceLe).toLocaleDateString('fr-FR')}</div>
                  <button onClick={() => basculerRelance(c)} style={styles.lien}>Annuler</button>
                </>
              ) : (
                <button onClick={() => basculerRelance(c)} style={styles.bouton}>Message envoyé</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  barre: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 },
  champLabel: { display: 'flex', flexDirection: 'column', fontSize: 13, gap: 4 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  muet: { color: 'var(--brown-soft)', fontSize: 12.5 },
  carte: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: 'var(--white)', border: '1px solid var(--cream-deep)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 },
  bouton: { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  lien: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  badgeOk: { fontSize: 12, fontWeight: 700, color: '#1E6B36', background: '#E3F3E8', padding: '3px 9px', borderRadius: 20, marginBottom: 2 },
};
