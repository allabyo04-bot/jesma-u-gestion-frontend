import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { appelApiPublic } from '../lib/api';

const MODES_PAIEMENT = [
  'Espèces', 'Moov Money', 'MTN Money', 'Orange Money',
  'Wave', 'Carte bancaire',
];

// Page publique consultée via le lien partagé (ex: WhatsApp, SMS). Aucune connexion requise.
// Affiche la liste de naissance/anniversaire avec, pour chaque article, ce qui a déjà été
// offert par d'autres proches et ce qu'il reste à offrir — pour éviter les doublons.
export default function ListeCadeauPublique() {
  const { codeAcces } = useParams();
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    appelApiPublic('GET', `/listes-cadeaux/publique/${codeAcces}`)
      .then(setListe)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, [codeAcces]);

  const [typePaiement, setTypePaiement] = useState('carte'); // 'carte' | 'autre'
  const [carteCadeauCode, setCarteCadeauCode] = useState('');
  const [modePaiementChoisi, setModePaiementChoisi] = useState(MODES_PAIEMENT[0]);
  const [offrePar, setOffrePar] = useState('');
  const [quantitesChoisies, setQuantitesChoisies] = useState({});
  const [erreurOffre, setErreurOffre] = useState('');
  const [resultatOffre, setResultatOffre] = useState(null); // { statutConfirmation }
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Montant calculé automatiquement à partir des articles/quantités sélectionnés — jamais
  // saisi librement, pour garantir que ce qui est déclaré correspond à ce qui est offert.
  const montantCalcule = liste
    ? liste.lignes.reduce((total, l) => {
        const q = Number(quantitesChoisies[l.id]) || 0;
        return total + q * Number(l.article.prixVente);
      }, 0)
    : 0;

  function changerQuantiteChoisie(ligneId, valeur, restant) {
    const v = Math.max(0, Math.min(Number(valeur) || 0, restant));
    setQuantitesChoisies((prec) => ({ ...prec, [ligneId]: v }));
  }

  async function offrir(e) {
    e.preventDefault();
    setErreurOffre('');
    setResultatOffre(null);

    if (typePaiement === 'carte' && !carteCadeauCode.trim()) {
      setErreurOffre('Le code de votre carte cadeau est requis.');
      return;
    }

    const lignesChoisies = Object.entries(quantitesChoisies)
      .filter(([, q]) => Number(q) > 0)
      .map(([ligneId, quantite]) => ({ ligneId: Number(ligneId), quantite: Number(quantite) }));

    if (lignesChoisies.length === 0) {
      setErreurOffre('Choisissez au moins un article à offrir.');
      return;
    }
    if (typePaiement === 'autre' && montantCalcule <= 0) {
      setErreurOffre('Choisissez au moins un article à offrir avant de payer.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const reponse = await appelApiPublic('POST', `/listes-cadeaux/publique/${codeAcces}/offrir`, {
        carteCadeauCode: typePaiement === 'carte' ? carteCadeauCode.trim() : undefined,
        modePaiement: typePaiement === 'autre' ? modePaiementChoisi : undefined,
        montant: typePaiement === 'autre' ? montantCalcule : undefined,
        offrePar: offrePar || undefined,
        lignes: lignesChoisies,
      });
      setResultatOffre(reponse);
      const misAJour = await appelApiPublic('GET', `/listes-cadeaux/publique/${codeAcces}`);
      setListe(misAJour);
      setCarteCadeauCode('');
      setOffrePar('');
      setQuantitesChoisies({});
    } catch (err) {
      setErreurOffre(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement) {
    return <div style={styles.pageChargement}>Chargement…</div>;
  }

  if (erreur) {
    return (
      <div style={styles.pageErreur}>
        <h1 style={styles.titreErreur}>Liste introuvable</h1>
        <p>{erreur}</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.entete}>
        <div style={styles.logoRond}>U</div>
        <div>
          <h1 style={styles.titrePrincipal}>Jesma U</h1>
          <p style={styles.sousTitre}>Liste cadeau</p>
        </div>
      </header>

      <div style={styles.contenu}>
        <h2 style={styles.titreListe}>{liste.titre || `Liste de ${liste.client.nomComplet}`}</h2>
        <p style={styles.texteMuet}>Pour {liste.client.nomComplet}</p>

        <div style={styles.listeArticles}>
          {liste.lignes.map((l) => (
            <div key={l.id} style={styles.carteArticle}>
              <div style={styles.infosArticle}>
                <div style={styles.designationArticle}>{l.article.designation}</div>
                <div style={styles.texteMuet}>
                  {Number(l.article.prixVente).toLocaleString('fr-FR')} F pièce
                </div>
              </div>
              <div style={styles.compteursArticle}>
                <div style={styles.compteur}>
                  <span style={styles.chiffreCompteur}>{l.quantiteSouhaitee}</span>
                  <span style={styles.libelleCompteur}>souhaités</span>
                </div>
                <div style={styles.compteur}>
                  <span style={styles.chiffreCompteur}>{l.quantiteOfferte}</span>
                  <span style={styles.libelleCompteur}>déjà offerts</span>
                </div>
                <div style={styles.compteurRestant}>
                  <span style={styles.chiffreRestant}>{l.quantiteRestante}</span>
                  <span style={styles.libelleCompteur}>restants</span>
                </div>
              </div>
              {l.quantiteRestante > 0 && (
                <input
                  type="number"
                  min="0"
                  max={l.quantiteRestante}
                  style={styles.champQuantite}
                  placeholder="0"
                  value={quantitesChoisies[l.id] || ''}
                  onChange={(e) => changerQuantiteChoisie(l.id, e.target.value, l.quantiteRestante)}
                />
              )}
              {l.quantiteRestante === 0 && (
                <div style={styles.badgeComplet}>✓ Complet</div>
              )}
            </div>
          ))}
        </div>

        <div style={styles.blocOffrir}>
          <h3 style={styles.titreOffrir}>Vous souhaitez offrir un cadeau ?</h3>
          <p style={styles.texteMuet}>
            Choisissez vos articles ci-dessus, puis payez avec une carte cadeau Jesma U ou un autre moyen.
          </p>

          {resultatOffre && resultatOffre.statutConfirmation === 'CONFIRME' && (
            <div style={styles.bandeauConfirmation}>
              Merci pour votre générosité ! Votre cadeau a bien été enregistré. 💛
            </div>
          )}
          {resultatOffre && resultatOffre.statutConfirmation === 'EN_ATTENTE_VERIFICATION' && (
            <div style={styles.bandeauAttente}>
              Merci ! Votre don a bien été réservé. La boutique va vérifier la réception de votre
              paiement ({modePaiementChoisi}) avant confirmation définitive. 💛
            </div>
          )}
          {erreurOffre && <div style={styles.bandeauErreur}>{erreurOffre}</div>}

          <div style={styles.togglePaiement}>
            <button
              type="button"
              onClick={() => setTypePaiement('carte')}
              style={typePaiement === 'carte' ? styles.toggleActif : styles.toggle}
            >
              Carte cadeau
            </button>
            <button
              type="button"
              onClick={() => setTypePaiement('autre')}
              style={typePaiement === 'autre' ? styles.toggleActif : styles.toggle}
            >
              Autre moyen de paiement
            </button>
          </div>

          <form onSubmit={offrir} style={styles.formOffrir}>
            {typePaiement === 'carte' ? (
              <input
                style={styles.champInput}
                value={carteCadeauCode}
                onChange={(e) => setCarteCadeauCode(e.target.value)}
                placeholder="Code de votre carte cadeau"
              />
            ) : (
              <>
                <select style={styles.champInput} value={modePaiementChoisi} onChange={(e) => setModePaiementChoisi(e.target.value)}>
                  {MODES_PAIEMENT.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div style={styles.montantCalcule}>
                  Montant à envoyer : <strong>{montantCalcule.toLocaleString('fr-FR')} F</strong>
                </div>
                <p style={styles.texteAide}>
                  Envoyez ce montant au +225 07 69 535 786, puis cliquez sur "Offrir ce cadeau".
                  La boutique vérifiera la réception avant de confirmer votre don.
                </p>
              </>
            )}
            <input
              style={styles.champInput}
              value={offrePar}
              onChange={(e) => setOffrePar(e.target.value)}
              placeholder="Votre nom (optionnel)"
            />
            <button type="submit" disabled={envoiEnCours} style={styles.boutonOffrir}>
              {envoiEnCours ? 'Envoi…' : 'Offrir ce cadeau'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageChargement: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', fontFamily: 'var(--font-body)' },
  pageErreur: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', fontFamily: 'var(--font-body)', textAlign: 'center', padding: 40 },
  titreErreur: { fontFamily: 'var(--font-display)', color: 'var(--brown-ink)' },
  page: { minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  entete: { display: 'flex', alignItems: 'center', gap: 16, padding: '24px 20px', background: 'var(--brown-deep)', color: 'var(--cream)' },
  logoRond: { width: 48, height: 48, borderRadius: '50%', background: 'var(--gold-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--white)', flexShrink: 0 },
  titrePrincipal: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 22 },
  sousTitre: { margin: 0, fontSize: 13, opacity: 0.85 },
  contenu: { maxWidth: 640, margin: '0 auto', padding: '24px 20px' },
  titreListe: { fontFamily: 'var(--font-display)', fontSize: 26, margin: '0 0 4px 0' },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)', margin: 0 },
  texteAide: { fontSize: 12, color: 'var(--brown-soft)', margin: '-4px 0 0 0', fontStyle: 'italic' },
  listeArticles: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 },
  carteArticle: { background: 'var(--white)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(74,44,23,0.08)' },
  infosArticle: {},
  designationArticle: { fontSize: 16, fontWeight: 700 },
  compteursArticle: { display: 'flex', gap: 20 },
  compteur: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  compteurRestant: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 'auto' },
  chiffreCompteur: { fontSize: 20, fontWeight: 700, color: 'var(--brown-soft)' },
  chiffreRestant: { fontSize: 24, fontWeight: 800, color: 'var(--gold-deep)' },
  libelleCompteur: { fontSize: 11, color: 'var(--brown-soft)' },
  champQuantite: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, width: '100%' },
  badgeComplet: { textAlign: 'center', padding: '8px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontWeight: 600, fontSize: 13 },
  blocOffrir: { marginTop: 28, background: 'var(--white)', borderRadius: 14, padding: 20 },
  titreOffrir: { margin: '0 0 6px 0', fontSize: 17, fontFamily: 'var(--font-display)' },
  bandeauConfirmation: { padding: '10px 14px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontSize: 13, fontWeight: 600, marginTop: 12 },
  bandeauAttente: { padding: '10px 14px', borderRadius: 8, background: '#FFF3D6', color: '#8A6300', fontSize: 13, fontWeight: 600, marginTop: 12 },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 13, fontWeight: 600, marginTop: 12 },
  togglePaiement: { display: 'flex', gap: 8, marginTop: 16, marginBottom: 12 },
  toggle: { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--brown-ink)' },
  toggleActif: { flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  montantCalcule: { padding: '10px 12px', borderRadius: 8, background: 'var(--cream)', fontSize: 15, color: 'var(--brown-ink)', textAlign: 'center' },
  formOffrir: { display: 'flex', flexDirection: 'column', gap: 10 },
  champInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  boutonOffrir: { padding: '12px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 15 },
};
