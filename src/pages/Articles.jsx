import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, uploaderPhotoArticle, supprimerPhotoArticle, definirPhotoPrincipaleArticle, envoyerEtRecupererHtmlAvecAuth } from '../lib/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://jesma-u-gestion-backend-production.up.railway.app/api';

export default function Articles() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [articleEnEdition, setArticleEnEdition] = useState(null);
  const [nombreAImprimer, setNombreAImprimer] = useState(0);

  // --- Panneau "étiquettes en attente" (file alimentée par les réceptions) ---
  const [panneauEtiquettesOuvert, setPanneauEtiquettesOuvert] = useState(false);
  const [articlesAImprimer, setArticlesAImprimer] = useState([]);
  const [quantitesEtiquettes, setQuantitesEtiquettes] = useState({});
  const [chargementEtiquettes, setChargementEtiquettes] = useState(false);
  const [impressionEnCours, setImpressionEnCours] = useState(false);
  const [erreurEtiquettes, setErreurEtiquettes] = useState('');

  // --- Réimpression à la demande (n'importe quel article, pas seulement la file) ---
  const [panneauReimpressionOuvert, setPanneauReimpressionOuvert] = useState(false);
  const [rechercheReimpression, setRechercheReimpression] = useState('');
  const [resultatsReimpression, setResultatsReimpression] = useState([]);
  const [rechercheReimpressionEnCours, setRechercheReimpressionEnCours] = useState(false);
  const [articleChoisiReimpression, setArticleChoisiReimpression] = useState(null);
  const [quantiteReimpression, setQuantiteReimpression] = useState('1');
  const [erreurReimpression, setErreurReimpression] = useState('');
  const [impressionReimpressionEnCours, setImpressionReimpressionEnCours] = useState(false);

  // --- Déplacer plusieurs articles vers une (nouvelle ou existante) sous-famille ---
  const [panneauDeplacementOuvert, setPanneauDeplacementOuvert] = useState(false);
  const [rechercheDeplacement, setRechercheDeplacement] = useState('');
  const [resultatsDeplacement, setResultatsDeplacement] = useState([]);
  const [rechercheDeplacementEnCours, setRechercheDeplacementEnCours] = useState(false);
  const [articlesSelectionnes, setArticlesSelectionnes] = useState([]);
  const [familleIdCible, setFamilleIdCible] = useState('');
  const [sousFamilleIdCible, setSousFamilleIdCible] = useState('');
  const [nouvelleSousFamilleCibleOuverte, setNouvelleSousFamilleCibleOuverte] = useState(false);
  const [nomNouvelleSousFamilleCible, setNomNouvelleSousFamilleCible] = useState('');
  const [codeNouvelleSousFamilleCible, setCodeNouvelleSousFamilleCible] = useState('');
  const [erreurDeplacement, setErreurDeplacement] = useState('');
  const [deplacementEnCours, setDeplacementEnCours] = useState(false);

  function ouvrirPanneauDeplacement() {
    setPanneauDeplacementOuvert(true);
    setRechercheDeplacement('');
    setResultatsDeplacement([]);
    setArticlesSelectionnes([]);
    setFamilleIdCible('');
    setSousFamilleIdCible('');
    setNouvelleSousFamilleCibleOuverte(false);
    setErreurDeplacement('');
  }

  async function rechercherPourDeplacement(texte) {
    setRechercheDeplacement(texte);
    if (texte.trim().length < 2) { setResultatsDeplacement([]); return; }
    setRechercheDeplacementEnCours(true);
    try {
      const reponse = await appelApi('GET', `/articles/recherche?q=${encodeURIComponent(texte.trim())}`);
      setResultatsDeplacement(reponse.resultats || []);
    } catch {
      setResultatsDeplacement([]);
    } finally {
      setRechercheDeplacementEnCours(false);
    }
  }

  function ajouterALaSelection(article) {
    setArticlesSelectionnes((prec) => (prec.some((a) => a.id === article.id) ? prec : [...prec, article]));
    setRechercheDeplacement('');
    setResultatsDeplacement([]);
  }

  function retirerDeLaSelection(id) {
    setArticlesSelectionnes((prec) => prec.filter((a) => a.id !== id));
  }

  async function creerSousFamilleCible() {
    if (!nomNouvelleSousFamilleCible.trim() || !codeNouvelleSousFamilleCible.trim() || !familleIdCible) {
      setErreurDeplacement('Choisis une famille, un nom et un préfixe pour la nouvelle sous-famille.');
      return;
    }
    setErreurDeplacement('');
    try {
      const nouvelle = await appelApi('POST', `/familles/${familleIdCible}/sous-familles`, {
        nom: nomNouvelleSousFamilleCible.trim(),
        codePrefixe: codeNouvelleSousFamilleCible.trim(),
      });
      const listeFamilles = await appelApi('GET', '/familles');
      setFamilles(listeFamilles);
      setSousFamilleIdCible(String(nouvelle.id));
      setNouvelleSousFamilleCibleOuverte(false);
      setNomNouvelleSousFamilleCible('');
      setCodeNouvelleSousFamilleCible('');
    } catch (err) {
      setErreurDeplacement(err.message);
    }
  }

  async function validerDeplacement() {
    if (articlesSelectionnes.length === 0) {
      setErreurDeplacement('Ajoute au moins un article à déplacer.');
      return;
    }
    if (!sousFamilleIdCible) {
      setErreurDeplacement('Choisis la sous-famille de destination.');
      return;
    }
    setDeplacementEnCours(true);
    setErreurDeplacement('');
    try {
      await appelApi('PUT', '/articles/deplacer-groupe', {
        articleIds: articlesSelectionnes.map((a) => a.id),
        sousFamilleId: Number(sousFamilleIdCible),
      });
      setPanneauDeplacementOuvert(false);
      chargerDonnees();
    } catch (err) {
      setErreurDeplacement(err.message);
    } finally {
      setDeplacementEnCours(false);
    }
  }

  // --- Rechercher un article à modifier (n'importe lequel, sans avoir à faire défiler) ---
  const [panneauModifOuvert, setPanneauModifOuvert] = useState(false);
  const [rechercheModif, setRechercheModif] = useState('');
  const [resultatsModif, setResultatsModif] = useState([]);
  const [rechercheModifEnCours, setRechercheModifEnCours] = useState(false);

  function ouvrirPanneauModif() {
    setPanneauModifOuvert(true);
    setRechercheModif('');
    setResultatsModif([]);
  }

  async function rechercherPourModif(texte) {
    setRechercheModif(texte);
    if (texte.trim().length < 2) { setResultatsModif([]); return; }
    setRechercheModifEnCours(true);
    try {
      const reponse = await appelApi('GET', `/articles/recherche?q=${encodeURIComponent(texte.trim())}`);
      setResultatsModif(reponse.resultats || []);
    } catch {
      setResultatsModif([]);
    } finally {
      setRechercheModifEnCours(false);
    }
  }

  function choisirArticlePourModif(article) {
    setPanneauModifOuvert(false);
    ouvrirEdition(article);
  }

  // --- Rechercher un article par son prix de vente exact ---
  const [panneauPrixOuvert, setPanneauPrixOuvert] = useState(false);
  const [recherchePrix, setRecherchePrix] = useState('');
  const [resultatsPrix, setResultatsPrix] = useState([]);
  const [recherchePrixEnCours, setRecherchePrixEnCours] = useState(false);
  const [rechercheePrixEffectuee, setRechercheePrixEffectuee] = useState(false);

  function ouvrirPanneauPrix() {
    setPanneauPrixOuvert(true);
    setRecherchePrix('');
    setResultatsPrix([]);
    setRechercheePrixEffectuee(false);
  }

  async function rechercherParPrix() {
    const prix = recherchePrix.trim();
    if (!prix) return;
    setRecherchePrixEnCours(true);
    setRechercheePrixEffectuee(false);
    try {
      const resultats = await appelApi('GET', `/articles?prix=${encodeURIComponent(prix)}`);
      setResultatsPrix(resultats);
    } catch {
      setResultatsPrix([]);
    } finally {
      setRecherchePrixEnCours(false);
      setRechercheePrixEffectuee(true);
    }
  }

  function choisirArticlePourPrix(article) {
    setPanneauPrixOuvert(false);
    ouvrirEdition(article);
  }

  // --- Imprimer la liste de tous les articles dont le nom contient un texte donné ---
  const [panneauListeOuvert, setPanneauListeOuvert] = useState(false);
  const [rechercheListe, setRechercheListe] = useState('');
  const [impressionListeEnCours, setImpressionListeEnCours] = useState(false);
  const [erreurListe, setErreurListe] = useState('');

  function ouvrirPanneauListe() {
    setPanneauListeOuvert(true);
    setRechercheListe('');
    setErreurListe('');
  }

  async function imprimerListeParNom() {
    const texte = rechercheListe.trim();
    if (!texte) { setErreurListe('Tape un nom (ou un bout de nom) à rechercher.'); return; }
    setErreurListe('');
    setImpressionListeEnCours(true);
    try {
      const resultats = await appelApi('GET', `/articles?q=${encodeURIComponent(texte)}`);
      const lignes = resultats
        .map((a) => `
          <tr>
            <td>${a.reference || ''}</td>
            <td>${a.designation}</td>
            <td>${a.codeBarre || '—'}</td>
            <td style="text-align:right">${Number(a.prixVente).toLocaleString('fr-FR')} F</td>
            <td style="text-align:right">${a.stockActuel}</td>
          </tr>`).join('');

      const html = `
        <html>
          <head>
            <title>${texte} — Jesma U</title>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #2A2118; }
              h1 { font-size: 18px; margin-bottom: 2px; }
              h2 { font-size: 14px; font-weight: normal; color: #6b5d4f; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
              th { background: #f2ece1; }
              tfoot td { font-weight: bold; border-top: 2px solid #333; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>Recherche : "${texte}"</h1>
            <h2>Liste des articles — Jesma U — imprimé le ${new Date().toLocaleDateString('fr-FR')}</h2>
            <table>
              <thead>
                <tr><th>Référence</th><th>Désignation</th><th>Code-barres</th><th style="text-align:right">Prix vente</th><th style="text-align:right">Stock</th></tr>
              </thead>
              <tbody>${lignes || '<tr><td colspan="5">Aucun article trouvé.</td></tr>'}</tbody>
              <tfoot>
                <tr><td colspan="4">Total articles</td><td style="text-align:right">${resultats.length}</td></tr>
              </tfoot>
            </table>
            <script>window.onload = () => window.print();</script>
          </body>
        </html>`;

      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
      setPanneauListeOuvert(false);
    } catch (err) {
      setErreurListe(err.message);
    } finally {
      setImpressionListeEnCours(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
    rafraichirCompteurImpression();
  }, []);

  function chargerDonnees() {
    setChargement(true);
    Promise.all([appelApi('GET', '/articles'), appelApi('GET', '/familles')])
      .then(([listeArticles, listeFamilles]) => {
        setArticles(listeArticles);
        setFamilles(listeFamilles);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  function rafraichirCompteurImpression() {
    appelApi('GET', '/articles/a-imprimer')
      .then((liste) => setNombreAImprimer(liste.length))
      .catch(() => {});
  }

  function ajouterArticleALaListe(article) {
    setArticles((prec) => [article, ...prec]);
  }

  function mettreAJourArticle(article) {
    setArticles((prec) => prec.map((a) => (a.id === article.id ? article : a)));
    rafraichirCompteurImpression();
  }

  async function ouvrirPanneauEtiquettes() {
    setPanneauEtiquettesOuvert(true);
    setErreurEtiquettes('');
    setChargementEtiquettes(true);
    try {
      const liste = await appelApi('GET', '/articles/a-imprimer');
      setArticlesAImprimer(liste);
      const quantitesInitiales = {};
      for (const a of liste) {
        quantitesInitiales[a.id] = a.quantiteAImprimer > 0 ? a.quantiteAImprimer : 1;
      }
      setQuantitesEtiquettes(quantitesInitiales);
    } catch (err) {
      setErreurEtiquettes(err.message);
    } finally {
      setChargementEtiquettes(false);
    }
  }

  async function lancerImpressionEtiquettes() {
    const lignes = articlesAImprimer
      .map((a) => ({ articleId: a.id, quantite: Number(quantitesEtiquettes[a.id]) || 0 }))
      .filter((l) => l.quantite > 0);
    if (lignes.length === 0) return;

    setImpressionEnCours(true);
    setErreurEtiquettes('');
    try {
      const html = await envoyerEtRecupererHtmlAvecAuth('/articles/a-imprimer/etiquettes', { lignes });
      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
      setPanneauEtiquettesOuvert(false);
      rafraichirCompteurImpression();
    } catch (err) {
      setErreurEtiquettes(err.message);
    } finally {
      setImpressionEnCours(false);
    }
  }

  function ouvrirPanneauReimpression() {
    setPanneauReimpressionOuvert(true);
    setRechercheReimpression('');
    setResultatsReimpression([]);
    setArticleChoisiReimpression(null);
    setQuantiteReimpression('1');
    setErreurReimpression('');
  }

  async function rechercherPourReimpression(texte) {
    setRechercheReimpression(texte);
    setArticleChoisiReimpression(null);
    if (texte.trim().length < 2) { setResultatsReimpression([]); return; }
    setRechercheReimpressionEnCours(true);
    try {
      const reponse = await appelApi('GET', `/articles/recherche?q=${encodeURIComponent(texte.trim())}`);
      setResultatsReimpression(reponse.resultats || []);
    } catch {
      setResultatsReimpression([]);
    } finally {
      setRechercheReimpressionEnCours(false);
    }
  }

  async function imprimerReimpression() {
    if (!articleChoisiReimpression) { setErreurReimpression('Choisis un article dans les résultats.'); return; }
    const quantite = Math.max(1, Number(quantiteReimpression) || 0);
    setErreurReimpression('');
    setImpressionReimpressionEnCours(true);
    try {
      const html = await envoyerEtRecupererHtmlAvecAuth('/articles/a-imprimer/etiquettes', {
        lignes: [{ articleId: articleChoisiReimpression.id, quantite }],
      });
      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
      setPanneauReimpressionOuvert(false);
    } catch (err) {
      setErreurReimpression(err.message);
    } finally {
      setImpressionReimpressionEnCours(false);
    }
  }

  function ouvrirCreation() {
    setArticleEnEdition(null);
    setFormulaireOuvert(true);
  }

  function ouvrirEdition(article) {
    setArticleEnEdition(article);
    setFormulaireOuvert(true);
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <h1 style={styles.titre}>Articles</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {nombreAImprimer > 0 && (
            <button onClick={ouvrirPanneauEtiquettes} style={styles.boutonImprimer}>
              🖨️ Étiquettes à imprimer ({nombreAImprimer})
            </button>
          )}
          <button onClick={ouvrirPanneauReimpression} style={styles.boutonRetour}>
            🖨️ Réimprimer une étiquette
          </button>
          <button onClick={() => navigate('/familles')} style={styles.boutonRetour}>
            Familles &amp; sous-familles
          </button>
          <button onClick={ouvrirPanneauListe} style={styles.boutonRetour}>
            🖨️ Imprimer une liste (par nom)
          </button>
          <button onClick={ouvrirPanneauModif} style={styles.boutonRetour}>
            🔍 Modifier un article
          </button>
          <button onClick={ouvrirPanneauPrix} style={styles.boutonRetour}>
            🔍 Rechercher par prix
          </button>
          <button onClick={ouvrirPanneauDeplacement} style={styles.boutonRetour}>
            📂 Déplacer des articles
          </button>
          <button onClick={ouvrirCreation} style={styles.boutonAjouter}>
            + Nouvel article
          </button>
        </div>
      </div>

      {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}
      {chargement && <p>Chargement…</p>}

      {!chargement && (
        <div style={styles.grille}>
          {articles.map((article) => (
            <CarteArticle
              key={article.id}
              article={article}
              onPhotoMiseAJour={mettreAJourArticle}
              onCodeBarreGenere={mettreAJourArticle}
              onModifier={ouvrirEdition}
            />
          ))}
          {articles.length === 0 && <p>Aucun article pour l'instant.</p>}
        </div>
      )}

      {formulaireOuvert && (
        <FormulaireArticle
          familles={familles}
          articleEnEdition={articleEnEdition}
          onFermer={() => setFormulaireOuvert(false)}
          onFamillesMisesAJour={setFamilles}
          onCree={(article) => {
            ajouterArticleALaListe(article);
          }}
          onModifie={(article) => {
            mettreAJourArticle(article);
            setFormulaireOuvert(false);
          }}
          onSyncArticle={mettreAJourArticle}
        />
      )}

      {panneauEtiquettesOuvert && (
        <div style={styles.overlay} onClick={() => setPanneauEtiquettesOuvert(false)}>
          <div style={styles.panneauEtiquettes} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.titreFormulaire}>Étiquettes à imprimer</h2>
            <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginTop: -8 }}>
              La quantité proposée correspond à ce qui a été mis en stock — modifie-la si besoin avant d'imprimer.
            </p>

            {erreurEtiquettes && <p style={{ color: 'var(--error)' }}>{erreurEtiquettes}</p>}
            {chargementEtiquettes && <p>Chargement…</p>}

            {!chargementEtiquettes && (
              <div style={styles.listeEtiquettes}>
                {articlesAImprimer.map((a) => (
                  <div key={a.id} style={styles.ligneEtiquette}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.designation}</div>
                      <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{a.reference}</div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      style={styles.champQuantite}
                      value={quantitesEtiquettes[a.id] ?? 0}
                      onChange={(e) =>
                        setQuantitesEtiquettes((prec) => ({ ...prec, [a.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
                {articlesAImprimer.length === 0 && <p>Aucune étiquette en attente.</p>}
              </div>
            )}

            <div style={styles.boutonsFormulaire}>
              <button type="button" onClick={() => setPanneauEtiquettesOuvert(false)} style={styles.boutonAnnuler}>
                Annuler
              </button>
              <button
                type="button"
                onClick={lancerImpressionEtiquettes}
                disabled={impressionEnCours || chargementEtiquettes}
                style={styles.boutonValider}
              >
                {impressionEnCours ? 'Impression…' : 'Imprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {panneauReimpressionOuvert && (
        <div style={styles.overlay} onClick={() => setPanneauReimpressionOuvert(false)}>
          <div style={styles.panneauEtiquettes} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.titreFormulaire}>Réimprimer une étiquette</h2>
            <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginTop: -8 }}>
              Recherche n'importe quel article (même ancien, déjà en stock depuis longtemps).
            </p>

            <input
              autoFocus
              style={styles.champQuantite2}
              placeholder="Désignation ou référence…"
              value={rechercheReimpression}
              onChange={(e) => rechercherPourReimpression(e.target.value)}
            />

            {erreurReimpression && <p style={{ color: 'var(--error)' }}>{erreurReimpression}</p>}
            {rechercheReimpressionEnCours && <p style={{ color: 'var(--brown-soft)' }}>Recherche…</p>}

            {!rechercheReimpressionEnCours && resultatsReimpression.length > 0 && !articleChoisiReimpression && (
              <div style={styles.listeEtiquettes}>
                {resultatsReimpression.map((a) => (
                  <div
                    key={a.id}
                    style={{ ...styles.ligneEtiquette, cursor: 'pointer' }}
                    onClick={() => setArticleChoisiReimpression(a)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.designation}</div>
                      <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{a.reference}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {articleChoisiReimpression && (
              <div style={styles.ligneEtiquette}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{articleChoisiReimpression.designation}</div>
                  <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{articleChoisiReimpression.reference}</div>
                </div>
                <input
                  type="number"
                  min="1"
                  style={styles.champQuantite}
                  value={quantiteReimpression}
                  onChange={(e) => setQuantiteReimpression(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setArticleChoisiReimpression(null)}
                  style={{ ...styles.boutonEditer, marginLeft: 8 }}
                >
                  ✕
                </button>
              </div>
            )}

            <div style={styles.boutonsFormulaire}>
              <button type="button" onClick={() => setPanneauReimpressionOuvert(false)} style={styles.boutonAnnuler}>
                Annuler
              </button>
              <button
                type="button"
                onClick={imprimerReimpression}
                disabled={impressionReimpressionEnCours || !articleChoisiReimpression}
                style={styles.boutonValider}
              >
                {impressionReimpressionEnCours ? 'Impression…' : 'Imprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {panneauDeplacementOuvert && (
        <div style={styles.overlay} onClick={() => setPanneauDeplacementOuvert(false)}>
          <div style={styles.panneauEtiquettes} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.titreFormulaire}>Déplacer des articles vers une sous-famille</h2>
            <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginTop: -8 }}>
              Ajoute un ou plusieurs articles à la liste, puis choisis la sous-famille de destination
              (existante ou toute nouvelle).
            </p>

            {erreurDeplacement && <p style={{ color: 'var(--error)' }}>{erreurDeplacement}</p>}

            <input
              autoFocus
              style={styles.champQuantite2}
              placeholder="Désignation ou référence…"
              value={rechercheDeplacement}
              onChange={(e) => rechercherPourDeplacement(e.target.value)}
            />
            {rechercheDeplacementEnCours && <p style={{ color: 'var(--brown-soft)' }}>Recherche…</p>}
            {!rechercheDeplacementEnCours && resultatsDeplacement.length > 0 && (
              <div style={styles.listeEtiquettes}>
                {resultatsDeplacement.map((a) => (
                  <div key={a.id} style={{ ...styles.ligneEtiquette, cursor: 'pointer' }} onClick={() => ajouterALaSelection(a)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.designation}</div>
                      <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{a.reference}</div>
                    </div>
                    <span style={{ color: 'var(--gold-deep)', fontWeight: 700, fontSize: 13 }}>+ Ajouter</span>
                  </div>
                ))}
              </div>
            )}

            {articlesSelectionnes.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  {articlesSelectionnes.length} article(s) à déplacer :
                </p>
                <div style={styles.listeEtiquettes}>
                  {articlesSelectionnes.map((a) => (
                    <div key={a.id} style={styles.ligneEtiquette}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.designation}</div>
                        <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{a.reference}</div>
                      </div>
                      <button type="button" onClick={() => retirerDeLaSelection(a.id)} style={styles.boutonEditer}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <label style={styles.champLabel}>
              Famille de destination
              <select
                style={styles.champInput}
                value={familleIdCible}
                onChange={(e) => { setFamilleIdCible(e.target.value); setSousFamilleIdCible(''); }}
              >
                <option value="">—</option>
                {familles.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </label>

            {familleIdCible && !nouvelleSousFamilleCibleOuverte && (
              <label style={styles.champLabel}>
                Sous-famille de destination
                <div style={styles.ligneAvecBouton}>
                  <select
                    style={{ ...styles.champInput, flex: 1 }}
                    value={sousFamilleIdCible}
                    onChange={(e) => setSousFamilleIdCible(e.target.value)}
                  >
                    <option value="">—</option>
                    {familles.find((f) => String(f.id) === familleIdCible)?.sousFamilles.map((sf) => (
                      <option key={sf.id} value={sf.id}>{sf.nom} ({sf.codePrefixe})</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setNouvelleSousFamilleCibleOuverte(true)} style={styles.boutonPlus}>+</button>
                </div>
              </label>
            )}

            {nouvelleSousFamilleCibleOuverte && (
              <div style={styles.blocCreationRapide}>
                <input
                  style={styles.champInput}
                  placeholder="Nom de la nouvelle sous-famille"
                  value={nomNouvelleSousFamilleCible}
                  onChange={(e) => setNomNouvelleSousFamilleCible(e.target.value)}
                />
                <input
                  style={{ ...styles.champInput, maxWidth: 100 }}
                  placeholder="Préfixe (ex: ANDT)"
                  value={codeNouvelleSousFamilleCible}
                  onChange={(e) => setCodeNouvelleSousFamilleCible(e.target.value)}
                />
                <button type="button" onClick={creerSousFamilleCible} style={styles.boutonValiderPetit}>
                  Créer
                </button>
              </div>
            )}

            <div style={styles.boutonsFormulaire}>
              <button type="button" onClick={() => setPanneauDeplacementOuvert(false)} style={styles.boutonAnnuler}>
                Annuler
              </button>
              <button type="button" onClick={validerDeplacement} disabled={deplacementEnCours} style={styles.boutonValider}>
                {deplacementEnCours ? 'Déplacement…' : `Déplacer ${articlesSelectionnes.length || ''} article(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {panneauPrixOuvert && (
        <div style={styles.overlay} onClick={() => setPanneauPrixOuvert(false)}>
          <div style={styles.panneauEtiquettes} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.titreFormulaire}>Rechercher par prix</h2>
            <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginTop: -8 }}>
              Tape le prix de vente exact — tous les articles vendus à ce prix s'affichent.
            </p>

            <input
              autoFocus
              type="number"
              style={styles.champQuantite2}
              placeholder="Ex : 5000"
              value={recherchePrix}
              onChange={(e) => setRecherchePrix(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rechercherParPrix()}
            />

            <button type="button" onClick={rechercherParPrix} disabled={recherchePrixEnCours || !recherchePrix.trim()} style={styles.boutonValider}>
              {recherchePrixEnCours ? 'Recherche…' : 'Rechercher'}
            </button>

            {resultatsPrix.length > 0 && (
              <div style={styles.listeEtiquettes}>
                {resultatsPrix.map((a) => (
                  <div
                    key={a.id}
                    style={{ ...styles.ligneEtiquette, cursor: 'pointer' }}
                    onClick={() => choisirArticlePourPrix(a)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.designation}</div>
                      <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{a.reference} — Stock : {a.stockActuel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {rechercheePrixEffectuee && !recherchePrixEnCours && resultatsPrix.length === 0 && (
              <p style={{ color: 'var(--brown-soft)', fontSize: 13 }}>Aucun article à ce prix exact.</p>
            )}

            <div style={styles.boutonsFormulaire}>
              <button type="button" onClick={() => setPanneauPrixOuvert(false)} style={styles.boutonAnnuler}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {panneauListeOuvert && (
        <div style={styles.overlay} onClick={() => setPanneauListeOuvert(false)}>
          <div style={styles.panneauEtiquettes} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.titreFormulaire}>Imprimer une liste d'articles</h2>
            <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginTop: -8 }}>
              Tape un nom (ou un bout de nom) — tous les articles dont la désignation le contient seront listés et imprimés.
            </p>

            <input
              autoFocus
              style={styles.champQuantite2}
              placeholder="Ex : KIT NAISSANCE"
              value={rechercheListe}
              onChange={(e) => setRechercheListe(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && imprimerListeParNom()}
            />

            {erreurListe && <p style={{ color: 'var(--error)' }}>{erreurListe}</p>}

            <div style={styles.boutonsFormulaire}>
              <button type="button" onClick={() => setPanneauListeOuvert(false)} style={styles.boutonAnnuler} disabled={impressionListeEnCours}>
                Annuler
              </button>
              <button type="button" onClick={imprimerListeParNom} disabled={impressionListeEnCours} style={styles.boutonValider}>
                {impressionListeEnCours ? 'Recherche…' : '🖨️ Imprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {panneauModifOuvert && (
        <div style={styles.overlay} onClick={() => setPanneauModifOuvert(false)}>
          <div style={styles.panneauEtiquettes} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.titreFormulaire}>Modifier un article</h2>
            <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginTop: -8 }}>
              Recherche par nom ou référence.
            </p>

            <input
              autoFocus
              style={styles.champQuantite2}
              placeholder="Désignation ou référence…"
              value={rechercheModif}
              onChange={(e) => rechercherPourModif(e.target.value)}
            />

            {rechercheModifEnCours && <p style={{ color: 'var(--brown-soft)' }}>Recherche…</p>}

            {!rechercheModifEnCours && resultatsModif.length > 0 && (
              <div style={styles.listeEtiquettes}>
                {resultatsModif.map((a) => (
                  <div
                    key={a.id}
                    style={{ ...styles.ligneEtiquette, cursor: 'pointer' }}
                    onClick={() => choisirArticlePourModif(a)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.designation}</div>
                      <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{a.reference}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!rechercheModifEnCours && rechercheModif.trim().length >= 2 && resultatsModif.length === 0 && (
              <p style={{ color: 'var(--brown-soft)', fontSize: 13 }}>Aucun article trouvé.</p>
            )}

            <div style={styles.boutonsFormulaire}>
              <button type="button" onClick={() => setPanneauModifOuvert(false)} style={styles.boutonAnnuler}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CarteArticle({ article, onPhotoMiseAJour, onCodeBarreGenere, onModifier }) {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState('');
  const [actionPhotoEnCours, setActionPhotoEnCours] = useState(null);
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [erreurGeneration, setErreurGeneration] = useState('');

  const photos = article.photos || [];

  async function gererAjoutPhoto(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    e.target.value = '';
    setEnvoiEnCours(true);
    setErreurPhoto('');
    try {
      const articleMisAJour = await uploaderPhotoArticle(article.id, fichier);
      onPhotoMiseAJour(articleMisAJour);
    } catch (err) {
      setErreurPhoto(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function gererSuppressionPhoto(photoId) {
    setActionPhotoEnCours(photoId);
    setErreurPhoto('');
    try {
      const articleMisAJour = await supprimerPhotoArticle(article.id, photoId);
      onPhotoMiseAJour(articleMisAJour);
    } catch (err) {
      setErreurPhoto(err.message);
    } finally {
      setActionPhotoEnCours(null);
    }
  }

  async function gererDefinirPrincipale(photoId) {
    setActionPhotoEnCours(photoId);
    setErreurPhoto('');
    try {
      const articleMisAJour = await definirPhotoPrincipaleArticle(article.id, photoId);
      onPhotoMiseAJour(articleMisAJour);
    } catch (err) {
      setErreurPhoto(err.message);
    } finally {
      setActionPhotoEnCours(null);
    }
  }

  async function genererCodeBarre() {
    setGenerationEnCours(true);
    setErreurGeneration('');
    try {
      const articleMisAJour = await appelApi('POST', `/articles/${article.id}/generer-code-barre`);
      onCodeBarreGenere(articleMisAJour);
    } catch (err) {
      setErreurGeneration(err.message);
    } finally {
      setGenerationEnCours(false);
    }
  }

  return (
    <div style={styles.carte}>
      <label style={styles.zonePhoto}>
        {article.photoUrl ? (
          <img src={article.photoUrl} alt={article.designation} style={styles.image} />
        ) : (
          <div style={styles.placeholderPhoto}>
            {envoiEnCours ? 'Envoi…' : '+ Ajouter une photo'}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={gererAjoutPhoto}
          style={{ display: 'none' }}
          disabled={envoiEnCours}
        />
      </label>

      {(photos.length > 0 || envoiEnCours) && (
        <div style={styles.galeriePhotos}>
          {photos.map((photo) => (
            <div key={photo.id} style={styles.miniature}>
              <img
                src={photo.url}
                alt=""
                onClick={() => !photo.estPrincipale && gererDefinirPrincipale(photo.id)}
                style={{
                  ...styles.imageMiniature,
                  outline: photo.estPrincipale ? '2px solid var(--gold-deep)' : 'none',
                  cursor: photo.estPrincipale ? 'default' : 'pointer',
                  opacity: actionPhotoEnCours === photo.id ? 0.5 : 1,
                }}
                title={photo.estPrincipale ? 'Photo principale' : 'Cliquer pour définir comme principale'}
              />
              {photo.estPrincipale && <span style={styles.etoilePrincipale}>★</span>}
              <button
                type="button"
                onClick={() => gererSuppressionPhoto(photo.id)}
                disabled={actionPhotoEnCours === photo.id}
                style={styles.boutonSupprimerMiniature}
                title="Supprimer cette photo"
              >
                ×
              </button>
            </div>
          ))}
          <label style={styles.miniatureAjouter}>
            {envoiEnCours ? '…' : '+'}
            <input
              type="file"
              accept="image/*"
              onChange={gererAjoutPhoto}
              style={{ display: 'none' }}
              disabled={envoiEnCours}
            />
          </label>
        </div>
      )}
      {photos.length > 1 && (
        <p style={styles.legendeEtoile}>★ = photo principale · clic sur une autre pour la changer</p>
      )}

      <div style={styles.corpsCarte}>
        <div style={styles.enTeteCorpsCarte}>
          <div style={styles.designation}>{article.designation}</div>
          <button onClick={() => onModifier(article)} style={styles.boutonModifier} title="Modifier">
            ✏️
          </button>
        </div>
        <div style={styles.reference}>{article.reference}</div>
        <div style={styles.prix}>{Number(article.prixVente).toLocaleString('fr-FR')} F</div>
        <div style={styles.stock}>
          Stock : {article.stockActuel}
          {article.stockActuel <= article.seuilAlerte && (
            <span style={styles.badgeAlerte}> ⚠ faible</span>
          )}
        </div>
        {article.codeBarre ? (
          <div style={styles.codeBarreTexte}>
            {article.codeBarre}{article.codeBarreGenere ? ' (généré)' : ''}
          </div>
        ) : (
          <button onClick={genererCodeBarre} disabled={generationEnCours} style={styles.boutonGenerer}>
            {generationEnCours ? 'Génération…' : 'Générer un code-barre'}
          </button>
        )}
        {erreurGeneration && <p style={{ color: 'var(--error)', fontSize: 11, margin: '4px 0 0' }}>{erreurGeneration}</p>}
      </div>
      {erreurPhoto && <p style={{ color: 'var(--error)', fontSize: 12, padding: '0 12px 12px' }}>{erreurPhoto}</p>}
    </div>
  );
}

function FormulaireArticle({ familles, articleEnEdition, onFermer, onFamillesMisesAJour, onCree, onModifie, onSyncArticle }) {
  const estEdition = !!articleEnEdition;

  const [designation, setDesignation] = useState(articleEnEdition?.designation || '');
  const [codeBarre, setCodeBarre] = useState(articleEnEdition?.codeBarre || '');
  const [codeInterne, setCodeInterne] = useState(articleEnEdition?.codeInterne || '');
  const [familleId, setFamilleId] = useState(articleEnEdition?.familleId ? String(articleEnEdition.familleId) : '');
  const [sousFamilleId, setSousFamilleId] = useState(articleEnEdition?.sousFamilleId ? String(articleEnEdition.sousFamilleId) : '');
  const [prixAchat, setPrixAchat] = useState(articleEnEdition?.prixAchat ?? '');
  const [prixVente, setPrixVente] = useState(articleEnEdition?.prixVente ?? '');
  const [seuilAlerte, setSeuilAlerte] = useState(articleEnEdition ? String(articleEnEdition.seuilAlerte) : '5');
  const [description, setDescription] = useState(articleEnEdition?.description || '');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Galerie photo dans le formulaire d'édition (article déjà créé uniquement)
  const [photos, setPhotos] = useState(articleEnEdition?.photos || []);
  const [photoUrlPrincipale, setPhotoUrlPrincipale] = useState(articleEnEdition?.photoUrl || null);
  const [envoiPhotoEnCours, setEnvoiPhotoEnCours] = useState(false);
  const [actionPhotoEnCours, setActionPhotoEnCours] = useState(null);
  const [erreurPhoto, setErreurPhoto] = useState('');

  // Étape "mise en stock" affichée juste après la création d'un nouvel article
  const [articleCree, setArticleCree] = useState(null);
  const [lieuxStock, setLieuxStock] = useState([]);
  const [lieuStockId, setLieuStockId] = useState('');
  const [quantiteStock, setQuantiteStock] = useState('');
  const [envoiStockEnCours, setEnvoiStockEnCours] = useState(false);
  const [erreurStock, setErreurStock] = useState('');
  const [stockAjoute, setStockAjoute] = useState(false);

  const [codeBarreGenerationEnCours, setCodeBarreGenerationEnCours] = useState(false);
  const [erreurCodeBarrePostCreation, setErreurCodeBarrePostCreation] = useState('');

  async function genererCodeBarrePostCreation() {
    setErreurCodeBarrePostCreation('');
    setCodeBarreGenerationEnCours(true);
    try {
      const article = await appelApi('POST', `/articles/${articleCree.id}/generer-code-barre`);
      setArticleCree(article);
      onSyncArticle(article);
    } catch (err) {
      setErreurCodeBarrePostCreation(err.message);
    } finally {
      setCodeBarreGenerationEnCours(false);
    }
  }

  // --- Impression d'étiquette(s) directement depuis ce panneau, sans repasser par la fenêtre Articles ---
  const [quantiteEtiquettePostCreation, setQuantiteEtiquettePostCreation] = useState('1');
  const [impressionEtiquettePostCreationEnCours, setImpressionEtiquettePostCreationEnCours] = useState(false);
  const [erreurEtiquettePostCreation, setErreurEtiquettePostCreation] = useState('');
  const [etiquetteImprimee, setEtiquetteImprimee] = useState(false);

  async function imprimerEtiquettePostCreation() {
    const quantite = Math.max(1, Number(quantiteEtiquettePostCreation) || 0);
    setErreurEtiquettePostCreation('');
    setImpressionEtiquettePostCreationEnCours(true);
    try {
      const html = await envoyerEtRecupererHtmlAvecAuth('/articles/a-imprimer/etiquettes', {
        lignes: [{ articleId: articleCree.id, quantite }],
      });
      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
      setEtiquetteImprimee(true);
    } catch (err) {
      setErreurEtiquettePostCreation(err.message);
    } finally {
      setImpressionEtiquettePostCreationEnCours(false);
    }
  }

  useEffect(() => {
    if (!estEdition) {
      appelApi('GET', '/stock/lieux').then((l) => {
        setLieuxStock(l);
        if (l.length === 1) setLieuStockId(String(l[0].id));
      }).catch(() => {});
    }
  }, [estEdition]);

  async function gererAjoutPhotoFormulaire(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    e.target.value = '';
    setEnvoiPhotoEnCours(true);
    setErreurPhoto('');
    try {
      const articleMisAJour = await uploaderPhotoArticle(articleEnEdition.id, fichier);
      setPhotos(articleMisAJour.photos || []);
      setPhotoUrlPrincipale(articleMisAJour.photoUrl);
      onModifie(articleMisAJour);
    } catch (err) {
      setErreurPhoto(err.message);
    } finally {
      setEnvoiPhotoEnCours(false);
    }
  }

  async function gererSuppressionPhotoFormulaire(photoId) {
    setActionPhotoEnCours(photoId);
    setErreurPhoto('');
    try {
      const articleMisAJour = await supprimerPhotoArticle(articleEnEdition.id, photoId);
      setPhotos(articleMisAJour.photos || []);
      setPhotoUrlPrincipale(articleMisAJour.photoUrl);
      onModifie(articleMisAJour);
    } catch (err) {
      setErreurPhoto(err.message);
    } finally {
      setActionPhotoEnCours(null);
    }
  }

  async function gererDefinirPrincipaleFormulaire(photoId) {
    setActionPhotoEnCours(photoId);
    setErreurPhoto('');
    try {
      const articleMisAJour = await definirPhotoPrincipaleArticle(articleEnEdition.id, photoId);
      setPhotos(articleMisAJour.photos || []);
      setPhotoUrlPrincipale(articleMisAJour.photoUrl);
      onModifie(articleMisAJour);
    } catch (err) {
      setErreurPhoto(err.message);
    } finally {
      setActionPhotoEnCours(null);
    }
  }

  async function gererAjoutStockInitial(e) {
    e.preventDefault();
    setErreurStock('');
    if (!lieuStockId) return setErreurStock('Choisis un dépôt/boutique.');
    const quantite = Number(quantiteStock);
    if (!quantite || quantite <= 0) return setErreurStock('Indique une quantité valide.');

    setEnvoiStockEnCours(true);
    try {
      await appelApi('POST', '/stock/receptions', {
        lieuId: Number(lieuStockId),
        lignes: [{ articleId: articleCree.id, quantite, prixAchat: articleCree.prixAchat || 0 }],
      });
      setStockAjoute(true);
      setQuantiteEtiquettePostCreation(String(quantite));
      onSyncArticle({ ...articleCree, stockActuel: (articleCree.stockActuel || 0) + quantite });
    } catch (err) {
      setErreurStock(err.message);
    } finally {
      setEnvoiStockEnCours(false);
    }
  }

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
      const misesAJour = [...familles, familleAvecSousFamilles];
      onFamillesMisesAJour(misesAJour);
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
      if (estEdition) {
        const article = await appelApi('PUT', `/articles/${articleEnEdition.id}`, {
          designation,
          familleId,
          sousFamilleId,
          prixAchat: prixAchat !== '' ? Number(prixAchat) : 0,
          prixVente: Number(prixVente),
          seuilAlerte: Number(seuilAlerte),
          description,
        });
        onModifie(article);
      } else {
        const article = await appelApi('POST', '/articles', {
          codeBarre: codeBarre.trim() || undefined,
          codeInterne: codeInterne.trim() || undefined,
          designation,
          familleId,
          sousFamilleId,
          prixAchat: prixAchat ? Number(prixAchat) : 0,
          prixVente: Number(prixVente),
          seuilAlerte: Number(seuilAlerte),
          description,
        });
        onCree(article);
        setArticleCree(article);
      }
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (articleCree) {
    return (
      <div style={styles.overlay} onClick={onFermer}>
        <div style={styles.formulaire} onClick={(e) => e.stopPropagation()}>
          <h2 style={styles.titreFormulaire}>Article créé !</h2>
          <p style={{ fontSize: 14, color: 'var(--brown-soft)', marginTop: -8 }}>
            {articleCree.designation} — référence {articleCree.reference}
          </p>

          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {articleCree.codeBarre ? (
              <p style={{ fontSize: 13, margin: 0 }}>✓ Code-barre : <strong>{articleCree.codeBarre}</strong></p>
            ) : (
              <>
                <p style={{ fontSize: 13, margin: 0, flex: 1 }}>Aucun code-barre pour cet article.</p>
                <button
                  type="button"
                  onClick={genererCodeBarrePostCreation}
                  disabled={codeBarreGenerationEnCours}
                  style={styles.boutonGenerer}
                >
                  {codeBarreGenerationEnCours ? 'Génération…' : 'Générer un code-barre'}
                </button>
              </>
            )}
          </div>
          {erreurCodeBarrePostCreation && <p style={{ color: 'var(--error)' }}>{erreurCodeBarrePostCreation}</p>}

          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--cream)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!etiquetteImprimee ? (
              <>
                <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>🖨️ Étiquette(s) à imprimer</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min="1"
                    style={{ ...styles.champInput, width: 90 }}
                    value={quantiteEtiquettePostCreation}
                    onChange={(e) => setQuantiteEtiquettePostCreation(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={imprimerEtiquettePostCreation}
                    disabled={impressionEtiquettePostCreationEnCours}
                    style={styles.boutonGenerer}
                  >
                    {impressionEtiquettePostCreationEnCours ? 'Impression…' : 'Imprimer'}
                  </button>
                </div>
                {erreurEtiquettePostCreation && <p style={{ color: 'var(--error)', margin: 0 }}>{erreurEtiquettePostCreation}</p>}
              </>
            ) : (
              <p style={{ fontSize: 13, margin: 0, color: 'var(--succes)', fontWeight: 700 }}>✓ Étiquette(s) envoyée(s) à l'impression.</p>
            )}
          </div>

          {!stockAjoute ? (
            <>
              <p style={{ fontSize: 14 }}>Veux-tu le mettre en stock dès maintenant ?</p>
              {erreurStock && <p style={{ color: 'var(--error)' }}>{erreurStock}</p>}
              <form onSubmit={gererAjoutStockInitial} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={styles.champLabel}>
                  Dépôt / boutique *
                  <select style={styles.champInput} value={lieuStockId} onChange={(e) => setLieuStockId(e.target.value)} required>
                    <option value="">— Choisir —</option>
                    {lieuxStock.map((l) => (
                      <option key={l.id} value={l.id}>{l.nom}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.champLabel}>
                  Quantité *
                  <input
                    type="number" min="1" style={styles.champInput}
                    value={quantiteStock} onChange={(e) => setQuantiteStock(e.target.value)} required
                  />
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={onFermer} style={styles.boutonAnnuler}>Plus tard</button>
                  <button type="submit" disabled={envoiStockEnCours} style={styles.boutonValider}>
                    {envoiStockEnCours ? 'Ajout…' : 'Ajouter au stock'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--succes)', fontWeight: 700 }}>✓ Stock ajouté avec succès.</p>
              <button type="button" onClick={onFermer} style={styles.boutonValider}>Terminer</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onFermer}>
      <form style={styles.formulaire} onClick={(e) => e.stopPropagation()} onSubmit={gererSoumission}>
        <h2 style={styles.titreFormulaire}>{estEdition ? 'Modifier l\'article' : 'Nouvel article'}</h2>

        {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}

        <label style={styles.champLabel}>
          Désignation *
          <input style={styles.champInput} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </label>

        {estEdition && (
          <p style={{ fontSize: 12, color: 'var(--brown-soft)' }}>
            Référence : {articleEnEdition.reference} (non modifiable)
          </p>
        )}

        {estEdition && (
          <div style={{ margin: '4px 0 8px' }}>
            <p style={{ fontSize: 12, color: 'var(--brown-soft)', fontWeight: 700, marginBottom: 6 }}>Photos</p>
            <div style={styles.galeriePhotos}>
              {photos.map((photo) => (
                <div key={photo.id} style={styles.miniature}>
                  <img
                    src={photo.url}
                    alt=""
                    onClick={() => !photo.estPrincipale && gererDefinirPrincipaleFormulaire(photo.id)}
                    style={{
                      ...styles.imageMiniature,
                      outline: photo.estPrincipale ? '2px solid var(--gold-deep)' : 'none',
                      cursor: photo.estPrincipale ? 'default' : 'pointer',
                      opacity: actionPhotoEnCours === photo.id ? 0.5 : 1,
                    }}
                    title={photo.estPrincipale ? 'Photo principale' : 'Cliquer pour définir comme principale'}
                  />
                  {photo.estPrincipale && <span style={styles.etoilePrincipale}>★</span>}
                  <button
                    type="button"
                    onClick={() => gererSuppressionPhotoFormulaire(photo.id)}
                    disabled={actionPhotoEnCours === photo.id}
                    style={styles.boutonSupprimerMiniature}
                    title="Supprimer cette photo"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label style={styles.miniatureAjouterFormulaire}>
                {envoiPhotoEnCours ? '…' : '+ Ajouter'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={gererAjoutPhotoFormulaire}
                  style={{ display: 'none' }}
                  disabled={envoiPhotoEnCours}
                />
              </label>
            </div>
            {photos.length > 1 && (
              <p style={styles.legendeEtoile}>★ = photo principale · clic sur une autre pour la changer</p>
            )}
            {erreurPhoto && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{erreurPhoto}</p>}
          </div>
        )}

        <label style={styles.champLabel}>
          Description (optionnel)
          <textarea
            style={styles.champTextarea}
            placeholder="Matières, entretien, précisions utiles…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {!estEdition && (
          <>
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
          </>
        )}

        {estEdition && articleEnEdition.codeBarre && (
          <p style={{ fontSize: 12, color: 'var(--brown-soft)' }}>
            Code-barre : {articleEnEdition.codeBarre} (non modifiable ici)
          </p>
        )}

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
            {envoiEnCours ? 'Enregistrement…' : (estEdition ? 'Enregistrer' : 'Créer')}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  enTete: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  boutonAjouter: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  boutonImprimer: { padding: '10px 18px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', color: 'var(--brown-ink)', cursor: 'pointer', fontWeight: 600 },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 },
  carte: { background: 'var(--white)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(74,44,23,0.12)' },
  zonePhoto: { display: 'block', cursor: 'pointer', aspectRatio: '1 / 1', background: 'var(--cream-deep)' },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholderPhoto: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-soft)', fontSize: 13, textAlign: 'center', padding: 12 },
  galeriePhotos: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px 0' },
  miniature: { position: 'relative', width: 40, height: 40, flexShrink: 0 },
  imageMiniature: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 },
  etoilePrincipale: {
    position: 'absolute', top: -6, left: -6, width: 18, height: 18, borderRadius: '50%',
    background: 'var(--gold-deep)', color: 'var(--white)', fontSize: 11, lineHeight: '18px',
    textAlign: 'center', boxShadow: '0 0 0 2px var(--white)',
  },
  legendeEtoile: { fontSize: 11, color: 'var(--brown-soft)', margin: '6px 12px 0' },
  boutonSupprimerMiniature: {
    position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%',
    border: 'none', background: 'var(--error)', color: 'var(--white)', fontSize: 11, lineHeight: '16px',
    padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  miniatureAjouter: {
    width: 40, height: 40, flexShrink: 0, borderRadius: 6, border: '1px dashed var(--brown-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    color: 'var(--brown-soft)', fontSize: 16, fontWeight: 700,
  },
  miniatureAjouterFormulaire: {
    width: 64, height: 64, flexShrink: 0, borderRadius: 8, border: '1px dashed var(--brown-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    color: 'var(--brown-soft)', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: 4,
  },
  corpsCarte: { padding: 12 },
  enTeteCorpsCarte: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  boutonModifier: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 },
  designation: { fontWeight: 600, fontSize: 14, marginBottom: 4 },
  reference: { fontSize: 12, color: 'var(--brown-soft)', marginBottom: 6 },
  prix: { fontSize: 16, fontWeight: 700, color: 'var(--gold-deep)', marginBottom: 4 },
  stock: { fontSize: 12, color: 'var(--brown-soft)' },
  badgeAlerte: { color: 'var(--error)', fontWeight: 600 },
  codeBarreTexte: { fontSize: 11, color: 'var(--brown-soft)', marginTop: 6, fontFamily: 'monospace' },
  boutonGenerer: { marginTop: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gold-mid)', background: 'transparent', color: 'var(--brown-ink)', cursor: 'pointer', fontSize: 11 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(46,26,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 },
  formulaire: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  titreFormulaire: { fontFamily: 'var(--font-display)', margin: 0, marginBottom: 8 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 },
  champInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  champTextarea: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, fontFamily: 'inherit', minHeight: 70, resize: 'vertical' },
  ligneAvecBouton: { display: 'flex', gap: 6, alignItems: 'stretch' },
  boutonPlus: { padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 700, fontSize: 16 },
  blocCreationRapide: { display: 'flex', gap: 6, padding: 10, background: 'var(--cream)', borderRadius: 8 },
  boutonValiderPetit: { padding: '8px 12px', borderRadius: 6, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  panneauEtiquettes: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  listeEtiquettes: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' },
  ligneEtiquette: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--cream)' },
  champQuantite: { width: 70, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, textAlign: 'center' },
  champQuantite2: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, boxSizing: 'border-box' },
  boutonEditer: { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--brown-soft)', fontSize: 13 },
};