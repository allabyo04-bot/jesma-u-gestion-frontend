import { useNavigate } from 'react-router-dom';

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

export default function Ventes() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <button onClick={() => navigate('/dashboard')} style={styles.boutonRetour}>
          ← Tableau de bord
        </button>
        <nav style={styles.nav}>
          {ONGLETS.map((onglet, index) => (
            <div
              key={onglet.id}
              style={index === 0 ? styles.navItemActif : styles.navItem}
            >
              {onglet.label}
            </div>
          ))}
        </nav>
      </aside>

      <main style={styles.contenu}>
        <div style={styles.enTeteVente}>
          <div style={styles.blocBoutiqueVendeur}>
            <label style={styles.champLabel}>
              Boutique
              <select style={styles.champInput}>
                <option>—</option>
              </select>
            </label>
            <label style={styles.champLabel}>
              Vendeur
              <select style={styles.champInput}>
                <option>—</option>
              </select>
            </label>
          </div>
          <div style={styles.blocModeVente}>
            <label style={styles.champLabel}>
              Type de vente
              <select style={styles.champInput}>
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

        <div style={styles.zonePrincipale}>
          <div style={styles.blocAjoutArticle}>
            <h3 style={styles.titreBloc}>Ajouter un article</h3>
            <p style={styles.texteMuet}>Recherche / scan à venir (étape suivante).</p>
          </div>

          <div style={styles.colonnePanier}>
            <h3 style={styles.titreBloc}>Panier</h3>
            <p style={styles.texteMuet}>Aucun article ajouté.</p>
          </div>

          <div style={styles.colonnePaiement}>
            <h3 style={styles.titreBloc}>Paiement</h3>
            <p style={styles.texteMuet}>Paiement mixte à venir (étape suivante).</p>
            <div style={styles.boutonsAction}>
              <button style={styles.boutonAttente}>Mettre en attente</button>
              <button style={styles.boutonValider}>Valider la vente</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  sidebar: { width: 220, background: 'var(--brown-deep)', color: 'var(--cream)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 },
  boutonRetour: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', color: 'var(--cream)', cursor: 'pointer', fontSize: 13 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: 0.8 },
  navItemActif: { padding: '10px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'var(--gold-deep)', color: 'var(--white)', fontWeight: 600 },
  contenu: { flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' },
  enTeteVente: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  blocBoutiqueVendeur: { display: 'flex', gap: 12 },
  blocModeVente: { display: 'flex', gap: 12 },
  blocClient: { maxWidth: 400 },
  champLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 },
  champInput: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream-deep)', fontSize: 14, minWidth: 160 },
  zonePrincipale: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 16, flex: 1 },
  blocAjoutArticle: { background: 'var(--white)', borderRadius: 12, padding: 16 },
  colonnePanier: { background: 'var(--white)', borderRadius: 12, padding: 16 },
  colonnePaiement: { background: 'var(--white)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' },
  titreBloc: { margin: '0 0 8px 0', fontSize: 15 },
  texteMuet: { fontSize: 13, color: 'var(--brown-soft)' },
  boutonsAction: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  boutonAttente: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gold-mid)', background: 'transparent', cursor: 'pointer' },
  boutonValider: { padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--gold-deep)', color: 'var(--white)', cursor: 'pointer', fontWeight: 600 },
};