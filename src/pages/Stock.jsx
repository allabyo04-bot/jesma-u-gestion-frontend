import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, uploaderFichierImport, telechargerFichierAvecAuth, uploaderFichierApercuInventaire, envoyerEtRecupererHtmlAvecAuth } from '../lib/api';

const SOUS_ONGLETS = [
  { id: 'reception', label: 'Réception' },
  { id: 'import', label: 'Import Excel' },
  { id: 'transferts', label: 'Transferts' },
  { id: 'historique', label: 'Historique des mouvements' },
  { id: 'etat', label: 'État du stock' },
  { id: 'etat-global', label: 'État global (tous dépôts)' },
  { id: 'inventaire', label: 'Inventaire (Excel)' },
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

function imprimerTableau(titre, colonnes, lignes) {
  const enTetes = colonnes.map((c) => `<th>${c}</th>`).join('');
  const corps = lignes
    .map((ligne) => `<tr>${ligne.map((cellule) => `<td>${cellule}</td>`).join('')}</tr>`)
    .join('');
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${titre}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, sans-serif; color: #2E1A0D; }
  h1 { font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #E5D9C3; font-size: 12px; text-align: left; }
  th { background: #F7EFDD; }
</style></head>
<body>
  <h1>Jesma U — ${titre}</h1>
  <p style="font-size:12px;color:#7A5C3E">${new Date().toLocaleDateString('fr-FR')}</p>
  <table><thead><tr>${enTetes}</tr></thead><tbody>${corps}</tbody></table>
  <script>window.onload = () => window.print();</script>
</body></html>`;
  const fenetre = window.open('', '_blank');
  fenetre.document.write(html);
  fenetre.document.close();
}

export default function Stock() {
  const navigate = useNavigate();
  const [ongletActif, setOngletActif] = useState('reception');
  const [lieux, setLieux] = useState([]);
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);

  useEffect(() => {
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
    appelApi('GET', '/articles').then(setArticles).catch(() => {});
    appelApi('GET', '/familles').then(setFamilles).catch(() => {});
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

      {ongletActif === 'reception' && (
        <OngletReception
          lieux={lieux}
          articles={articles}
          familles={familles}
          onFamillesMisesAJour={setFamilles}
          onArticleCree={(nouvel) => setArticles((prec) => [...prec, nouvel])}
        />
      )}
      {ongletActif === 'import' && <OngletImportExcel lieux={lieux} />}
      {ongletActif === 'transferts' && <OngletTransferts lieux={lieux} articles={articles} />}
      {ongletActif === 'historique' && <OngletHistorique articles={articles} lieux={lieux} />}
      {ongletActif === 'etat' && <OngletEtatStock lieux={lieux} familles={familles} />}
      {ongletActif === 'etat-global' && <OngletEtatGlobal lieux={lieux} articles={articles} familles={familles} />}
      {ongletActif === 'inventaire' && <OngletInventaire lieux={lieux} familles={familles} />}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET RÉCEPTION (entrée initiale de marchandise)
// ------------------------------------------------------------
function OngletReception({ lieux, articles, familles, onFamillesMisesAJour, onArticleCree }) {
  const [lieuId, setLieuId] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [reference, setReference] = useState('');
  const [lignes, setLignes] = useState([]);
  const [articleAAjouter, setArticleAAjouter] = useState('');
  const [quantiteAAjouter, setQuantiteAAjouter] = useState('1');
  const [prixAchatAAjouter, setPrixAchatAAjouter] = useState('');
  const [datePeremptionAAjouter, setDatePeremptionAAjouter] = useState('');
  const [notes, setNotes] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [derniereReception, setDerniereReception] = useState(null);
  const [impressionEtiquettesEnCours, setImpressionEtiquettesEnCours] = useState(false);
  const [erreurEtiquettes, setErreurEtiquettes] = useState('');

  async function imprimerEtiquettesDerniereReception() {
    if (!derniereReception || derniereReception.length === 0) return;
    setErreurEtiquettes('');
    setImpressionEtiquettesEnCours(true);
    try {
      const html = await envoyerEtRecupererHtmlAvecAuth('/articles/a-imprimer/etiquettes', {
        lignes: derniereReception.map((l) => ({ articleId: l.articleId, quantite: l.quantite })),
      });
      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
      setDerniereReception(null);
    } catch (err) {
      setErreurEtiquettes(err.message);
    } finally {
      setImpressionEtiquettesEnCours(false);
    }
  }

  const [receptions, setReceptions] = useState([]);
  const [chargementListe, setChargementListe] = useState(true);
  const [formulaireArticleOuvert, setFormulaireArticleOuvert] = useState(false);

  // --- Scan / recherche rapide d'article (code-barre, référence ou nom) ---
  const [rechercheArticle, setRechercheArticle] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState([]);
  const [erreurRecherche, setErreurRecherche] = useState('');

  useEffect(() => {
    chargerReceptions();
  }, []);

  function chargerReceptions() {
    setChargementListe(true);
    appelApi('GET', '/stock/receptions')
      .then(setReceptions)
      .catch(() => {})
      .finally(() => setChargementListe(false));
  }

  function gererChoixArticle(id) {
    setArticleAAjouter(id);
    const article = articles.find((a) => a.id === Number(id));
    // Pré-remplit avec le dernier prix d'achat connu, modifiable si le fournisseur a changé son prix.
    setPrixAchatAAjouter(article ? String(article.prixAchat ?? '') : '');
    setDatePeremptionAAjouter('');
  }

  // Recherche locale dans la liste d'articles déjà chargée : correspondance exacte
  // (code-barre scanné, code interne ou référence) -> sélection automatique.
  // Sinon, correspondance partielle sur désignation/référence -> liste de résultats à cliquer.
  function rechercherArticleScan(e) {
    e.preventDefault();
    const q = rechercheArticle.trim();
    if (!q) return;
    setErreurRecherche('');
    setResultatsRecherche([]);

    const qLower = q.toLowerCase();
    const exact = articles.find(
      (a) =>
        a.codeBarre === q ||
        a.codeInterne === q ||
        (a.reference && a.reference.toLowerCase() === qLower)
    );
    if (exact) {
      gererChoixArticle(String(exact.id));
      setRechercheArticle('');
      return;
    }

    const partiels = articles
      .filter(
        (a) =>
          a.designation.toLowerCase().includes(qLower) ||
          (a.reference && a.reference.toLowerCase().includes(qLower))
      )
      .slice(0, 8);

    if (partiels.length === 1) {
      gererChoixArticle(String(partiels[0].id));
      setRechercheArticle('');
    } else if (partiels.length > 1) {
      setResultatsRecherche(partiels);
    } else {
      setErreurRecherche(`Aucun article trouvé pour "${q}".`);
    }
  }

  function choisirResultatScan(article) {
    gererChoixArticle(String(article.id));
    setRechercheArticle('');
    setResultatsRecherche([]);
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
      return [
        ...prec,
        {
          articleId: article.id,
          designation: article.designation,
          quantite: Number(quantiteAAjouter),
          prixAchat: Number(prixAchatAAjouter) || 0,
          datePeremption: datePeremptionAAjouter || null,
        },
      ];
    });
    setArticleAAjouter('');
    setQuantiteAAjouter('1');
    setPrixAchatAAjouter('');
    setDatePeremptionAAjouter('');
  }

  function retirerLigne(articleId) {
    setLignes((prec) => prec.filter((l) => l.articleId !== articleId));
  }

  const articleSelectionne = articles.find((a) => a.id === Number(articleAAjouter));
  const estCosmetique = articleSelectionne?.famille?.nom === 'Cosmétique';

  async function validerReception() {
    setErreur('');
    setSucces('');
    if (!lieuId) {
      setErreur('Sélectionnez le lieu qui reçoit la marchandise.');
      return;
    }
    if (lignes.length === 0) {
      setErreur('Ajoutez au moins un article reçu.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await appelApi('POST', '/stock/receptions', {
        lieuId: Number(lieuId),
        fournisseur: fournisseur.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes || undefined,
        lignes: lignes.map((l) => ({
          articleId: l.articleId,
          quantite: l.quantite,
          prixAchat: l.prixAchat,
          datePeremption: l.datePeremption || undefined,
        })),
      });
      setSucces('Réception enregistrée avec succès — le stock a été mis à jour.');
      setDerniereReception(lignes.map((l) => ({ articleId: l.articleId, designation: l.designation, quantite: l.quantite })));
      setErreurEtiquettes('');
      setLignes([]);
      setFournisseur('');
      setReference('');
      setNotes('');
      chargerReceptions();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.grilleDeux}>
      <div style={styles.carte}>
        <h3 style={styles.titreCarte}>Nouvelle réception</h3>

        {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
        {succes && <div style={styles.bandeauConfirmation}>{succes}</div>}

        {derniereReception && derniereReception.length > 0 && (
          <div style={{ background: 'var(--cream-deep)', padding: '12px 14px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>
              🖨️ Imprimer les étiquettes de cette réception ({derniereReception.reduce((s, l) => s + l.quantite, 0)} au total)
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.8 }}>
              {derniereReception.map((l) => (
                <li key={l.articleId}>{l.designation} — {l.quantite}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={imprimerEtiquettesDerniereReception}
                disabled={impressionEtiquettesEnCours}
                style={{ ...styles.boutonValider, width: 'auto', padding: '8px 14px' }}
              >
                {impressionEtiquettesEnCours ? 'Impression…' : 'Imprimer'}
              </button>
              <button type="button" onClick={() => setDerniereReception(null)} style={styles.boutonAnnuler}>
                Fermer
              </button>
            </div>
            {erreurEtiquettes && <p style={{ color: 'var(--error)', fontSize: 12, margin: 0 }}>{erreurEtiquettes}</p>}
          </div>
        )}

        <div style={styles.ligneChamps}>
          <label style={styles.champLabel}>
            Lieu de réception
            <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
              <option value="">—</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </select>
          </label>
          <label style={styles.champLabel}>
            Fournisseur
            <input
              style={styles.champInput}
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              placeholder="Optionnel…"
            />
          </label>
        </div>

        <label style={styles.champLabel}>
          Référence (bon de livraison…)
          <input
            style={styles.champInput}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optionnel…"
          />
        </label>

        <form onSubmit={rechercherArticleScan} style={styles.ligneChamps}>
          <label style={{ ...styles.champLabel, flex: 1 }}>
            Scanner ou rechercher un article
            <input
              autoFocus
              style={styles.champInput}
              placeholder="Scanner le code-barre ou taper nom/référence…"
              value={rechercheArticle}
              onChange={(e) => setRechercheArticle(e.target.value)}
            />
          </label>
          <button type="submit" style={styles.boutonAjouter}>Chercher</button>
        </form>

        {erreurRecherche && <p style={{ color: 'var(--error)', fontSize: 13, marginTop: -8 }}>{erreurRecherche}</p>}

        {resultatsRecherche.length > 0 && (
          <div style={styles.listeLignes}>
            {resultatsRecherche.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => choisirResultatScan(a)}
                style={styles.itemResultatScan}
              >
                {a.designation} ({a.reference})
              </button>
            ))}
          </div>
        )}

        <div style={styles.ligneChamps}>
          <label style={{ ...styles.champLabel, flex: 1 }}>
            Article sélectionné
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ ...styles.champInput, flex: 1 }} value={articleAAjouter} onChange={(e) => gererChoixArticle(e.target.value)}>
                <option value="">—</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>{a.designation} ({a.reference})</option>
                ))}
              </select>
              <button type="button" onClick={() => setFormulaireArticleOuvert(true)} style={styles.boutonPlus}>+</button>
            </div>
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
          <label style={styles.champLabel}>
            Prix d'achat
            <input
              type="number"
              min="0"
              style={{ ...styles.champInput, width: 110 }}
              value={prixAchatAAjouter}
              onChange={(e) => setPrixAchatAAjouter(e.target.value)}
            />
          </label>
          {estCosmetique && (
            <label style={styles.champLabel}>
              Péremption
              <input
                type="date"
                style={{ ...styles.champInput, width: 150 }}
                value={datePeremptionAAjouter}
                onChange={(e) => setDatePeremptionAAjouter(e.target.value)}
              />
            </label>
          )}
          <button onClick={ajouterLigne} style={styles.boutonAjouter}>Ajouter</button>
        </div>

        {lignes.length > 0 && (
          <div style={styles.listeLignes}>
            {lignes.map((l) => (
              <div key={l.articleId} style={styles.ligneItem}>
                <span>{l.designation}</span>
                <span style={{ fontWeight: 600 }}>
                  × {l.quantite} — {l.prixAchat.toLocaleString('fr-FR')} F/u
                  {l.datePeremption && ` — Périme le ${new Date(l.datePeremption).toLocaleDateString('fr-FR')}`}
                </span>
                <button onClick={() => retirerLigne(l.articleId)} style={styles.boutonRetirer}>✕</button>
              </div>
            ))}
          </div>
        )}

        <label style={styles.champLabel}>
          Notes
          <input style={styles.champInput} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionnel…" />
        </label>

        <div style={{ position: 'sticky', bottom: 0, background: 'var(--white)', paddingTop: 10, paddingBottom: 4, marginTop: 4 }}>
          <button onClick={validerReception} disabled={envoiEnCours} style={styles.boutonValider}>
            {envoiEnCours ? 'Enregistrement…' : 'Valider la réception'}
          </button>
        </div>

        {formulaireArticleOuvert && (
          <FormulaireNouvelArticle
            familles={familles}
            onFamillesMisesAJour={onFamillesMisesAJour}
            onFermer={() => setFormulaireArticleOuvert(false)}
            onCree={(nouvel) => {
              onArticleCree(nouvel);
              setArticleAAjouter(String(nouvel.id));
              setPrixAchatAAjouter(String(nouvel.prixAchat ?? ''));
              setFormulaireArticleOuvert(false);
            }}
          />
        )}
      </div>

      <div style={styles.carte}>
        <h3 style={styles.titreCarte}>Réceptions récentes</h3>
        {chargementListe && <p style={styles.texteMuet}>Chargement…</p>}
        {!chargementListe && receptions.length === 0 && (
          <p style={styles.texteMuet}>Aucune réception pour l'instant.</p>
        )}
        <div style={styles.listeTransferts}>
          {receptions.map((r) => (
            <div key={r.id} style={styles.carteTransfert}>
              <div style={styles.enTeteCarteTransfert}>
                <span style={{ fontWeight: 700 }}>{r.fournisseur || 'Fournisseur non renseigné'}</span>
                <span style={styles.texteMuet}>
                  {new Date(r.dateReception).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div style={styles.texteMuet}>{r.lieu?.nom}</div>
              <div style={styles.texteMuet}>
                {r.lignes.map((l) => `${l.article.designation} ×${l.quantite}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// FORMULAIRE DE CRÉATION RAPIDE D'ARTICLE (depuis l'écran Réception)
// Même logique et mêmes endpoints que le formulaire de création dans Articles.jsx.
// ------------------------------------------------------------
function FormulaireNouvelArticle({ familles, onFamillesMisesAJour, onFermer, onCree }) {
  const [designation, setDesignation] = useState('');
  const [codeBarre, setCodeBarre] = useState('');
  const [codeInterne, setCodeInterne] = useState('');
  const [familleId, setFamilleId] = useState('');
  const [sousFamilleId, setSousFamilleId] = useState('');
  const [prixAchat, setPrixAchat] = useState('');
  const [prixVente, setPrixVente] = useState('');
  const [seuilAlerte, setSeuilAlerte] = useState('5');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [nouvelleFamilleOuverte, setNouvelleFamilleOuverte] = useState(false);
  const [nomNouvelleFamille, setNomNouvelleFamille] = useState('');
  const [nouvelleSousFamilleOuverte, setNouvelleSousFamilleOuverte] = useState(false);
  const [nomNouvelleSousFamille, setNomNouvelleSousFamille] = useState('');
  const [codeNouvelleSousFamille, setCodeNouvelleSousFamille] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);

  const familleSelectionnee = familles.find((f) => f.id === Number(familleId));
  const sousFamillesDisponibles = familleSelectionnee?.sousFamilles || [];

  async function creerNouvelleFamille() {
    if (!nomNouvelleFamille.trim()) return;
    setCreationEnCours(true);
    setErreur('');
    try {
      const nouvelle = await appelApi('POST', '/familles', { nom: nomNouvelleFamille.trim() });
      const familleAvecSousFamilles = { ...nouvelle, sousFamilles: [] };
      onFamillesMisesAJour([...familles, familleAvecSousFamilles]);
      setFamilleId(String(nouvelle.id));
      setSousFamilleId('');
      setNomNouvelleFamille('');
      setNouvelleFamilleOuverte(false);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationEnCours(false);
    }
  }

  async function creerNouvelleSousFamille() {
    if (!nomNouvelleSousFamille.trim() || !codeNouvelleSousFamille.trim() || !familleId) return;
    setCreationEnCours(true);
    setErreur('');
    try {
      const nouvelle = await appelApi('POST', `/familles/${familleId}/sous-familles`, {
        nom: nomNouvelleSousFamille.trim(),
        codePrefixe: codeNouvelleSousFamille.trim(),
      });
      const misesAJour = familles.map((f) =>
        f.id === Number(familleId) ? { ...f, sousFamilles: [...f.sousFamilles, nouvelle] } : f
      );
      onFamillesMisesAJour(misesAJour);
      setSousFamilleId(String(nouvelle.id));
      setNomNouvelleSousFamille('');
      setCodeNouvelleSousFamille('');
      setNouvelleSousFamilleOuverte(false);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationEnCours(false);
    }
  }

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');

    if (!designation || !familleId || !sousFamilleId || !prixVente) {
      setErreur('Désignation, famille, sous-famille et prix de vente sont requis.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const article = await appelApi('POST', '/articles', {
        codeBarre: codeBarre.trim() || undefined,
        codeInterne: codeInterne.trim() || undefined,
        designation,
        familleId,
        sousFamilleId,
        prixAchat: prixAchat ? Number(prixAchat) : 0,
        prixVente: Number(prixVente),
        seuilAlerte: Number(seuilAlerte),
      });
      onCree(article);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onFermer}>
      <form style={styles.formulaire} onClick={(e) => e.stopPropagation()} onSubmit={gererSoumission}>
        <h2 style={styles.titreFormulaire}>Nouvel article</h2>

        {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}

        <label style={styles.champLabel}>
          Désignation *
          <input className="champ-majuscule" style={styles.champInput} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </label>

        <label style={styles.champLabel}>
          Code-barre
          <input
            style={styles.champInput}
            placeholder="Scanner ou laisser vide (généré plus tard)"
            value={codeBarre}
            onChange={(e) => setCodeBarre(e.target.value)}
          />
        </label>

        <label style={styles.champLabel}>
          Code article (interne)
          <input
            style={styles.champInput}
            placeholder="Optionnel"
            value={codeInterne}
            onChange={(e) => setCodeInterne(e.target.value)}
          />
        </label>

        <label style={styles.champLabel}>
          Famille *
          <div style={styles.ligneAvecBouton}>
            <select
              style={{ ...styles.champInput, flex: 1 }}
              value={familleId}
              onChange={(e) => {
                setFamilleId(e.target.value);
                setSousFamilleId('');
              }}
            >
              <option value="">—</option>
              {familles.map((f) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
            <button type="button" onClick={() => setNouvelleFamilleOuverte((v) => !v)} style={styles.boutonPlus}>+</button>
          </div>
        </label>

        {nouvelleFamilleOuverte && (
          <div style={styles.blocCreationRapide}>
            <input
              style={styles.champInput}
              placeholder="Nom de la nouvelle famille…"
              value={nomNouvelleFamille}
              onChange={(e) => setNomNouvelleFamille(e.target.value)}
            />
            <button type="button" onClick={creerNouvelleFamille} disabled={creationEnCours} style={styles.boutonValiderPetit}>
              Créer
            </button>
          </div>
        )}

        {familleId && (
          <label style={styles.champLabel}>
            Sous-famille *
            <div style={styles.ligneAvecBouton}>
              <select
                style={{ ...styles.champInput, flex: 1 }}
                value={sousFamilleId}
                onChange={(e) => setSousFamilleId(e.target.value)}
              >
                <option value="">—</option>
                {sousFamillesDisponibles.map((sf) => (
                  <option key={sf.id} value={sf.id}>{sf.nom} ({sf.codePrefixe})</option>
                ))}
              </select>
              <button type="button" onClick={() => setNouvelleSousFamilleOuverte((v) => !v)} style={styles.boutonPlus}>+</button>
            </div>
          </label>
        )}

        {nouvelleSousFamilleOuverte && (
          <div style={styles.blocCreationRapide}>
            <input
              style={styles.champInput}
              placeholder="Nom de la sous-famille…"
              value={nomNouvelleSousFamille}
              onChange={(e) => setNomNouvelleSousFamille(e.target.value)}
            />
            <input
              style={{ ...styles.champInput, maxWidth: 100 }}
              placeholder="Code (ex: ANDT)"
              value={codeNouvelleSousFamille}
              onChange={(e) => setCodeNouvelleSousFamille(e.target.value.toUpperCase())}
            />
            <button type="button" onClick={creerNouvelleSousFamille} disabled={creationEnCours} style={styles.boutonValiderPetit}>
              Créer
            </button>
          </div>
        )}

        <label style={styles.champLabel}>
          Prix d'achat
          <input type="number" style={styles.champInput} value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
        </label>

        <label style={styles.champLabel}>
          Prix de vente *
          <input type="number" style={styles.champInput} value={prixVente} onChange={(e) => setPrixVente(e.target.value)} />
        </label>

        <label style={styles.champLabel}>
          Seuil d'alerte stock
          <input type="number" style={styles.champInput} value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} />
        </label>

        <div style={styles.boutonsFormulaire}>
          <button type="button" onClick={onFermer} style={styles.boutonAnnuler}>Annuler</button>
          <button type="submit" disabled={envoiEnCours} style={styles.boutonValider}>
            {envoiEnCours ? 'Enregistrement…' : 'Créer'}
          </button>
        </div>
      </form>
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
function OngletEtatStock({ lieux, familles }) {
  const [lieuId, setLieuId] = useState('');
  const [stocks, setStocks] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [familleId, setFamilleId] = useState('');
  const [sousFamilleId, setSousFamilleId] = useState('');
  const [statutStock, setStatutStock] = useState('TOUS');

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

  const familleSelectionnee = familles.find((f) => f.id === Number(familleId));
  const sousFamillesDisponibles = familleSelectionnee?.sousFamilles || [];

  const stocksFiltres = stocks.filter((s) => {
    if (familleId && s.article.familleId !== Number(familleId)) return false;
    if (sousFamilleId && s.article.sousFamilleId !== Number(sousFamilleId)) return false;
    if (statutStock === 'RUPTURE' && s.quantite > 0) return false;
    if (statutStock === 'EN_STOCK' && s.quantite <= 0) return false;
    return true;
  });

  return (
    <div style={styles.carte}>
      <div style={styles.ligneChamps}>
        <label style={styles.champLabel}>
          Boutique / Entrepôt
          <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
            <option value="">Sélectionnez un lieu…</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
          </select>
        </label>
        <label style={styles.champLabel}>
          Famille
          <select
            style={styles.champInput}
            value={familleId}
            onChange={(e) => { setFamilleId(e.target.value); setSousFamilleId(''); }}
          >
            <option value="">Toutes</option>
            {familles.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </label>
        {familleId && (
          <label style={styles.champLabel}>
            Sous-famille
            <select style={styles.champInput} value={sousFamilleId} onChange={(e) => setSousFamilleId(e.target.value)}>
              <option value="">Toutes</option>
              {sousFamillesDisponibles.map((sf) => (
                <option key={sf.id} value={sf.id}>{sf.nom}</option>
              ))}
            </select>
          </label>
        )}
        <label style={styles.champLabel}>
          Statut
          <select style={styles.champInput} value={statutStock} onChange={(e) => setStatutStock(e.target.value)}>
            <option value="TOUS">Tous les articles</option>
            <option value="EN_STOCK">En stock uniquement</option>
            <option value="RUPTURE">Rupture (quantité 0) uniquement</option>
          </select>
        </label>
      </div>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && lieuId && stocksFiltres.length === 0 && (
        <p style={styles.texteMuet}>Aucun stock enregistré pour ce filtre.</p>
      )}

      {!chargement && stocksFiltres.length > 0 && (
        <button
          style={{ ...styles.boutonValiderPetit, marginBottom: 10 }}
          onClick={() => imprimerTableau(
            `État du stock — ${lieux.find((l) => String(l.id) === String(lieuId))?.nom || ''}`,
            ['Article', 'Référence', 'Quantité'],
            stocksFiltres.map((s) => [s.article.designation, s.article.reference, s.quantite])
          )}
        >
          🖨️ Imprimer
        </button>
      )}

      {!chargement && stocksFiltres.length > 0 && (
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
              {stocksFiltres.map((s) => (
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
function OngletEtatGlobal({ lieux, articles, familles }) {
  const [chargement, setChargement] = useState(true);
  const [lignesParArticle, setLignesParArticle] = useState({});
  const [familleId, setFamilleId] = useState('');
  const [sousFamilleId, setSousFamilleId] = useState('');
  const [statutStock, setStatutStock] = useState('TOUS');

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

  const familleSelectionnee = familles.find((f) => f.id === Number(familleId));
  const sousFamillesDisponibles = familleSelectionnee?.sousFamilles || [];

  const articlesFiltres = articles.filter((a) => {
    if (familleId && a.familleId !== Number(familleId)) return false;
    if (sousFamilleId && a.sousFamilleId !== Number(sousFamilleId)) return false;
    const total = lieux.reduce((s, l) => s + ((lignesParArticle[a.id] || {})[l.id] || 0), 0);
    if (statutStock === 'RUPTURE' && total > 0) return false;
    if (statutStock === 'EN_STOCK' && total <= 0) return false;
    return true;
  });

  return (
    <div style={styles.carte}>
      <h3 style={styles.titreCarte}>État du stock — tous dépôts</h3>

      <div style={styles.ligneChamps}>
        <label style={styles.champLabel}>
          Famille
          <select
            style={styles.champInput}
            value={familleId}
            onChange={(e) => { setFamilleId(e.target.value); setSousFamilleId(''); }}
          >
            <option value="">Toutes</option>
            {familles.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </label>
        {familleId && (
          <label style={styles.champLabel}>
            Sous-famille
            <select style={styles.champInput} value={sousFamilleId} onChange={(e) => setSousFamilleId(e.target.value)}>
              <option value="">Toutes</option>
              {sousFamillesDisponibles.map((sf) => (
                <option key={sf.id} value={sf.id}>{sf.nom}</option>
              ))}
            </select>
          </label>
        )}
        <label style={styles.champLabel}>
          Statut
          <select style={styles.champInput} value={statutStock} onChange={(e) => setStatutStock(e.target.value)}>
            <option value="TOUS">Tous les articles</option>
            <option value="EN_STOCK">En stock uniquement</option>
            <option value="RUPTURE">Rupture (quantité 0) uniquement</option>
          </select>
        </label>
      </div>

      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && articlesFiltres.length === 0 && (
        <p style={styles.texteMuet}>Aucun article pour ce filtre.</p>
      )}

      {!chargement && articlesFiltres.length > 0 && (
        <button
          style={{ ...styles.boutonValiderPetit, marginBottom: 10 }}
          onClick={() => imprimerTableau(
            'État du stock — tous dépôts',
            ['Article', 'Référence', ...lieux.map((l) => l.nom), 'Total'],
            articlesFiltres.map((a) => {
              const quantitesParLieu = lignesParArticle[a.id] || {};
              const total = lieux.reduce((s, l) => s + (quantitesParLieu[l.id] || 0), 0);
              return [a.designation, a.reference, ...lieux.map((l) => quantitesParLieu[l.id] || 0), total];
            })
          )}
        >
          🖨️ Imprimer
        </button>
      )}

      {!chargement && articlesFiltres.length > 0 && (
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
              {articlesFiltres.map((a) => {
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

// ------------------------------------------------------------
// ONGLET IMPORT EXCEL
// Colonnes attendues : Référence | CodeBarre (optionnel) | Désignation |
// Quantité | PrixAchat | PrixVente (optionnel si article existant)
// ------------------------------------------------------------
function OngletImportExcel({ lieux }) {
  const [lieuId, setLieuId] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [lectureEnCours, setLectureEnCours] = useState(false);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  function gererChoixFichier(e) {
    setFichier(e.target.files[0] || null);
    setApercu(null);
    setErreur('');
    setSucces('');
  }

  async function analyserFichier() {
    if (!fichier) {
      setErreur('Choisissez un fichier Excel (.xlsx) à analyser.');
      return;
    }
    setErreur('');
    setSucces('');
    setLectureEnCours(true);
    try {
      const resultat = await uploaderFichierImport(fichier);
      setApercu(resultat);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLectureEnCours(false);
    }
  }

  const lignesValides = apercu ? apercu.lignes.filter((l) => l.statut !== 'ERREUR') : [];
  const lignesEnErreur = apercu ? apercu.lignes.filter((l) => l.statut === 'ERREUR') : [];

  async function confirmerImport() {
    setErreur('');
    setSucces('');
    if (!lieuId) {
      setErreur('Sélectionnez le lieu qui reçoit la marchandise.');
      return;
    }
    if (lignesValides.length === 0) {
      setErreur('Aucune ligne valide à importer.');
      return;
    }

    setConfirmationEnCours(true);
    try {
      await appelApi('POST', '/stock/import/confirmer', {
        lieuId: Number(lieuId),
        fournisseur: fournisseur.trim() || undefined,
        lignes: lignesValides.map((l) => ({
          reference: l.reference,
          codeBarre: l.codeBarre || undefined,
          designation: l.designation,
          quantite: l.quantite,
          prixAchat: l.prixAchat,
          prixVente: l.prixVente || undefined,
          articleId: l.articleId || undefined,
        })),
      });
      setSucces(`Import réussi : ${lignesValides.length} article(s) traité(s), stock mis à jour.`);
      setApercu(null);
      setFichier(null);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setConfirmationEnCours(false);
    }
  }

  return (
    <div style={styles.carte}>
      <h3 style={styles.titreCarte}>Import Excel de stock</h3>
      <p style={styles.texteMuet}>
        Colonnes attendues dans le fichier : Référence, CodeBarre (optionnel), Désignation, Quantité, PrixAchat, PrixVente (requis seulement pour un nouvel article).
      </p>

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {succes && <div style={styles.bandeauConfirmation}>{succes}</div>}

      <div style={styles.ligneChamps}>
        <label style={styles.champLabel}>
          Lieu de réception
          <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
            <option value="">—</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
          </select>
        </label>
        <label style={styles.champLabel}>
          Fournisseur
          <input
            style={styles.champInput}
            value={fournisseur}
            onChange={(e) => setFournisseur(e.target.value)}
            placeholder="Optionnel…"
          />
        </label>
      </div>

      <div style={styles.ligneChamps}>
        <input type="file" accept=".xlsx,.xls" onChange={gererChoixFichier} />
        <button onClick={analyserFichier} disabled={lectureEnCours || !fichier} style={styles.boutonAjouter}>
          {lectureEnCours ? 'Lecture…' : 'Analyser le fichier'}
        </button>
      </div>

      {apercu && (
        <>
          <p style={styles.texteMuet}>
            {apercu.nombreLignes} ligne(s) lues — {lignesValides.length} valide(s), {lignesEnErreur.length} en erreur.
          </p>

          <div style={styles.tableauScroll}>
            <table style={styles.tableau}>
              <thead>
                <tr>
                  <th style={styles.th}>Référence</th>
                  <th style={styles.th}>Désignation</th>
                  <th style={styles.th}>Qté</th>
                  <th style={styles.th}>Prix achat</th>
                  <th style={styles.th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {apercu.lignes.map((l, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{l.reference || '—'}</td>
                    <td style={styles.td}>{l.designation || '—'}</td>
                    <td style={styles.td}>{l.quantite ?? '—'}</td>
                    <td style={styles.td}>{l.prixAchat != null ? l.prixAchat.toLocaleString('fr-FR') : '—'}</td>
                    <td style={styles.td}>
                      {l.statut === 'ERREUR' && <span style={{ color: 'var(--error)', fontWeight: 600 }}>{l.erreur}</span>}
                      {l.statut === 'NOUVEL_ARTICLE' && <span style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>Nouvel article</span>}
                      {l.statut === 'ARTICLE_EXISTANT' && <span style={{ color: '#1E6B36', fontWeight: 600 }}>Article existant</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={confirmerImport}
            disabled={confirmationEnCours || lignesValides.length === 0}
            style={{ ...styles.boutonValider, marginTop: 14 }}
          >
            {confirmationEnCours ? 'Import en cours…' : `Confirmer l'import (${lignesValides.length} article(s))`}
          </button>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET INVENTAIRE (EXCEL) — export d'une feuille de comptage SANS quantité théorique
// (pour forcer un vrai comptage physique), puis réimport avec calcul des écarts et
// confirmation des corrections.
// ------------------------------------------------------------
function OngletInventaire({ lieux, familles }) {
  const [lieuId, setLieuId] = useState('');
  const [familleId, setFamilleId] = useState('');
  const [sousFamilleId, setSousFamilleId] = useState('');
  const [exportEnCours, setExportEnCours] = useState(false);
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [lectureEnCours, setLectureEnCours] = useState(false);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const familleSelectionnee = familles.find((f) => f.id === Number(familleId));
  const sousFamillesDisponibles = familleSelectionnee?.sousFamilles || [];

  async function exporterFeuille() {
    if (!lieuId) {
      setErreur('Choisissez une boutique/entrepôt avant d\'exporter.');
      return;
    }
    setErreur('');
    setExportEnCours(true);
    try {
      const params = new URLSearchParams({ lieuId });
      if (familleId) params.set('familleId', familleId);
      if (sousFamilleId) params.set('sousFamilleId', sousFamilleId);
      await telechargerFichierAvecAuth(`/stock/inventaire/export?${params.toString()}`, 'feuille-inventaire.xlsx');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setExportEnCours(false);
    }
  }

  function gererChoixFichier(e) {
    setFichier(e.target.files[0] || null);
    setApercu(null);
    setErreur('');
    setSucces('');
  }

  async function analyserFichier() {
    if (!lieuId) {
      setErreur('Choisissez la boutique/entrepôt concerné par ce comptage.');
      return;
    }
    if (!fichier) {
      setErreur('Choisissez le fichier Excel rempli à analyser.');
      return;
    }
    setErreur('');
    setSucces('');
    setLectureEnCours(true);
    try {
      const resultat = await uploaderFichierApercuInventaire(fichier, lieuId);
      setApercu(resultat);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLectureEnCours(false);
    }
  }

  const lignesAvecEcart = apercu ? apercu.filter((l) => l.statut === 'ECART') : [];
  const lignesConformes = apercu ? apercu.filter((l) => l.statut === 'CONFORME') : [];
  const lignesProblematiques = apercu ? apercu.filter((l) => l.statut !== 'ECART' && l.statut !== 'CONFORME') : [];

  async function confirmerCorrections() {
    setErreur('');
    setSucces('');
    setConfirmationEnCours(true);
    try {
      const resultat = await appelApi('POST', '/stock/inventaire/confirmer', {
        lieuId,
        lignes: lignesAvecEcart.map((l) => ({ articleId: l.articleId, quantiteComptee: l.quantiteComptee })),
      });
      setSucces(`${resultat.corrigees} article(s) corrigé(s) avec succès.`);
      setApercu(null);
      setFichier(null);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setConfirmationEnCours(false);
    }
  }

  return (
    <div style={styles.carte}>
      <h3 style={styles.titreCarte}>1. Exporter la feuille de comptage</h3>
      <p style={styles.texteMuet}>
        La quantité en stock n'apparaît volontairement pas sur cette feuille — comptez physiquement
        chaque article et notez le résultat dans la colonne "Quantité comptée".
      </p>

      <div style={styles.ligneChamps}>
        <label style={styles.champLabel}>
          Boutique / Entrepôt *
          <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
            <option value="">—</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
          </select>
        </label>
        <label style={styles.champLabel}>
          Famille
          <select
            style={styles.champInput}
            value={familleId}
            onChange={(e) => { setFamilleId(e.target.value); setSousFamilleId(''); }}
          >
            <option value="">Toutes</option>
            {familles.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </label>
        {familleId && (
          <label style={styles.champLabel}>
            Sous-famille
            <select style={styles.champInput} value={sousFamilleId} onChange={(e) => setSousFamilleId(e.target.value)}>
              <option value="">Toutes</option>
              {sousFamillesDisponibles.map((sf) => (
                <option key={sf.id} value={sf.id}>{sf.nom}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {succes && <div style={styles.bandeauConfirmation}>{succes}</div>}

      <button onClick={exporterFeuille} disabled={exportEnCours} style={styles.boutonValider}>
        {exportEnCours ? 'Génération…' : 'Exporter la feuille de comptage (.xlsx)'}
      </button>

      <h3 style={{ ...styles.titreCarte, marginTop: 28 }}>2. Réimporter les quantités comptées</h3>
      <p style={styles.texteMuet}>
        Reprenez le même fichier une fois rempli avec les quantités réellement comptées, pour le même lieu.
      </p>

      <input type="file" accept=".xlsx,.xls" onChange={gererChoixFichier} style={styles.champInput} />
      <button
        onClick={analyserFichier}
        disabled={lectureEnCours || !fichier}
        style={{ ...styles.boutonValiderPetit, marginTop: 10 }}
      >
        {lectureEnCours ? 'Lecture…' : 'Analyser le fichier'}
      </button>

      {apercu && (
        <>
          <h3 style={{ ...styles.titreCarte, marginTop: 24 }}>
            3. Aperçu — {lignesAvecEcart.length} écart(s), {lignesConformes.length} conforme(s)
            {lignesProblematiques.length > 0 ? `, ${lignesProblematiques.length} ligne(s) à corriger` : ''}
          </h3>

          {lignesProblematiques.length > 0 && (
            <div style={styles.bandeauErreur}>
              {lignesProblematiques.map((l, i) => (
                <div key={i}>{l.reference} — {l.erreur}</div>
              ))}
            </div>
          )}

          {lignesAvecEcart.length > 0 && (
            <div style={styles.tableauScroll}>
              <table style={styles.tableau}>
                <thead>
                  <tr>
                    <th style={styles.th}>Article</th>
                    <th style={styles.th}>Référence</th>
                    <th style={styles.th}>Théorique</th>
                    <th style={styles.th}>Compté</th>
                    <th style={styles.th}>Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesAvecEcart.map((l) => (
                    <tr key={l.articleId}>
                      <td style={styles.td}>{l.designation}</td>
                      <td style={styles.td}>{l.reference}</td>
                      <td style={styles.td}>{l.quantiteTheorique}</td>
                      <td style={styles.td}>{l.quantiteComptee}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: l.ecart < 0 ? 'var(--error)' : '#1E6B36' }}>
                        {l.ecart > 0 ? `+${l.ecart}` : l.ecart}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lignesAvecEcart.length === 0 ? (
            <p style={styles.texteMuet}>Aucun écart détecté — rien à corriger.</p>
          ) : (
            <button
              onClick={confirmerCorrections}
              disabled={confirmationEnCours}
              style={{ ...styles.boutonValider, marginTop: 14 }}
            >
              {confirmationEnCours ? 'Correction en cours…' : `Confirmer les corrections (${lignesAvecEcart.length} article(s))`}
            </button>
          )}
        </>
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
  itemResultatScan: { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(46,26,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 },
  formulaire: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  titreFormulaire: { fontFamily: 'var(--font-display)', margin: 0, marginBottom: 8 },
  ligneAvecBouton: { display: 'flex', gap: 6, alignItems: 'stretch' },
  boutonPlus: { padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 700, fontSize: 16 },
  blocCreationRapide: { display: 'flex', gap: 6, padding: 10, background: 'var(--cream)', borderRadius: 8 },
  boutonValiderPetit: { padding: '8px 12px', borderRadius: 6, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
};
