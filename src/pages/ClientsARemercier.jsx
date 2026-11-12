import { useEffect, useState } from 'react';
import { appelApi } from '../lib/api';
import RaccourcisPeriode from '../lib/RaccourcisPeriode';
import { calculerRaccourci } from '../lib/periodes';
import { numeroWhatsApp, construireMessageWhatsAppVente } from '../lib/whatsapp';

// « Clients à remercier » (administrateur) : clients qui ont acheté pendant la période et qui n'ont
// aucun solde dû. Un client avec un seul achat depuis toujours est un NOUVEAU client. Le lien
// WhatsApp ouvre le message de remerciement habituel ; on coche « Message envoyé » ensuite pour ne
// pas remercier deux fois la même personne.
export default function ClientsARemercier() {
  const periodeInitiale = calculerRaccourci('semaine');
  const [dateDebut, setDateDebut] = useState(periodeInitiale.debut);
  const [dateFin, setDateFin] = useState(periodeInitiale.fin);
  const [raccourciActif, setRaccourciActif] = useState('semaine');
  const [masquerRemercies, setMasquerRemercies] = useState(false);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  function charger() {
    setChargement(true);
    setErreur('');
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    appelApi('GET', `/clients/a-remercier?${params.toString()}`)
      .then(setDonnees)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }
  useEffect(() => { charger(); }, [dateDebut, dateFin]);

  async function basculer(client) {
    try {
      await appelApi('POST', `/clients/${client.id}/remerciement`, { fait: !client.dejaRemercie });
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const liste = (donnees?.clients || []).filter((c) => !(masquerRemercies && c.dejaRemercie));
  const f = (n) => Number(n).toLocaleString('fr-FR');
  const nouveaux = liste.filter((c) => c.nouveau).length;

  return (
    <div>
      <div style={styles.barre}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={masquerRemercies} onChange={(e) => setMasquerRemercies(e.target.checked)} />
          Masquer ceux déjà remerciés
        </label>
      </div>
      {donnees && <p style={styles.muet}>{liste.length} client(s) à remercier, dont {nouveaux} nouveau(x) — sans solde dû.</p>}

      {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}
      {chargement && <p style={styles.muet}>Chargement…</p>}
      {!chargement && donnees && liste.length === 0 && <p style={styles.muet}>Aucun client à remercier sur cette période.</p>}

      {liste.map((c) => {
        const numero = numeroWhatsApp(c.telephone);
        return (
          <div key={c.id} style={styles.carte}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700 }}>
                {c.nomComplet}
                {c.nouveau
                  ? <span style={styles.badgeNouveau}>Nouveau client</span>
                  : <span style={styles.badgeHabitue}>{c.nbAchatsTotal} achats</span>}
              </div>
              <div style={styles.muet}>
                {c.telephone}
                {numero && (
                  <>
                    {' — '}
                    <a
                      href={`https://wa.me/${numero}?text=${encodeURIComponent(construireMessageWhatsAppVente())}`}
                      target="_blank" rel="noopener noreferrer" style={{ color: '#1E6B36', fontWeight: 600 }}
                    >
                      WhatsApp
                    </a>
                  </>
                )}
              </div>
              <div style={styles.muet}>
                {c.achatsPeriode} achat(s) sur la période — {f(c.montantPeriode)} F — dernier achat le {new Date(c.dernierAchat).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {c.dejaRemercie ? (
                <>
                  <div style={styles.badgeOk}>Message envoyé le {new Date(c.derniereRemerciementLe).toLocaleDateString('fr-FR')}</div>
                  <button onClick={() => basculer(c)} style={styles.lien}>Annuler</button>
                </>
              ) : (
                <button onClick={() => basculer(c)} style={styles.bouton}>Message envoyé</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  barre: { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 },
  champLabel: { display: 'flex', flexDirection: 'column', fontSize: 13, gap: 4 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  muet: { color: 'var(--brown-soft)', fontSize: 12.5 },
  carte: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: 'var(--white)', border: '1px solid var(--cream-deep)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 },
  bouton: { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  lien: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  badgeOk: { fontSize: 12, fontWeight: 700, color: '#1E6B36', background: '#E3F3E8', padding: '3px 9px', borderRadius: 20, marginBottom: 2 },
  badgeNouveau: { marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#7A5B00', background: '#FFE9A8', padding: '2px 8px', borderRadius: 20 },
  badgeHabitue: { marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--brown-soft)', background: 'var(--cream-deep)', padding: '2px 8px', borderRadius: 20 },
};
