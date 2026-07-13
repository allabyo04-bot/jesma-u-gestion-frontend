import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

const SOUS_ONGLETS = [
  { id: 'nouvelle', label: 'Nouvelle liste' },
  { id: 'existantes', label: 'Listes existantes' },
  { id: 'en-attente', label: 'Offres en attente' },
];

const MODES_PAIEMENT = [
  'Espèces', 'Moov Money', 'MTN Money', 'Orange Money',
  'Wave', 'Carte bancaire', 'Bon d\'achat',
];

export default function ListesCadeaux() {
  const navigate = useNavigate();
  const [ongletActif, setOngletActif] = useState('nouvelle');
  const [articles, setArticles] = useState([]);
  const [listes, setListes] = useState([]);
  const [chargementListes, setChargementListes] = useState(true);

  useEffect(() => {
    appelApi('GET', '/articles').then(setArticles).catch(() => {});
    chargerListes();
  }, []);

  function chargerListes() {
    setChargementListes(true);
    appelApi('GET', '/listes-cadeaux')
      .then(setListes)
      .catch(() => {})
      .finally(() => setChargementListes(false));
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <h1 style={styles.titre}>Listes cadeaux</h1>
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

      {ongletActif === 'nouvelle' && (
        <OngletNouvelleListe articles={articles} onCreee={() => { chargerListes(); setOngletActif('existantes'); }} />
      )}
      {ongletActif === 'existantes' && (
        <OngletListesExistantes listes={listes} chargement={chargementListes} onRafraichir={chargerListes} />
      )}
      {ongletActif === 'en-attente' && <OngletOffresEnAttente />}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET NOUVELLE LISTE
// ------------------------------------------------------------
function OngletNouvelleListe({ articles, onCreee }) {
  const [rechercheClient, setRechercheClient] = useState('');
  const [resultatsClient, setResultatsClient] = useState([]);
  const [clientChoisi, setClientChoisi] = useState(null);
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauTelephone, setNouveauTelephone] = useState('');

  const [titre, setTitre] = useState('');
  const [nomDestinataire, setNomDestinataire] = useState('');
  const [telephoneDestinataire1, setTelephoneDestinataire1] = useState('');
  const [telephoneDestinataire2, setTelephoneDestinataire2] = useState('');
  const [emailDestinataire, setEmailDestinataire] = useState('');
  const [nomDonateur, setNomDonateur] = useState('');
  const [telephoneDonateur, setTelephoneDonateur] = useState('');
  const [emailDonateur, setEmailDonateur] = useState('');
  const [lignes, setLignes] = useState([]);
  const [articleAAjouter, setArticleAAjouter] = useState('');
  const [quantiteAAjouter, setQuantiteAAjouter] = useState('1');

  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function rechercherClient(e) {
    e.preventDefault();
    if (!rechercheClient.trim()) return;
    try {
      const resultats = await appelApi('GET', `/clients?q=${encodeURIComponent(rechercheClient.trim())}`);
      setResultatsClient(resultats);
    } catch {
      setResultatsClient([]);
    }
  }

  async function creerNouveauClient() {
    if (!nouveauNom.trim()) return;
    try {
      const client = await appelApi('POST', '/clients', {
        nomComplet: nouveauNom.trim(),
        telephone: nouveauTelephone.trim() || undefined,
      });
      setClientChoisi(client);
      setResultatsClient([]);
      setNouveauNom('');
      setNouveauTelephone('');
    } catch (err) {
      setErreur(err.message);
    }
  }

  function ajouterLigne() {
    if (!articleAAjouter || Number(quantiteAAjouter) <= 0) return;
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

  async function validerListe() {
    setErreur('');
    setSucces(null);
    if (!clientChoisi) {
      setErreur('Sélectionnez ou créez un client.');
      return;
    }
    if (lignes.length === 0) {
      setErreur('Ajoutez au moins un article souhaité.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const liste = await appelApi('POST', '/listes-cadeaux', {
        clientId: clientChoisi.id,
        titre: titre || undefined,
        nomDestinataire: nomDestinataire || undefined,
        telephoneDestinataire1: telephoneDestinataire1 || undefined,
        telephoneDestinataire2: telephoneDestinataire2 || undefined,
        emailDestinataire: emailDestinataire || undefined,
        nomDonateur: nomDonateur || undefined,
        telephoneDonateur: telephoneDonateur || undefined,
        emailDonateur: emailDonateur || undefined,
        lignes: lignes.map((l) => ({ articleId: l.articleId, quantiteSouhaitee: l.quantite })),
      });
      setSucces(liste);
      setClientChoisi(null);
      setTitre('');
      setNomDestinataire('');
      setTelephoneDestinataire1('');
      setTelephoneDestinataire2('');
      setEmailDestinataire('');
      setNomDonateur('');
      setTelephoneDonateur('');
      setEmailDonateur('');
      setLignes([]);
      onCreee();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.carte}>
      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {succes && (
        <div style={styles.bandeauConfirmation}>
          Liste créée ! Lien public : {window.location.origin}/liste-cadeau/{succes.codeAcces}
        </div>
      )}

      <h3 style={styles.titreCarte}>1. Client</h3>
      {clientChoisi ? (
        <div style={styles.clientChoisi}>
          <span style={{ fontWeight: 600 }}>{clientChoisi.nomComplet}</span>
          <button onClick={() => setClientChoisi(null)} style={styles.boutonRetirer}>Changer</button>
        </div>
      ) : (
        <>
          <form onSubmit={rechercherClient} style={styles.ligneChamps}>
            <input
              style={{ ...styles.champInput, flex: 1 }}
              value={rechercheClient}
              onChange={(e) => setRechercheClient(e.target.value)}
              placeholder="Rechercher un client (nom ou téléphone)…"
            />
            <button type="submit" style={styles.boutonAjouter}>Chercher</button>
          </form>
          {resultatsClient.length > 0 && (
            <div style={styles.listeResultats}>
              {resultatsClient.map((c) => (
                <button key={c.id} onClick={() => { setClientChoisi(c); setResultatsClient([]); }} style={styles.itemResultat}>
                  {c.nomComplet} {c.telephone && `— ${c.telephone}`}
                </button>
              ))}
            </div>
          )}
          <div style={styles.blocNouveauClient}>
            <p style={styles.texteMuet}>Ou créer un nouveau client :</p>
            <div style={styles.ligneChamps}>
              <input
                style={styles.champInput}
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                placeholder="Nom complet"
              />
              <input
                style={styles.champInput}
                value={nouveauTelephone}
                onChange={(e) => setNouveauTelephone(e.target.value)}
                placeholder="Téléphone (optionnel)"
              />
              <button onClick={creerNouveauClient} style={styles.boutonAjouter}>Créer</button>
            </div>
          </div>
        </>
      )}

      <h3 style={{ ...styles.titreCarte, marginTop: 20 }}>2. Titre (optionnel)</h3>
      <input
        style={styles.champInput}
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Ex : Liste de naissance de Fatou"
      />

      <h3 style={{ ...styles.titreCarte, marginTop: 20 }}>3. Destinataire (qui attend le cadeau)</h3>
      <div style={styles.grilleChamps}>
        <input
          style={styles.champInput}
          value={nomDestinataire}
          onChange={(e) => setNomDestinataire(e.target.value)}
          placeholder="Nom et prénom"
        />
        <input
          style={styles.champInput}
          value={telephoneDestinataire1}
          onChange={(e) => setTelephoneDestinataire1(e.target.value)}
          placeholder="Téléphone 1"
        />
        <input
          style={styles.champInput}
          value={telephoneDestinataire2}
          onChange={(e) => setTelephoneDestinataire2(e.target.value)}
          placeholder="Téléphone 2 (optionnel)"
        />
        <input
          style={styles.champInput}
          value={emailDestinataire}
          onChange={(e) => setEmailDestinataire(e.target.value)}
          placeholder="Email (optionnel)"
        />
      </div>

      <h3 style={{ ...styles.titreCarte, marginTop: 20 }}>4. Donateur / organisateur (optionnel)</h3>
      <div style={styles.grilleChamps}>
        <input
          style={styles.champInput}
          value={nomDonateur}
          onChange={(e) => setNomDonateur(e.target.value)}
          placeholder="Nom et prénom"
        />
        <input
          style={styles.champInput}
          value={telephoneDonateur}
          onChange={(e) => setTelephoneDonateur(e.target.value)}
          placeholder="Téléphone"
        />
        <input
          style={styles.champInput}
          value={emailDonateur}
          onChange={(e) => setEmailDonateur(e.target.value)}
          placeholder="Email"
        />
      </div>

      <h3 style={{ ...styles.titreCarte, marginTop: 20 }}>5. Articles souhaités</h3>
      <div style={styles.ligneChamps}>
        <select style={{ ...styles.champInput, flex: 1 }} value={articleAAjouter} onChange={(e) => setArticleAAjouter(e.target.value)}>
          <option value="">—</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>{a.designation} ({a.reference})</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          style={{ ...styles.champInput, width: 80 }}
          value={quantiteAAjouter}
          onChange={(e) => setQuantiteAAjouter(e.target.value)}
        />
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

      <button onClick={validerListe} disabled={envoiEnCours} style={{ ...styles.boutonValider, marginTop: 16 }}>
        {envoiEnCours ? 'Création…' : 'Créer la liste cadeau'}
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET LISTES EXISTANTES
// ------------------------------------------------------------
function OngletListesExistantes({ listes, chargement, onRafraichir }) {
  const [listeOuverte, setListeOuverte] = useState(null);

  if (chargement) return <p style={styles.texteMuet}>Chargement…</p>;
  if (listes.length === 0) return <p style={styles.texteMuet}>Aucune liste cadeau pour l'instant.</p>;

  return (
    <div style={styles.listeCartesListes}>
      {listes.map((liste) => (
        <div key={liste.id} style={styles.carte}>
          <div style={styles.enTeteListe}>
            <div>
              <div style={{ fontWeight: 700 }}>{liste.titre || `Liste de ${liste.client.nomComplet}`}</div>
              <div style={styles.texteMuet}>{liste.client.nomComplet} — {new Date(liste.createdAt).toLocaleDateString('fr-FR')}</div>
            </div>
            <button
              onClick={() => setListeOuverte(listeOuverte === liste.id ? null : liste.id)}
              style={styles.boutonAjouter}
            >
              {listeOuverte === liste.id ? 'Fermer' : 'Détails'}
            </button>
          </div>

          <div style={styles.texteMuet}>
            Lien public : {window.location.origin}/liste-cadeau/{liste.codeAcces}
          </div>

          {listeOuverte === liste.id && (
            <DetailListe liste={liste} onOffrande={onRafraichir} />
          )}
        </div>
      ))}
    </div>
  );
}

function DetailListe({ liste, onOffrande }) {
  const [typePaiement, setTypePaiement] = useState('carte'); // 'carte' | 'autre'
  const [carteCadeauCode, setCarteCadeauCode] = useState('');
  const [modePaiementChoisi, setModePaiementChoisi] = useState(MODES_PAIEMENT[0]);
  const [offrePar, setOffrePar] = useState('');
  const [quantitesChoisies, setQuantitesChoisies] = useState({});
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Montant calculé automatiquement à partir des articles/quantités sélectionnés — jamais
  // saisi librement, pour garantir que ce qui est déclaré correspond à ce qui est offert.
  const montantCalcule = liste.lignes.reduce((total, l) => {
    const q = Number(quantitesChoisies[l.id]) || 0;
    return total + q * Number(l.article.prixVente);
  }, 0);

  function imprimerListe() {
    const nomDest = liste.nomDestinataire || liste.client.nomComplet;
    const tel1 = liste.telephoneDestinataire1 || '';
    const tel2 = liste.telephoneDestinataire2 || '';
    const emailDest = liste.emailDestinataire || '';

    const ligneDonateur = liste.nomDonateur ? `
      <div class="bloc-donateur">
        <span class="label-donateur">Liste organisée par :</span>
        ${liste.nomDonateur}
        ${liste.telephoneDonateur ? ` — ${liste.telephoneDonateur}` : ''}
        ${liste.emailDonateur ? ` — ${liste.emailDonateur}` : ''}
      </div>
    ` : '';

    const lignesHtml = liste.lignes.map((l, index) => `
      <tr class="${index % 2 === 0 ? 'ligne-paire' : ''}">
        <td>${l.article.reference}</td>
        <td class="centre">${l.quantiteSouhaitee}</td>
        <td class="centre">${l.quantiteOfferte}</td>
      </tr>
    `).join('');

    const lignesVides = Math.max(0, 12 - liste.lignes.length);
    const lignesVidesHtml = Array.from({ length: lignesVides }).map((_, index) => `
      <tr class="${(liste.lignes.length + index) % 2 === 0 ? 'ligne-paire' : ''}">
        <td>&nbsp;</td><td class="centre">&nbsp;</td><td class="centre">&nbsp;</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${liste.titre || 'Liste cadeau'} — Jesma U</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Poppins', sans-serif;
    color: #4A2C17;
    margin: 0;
    background: #FBF3DD;
  }
  .cadre {
    margin: 12mm;
    border: 2px solid #D9A144;
    border-radius: 12px;
    padding: 14mm;
    min-height: 260mm;
    position: relative;
  }
  .entete {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 18px;
    border-bottom: 2px solid #D9A144;
    margin-bottom: 24px;
  }
  .logo { height: 100px; }
  .titre-liste {
    font-family: 'Dancing Script', cursive;
    font-size: 38px;
    font-weight: 700;
    color: #B87F2C;
    text-align: right;
  }
  .bloc-destinataire {
    background: #FFFFFF;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 16px;
    box-shadow: 0 2px 6px rgba(74,44,23,0.08);
  }
  .nom-destinataire {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .contacts-destinataire {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #7A5233;
  }
  .bloc-donateur {
    font-size: 12px;
    color: #7A5233;
    margin-bottom: 20px;
    font-style: italic;
  }
  .label-donateur { font-weight: 600; font-style: normal; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th {
    background: #B87F2C;
    color: white;
    padding: 10px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  th.centre { text-align: center; }
  td { border-bottom: 1px solid #F0E4C8; padding: 9px 10px; font-size: 13px; height: 22px; }
  td.centre { text-align: center; }
  .ligne-paire { background: #FBF3DD; }
  .pied {
    position: absolute;
    bottom: 14mm;
    left: 14mm;
    right: 14mm;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #7A5233;
    border-top: 1px solid #D9A144;
    padding-top: 10px;
  }
</style>
</head>
<body>
  <div class="cadre">
    <div class="entete">
      <img src="${window.location.origin}/logo-jesma-u.png" class="logo" alt="Jesma U" />
      <div class="titre-liste">${liste.titre || 'Liste de naissance'}</div>
    </div>

    <div class="bloc-destinataire">
      <div class="nom-destinataire">${nomDest}</div>
      <div class="contacts-destinataire">
        ${tel1 ? `<span>📞 ${tel1}</span>` : ''}
        ${tel2 ? `<span>📞 ${tel2}</span>` : ''}
        ${emailDest ? `<span>✉️ ${emailDest}</span>` : ''}
      </div>
    </div>

    ${ligneDonateur}

    <table>
      <thead>
        <tr><th>Code produit</th><th class="centre">Quantité</th><th class="centre">Réservé</th></tr>
      </thead>
      <tbody>
        ${lignesHtml}
        ${lignesVidesHtml}
      </tbody>
    </table>

    <div class="pied">
      <span>📍 Grand-Bassam carrefour rosier 5</span>
      <span>💬 Contact : +225 07 69 535 786</span>
      <span>Jesma U</span>
    </div>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const fenetre = window.open('', '_blank');
    fenetre.document.write(html);
    fenetre.document.close();
  }

  function changerQuantiteChoisie(ligneId, valeur) {
    setQuantitesChoisies((prec) => ({ ...prec, [ligneId]: valeur }));
  }

  async function offrir() {
    setErreur('');
    setSucces('');

    if (typePaiement === 'carte' && !carteCadeauCode.trim()) {
      setErreur('Code-barres de la carte cadeau requis.');
      return;
    }

    const lignesChoisies = Object.entries(quantitesChoisies)
      .filter(([, q]) => Number(q) > 0)
      .map(([ligneId, quantite]) => ({ ligneId: Number(ligneId), quantite: Number(quantite) }));

    if (lignesChoisies.length === 0) {
      setErreur('Choisissez au moins un article à offrir.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await appelApi('POST', `/listes-cadeaux/${liste.codeAcces}/offrir-telephone`, {
        carteCadeauCode: typePaiement === 'carte' ? carteCadeauCode.trim() : undefined,
        modePaiement: typePaiement === 'autre' ? modePaiementChoisi : undefined,
        montant: typePaiement === 'autre' ? montantCalcule : undefined,
        offrePar: offrePar || undefined,
        lignes: lignesChoisies,
      });
      setSucces('Cadeau offert avec succès !');
      setCarteCadeauCode('');
      setModePaiementChoisi(MODES_PAIEMENT[0]);
      setOffrePar('');
      setQuantitesChoisies({});
      onOffrande();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.detailListe}>
      <table style={styles.tableau}>
        <thead>
          <tr>
            <th style={styles.th}>Article</th>
            <th style={styles.th}>Souhaité</th>
            <th style={styles.th}>Offert</th>
            <th style={styles.th}>Restant</th>
            <th style={styles.th}>Offrir maintenant</th>
          </tr>
        </thead>
        <tbody>
          {liste.lignes.map((l) => {
            const restant = l.quantiteSouhaitee - l.quantiteOfferte;
            return (
              <tr key={l.id}>
                <td style={styles.td}>{l.article.designation}</td>
                <td style={styles.td}>{l.quantiteSouhaitee}</td>
                <td style={styles.td}>{l.quantiteOfferte}</td>
                <td style={{ ...styles.td, fontWeight: 700, color: restant > 0 ? 'var(--gold-deep)' : '#1E6B36' }}>
                  {restant}
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    min="0"
                    max={restant}
                    disabled={restant === 0}
                    style={{ ...styles.champInput, width: 70 }}
                    value={quantitesChoisies[l.id] || ''}
                    onChange={(e) => changerQuantiteChoisie(l.id, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button onClick={imprimerListe} style={{ ...styles.boutonAjouter, marginTop: 12 }}>
        🖨️ Imprimer (A4)
      </button>

      <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}>Offrir par téléphone (saisie vendeuse)</h4>
      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {succes && <div style={styles.bandeauConfirmation}>{succes}</div>}

      <div style={styles.togglePaiement}>
        <button
          onClick={() => setTypePaiement('carte')}
          style={typePaiement === 'carte' ? styles.toggleActif : styles.toggle}
        >
          Carte cadeau
        </button>
        <button
          onClick={() => setTypePaiement('autre')}
          style={typePaiement === 'autre' ? styles.toggleActif : styles.toggle}
        >
          Autre mode de paiement
        </button>
      </div>

      <div style={styles.ligneChamps}>
        {typePaiement === 'carte' ? (
          <input
            style={styles.champInput}
            value={carteCadeauCode}
            onChange={(e) => setCarteCadeauCode(e.target.value)}
            placeholder="Code-barres carte cadeau"
          />
        ) : (
          <>
            <select style={styles.champInput} value={modePaiementChoisi} onChange={(e) => setModePaiementChoisi(e.target.value)}>
              {MODES_PAIEMENT.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div style={styles.montantCalcule}>
              {montantCalcule.toLocaleString('fr-FR')} F
            </div>
          </>
        )}
        <input
          style={styles.champInput}
          value={offrePar}
          onChange={(e) => setOffrePar(e.target.value)}
          placeholder="Nom de la personne qui offre (optionnel)"
        />
        <button onClick={offrir} disabled={envoiEnCours} style={styles.boutonValider}>
          {envoiEnCours ? 'Envoi…' : 'Offrir'}
        </button>
      </div>
      {typePaiement === 'autre' && (
        <p style={styles.texteMuet}>
          Montant calculé automatiquement à partir des articles choisis ci-dessus — à utiliser
          uniquement après avoir vérifié la réception du paiement (confirmé immédiatement).
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET OFFRES EN ATTENTE (validation Victoria)
// ------------------------------------------------------------
function OngletOffresEnAttente() {
  const [offres, setOffres] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [actionEnCours, setActionEnCours] = useState(null);

  useEffect(() => {
    charger();
  }, []);

  function charger() {
    setChargement(true);
    setErreur('');
    appelApi('GET', '/listes-cadeaux/offres-en-attente')
      .then(setOffres)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  async function confirmer(id) {
    setActionEnCours(id);
    try {
      await appelApi('POST', `/listes-cadeaux/offres/${id}/confirmer`);
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setActionEnCours(null);
    }
  }

  async function rejeter(id) {
    const motif = window.prompt('Motif du rejet (optionnel) :') || '';
    setActionEnCours(id);
    try {
      await appelApi('POST', `/listes-cadeaux/offres/${id}/rejeter`, { motif: motif || undefined });
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setActionEnCours(null);
    }
  }

  return (
    <div style={styles.carte}>
      <h3 style={styles.titreCarte}>Offres à vérifier (paiements déclarés à distance)</h3>
      <p style={styles.texteMuet}>
        Ces cadeaux ont été déclarés depuis le lien public, sans carte cadeau — vérifiez la réception
        réelle du paiement (Mobile Money, Wave...) avant de confirmer.
      </p>

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {chargement && <p style={styles.texteMuet}>Chargement…</p>}
      {!chargement && offres.length === 0 && (
        <p style={styles.texteMuet}>Aucune offre en attente de vérification.</p>
      )}

      <div style={styles.listeCartesListes}>
        {offres.map((offre) => (
          <div key={offre.id} style={styles.carteOffre}>
            <div style={styles.enTeteListe}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {offre.listeCadeau.titre || `Liste de ${offre.listeCadeau.client.nomComplet}`}
                </div>
                <div style={styles.texteMuet}>
                  {new Date(offre.createdAt).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(offre.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--gold-deep)' }}>
                  {Number(offre.montantUtilise).toLocaleString('fr-FR')} F
                </div>
                <div style={styles.texteMuet}>{offre.modePaiement}</div>
              </div>
            </div>

            {offre.offrePar && (
              <div style={styles.texteMuet}>Offert par : {offre.offrePar}</div>
            )}

            <div style={styles.listeLignes}>
              {offre.lignesCouvertes.map((detail) => (
                <div key={detail.id} style={styles.ligneItem}>
                  <span>{detail.ligneListeCadeau.article.designation}</span>
                  <span style={{ fontWeight: 600 }}>× {detail.quantite}</span>
                </div>
              ))}
            </div>

            <div style={styles.boutonsCarteAttente}>
              <button
                onClick={() => confirmer(offre.id)}
                disabled={actionEnCours === offre.id}
                style={styles.boutonReprendre}
              >
                {actionEnCours === offre.id ? '…' : '✓ Confirmer la réception'}
              </button>
              <button
                onClick={() => rejeter(offre.id)}
                disabled={actionEnCours === offre.id}
                style={styles.boutonRetirer}
              >
                ✕ Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  togglePaiement: { display: 'flex', gap: 8, marginBottom: 12 },
  toggle: { padding: '8px 14px', borderRadius: 20, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--brown-ink)' },
  toggleActif: { padding: '8px 14px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  montantCalcule: { padding: '8px 14px', borderRadius: 8, background: 'var(--cream)', fontWeight: 700, color: 'var(--gold-deep)', fontSize: 14, minWidth: 100, textAlign: 'center' },
  carteOffre: { background: 'var(--white)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 20 },
  enTete: { display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  sousOnglets: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  sousOnglet: { padding: '10px 16px', borderRadius: 20, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--brown-ink)' },
  sousOngletActif: { padding: '10px 16px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  carte: { background: 'var(--white)', borderRadius: 14, padding: 20 },
  titreCarte: { margin: '0 0 12px 0', fontSize: 16 },
  bandeauConfirmation: { padding: '10px 14px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontSize: 13, fontWeight: 600, marginBottom: 12 },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 13, fontWeight: 600, marginBottom: 12 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  ligneChamps: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  grilleChamps: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  boutonAjouter: { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  boutonRetirer: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 13 },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  clientChoisi: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--cream)', borderRadius: 8, marginBottom: 12 },
  listeResultats: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  itemResultat: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 14 },
  blocNouveauClient: { marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--cream-deep)' },
  listeLignes: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  ligneItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--cream)', fontSize: 13 },
  listeCartesListes: { display: 'flex', flexDirection: 'column', gap: 14 },
  enTeteListe: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  detailListe: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--cream-deep)' },
  tableau: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid var(--gold-mid)', color: 'var(--brown-soft)', fontWeight: 700 },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--cream-deep)' },
};
