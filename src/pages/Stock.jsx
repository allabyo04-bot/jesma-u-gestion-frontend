import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

const SOUS_ONGLETS = [
  { id: 'transferts', label: 'Transferts' },
  { id: 'historique', label: 'Historique des mouvements' },
  { id: 'etat', label: 'État du stock' },
  { id: 'etat-global', label: 'État global (tous dépôts)' },
];

const LIBELLES_TYPE = {
  ENTREE_RECEPTION: 'Réception',
  SORTIE_VENTE: 'Vente',
  ANNULATION_VENTE: 'Annulation',
  CORRECTION_INVENTAIRE: 'Correction',
  RETOUR_CLIENT: 'Retour client',
  TRANSFERT_SORTIE: 'Transfert (sortie)',
  TRANSFERT_ENTREE: 'Transfert (entrée)',
};

function genererReferenceTransfert() {
  return `TR-${Date.now()}`;
}

export default function Stock() {
  const navigate = useNavigate();
  const [ongletActif, setOngletActif] = useState('transferts');
  const [lieux, setLieux] = useState([]);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
    appelApi('GET', '/articles').then(setArticles).catch(() => {});
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <h1 style={styles.titre}>Stock</h1>
      </div>

      <div style={styles.sousOnglets}>
        {SOUS_ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOngletActif(o.id)}
            style={o.id === ongletActif ? styles.sousOngletActif : styles.sousOnglet}
          >
            {o.label}
          </button>
        ))}
      </div>

      {ongletActif === 'transferts' && <OngletTransferts lieux={lieux} articles={articles} />}
      {ongletActif === 'historique' && <OngletHistorique articles={articles} lieux={lieux} />}
      {ongletActif === 'etat' && <OngletEtatStock lieux={lieux} />}
      {ongletActif === 'etat-global' && <OngletEtatGlobal lieux={lieux} articles={articles} />}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET TRANSFERTS
// ------------------------------------------------------------
function OngletTransferts({ lieux, articles }) {
  const [lieuSourceId, setLieuSourceId] = useState('');
  const [lieuDestinationId, setLieuDestinationId] = useState('');
  const [lignes, setLignes] = useState([]);
  const [articleAAjouter, setArticleAAjouter] = useState('');
  const [quantiteAAjouter, setQuantiteAAjouter] = useState('1');
  const [notes, setNotes] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [transferts, setTransferts] = useState([]);
  const [chargementListe, setChargementListe] = useState(true);

  useEffect(() => {
    chargerTransferts();
  }, []);

  function chargerTransferts() {
    setChargementListe(true);
    appelApi('GET', '/stock/transferts')
      .then(setTransferts)
      .catch(() => {})
      .finally(() => setChargementListe(false));
  }

  function ajouterLigne() {
    if (!articleAAjouter || !quantiteAAjouter || Number(quantiteAAjouter) <= 0) return;
    const article = articles.find((a) => a.id === Number(articleAAjouter));
    if (!article) return;
    setLignes((prec) => {
      const existant = prec.find((l) => l.articleId === article.id);
      if (existant) {
        return prec.map((l) =>
          l.articleId === article.id ? { ...l, quantite: l.quantite + Number(quantiteAAjouter) } : l
        );
      }
      return [...prec, { articleId: article.id, designation: article.designation, quantite: Number(quantiteAAjouter) }];
    });
    setArticleAAjouter('');
    setQuantiteAAjouter('1');
  }

  function retirerLigne(articleId) {
    setLignes((prec) => prec.filter((l) => l.articleId !== articleId));
  }

  async function validerTransfert() {
    setErreur('');
    setSucces('');
    if (!lieuSourceId || !lieuDestinationId) {
      setErreur('Sélectionnez la boutique/entrepôt source et destination.');
      return;
    }
    if (lieuSourceId === lieuDestinationId) {
      setErreur('La source et la destination doivent être différentes.');
      return;
    }
    if (lignes.length === 0) {
      setErreur('Ajoutez au moins un article à transférer.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await appelApi('POST', '/stock/transferts', {
        reference: genererReferenceTransfert(),
        lieuSourceId: Number(lieuSourceId),
        lieuDestinationId: Number(lieuDestinationId),
        notes: notes || undefined,
        lignes: lignes.map((l) => ({ articleId: l.articleId, quantite: l.quantite })),
      });
      setSucces('Transfert effectué avec succès.');
      setLignes([]);
      setNotes('');
      chargerTransferts();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.grilleDeux}>
      <div style={styles.carte}>
        <h3 style={styles.titreCarte}>Nouveau transfert</h3>

        {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
        {succes && <div style={styles.bandeauConfirmation}>{succes}</div>}

        <div style={styles.ligneChamps}>
          <label style={styles.champLabel}>
            Depuis
            <select style={styles.champInput} value={lieuSourceId} onChange={(e) => setLieuSourceId(e.target.value)}>
              <option value="">—</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </select>
          </label>
          <label style={styles.champLabel}>
            Vers
            <select style={styles.champInput} value={lieuDestinationId} onChange={(e) => setLieuDestinationId(e.target.value)}>
              <option value="">—</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={styles.ligneChamps}>
          <label style={{ ...styles.champLabel, flex: 1 }}>
            Article
            <select style={styles.champInput} value={articleAAjouter} onChange={(e) => setArticleAAjouter(e.target.value)}>
              <option value="">—</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.designation} ({a.reference})</option>
              ))}
            </select>
          </label>
          <label style={styles.champLabel}>
            Qté
            <input
              type="number"
              min="1"
              style={{ ...styles.champInput, width: 80 }}
              value={quantiteAAjouter}
              onChange={(e) => setQuantiteAAjouter(e.target.value)}
            />
          </label>
          <button onClick={ajouterLigne} style={styles.boutonAjouter}>Ajouter</button>
        </div>

        {lignes.length > 0 && (
          <div style={styles.listeLignes}>
            {lignes.map((l) => (
              <div key={l.articleId} style={styles.ligneItem}>
                <span>{l.designation}</span>
                <span style={{ fontWeight: 600 }}>× {l.quantite}</span>
                <button onClick={() => retirerLigne(l.articleId)} style={styles.boutonRetirer}>✕</button>
              </div>
            ))}
          </div>
        )}

        <label style={styles.champLabel}>
          Notes
          <input style={styles.champInput} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionnel…" />
        </label>

        <button onClick={validerTransfert} disabled={envoiEnCours} style={styles.boutonValider}>
          {envoiEnCours ? 'Transfert…' : 'Valider le transfert'}
        </button>
      </div>

      <div style={styles.carte}>
        <h3 style={styles.titreCarte}>Transferts récents</h3>
        {chargementListe && <p style={styles.texteMuet}>Chargement…</p>}
        {!chargementListe && transferts.length === 0 && (
          <p style={styles.texteMuet}>Aucun transfert pour l'instant.</p>
        )}
        <div style={styles.listeTransferts}>
          {transferts.map((t) => (
            <div key={t.id} style={styles.carteTransfert}>
              <div style={styles.enTeteCarteTransfert}>
                <span style={{ fontWeight: 700 }}>{t.reference}</span>
                <span style={styles.texteMuet}>
                  {new Date(t.dateTransfert).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div style={styles.texteMuet}>
                {t.lieuSource.nom} → {t.lieuDestination.nom}
              </div>
              <div style={styles.texteMuet}>
                {t.lignes.map((l) => `${l.article.designation} ×${l.quantite}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET HISTORIQUE DES MOUVEMENTS
// ------------------------------------------------------------
function OngletHistorique({ articles, lieux }) {
  const [articleFiltre, setArticleFiltre] = useState('');
  const [lieuFiltre, setLieuFiltre] = useState('');
  const [mouvements, setMouvements] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerMouvements();
  }, [articleFiltre, lieuFiltre]);

  function chargerMouvements() {
    setChargement(true);
    const params = new URLSearchParams();
    if (articleFiltre) params.set('articleId', articleFiltre);
    if (lieuFiltre) params.set('lieuId', lieuFiltre);
    appelApi('GET', `/stock/mouvements?${params.toString()}`)
      .then(setMouvements)
      .catch(() => {})
      .finally(() => setChargement(false));
  }

  return (
    <div style={styles.carte}>
      <div style={styles.ligneChamps}>
        <label style={styles.champLabel}>
          Filtrer par article
          <select style={styles.champInput} value={articleFiltre} onChange={(e) => setArticleFiltre(e.target.value)}>
            <option value="">Tous les articles</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>{a.designation} ({a.reference})</option>
            ))}
          </select>
        </label>
        <label style={styles.champLabel}>
          Filtrer par lieu
          <select style={styles.champInput} value={lieuFiltre} onChange={(e) => setLieuFiltre(e.target.value)}>
            <option value="">Tous les lieux</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
          </select>
        </label>
      </div>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && mouvements.length === 0 && (
        <p style={styles.texteMuet}>Aucun mouvement trouvé.</p>
      )}

      {!chargement && mouvements.length > 0 && (
        <div style={styles.tableauScroll}>
          <table style={styles.tableau}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Article</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Lieu</th>
                <th style={styles.th}>Quantité</th>
                <th style={styles.th}>Avant → Après</th>
                <th style={styles.th}>Par</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => (
                <tr key={m.id}>
                  <td style={styles.td}>
                    {new Date(m.createdAt).toLocaleDateString('fr-FR')}{' '}
                    {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={styles.td}>{m.article.designation}</td>
                  <td style={styles.td}>{LIBELLES_TYPE[m.type] || m.type}</td>
                  <td style={styles.td}>{m.lieu.nom}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: m.quantite < 0 ? 'var(--error)' : '#1E6B36' }}>
                    {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                  </td>
                  <td style={styles.td}>{m.stockAvant} → {m.stockApres}</td>
                  <td style={styles.td}>{m.utilisateur?.nomComplet || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET ÉTAT DU STOCK
// ------------------------------------------------------------
function OngletEtatStock({ lieux }) {
  const [lieuId, setLieuId] = useState('');
  const [stocks, setStocks] = useState([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (!lieuId) {
      setStocks([]);
      return;
    }
    setChargement(true);
    appelApi('GET', `/stock/lieux/${lieuId}/stock`)
      .then(setStocks)
      .catch(() => {})
      .finally(() => setChargement(false));
  }, [lieuId]);

  return (
    <div style={styles.carte}>
      <label style={styles.champLabel}>
        Boutique / Entrepôt
        <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
          <option value="">Sélectionnez un lieu…</option>
          {lieux.map((l) => (
            <option key={l.id} value={l.id}>{l.nom}</option>
          ))}
        </select>
      </label>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && lieuId && stocks.length === 0 && (
        <p style={styles.texteMuet}>Aucun stock enregistré pour ce lieu.</p>
      )}

      {!chargement && stocks.length > 0 && (
        <div style={styles.tableauScroll}>
          <table style={styles.tableau}>
            <thead>
              <tr>
                <th style={styles.th}>Article</th>
                <th style={styles.th}>Référence</th>
                <th style={styles.th}>Quantité</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.id}>
                  <td style={styles.td}>{s.article.designation}</td>
                  <td style={styles.td}>{s.article.reference}</td>
                  <td
                    style={{
                      ...styles.td,
                      fontWeight: 700,
                      color: s.quantite <= s.article.seuilAlerte ? 'var(--error)' : 'var(--brown-ink)',
                    }}
                  >
                    {s.quantite}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET ÉTAT GLOBAL (TOUS DÉPÔTS)
// ------------------------------------------------------------
function OngletEtatGlobal({ lieux, articles }) {
  const [chargement, setChargement] = useState(true);
  const [lignesParArticle, setLignesParArticle] = useState({});

  useEffect(() => {
    if (lieux.length === 0) return;
    setChargement(true);
    Promise.all(lieux.map((l) => appelApi('GET', `/stock/lieux/${l.id}/stock`)))
      .then((resultatsParLieu) => {
        const carte = {};
        resultatsParLieu.forEach((stocks, index) => {
          const lieuId = lieux[index].id;
          stocks.forEach((s) => {
            if (!carte[s.articleId]) carte[s.articleId] = {};
            carte[s.articleId][lieuId] = s.quantite;
          });
        });
        setLignesParArticle(carte);
      })
      .catch(() => {})
      .finally(() => setChargement(false));
  }, [lieux]);

  return (
    <div style={styles.carte}>
      <h3 style={styles.titreCarte}>État du stock — tous dépôts</h3>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && articles.length === 0 && (
        <p style={styles.texteMuet}>Aucun article pour l'instant.</p>
      )}

      {!chargement && articles.length > 0 && (
        <div style={styles.tableauScroll}>
          <table style={styles.tableau}>
            <thead>
              <tr>
                <th style={styles.th}>Article</th>
                <th style={styles.th}>Référence</th>
                {lieux.map((l) => (
                  <th key={l.id} style={styles.th}>{l.nom}</th>
                ))}
                <th style={styles.th}>Total</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => {
                const quantitesParLieu = lignesParArticle[a.id] || {};
                const total = lieux.reduce((s, l) => s + (quantitesParLieu[l.id] || 0), 0);
                return (
                  <tr key={a.id}>
                    <td style={styles.td}>{a.designation}</td>
                    <td style={styles.td}>{a.reference}</td>
                    {lieux.map((l) => (
                      <td key={l.id} style={styles.td}>{quantitesParLieu[l.id] || 0}</td>
                    ))}
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: 700,
                        color: total <= a.seuilAlerte ? 'var(--error)' : 'var(--brown-ink)',
                      }}
                    >
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  enTete: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  sousOnglets: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  sousOnglet: { padding: '10px 16px', borderRadius: 20, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--brown-ink)' },
  sousOngletActif: { padding: '10px 16px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  grilleDeux: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  carte: { background: 'var(--white)', borderRadius: 14, padding: 20 },
  titreCarte: { margin: '0 0 14px 0', fontSize: 16 },
  bandeauConfirmation: { padding: '10px 14px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontSize: 13, fontWeight: 600, marginBottom: 12 },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 13, fontWeight: 600, marginBottom: 12 },
  ligneChamps: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, minWidth: 160 },
  boutonAjouter: { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, height: 38 },
  listeLignes: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  ligneItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--cream)', fontSize: 13 },
  boutonRetirer: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 14 },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, width: '100%' },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  listeTransferts: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' },
  carteTransfert: { background: 'var(--cream)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  enTeteCarteTransfert: { display: 'flex', justifyContent: 'space-between' },
  tableauScroll: { overflowX: 'auto' },
  tableau: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid var(--gold-mid)', color: 'var(--brown-soft)', fontWeight: 700 },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--cream-deep)' },
};
