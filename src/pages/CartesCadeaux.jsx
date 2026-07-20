import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

const LIBELLES_STATUT = {
  INACTIVE: { texte: 'Inactive', couleur: 'var(--brown-soft)' },
  ACTIVE: { texte: 'Active', couleur: '#1E6B36' },
  UTILISEE: { texte: 'Utilisée', couleur: 'var(--error)' },
};

const MODES_PAIEMENT = [
  'Espèces', 'Moov Money', 'MTN Money', 'Orange Money',
  'Wave', 'Carte bancaire',
];

export default function CartesCadeaux() {
  const navigate = useNavigate();
  const [denominations, setDenominations] = useState([]);
  const [cartes, setCartes] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [codeBarre, setCodeBarre] = useState('');
  const [denomination, setDenomination] = useState('');
  const [lieuId, setLieuId] = useState('');
  const [modePaiement, setModePaiement] = useState(MODES_PAIEMENT[0]);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [codeRecherche, setCodeRecherche] = useState('');
  const [carteConsultee, setCarteConsultee] = useState(null);
  const [erreurConsultation, setErreurConsultation] = useState('');

  // Compteurs par statut — la circulation (cartes vendues mais pas encore dépensées)
  // représente l'encours : de l'argent déjà encaissé, dû en marchandise aux clients.
  const cartesInactives = cartes.filter((c) => c.statut === 'INACTIVE');
  const cartesActives = cartes.filter((c) => c.statut === 'ACTIVE');
  const cartesUtilisees = cartes.filter((c) => c.statut === 'UTILISEE');
  const montantEnCirculation = cartesActives.reduce((s, c) => s + Number(c.denomination), 0);

  useEffect(() => {
    charger();
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
  }, []);

  function charger() {
    setChargement(true);
    Promise.all([
      appelApi('GET', '/cartes-cadeaux/denominations'),
      appelApi('GET', '/cartes-cadeaux'),
    ])
      .then(([d, c]) => {
        setDenominations(d);
        setCartes(c);
        if (d.length > 0 && !denomination) setDenomination(String(d[0].montant));
      })
      .catch(() => {})
      .finally(() => setChargement(false));
  }

  async function activerCarte(e) {
    e.preventDefault();
    setErreur('');
    setSucces('');
    if (!codeBarre.trim() || !denomination) {
      setErreur('Code-barres et dénomination requis.');
      return;
    }
    if (!lieuId) {
      setErreur('Sélectionnez la boutique.');
      return;
    }
    setEnvoiEnCours(true);
    try {
      const carte = await appelApi('POST', '/cartes-cadeaux/activer', {
        codeBarre: codeBarre.trim(),
        denomination: Number(denomination),
        lieuId: Number(lieuId),
        modePaiement,
      });
      setSucces(`Carte ${carte.codeBarre} activée avec ${Number(denomination).toLocaleString('fr-FR')} F.`);
      setCodeBarre('');
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function consulterCarte(e) {
    e.preventDefault();
    setErreurConsultation('');
    setCarteConsultee(null);
    if (!codeRecherche.trim()) return;
    try {
      const carte = await appelApi('GET', `/cartes-cadeaux/${encodeURIComponent(codeRecherche.trim())}`);
      setCarteConsultee(carte);
    } catch (err) {
      setErreurConsultation(err.message);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <h1 style={styles.titre}>Cartes cadeaux</h1>
      </div>

      <div style={styles.blocCompteurs}>
        <div style={styles.compteurCarte}>
          <div style={styles.chiffreCompteur}>{cartesInactives.length}</div>
          <div style={styles.libelleCompteur}>Non activées (stock)</div>
        </div>
        <div style={styles.compteurCarteVedette}>
          <div style={styles.chiffreCompteurVedette}>{cartesActives.length}</div>
          <div style={styles.libelleCompteurVedette}>Actives en circulation</div>
          <div style={styles.montantCompteurVedette}>
            {montantEnCirculation.toLocaleString('fr-FR')} F en encours
          </div>
        </div>
        <div style={styles.compteurCarte}>
          <div style={styles.chiffreCompteur}>{cartesUtilisees.length}</div>
          <div style={styles.libelleCompteur}>Déjà utilisées</div>
        </div>
      </div>

      <div style={styles.grilleDeux}>
        <div style={styles.carte}>
          <h3 style={styles.titreCarte}>Activer / réactiver une carte</h3>
          {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
          {succes && <div style={styles.bandeauConfirmation}>{succes}</div>}
          <form onSubmit={activerCarte}>
            <label style={styles.champLabel}>
              Code-barres de la carte
              <input
                autoFocus
                style={styles.champInput}
                value={codeBarre}
                onChange={(e) => setCodeBarre(e.target.value)}
                placeholder="Scanner ou saisir le code…"
              />
            </label>
            <label style={styles.champLabel}>
              Dénomination
              <select style={styles.champInput} value={denomination} onChange={(e) => setDenomination(e.target.value)}>
                {denominations.map((d) => (
                  <option key={d.id} value={d.montant}>{Number(d.montant).toLocaleString('fr-FR')} F</option>
                ))}
              </select>
            </label>
            <label style={styles.champLabel}>
              Boutique
              <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
                <option value="">—</option>
                {lieux.map((l) => (
                  <option key={l.id} value={l.id}>{l.nom}</option>
                ))}
              </select>
            </label>
            <label style={styles.champLabel}>
              Mode de paiement reçu
              <select style={styles.champInput} value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
                {MODES_PAIEMENT.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={envoiEnCours} style={styles.boutonValider}>
              {envoiEnCours ? 'Activation…' : 'Activer la carte'}
            </button>
          </form>
        </div>

        <div style={styles.carte}>
          <h3 style={styles.titreCarte}>Consulter une carte</h3>
          <form onSubmit={consulterCarte} style={styles.ligneChamps}>
            <input
              style={{ ...styles.champInput, flex: 1 }}
              value={codeRecherche}
              onChange={(e) => setCodeRecherche(e.target.value)}
              placeholder="Code-barres…"
            />
            <button type="submit" style={styles.boutonAjouter}>Chercher</button>
          </form>
          {erreurConsultation && <div style={styles.bandeauErreur}>{erreurConsultation}</div>}
          {carteConsultee && (
            <div style={styles.detailCarte}>
              <div style={styles.ligneDetail}>
                <span>Statut</span>
                <span style={{ fontWeight: 700, color: LIBELLES_STATUT[carteConsultee.statut]?.couleur }}>
                  {LIBELLES_STATUT[carteConsultee.statut]?.texte || carteConsultee.statut}
                </span>
              </div>
              <div style={styles.ligneDetail}>
                <span>Dénomination actuelle</span>
                <span style={{ fontWeight: 700 }}>{Number(carteConsultee.denomination).toLocaleString('fr-FR')} F</span>
              </div>
              <h4 style={{ marginTop: 14, marginBottom: 6, fontSize: 13 }}>Historique des cycles</h4>
              {carteConsultee.cycles.map((c) => (
                <div key={c.id} style={styles.ligneCycle}>
                  <span>{Number(c.denomination).toLocaleString('fr-FR')} F{c.modePaiement ? ` — ${c.modePaiement}` : ''}{c.lieu ? ` — ${c.lieu.nom}` : ''}</span>
                  <span style={styles.texteMuet}>
                    Activée {new Date(c.dateActivation).toLocaleDateString('fr-FR')}
                    {c.dateUtilisation && ` — Utilisée ${new Date(c.dateUtilisation).toLocaleDateString('fr-FR')}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.carte}>
        <h3 style={styles.titreCarte}>Toutes les cartes</h3>
        {chargement && <p style={styles.texteMuet}>Chargement…</p>}
        {!chargement && cartes.length === 0 && <p style={styles.texteMuet}>Aucune carte pour l'instant.</p>}
        {!chargement && cartes.length > 0 && (
          <div style={styles.tableauScroll}>
            <table style={styles.tableau}>
              <thead>
                <tr>
                  <th style={styles.th}>Code-barres</th>
                  <th style={styles.th}>Dénomination</th>
                  <th style={styles.th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {cartes.map((c) => (
                  <tr key={c.id}>
                    <td style={styles.td}>{c.codeBarre}</td>
                    <td style={styles.td}>{Number(c.denomination).toLocaleString('fr-FR')} F</td>
                    <td style={{ ...styles.td, fontWeight: 600, color: LIBELLES_STATUT[c.statut]?.couleur }}>
                      {LIBELLES_STATUT[c.statut]?.texte || c.statut}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  blocCompteurs: { display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 16 },
  compteurCarte: { background: 'var(--white)', borderRadius: 14, padding: 18, textAlign: 'center' },
  chiffreCompteur: { fontSize: 28, fontWeight: 700, color: 'var(--brown-soft)' },
  libelleCompteur: { fontSize: 12, color: 'var(--brown-soft)', marginTop: 4 },
  compteurCarteVedette: { background: 'var(--gold-deep)', borderRadius: 14, padding: 18, textAlign: 'center', color: 'var(--white)' },
  chiffreCompteurVedette: { fontSize: 34, fontWeight: 800 },
  libelleCompteurVedette: { fontSize: 13, fontWeight: 600, marginTop: 4 },
  montantCompteurVedette: { fontSize: 15, fontWeight: 700, marginTop: 8, opacity: 0.95 },
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 20 },
  enTete: { display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  grilleDeux: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  carte: { background: 'var(--white)', borderRadius: 14, padding: 20 },
  titreCarte: { margin: '0 0 14px 0', fontSize: 16 },
  bandeauConfirmation: { padding: '10px 14px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontSize: 13, fontWeight: 600, marginBottom: 12 },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 13, fontWeight: 600, marginBottom: 12 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  ligneChamps: { display: 'flex', gap: 10, marginBottom: 12 },
  boutonAjouter: { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, width: '100%' },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  detailCarte: { marginTop: 8 },
  ligneDetail: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--cream-deep)' },
  ligneCycle: { display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 0', borderBottom: '1px solid var(--cream-deep)', fontSize: 13 },
  tableauScroll: { overflowX: 'auto' },
  tableau: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid var(--gold-mid)', color: 'var(--brown-soft)', fontWeight: 700 },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--cream-deep)' },
};
