import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, getUtilisateur, telechargerFichierAvecAuth } from '../lib/api';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function debutSemaine() {
  const d = new Date();
  const jour = d.getDay(); // 0 = dimanche
  const decalage = jour === 0 ? 6 : jour - 1; // recule jusqu'au lundi
  d.setDate(d.getDate() - decalage);
  return d;
}

function debutMois() {
  const d = new Date();
  d.setDate(1);
  return d;
}

function imprimerFermetureCaisse(fermeture, lieuNom) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fermeture de caisse — ${fermeture.date}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Courier New', monospace; width: 76mm; margin: 4mm auto; font-size: 12px; color: #000; }
  .centre { text-align: center; }
  h1 { font-size: 16px; margin: 0 0 2px 0; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .ligne { display: flex; justify-content: space-between; margin: 2px 0; }
  .total { font-weight: bold; font-size: 14px; margin-top: 6px; }
  .section-titre { font-weight: bold; margin-top: 10px; }
</style>
</head>
<body>
  <div class="centre">
    <h1>JESMA U</h1>
    <div>${lieuNom || 'Toutes les boutiques'}</div>
    <div>Fermeture de caisse — ${fermeture.date}</div>
  </div>
  <hr>
  <div class="ligne"><span>Nombre de ventes</span><span>${fermeture.nombreVentes}</span></div>
  <div class="section-titre">Encaissements par mode</div>
  ${fermeture.parModePaiement.map((m) => `<div class="ligne"><span>${m.mode}</span><span>${m.montant.toLocaleString('fr-FR')} F</span></div>`).join('')}
  <hr>
  <div class="ligne total"><span>Total encaissé</span><span>${fermeture.totalEncaisse.toLocaleString('fr-FR')} F</span></div>
  <hr>
  <div class="section-titre">Avoirs</div>
  <div class="ligne"><span>Émis (${fermeture.avoirsEmis.nombre})</span><span>${fermeture.avoirsEmis.montant.toLocaleString('fr-FR')} F</span></div>
  <div class="ligne"><span>Utilisés (${fermeture.avoirsUtilises.nombre})</span><span>${fermeture.avoirsUtilises.montant.toLocaleString('fr-FR')} F</span></div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
  const fenetre = window.open('', '_blank', 'width=380,height=600');
  if (!fenetre) return;
  fenetre.document.write(html);
  fenetre.document.close();
}

const LIBELLES_TYPE_RECOMPENSE = {
  A_DEFINIR: 'À déterminer',
  REMISE: 'Remise',
  ARTICLE: 'Article offert',
  AUTRE: 'Autre',
};

export default function Etats() {
  const navigate = useNavigate();
  const utilisateur = getUtilisateur();
  const estAdmin = utilisateur?.role === 'ADMIN';

  const ONGLETS = [
    { id: 'date', label: 'Par date' },
    { id: 'mode', label: 'Par mode de paiement' },
    { id: 'type', label: 'Par type' },
    { id: 'vendeur', label: 'Meilleur vendeur' },
    ...(estAdmin ? [{ id: 'boutique', label: 'Récap boutiques' }] : []),
    ...(estAdmin ? [{ id: 'journal', label: "Journal d'activité" }] : []),
    { id: 'fermeture', label: 'Fermeture de caisse' },
    { id: 'fidelite', label: 'Récompenses fidélité' },
  ];

  const [ongletActif, setOngletActif] = useState('date');
  const [lieux, setLieux] = useState([]);
  const [lieuId, setLieuId] = useState('');

  const [dateDebut, setDateDebut] = useState(formatDate(new Date()));
  const [dateFin, setDateFin] = useState(formatDate(new Date()));
  const [raccourciActif, setRaccourciActif] = useState('aujourdhui');

  const [donnees, setDonnees] = useState(null);
  const [ongletDonnees, setOngletDonnees] = useState(null); // à quel onglet correspondent les données actuelles
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [exportEnCours, setExportEnCours] = useState(false);
  const compteurRequete = useRef(0);

  const [dateFermeture, setDateFermeture] = useState(formatDate(new Date()));
  const [fermeture, setFermeture] = useState(null);
  const [fermetureChargement, setFermetureChargement] = useState(false);
  const [fermetureErreur, setFermetureErreur] = useState('');

  // --- Récompenses fidélité ---
  const [recompenses, setRecompenses] = useState([]);
  const [recompensesChargement, setRecompensesChargement] = useState(false);
  const [recompensesErreur, setRecompensesErreur] = useState('');
  const [statutFiltre, setStatutFiltre] = useState('EN_ATTENTE');
  const [articles, setArticles] = useState([]);
  const [editionId, setEditionId] = useState(null);
  const [typeEdition, setTypeEdition] = useState('REMISE');
  const [valeurRemiseEdition, setValeurRemiseEdition] = useState('');
  const [articleIdEdition, setArticleIdEdition] = useState('');
  const [descriptionEdition, setDescriptionEdition] = useState('');
  const [actionEnCours, setActionEnCours] = useState(false);
  const [remiseEnCoursId, setRemiseEnCoursId] = useState(null);
  const [lieuRemiseId, setLieuRemiseId] = useState('');

  // --- Journal d'activité ---
  const [journal, setJournal] = useState([]);
  const [journalChargement, setJournalChargement] = useState(false);
  const [journalErreur, setJournalErreur] = useState('');
  const [journalTypeFiltre, setJournalTypeFiltre] = useState('');

  useEffect(() => {
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
  }, []);

  function appliquerRaccourci(id) {
    setRaccourciActif(id);
    const aujourdhui = new Date();
    if (id === 'aujourdhui') {
      setDateDebut(formatDate(aujourdhui));
      setDateFin(formatDate(aujourdhui));
    } else if (id === 'semaine') {
      setDateDebut(formatDate(debutSemaine()));
      setDateFin(formatDate(aujourdhui));
    } else if (id === 'mois') {
      setDateDebut(formatDate(debutMois()));
      setDateFin(formatDate(aujourdhui));
    }
  }

  async function chargerOnglet() {
    if (ongletActif === 'fermeture' || ongletActif === 'fidelite' || ongletActif === 'journal') return;
    // Compteur de requêtes : si une réponse plus ancienne arrive après une plus récente
    // (ex: clics rapides entre onglets), on l'ignore pour ne jamais afficher des données
    // qui ne correspondent pas à l'onglet actuellement affiché.
    const idRequete = ++compteurRequete.current;
    const ongletDemande = ongletActif;
    setChargement(true);
    setErreur('');
    try {
      const cheminParOnglet = {
        date: '/etats/par-date',
        mode: '/etats/par-mode-paiement',
        type: '/etats/par-type',
        vendeur: '/etats/meilleur-vendeur',
        boutique: '/etats/recap-boutique',
      };
      const params = new URLSearchParams({ dateDebut, dateFin });
      if (lieuId) params.set('lieuId', lieuId);
      const reponse = await appelApi('GET', `${cheminParOnglet[ongletDemande]}?${params.toString()}`);
      if (idRequete === compteurRequete.current) {
        setDonnees(reponse);
        setOngletDonnees(ongletDemande);
      }
    } catch (err) {
      if (idRequete === compteurRequete.current) {
        setErreur(err.message);
      }
    } finally {
      if (idRequete === compteurRequete.current) {
        setChargement(false);
      }
    }
  }

  useEffect(() => {
    chargerOnglet();
  }, [ongletActif, dateDebut, dateFin, lieuId]);

  async function exporterComptable(type) {
    setErreur('');
    setExportEnCours(true);
    try {
      const params = new URLSearchParams({ dateDebut, dateFin });
      if (lieuId) params.set('lieuId', lieuId);
      const chemin = `/etats/${type}/export.csv?${params.toString()}`;
      await telechargerFichierAvecAuth(chemin, `${type}-${dateDebut}-au-${dateFin}.csv`);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setExportEnCours(false);
    }
  }

  async function chargerFermeture() {
    setFermetureChargement(true);
    setFermetureErreur('');
    setFermeture(null);
    try {
      const params = new URLSearchParams({ date: dateFermeture });
      if (lieuId) params.set('lieuId', lieuId);
      const reponse = await appelApi('GET', `/etats/fermeture-caisse?${params.toString()}`);
      setFermeture(reponse);
    } catch (err) {
      setFermetureErreur(err.message);
    } finally {
      setFermetureChargement(false);
    }
  }

  useEffect(() => {
    if (ongletActif === 'fermeture') chargerFermeture();
  }, [ongletActif, dateFermeture, lieuId]);

  function chargerRecompenses() {
    setRecompensesChargement(true);
    setRecompensesErreur('');
    const params = statutFiltre ? `?statut=${statutFiltre}` : '';
    appelApi('GET', `/fidelite${params}`)
      .then(setRecompenses)
      .catch((err) => setRecompensesErreur(err.message))
      .finally(() => setRecompensesChargement(false));
  }

  useEffect(() => {
    if (ongletActif === 'fidelite') {
      chargerRecompenses();
      if (articles.length === 0) {
        appelApi('GET', '/articles').then(setArticles).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongletActif, statutFiltre]);

  function chargerJournal() {
    setJournalChargement(true);
    setJournalErreur('');
    const params = journalTypeFiltre ? `?type=${journalTypeFiltre}` : '';
    appelApi('GET', `/journal${params}`)
      .then(setJournal)
      .catch((err) => setJournalErreur(err.message))
      .finally(() => setJournalChargement(false));
  }

  useEffect(() => {
    if (ongletActif === 'journal') chargerJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongletActif, journalTypeFiltre]);

  function ouvrirDefinition(recompense) {
    setEditionId(recompense.id);
    setTypeEdition(recompense.type === 'A_DEFINIR' ? 'REMISE' : recompense.type);
    setValeurRemiseEdition(recompense.valeurRemise ? String(recompense.valeurRemise) : '');
    setArticleIdEdition(recompense.articleOffertId ? String(recompense.articleOffertId) : '');
    setDescriptionEdition(recompense.description || '');
  }

  async function enregistrerDefinition(recompense) {
    setRecompensesErreur('');
    setActionEnCours(true);
    try {
      await appelApi('PUT', `/fidelite/${recompense.id}`, {
        type: typeEdition,
        valeurRemise: typeEdition === 'REMISE' ? Number(valeurRemiseEdition) : undefined,
        articleOffertId: typeEdition === 'ARTICLE' ? Number(articleIdEdition) : undefined,
        description: descriptionEdition || undefined,
      });
      setEditionId(null);
      chargerRecompenses();
    } catch (err) {
      setRecompensesErreur(err.message);
    } finally {
      setActionEnCours(false);
    }
  }

  function demarrerMarquageRemis(recompense) {
    if (recompense.type === 'ARTICLE') {
      setRemiseEnCoursId(recompense.id);
      setLieuRemiseId('');
    } else {
      marquerRemis(recompense);
    }
  }

  async function marquerRemis(recompense, lieuId) {
    setRecompensesErreur('');
    setActionEnCours(true);
    try {
      await appelApi('POST', `/fidelite/${recompense.id}/marquer-utilisee`, lieuId ? { lieuId: Number(lieuId) } : undefined);
      setRemiseEnCoursId(null);
      chargerRecompenses();
    } catch (err) {
      setRecompensesErreur(err.message);
    } finally {
      setActionEnCours(false);
    }
  }

  // N'affiche les données que si elles correspondent bien à l'onglet actuellement sélectionné.
  const donneesAJour = donnees && ongletDonnees === ongletActif ? donnees : null;

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>← Tableau de bord</button>
        <h1 style={styles.titre}>États</h1>
      </div>

      <div style={styles.nav}>
        {ONGLETS.map((o) => (
          <div
            key={o.id}
            onClick={() => setOngletActif(o.id)}
            style={o.id === ongletActif ? styles.navItemActif : styles.navItem}
          >
            {o.label}
          </div>
        ))}
      </div>

      {ongletActif === 'fidelite' ? (
        <div style={styles.blocFiltres}>
          <div style={styles.raccourcis}>
            {[
              { id: 'EN_ATTENTE', label: 'En attente' },
              { id: 'DEFINIE', label: 'Cadeau défini' },
              { id: 'UTILISEE', label: 'Remis' },
              { id: '', label: 'Tous' },
            ].map((s) => (
              <button
                key={s.id || 'tous'}
                onClick={() => setStatutFiltre(s.id)}
                style={s.id === statutFiltre ? styles.filtreActif : styles.filtreInactif}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : ongletActif === 'journal' ? (
        <div style={styles.blocFiltres}>
          <div style={styles.raccourcis}>
            {[
              { id: '', label: 'Tout' },
              { id: 'ANNULATION_VENTE', label: 'Annulations de ventes' },
              { id: 'REMISE_APPROUVEE', label: 'Remises approuvées' },
              { id: 'REMISE_REFUSEE', label: 'Remises refusées' },
              { id: 'MODIFICATION_PRIX_ARTICLE', label: 'Modifications de prix' },
            ].map((t) => (
              <button
                key={t.id || 'tout'}
                onClick={() => setJournalTypeFiltre(t.id)}
                style={t.id === journalTypeFiltre ? styles.filtreActif : styles.filtreInactif}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={styles.blocFiltres}>
          <label style={styles.champLabel}>
            Boutique
            <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
              <option value="">Toutes les boutiques</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </select>
          </label>

          {ongletActif !== 'fermeture' ? (
            estAdmin ? (
              <>
                <div style={styles.raccourcis}>
                  {[
                    { id: 'aujourdhui', label: "Aujourd'hui" },
                    { id: 'semaine', label: 'Cette semaine' },
                    { id: 'mois', label: 'Ce mois' },
                    { id: 'personnalise', label: 'Personnalisé' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => appliquerRaccourci(r.id)}
                      style={r.id === raccourciActif ? styles.filtreActif : styles.filtreInactif}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <label style={styles.champLabel}>
                  Du
                  <input
                    type="date"
                    style={styles.champInput}
                    value={dateDebut}
                    onChange={(e) => { setDateDebut(e.target.value); setRaccourciActif('personnalise'); }}
                  />
                </label>
                <label style={styles.champLabel}>
                  Au
                  <input
                    type="date"
                    style={styles.champInput}
                    value={dateFin}
                    onChange={(e) => { setDateFin(e.target.value); setRaccourciActif('personnalise'); }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => exporterComptable('ventes')}
                    disabled={exportEnCours}
                    style={styles.boutonImprimer}
                  >
                    📤 Export ventes (CSV)
                  </button>
                  <button
                    onClick={() => exporterComptable('depenses')}
                    disabled={exportEnCours}
                    style={styles.boutonImprimer}
                  >
                    📤 Export dépenses (CSV)
                  </button>
                </div>
              </>
            ) : (
              <p style={styles.texteMuet}>Vue limitée à la journée en cours.</p>
            )
          ) : (
            <>
              <label style={styles.champLabel}>
                Date
                <input
                  type="date"
                  style={styles.champInput}
                  value={dateFermeture}
                  onChange={(e) => setDateFermeture(e.target.value)}
                  disabled={!estAdmin}
                />
              </label>
              {fermeture && (
                <button
                  onClick={() => imprimerFermetureCaisse(fermeture, lieux.find((l) => String(l.id) === String(lieuId))?.nom)}
                  style={styles.boutonImprimer}
                >
                  🖨️ Imprimer
                </button>
              )}
            </>
          )}
        </div>
      )}

      {ongletActif === 'fermeture' ? (
        <>
          {fermetureErreur && <div style={styles.bandeauErreur}>{fermetureErreur}</div>}
          {fermetureChargement && <p style={styles.texteMuet}>Chargement…</p>}
          {fermeture && (
            <div style={styles.cartesRecap}>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Ventes du jour</div>
                <div style={styles.carteValeur}>{fermeture.nombreVentes}</div>
              </div>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Total encaissé</div>
                <div style={styles.carteValeur}>{fermeture.totalEncaisse.toLocaleString('fr-FR')} F</div>
              </div>

              <div style={{ ...styles.carte, gridColumn: '1 / -1' }}>
                <div style={styles.carteLabel}>Encaissements par mode de paiement</div>
                {fermeture.parModePaiement.length === 0 && <p style={styles.texteMuet}>Aucun encaissement.</p>}
                {fermeture.parModePaiement.map((m) => (
                  <div key={m.mode} style={styles.ligneRecap}>
                    <span>{m.mode}</span>
                    <span style={{ fontWeight: 600 }}>{m.montant.toLocaleString('fr-FR')} F</span>
                  </div>
                ))}
              </div>

              <div style={styles.carte}>
                <div style={styles.carteLabel}>Avoirs émis</div>
                <div style={styles.carteValeur}>{fermeture.avoirsEmis.nombre}</div>
                <div style={styles.texteMuet}>{fermeture.avoirsEmis.montant.toLocaleString('fr-FR')} F</div>
              </div>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Avoirs utilisés</div>
                <div style={styles.carteValeur}>{fermeture.avoirsUtilises.nombre}</div>
                <div style={styles.texteMuet}>{fermeture.avoirsUtilises.montant.toLocaleString('fr-FR')} F</div>
              </div>
            </div>
          )}
        </>
      ) : ongletActif === 'fidelite' ? (
        <>
          {recompensesErreur && <div style={styles.bandeauErreur}>{recompensesErreur}</div>}
          {recompensesChargement && <p style={styles.texteMuet}>Chargement…</p>}
          {!recompensesChargement && recompenses.length === 0 && (
            <p style={styles.texteMuet}>Aucun client dans cette catégorie pour l'instant.</p>
          )}

          <div style={styles.tableauWrapper}>
            {recompenses.map((r) => (
              <div key={r.id} style={styles.carteAttente}>
                <div style={styles.enTeteCarteAttente}>
                  <span style={{ fontWeight: 700 }}>{r.client.nomComplet}</span>
                  <span style={styles.texteMuet}>Atteint le {new Date(r.dateAtteinte).toLocaleDateString('fr-FR')}</span>
                </div>
                <div style={styles.texteMuet}>
                  {r.client.telephone || 'Téléphone non renseigné'} — 10 achats consécutifs, {Number(r.montantCumule).toLocaleString('fr-FR')} F cumulés
                </div>

                {r.statut === 'UTILISEE' ? (
                  <div style={styles.texteMuet}>
                    ✅ Cadeau remis le {new Date(r.dateUtilisation).toLocaleDateString('fr-FR')} —{' '}
                    {r.type === 'REMISE' && `Remise de ${Number(r.valeurRemise).toLocaleString('fr-FR')} F`}
                    {r.type === 'ARTICLE' && `Article offert : ${r.articleOffert?.designation || '—'}`}
                    {r.type === 'AUTRE' && (r.description || 'Autre cadeau')}
                  </div>
                ) : editionId === r.id ? (
                  <div style={styles.formDefinitionCadeau}>
                    <select style={styles.champInput} value={typeEdition} onChange={(e) => setTypeEdition(e.target.value)}>
                      <option value="REMISE">Remise</option>
                      <option value="ARTICLE">Article offert</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                    {typeEdition === 'REMISE' && (
                      <input
                        type="number"
                        min="0"
                        style={styles.champInput}
                        placeholder="Montant de la remise (F)"
                        value={valeurRemiseEdition}
                        onChange={(e) => setValeurRemiseEdition(e.target.value)}
                      />
                    )}
                    {typeEdition === 'ARTICLE' && (
                      <select style={styles.champInput} value={articleIdEdition} onChange={(e) => setArticleIdEdition(e.target.value)}>
                        <option value="">— Choisir l'article —</option>
                        {articles.map((a) => (
                          <option key={a.id} value={a.id}>{a.designation}</option>
                        ))}
                      </select>
                    )}
                    <input
                      style={styles.champInput}
                      placeholder="Note (optionnel)…"
                      value={descriptionEdition}
                      onChange={(e) => setDescriptionEdition(e.target.value)}
                    />
                    <div style={styles.boutonsCarteAttente}>
                      <button onClick={() => enregistrerDefinition(r)} disabled={actionEnCours} style={styles.boutonReprendre}>
                        Enregistrer
                      </button>
                      <button onClick={() => setEditionId(null)} style={styles.boutonRetirer}>Annuler</button>
                    </div>
                  </div>
                ) : r.statut === 'DEFINIE' ? (
                  <>
                    <div style={styles.texteMuet}>
                      🎁 Cadeau prévu : {r.type === 'REMISE' && `Remise de ${Number(r.valeurRemise).toLocaleString('fr-FR')} F`}
                      {r.type === 'ARTICLE' && `Article offert : ${r.articleOffert?.designation || '—'}`}
                      {r.type === 'AUTRE' && (r.description || 'Autre cadeau')}
                    </div>
                    <div style={styles.boutonsCarteAttente}>
                      <button onClick={() => ouvrirDefinition(r)} style={styles.boutonReprendre}>Modifier</button>
                      <button onClick={() => demarrerMarquageRemis(r)} disabled={actionEnCours} style={styles.boutonReprendre}>
                        Marquer comme remis
                      </button>
                    </div>
                    {remiseEnCoursId === r.id && (
                      <div style={styles.formDefinitionCadeau}>
                        <select style={styles.champInput} value={lieuRemiseId} onChange={(e) => setLieuRemiseId(e.target.value)}>
                          <option value="">— D'où sort l'article ? —</option>
                          {lieux.map((l) => (
                            <option key={l.id} value={l.id}>{l.nom}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => marquerRemis(r, lieuRemiseId)}
                          disabled={actionEnCours || !lieuRemiseId}
                          style={styles.boutonReprendre}
                        >
                          Confirmer la sortie de stock
                        </button>
                        <button onClick={() => setRemiseEnCoursId(null)} style={styles.boutonRetirer}>Annuler</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={styles.boutonsCarteAttente}>
                    <button onClick={() => ouvrirDefinition(r)} style={styles.boutonReprendre}>Définir le cadeau</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : ongletActif === 'journal' ? (
        <>
          {journalErreur && <div style={styles.bandeauErreur}>{journalErreur}</div>}
          {journalChargement && <p style={styles.texteMuet}>Chargement…</p>}
          {!journalChargement && journal.length === 0 && (
            <p style={styles.texteMuet}>Aucune activité enregistrée pour l'instant.</p>
          )}
          <div style={styles.tableauWrapper}>
            {journal.map((entree) => (
              <div key={entree.id} style={styles.carteAttente}>
                <div style={styles.enTeteCarteAttente}>
                  <span style={{ fontWeight: 700 }}>{entree.description}</span>
                  <span style={styles.texteMuet}>
                    {new Date(entree.createdAt).toLocaleDateString('fr-FR')}{' '}
                    {new Date(entree.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={styles.texteMuet}>Par {entree.utilisateur?.nomComplet || '—'}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
          {chargement && <p style={styles.texteMuet}>Chargement…</p>}

          {donneesAJour && ongletActif === 'date' && (
            <div style={styles.tableauWrapper}>
              <p style={styles.texteMuet}>
                {donneesAJour.nombreVentes} vente(s) — Total : {donneesAJour.total.toLocaleString('fr-FR')} F
              </p>
              {donneesAJour.ventes.map((v) => (
                <div key={v.id} style={styles.carteAttente}>
                  <div style={styles.enTeteCarteAttente}>
                    <span style={{ fontWeight: 700 }}>{v.numero} — {Number(v.totalNet).toLocaleString('fr-FR')} F</span>
                    <span style={styles.texteMuet}>{new Date(v.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                  <div style={styles.texteMuet}>
                    {v.client ? v.client.nomComplet : 'Client non renseigné'} — {v.vendeur ? v.vendeur.nomComplet : '—'} — {v.lieu.nom} — {v.typeVente === 'CREDIT' ? 'Crédit' : 'Comptant'}
                  </div>
                </div>
              ))}
              {donneesAJour.ventes.length === 0 && <p style={styles.texteMuet}>Aucune vente sur cette période.</p>}
            </div>
          )}

          {donneesAJour && ongletActif === 'mode' && (
            <div style={styles.cartesRecap}>
              <div style={{ ...styles.carte, gridColumn: '1 / -1' }}>
                <div style={styles.carteLabel}>Total encaissé</div>
                <div style={styles.carteValeur}>{donneesAJour.total.toLocaleString('fr-FR')} F</div>
              </div>
              {donneesAJour.resultats.map((r) => (
                <div key={r.mode} style={styles.carte}>
                  <div style={styles.carteLabel}>{r.mode}</div>
                  <div style={styles.carteValeur}>{r.montant.toLocaleString('fr-FR')} F</div>
                </div>
              ))}
              {donneesAJour.resultats.length === 0 && <p style={styles.texteMuet}>Aucun paiement sur cette période.</p>}
            </div>
          )}

          {donneesAJour && ongletActif === 'type' && (
            <div style={styles.cartesRecap}>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Comptant</div>
                <div style={styles.carteValeur}>{donneesAJour.comptant.total.toLocaleString('fr-FR')} F</div>
                <div style={styles.texteMuet}>{donneesAJour.comptant.nombre} vente(s)</div>
              </div>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Crédit</div>
                <div style={styles.carteValeur}>{donneesAJour.credit.total.toLocaleString('fr-FR')} F</div>
                <div style={styles.texteMuet}>{donneesAJour.credit.nombre} vente(s)</div>
              </div>
            </div>
          )}

          {donneesAJour && ongletActif === 'vendeur' && (
            <div style={styles.tableauWrapper}>
              {donneesAJour.resultats.map((v, i) => (
                <div key={v.vendeurId} style={styles.carteAttente}>
                  <div style={styles.enTeteCarteAttente}>
                    <span style={{ fontWeight: 700 }}>{i + 1}. {v.nom}</span>
                    <span style={{ fontWeight: 700 }}>{v.chiffreAffaires.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div style={styles.texteMuet}>{v.nombreVentes} vente(s)</div>
                </div>
              ))}
              {donneesAJour.resultats.length === 0 && <p style={styles.texteMuet}>Aucune vente sur cette période.</p>}
            </div>
          )}

          {donneesAJour && ongletActif === 'boutique' && estAdmin && (
            <div style={styles.cartesRecap}>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Ventes</div>
                <div style={styles.carteValeur}>{donneesAJour.totalVentes.toLocaleString('fr-FR')} F</div>
                <div style={styles.texteMuet}>{donneesAJour.nombreVentes} vente(s)</div>
              </div>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Remises accordées</div>
                <div style={styles.carteValeur}>{donneesAJour.totalRemises.toLocaleString('fr-FR')} F</div>
              </div>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Cartes cadeaux activées</div>
                <div style={styles.carteValeur}>{donneesAJour.totalCartesCadeaux.toLocaleString('fr-FR')} F</div>
              </div>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Dépenses</div>
                <div style={styles.carteValeur}>{donneesAJour.totalDepenses.toLocaleString('fr-FR')} F</div>
              </div>
              <div style={styles.carte}>
                <div style={styles.carteLabel}>Résultat net</div>
                <div style={styles.carteValeur}>{donneesAJour.resultatNet.toLocaleString('fr-FR')} F</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  page: { padding: 24, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 16 },
  enTete: { display: 'flex', alignItems: 'center', gap: 16 },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 },
  boutonRetour: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', color: 'var(--brown-ink)', cursor: 'pointer', fontSize: 13 },
  nav: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  navItem: { padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1px solid var(--cream-deep)' },
  navItemActif: { padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: 'var(--gold-deep)', color: 'var(--white)', fontWeight: 600, border: '1px solid var(--gold-deep)' },
  blocFiltres: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', background: 'var(--white)', padding: 16, borderRadius: 12 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, minWidth: 160 },
  raccourcis: { display: 'flex', gap: 6 },
  filtreActif: { padding: '6px 14px', borderRadius: 20, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  filtreInactif: { padding: '6px 14px', borderRadius: 20, border: '1px solid var(--cream-deep)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
  boutonImprimer: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13, height: 38 },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 14, fontWeight: 600 },
  tableauWrapper: { display: 'flex', flexDirection: 'column', gap: 10 },
  carteAttente: { background: 'var(--white)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 },
  enTeteCarteAttente: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  ligneRecap: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--brown-soft)', marginBottom: 4 },
  cartesRecap: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 },
  carte: { background: 'var(--white)', borderRadius: 12, padding: 16 },
  carteLabel: { fontSize: 13, color: 'var(--brown-soft)', marginBottom: 4 },
  carteValeur: { fontSize: 22, fontWeight: 700 },
  boutonsCarteAttente: { display: 'flex', gap: 8, marginTop: 6 },
  boutonReprendre: { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  boutonRetirer: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  formDefinitionCadeau: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
};
