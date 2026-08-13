import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, clearSession, getUtilisateur } from '../lib/api';
import BandeauPhotosProduits from '../components/BandeauPhotosProduits';

const LIENS = [
  { id: 'ventes', label: 'Ventes', chemin: '/ventes', adminSeulement: false },
  { id: 'clients', label: 'Clients', chemin: '/clients', adminSeulement: false },
  { id: 'articles', label: 'Articles', chemin: '/articles', adminSeulement: true },
  { id: 'stock', label: 'Stock', chemin: '/stock', adminSeulement: true },
  { id: 'etats', label: 'États', chemin: '/etats', adminSeulement: false },
  { id: 'cartes-cadeaux', label: 'Cartes cadeaux', chemin: '/cartes-cadeaux', adminSeulement: false },
  { id: 'depenses', label: 'Dépenses', chemin: '/depenses', adminSeulement: false },
  { id: 'listes-cadeaux', label: 'Listes cadeaux', chemin: '/listes-cadeaux', adminSeulement: false },
  { id: 'proforma', label: 'Factures pro forma', chemin: '/proforma', adminSeulement: false },
  { id: 'utilisateurs', label: 'Utilisateurs', chemin: '/utilisateurs', adminSeulement: true },
  { id: 'roles', label: 'Rôles', chemin: '/roles', adminSeulement: true },
  { id: 'parametres', label: 'Paramètres', chemin: '/parametres', adminSeulement: true },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const utilisateur = getUtilisateur();
  const estAdmin = utilisateur?.role === 'ADMIN';
  const [dashboard, setDashboard] = useState(null);
  const [erreur, setErreur] = useState('');
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    appelApi('GET', '/dashboard')
      .then(setDashboard)
      .catch((err) => setErreur(err.message));
    appelApi('GET', '/articles').then(setArticles).catch(() => {});
  }, []);

  function deconnexion() {
    clearSession();
    navigate('/');
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.marque}>JESMA U</div>

        <nav style={styles.nav}>
          {LIENS.filter((lien) => !lien.adminSeulement || estAdmin).map((lien) => (
            <button key={lien.id} onClick={() => navigate(lien.chemin)} style={styles.boutonNav}>
              {lien.label}
            </button>
          ))}
        </nav>

        <button onClick={deconnexion} style={styles.boutonDeconnexion}>
          Déconnexion
        </button>

        <div style={styles.pied}>Gestion Commerciale et CRM by Phil</div>
      </aside>

      <main style={styles.contenu}>
        <h1 style={styles.titre}>Bonjour, {utilisateur?.nomComplet || 'Victoria'} 👋</h1>

        <BandeauPhotosProduits articles={articles} hauteur={110} />

        {erreur && <p style={{ color: '#B23A2E' }}>{erreur}</p>}

        {dashboard && (
          <div style={styles.grilleKpi}>
            <CarteKpi icone="💰" label="Ventes du jour" valeur={`${dashboard.ventes.total.toLocaleString('fr-FR')} F`} sousTexte={`${dashboard.ventes.nombre} vente(s)`} />
            <CarteKpi
              icone="📦" label="Alertes stock" valeur={dashboard.alertesStock.length}
              sousTexte={dashboard.alertesStock.length > 0 ? 'À réapprovisionner' : 'Rien à signaler'}
              accent={dashboard.alertesStock.length > 0}
              onClick={() => navigate('/stock')}
            />
            <CarteKpi
              icone="🏷️" label="Demandes de remise" valeur={dashboard.demandesRemiseEnAttente}
              sousTexte={dashboard.demandesRemiseEnAttente > 0 ? 'En attente de revue' : 'À jour'}
              accent={dashboard.demandesRemiseEnAttente > 0}
              onClick={() => navigate('/etats')}
            />
            <CarteKpi
              icone="🎁" label="Listes cadeaux" valeur={`${dashboard.listesCadeaux.listesActives} active(s)`}
              onClick={() => navigate('/listes-cadeaux')}
              large
            >
              {dashboard.listesCadeaux.offresEnAttente > 0 ? (
                <span style={styles.badgeAlerte}>⚠ {dashboard.listesCadeaux.offresEnAttente} offre(s) à valider</span>
              ) : (
                <span style={styles.sousTexte}>Aucune offre en attente</span>
              )}
              <span style={styles.sousTexte}>{dashboard.listesCadeaux.totalOfferConfirme.toLocaleString('fr-FR')} F offerts au total</span>
            </CarteKpi>
            {estAdmin && (
              <>
                <CarteKpi icone="📉" label="Remises du jour" valeur={`${dashboard.remises.jour.total.toLocaleString('fr-FR')} F`} sousTexte={`${dashboard.remises.jour.nombre} vente(s) remisée(s)`} />
                <CarteKpi icone="📊" label="Remises du mois en cours" valeur={`${dashboard.remises.mois.total.toLocaleString('fr-FR')} F`} sousTexte={`${dashboard.remises.mois.nombre} vente(s) remisée(s)`} />
              </>
            )}
          </div>
        )}

        {dashboard && estAdmin && dashboard.parBoutique.length > 0 && (
          <div style={{ marginTop: 40, maxWidth: 860 }}>
            <h2 style={styles.titreSection}>Objectif du mois par boutique</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {dashboard.parBoutique.map((b) => (
                <div key={b.lieuId} style={styles.carteObjectif}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 17 }}>{b.nom}</span>
                    <span style={{ fontSize: 13, color: 'var(--brown-soft)' }}>
                      {b.ventesMois.toLocaleString('fr-FR')} F / {b.objectifMensuel.toLocaleString('fr-FR')} F
                      <strong style={{ color: 'var(--gold-deep)', marginLeft: 6 }}>{b.pourcentageObjectif}%</strong>
                    </span>
                  </div>
                  <div style={{ background: 'var(--cream)', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, b.pourcentageObjectif)}%`,
                        height: '100%',
                        background: b.pourcentageObjectif >= 100 ? '#1E6B36' : 'var(--gold-deep)',
                        transition: 'width 0.3s',
                        borderRadius: 8,
                      }}
                    />
                  </div>
                  <div style={styles.ligneStatsObjectif}>
                    <span style={{ fontWeight: 700 }}>
                      Ventes du jour : {b.ventesJour.total.toLocaleString('fr-FR')} F ({b.ventesJour.nombre} vente(s))
                    </span>
                    <span>Coût d'achat (mois) : {b.coutMarchandiseMois.toLocaleString('fr-FR')} F</span>
                    <span>Dépenses (mois) : {b.depensesMois.toLocaleString('fr-FR')} F</span>
                    <span style={{ fontWeight: 700, color: b.margeMois >= 0 ? '#1E6B36' : 'var(--error)' }}>
                      Marge nette du mois : {b.margeMois.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 10 }}>
              L'objectif de chaque boutique se règle dans Paramètres → Lieux.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function CarteKpi({ icone, label, valeur, sousTexte, accent, onClick, large, children }) {
  return (
    <div
      style={{ ...styles.carteKpi, ...(large ? styles.carteKpiLarge : {}), ...(onClick ? { cursor: 'pointer' } : {}) }}
      onClick={onClick}
    >
      <div style={styles.enTeteKpi}>
        {icone && <span style={styles.iconeKpi}>{icone}</span>}
        <span style={styles.labelKpi}>{label}</span>
      </div>
      <div style={{ ...styles.valeurKpi, ...(accent ? { color: 'var(--error)' } : {}) }}>{valeur}</div>
      {sousTexte && <div style={styles.sousTexte}>{sousTexte}</div>}
      {children}
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)', color: 'var(--brown-ink)' },
  sidebar: {
    width: 220, background: '#FBF3DD', padding: '24px 16px', display: 'flex', flexDirection: 'column',
    gap: 8, flexShrink: 0, borderRight: '1px solid #EAD9AE',
  },
  marque: { fontWeight: 700, fontSize: 18, letterSpacing: 1, marginBottom: 20, color: '#4A2C17', fontFamily: 'var(--font-display)' },
  nav: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  boutonNav: {
    padding: '10px 14px', borderRadius: 8, border: '1px solid #D9A144', background: '#D9A144',
    color: '#FFFFFF', cursor: 'pointer', fontWeight: 600, textAlign: 'left', fontSize: 14,
  },
  boutonDeconnexion: {
    padding: '10px 14px', borderRadius: 8, border: '1px solid #D9A144', background: 'transparent',
    cursor: 'pointer', textAlign: 'left', fontSize: 14, marginTop: 12,
  },
  pied: { marginTop: 20, fontSize: 11, opacity: 0.45, textAlign: 'center' },
  contenu: { flex: 1, padding: 32 },
  titre: { marginTop: 0, marginBottom: 24, fontFamily: 'var(--font-display)' },
  titreSection: { fontFamily: 'var(--font-display)', fontSize: 19, marginBottom: 14, color: 'var(--brown-ink)' },

  grilleKpi: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 900 },
  carteKpi: {
    background: 'var(--white)', padding: '20px 22px', borderRadius: 14,
    border: '1px solid var(--cream-deep)', boxShadow: '0 1px 3px rgba(74, 44, 23, 0.06)',
  },
  carteKpiLarge: { gridColumn: 'span 2' },
  enTeteKpi: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconeKpi: { fontSize: 16, lineHeight: 1 },
  labelKpi: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--brown-soft)',
  },
  valeurKpi: { fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--brown-ink)', lineHeight: 1.2 },
  sousTexte: { display: 'block', fontSize: 12.5, color: 'var(--brown-soft)', marginTop: 4 },
  badgeAlerte: {
    display: 'inline-block', fontSize: 12, fontWeight: 700, color: 'var(--error)',
    background: '#FBE4E1', borderRadius: 6, padding: '3px 8px', marginTop: 6,
  },

  carteObjectif: {
    background: 'var(--white)', padding: '20px 22px', borderRadius: 14,
    border: '1px solid var(--cream-deep)', boxShadow: '0 1px 3px rgba(74, 44, 23, 0.06)',
  },
  ligneStatsObjectif: {
    display: 'flex', gap: 20, marginTop: 12, fontSize: 13, color: 'var(--brown-soft)', flexWrap: 'wrap',
  },
};
