import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi } from '../lib/api';

const MODULES = [
  { id: 'VENTES', label: 'Ventes' },
  { id: 'STOCK', label: 'Stock' },
  { id: 'ARTICLES', label: 'Articles' },
  { id: 'DEPENSES', label: 'Dépenses' },
  { id: 'RAPPORTS', label: 'Rapports' },
  { id: 'UTILISATEURS', label: 'Utilisateurs' },
];

export default function Roles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nouveauNom, setNouveauNom] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);

  useEffect(() => {
    chargerRoles();
  }, []);

  function chargerRoles() {
    setChargement(true);
    appelApi('GET', '/roles')
      .then(setRoles)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  function permissionActive(role, module) {
    return role.permissions.find((p) => p.module === module)?.actif || false;
  }

  async function basculerPermission(role, module) {
    if (!role.modifiable) return;
    setErreur('');
    const nouvelEtat = !permissionActive(role, module);

    // Mise à jour immédiate à l'écran, avant même la réponse du serveur, pour que ça
    // réagisse au clic sans attendre — si l'appel échoue, on recharge pour se resynchroniser.
    setRoles((prec) =>
      prec.map((r) =>
        r.id !== role.id ? r : {
          ...r,
          permissions: r.permissions.map((p) =>
            p.module === module ? { ...p, actif: nouvelEtat } : p
          ),
        }
      )
    );

    try {
      await appelApi('PUT', `/roles/${role.id}/permissions`, { module, actif: nouvelEtat });
    } catch (err) {
      setErreur(err.message);
      chargerRoles();
    }
  }

  async function creerRole(e) {
    e.preventDefault();
    if (!nouveauNom.trim()) return;
    setErreur('');
    setCreationEnCours(true);
    try {
      await appelApi('POST', '/roles', { nom: nouveauNom.trim() });
      setNouveauNom('');
      chargerRoles();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreationEnCours(false);
    }
  }

  async function supprimerRole(role) {
    setErreur('');
    try {
      await appelApi('DELETE', `/roles/${role.id}`);
      chargerRoles();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.enTete}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>← Tableau de bord</button>
        <h1 style={styles.titre}>Rôles</h1>
      </div>

      {erreur && <div style={styles.bandeauErreur}>{erreur}</div>}
      {chargement && <p style={styles.texteMuet}>Chargement…</p>}

      {!chargement && (
        <div style={styles.tableauWrapper}>
          <table style={styles.tableau}>
            <thead>
              <tr>
                <th style={styles.th}>Rôle</th>
                {MODULES.map((m) => (
                  <th key={m.id} style={{ ...styles.th, textAlign: 'center' }}>{m.label}</th>
                ))}
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td style={styles.td}>
                    <span style={{ ...styles.badgeRole, background: role.estAdmin ? 'var(--gold-deep)' : '#3E6B4F' }}>
                      {role.nom}
                    </span>
                    <span style={styles.texteMuet}> ({role._count?.utilisateurs ?? 0} employé(s))</span>
                  </td>
                  {MODULES.map((m) => (
                    <td key={m.id} style={{ ...styles.td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={permissionActive(role, m.id)}
                        disabled={!role.modifiable}
                        onChange={() => basculerPermission(role, m.id)}
                        style={{ width: 18, height: 18, cursor: role.modifiable ? 'pointer' : 'not-allowed' }}
                      />
                    </td>
                  ))}
                  <td style={styles.td}>
                    {role.modifiable && (role._count?.utilisateurs ?? 0) === 0 && (
                      <button onClick={() => supprimerRole(role)} style={styles.boutonRetirer}>Supprimer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={creerRole} style={styles.formNouveauRole}>
        <input
          style={styles.champInput}
          placeholder="Nom du nouveau rôle (ex: Gérant)…"
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
        />
        <button type="submit" disabled={creationEnCours || !nouveauNom.trim()} style={styles.boutonAjouter}>
          {creationEnCours ? 'Création…' : '+ Ajouter un rôle'}
        </button>
      </form>

      <p style={styles.texteMuet}>Le rôle Administrateur garde toujours accès complet et ne peut pas être modifié.</p>
    </div>
  );
}

const styles = {
  page: { padding: 32, fontFamily: 'var(--font-body)', color: 'var(--brown-ink)', display: 'flex', flexDirection: 'column', gap: 16 },
  enTete: { display: 'flex', alignItems: 'center', gap: 16 },
  titre: { fontFamily: 'var(--font-display)', margin: 0, fontSize: 28 },
  boutonRetour: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer', color: 'var(--brown-ink)' },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  bandeauErreur: { padding: '10px 14px', borderRadius: 8, background: '#FBE4E1', color: 'var(--error)', fontSize: 14, fontWeight: 600 },
  tableauWrapper: { background: 'var(--white)', borderRadius: 14, padding: 20, overflowX: 'auto' },
  tableau: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid var(--gold-mid)', color: 'var(--brown-soft)', fontWeight: 700 },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--cream-deep)' },
  badgeRole: { padding: '4px 10px', borderRadius: 20, color: 'var(--white)', fontSize: 12, fontWeight: 600 },
  boutonRetirer: { border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  formNouveauRole: { display: 'flex', gap: 10, maxWidth: 500 },
  champInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, flex: 1 },
  boutonAjouter: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};