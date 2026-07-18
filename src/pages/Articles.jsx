import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, uploaderPhotoArticle, recupererHtmlAvecAuth } from '../lib/api';

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

  async function ouvrirImpressionEtiquettes() {
    try {
      const html = await recupererHtmlAvecAuth('/articles/a-imprimer/etiquettes');
      const fenetre = window.open('', '_blank');
      fenetre.document.write(html);
      fenetre.document.close();
    } catch (err) {
      alert("Impossible d'ouvrir les étiquettes : " + err.message);
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
            <button onClick={ouvrirImpressionEtiquettes} style={styles.boutonImprimer}>
              🖨️ Étiquettes à imprimer ({nombreAImprimer})
            </button>
          )}
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
            setFormulaireOuvert(false);
          }}
          onModifie={(article) => {
            mettreAJourArticle(article);
            setFormulaireOuvert(false);
          }}
        />
      )}
    </div>
  );
}

function CarteArticle({ article, onPhotoMiseAJour, onCodeBarreGenere, onModifier }) {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState('');
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [erreurGeneration, setErreurGeneration] = useState('');

  async function gererChangementPhoto(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
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
          onChange={gererChangementPhoto}
          style={{ display: 'none' }}
          disabled={envoiEnCours}
        />
      </label>
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

function FormulaireArticle({ familles, articleEnEdition, onFermer, onFamillesMisesAJour, onCree, onModifie }) {
  const estEdition = !!articleEnEdition;

  const [designation, setDesignation] = useState(articleEnEdition?.designation || '');
  const [codeBarre, setCodeBarre] = useState(articleEnEdition?.codeBarre || '');
  const [codeInterne, setCodeInterne] = useState(articleEnEdition?.codeInterne || '');
  const [familleId, setFamilleId] = useState(articleEnEdition?.familleId ? String(articleEnEdition.familleId) : '');
  const [sousFamilleId, setSousFamilleId] = useState(articleEnEdition?.sousFamilleId ? String(articleEnEdition.sousFamilleId) : '');
  const [prixAchat, setPrixAchat] = useState(articleEnEdition?.prixAchat ?? '');
  const [prixVente, setPrixVente] = useState(articleEnEdition?.prixVente ?? '');
  const [seuilAlerte, setSeuilAlerte] = useState(articleEnEdition ? String(articleEnEdition.seuilAlerte) : '5');
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
        });
        onCree(article);
      }
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
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
  ligneAvecBouton: { display: 'flex', gap: 6, alignItems: 'stretch' },
  boutonPlus: { padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 700, fontSize: 16 },
  blocCreationRapide: { display: 'flex', gap: 6, padding: 10, background: 'var(--cream)', borderRadius: 8 },
  boutonValiderPetit: { padding: '8px 12px', borderRadius: 6, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};