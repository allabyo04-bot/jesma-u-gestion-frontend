const BASE_URL = import.meta.env.VITE_API_URL || 'https://jesma-u-gestion-backend-production.up.railway.app/api';

function getToken() {
  return localStorage.getItem('jesma_token');
}

export function setSession(token, utilisateur) {
  localStorage.setItem('jesma_token', token);
  localStorage.setItem('jesma_utilisateur', JSON.stringify(utilisateur));
}

export function clearSession() {
  localStorage.removeItem('jesma_token');
  localStorage.removeItem('jesma_utilisateur');
}

export function getUtilisateur() {
  const brut = localStorage.getItem('jesma_utilisateur');
  return brut ? JSON.parse(brut) : null;
}

export async function appelApi(methode, chemin, corps) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    method: methode,
    headers,
    body: corps ? JSON.stringify(corps) : undefined,
  });

  const texte = await reponse.text();
  let data;
  try { data = texte ? JSON.parse(texte) : null; } catch { data = texte; }

  if (!reponse.ok) {
    const message = (data && data.error) || 'Une erreur est survenue.';
    throw new Error(message);
  }
  return data;
}
