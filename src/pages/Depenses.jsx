import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, getUtilisateur } from '../lib/api';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function Depenses() {
  const navigate = useNavigate();
  const utilisateur = getUtilisateur();
  const estAdmin = utilisateur?.role === 'ADMIN';

  const [ongletActif, setOngletActif] = useState('liste');
  const [categories, setCategories] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [categorieFiltre, setCategorieFiltre] = useState('');
  const [dateDebut, setDateDebut] = useState(formatDate(new Date()));
  const [dateFin, setDateFin] = useState(formatDate(new Date()));

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  const [budget, setBudget] = useState(null);
  const [budgetChargement, setBudgetChargement] = useState(false);

  useEffect(() => {
    appelApi('GET', '/depenses/categories').then(setCategories).catch(() => {});
  }, []);

  function chargerDepenses() {
    setChargement(true);
    setErreur('');
    const params = new URLSearchParams();
    if (estAdmin) {
      if (categorieFiltre) params.set('categorieId', categorieFiltre);
      if (dateDebut) params.set('dateDebut', dateDebut);
      if (dateFin) params.set('dateFin', dateFin);
    }
    appelApi('GET', `/depenses?${params.toString()}`)
      .then(setDepenses)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    if (ongletActif === 'liste') chargerDepenses();
  }, [ongletActif, categorieFiltre, dateDebut, dateFin]);

  function chargerBudget() {
    setBudgetChargement(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    appelApi('GET', `/depenses/budget?${params.toString()}`)
      .then(setBudget)
      .catch((err) => setErreur(err.message))
      .finally(() => setBudgetChargement(false));
  }

  useEffect(() => {
    if (estAdmin && ongletActif === 'budget') chargerBudget();
  }, [ongletActif, dateDebut, dateFin]);

  const totalListe = depenses.reduce((s, d) => s + Number(d.montant), 0);

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>← Tableau de bord</button>
        <h1 style={styles.titre}>Dépenses</h1>
        <button onClick={() => setFormulaireOuvert(true)} style={styles.boutonAjouter}>
          + Nouvelle dépense
        </button>
      </div>

      {estAdmin && (
        <div style={styles.nav}>
          <div onClick={() => setOngletActif('liste')} style={ongletActif === 'liste' ? styles.navItemActif : styles.navItem}>
            Liste
          </div>
          <div onClick={() => setOngletActif('budget')} style={ongletActif === 'budget' ? styles.navItemActif : styles.navItem}>
            Budget par catégorie
          </div>
        </div>
      )}

      {estAdmin ? (
        <div style={styles.blocFiltres}>
          <label style={styles.champLabel}>
            Catégorie
            <select style={styles.champInput} value={categorieFiltre} onChange={(e) => setCategorieFiltre(e.target.value)}>
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </label>
          <label style={styles.champLabel}>
            Du
            <input type="date" style={styles.champInput} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </label>
          <label style={styles.champLabel}>
            Au
            <input type="date" style={styles.champInput} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </label>
        </div>
      ) : (
        <p style={styles.texteMuet}>Tes dépenses du jour uniquement.</p>
      )}

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}

      {ongletActif === 'liste' ? (
        <>
          {chargement && <p style={styles.texteMuet}>Chargement…</p>}
          {!chargement && depenses.length === 0 && <p style={styles.texteMuet}>Aucune dépense pour l'instant.</p>}
          {!chargement && depenses.length > 0 && (
            <>
              <p style={styles.texteMuet}>{depenses.length} dépense(s) — Total : {totalListe.toLocaleString('fr-FR')} F</p>
              <div style={styles.tableauWrapper}>
                <table style={styles.tableau}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Catégorie</th>
                      <th style={styles.th}>Description</th>
                      {estAdmin && <th style={styles.th}>Par</th>}
                      <th style={styles.th}>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depenses.map((d) => (
                      <tr key={d.id}>
                        <td style={styles.td}>{new Date(d.dateDepense).toLocaleDateString('fr-FR')}</td>
                        <td style={styles.td}>{d.categorie.nom}</td>
                        <td style={styles.td}>{d.description || '—'}</td>
                        {estAdmin && <td style={styles.td}>{d.utilisateur?.nomComplet || '—'}</td>}
                        <td style={{ ...styles.td, fontWeight: 700 }}>{Number(d.montant).toLocaleString('fr-FR')} F</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {budgetChargement && <p style={styles.texteMuet}>Chargement…</p>}
          {budget && (
            <div style={styles.cartesRecap}>
              <div style={{ ...styles.carte, gridColumn: '1 / -1' }}>
                <div style={styles.carteLabel}>Total général</div>
                <div style={styles.carteValeur}>{budget.totalGeneral.toLocaleString('fr-FR')} F</div>
              </div>
              {Object.entries(budget.parCategorie).map(([nom, montant]) => (
                <div key={nom} style={styles.carte}>
                  <div style={styles.carteLabel}>{nom}</div>
                  <div style={styles.carteValeur}>{montant.toLocaleString('fr-FR')} F</div>
                </div>
              ))}
              {Object.keys(budget.parCategorie).length === 0 && (
                <p style={styles.texteMuet}>Aucune dépense sur cette période.</p>
              )}
            </div>
          )}
        </>
      )}

      {formulaireOuvert && (
        <FormulaireDepense
          categories={categories}
          onFermer={() => setFormulaireOuvert(false)}
          onCree={() => {
            setFormulaireOuvert(false);
            chargerDepenses();
          }}
        />
      )}
    </div>
  );
}

function FormulaireDepense({ categories, onFermer, onCree }) {
  const [categorieId, setCategorieId] = useState('');
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [dateDepense, setDateDepense] = useState(formatDate(new Date()));
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');

    if (!categorieId || !montant) {
      setErreur('Catégorie et montant sont requis.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await appelApi('POST', '/depenses', {
        categorieId: Number(categorieId),
        montant: Number(montant),
        description: description || undefined,
        dateDepense,
      });
      onCree();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onFermer}>
      <form style={styles.formulaire} onClick={(e) => e.stopPropagation()} onSubmit={gererSoumission}>
        <h2 style={styles.titreFormulaire}>Nouvelle dépense</h2>

        {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}

        <label style={styles.champLabel}>
          Catégorie *
          <select style={styles.champInput} value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </label>

        <label style={styles.champLabel}>
          Montant (F) *
          <input type="number" min="0" style={styles.champInput} value={montant} onChange={(e) => setMontant(e.target.value)} />
        </label>

        <label style={styles.champLabel}>
          Date
          <input type="date" style={styles.champInput} value={dateDepense} onChange={(e) => setDateDepense(e.target.value)} />
        </label>

        <label style={styles.champLabel}>
          Description
          <input style={styles.champInput} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel…" />
        </label>

        <div style={styles.boutonsFormulaire}>
          <button type="button" onClick={onFermer} style={styles.boutonAnnuler}>Annuler</button>
          <button type="submit" disabled={envoiEnCours} style={styles.boutonValider}>
            {envoiEnCours ? 'Enregistrement…' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: { padding: 24, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 16 },
  enTete: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 24, flex: 1 },
  boutonRetour: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', color: 'var(--brown-ink)', cursor: 'pointer', fontSize: 13 },
  boutonAjouter: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  nav: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  navItem: { padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1px solid var(--cream-deep)' },
  navItemActif: { padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: 'var(--gold-deep)', color: 'var(--white)', fontWeight: 600, border: '1px solid var(--gold-deep)' },
  blocFiltres: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', background: 'var(--white)', padding: 16, borderRadius: 12 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, minWidth: 160 },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 14, fontWeight: 600 },
  tableauWrapper: { overflowX: 'auto' },
  tableau: { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'var(--white)', borderRadius: 12 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid var(--gold-mid)', color: 'var(--brown-soft)', fontWeight: 700 },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--cream-deep)' },
  cartesRecap: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 },
  carte: { background: 'var(--white)', borderRadius: 12, padding: 16 },
  carteLabel: { fontSize: 13, color: 'var(--brown-soft)', marginBottom: 4 },
  carteValeur: { fontSize: 22, fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(46,26,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 },
  formulaire: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  titreFormulaire: { fontFamily: 'var(--font-display)', margin: 0, marginBottom: 8 },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};