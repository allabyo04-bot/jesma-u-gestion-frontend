import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appelApi, setSession } from '../lib/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [nomUtilisateur, setNomUtilisateur] = useState('');
  const [pin, setPin] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      const data = await appelApi('POST', '/auth/login', { nomUtilisateur, pin });
      setSession(data.token, data.utilisateur);
      navigate('/dashboard');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel--brand">
        <div className="arc arc--one" />
        <div className="arc arc--two" />

        <div className="brand-mark">
          <div className="u-badge">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4v9a6 6 0 0 0 12 0V4" stroke="#4A2C17" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="wordmark">Jesma U</span>
        </div>

        <div className="brand-copy">
          <h1>La gestion de votre boutique, avec la douceur de Jesma U.</h1>
          <p>Stock, ventes, cartes cadeaux et listes cadeaux — tout au même endroit, pensé pour votre équipe.</p>
        </div>

        <svg className="brand-illustration" width="140" height="110" viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 95c10-6 16-16 16-28 0-14-10-24-10-24" stroke="#4A2C17" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="70" cy="46" r="16" stroke="#4A2C17" strokeOpacity="0.6" strokeWidth="1.5" />
          <path d="M55 70c0-10 7-16 15-16s15 6 15 16" stroke="#4A2C17" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="login-panel--form">
        <div className="login-card">
          <h2>Connexion</h2>
          <p className="sub">Entrez votre identifiant et votre code PIN.</p>

          {erreur && <div className="login-error">{erreur}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="nomUtilisateur">Nom d'utilisateur</label>
              <input
                id="nomUtilisateur"
                type="text"
                autoComplete="username"
                value={nomUtilisateur}
                onChange={(e) => setNomUtilisateur(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="pin">Code PIN</label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>

            <button className="login-submit" type="submit" disabled={chargement}>
              {chargement ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="login-footnote">Jesma U — Gestion Commerciale</p>
        </div>
      </div>
    </div>
  );
}
