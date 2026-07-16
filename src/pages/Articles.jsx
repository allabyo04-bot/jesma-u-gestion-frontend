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
  const [nombreAImprimer, setNombreAImprimer] = useState(0);

  useEffect(() => {
    Promise.all([appelApi('GET', '/articles'), appelApi('GET', '/familles')])
      .then(([listeArticles, listeFamilles]) => {
        setArticles(listeArticles);
        setFamilles(listeFamilles);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
    rafraichirCompteurImpression();
  }, []);

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
          <button onClick={() => setFormulaireOuvert(true)} style={styles.boutonAjouter}>
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
            />
          ))}
          {articles.length === 0 && <p>Aucun article pour l'instant.</p>}
        </div>
      )}

      {formulaireOuvert && (
        <FormulaireArticle
          familles={familles}
          onFermer={() => setFormulaireOuvert(false)}
          onCree={(article) => {
            ajouterArticleALaListe(article);
            setFormulaireOuvert(false);
          }}
        />
      )}
    </div>
  );
}

function CarteArticle({ article, onPhotoMiseAJour, onCodeBarreGenere }) {
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
        <div style={styles.designation}>{article.designation}</div>
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

function FormulaireArticle({ familles, onFermer, onCree }) {
  const [designation, setDesignation] = useState('');
  const [reference, setReference] = useState('');
  const [codeBarre, setCodeBarre] = useState('');
  const [codeInterne, setCodeInterne] = useState('');
  const [familleId, setFamilleId] = useState('');
  const [sousFamilleId, setSousFamilleId] = useState('');
  const [prixAchat, setPrixAchat] = useState('');
  const [prixVente, setPrixVente] = useState('');
  const [seuilAlerte, setSeuilAlerte] = useState('5');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const familleSelectionnee = familles.find((f) => f.id === Number(familleId));
  const sousFamillesDisponibles = familleSelectionnee?.sousFamilles || [];

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');

    if (!designation || !reference || !prixVente) {
      setErreur('Désignation, référence et prix de vente sont requis.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const article = await appelApi('POST', '/articles', {
        reference,
        codeBarre: codeBarre.trim() || undefined,
        codeInterne: codeInterne.trim() || undefined,
        designation,
        familleId: familleId || null,
        sousFamilleId: sousFamilleId || null,
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
          <input style={styles.champInput} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </label>

        <label style={styles.champLabel}>
          Référence *
          <input style={styles.champInput} value={reference} onChange={(e) => setReference(e.target.value)} />
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

        <label