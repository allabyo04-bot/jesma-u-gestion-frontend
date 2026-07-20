import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

const SEUIL_FIDELITE_ACHATS = 10;
const SEUIL_FIDELITE_MONTANT = 20000;

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [clientOuvertId, setClientOuvertId] = useState(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  useEffect(() => {
    chargerClients();
  }, []);

  function chargerClients() {
    setChargement(true);
    const params = recherche ? `?q=${encodeURIComponent(recherche)}` : '';
    appelApi('GET', `/clients${params}`)
      .then(setClients)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  function gererRecherche(e) {
    e.preventDefault();
    chargerClients();
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>← Tableau de bord</button>
        <h1 style={styles.titre}>Clients</h1>
        <button onClick={() => setFormulaireOuvert(true)} style={styles.boutonAjouter}>+ Nouveau client</button>
      </div>

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}

      <form onSubmit={gererRecherche} style={styles.formRecherche}>
        <input
          style={styles.champInput}
          placeholder="Rechercher par nom ou téléphone…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <button type="submit" style={styles.boutonRecherche}>Chercher</button>
      </form>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && clients.length === 0 && <p style={styles.texteMuet}>Aucun client trouvé.</p>}

      <div style={styles.grille}>
        {clients.map((c) => (
          <div key={c.id} style={styles.carteClient} onClick={() => setClientOuvertId(c.id)}>
            <div style={styles.nomClient}>{c.nomComplet}</div>
            <div style={styles.texteMuet}>{c.telephone || 'Téléphone non renseigné'}</div>
            {c.achatsConsecutifs > 0 && (
              <div style={styles.badgeFidelite}>
                {c.achatsConsecutifs}/{SEUIL_FIDELITE_ACHATS} achats consécutifs
              </div>
            )}
          </div>
        ))}
      </div>

      {clientOuvertId && (
        <FicheClient
          clientId={clientOuvertId}
          onFermer={() => setClientOuvertId(null)}
          onModifie={chargerClients}
        />
      )}

      {formulaireOuvert && (
        <FormulaireNouveauClient
          onFermer={() => setFormulaireOuvert(false)}
          onCree={() => {
            setFormulaireOuvert(false);
            chargerClients();
          }}
        />
      )}
    </div>
  );
}

function FicheClient({ clientId, onFermer, onModifie }) {
  const [client, setClient] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [edition, setEdition] = useState(false);
  const [nomComplet, setNomComplet] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    chargerClient();
  }, [clientId]);

  function chargerClient() {
    setChargement(true);
    appelApi('GET', `/clients/${clientId}`)
      .then((c) => {
        setClient(c);
        setNomComplet(c.nomComplet);
        setTelephone(c.telephone || '');
        setEmail(c.email || '');
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur('');
    setEnvoiEnCours(true);
    try {
      await appelApi('PUT', `/clients/${clientId}`, {
        nomComplet, telephone: telephone || null, email: email || null,
      });
      setEdition(false);
      chargerClient();
      onModifie();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onFermer}>
      <div style={styles.panneau} onClick={(e) => e.stopPropagation()}>
        {chargement && <p style={styles.texteMuet}>Chargement…</p>}
        {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}

        {client && !edition && (
          <>
            <div style={styles.enTetePanneau}>
              <h2 style={styles.titrePanneau}>{client.nomComplet}</h2>
              <button onClick={onFermer} style={styles.boutonFermer}>✕</button>
            </div>
            <div style={styles.texteMuet}>{client.telephone || 'Téléphone non renseigné'}</div>
            <div style={styles.texteMuet}>{client.email || 'Email non renseigné'}</div>
            <button onClick={() => setEdition(true)} style={styles.boutonModifier}>✏️ Modifier</button>

            <div style={styles.carteFidelite}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Fidélité</div>
              <div style={styles.texteMuet}>
                {client.achatsConsecutifs} / {SEUIL_FIDELITE_ACHATS} achats consécutifs ≥ {SEUIL_FIDELITE_MONTANT.toLocaleString('fr-FR')} F
              </div>
              {client.recompensesFidelite.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {client.recompensesFidelite.map((r) => (
                    <div key={r.id} style={styles.texteMuet}>
                      {r.statut === 'UTILISEE' ? '✅ Cadeau remis' : r.statut === 'DEFINIE' ? '🎁 Cadeau prévu' : '⏳ Cadeau à définir'} — {new Date(r.dateAtteinte).toLocaleDateString('fr-FR')}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 style={styles.titreBloc}>Historique d'achats ({client.ventes.length})</h3>
            <div style={styles.listeVentes}>
              {client.ventes.map((v) => (
                <div key={v.id} style={styles.carteVente}>
                  <div style={styles.enTeteCarteVente}>
                    <span style={{ fontWeight: 700 }}>{v.numero} — {Number(v.totalNet).toLocaleString('fr-FR')} F</span>
                    <span style={styles.texteMuet}>{new Date(v.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div style={styles.texteMuet}>
                    {v.lieu?.nom} — {v.vendeur ? v.vendeur.nomComplet : '—'}
                  </div>
                  <div style={styles.texteMuet}>
                    {v.lignes.map((l) => `${l.article.designation} ×${l.quantite}`).join(', ')}
                  </div>
                </div>
              ))}
              {client.ventes.length === 0 && <p style={styles.texteMuet}>Aucun achat pour l'instant.</p>}
            </div>
          </>
        )}

        {client && edition && (
          <form onSubmit={enregistrer}>
            <div style={styles.enTetePanneau}>
              <h2 style={styles.titrePanneau}>Modifier le client</h2>
              <button type="button" onClick={onFermer} style={styles.boutonFermer}>✕</button>
            </div>
            <label style={styles.champLabel}>
              Nom complet
              <input style={styles.champInput} value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
            </label>
            <label style={styles.champLabel}>
              Téléphone
              <input style={styles.champInput} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </label>
            <label style={styles.champLabel}>
              Email
              <input style={styles.champInput} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div style={styles.boutonsFormulaire}>
              <button type="button" onClick={() => setEdition(false)} style={styles.boutonAnnuler}>Annuler</button>
              <button type="submit" disabled={envoiEnCours} style={styles.boutonValider}>
                {envoiEnCours ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FormulaireNouveauClient({ onFermer, onCree }) {
  const navigate = useNavigate();
  const [nomComplet, setNomComplet] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');
    if (!nomComplet.trim()) {
      setErreur('Le nom complet est requis.');
      return;
    }
    setEnvoiEnCours(true);
    try {
      const client = await appelApi('POST', '/clients', {
        nomComplet: nomComplet.trim(),
        telephone: telephone.trim() || null,
        email: email.trim() || null,
      });
      navigate(`/ventes?clientId=${client.id}`);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onFermer}>
      <form style={styles.panneau} onClick={(e) => e.stopPropagation()} onSubmit={gererSoumission}>
        <div style={styles.enTetePanneau}>
          <h2 style={styles.titrePanneau}>Nouveau client</h2>
          <button type="button" onClick={onFermer} style={styles.boutonFermer}>✕</button>
        </div>
        {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
        <label style={styles.champLabel}>
          Nom complet *
          <input style={styles.champInput} value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
        </label>
        <label style={styles.champLabel}>
          Téléphone
          <input style={styles.champInput} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </label>
        <label style={styles.champLabel}>
          Email
          <input style={styles.champInput} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div style={styles.boutonsFormulaire}>
          <button type="button" onClick={onFermer} style={styles.boutonAnnuler}>Annuler</button>
          <button type="submit" disabled={envoiEnCours} style={styles.boutonValider}>
            {envoiEnCours ? 'Création…' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 16 },
  enTete: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28, flex: 1 },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  boutonAjouter: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 14, fontWeight: 600 },
  formRecherche: { display: 'flex', gap: 8, maxWidth: 500 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, flex: 1 },
  boutonRecherche: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
  carteClient: { background: 'var(--white)', borderRadius: 12, padding: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(74,44,23,0.08)' },
  nomClient: { fontWeight: 700, fontSize: 15, marginBottom: 4 },
  badgeFidelite: { marginTop: 8, fontSize: 11, fontWeight: 600, color: 'var(--gold-deep)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(46,26,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 },
  panneau: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  enTetePanneau: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titrePanneau: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 20 },
  boutonFermer: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 },
  boutonModifier: { alignSelf: 'flex-start', border: 'none', background: 'transparent', color: 'var(--gold-deep)', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 },
  carteFidelite: { background: 'var(--cream)', borderRadius: 10, padding: 14, marginTop: 8 },
  titreBloc: { margin: '10px 0 6px 0', fontSize: 15 },
  listeVentes: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' },
  carteVente: { background: 'var(--cream)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  enTeteCarteVente: { display: 'flex', justifyContent: 'space-between' },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};
