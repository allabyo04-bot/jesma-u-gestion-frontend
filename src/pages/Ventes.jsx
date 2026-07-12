import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

const ONGLETS = [
  { id: 'nouvelle', label: 'Nouvelle vente' },
  { id: 'attente', label: 'En attente' },
  { id: 'credit', label: 'Ventes à crédit' },
  { id: 'historique', label: 'Historique' },
  { id: 'retours', label: 'Retours-Échanges' },
  { id: 'cartes', label: 'Cartes cadeaux' },
  { id: 'listes', label: 'Listes cadeaux' },
  { id: 'avoirs', label: 'Avoirs' },
];

const MODES_PAIEMENT = [
  'Espèces', 'Moov Money', 'MTN Money', 'Orange Money',
  'Wave', 'Carte bancaire', 'Bon d\'achat', 'Avoir',
];

export default function Ventes() {
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [erreurRecherche, setErreurRecherche] = useState('');
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [remiseMontant, setRemiseMontant] = useState('');
  const [motifRemise, setMotifRemise] = useState('');

  const [lieux, setLieux] = useState([]);
  const [vendeurs, setVendeurs] = useState([]);
  const [lieuId, setLieuId] = useState('');
  const [vendeurId, setVendeurId] = useState('');
  const [typeVente, setTypeVente] = useState('Comptant');
  const [modePaiement, setModePaiement] = useState('');

  const [venteEnCours, setVenteEnCours] = useState(false);
  const [erreurVente, setErreurVente] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
    appelApi('GET', '/vendeurs').then(setVendeurs).catch(() => {});
  }, []);

  async function gererRecherche(e) {
    e.preventDefault();
    const q = recherche.trim();
    if (!q) return;

    setRechercheEnCours(true);
    setErreurRecherche('');
    try {
      const reponse = await appelApi('GET', `/articles/recherche?q=${encodeURIComponent(q)}`);
      if (reponse.mode === 'exact' && reponse.resultats.length === 1) {
        ajouterAuPanier(reponse.resultats[0]);
        setResultats([]);
        setRecherche('');
      } else {
        setResultats(reponse.resultats);
      }
    } catch (err) {
      setErreurRecherche(err.message);
    } finally {
      setRechercheEnCours(false);
    }
  }

  function ajouterAuPanier(article) {
    setPanier((prec) => {
      const existant = prec.find((l) => l.articleId === article.id);
      if (existant) {
        return prec.map((l) =>
          l.articleId === article.id ? { ...l, quantite: l.quantite + 1 } : l
        );
      }
      return [
        ...prec,
        {
          articleId: article.id,
          designation: article.designation,
          prixUnitaire: Number(article.prixVente),
          quantite: 1,
          stockDispo: article.stockActuel,
        },
      ];
    });
  }

  function changerQuantite(articleId, delta) {
    setPanier((prec) =>
      prec
        .map((l) =>
          l.articleId === articleId ? { ...l, quantite: Math.max(0, l.quantite + delta) } : l
        )
        .filter((l) => l.quantite > 0)
    );
  }

  function retirerDuPanier(articleId) {
    setPanier((prec) => prec.filter((l) => l.articleId !== articleId));
  }

  function choisirResultat(article) {
    ajouterAuPanier(article);
    setResultats([]);
    setRecherche('');
  }

  function reinitialiserVente() {
    setPanier([]);
    setRemiseMontant('');
    setMotifRemise('');
    setModePaiement('');
  }

  async function validerVente() {
    setErreurVente('');

    if (panier.length === 0) {
      setErreurVente('Le panier est vide.');
      return;
    }
    if (!lieuId) {
      setErreurVente('Sélectionnez une boutique.');
      return;
    }
    if (!modePaiement) {
      setErreurVente('Sélectionnez un mode de paiement.');
      return;
    }

    setVenteEnCours(true);
    try {
      const vente = await appelApi('POST', '/ventes', {
        lieuId: Number(lieuId),
        vendeurId: vendeurId ? Number(vendeurId) : null,
        modePaiement,
        remiseMontant: remise > 0 ? remise : undefined,
        motifRemise: motifRemise || undefined,
        lignes: panier.map((l) => ({
          articleId: l.articleId,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
      });
      setConfirmation(vente);
      reinitialiserVente();
    } catch (err) {
      setErreurVente(err.message);
    } finally {
      setVenteEnCours(false);
    }
  }

  const totalBrut = panier.reduce((somme, l) => somme + l.prixUnitaire * l.quantite, 0);
  const remise = Math.min(Number(remiseMontant) || 0, totalBrut);
  const totalNet = totalBrut - remise;

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <nav style={styles.nav}>
          {ONGLETS.map((onglet, index) => (
            <div key={onglet.id} style={index === 0 ? styles.navItemActif : styles.navItem}>
              {onglet.label}
            </div>
          ))}
        </nav>
      </aside>

      <main style={styles.contenu}>
        <div style={styles.enTeteVente}>
          <div style={styles.blocBoutiqueVendeur}>
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
              Vendeur
              <select style={styles.champInput} value={vendeurId} onChange={(e) => setVendeurId(e.target.value)}>
                <option value="">—</option>
                {vendeurs.map((v) => (
                  <option key={v.id} value={v.id}>{v.nomComplet}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={styles.blocModeVente}>
            <label style={styles.champLabel}>
              Type de vente
              <select style={styles.champInput} value={typeVente} onChange={(e) => setTypeVente(e.target.value)}>
                <option>Comptant</option>
                <option>Crédit</option>
              </select>
            </label>
          </div>
        </div>

        <div style={styles.blocClient}>
          <label style={styles.champLabel}>
            Client
            <input style={styles.champInput} placeholder="Rechercher un client…" />
          </label>
        </div>

        {confirmation && (
          <div style={styles.bandeauConfirmation}>
            ✅ Vente {confirmation.numero} enregistrée — {Number(confirmation.totalNet).toLocaleString('fr-FR')} F
          </div>
        )}
        {erreurVente && <div style={styles.bandeauErreur}>{erreurVente}</div>}

        <div style={styles.zonePrincipale}>
          <div style={styles.blocAjoutArticle}>
            <h3 style={styles.titreBloc}>Ajouter un article</h3>
            <form onSubmit={gererRecherche} style={styles.formRecherche}>
              <input
                autoFocus
                style={styles.champInput}
                placeholder="Scanner ou taper un nom/code…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
              <button type="submit" style={styles.boutonRecherche} disabled={rechercheEnCours}>
                {rechercheEnCours ? '…' : 'Chercher'}
              </button>
            </form>

            {erreurRecherche && <p style={{ color: 'var(--error)', fontSize: 13 }}>{erreurRecherche}</p>}

            {resultats.length > 0 && (
              <div style={styles.listeResultats}>
                {resultats.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => choisirResultat(article)}
                    style={styles.itemResultat}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{article.designation}</div>
                      <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>
                        Stock : {article.stockActuel}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--gold-deep)' }}>
                      {Number(article.prixVente).toLocaleString('fr-FR')} F
                    </div>
                  </button>
                ))}
              </div>
            )}
            {resultats.length === 0 && !erreurRecherche && (
              <p style={styles.texteMuet}>Aucun résultat pour l'instant.</p>
            )}
          </div>

          <div style={styles.colonnePanier}>
            <h3 style={styles.titreBloc}>Panier</h3>
            {panier.length === 0 && <p style={styles.texteMuet}>Aucun article ajouté.</p>}
            {panier.map((ligne) => (
              <div key={ligne.articleId} style={styles.ligneAmpanier}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{ligne.designation}</div>
                  <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>
                    {ligne.prixUnitaire.toLocaleString('fr-FR')} F × {ligne.quantite}
                  </div>
                </div>
                <div style={styles.controlesQuantite}>
                  <button onClick={() => changerQuantite(ligne.articleId, -1)} style={styles.boutonQte}>−</button>
                  <span>{ligne.quantite}</span>
                  <button onClick={() => changerQuantite(ligne.articleId, 1)} style={styles.boutonQte}>+</button>
                </div>
                <button onClick={() => retirerDuPanier(ligne.articleId)} style={styles.boutonRetirer}>✕</button>
              </div>
            ))}

            {panier.length > 0 && (
              <>
                <div style={styles.blocRemise}>
                  <label style={styles.champLabel}>
                    Remise (F)
                    <input
                      type="number"
                      min="0"
                      style={styles.champInput}
                      value={remiseMontant}
                      onChange={(e) => setRemiseMontant(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  {Number(remiseMontant) > 0 && (
                    <label style={styles.champLabel}>
                      Motif de la remise
                      <input
                        style={styles.champInput}
                        value={motifRemise}
                        onChange={(e) => setMotifRemise(e.target.value)}
                        placeholder="Optionnel…"
                      />
                    </label>
                  )}
                </div>

                <div style={styles.recapTotaux}>
                  <div style={styles.ligneRecap}>
                    <span>Sous-total</span>
                    <span>{totalBrut.toLocaleString('fr-FR')} F</span>
                  </div>
                  {remise > 0 && (
                    <div style={styles.ligneRecap}>
                      <span>Remise</span>
                      <span style={{ color: 'var(--error)' }}>−{remise.toLocaleString('fr-FR')} F</span>
                    </div>
                  )}
                  <div style={styles.totalPanier}>
                    Total : {totalNet.toLocaleString('fr-FR')} F
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={styles.colonnePaiement}>
            <h3 style={styles.titreBloc}>Paiement</h3>
            <div style={styles.grillePaiement}>
              {MODES_PAIEMENT.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setModePaiement(mode)}
                  style={mode === modePaiement ? styles.modePaiementActif : styles.modePaiement}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div style={styles.boutonsAction}>
              <button style={styles.boutonAttente}>Mettre en attente</button>
              <button
                onClick={validerVente}
                disabled={venteEnCours}
                style={styles.boutonValider}
              >
                {venteEnCours ? 'Validation…' : 'Valider la vente'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  sidebar: { width: 220, background: 'var(--brown-deep)', color: 'var(--cream)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 },
  boutonRetour: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', color: 'var(--cream)', cursor: 'pointer', fontSize: 13 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: 0.8 },
  navItemActif: { padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'var(--gold-deep)', color: 'var(--white)', fontWeight: 600 },
  contenu: { flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' },
  enTeteVente: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  blocBoutiqueVendeur: { display: 'flex', gap: 12 },
  blocModeVente: { display: 'flex', gap: 12 },
  blocClient: { maxWidth: 400 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, minWidth: 160 },
  bandeauConfirmation: { padding: '10px 14px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontSize: 14, fontWeight: 600 },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 14, fontWeight: 600 },
  zonePrincipale: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 16, flex: 1 },
  blocAjoutArticle: { background: 'var(--white)', borderRadius: 12, padding: 16 },
  colonnePanier: { background: 'var(--white)', borderRadius: 12, padding: 16 },
  colonnePaiement: { background: 'var(--white)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' },
  titreBloc: { margin: '0 0 8px 0', fontSize: 15 },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  formRecherche: { display: 'flex', gap: 8, marginBottom: 12 },
  boutonRecherche: { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  listeResultats: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' },
  itemResultat: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', textAlign: 'left' },
  ligneAmpanier: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--cream-deep)' },
  controlesQuantite: { display: 'flex', alignItems: 'center', gap: 6 },
  boutonQte: { width: 24, height: 24, borderRadius: 6, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonRetirer: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 14 },
  blocRemise: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--cream-deep)' },
  recapTotaux: { marginTop: 12, paddingTop: 12, borderTop: '2px solid var(--gold-mid)' },
  ligneRecap: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--brown-soft)', marginBottom: 4 },
  totalPanier: { marginTop: 4, fontWeight: 700, fontSize: 16, textAlign: 'right' },
  grillePaiement: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  modePaiement: { padding: '10px 8px', borderRadius: 8, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
  modePaiementActif: { padding: '10px 8px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  boutonsAction: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  boutonAttente: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};