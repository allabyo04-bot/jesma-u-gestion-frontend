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
  <button onClick={() => navigate('/etats')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D9A144', background: '#D9A144', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
    États
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