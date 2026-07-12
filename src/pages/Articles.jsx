import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, uploaderPhotoArticle } from '../lib/api';

export default function Articles() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  useEffect(() => {
    Promise.all([appelApi('GET', '/articles'), appelApi('GET', '/familles')])
      .then(([listeArticles, listeFamilles]) => {
        setArticles(listeArticles);
        setFamilles(listeFamilles);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, []);

  function ajouterArticleALaListe(article) {
    setArticles((prec) => [article, ...prec]);
  }

  function mettreAJourArticle(article) {
    setArticles((prec) => prec.map((a) => (a.id === article.id ? article : a)));
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <h1 style={styles.titre}>Articles</h1>
        <button onClick={() => setFormulaireOuvert(true)} style={styles.boutonAjouter}>
          + Nouvel article
        </button>
      </div>

      {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}
      {chargement && <p>Chargement…</p>}

      {!chargement && (
        <div style={styles.grille}>
          {articles.map((article) => (
            <CarteArticle key={article.id} article={article} onPhotoMiseAJour={mettreAJourArticle} />
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

function CarteArticle({ article, onPhotoMiseAJour }) {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState('');

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
      </div>
      {erreurPhoto && <p style={{ color: 'var(--error)', fontSize: 12, padding: '0 12px 12px' }}>{erreurPhoto}</p>}
    </div>
  );
}

function FormulaireArticle({ familles, onFermer, onCree }) {
  const [designation, setDesignation] = useState('');
  const [reference, setReference] = useState('');
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
          Famille
          <select
            style={styles.champInput}
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
        </label>

        {sousFamillesDisponibles.length > 0 && (
          <label style={styles.champLabel}>
            Sous-famille
            <select style={styles.champInput} value={sousFamilleId} onChange={(e) => setSousFamilleId(e.target.value)}>
              <option value="">—</option>
              {sousFamillesDisponibles.map((sf) => (
                <option key={sf.id} value={sf.id}>{sf.nom}</option>
              ))}
            </select>
          </label>
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
            {envoiEnCours ? 'Création…' : 'Créer'}
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
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 },
  carte: { background: 'var(--white)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(74,44,23,0.12)' },
  zonePhoto: { display: 'block', cursor: 'pointer', aspectRatio: '1 / 1', background: 'var(--cream-deep)' },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholderPhoto: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-soft)', fontSize: 13, textAlign: 'center', padding: 12 },
  corpsCarte: { padding: 12 },
  designation: { fontWeight: 600, fontSize: 14, marginBottom: 4 },
  reference: { fontSize: 12, color: 'var(--brown-soft)', marginBottom: 6 },
  prix: { fontSize: 16, fontWeight: 700, color: 'var(--gold-deep)', marginBottom: 4 },
  stock: { fontSize: 12, color: 'var(--brown-soft)' },
  badgeAlerte: { color: 'var(--error)', fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(46,26,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 },
  formulaire: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  titreFormulaire: { fontFamily: 'var(--font-display)', margin: 0, marginBottom: 8 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 },
  champInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};