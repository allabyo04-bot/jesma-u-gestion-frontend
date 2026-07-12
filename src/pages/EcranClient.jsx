import { useEffect, useState } from 'react';
import { ecouterCanal, demanderEtatActuel } from '../lib/broadcast';

// Écran destiné à faire face au client sur la borne double écran. Ne fait qu'afficher —
// toute la logique (recherche, paiement, validation) reste côté écran vendeur, qui diffuse
// son état via BroadcastChannel. Cet écran n'appelle jamais l'API directement.
export default function EcranClient() {
  const [etat, setEtat] = useState(null);
  const [venteValidee, setVenteValidee] = useState(null);

  useEffect(() => {
    const arreterEcoute = ecouterCanal((message) => {
      if (message.type === 'ETAT_PANIER') {
        setEtat(message.payload);
        setVenteValidee(null);
      } else if (message.type === 'VENTE_VALIDEE') {
        setVenteValidee(message.payload);
        setEtat(null);
      }
    });
    demanderEtatActuel();
    return arreterEcoute;
  }, []);

  if (venteValidee) {
    return (
      <div style={styles.pageRemerciement}>
        <div style={styles.iconeMerci}>✅</div>
        <h1 style={styles.titreMerci}>Merci pour votre visite !</h1>
        <div style={styles.totalMerci}>
          {Number(venteValidee.totalNet).toLocaleString('fr-FR')} F
        </div>
        <p style={styles.sousTitreMerci}>À bientôt chez Jesma U</p>
      </div>
    );
  }

  const panier = etat?.panier || [];
  const totalBrut = panier.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
  const remise = etat?.remise || 0;
  const totalNet = totalBrut - remise;

  return (
    <div style={styles.page}>
      <header style={styles.entete}>
        <div style={styles.logoRond}>U</div>
        <h1 style={styles.titrePrincipal}>Jesma U</h1>
      </header>

      {panier.length === 0 ? (
        <div style={styles.attenteVide}>
          <p style={styles.texteAttente}>Bienvenue chez Jesma U</p>
          <p style={styles.sousTexteAttente}>La gestion de votre boutique, avec la douceur de Jesma U.</p>
        </div>
      ) : (
        <>
          <div style={styles.listeArticles}>
            {panier.map((ligne) => (
              <div key={ligne.articleId} style={styles.carteArticle}>
                {ligne.photoUrl ? (
                  <img src={ligne.photoUrl} alt={ligne.designation} style={styles.photoArticle} />
                ) : (
                  <div style={styles.placeholderPhoto}>📦</div>
                )}
                <div style={styles.infosArticle}>
                  <div style={styles.designationArticle}>{ligne.designation}</div>
                  <div style={styles.detailArticle}>
                    {ligne.prixUnitaire.toLocaleString('fr-FR')} F × {ligne.quantite}
                  </div>
                </div>
                <div style={styles.sousTotalArticle}>
                  {(ligne.prixUnitaire * ligne.quantite).toLocaleString('fr-FR')} F
                </div>
              </div>
            ))}
          </div>

          <footer style={styles.piedTotal}>
            {remise > 0 && (
              <div style={styles.ligneRemise}>
                Remise : −{remise.toLocaleString('fr-FR')} F
              </div>
            )}
            <div style={styles.totalGeant}>
              {totalNet.toLocaleString('fr-FR')} F
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: 'var(--cream)', fontFamily: 'var(--font-body)', color: 'var(--brown-ink)',
  },
  entete: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '24px 32px',
    background: 'var(--brown-deep)', color: 'var(--cream)',
  },
  logoRond: {
    width: 48, height: 48, borderRadius: '50%', background: 'var(--gold-deep)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--white)',
  },
  titrePrincipal: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  attenteVide: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', textAlign: 'center', padding: 40,
  },
  texteAttente: { fontFamily: 'var(--font-display)', fontSize: 36, margin: 0, color: 'var(--gold-deep)' },
  sousTexteAttente: { fontSize: 16, color: 'var(--brown-soft)', marginTop: 12 },
  listeArticles: { flex: 1, overflowY: 'auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 14 },
  carteArticle: {
    display: 'flex', alignItems: 'center', gap: 16, background: 'var(--white)',
    borderRadius: 14, padding: 14, boxShadow: '0 2px 8px rgba(74,44,23,0.1)',
  },
  photoArticle: { width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 },
  placeholderPhoto: {
    width: 64, height: 64, borderRadius: 10, background: 'var(--cream-deep)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0,
  },
  infosArticle: { flex: 1 },
  designationArticle: { fontSize: 20, fontWeight: 700 },
  detailArticle: { fontSize: 15, color: 'var(--brown-soft)', marginTop: 2 },
  sousTotalArticle: { fontSize: 22, fontWeight: 700, color: 'var(--gold-deep)' },
  piedTotal: { padding: '20px 32px', background: 'var(--brown-deep)', color: 'var(--white)' },
  ligneRemise: { fontSize: 16, color: 'var(--gold-light)', marginBottom: 6, textAlign: 'right' },
  totalGeant: { fontSize: 48, fontWeight: 800, textAlign: 'right' },
  pageRemerciement: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', background: 'var(--gold-deep)', color: 'var(--white)', textAlign: 'center',
  },
  iconeMerci: { fontSize: 72, marginBottom: 16 },
  titreMerci: { fontFamily: 'var(--font-display)', fontSize: 40, margin: 0 },
  totalMerci: { fontSize: 56, fontWeight: 800, marginTop: 24 },
  sousTitreMerci: { fontSize: 18, marginTop: 16, opacity: 0.9 },
};
