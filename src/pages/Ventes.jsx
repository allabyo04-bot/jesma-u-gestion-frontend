import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, getUtilisateur } from '../lib/api';
import { diffuserEtatPanier, diffuserVenteValidee, ecouterCanal } from '../lib/broadcast';

const ONGLETS = [
  { id: 'nouvelle', label: 'Nouvelle vente' },
  { id: 'attente', label: 'En attente' },
  { id: 'credit', label: 'Ventes à crédit' },
  { id: 'historique', label: 'Historique' },
  { id: 'retours', label: 'Retours-Échanges' },
  { id: 'cartes', label: 'Cartes cadeaux' },
  { id: 'listes', label: 'Listes cadeaux' },
  { id: 'avoirs', label: 'Avoirs' },
];

const MODES_PAIEMENT = [
  'Espèces', 'Moov Money', 'MTN Money', 'Orange Money',
  'Wave', 'Carte bancaire', 'Bon d\'achat', 'Avoir',
];

const CLE_STOCKAGE_ATTENTE = 'jesma_ventes_attente';

function chargerVentesEnAttente() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE_ATTENTE);
    return brut ? JSON.parse(brut) : [];
  } catch {
    return [];
  }
}

export default function Ventes() {
  const navigate = useNavigate();
  const utilisateur = getUtilisateur();
  const estAdmin = utilisateur?.role === 'ADMIN';
  const [ongletActif, setOngletActif] = useState('nouvelle');

  const [panier, setPanier] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [erreurRecherche, setErreurRecherche] = useState('');
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [remiseMontant, setRemiseMontant] = useState('');
  const [motifRemise, setMotifRemise] = useState('');

  const [lieux, setLieux] = useState([]);
  const [vendeurs, setVendeurs] = useState([]);
  const [lieuId, setLieuId] = useState('');
  const [vendeurId, setVendeurId] = useState('');
  const [typeVente, setTypeVente] = useState('Comptant');

  const [paiements, setPaiements] = useState([]);
  const [modeAAjouter, setModeAAjouter] = useState(MODES_PAIEMENT[0]);
  const [montantAAjouter, setMontantAAjouter] = useState('');

  const [venteEnCours, setVenteEnCours] = useState(false);
  const [erreurVente, setErreurVente] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const [ventesEnAttente, setVentesEnAttente] = useState([]);

  // --- Ventes à crédit ---
  const [creditVentes, setCreditVentes] = useState([]);
  const [creditChargement, setCreditChargement] = useState(false);
  const [creditErreur, setCreditErreur] = useState('');
  const [creditFiltre, setCreditFiltre] = useState('EN_COURS'); // EN_COURS | SOLDE | tous
  const [venteReglementOuvert, setVenteReglementOuvert] = useState(null); // id de la vente en cours de règlement
  const [modeReglement, setModeReglement] = useState(MODES_PAIEMENT[0]);
  const [montantReglement, setMontantReglement] = useState('');
  const [reglementEnCours, setReglementEnCours] = useState(false);

  useEffect(() => {
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
    appelApi('GET', '/vendeurs').then(setVendeurs).catch(() => {});
    setVentesEnAttente(chargerVentesEnAttente());
  }, []);

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

  function sauvegarderListeAttente(liste) {
    setVentesEnAttente(liste);
    localStorage.setItem(CLE_STOCKAGE_ATTENTE, JSON.stringify(liste));
  }

  async function gererRecherche(e) {
    e.preventDefault();
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
      } else {
        setResultats(reponse.resultats);
      }
    } catch (err) {
      setErreurRecherche(err.message);
    } finally {
      setRechercheEnCours(false);
    }
  }

  function ajouterAuPanier(article) {
    setPanier((prec) => {
      const existant = prec.find((l) => l.articleId === article.id);
      if (existant) {
        return prec.map((l) =>
          l.articleId === article.id ? { ...l, quantite: l.quantite + 1 } : l
        );
      }
      return [
        ...prec,
        {
          articleId: article.id,
          designation: article.designation,
          prixUnitaire: Number(article.prixVente),
          quantite: 1,
          stockDispo: article.stockLieu ?? article.stockActuel,
          photoUrl: article.photoUrl || null,
        },
      ];
    });
  }

  function changerQuantite(articleId, delta) {
    setPanier((prec) =>
      prec
        .map((l) =>
          l.articleId === articleId ? { ...l, quantite: Math.max(0, l.quantite + delta) } : l
        )
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
  }

  function reinitialiserVente() {
    setPanier([]);
    setRemiseMontant('');
    setMotifRemise('');
    setPaiements([]);
    setMontantAAjouter('');
    setTypeVente('Comptant');
  }

  const totalBrut = panier.reduce((somme, l) => somme + l.prixUnitaire * l.quantite, 0);
  const remise = Math.min(Number(remiseMontant) || 0, totalBrut);
  const totalNet = totalBrut - remise;
  const totalPaiements = paiements.reduce((s, p) => s + p.montant, 0);
  const resteAPayer = totalNet - totalPaiements;
  const estCredit = typeVente === 'Crédit';

  useEffect(() => {
    if (panier.length > 0 && resteAPayer > 0) {
      setMontantAAjouter(String(resteAPayer));
    } else if (panier.length === 0) {
      setMontantAAjouter('');
    }
  }, [resteAPayer, panier.length]);

  useEffect(() => {
    diffuserEtatPanier({ panier, remise });
  }, [panier, remise]);

  useEffect(() => {
    return ecouterCanal((message) => {
      if (message.type === 'DEMANDE_ETAT') {
        diffuserEtatPanier({ panier, remise });
      }
    });
  }, [panier, remise]);

  function ajouterPaiement() {
    const montant = Number(montantAAjouter);
    if (!montant || montant <= 0) return;
    setPaiements((prec) => [...prec, { mode: modeAAjouter, montant }]);
  }

  function retirerPaiement(index) {
    setPaiements((prec) => prec.filter((_, i) => i !== index));
  }

  function mettreEnAttente() {
    setErreurVente('');
    if (panier.length === 0) {
      setErreurVente('Le panier est vide, rien à mettre en attente.');
      return;
    }

    const venteSuspendue = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      panier,
      remiseMontant,
      motifRemise,
      lieuId,
      vendeurId,
      typeVente,
    };

    sauvegarderListeAttente([venteSuspendue, ...ventesEnAttente]);
    reinitialiserVente();
    setConfirmation(null);
  }

  function reprendreVente(id) {
    const vente = ventesEnAttente.find((v) => v.id === id);
    if (!vente) return;

    setPanier(vente.panier);
    setRemiseMontant(vente.remiseMontant);
    setMotifRemise(vente.motifRemise);
    setLieuId(vente.lieuId);
    setVendeurId(vente.vendeurId);
    setTypeVente(vente.typeVente);
    setPaiements([]);

    sauvegarderListeAttente(ventesEnAttente.filter((v) => v.id !== id));
    setOngletActif('nouvelle');
  }

  function supprimerVenteEnAttente(id) {
    sauvegarderListeAttente(ventesEnAttente.filter((v) => v.id !== id));
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
    if (!estCredit && paiements.length === 0) {
      setErreurVente('Ajoutez au moins un mode de paiement.');
      return;
    }
    if (resteAPayer < -1) {
      setErreurVente(`Le total des paiements dépasse le montant de ${Math.abs(resteAPayer).toLocaleString('fr-FR')} F.`);
      return;
    }
    if (!estCredit && resteAPayer > 1) {
      setErreurVente(`Il reste ${resteAPayer.toLocaleString('fr-FR')} F à couvrir.`);
      return;
    }

    setVenteEnCours(true);
    try {
      const vente = await appelApi('POST', '/ventes', {
        lieuId: Number(lieuId),
        vendeurId: vendeurId ? Number(vendeurId) : null,
        typeVente: estCredit ? 'CREDIT' : 'COMPTANT',
        remiseMontant: remise > 0 ? remise : undefined,
        motifRemise: motifRemise || undefined,
        lignes: panier.map((l) => ({
          articleId: l.articleId,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
        paiements: paiements.map((p) => ({ mode: p.mode, montant: p.montant })),
      });
      setConfirmation({ ...vente, montantRestantAffiche: estCredit ? resteAPayer : 0 });
      diffuserVenteValidee(vente);
      reinitialiserVente();
    } catch (err) {
      setErreurVente(err.message);
    } finally {
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

            <div style={styles.blocClient}>
              <label style={styles.champLabel}>
                Client
                <input style={styles.champInput} placeholder="Rechercher un client…" />
              </label>
            </div>

            {confirmation && (
              <div style={styles.bandeauConfirmation}>
                ✅ Vente {confirmation.numero} enregistrée — {Number(confirmation.totalNet).toLocaleString('fr-FR')} F
                {confirmation.montantRestantAffiche > 1 && (
                  <> — reste dû (crédit) : {confirmation.montantRestantAffiche.toLocaleString('fr-FR')} F</>
                )}
              </div>
            )}
            {erreurVente && <div style={styles.bandeauErreur}>{erreurVente}</div>}

            <div style={styles.zonePrincipale}>
              <div style={styles.blocAjoutArticle}>
                <h3 style={styles.titreBloc}>Ajouter un article</h3>
                <form onSubmit={gererRecherche} style={styles.formRecherche}>
                  <input
                    autoFocus
                    style={styles.champInput}
                    placeholder="Scanner ou taper un nom/code…"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
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
                {panier.map((ligne) => (
                  <div key={ligne.articleId} style={styles.ligneAmpanier}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ligne.designation}</div>
                      <div style={{ fontSize: 12, color: 'var(--brown-soft)' }}>
                        {ligne.prixUnitaire.toLocaleString('fr-FR')} F × {ligne.quantite}
                      </div>
                    </div>
                    <div style={styles.controlesQuantite}>
                      <button onClick={() => changerQuantite(ligne.articleId, -1)} style={styles.boutonQte}>−</button>
                      <span>{ligne.quantite}</span>
                      <button onClick={() => changerQuantite(ligne.articleId, 1)} style={styles.boutonQte}>+</button>
                    </div>
                    <button onClick={() => retirerDuPanier(ligne.articleId)} style={styles.boutonRetirer}>✕</button>
                  </div>
                ))}

                {panier.length > 0 && (
                  <>
                    <div style={styles.blocRemise}>
                      <label style={styles.champLabel}>
                        Remise (F)
                        <input
                          type="number"
                          min="0"
                          style={styles.champInput}
                          value={remiseMontant}
                          onChange={(e) => setRemiseMontant(e.target.value)}
                          placeholder="0"
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
                    </div>

                    <div style={styles.recapTotaux}>
                      <div style={styles.ligneRecap}>
                        <span>Sous-total</span>
                        <span>{totalBrut.toLocaleString('fr-FR')} F</span>
                      </div>
                      {remise > 0 && (
                        <div style={styles.ligneRecap}>
                          <span>Remise</span>
                          <span style={{ color: 'var(--error)' }}>−{remise.toLocaleString('fr-FR')} F</span>
                        </div>
                      )}
                      <div style={styles.totalPanier}>
                        Total : {totalNet.toLocaleString('fr-FR')} F
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={styles.colonnePaiement}>
                <h3 style={styles.titreBloc}>Paiement</h3>

                {estCredit && (
                  <p style={{ ...styles.texteMuet, marginTop: 0 }}>
                    Vente à crédit : le paiement est optionnel. Ce qui n'est pas payé maintenant sera à régler plus tard, dans l'onglet "Ventes à crédit".
                  </p>
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
                      <span>{totalPaiements.toLocaleString('fr-FR')} F</span>
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
  blocClient: { maxWidth: 400 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  texteVerrouille: { fontWeight: 400, fontSize: 11, color: 'var(--brown-soft)' },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, minWidth: 160 },
  bandeauConfirmation: { padding: '10px 14px', borderRadius: 8, background: '#DFF3E3', color: '#1E6B36', fontSize: 14, fontWeight: 600 },
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
  boutonValider: { padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  listeAttente: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 },
  carteAttente: { background: 'var(--white)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 },
  enTeteCarteAttente: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  boutonsCarteAttente: { display: 'flex', gap: 8, marginTop: 6 },
  boutonReprendre: { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  filtreActif: { padding: '6px 14px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  filtreInactif: { padding: '6px 14px', borderRadius: 20, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
};