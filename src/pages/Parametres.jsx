import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

const ONGLETS = [
  { id: 'lieux', label: 'Lieux' },
  { id: 'vendeurs', label: 'Vendeurs' },
  { id: 'denominations', label: 'Dénominations cartes cadeaux' },
  { id: 'categories', label: 'Catégories de dépenses' },
];

export default function Parametres() {
  const navigate = useNavigate();
  const [ongletActif, setOngletActif] = useState('lieux');

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>← Tableau de bord</button>
        <h1 style={styles.titre}>Paramètres</h1>
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

      {ongletActif === 'lieux' && <OngletLieux />}
      {ongletActif === 'vendeurs' && <OngletVendeurs />}
      {ongletActif === 'denominations' && <OngletDenominations />}
      {ongletActif === 'categories' && <OngletCategories />}
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET LIEUX
// ------------------------------------------------------------
function OngletLieux() {
  const [lieux, setLieux] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nom, setNom] = useState('');
  const [type, setType] = useState('BOUTIQUE');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [editionId, setEditionId] = useState(null);
  const [nomEdition, setNomEdition] = useState('');

  useEffect(() => { chargerLieux(); }, []);

  function chargerLieux() {
    setChargement(true);
    appelApi('GET', '/stock/lieux')
      .then(setLieux)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  async function creerLieu(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    setErreur('');
    setCreationEnCours(true);
    try {
      await appelApi('POST', '/stock/lieux', { nom: nom.trim(), type });
      setNom('');
      chargerLieux();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationEnCours(false);
    }
  }

  function ouvrirEdition(lieu) {
    setEditionId(lieu.id);
    setNomEdition(lieu.nom);
  }

  async function enregistrerEdition(lieu) {
    setErreur('');
    try {
      await appelApi('PUT', `/stock/lieux/${lieu.id}`, { nom: nomEdition.trim() });
      setEditionId(null);
      chargerLieux();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function desactiverLieu(lieu) {
    setErreur('');
    try {
      await appelApi('PUT', `/stock/lieux/${lieu.id}`, { actif: false });
      chargerLieux();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div style={styles.carte}>
      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {chargement && <p style={styles.texteMuet}>Chargement…</p>}

      {!chargement && (
        <div style={styles.listeSimple}>
          {lieux.map((l) => (
            <div key={l.id} style={styles.ligneItem}>
              {editionId === l.id ? (
                <>
                  <input style={styles.champInput} value={nomEdition} onChange={(e) => setNomEdition(e.target.value)} />
                  <button onClick={() => enregistrerEdition(l)} style={styles.boutonValiderPetit}>Enregistrer</button>
                  <button onClick={() => setEditionId(null)} style={styles.boutonAnnulerPetit}>Annuler</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>
                    <strong>{l.nom}</strong>
                    <span style={styles.texteMuet}> — {l.type === 'ENTREPOT' ? 'Entrepôt' : 'Boutique'}</span>
                  </span>
                  <button onClick={() => ouvrirEdition(l)} style={styles.boutonModifier}>✏️</button>
                  <button onClick={() => desactiverLieu(l)} style={styles.boutonRetirer}>Désactiver</button>
                </>
              )}
            </div>
          ))}
          {lieux.length === 0 && <p style={styles.texteMuet}>Aucun lieu pour l'instant.</p>}
        </div>
      )}

      <form onSubmit={creerLieu} style={styles.formAjout}>
        <input
          style={styles.champInput}
          placeholder="Nom du nouveau lieu…"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <select style={styles.champInput} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="BOUTIQUE">Boutique</option>
          <option value="ENTREPOT">Entrepôt</option>
        </select>
        <button type="submit" disabled={creationEnCours || !nom.trim()} style={styles.boutonAjouter}>
          {creationEnCours ? 'Création…' : '+ Ajouter'}
        </button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET VENDEURS
// ------------------------------------------------------------
function OngletVendeurs() {
  const [vendeurs, setVendeurs] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nomComplet, setNomComplet] = useState('');
  const [telephone, setTelephone] = useState('');
  const [lieuId, setLieuId] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [editionId, setEditionId] = useState(null);
  const [nomEdition, setNomEdition] = useState('');
  const [telephoneEdition, setTelephoneEdition] = useState('');
  const [lieuIdEdition, setLieuIdEdition] = useState('');

  useEffect(() => {
    chargerVendeurs();
    appelApi('GET', '/stock/lieux').then(setLieux).catch(() => {});
  }, []);

  function chargerVendeurs() {
    setChargement(true);
    appelApi('GET', '/vendeurs/tous')
      .then(setVendeurs)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  async function creerVendeurLocal(e) {
    e.preventDefault();
    if (!nomComplet.trim()) return;
    setErreur('');
    setCreationEnCours(true);
    try {
      await appelApi('POST', '/vendeurs', {
        nomComplet: nomComplet.trim(),
        telephone: telephone.trim() || null,
        lieuId: lieuId || null,
      });
      setNomComplet('');
      setTelephone('');
      setLieuId('');
      chargerVendeurs();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationEnCours(false);
    }
  }

  function ouvrirEdition(vendeur) {
    setEditionId(vendeur.id);
    setNomEdition(vendeur.nomComplet);
    setTelephoneEdition(vendeur.telephone || '');
    setLieuIdEdition(vendeur.lieuId ? String(vendeur.lieuId) : '');
  }

  async function enregistrerEdition(vendeur) {
    setErreur('');
    try {
      await appelApi('PUT', `/vendeurs/${vendeur.id}`, {
        nomComplet: nomEdition.trim(),
        telephone: telephoneEdition.trim() || null,
        lieuId: lieuIdEdition || null,
      });
      setEditionId(null);
      chargerVendeurs();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function basculerActif(vendeur) {
    setErreur('');
    try {
      await appelApi('PUT', `/vendeurs/${vendeur.id}`, { actif: !vendeur.actif });
      chargerVendeurs();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div style={styles.carte}>
      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {chargement && <p style={styles.texteMuet}>Chargement…</p>}

      {!chargement && (
        <div style={styles.listeSimple}>
          {vendeurs.map((v) => (
            <div key={v.id} style={styles.ligneItem}>
              {editionId === v.id ? (
                <>
                  <input style={styles.champInput} value={nomEdition} onChange={(e) => setNomEdition(e.target.value)} placeholder="Nom complet" />
                  <input style={styles.champInput} value={telephoneEdition} onChange={(e) => setTelephoneEdition(e.target.value)} placeholder="Téléphone (optionnel)" />
                  <select style={styles.champInput} value={lieuIdEdition} onChange={(e) => setLieuIdEdition(e.target.value)}>
                    <option value="">— Toutes boutiques —</option>
                    {lieux.map((l) => (
                      <option key={l.id} value={l.id}>{l.nom}</option>
                    ))}
                  </select>
                  <button onClick={() => enregistrerEdition(v)} style={styles.boutonValiderPetit}>Enregistrer</button>
                  <button onClick={() => setEditionId(null)} style={styles.boutonAnnulerPetit}>Annuler</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, opacity: v.actif ? 1 : 0.5 }}>
                    <strong>{v.nomComplet}</strong>
                    {v.telephone && <span style={styles.texteMuet}> — {v.telephone}</span>}
                    <span style={styles.texteMuet}> — {v.lieu ? v.lieu.nom : 'Toutes boutiques'}</span>
                    {!v.actif && <span style={styles.texteMuet}> (désactivé)</span>}
                  </span>
                  <button onClick={() => ouvrirEdition(v)} style={styles.boutonModifier}>✏️</button>
                  <button onClick={() => basculerActif(v)} style={v.actif ? styles.boutonRetirer : styles.boutonValiderPetit}>
                    {v.actif ? 'Désactiver' : 'Activer'}
                  </button>
                </>
              )}
            </div>
          ))}
          {vendeurs.length === 0 && <p style={styles.texteMuet}>Aucun vendeur pour l'instant.</p>}
        </div>
      )}

      <form onSubmit={creerVendeurLocal} style={styles.formAjout}>
        <input
          style={styles.champInput}
          placeholder="Nom complet du vendeur…"
          value={nomComplet}
          onChange={(e) => setNomComplet(e.target.value)}
        />
        <input
          style={styles.champInput}
          placeholder="Téléphone (optionnel)"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />
        <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
          <option value="">— Toutes boutiques —</option>
          {lieux.map((l) => (
            <option key={l.id} value={l.id}>{l.nom}</option>
          ))}
        </select>
        <button type="submit" disabled={creationEnCours || !nomComplet.trim()} style={styles.boutonAjouter}>
          {creationEnCours ? 'Création…' : '+ Ajouter'}
        </button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET DÉNOMINATIONS CARTES CADEAUX
// ------------------------------------------------------------
function OngletDenominations() {
  const [denominations, setDenominations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [montant, setMontant] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);

  useEffect(() => { chargerDenominations(); }, []);

  function chargerDenominations() {
    setChargement(true);
    appelApi('GET', '/cartes-cadeaux/denominations/toutes')
      .then(setDenominations)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  async function creerDenomination(e) {
    e.preventDefault();
    if (!montant || Number(montant) <= 0) return;
    setErreur('');
    setCreationEnCours(true);
    try {
      await appelApi('POST', '/cartes-cadeaux/denominations', { montant: Number(montant) });
      setMontant('');
      chargerDenominations();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationEnCours(false);
    }
  }

  async function basculerActif(denomination) {
    setErreur('');
    try {
      await appelApi('PUT', `/cartes-cadeaux/denominations/${denomination.id}`, { actif: !denomination.actif });
      chargerDenominations();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div style={styles.carte}>
      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {chargement && <p style={styles.texteMuet}>Chargement…</p>}

      {!chargement && (
        <div style={styles.listeSimple}>
          {denominations.map((d) => (
            <div key={d.id} style={styles.ligneItem}>
              <span style={{ flex: 1, opacity: d.actif ? 1 : 0.5 }}>
                <strong>{Number(d.montant).toLocaleString('fr-FR')} F</strong>
                {!d.actif && <span style={styles.texteMuet}> (désactivée)</span>}
              </span>
              <button onClick={() => basculerActif(d)} style={d.actif ? styles.boutonRetirer : styles.boutonValiderPetit}>
                {d.actif ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          ))}
          {denominations.length === 0 && <p style={styles.texteMuet}>Aucune dénomination pour l'instant.</p>}
        </div>
      )}

      <form onSubmit={creerDenomination} style={styles.formAjout}>
        <input
          type="number"
          min="0"
          style={styles.champInput}
          placeholder="Montant (F)…"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />
        <button type="submit" disabled={creationEnCours || !montant} style={styles.boutonAjouter}>
          {creationEnCours ? 'Création…' : '+ Ajouter'}
        </button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// ONGLET CATÉGORIES DE DÉPENSES
// ------------------------------------------------------------
function OngletCategories() {
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nom, setNom] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [editionId, setEditionId] = useState(null);
  const [nomEdition, setNomEdition] = useState('');

  useEffect(() => { chargerCategories(); }, []);

  function chargerCategories() {
    setChargement(true);
    appelApi('GET', '/depenses/categories')
      .then(setCategories)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  async function creerCategorie(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    setErreur('');
    setCreationEnCours(true);
    try {
      await appelApi('POST', '/depenses/categories', { nom: nom.trim() });
      setNom('');
      chargerCategories();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationEnCours(false);
    }
  }

  function ouvrirEdition(categorie) {
    setEditionId(categorie.id);
    setNomEdition(categorie.nom);
  }

  async function enregistrerEdition(categorie) {
    setErreur('');
    try {
      await appelApi('PUT', `/depenses/categories/${categorie.id}`, { nom: nomEdition.trim() });
      setEditionId(null);
      chargerCategories();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimerCategorie(categorie) {
    setErreur('');
    try {
      await appelApi('DELETE', `/depenses/categories/${categorie.id}`);
      chargerCategories();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div style={styles.carte}>
      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {chargement && <p style={styles.texteMuet}>Chargement…</p>}

      {!chargement && (
        <div style={styles.listeSimple}>
          {categories.map((c) => (
            <div key={c.id} style={styles.ligneItem}>
              {editionId === c.id ? (
                <>
                  <input style={styles.champInput} value={nomEdition} onChange={(e) => setNomEdition(e.target.value)} />
                  <button onClick={() => enregistrerEdition(c)} style={styles.boutonValiderPetit}>Enregistrer</button>
                  <button onClick={() => setEditionId(null)} style={styles.boutonAnnulerPetit}>Annuler</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{c.nom}</span>
                  <button onClick={() => ouvrirEdition(c)} style={styles.boutonModifier}>✏️</button>
                  <button onClick={() => supprimerCategorie(c)} style={styles.boutonRetirer}>Supprimer</button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <p style={styles.texteMuet}>Aucune catégorie pour l'instant.</p>}
        </div>
      )}

      <form onSubmit={creerCategorie} style={styles.formAjout}>
        <input
          style={styles.champInput}
          placeholder="Nom de la nouvelle catégorie…"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <button type="submit" disabled={creationEnCours || !nom.trim()} style={styles.boutonAjouter}>
          {creationEnCours ? 'Création…' : '+ Ajouter'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 16 },
  enTete: { display: 'flex', alignItems: 'center', gap: 16 },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  nav: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  navItem: { padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1px solid var(--cream-deep)' },
  navItemActif: { padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: 'var(--gold-deep)', color: 'var(--white)', fontWeight: 600, border: '1px solid var(--gold-deep)' },
  carte: { background: 'var(--white)', borderRadius: 14, padding: 20, maxWidth: 600 },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 14, fontWeight: 600, marginBottom: 12 },
  listeSimple: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  ligneItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--cream)' },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, flex: 1 },
  boutonModifier: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 },
  boutonRetirer: { padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  boutonValiderPetit: { padding: '6px 10px', borderRadius: 6, border: 'none', background: 'var(--gold-mid)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  boutonAnnulerPetit: { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  formAjout: { display: 'flex', gap: 8 },
  boutonAjouter: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
};
