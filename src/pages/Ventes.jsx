import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { appelApi, getUtilisateur } from '../lib/api';
import { diffuserEtatPanier, diffuserVenteValidee, ecouterCanal } from '../lib/broadcast';

const ONGLETS = [
  { id: 'nouvelle', label: 'Nouvelle vente' },
  { id: 'attente', label: 'En attente' },
  { id: 'credit', label: 'Ventes à crédit' },
  { id: 'historique', label: 'Historique' },
  { id: 'retours', label: 'Retours-Échanges' },
  { id: 'avoirs', label: 'Avoirs' },
];

const MODES_PAIEMENT = [
  'Espèces', 'Moov Money', 'MTN Money', 'Orange Money',
  'Wave', 'DJAMO', 'Carte bancaire', 'Avoir',
];

// Seuil et palier fidélité (doivent rester alignés avec SEUIL_FIDELITE_MONTANT/ACHATS
// cote backend, dans venteController.js) : 10 achats consécutifs ≥ 20 000 F donnent
// droit à un cadeau. On compte la vente en cours dès qu'elle atteint le seuil, pour
// que le ticket et l'écran client reflètent immédiatement la progression réelle,
// sans attendre le prochain achat pour que le compteur serveur se mette à jour.
const SEUIL_FIDELITE_MONTANT = 20000;
function calculerAchatsRestantsFidelite(clientActuel, totalNetVente) {
  if (!clientActuel || clientActuel.estComptoir) return null;
  const compteurProjete = (clientActuel.achatsConsecutifs || 0) + (totalNetVente >= SEUIL_FIDELITE_MONTANT ? 1 : 0);
  return Math.max(0, 10 - compteurProjete);
}

// ------------------------------------------------------------
// TICKET DE CAISSE
// ------------------------------------------------------------
function construireTicketHtml({ vente, panier, remise, totalNet, paiements, contributionAvoir, avoirReference, contributionCarteCadeau, carteCadeauCode, lieuNom, vendeurNom, estCredit, montantRestant, achatsRestantsFidelite }) {
  const date = new Date(vente.createdAt || Date.now());
  const dateTexte = date.toLocaleDateString('fr-FR');
  const heureTexte = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const logoUrl = `${window.location.origin}/logo-jesma-u-ticket.png`;

  const lignesHtml = panier.map((l) => `
    <tr>
      <td colspan="3" class="designation">${l.designation}</td>
    </tr>
    <tr>
      <td>${l.quantite} × ${l.prixUnitaire.toLocaleString('fr-FR')}</td>
      <td></td>
      <td class="montant">${(l.quantite * l.prixUnitaire).toLocaleString('fr-FR')} F</td>
    </tr>
  `).join('');

  const paiementsHtml = paiements.map((p) => `
    <div class="ligne-total"><span>${p.mode}</span><span>${p.montant.toLocaleString('fr-FR')} F</span></div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Ticket ${vente.numero}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Courier New', monospace; width: 76mm; margin: 4mm auto; font-size: 12px; color: #000; }
  .centre { text-align: center; }
  h1 { font-size: 20px; margin: 0 0 2px 0; font-weight: 900; letter-spacing: 1.5px; }
  .logo { width: 52mm; height: auto; margin: 0 auto 3px auto; display: block; }
  .sous-titre { font-size: 11px; margin-bottom: 8px; font-weight: bold; }
  hr { border: none; border-top: 2px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .designation { font-weight: bold; padding-top: 4px; }
  .montant { text-align: right; font-weight: bold; }
  .ligne-total { display: flex; justify-content: space-between; margin: 2px 0; }
  .total-final { font-weight: 900; font-size: 15px; margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; }
  .pied { text-align: center; margin-top: 12px; font-size: 12px; font-weight: bold; }
  .coordonnees { text-align: center; margin-top: 4px; font-size: 10px; line-height: 1.6; font-weight: bold; }
  .signature { text-align: center; font-style: italic; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
  <div class="centre">
    <img src="${logoUrl}" class="logo" alt="Jesma U" onerror="this.style.display='none'">
    <div class="sous-titre">Grand-Bassam, carrefour rosier 5</div>
    <div class="sous-titre">${lieuNom || ''}</div>
    <div>${dateTexte} — ${heureTexte}</div>
    <div>Ticket ${vente.numero}</div>
    ${vendeurNom ? `<div>Vendeur : ${vendeurNom}</div>` : ''}
  </div>
  <hr>
  <table>${lignesHtml}</table>
  <hr>
  <div class="ligne-total"><span>Sous-total</span><span>${(totalNet + remise).toLocaleString('fr-FR')} F</span></div>
  ${remise > 0 ? `<div class="ligne-total"><span>Remise</span><span>−${remise.toLocaleString('fr-FR')} F</span></div>` : ''}
  <div class="ligne-total total-final"><span>TOTAL</span><span>${totalNet.toLocaleString('fr-FR')} F</span></div>
  <hr>
  ${paiementsHtml}
  ${contributionAvoir > 0 ? `<div class="ligne-total"><span>Avoir ${avoirReference || ''}</span><span>−${contributionAvoir.toLocaleString('fr-FR')} F</span></div>` : ''}
  ${contributionCarteCadeau > 0 ? `<div class="ligne-total"><span>Carte cadeau ${carteCadeauCode || ''}</span><span>−${contributionCarteCadeau.toLocaleString('fr-FR')} F</span></div>` : ''}
  ${estCredit && montantRestant > 1 ? `<div class="ligne-total"><span>Reste dû (crédit)</span><span>${montantRestant.toLocaleString('fr-FR')} F</span></div>` : ''}
  <hr>
  ${achatsRestantsFidelite != null && achatsRestantsFidelite > 1 ? `<div class="pied">Cher client, encore ${achatsRestantsFidelite} achats de plus de 20 000 F pour bénéficier d'un cadeau spécial à Jesma U !</div><hr>` : ''}
  ${achatsRestantsFidelite === 1 ? `<div class="pied">Votre prochain achat de plus de 20 000 F vous donne droit à votre cadeau spécial Jesma U !</div><hr>` : ''}
  <div class="pied">Merci de votre visite !</div>
  <div class="signature">JESMA U — L'art d'accueillir la vie et de l'entretenir.</div>
  <div class="coordonnees">
    Grand-Bassam, carrefour rosier 5<br>
    WhatsApp +225 07 69 535 786
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

// Convertit un numéro ivoirien local (ex: 0708735901) au format international
// pour wa.me. En Côte d'Ivoire, le zéro de tête fait partie du numéro et doit
// être CONSERVÉ (225 0708735901, jamais 225708735901 qui est invalide).
function numeroWhatsApp(telephone) {
  if (!telephone) return null;
  const chiffres = telephone.replace(/\D/g, '');
  if (chiffres.length !== 10) return null;
  return `225${chiffres}`;
}

function construireMessageWhatsAppVente(vente) {
  const dateTexte = new Date(vente.createdAt || Date.now()).toLocaleDateString('fr-FR');
  const lignesTexte = (vente.lignes || [])
    .map((l) => `${l.article?.designation || ''} ×${l.quantite}`)
    .join(', ');
  return [
    "Merci d'être passé(e) chez JESMA U !",
    'C\'était un plaisir de vous accueillir.',
    'Au plaisir de vous revoir très bientôt en boutique !',
    '',
    "JESMA U — L'art d'accueillir la vie et de l'entretenir.",
    '',
    `Reçu ${vente.numero} — ${dateTexte}`,
    lignesTexte,
    `Total : ${Number(vente.totalNet).toLocaleString('fr-FR')} F`,
  ].join('\n');
}

function imprimerTicketDepuisHtml(html) {  const fenetre = window.open('', '_blank', 'width=380,height=600');
  if (!fenetre) return;
  fenetre.document.write(html);
  fenetre.document.close();
}

// Régénère un ticket à l'identique pour une vente déjà enregistrée (Historique),
// à partir des données déjà chargées avec la vente (lignes, paiements, avoir,
// carte cadeau, lieu, vendeur) — aucun nouvel appel serveur nécessaire.
function reimprimerTicket(v) {
  const panierTicket = v.lignes.map((l) => ({
    designation: l.article.designation,
    quantite: l.quantite,
    prixUnitaire: Number(l.prixUnitaire),
  }));
  const html = construireTicketHtml({
    vente: v,
    panier: panierTicket,
    remise: Number(v.remiseMontant || 0),
    totalNet: Number(v.totalNet),
    paiements: (v.paiements || []).map((p) => ({ mode: p.mode, montant: Number(p.montant) })),
    contributionAvoir: v.avoirUtilise ? Number(v.avoirUtilise.montant || 0) : 0,
    avoirReference: v.avoirUtilise?.reference || null,
    contributionCarteCadeau: v.carteCadeauUtilisee ? Number(v.carteCadeauUtilisee.denomination || 0) : 0,
    carteCadeauCode: v.carteCadeauUtilisee?.codeBarre || null,
    lieuNom: v.lieu?.nom,
    vendeurNom: v.vendeur?.nomComplet,
    estCredit: v.typeVente === 'CREDIT',
    montantRestant: 0,
    achatsRestantsFidelite: null,
  });
  imprimerTicketDepuisHtml(html);
}

export default function Ventes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const utilisateur = getUtilisateur();
  const estAdmin = utilisateur?.role === 'ADMIN';
  const [ongletActif, setOngletActif] = useState('nouvelle');

  const [panier, setPanier] = useState([]);
  const [filtrePanier, setFiltrePanier] = useState('');
  const finPanierRef = useRef(null);
  const champRechercheRef = useRef(null);
  const minuteurScanRef = useRef(null);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [erreurRecherche, setErreurRecherche] = useState('');
  const [avertissementStock, setAvertissementStock] = useState('');
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [remiseMontant, setRemiseMontant] = useState('');
  const [motifRemise, setMotifRemise] = useState('');
  const [codeDeblocageRemise, setCodeDeblocageRemise] = useState('');
  const [demandeCodeEnvoyee, setDemandeCodeEnvoyee] = useState(false);
  const [seuilRemise, setSeuilRemise] = useState(null);

  const [lieux, setLieux] = useState([]);
  const [vendeurs, setVendeurs] = useState([]);
  const [lieuId, setLieuId] = useState('');
  const [vendeurId, setVendeurId] = useState('');
  const [typeVente, setTypeVente] = useState('Comptant');

  // --- Client de la vente en cours ---
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const [paiements, setPaiements] = useState([]);
  const [modeAAjouter, setModeAAjouter] = useState(MODES_PAIEMENT[0]);
  const [montantAAjouter, setMontantAAjouter] = useState('');

  // --- Avoir utilisé en paiement sur la nouvelle vente ---
  const [codeAvoir, setCodeAvoir] = useState('');
  const [avoirVerifie, setAvoirVerifie] = useState(null);
  const [avoirVerificationEnCours, setAvoirVerificationEnCours] = useState(false);
  const [erreurAvoir, setErreurAvoir] = useState('');

  // --- Carte cadeau utilisée en paiement sur la nouvelle vente ---
  const [codeCarteCadeau, setCodeCarteCadeau] = useState('');
  const [carteCadeauVerifiee, setCarteCadeauVerifiee] = useState(null);
  const [carteCadeauVerificationEnCours, setCarteCadeauVerificationEnCours] = useState(false);
  const [erreurCarteCadeau, setErreurCarteCadeau] = useState('');

  // --- Création rapide d'un client depuis l'écran de vente ---
  const [creationClientOuverte, setCreationClientOuverte] = useState(false);
  const [nomNouveauClient, setNomNouveauClient] = useState('');
  const [telephoneNouveauClient, setTelephoneNouveauClient] = useState('');
  const [erreurNouveauClient, setErreurNouveauClient] = useState('');
  const [creationClientEnCours, setCreationClientEnCours] = useState(false);

  // --- Facture pro forma chargée pour reprendre directement une vente préparée ---
  const [numeroProForma, setNumeroProForma] = useState('');
  const [proFormaChargee, setProFormaChargee] = useState(null);
  const [proFormaChargementEnCours, setProFormaChargementEnCours] = useState(false);
  const [erreurProForma, setErreurProForma] = useState('');

  const [venteEnCours, setVenteEnCours] = useState(false);
  const [erreurVente, setErreurVente] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [dernierTicketHtml, setDernierTicketHtml] = useState(null);

  const [ventesEnAttente, setVentesEnAttente] = useState([]);

  // --- Ventes à crédit ---
  const [creditVentes, setCreditVentes] = useState([]);
  const [creditChargement, setCreditChargement] = useState(false);
  const [creditErreur, setCreditErreur] = useState('');
  const [creditFiltre, setCreditFiltre] = useState('EN_COURS');
  const [venteReglementOuvert, setVenteReglementOuvert] = useState(null);
  const [modeReglement, setModeReglement] = useState(MODES_PAIEMENT[0]);
  const [montantReglement, setMontantReglement] = useState('');
  const [reglementEnCours, setReglementEnCours] = useState(false);

  // --- Retours / Échanges (avoirs) ---
  const [rechercheRetour, setRechercheRetour] = useState('');
  const [resultatsRetour, setResultatsRetour] = useState([]);
  const [rechercheRetourEnCours, setRechercheRetourEnCours] = useState(false);
  const [erreurRechercheRetour, setErreurRechercheRetour] = useState('');
  const [venteOrigine, setVenteOrigine] = useState(null);
  const [lignesRetour, setLignesRetour] = useState([]);
  const [lieuRetourId, setLieuRetourId] = useState('');
  const [retourEnCours, setRetourEnCours] = useState(false);
  const [erreurRetour, setErreurRetour] = useState('');
  const [avoirCree, setAvoirCree] = useState(null);

  // --- Avoirs (liste) ---
  const [avoirsListe, setAvoirsListe] = useState([]);
  const [avoirsChargement, setAvoirsChargement] = useState(false);
  const [avoirsErreur, setAvoirsErreur] = useState('');
  const [avoirsFiltre, setAvoirsFiltre] = useState('ACTIF');

  // --- Historique + demandes d'annulation ---
  const [historiqueVentes, setHistoriqueVentes] = useState([]);
  const [historiqueChargement, setHistoriqueChargement] = useState(false);
  const [erreurHistorique, setErreurHistorique] = useState('');
  const [demandesAnnulation, setDemandesAnnulation] = useState([]);
  const [demandeAnnulationOuverte, setDemandeAnnulationOuverte] = useState(null);
  const [motifAnnulationSaisi, setMotifAnnulationSaisi] = useState('');
  const [actionAnnulationEnCours, setActionAnnulationEnCours] = useState(false);

  useEffect(() => {
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
    appelApi('GET', '/clients').then(setClients).catch(() => {});
    appelApi('GET', '/remises/parametre').then((r) => setSeuilRemise(r.seuil != null ? Number(r.seuil) : null)).catch(() => {});
    chargerVentesEnAttenteServeur();
  }, []);

  function chargerVentesEnAttenteServeur() {
    appelApi('GET', '/ventes/en-attente').then(setVentesEnAttente).catch(() => {});
  }

  // Diffuse en temps réel vers l'écran client (double écran caisse) : panier, remise,
  // et progression vers le cadeau fidélité du client sélectionné (10 achats consécutifs
  // ≥20 000 F). Cette diffusion n'était jamais branchée jusqu'ici — l'écran client ne
  // montrait donc jamais le panier en cours, seulement l'écran de remerciement final.
  useEffect(() => {
    const clientActuel = clients.find((c) => String(c.id) === String(clientId));
    const totalBrutLive = panier.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
    const remiseLive = Math.min(Number(remiseMontant) || 0, totalBrutLive);
    const achatsRestants = calculerAchatsRestantsFidelite(clientActuel, totalBrutLive - remiseLive);
    diffuserEtatPanier({ panier, remise: remiseLive, achatsRestantsFidelite: achatsRestants });
  }, [panier, remiseMontant, clientId, clients]);

  useEffect(() => {
    return ecouterCanal((message) => {
      if (message.type === 'DEMANDE_ETAT') {
        const clientActuel = clients.find((c) => String(c.id) === String(clientId));
        const totalBrutLive = panier.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
        const remiseLive = Math.min(Number(remiseMontant) || 0, totalBrutLive);
        const achatsRestants = calculerAchatsRestantsFidelite(clientActuel, totalBrutLive - remiseLive);
        diffuserEtatPanier({ panier, remise: remiseLive, achatsRestantsFidelite: achatsRestants });
      }
    });
  }, [panier, remiseMontant, clientId, clients]);

  // Fait défiler automatiquement le panier jusqu'au dernier article ajouté/modifié —
  // sans ça, une longue liste oblige à scroller à la main pour voir/ajuster la dernière
  // ligne qu'on vient de scanner.
  useEffect(() => {
    if (finPanierRef.current) {
      finPanierRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [panier.length]);

  // Si on arrive depuis la fiche d'un client fraîchement créé (?clientId=123), on le
  // présélectionne automatiquement dès que la liste des clients est chargée, puis on
  // retire le paramètre de l'URL pour ne pas le réappliquer à une prochaine vente.
  useEffect(() => {
    const idDepuisUrl = searchParams.get('clientId');
    if (idDepuisUrl && clients.some((c) => String(c.id) === idDepuisUrl)) {
      setClientId(idDepuisUrl);
      setOngletActif('nouvelle');
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  // La liste des vendeurs proposés dépend de la boutique choisie : on recharge à
  // chaque changement, et on désélectionne le vendeur en cours s'il n'est plus
  // dans la nouvelle liste (cas d'un vendeur assigné à une autre boutique).
  useEffect(() => {
    const suffixe = lieuId ? `?lieuId=${lieuId}` : '';
    appelApi('GET', `/vendeurs${suffixe}`)
      .then((liste) => {
        setVendeurs(liste);
        setVendeurId((precedent) =>
          precedent && liste.some((v) => String(v.id) === String(precedent)) ? precedent : ''
        );
      })
      .catch(() => {});
  }, [lieuId]);

  useEffect(() => {
    if (!estAdmin && !lieuId && lieux.length > 0) {
      const boutique = lieux.find((l) => l.type === 'BOUTIQUE') || lieux[0];
      if (boutique) setLieuId(String(boutique.id));
    }
  }, [lieux, estAdmin, lieuId]);

  async function chargerCredits() {
    setCreditChargement(true);
    setCreditErreur('');
    try {
      const suffixe = creditFiltre !== 'TOUS' ? `?statut=${creditFiltre}` : '';
      const donnees = await appelApi('GET', `/credits${suffixe}`);
      setCreditVentes(donnees);
    } catch (err) {
      setCreditErreur(err.message);
    } finally {
      setCreditChargement(false);
    }
  }

  useEffect(() => {
    if (ongletActif === 'credit') {
      chargerCredits();
    }
  }, [ongletActif, creditFiltre]);

  async function chargerAvoirs() {
    setAvoirsChargement(true);
    setAvoirsErreur('');
    try {
      const suffixe = avoirsFiltre !== 'TOUS' ? `?statut=${avoirsFiltre}` : '';
      const donnees = await appelApi('GET', `/avoirs${suffixe}`);
      setAvoirsListe(donnees);
    } catch (err) {
      setAvoirsErreur(err.message);
    } finally {
      setAvoirsChargement(false);
    }
  }

  useEffect(() => {
    if (ongletActif === 'avoirs') {
      chargerAvoirs();
    }
  }, [ongletActif, avoirsFiltre]);

  function ouvrirFormulaireReglement(vente) {
    setVenteReglementOuvert(vente.id);
    setModeReglement(MODES_PAIEMENT[0]);
    setMontantReglement(String(vente.montantRestant));
  }

  function fermerFormulaireReglement() {
    setVenteReglementOuvert(null);
    setMontantReglement('');
  }

  async function validerReglement(venteId) {
    setCreditErreur('');
    const montant = Number(montantReglement);
    if (!montant || montant <= 0) {
      setCreditErreur('Indiquez un montant valide.');
      return;
    }
    setReglementEnCours(true);
    try {
      await appelApi('POST', `/credits/${venteId}/reglements`, { montant, mode: modeReglement });
      fermerFormulaireReglement();
      await chargerCredits();
    } catch (err) {
      setCreditErreur(err.message);
    } finally {
      setReglementEnCours(false);
    }
  }

  async function verifierAvoir() {
    const code = codeAvoir.trim();
    if (!code) return;
    setErreurAvoir('');
    setAvoirVerificationEnCours(true);
    try {
      const avoir = await appelApi('GET', `/avoirs/${encodeURIComponent(code)}`);
      if (avoir.statut !== 'ACTIF') {
        setErreurAvoir('Cet avoir a déjà été utilisé.');
        setAvoirVerifie(null);
      } else {
        setAvoirVerifie(avoir);
      }
    } catch (err) {
      setErreurAvoir(err.message);
      setAvoirVerifie(null);
    } finally {
      setAvoirVerificationEnCours(false);
    }
  }

  function retirerAvoir() {
    setCodeAvoir('');
    setAvoirVerifie(null);
    setErreurAvoir('');
  }

  async function verifierCarteCadeau() {
    const code = codeCarteCadeau.trim();
    if (!code) return;
    setErreurCarteCadeau('');
    setCarteCadeauVerificationEnCours(true);
    try {
      const carte = await appelApi('GET', `/cartes-cadeaux/${encodeURIComponent(code)}`);
      if (carte.statut === 'UTILISEE') {
        setErreurCarteCadeau('Cette carte est déjà utilisée — il faut la réactiver dans Cartes cadeaux avant de pouvoir la réutiliser.');
        setCarteCadeauVerifiee(null);
      } else if (carte.statut !== 'ACTIVE') {
        setErreurCarteCadeau("Cette carte n'est pas encore activée.");
        setCarteCadeauVerifiee(null);
      } else {
        setCarteCadeauVerifiee(carte);
      }
    } catch (err) {
      setErreurCarteCadeau(err.message);
      setCarteCadeauVerifiee(null);
    } finally {
      setCarteCadeauVerificationEnCours(false);
    }
  }

  function retirerCarteCadeau() {
    setCodeCarteCadeau('');
    setCarteCadeauVerifiee(null);
    setErreurCarteCadeau('');
  }

  async function chargerProForma() {
    const numero = numeroProForma.trim();
    if (!numero) return;
    setErreurProForma('');
    setProFormaChargementEnCours(true);
    try {
      const proForma = await appelApi('GET', `/proforma/${encodeURIComponent(numero)}`);
      if (proForma.statut !== 'EN_ATTENTE') {
        setErreurProForma(
          proForma.statut === 'UTILISEE'
            ? 'Cette facture pro forma a déjà été transformée en vente.'
            : 'Cette facture pro forma a été annulée.'
        );
        return;
      }
      setPanier(
        proForma.lignes.map((l) => ({
          articleId: l.articleId,
          designation: l.article.designation,
          prixUnitaire: Number(l.prixUnitaire),
          quantite: l.quantite,
          stockDispo: l.article.stockActuel,
          photoUrl: l.article.photoUrl || null,
        }))
      );
      setClientId(String(proForma.clientId));
      setProFormaChargee(proForma);
    } catch (err) {
      setErreurProForma(err.message);
    } finally {
      setProFormaChargementEnCours(false);
    }
  }

  function retirerProForma() {
    setNumeroProForma('');
    setProFormaChargee(null);
    setErreurProForma('');
  }

  async function creerClientRapide() {
    setErreurNouveauClient('');
    if (!nomNouveauClient.trim()) {
      setErreurNouveauClient('Le nom complet est requis.');
      return;
    }
    if (!telephoneNouveauClient.trim()) {
      setErreurNouveauClient('Le téléphone est requis.');
      return;
    }
    setCreationClientEnCours(true);
    try {
      const client = await appelApi('POST', '/clients', {
        nomComplet: nomNouveauClient.trim(),
        telephone: telephoneNouveauClient.trim(),
      });
      setClients((prec) => [...prec, client]);
      setClientId(String(client.id));
      setClientSearch('');
      setCreationClientOuverte(false);
      setNomNouveauClient('');
      setTelephoneNouveauClient('');
    } catch (err) {
      setErreurNouveauClient(err.message);
    } finally {
      setCreationClientEnCours(false);
    }
  }

  async function gererRechercheRetour(e) {
    e.preventDefault();
    const q = rechercheRetour.trim();
    if (!q) return;
    setRechercheRetourEnCours(true);
    setErreurRechercheRetour('');
    try {
      const resultats = await appelApi('GET', `/retours/ventes?q=${encodeURIComponent(q)}`);
      setResultatsRetour(resultats);
    } catch (err) {
      setErreurRechercheRetour(err.message);
    } finally {
      setRechercheRetourEnCours(false);
    }
  }

  function selectionnerVenteOrigine(vente) {
    setVenteOrigine(vente);
    setLieuRetourId(String(vente.lieuId));
    setLignesRetour(
      vente.lignes.map((l) => ({
        articleId: l.articleId,
        designation: l.article.designation,
        prixUnitaire: Number(l.prixUnitaire),
        quantiteVendue: l.quantite,
        quantiteRetour: 0,
      }))
    );
    setResultatsRetour([]);
    setRechercheRetour('');
    setAvoirCree(null);
    setErreurRetour('');
  }

  function annulerSelectionRetour() {
    setVenteOrigine(null);
    setLignesRetour([]);
    setErreurRetour('');
  }

  // --- Historique + demandes d'annulation : logique ---

  function chargerHistorique() {
    setHistoriqueChargement(true);
    setErreurHistorique('');
    appelApi('GET', '/ventes')
      .then(setHistoriqueVentes)
      .catch((err) => setErreurHistorique(err.message))
      .finally(() => setHistoriqueChargement(false));
  }

  function chargerDemandesAnnulation() {
    if (!estAdmin) return;
    appelApi('GET', '/ventes/demandes-annulation')
      .then(setDemandesAnnulation)
      .catch(() => {});
  }

  useEffect(() => {
    if (ongletActif === 'historique') {
      chargerHistorique();
      chargerDemandesAnnulation();
    }
  }, [ongletActif]);

  function ouvrirDemandeAnnulation(venteId) {
    setDemandeAnnulationOuverte(venteId);
    setMotifAnnulationSaisi('');
  }

  async function envoyerDemandeAnnulation(venteId) {
    setActionAnnulationEnCours(true);
    try {
      await appelApi('POST', `/ventes/${venteId}/demander-annulation`, { motif: motifAnnulationSaisi || undefined });
      setDemandeAnnulationOuverte(null);
      chargerHistorique();
      chargerDemandesAnnulation();
    } catch (err) {
      setErreurHistorique(err.message);
    } finally {
      setActionAnnulationEnCours(false);
    }
  }

  async function confirmerAnnulation(venteId, motif) {
    setActionAnnulationEnCours(true);
    try {
      await appelApi('POST', `/ventes/${venteId}/annuler`, { motif });
      chargerHistorique();
      chargerDemandesAnnulation();
    } catch (err) {
      setErreurHistorique(err.message);
    } finally {
      setActionAnnulationEnCours(false);
    }
  }

  async function refuserDemande(venteId) {
    setActionAnnulationEnCours(true);
    try {
      await appelApi('POST', `/ventes/${venteId}/rejeter-annulation`);
      chargerHistorique();
      chargerDemandesAnnulation();
    } catch (err) {
      setErreurHistorique(err.message);
    } finally {
      setActionAnnulationEnCours(false);
    }
  }

  function changerQuantiteRetour(articleId, quantite) {
    setLignesRetour((prec) =>
      prec.map((l) =>
        l.articleId === articleId
          ? { ...l, quantiteRetour: Math.max(0, Math.min(quantite, l.quantiteVendue)) }
          : l
      )
    );
  }

  function changerPrixRetour(articleId, prix) {
    setLignesRetour((prec) =>
      prec.map((l) => (l.articleId === articleId ? { ...l, prixUnitaire: Number(prix) || 0 } : l))
    );
  }

  const montantAvoirEstime = lignesRetour.reduce(
    (s, l) => s + l.prixUnitaire * l.quantiteRetour, 0
  );

  async function validerRetour() {
    setErreurRetour('');
    const lignesAEnvoyer = lignesRetour.filter((l) => l.quantiteRetour > 0);
    if (lignesAEnvoyer.length === 0) {
      setErreurRetour('Indiquez au moins un article et une quantité à retourner.');
      return;
    }
    if (!lieuRetourId) {
      setErreurRetour("Sélectionnez la boutique où l'article revient en stock.");
      return;
    }
    setRetourEnCours(true);
    try {
      const avoir = await appelApi('POST', '/retours', {
        venteOrigineId: venteOrigine.id,
        lieuId: Number(lieuRetourId),
        lignes: lignesAEnvoyer.map((l) => ({
          articleId: l.articleId,
          quantite: l.quantiteRetour,
          prixUnitaire: l.prixUnitaire,
        })),
      });
      setAvoirCree(avoir);
      setVenteOrigine(null);
      setLignesRetour([]);
    } catch (err) {
      setErreurRetour(err.message);
    } finally {
      setRetourEnCours(false);
    }
  }

  async function gererRecherche(e) {
    if (e) e.preventDefault();
    const q = recherche.trim();
    if (!q) return;

    setRechercheEnCours(true);
    setErreurRecherche('');
    try {
      const suffixeLieu = lieuId ? `&lieuId=${lieuId}` : '';
      const reponse = await appelApi('GET', `/articles/recherche?q=${encodeURIComponent(q)}${suffixeLieu}`);
      if (reponse.mode === 'exact' && reponse.resultats.length === 1) {
        ajouterAuPanier(reponse.resultats[0]);
        setResultats([]);
        setRecherche('');
        champRechercheRef.current?.focus();
      } else {
        setResultats(reponse.resultats);
      }
    } catch (err) {
      setErreurRecherche(err.message);
    } finally {
      setRechercheEnCours(false);
    }
  }

  // Un scanner de code-barres "tape" très vite puis n'appuie pas toujours sur Entrée
  // selon le modèle — on détecte donc une frappe rapide et longue (typique d'un scan)
  // pour lancer la recherche automatiquement, sans clic ni Entrée nécessaires.
  function gererSaisieRecherche(valeur) {
    setRecherche(valeur);
    if (minuteurScanRef.current) clearTimeout(minuteurScanRef.current);
    if (valeur.trim().length >= 6) {
      minuteurScanRef.current = setTimeout(() => {
        gererRecherche();
      }, 120);
    }
  }

  function ajouterAuPanier(article) {
    const stockDispo = article.stockLieu ?? article.stockActuel;
    setAvertissementStock('');
    setPanier((prec) => {
      const existant = prec.find((l) => l.articleId === article.id);
      if (existant) {
        if (stockDispo != null && existant.quantite >= stockDispo) {
          setAvertissementStock(`Stock épuisé pour "${article.designation}" (${stockDispo} disponible(s)).`);
          return prec;
        }
        return prec.map((l) =>
          l.articleId === article.id ? { ...l, quantite: l.quantite + 1 } : l
        );
      }
      if (stockDispo != null && stockDispo <= 0) {
        setAvertissementStock(`"${article.designation}" n'a plus de stock disponible.`);
        return prec;
      }
      return [
        ...prec,
        {
          articleId: article.id,
          designation: article.designation,
          prixUnitaire: Number(article.prixVente),
          quantite: 1,
          stockDispo,
          photoUrl: article.photoUrl || null,
        },
      ];
    });
  }

  function changerQuantite(articleId, delta) {
    setAvertissementStock('');
    setPanier((prec) =>
      prec
        .map((l) => {
          if (l.articleId !== articleId) return l;
          if (delta > 0 && l.stockDispo != null && l.quantite >= l.stockDispo) {
            setAvertissementStock(`Stock épuisé pour "${l.designation}" (${l.stockDispo} disponible(s)).`);
            return l;
          }
          return { ...l, quantite: Math.max(0, l.quantite + delta) };
        })
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
    champRechercheRef.current?.focus();
  }

  function reinitialiserVente() {
    setPanier([]);
    setFiltrePanier('');
    setAvertissementStock('');
    setRemiseMontant('');
    setMotifRemise('');
    setCodeDeblocageRemise('');
    setDemandeCodeEnvoyee(false);
    setClientId('');
    setClientSearch('');
    setCreationClientOuverte(false);
    setPaiements([]);
    setMontantAAjouter('');
    setTypeVente('Comptant');
    retirerAvoir();
    retirerCarteCadeau();
    retirerProForma();
  }

  // Le client se désiste avant paiement : on vide le panier en cours sans rien
  // enregistrer (ni en base, ni en liste d'attente). Simple confirmation pour
  // éviter un clic accidentel qui ferait perdre une vente en cours de saisie.
  function annulerVenteEnCours() {
    if (panier.length === 0) return;
    const confirme = window.confirm('Annuler cette vente ? Le panier sera vidé et rien ne sera enregistré.');
    if (!confirme) return;
    reinitialiserVente();
    setErreurVente('');
    setConfirmation(null);
  }

  const totalBrut = panier.reduce((somme, l) => somme + l.prixUnitaire * l.quantite, 0);
  const remise = Math.min(Number(remiseMontant) || 0, totalBrut);
  const remiseDepassantSeuil = seuilRemise != null && remise > seuilRemise;
  const totalNet = totalBrut - remise;
  const totalPaiements = paiements.reduce((s, p) => s + p.montant, 0);
  const contributionAvoir = avoirVerifie ? Math.min(Number(avoirVerifie.montant), totalNet) : 0;
  const contributionCarteCadeau = carteCadeauVerifiee
    ? Math.min(Number(carteCadeauVerifiee.denomination), totalNet - contributionAvoir)
    : 0;
  const resteAPayer = totalNet - totalPaiements - contributionAvoir - contributionCarteCadeau;
  const estCredit = typeVente === 'Crédit';

  useEffect(() => {
    if (panier.length > 0 && resteAPayer > 0) {
      setMontantAAjouter(String(resteAPayer));
    } else if (panier.length === 0) {
      setMontantAAjouter('');
    }
  }, [panier.length, resteAPayer]);

  function ajouterPaiement() {
    const montant = Number(montantAAjouter);
    if (!montant || montant <= 0) return;
    setPaiements((prec) => [...prec, { mode: modeAAjouter, montant }]);
    setMontantAAjouter('');
  }

  function retirerPaiement(index) {
    setPaiements((prec) => prec.filter((_, i) => i !== index));
  }

  async function mettreEnAttente() {
    setErreurVente('');
    if (panier.length === 0) {
      setErreurVente('Le panier est vide, rien à mettre en attente.');
      return;
    }

    try {
      await appelApi('POST', '/ventes/en-attente', {
        lieuId: lieuId || undefined,
        vendeurId: vendeurId || undefined,
        clientId: clientId || undefined,
        typeVente,
        remiseMontant: remiseMontant || undefined,
        motifRemise: motifRemise || undefined,
        panier,
      });
      chargerVentesEnAttenteServeur();
      reinitialiserVente();
      setConfirmation(null);
    } catch (err) {
      setErreurVente(err.message);
    }
  }

  async function reprendreVente(id) {
    const vente = ventesEnAttente.find((v) => v.id === id);
    if (!vente) return;

    setPanier(vente.panier);
    setRemiseMontant(vente.remiseMontant || '');
    setMotifRemise(vente.motifRemise || '');
    setLieuId(vente.lieuId || '');
    setVendeurId(vente.vendeurId || '');
    setClientId(vente.clientId || '');
    setTypeVente(vente.typeVente || 'Comptant');
    setPaiements([]);

    try {
      await appelApi('DELETE', `/ventes/en-attente/${id}`);
    } catch { /* la reprise se fait quand même côté écran */ }
    chargerVentesEnAttenteServeur();
    setOngletActif('nouvelle');
  }

  async function supprimerVenteEnAttente(id) {
    try {
      await appelApi('DELETE', `/ventes/en-attente/${id}`);
      chargerVentesEnAttenteServeur();
    } catch (err) {
      setErreurVente(err.message);
    }
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
    if (!vendeurId) {
      setErreurVente('Sélectionnez un vendeur.');
      return;
    }
    if (remiseDepassantSeuil && !codeDeblocageRemise.trim()) {
      if (!demandeCodeEnvoyee) {
        appelApi('POST', '/remises/demande-code', { montant: remise }).catch(() => {});
        setDemandeCodeEnvoyee(true);
      }
      setErreurVente(`Un code de déblocage administrateur est requis pour une remise supérieure à ${seuilRemise.toLocaleString('fr-FR')} F. Victoria a été alertée sur son tableau de bord.`);
      return;
    }
    if (!estCredit && paiements.length === 0 && contributionAvoir === 0 && contributionCarteCadeau === 0) {
      setErreurVente('Ajoutez au moins un mode de paiement.');
      return;
    }
    if (!estCredit && resteAPayer > 1) {
      setErreurVente(`Il reste ${resteAPayer.toLocaleString('fr-FR')} F à couvrir.`);
      return;
    }

    // Un client est toujours associé à la vente, quitte à retomber sur "Client Comptoir"
    // si la caissière n'en a choisi aucun (client anonyme).
    let idClientFinal = clientId ? Number(clientId) : null;
    if (!idClientFinal) {
      const comptoir = clients.find((c) => c.nomComplet === 'Client Comptoir');
      if (!comptoir) {
        setErreurVente('Aucun client sélectionné, et "Client Comptoir" n\'existe pas encore — crée-le une fois dans Clients.');
        return;
      }
      idClientFinal = comptoir.id;
    }

    setVenteEnCours(true);
    let vente;
    try {
      vente = await appelApi('POST', '/ventes', {
        lieuId: Number(lieuId),
        vendeurId: vendeurId ? Number(vendeurId) : null,
        clientId: idClientFinal,
        typeVente: estCredit ? 'CREDIT' : 'COMPTANT',
        remiseMontant: remise > 0 ? remise : undefined,
        motifRemise: motifRemise || undefined,
        codeDeblocageRemise: remiseDepassantSeuil ? codeDeblocageRemise.trim() : undefined,
        avoirCode: avoirVerifie ? avoirVerifie.reference : undefined,
        carteCadeauCode: carteCadeauVerifiee ? carteCadeauVerifiee.codeBarre : undefined,
        proFormaId: proFormaChargee ? proFormaChargee.id : undefined,
        lignes: panier.map((l) => ({
          articleId: l.articleId,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
        paiements: paiements.map((p) => ({ mode: p.mode, montant: p.montant })),
      });
    } catch (err) {
      // Échec réel côté serveur (stock refusé, avoir invalide, etc.) — rien n'a été
      // créé, donc on affiche l'erreur normalement et la caissière peut corriger/réessayer.
      setErreurVente(err.message);
      setVenteEnCours(false);
      return;
    }

    // À partir d'ici, la vente est enregistrée en base et le stock déjà décompté —
    // quoi qu'il arrive dans le bloc suivant (ticket, écran client), il ne faut plus
    // jamais laisser croire à un échec qui pousserait à revalider (double décompte de
    // stock). On vide donc TOUJOURS le panier, et on affiche un message dédié si
    // uniquement l'affichage a un souci.
    try {
      const lieuNom = lieux.find((l) => String(l.id) === String(lieuId))?.nom;
      const vendeurNom = vendeurs.find((v) => String(v.id) === String(vendeurId))?.nomComplet;
      const clientActuel = clients.find((c) => String(c.id) === String(clientId));
      const achatsRestantsFidelite = calculerAchatsRestantsFidelite(clientActuel, totalNet);
      const ticketHtml = construireTicketHtml({
        vente,
        panier,
        remise,
        totalNet,
        paiements,
        contributionAvoir,
        avoirReference: avoirVerifie?.reference,
        contributionCarteCadeau,
        carteCadeauCode: carteCadeauVerifiee?.codeBarre,
        lieuNom,
        vendeurNom,
        estCredit,
        montantRestant: resteAPayer,
        achatsRestantsFidelite,
      });
      setDernierTicketHtml(ticketHtml);
      imprimerTicketDepuisHtml(ticketHtml);
      setConfirmation({ ...vente, montantRestantAffiche: estCredit ? resteAPayer : 0 });
      diffuserVenteValidee(vente);
    } catch {
      setConfirmation({ ...vente, montantRestantAffiche: estCredit ? resteAPayer : 0 });
      setErreurVente("La vente est bien enregistrée, mais le ticket ou l'écran client n'a pas pu s'afficher correctement.");
    } finally {
      reinitialiserVente();
      setVenteEnCours(false);
    }
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <button
          onClick={() => window.open('/ecran-client', 'ecranClientJesmaU', 'width=520,height=850')}
          style={styles.boutonEcranClient}
        >
          🖥️ Écran client
        </button>
        <nav style={styles.nav}>
          {ONGLETS.map((onglet) => (
            <div
              key={onglet.id}
              onClick={() => setOngletActif(onglet.id)}
              style={onglet.id === ongletActif ? styles.navItemActif : styles.navItem}
            >
              {onglet.label}
              {onglet.id === 'attente' && ventesEnAttente.length > 0 && (
                <span style={styles.badgeCompteur}> ({ventesEnAttente.length})</span>
              )}
              {onglet.id === 'credit' && creditFiltre === 'EN_COURS' && creditVentes.length > 0 && (
                <span style={styles.badgeCompteur}> ({creditVentes.length})</span>
              )}
              {onglet.id === 'historique' && estAdmin && demandesAnnulation.length > 0 && (
                <span style={styles.badgeCompteur}> ({demandesAnnulation.length})</span>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main style={styles.contenu}>
        {ongletActif === 'attente' ? (
          <>
            <h2 style={styles.titreOnglet}>Ventes en attente</h2>
            {ventesEnAttente.length === 0 && (
              <p style={styles.texteMuet}>Aucune vente en attente pour l'instant.</p>
            )}
            <div style={styles.listeAttente}>
              {ventesEnAttente.map((vente) => {
                const totalVente = vente.panier.reduce(
                  (s, l) => s + l.prixUnitaire * l.quantite, 0
                );
                return (
                  <div key={vente.id} style={styles.carteAttente}>
                    <div style={styles.enTeteCarteAttente}>
                      <span style={{ fontWeight: 700 }}>
                        {totalVente.toLocaleString('fr-FR')} F
                      </span>
                      <span style={styles.texteMuet}>
                        {new Date(vente.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={styles.texteMuet}>
                      {vente.panier.reduce((s, l) => s + l.quantite, 0)} article(s) — {vente.panier.map((l) => `${l.designation} ×${l.quantite}`).join(', ')}
                    </div>
                    <div style={styles.boutonsCarteAttente}>
                      <button onClick={() => reprendreVente(vente.id)} style={styles.boutonReprendre}>
                        Reprendre
                      </button>
                      <button onClick={() => supprimerVenteEnAttente(vente.id)} style={styles.boutonRetirer}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : ongletActif === 'credit' ? (
          <>
            <h2 style={styles.titreOnglet}>Ventes à crédit</h2>

            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'EN_COURS', label: 'En cours' },
                { id: 'SOLDE', label: 'Soldées' },
                { id: 'TOUS', label: 'Toutes' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCreditFiltre(f.id)}
                  style={f.id === creditFiltre ? styles.filtreActif : styles.filtreInactif}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {creditErreur && <div style={styles.bandeauErreur}>{creditErreur}</div>}
            {creditChargement && <p style={styles.texteMuet}>Chargement…</p>}
            {!creditChargement && creditVentes.length === 0 && (
              <p style={styles.texteMuet}>Aucune vente à crédit pour ce filtre.</p>
            )}

            <div style={styles.listeAttente}>
              {creditVentes.map((vente) => (
                <div key={vente.id} style={styles.carteAttente}>
                  <div style={styles.enTeteCarteAttente}>
                    <span style={{ fontWeight: 700 }}>
                      Vente {vente.numero} — {Number(vente.totalNet).toLocaleString('fr-FR')} F
                    </span>
                    <span style={styles.texteMuet}>
                      {new Date(vente.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div style={styles.texteMuet}>
                    Client : {vente.client ? vente.client.nomComplet : 'Non renseigné'}
                    {vente.vendeur ? ` — Vendeur : ${vente.vendeur.nomComplet}` : ''}
                    {vente.lieu ? ` — ${vente.lieu.nom}` : ''}
                  </div>
                  <div style={styles.ligneRecap}>
                    <span>Déjà payé</span>
                    <span>{Number(vente.totalPaye).toLocaleString('fr-FR')} F</span>
                  </div>
                  <div style={{ ...styles.ligneRecap, fontWeight: 700, color: vente.montantRestant > 1 ? 'var(--error)' : '#1E6B36' }}>
                    <span>{vente.montantRestant > 1 ? 'Reste dû' : 'Soldée'}</span>
                    <span>{Number(vente.montantRestant).toLocaleString('fr-FR')} F</span>
                  </div>

                  {vente.montantRestant > 1 && (
                    venteReglementOuvert === vente.id ? (
                      <div style={styles.ajoutPaiement}>
                        <select
                          style={styles.champInput}
                          value={modeReglement}
                          onChange={(e) => setModeReglement(e.target.value)}
                        >
                          {MODES_PAIEMENT.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          style={{ ...styles.champInput, minWidth: 100 }}
                          placeholder="Montant"
                          value={montantReglement}
                          onChange={(e) => setMontantReglement(e.target.value)}
                        />
                        <button
                          onClick={() => validerReglement(vente.id)}
                          disabled={reglementEnCours}
                          style={styles.boutonAjouterPaiement}
                        >
                          {reglementEnCours ? '…' : 'Valider'}
                        </button>
                        <button onClick={fermerFormulaireReglement} style={styles.boutonRetirer}>
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div style={styles.boutonsCarteAttente}>
                        <button onClick={() => ouvrirFormulaireReglement(vente)} style={styles.boutonReprendre}>
                          Enregistrer un paiement
                        </button>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </>
        ) : ongletActif === 'historique' ? (
          <>
            <h2 style={styles.titreOnglet}>{estAdmin ? 'Historique des ventes' : "Ventes d'aujourd'hui"}</h2>

            {erreurHistorique && <div style={styles.bandeauErreur}>{erreurHistorique}</div>}

            {estAdmin && demandesAnnulation.length > 0 && (
              <div style={{ ...styles.carteAttente, background: '#FBE4E1', maxWidth: 700 }}>
                <div style={{ fontWeight: 700, color: 'var(--error)' }}>
                  ⚠ {demandesAnnulation.length} demande(s) d'annulation en attente
                </div>
                {demandesAnnulation.map((v) => (
                  <div key={v.id} style={{ ...styles.carteAttente, background: 'var(--white)', marginTop: 8 }}>
                    <div style={styles.enTeteCarteAttente}>
                      <span style={{ fontWeight: 700 }}>{v.numero} — {Number(v.totalNet).toLocaleString('fr-FR')} F</span>
                      <span style={styles.texteMuet}>{v.demandeurAnnulation?.nomComplet}</span>
                    </div>
                    <div style={styles.texteMuet}>
                      Motif : {v.motifDemandeAnnulation || 'Non précisé'}
                    </div>
                    <div style={styles.boutonsCarteAttente}>
                      <button
                        onClick={() => confirmerAnnulation(v.id, v.motifDemandeAnnulation)}
                        disabled={actionAnnulationEnCours}
                        style={styles.boutonValider}
                      >
                        Annuler la vente
                      </button>
                      <button
                        onClick={() => refuserDemande(v.id)}
                        disabled={actionAnnulationEnCours}
                        style={styles.boutonRetirer}
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {historiqueChargement && <p style={styles.texteMuet}>Chargement…</p>}
            {!historiqueChargement && historiqueVentes.length === 0 && (
              <p style={styles.texteMuet}>Aucune vente pour l'instant.</p>
            )}

            <div style={styles.listeAttente}>
              {historiqueVentes.map((v) => (
                <div key={v.id} style={styles.carteAttente}>
                  <div style={styles.enTeteCarteAttente}>
                    <span style={{ fontWeight: 700 }}>{v.numero} — {Number(v.totalNet).toLocaleString('fr-FR')} F</span>
                    <span style={styles.texteMuet}>{new Date(v.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                  <div style={styles.texteMuet}>
                    {v.lieu?.nom} — {v.vendeur ? v.vendeur.nomComplet : '—'} — {v.typeVente === 'CREDIT' ? 'Crédit' : 'Comptant'}
                  </div>
                  <div style={styles.texteMuet}>
                    {v.lignes.map((l) => `${l.article.designation} ×${l.quantite}`).join(', ')}
                  </div>

                  {v.statut === 'ANNULEE' ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--error)' }}>Vente annulée</span>
                  ) : v.demandeAnnulationEnCours ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-deep)' }}>Demande d'annulation en attente</span>
                  ) : demandeAnnulationOuverte === v.id ? (
                    <div style={styles.ajoutPaiement}>
                      <input
                        style={styles.champInput}
                        placeholder="Motif (optionnel)…"
                        value={motifAnnulationSaisi}
                        onChange={(e) => setMotifAnnulationSaisi(e.target.value)}
                      />
                      <button
                        onClick={() => envoyerDemandeAnnulation(v.id)}
                        disabled={actionAnnulationEnCours}
                        style={styles.boutonAjouterPaiement}
                      >
                        Envoyer
                      </button>
                      <button onClick={() => setDemandeAnnulationOuverte(null)} style={styles.boutonRetirer}>
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div style={styles.boutonsCarteAttente}>
                      <button onClick={() => reimprimerTicket(v)} style={styles.boutonReprendre}>
                        🖨️ Réimprimer
                      </button>
                      <button onClick={() => ouvrirDemandeAnnulation(v.id)} style={styles.boutonReprendre}>
                        Demander l'annulation
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : ongletActif === 'retours' ? (
          <>
            <h2 style={styles.titreOnglet}>Retours / Échanges</h2>

            {avoirCree && (
              <div style={styles.bandeauConfirmation}>
                ✅ Avoir {avoirCree.reference} créé — {Number(avoirCree.montant).toLocaleString('fr-FR')} F.
                Le client pourra l'utiliser lors d'un prochain achat avec ce code : {avoirCree.reference}
              </div>
            )}
            {erreurRetour && <div style={styles.bandeauErreur}>{erreurRetour}</div>}

            {!venteOrigine ? (
              <>
                <form onSubmit={gererRechercheRetour} style={styles.formRecherche}>
                  <input
                    autoFocus
                    style={styles.champInput}
                    placeholder="Numéro de vente, nom ou téléphone du client…"
                    value={rechercheRetour}
                    onChange={(e) => setRechercheRetour(e.target.value)}
                  />
                  <button type="submit" style={styles.boutonRecherche} disabled={rechercheRetourEnCours}>
                    {rechercheRetourEnCours ? '…' : 'Chercher'}
                  </button>
                </form>

                {erreurRechercheRetour && <p style={{ color: 'var(--error)', fontSize: 13 }}>{erreurRechercheRetour}</p>}

                {resultatsRetour.length > 0 && (
                  <div style={styles.listeAttente}>
                    {resultatsRetour.map((vente) => (
                      <div key={vente.id} style={styles.carteAttente}>
                        <div style={styles.enTeteCarteAttente}>
                          <span style={{ fontWeight: 700 }}>
                            Vente {vente.numero} — {Number(vente.totalNet).toLocaleString('fr-FR')} F
                          </span>
                          <span style={styles.texteMuet}>
                            {new Date(vente.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div style={styles.texteMuet}>
                          Client : {vente.client ? vente.client.nomComplet : 'Non renseigné'} — {vente.lieu.nom}
                        </div>
                        <div style={styles.texteMuet}>
                          {vente.lignes.map((l) => `${l.article.designation} ×${l.quantite}`).join(', ')}
                        </div>
                        <div style={styles.boutonsCarteAttente}>
                          <button onClick={() => selectionnerVenteOrigine(vente)} style={styles.boutonReprendre}>
                            Sélectionner
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {resultatsRetour.length === 0 && !erreurRechercheRetour && (
                  <p style={styles.texteMuet}>Recherchez la vente d'origine du client pour commencer un retour.</p>
                )}
              </>
            ) : (
              <>
                <div style={styles.carteAttente}>
                  <div style={styles.enTeteCarteAttente}>
                    <span style={{ fontWeight: 700 }}>Vente {venteOrigine.numero}</span>
                    <button onClick={annulerSelectionRetour} style={styles.boutonRetirer}>✕ Changer de vente</button>
                  </div>
                  <div style={styles.texteMuet}>
                    Client : {venteOrigine.client ? venteOrigine.client.nomComplet : 'Non renseigné'}
                  </div>
                </div>

                <label style={styles.champLabel}>
                  Boutique de retour (où l'article revient en stock)
                  <select style={styles.champInput} value={lieuRetourId} onChange={(e) => setLieuRetourId(e.target.value)}>
                    <option value="">—</option>
                    {lieux.map((l) => (
                      <option key={l.id} value={l.id}>{l.nom}</option>
                    ))}
                  </select>
                </label>

                <div style={styles.colonnePanier}>
                  <h3 style={styles.titreBloc}>Articles à retourner</h3>
                  {lignesRetour.map((ligne) => (
                    <div key={ligne.articleId} style={styles.ligneAmpanier}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{ligne.designation}</div>
                        <div style={{ fontSize: 12, color: 'var(--brown-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          Acheté ×{ligne.quantiteVendue} — Valeur unitaire :
                          <input
                            type="number"
                            min="0"
                            value={ligne.prixUnitaire}
                            onChange={(e) => changerPrixRetour(ligne.articleId, e.target.value)}
                            style={{ ...styles.champInput, minWidth: 80, padding: '4px 6px' }}
                          />
                          F
                        </div>
                      </div>
                      <div style={styles.controlesQuantite}>
                        <button onClick={() => changerQuantiteRetour(ligne.articleId, ligne.quantiteRetour - 1)} style={styles.boutonQte}>−</button>
                        <span>{ligne.quantiteRetour}</span>
                        <button onClick={() => changerQuantiteRetour(ligne.articleId, ligne.quantiteRetour + 1)} style={styles.boutonQte}>+</button>
                      </div>
                    </div>
                  ))}

                  <div style={styles.recapTotaux}>
                    <div style={styles.totalPanier}>
                      Valeur de l'avoir : {montantAvoirEstime.toLocaleString('fr-FR')} F
                    </div>
                  </div>
                </div>

                <div style={styles.boutonsAction}>
                  <button onClick={validerRetour} disabled={retourEnCours} style={styles.boutonValider}>
                    {retourEnCours ? 'Création…' : "Créer l'avoir"}
                  </button>
                </div>
              </>
            )}
          </>
        ) : ongletActif === 'avoirs' ? (
          <>
            <h2 style={styles.titreOnglet}>Avoirs</h2>

            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'ACTIF', label: 'Actifs' },
                { id: 'UTILISE', label: 'Utilisés' },
                { id: 'TOUS', label: 'Tous' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAvoirsFiltre(f.id)}
                  style={f.id === avoirsFiltre ? styles.filtreActif : styles.filtreInactif}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {avoirsErreur && <div style={styles.bandeauErreur}>{avoirsErreur}</div>}
            {avoirsChargement && <p style={styles.texteMuet}>Chargement…</p>}
            {!avoirsChargement && avoirsListe.length === 0 && (
              <p style={styles.texteMuet}>Aucun avoir pour ce filtre.</p>
            )}

            <div style={styles.listeAttente}>
              {avoirsListe.map((avoir) => (
                <div key={avoir.id} style={styles.carteAttente}>
                  <div style={styles.enTeteCarteAttente}>
                    <span style={{ fontWeight: 700 }}>
                      {avoir.reference} — {Number(avoir.montant).toLocaleString('fr-FR')} F
                    </span>
                    <span style={styles.texteMuet}>
                      {new Date(avoir.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div style={styles.texteMuet}>
                    Client : {avoir.venteOrigine?.client ? avoir.venteOrigine.client.nomComplet : 'Non renseigné'}
                    {' — '}Vente d'origine {avoir.venteOrigine?.numero || avoir.venteOrigineId}
                  </div>
                  {avoir.lignes && avoir.lignes.length > 0 && (
                    <div style={styles.texteMuet}>
                      {avoir.lignes.map((l) => `${l.article?.designation || ''} ×${l.quantite}`).join(', ')}
                    </div>
                  )}
                  <div
                    style={{
                      ...styles.ligneRecap,
                      fontWeight: 700,
                      color: avoir.statut === 'ACTIF' ? '#1E6B36' : 'var(--brown-soft)',
                    }}
                  >
                    <span>{avoir.statut === 'ACTIF' ? 'Actif' : 'Utilisé'}</span>
                    <span>
                      {avoir.statut === 'UTILISE' && avoir.dateUtilisation
                        ? `le ${new Date(avoir.dateUtilisation).toLocaleDateString('fr-FR')}`
                        : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : ongletActif !== 'nouvelle' ? (
          <p style={styles.texteMuet}>Cet écran arrive dans une prochaine session.</p>
        ) : (
          <>
            <div style={styles.enTeteVente}>
              <div style={styles.blocBoutiqueVendeur}>
                <label style={styles.champLabel}>
                  Boutique {!estAdmin && <span style={styles.texteVerrouille}>(fixée)</span>}
                  <select
                    style={styles.champInput}
                    value={lieuId}
                    onChange={(e) => setLieuId(e.target.value)}
                    disabled={!estAdmin}
                  >
                    <option value="">—</option>
                    {lieux.map((l) => (
                      <option key={l.id} value={l.id}>{l.nom}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.champLabel}>
                  Vendeur *
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

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ ...styles.blocClient, position: 'relative' }}>
                <span style={{ ...styles.champLabel, marginBottom: 4 }}>Client</span>
                {clientId ? (
                  <div style={styles.lignePaiement}>
                    <span>{clients.find((c) => String(c.id) === String(clientId))?.nomComplet || '—'}</span>
                    <button onClick={() => { setClientId(''); setClientSearch(''); }} style={styles.boutonRetirer}>✕</button>
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
                      <div style={styles.listeResultatsClient}>
                        {clients
                          .filter((c) =>
                            c.nomComplet.toLowerCase().includes(clientSearch.toLowerCase()) ||
                            (c.telephone || '').includes(clientSearch)
                          )
                          .slice(0, 6)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setClientId(String(c.id)); setClientSearch(''); }}
                              style={styles.itemResultatClient}
                            >
                              {c.nomComplet}{c.telephone ? ` — ${c.telephone}` : ''}
                            </button>
                          ))}
                        {clients.filter((c) =>
                          c.nomComplet.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          (c.telephone || '').includes(clientSearch)
                        ).length === 0 && (
                          <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--brown-soft)' }}>
                            Aucun client trouvé.
                            <button
                              type="button"
                              onClick={() => { setCreationClientOuverte(true); setNomNouveauClient(clientSearch); }}
                              style={{ ...styles.boutonAjouterPaiement, marginLeft: 8 }}
                            >
                              + Créer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {creationClientOuverte && (
                  <div style={{ ...styles.lignePaiement, flexDirection: 'column', alignItems: 'stretch', gap: 6, background: 'var(--cream)' }}>
                    <input
                      style={styles.champInput}
                      placeholder="Nom complet *"
                      value={nomNouveauClient}
                      onChange={(e) => setNomNouveauClient(e.target.value)}
                    />
                    <input
                      style={styles.champInput}
                      placeholder="Téléphone *"
                      value={telephoneNouveauClient}
                      onChange={(e) => setTelephoneNouveauClient(e.target.value)}
                    />
                    {erreurNouveauClient && <p style={{ color: 'var(--error)', fontSize: 12 }}>{erreurNouveauClient}</p>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => setCreationClientOuverte(false)} style={styles.boutonRetirer}>Annuler</button>
                      <button type="button" onClick={creerClientRapide} disabled={creationClientEnCours} style={styles.boutonAjouterPaiement}>
                        {creationClientEnCours ? '…' : 'Créer et sélectionner'}
                      </button>
                    </div>
                  </div>
                )}
                <p style={{ ...styles.texteMuet, marginTop: 4 }}>
                  Laissé vide, la vente est associée à "Client Comptoir".
                </p>
              </div>

              <div style={{ maxWidth: 340 }}>
                <label style={styles.champLabel}>
                  Code avoir (optionnel)
                  {!avoirVerifie ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        style={styles.champInput}
                        placeholder="Ex: AV-1234567890"
                        value={codeAvoir}
                        onChange={(e) => setCodeAvoir(e.target.value)}
                      />
                      <button
                        onClick={verifierAvoir}
                        disabled={avoirVerificationEnCours || !codeAvoir.trim()}
                        style={styles.boutonAjouterPaiement}
                      >
                        {avoirVerificationEnCours ? '…' : 'Vérifier'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ ...styles.lignePaiement, background: '#DFF3E3' }}>
                      <span>Avoir {avoirVerifie.reference} — {Number(avoirVerifie.montant).toLocaleString('fr-FR')} F</span>
                      <button onClick={retirerAvoir} style={styles.boutonRetirer}>✕</button>
                    </div>
                  )}
                </label>
                {erreurAvoir && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{erreurAvoir}</p>}
              </div>

              <div style={{ maxWidth: 340 }}>
                <label style={styles.champLabel}>
                  Carte cadeau (optionnel)
                  {!carteCadeauVerifiee ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        style={styles.champInput}
                        placeholder="Scanner ou saisir le code-barres"
                        value={codeCarteCadeau}
                        onChange={(e) => setCodeCarteCadeau(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); verifierCarteCadeau(); } }}
                      />
                      <button
                        onClick={verifierCarteCadeau}
                        disabled={carteCadeauVerificationEnCours || !codeCarteCadeau.trim()}
                        style={styles.boutonAjouterPaiement}
                      >
                        {carteCadeauVerificationEnCours ? '…' : 'Vérifier'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ ...styles.lignePaiement, background: '#DFF3E3' }}>
                      <span>Carte {carteCadeauVerifiee.codeBarre} — {Number(carteCadeauVerifiee.denomination).toLocaleString('fr-FR')} F</span>
                      <button onClick={retirerCarteCadeau} style={styles.boutonRetirer}>✕</button>
                    </div>
                  )}
                </label>
                {erreurCarteCadeau && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{erreurCarteCadeau}</p>}
              </div>

              <div style={{ maxWidth: 340 }}>
                <label style={styles.champLabel}>
                  Charger une facture pro forma (optionnel)
                  {!proFormaChargee ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        style={styles.champInput}
                        placeholder="Ex: PF-1234567890"
                        value={numeroProForma}
                        onChange={(e) => setNumeroProForma(e.target.value)}
                      />
                      <button
                        onClick={chargerProForma}
                        disabled={proFormaChargementEnCours || !numeroProForma.trim()}
                        style={styles.boutonAjouterPaiement}
                      >
                        {proFormaChargementEnCours ? '…' : 'Charger'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ ...styles.lignePaiement, background: '#DFF3E3' }}>
                      <span>Pro forma {proFormaChargee.numero} chargée ({proFormaChargee.lignes.length} article(s))</span>
                      <button onClick={retirerProForma} style={styles.boutonRetirer}>✕</button>
                    </div>
                  )}
                </label>
                {erreurProForma && <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{erreurProForma}</p>}
              </div>
            </div>

            {confirmation && (
              <div style={styles.bandeauConfirmation}>
                ✅ Vente {confirmation.numero} enregistrée — {Number(confirmation.totalNet).toLocaleString('fr-FR')} F
                {confirmation.montantRestantAffiche > 1 && (
                  <> — reste dû (crédit) : {confirmation.montantRestantAffiche.toLocaleString('fr-FR')} F</>
                )}
                {dernierTicketHtml && (
                  <button
                    onClick={() => imprimerTicketDepuisHtml(dernierTicketHtml)}
                    style={{ ...styles.boutonAjouterPaiement, marginLeft: 12 }}
                  >
                    🖨️ Réimprimer le ticket
                  </button>
                )}
                {numeroWhatsApp(confirmation.client?.telephone) && (
                  <a
                    href={`https://wa.me/${numeroWhatsApp(confirmation.client.telephone)}?text=${encodeURIComponent(construireMessageWhatsAppVente(confirmation))}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...styles.boutonAjouterPaiement, marginLeft: 8, textDecoration: 'none', display: 'inline-block' }}
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>
            )}
            {erreurVente && <div style={styles.bandeauErreur}>{erreurVente}</div>}

            <div style={styles.zonePrincipale}>
              <div style={styles.blocAjoutArticle}>
                <h3 style={styles.titreBloc}>Ajouter un article</h3>
                <form onSubmit={gererRecherche} style={styles.formRecherche}>
                  <input
                    ref={champRechercheRef}
                    autoFocus
                    style={styles.champInput}
                    placeholder="Scanner ou taper un nom/code…"
                    value={recherche}
                    onChange={(e) => gererSaisieRecherche(e.target.value)}
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
                            Stock boutique : {article.stockLieu ?? article.stockActuel}
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
                {avertissementStock && (
                  <div style={{ ...styles.bandeauErreur, marginBottom: 8 }}>{avertissementStock}</div>
                )}
                {panier.length > 4 && (
                  <input
                    style={{ ...styles.champInput, marginBottom: 8 }}
                    placeholder="Retrouver un article du panier par nom…"
                    value={filtrePanier}
                    onChange={(e) => setFiltrePanier(e.target.value)}
                  />
                )}
                {panier
                  .filter((ligne) => {
                    const f = filtrePanier.trim().toLowerCase();
                    if (!f) return true;
                    return ligne.designation.toLowerCase().includes(f);
                  })
                  .map((ligne) => {
                  const stockRestant = ligne.stockDispo != null ? ligne.stockDispo - ligne.quantite : null;
                  const stockEpuise = ligne.stockDispo != null && ligne.quantite >= ligne.stockDispo;
                  return (
                    <div key={ligne.articleId} style={styles.ligneAmpanier}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{ligne.designation}</div>
                        <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>
                          {ligne.prixUnitaire.toLocaleString('fr-FR')} F × {ligne.quantite}
                        </div>
                        {stockRestant != null && (
                          <div style={{ ...styles.badgeStock, color: stockRestant < 0 ? 'var(--error)' : 'var(--brown-soft)' }}>
                            Stock restant : {stockRestant}
                          </div>
                        )}
                      </div>
                      <div style={styles.controlesQuantite}>
                        <button onClick={() => changerQuantite(ligne.articleId, -1)} style={styles.boutonQte}>−</button>
                        <span>{ligne.quantite}</span>
                        <button
                          onClick={() => changerQuantite(ligne.articleId, 1)}
                          disabled={stockEpuise}
                          style={{ ...styles.boutonQte, opacity: stockEpuise ? 0.4 : 1, cursor: stockEpuise ? 'not-allowed' : 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                      <button onClick={() => retirerDuPanier(ligne.articleId)} style={styles.boutonRetirer}>✕</button>
                    </div>
                  );
                })}
                <div ref={finPanierRef} />

                <div style={styles.blocRemise}>
                  <label style={styles.champLabel}>
                    Remise (F)
                    <input
                      type="number"
                      min="0"
                      style={styles.champInput}
                      value={remiseMontant}
                      onChange={(e) => setRemiseMontant(e.target.value)}
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
                  {remiseDepassantSeuil && (
                    <label style={styles.champLabel}>
                      Code de déblocage administrateur (requis au-delà de {seuilRemise.toLocaleString('fr-FR')} F)
                      <input
                        type="text"
                        inputMode="numeric"
                        style={styles.champInput}
                        value={codeDeblocageRemise}
                        onChange={(e) => setCodeDeblocageRemise(e.target.value)}
                        placeholder="Code communiqué par l'administrateur…"
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
                      <span>−{remise.toLocaleString('fr-FR')} F</span>
                    </div>
                  )}
                  <div style={styles.totalPanier}>Total : {totalNet.toLocaleString('fr-FR')} F</div>
                </div>
              </div>

              <div style={styles.colonnePaiement}>
                <h3 style={styles.titreBloc}>Paiement</h3>

                {estCredit && (
                  <p style={{ ...styles.texteMuet, marginTop: 0 }}>
                    Vente à crédit : le paiement est optionnel. Ce qui n'est pas payé maintenant sera à régler plus tard, dans l'onglet "Ventes à crédit".
                  </p>
                )}

                {avoirVerifie && (
                  <div style={styles.ligneRecap}>
                    <span>Avoir appliqué</span>
                    <span>−{contributionAvoir.toLocaleString('fr-FR')} F</span>
                  </div>
                )}

                {carteCadeauVerifiee && (
                  <div style={styles.ligneRecap}>
                    <span>Carte cadeau appliquée</span>
                    <span>−{contributionCarteCadeau.toLocaleString('fr-FR')} F</span>
                  </div>
                )}

                <div style={styles.ajoutPaiement}>
                  <select
                    style={styles.champInput}
                    value={modeAAjouter}
                    onChange={(e) => setModeAAjouter(e.target.value)}
                  >
                    {MODES_PAIEMENT.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    style={{ ...styles.champInput, minWidth: 100 }}
                    placeholder="Montant"
                    value={montantAAjouter}
                    onChange={(e) => setMontantAAjouter(e.target.value)}
                  />
                  <button onClick={ajouterPaiement} style={styles.boutonAjouterPaiement}>
                    Ajouter
                  </button>
                </div>

                {paiements.length > 0 && (
                  <div style={styles.listePaiements}>
                    {paiements.map((p, index) => (
                      <div key={index} style={styles.lignePaiement}>
                        <span>{p.mode}</span>
                        <span style={{ fontWeight: 600 }}>{p.montant.toLocaleString('fr-FR')} F</span>
                        <button onClick={() => retirerPaiement(index)} style={styles.boutonRetirer}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {panier.length > 0 && (
                  <div style={styles.recapPaiement}>
                    <div style={styles.ligneRecap}>
                      <span>Total payé</span>
                      <span>{(totalPaiements + contributionAvoir + contributionCarteCadeau).toLocaleString('fr-FR')} F</span>
                    </div>
                    <div
                      style={{
                        ...styles.ligneRecap,
                        fontWeight: 700,
                        color: Math.abs(resteAPayer) <= 1 ? '#1E6B36' : (estCredit ? 'var(--brown-ink)' : 'var(--error)'),
                      }}
                    >
                      <span>
                        {resteAPayer > 1
                          ? (estCredit ? 'Restera dû (crédit)' : 'Reste à payer')
                          : resteAPayer < -1 ? 'Excédent' : 'Complet'}
                      </span>
                      <span>{resteAPayer.toLocaleString('fr-FR')} F</span>
                    </div>
                  </div>
                )}

                <div style={styles.boutonsAction}>
                  <button
                    onClick={annulerVenteEnCours}
                    disabled={panier.length === 0}
                    style={styles.boutonAnnulerVente}
                  >
                    Annuler (client désiste)
                  </button>
                  <button onClick={mettreEnAttente} style={styles.boutonAttente}>
                    Mettre en attente
                  </button>
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
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  sidebar: { width: 220, background: 'var(--brown-deep)', color: 'var(--cream)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 },
  boutonRetour: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', color: 'var(--cream)', cursor: 'pointer', fontSize: 13 },
  boutonEcranClient: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: 0.8 },
  navItemActif: { padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'var(--gold-deep)', color: 'var(--white)', fontWeight: 600 },
  badgeCompteur: { fontWeight: 700 },
  contenu: { flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' },
  titreOnglet: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 22 },
  enTeteVente: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  blocBoutiqueVendeur: { display: 'flex', gap: 12 },
  blocModeVente: { display: 'flex', gap: 12 },
  blocClient: { maxWidth: 340 },
  listeResultatsClient: { position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--white)', border: '1px solid var(--cream-deep)', borderRadius: 8, marginTop: 4, zIndex: 20, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(74,44,23,0.15)' },
  itemResultatClient: { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', borderBottom: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  texteVerrouille: { fontWeight: 400, fontSize: 11, color: 'var(--brown-soft)' },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, minWidth: 160 },
  bandeauConfirmation: { padding: '10px 14px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', flexWrap: 'wrap' },
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
  ajoutPaiement: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  boutonAjouterPaiement: { padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  listePaiements: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 },
  lignePaiement: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--cream)', fontSize: 13 },
  recapPaiement: { marginTop: 4, paddingTop: 10, borderTop: '2px solid var(--gold-mid)' },
  boutonsAction: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 },
  boutonAttente: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonAnnulerVente: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--error)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontWeight: 600 },
  boutonValider: { padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  listeAttente: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 },
  carteAttente: { background: 'var(--white)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 },
  enTeteCarteAttente: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  boutonsCarteAttente: { display: 'flex', gap: 8, marginTop: 6 },
  boutonReprendre: { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  filtreActif: { padding: '6px 14px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  filtreInactif: { padding: '6px 14px', borderRadius: 20, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
  badgeStock: { fontSize: 11, marginTop: 2, fontWeight: 600 },
};
