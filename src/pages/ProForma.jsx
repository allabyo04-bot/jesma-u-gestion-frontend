import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, recupererHtmlAvecAuth } from '../lib/api';

export default function ProForma() {
  const navigate = useNavigate();
  const [factures, setFactures] = useState([]);
  const [filtre, setFiltre] = useState('EN_ATTENTE');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  function chargerFactures() {
    setChargement(true);
    const params = filtre !== 'TOUS' ? `?statut=${filtre}` : '';
    appelApi('GET', `/proforma${params}`)
      .then(setFactures)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    chargerFactures();
  }, [filtre]);

  async function imprimer(numero) {
    try {
      const html = await recupererHtmlAvecAuth(`/proforma/${numero}/imprimer`);
      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function annuler(id) {
    if (!window.confirm('Annuler cette facture pro forma ?')) return;
    try {
      await appelApi('POST', `/proforma/${id}/annuler`);
      chargerFactures();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>← Tableau de bord</button>
        <h1 style={styles.titre}>Factures pro forma</h1>
        <button onClick={() => setFormulaireOuvert(true)} style={styles.boutonAjouter}>+ Nouvelle pro forma</button>
      </div>

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'EN_ATTENTE', label: 'En attente' },
          { id: 'UTILISEE', label: 'Utilisées' },
          { id: 'ANNULEE', label: 'Annulées' },
          { id: 'TOUS', label: 'Toutes' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            style={f.id === filtre ? styles.filtreActif : styles.filtreInactif}
          >
            {f.label}
          </button>
        ))}
      </div>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && factures.length === 0 && <p style={styles.texteMuet}>Aucune facture pour ce filtre.</p>}

      <div style={styles.grille}>
        {factures.map((f) => (
          <div key={f.id} style={styles.carte}>
            <div style={styles.enTeteCarte}>
              <span style={{ fontWeight: 700 }}>{f.numero}</span>
              <span
                style={{
                  ...styles.badgeStatut,
                  background: f.statut === 'EN_ATTENTE' ? '#FFF3D6' : f.statut === 'UTILISEE' ? '#DFF3E3' : '#FBE4E1',
                  color: f.statut === 'EN_ATTENTE' ? '#8A6300' : f.statut === 'UTILISEE' ? '#1E6B36' : 'var(--error)',
                }}
              >
                {f.statut === 'EN_ATTENTE' ? 'En attente' : f.statut === 'UTILISEE' ? 'Utilisée' : 'Annulée'}
              </span>
            </div>
            <div style={styles.texteMuet}>{f.client.nomComplet}</div>
            <div style={styles.texteMuet}>{new Date(f.createdAt).toLocaleDateString('fr-FR')}</div>
            <div style={{ fontWeight: 700, color: 'var(--gold-deep)' }}>
              {Number(f.totalHT).toLocaleString('fr-FR')} F
            </div>
            <div style={styles.texteMuet}>{f.lignes.length} article(s)</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => imprimer(f.numero)} style={styles.boutonSecondaire}>Imprimer</button>
              {f.statut === 'EN_ATTENTE' && (
                <button onClick={() => annuler(f.id)} style={styles.boutonAnnulerLigne}>Annuler</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {formulaireOuvert && (
        <FormulaireProForma
          onFermer={() => setFormulaireOuvert(false)}
          onCree={() => {
            setFormulaireOuvert(false);
            setFiltre('EN_ATTENTE');
            chargerFactures();
          }}
        />
      )}
    </div>
  );
}

function FormulaireProForma({ onFermer, onCree }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [articles, setArticles] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [lignes, setLignes] = useState([]);
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    appelApi('GET', '/clients').then(setClients).catch(() => {});
    appelApi('GET', '/articles').then(setArticles).catch(() => {});
  }, []);

  function ajouterArticle(article) {
    setLignes((prec) => {
      const existante = prec.find((l) => l.articleId === article.id);
      if (existante) {
        return prec.map((l) => (l.articleId === article.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      return [...prec, { articleId: article.id, designation: article.designation, prixUnitaire: Number(article.prixVente), quantite: 1, stockActuel: article.stockActuel }];
    });
    setRecherche('');
  }

  function changerQuantite(articleId, valeur) {
    setLignes((prec) => prec.map((l) => (l.articleId === articleId ? { ...l, quantite: Math.max(1, Number(valeur) || 1) } : l)));
  }

  function retirerLigne(articleId) {
    setLignes((prec) => prec.filter((l) => l.articleId !== articleId));
  }

  const total = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);

  const resultatsRecherche = recherche.trim()
    ? articles.filter((a) => a.designation.toLowerCase().includes(recherche.toLowerCase()) || a.reference.toLowerCase().includes(recherche.toLowerCase())).slice(0, 8)
    : [];

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');
    if (!clientId) {
      setErreur('Choisissez un client.');
      return;
    }
    if (lignes.length === 0) {
      setErreur('Ajoutez au moins un article.');
      return;
    }
    setEnvoiEnCours(true);
    try {
      await appelApi('POST', '/proforma', {
        clientId,
        lignes: lignes.map((l) => ({ articleId: l.articleId, quantite: l.quantite, prixUnitaire: l.prixUnitaire })),
      });
      onCree();
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
          <h2 style={styles.titrePanneau}>Nouvelle facture pro forma</h2>
          <button type="button" onClick={onFermer} style={styles.boutonFermer}>✕</button>
        </div>

        {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}

        <label style={styles.champLabel}>
          Client *
          {clientId ? (
            <div style={styles.lignePaiement}>
              <span>{clients.find((c) => String(c.id) === String(clientId))?.nomComplet || '—'}</span>
              <button type="button" onClick={() => setClientId('')} style={styles.boutonFermer}>✕</button>
            </div>
          ) : (
            <>
              <input
                style={styles.champInput}
                placeholder="Rechercher un client (nom ou téléphone)…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              {clientSearch.trim() && (
                <div style={styles.listeResultats}>
                  {clients
                    .filter((c) => c.nomComplet.toLowerCase().includes(clientSearch.toLowerCase()) || (c.telephone || '').includes(clientSearch))
                    .slice(0, 6)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClientId(String(c.id)); setClientSearch(''); }}
                        style={styles.itemResultat}
                      >
                        {c.nomComplet}{c.telephone ? ` — ${c.telephone}` : ''}
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </label>

        <label style={styles.champLabel}>
          Ajouter un article
          <input
            style={styles.champInput}
            placeholder="Rechercher par désignation ou référence…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          {resultatsRecherche.length > 0 && (
            <div style={styles.listeResultats}>
              {resultatsRecherche.map((a) => (
                <button key={a.id} type="button" onClick={() => ajouterArticle(a)} style={styles.itemResultat}>
                  {a.designation} — {Number(a.prixVente).toLocaleString('fr-FR')} F (stock : {a.stockActuel})
                </button>
              ))}
            </div>
          )}
        </label>

        {lignes.length > 0 && (
          <div style={styles.listeLignesPanier}>
            {lignes.map((l) => (
              <div key={l.articleId} style={styles.ligneItemPanier}>
                <span style={{ flex: 1 }}>{l.designation}</span>
                <input
                  type="number"
                  min="1"
                  style={{ ...styles.champInput, width: 60 }}
                  value={l.quantite}
                  onChange={(e) => changerQuantite(l.articleId, e.target.value)}
                />
                <span style={{ width: 90, textAlign: 'right' }}>{(l.prixUnitaire * l.quantite).toLocaleString('fr-FR')} F</span>
                <button type="button" onClick={() => retirerLigne(l.articleId)} style={styles.boutonFermer}>✕</button>
              </div>
            ))}
            <div style={{ fontWeight: 700, textAlign: 'right', marginTop: 6 }}>
              Total : {total.toLocaleString('fr-FR')} F
            </div>
          </div>
        )}

        <p style={styles.texteMuet}>
          Cette pro forma sera valable dans la limite du stock disponible au moment de la vente réelle.
        </p>

        <div style={styles.boutonsFormulaire}>
          <button type="button" onClick={onFermer} style={styles.boutonAnnuler}>Annuler</button>
          <button type="submit" disabled={envoiEnCours} style={styles.boutonValider}>
            {envoiEnCours ? 'Création…' : 'Créer la facture'}
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
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  filtreActif: { padding: '8px 14px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  filtreInactif: { padding: '8px 14px', borderRadius: 20, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--brown-ink)' },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
  carte: { background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(74,44,23,0.08)', display: 'flex', flexDirection: 'column', gap: 4 },
  enTeteCarte: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badgeStatut: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 },
  boutonSecondaire: { padding: '6px 12px', borderRadius: 6, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--brown-ink)' },
  boutonAnnulerLigne: { padding: '6px 12px', borderRadius: 6, border: '1px solid var(--error)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--error)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(46,26,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 },
  panneau: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  enTetePanneau: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titrePanneau: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 20 },
  boutonFermer: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, position: 'relative' },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  listeResultats: { position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--white)', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.15)', zIndex: 10, maxHeight: 220, overflowY: 'auto' },
  itemResultat: { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 },
  lignePaiement: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--cream)' },
  listeLignesPanier: { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--cream)', borderRadius: 10, padding: 12 },
  ligneItemPanier: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};
