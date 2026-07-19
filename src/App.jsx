import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Articles from './pages/Articles.jsx';
import Ventes from './pages/Ventes.jsx';
import EcranClient from './pages/EcranClient.jsx';
import Stock from './pages/Stock.jsx';
import CartesCadeaux from './pages/CartesCadeaux.jsx';
import ListesCadeaux from './pages/ListesCadeaux.jsx';
import ListeCadeauPublique from './pages/ListeCadeauPublique.jsx';
import Etats from './pages/Etats.jsx';
import Utilisateurs from './pages/Utilisateurs.jsx';
import Roles from './pages/Roles.jsx';
import Depenses from './pages/Depenses.jsx';
import Clients from './pages/Clients';
import Parametres from './pages/Parametres.jsx';

function estConnecte() {
  return !!localStorage.getItem('jesma_token');
}

function RouteProtegee({ children }) {
  return estConnecte() ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={estConnecte() ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/dashboard"
        element={
          <RouteProtegee>
            <Dashboard />
          </RouteProtegee>
        }
      />
      <Route
        path="/articles"
        element={
          <RouteProtegee>
            <Articles />
          </RouteProtegee>
        }
      />
      <Route
        path="/roles"
        element={
          <RouteProtegee>
            <Roles />
          </RouteProtegee>
        }
      />
      <Route
        path="/parametres"
        element={
          <RouteProtegee>
            <Parametres />
          </RouteProtegee>
        }
      />
      <Route
        path="/ventes"
        element={
          <RouteProtegee>
            <Ventes />
          </RouteProtegee>
        }
      />
      <Route
        path="/stock"
        element={
          <RouteProtegee>
            <Stock />
          </RouteProtegee>
        }
      />
      <Route
        path="/etats"
        element={
          <RouteProtegee>
            <Etats />
          </RouteProtegee>
        }
      />
      <Route
        path="/utilisateurs"
        element={
          <RouteProtegee>
            <Utilisateurs />
          </RouteProtegee>
        }
      />
      <Route
        path="/cartes-cadeaux"
        element={
          <RouteProtegee>
            <CartesCadeaux />
          </RouteProtegee>
        }
      />
      <Route
        path="/depenses"
        element={
          <RouteProtegee>
            <Depenses />
          </RouteProtegee>
        }
      />
      <Route
        path="/listes-cadeaux"
        element={
          <RouteProtegee>
            <ListesCadeaux />
          </RouteProtegee>
        }
      />
      <Route path="/liste-cadeau/:codeAcces" element={<ListeCadeauPublique />} />
      <Route path="/ecran-client" element={<EcranClient />} />
      <Route
  path="/clients"
  element={
    <RouteProtegee>
      <Clients />
    </RouteProtegee>
  }
/>
    </Routes>
  );
}