import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, clearSession, getUtilisateur } from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const utilisateur = getUtilisateur();
  const [dashboard, setDashboard] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    appelApi('GET', '/dashboard')
      .then(setDashboard)
      .catch((err) => setErreur(err.message));
  }, []);

  function deconnexion() {
    clearSession();
    navigate('/');
  }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#4A2C17' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Bonjour, {utilisateur?.nomComplet || 'Victoria'} 👋</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
  <button onClick={() => navigate('/ventes')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D9A144', background: '#D9A144', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
    Ventes
  </button>
  <button onClick={() => navigate('/articles')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D9A144', background: '#D9A144', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
    Articles
  </button>
  <button onClick={() => navigate('/stock')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D9A144', background: '#D9A144', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
    Stock
  </button>
  <button onClick={() => navigate('/cartes-cadeaux')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D9A144', background: '#D9A144', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
    Cartes cadeaux
  </button>
  <button onClick={() => navigate('/listes-cadeaux')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D9A144', background: '#D9A144', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
    Listes cadeaux
  </button>
  <button onClick={deconnexion} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D9A144', background: 'transparent', cursor: 'pointer' }}>
    Déconnexion
  </button>
</div>
      </div>

      {erreur && <p style={{ color: '#B23A2E' }}>{erreur}</p>}

      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 800 }}>
          <div style={{ background: '#FBF3DD', padding: 20, borderRadius: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Ventes du jour</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboard.ventes.total.toLocaleString('fr-FR')} F</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{dashboard.ventes.nombre} vente(s)</div>
          </div>
          <div style={{ background: '#FBF3DD', padding: 20, borderRadius: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Alertes stock</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboard.alertesStock.length}</div>
          </div>
          <div style={{ background: '#FBF3DD', padding: 20, borderRadius: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Demandes de remise</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{dashboard.demandesRemiseEnAttente}</div>
          </div>
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 13, opacity: 0.6 }}>
        Le reste de l'interface (articles, ventes, cartes cadeaux...) arrive dans les prochaines sessions.
      </p>
    </div>
  );
}
