import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

export default function Utilisateurs() {
  const navigate = useNavigate();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [roles, setRoles] = useState([]);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [utilisateurEnEdition, setUtilisateurEnEdition] = useState(null);

  useEffect(() => {
    chargerDonnees();
  }, []);

  function chargerDonnees() {
    setChargement(true);
    Promise.all([
      appelApi('GET', '/utilisateurs'),
      appelApi('GET', '/stock/lieux'),
      appelApi('GET', '/roles'),
    ])
      .then(([listeUtilisateurs, listeLieux, listeRoles]) => {
        setUtilisateurs(listeUtilisateurs);
        setLieux(listeLieux);
        setRoles(listeRoles);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  function ouvrirCreation() {
    setUtilisateurEnEdition(null);
    setFormulaireOuvert(true);
  }

  function ouvrirEdition(utilisateur) {
    setUtilisateurEnEdition(utilisateur);
    setFormulaireOuvert(true);
  }

  async function basculerActif(utilisateur) {
    try {
      await appelApi('PUT', `/utilisateurs/${utilisateur.id}`, { actif: !utilisateur.actif });
      chargerDonnees();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <h1 style={styles.titre}>Utilisateurs</h1>
        <button onClick={ouvrirCreation} style={styles.boutonAjouter}>
          + Nouvel employé
        </button>
      </div>

      {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}
      {chargement && <p>Chargement…</p>}

      {!chargement && (
        <>
          <p style={styles.compteur}>{utilisateurs.length} employé(s) enregistré(s)</p>
          <div style={styles.grille}>
            {utilisateurs.map((u) => (
              <CarteUtilisateur
                key={u.id}
                utilisateur={u}
                onBasculerActif={() => basculerActif(u)}
                onModifier={() => ouvrirEdition(u)}
              />
            ))}
          </div>
        </>
      )}

      {formulaireOuvert && (
        <FormulaireUtilisateur
          lieux={lieux}
          roles={roles}
          utilisateurEnEdition={utilisateurEnEdition}
          onFermer={() => setFormulaireOuvert(false)}
          onEnregistre={() => {
            setFormulaireOuvert(false);
            chargerDonnees();
          }}
        />
      )}
    </div>
  );
}

function initiales(nomComplet) {
  return nomComplet
    .split(' ')
    .map((mot) => mot[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function CarteUtilisateur({ utilisateur, onBasculerActif, onModifier }) {
  const estAdmin = utilisateur.roleDynamique ? utilisateur.roleDynamique.estAdmin : utilisateur.role === 'ADMIN';
  const nomRoleAffiche = utilisateur.roleDynamique
    ? utilisateur.roleDynamique.nom
    : (utilisateur.role === 'ADMIN' ? 'Administrateur' : 'Caissier');

  return (
    <div style={styles.carte}>
      <div style={styles.enTeteCarte}>
        <div style={styles.avatar}>{initiales(utilisateur.nomComplet)}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.nomComplet}>{utilisateur.nomComplet}</div>
          <div style={styles.identifiant}>@{utilisateur.nomUtilisateur}</div>
        </div>
        <span style={{ ...styles.pointStatut, background: utilisateur.actif ? '#1E6B36' : 'var(--brown-soft)' }} />
      </div>

      <div style={styles.badges}>
        <span style={{ ...styles.badge, background: estAdmin ? 'var(--gold-deep)' : '#3E6B4F' }}>
          {nomRoleAffiche}
        </span>
        {utilisateur.lieu && <span style={styles.badgeLieu}>🏠 {utilisateur.lieu.nom}</span>}
      </div>

      <div style={styles.piedCarte}>
        <button onClick={onBasculerActif} style={styles.lienAction}>
          {utilisateur.actif ? 'Désactiver' : 'Activer'}
        </button>
        <button onClick={onModifier} style={styles.boutonModifier} title="Modifier">✏️</button>
      </div>
    </div>
  );
}

function FormulaireUtilisateur({ lieux, roles, utilisateurEnEdition, onFermer, onEnregistre }) {
  const estEdition = !!utilisateurEnEdition;

  const [nomUtilisateur, setNomUtilisateur] = useState(utilisateurEnEdition?.nomUtilisateur || '');
  const [pin, setPin] = useState('');
  const [nomComplet, setNomComplet] = useState(utilisateurEnEdition?.nomComplet || '');
  const [roleId, setRoleId] = useState(utilisateurEnEdition?.roleId ? String(utilisateurEnEdition.roleId) : '');
  const [lieuId, setLieuId] = useState(utilisateurEnEdition?.lieuId ? String(utilisateurEnEdition.lieuId) : '');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');

    if (!nomComplet) {
      setErreur('Le nom complet est requis.');
      return;
    }
    if (!roleId) {
      setErreur('Le rôle est requis.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      if (estEdition) {
        await appelApi('PUT', `/utilisateurs/${utilisateurEnEdition.id}`, {
          nomComplet,
          roleId: Number(roleId),
          lieuId: lieuId || null,
        });
        if (pin) {
          await appelApi('POST', `/utilisateurs/${utilisateurEnEdition.id}/reinitialiser-pin`, { pin });
        }
      } else {
        if (!nomUtilisateur || !pin) {
          setErreur("Identifiant et PIN sont requis pour un nouvel employé.");
          setEnvoiEnCours(false);
          return;
        }
        await appelApi('POST', '/utilisateurs', {
          nomUtilisateur,
          pin,
          nomComplet,
          roleId: Number(roleId),
          lieuId: lieuId || null,
        });
      }
      onEnregistre();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onFermer}>
      <form style={styles.formulaire} onClick={(e) => e.stopPropagation()} onSubmit={gererSoumission}>
        <h2 style={styles.titreFormulaire}>{estEdition ? "Modifier l'employé" : 'Nouvel employé'}</h2>

        {erreur && <p style={{ color: 'var(--error)' }}>{erreur}</p>}

        <label style={styles.champLabel}>
          Nom complet *
          <input style={styles.champInput} value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
        </label>

        <label style={styles.champLabel}>
          Identifiant {!estEdition && '*'}
          <input
            style={styles.champInput}
            value={nomUtilisateur}
            onChange={(e) => setNomUtilisateur(e.target.value)}
            disabled={estEdition}
            placeholder="ex: djenie"
          />
        </label>

        <label style={styles.champLabel}>
          {estEdition ? 'Nouveau PIN (laisser vide pour ne pas changer)' : 'PIN *'}
          <input
            type="password"
            inputMode="numeric"
            style={styles.champInput}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4 à 6 chiffres"
          />
        </label>

        <label style={styles.champLabel}>
          Rôle *
          <select style={styles.champInput} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">—</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
        </label>

        <label style={styles.champLabel}>
          Boutique assignée
          <select style={styles.champInput} value={lieuId} onChange={(e) => setLieuId(e.target.value)}>
            <option value="">—</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
          </select>
        </label>

        <div style={styles.boutonsFormulaire}>
          <button type="button" onClick={onFermer} style={styles.boutonAnnuler}>Annuler</button>
          <button type="submit" disabled={envoiEnCours} style={styles.boutonValider}>
            {envoiEnCours ? 'Enregistrement…' : (estEdition ? 'Enregistrer' : 'Créer')}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  enTete: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  boutonAjouter: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
  compteur: { fontSize: 13, color: 'var(--brown-soft)', marginBottom: 16 },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  carte: { background: 'var(--white)', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(74,44,23,0.12)' },
  enTeteCarte: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: 'var(--cream-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--gold-deep)', flexShrink: 0 },
  nomComplet: { fontWeight: 700, fontSize: 14 },
  identifiant: { fontSize: 12, color: 'var(--brown-soft)' },
  pointStatut: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  badges: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  badge: { padding: '4px 10px', borderRadius: 20, color: 'var(--white)', fontSize: 11, fontWeight: 600 },
  badgeLieu: { padding: '4px 10px', borderRadius: 20, background: 'var(--cream)', fontSize: 11, color: 'var(--brown-soft)' },
  piedCarte: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--cream-deep)' },
  lienAction: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  boutonModifier: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(46,26,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 },
  formulaire: { background: 'var(--white)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  titreFormulaire: { fontFamily: 'var(--font-display)', margin: 0, marginBottom: 8 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 },
  champInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14 },
  boutonsFormulaire: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  boutonAnnuler: { padding: '10px 16px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};
