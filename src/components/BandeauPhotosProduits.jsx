// Bande horizontale de photos d'articles, tirées directement du catalogue existant
// (aucune image à fournir manuellement). Utilisée pour égayer visuellement les écrans
// un peu austères — Listes cadeaux, Dashboard, etc.
export default function BandeauPhotosProduits({ articles, hauteur = 96 }) {
  const photos = (articles || []).filter((a) => a.photoUrl).slice(0, 14);

  if (photos.length === 0) return null;

  return (
    <div style={{ ...styles.bande, height: hauteur }}>
      {photos.map((a) => (
        <img
          key={a.id}
          src={a.photoUrl}
          alt={a.designation}
          title={a.designation}
          style={{ ...styles.photo, height: hauteur, width: hauteur }}
        />
      ))}
    </div>
  );
}

const styles = {
  bande: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    padding: '4px 2px 10px',
    marginBottom: 6,
  },
  photo: {
    borderRadius: 14,
    objectFit: 'cover',
    flexShrink: 0,
    border: '2px solid var(--gold-mid)',
    boxShadow: '0 2px 6px rgba(74,44,23,0.12)',
  },
};
