import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Articles from './pages/Articles.jsx';
import Ventes from './pages/Ventes.jsx';
import EcranClient from './pages/EcranClient.jsx';

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
        path="/ventes"
        element={
          <RouteProtegee>
            <Ventes />
          </RouteProtegee>
        }
      />
      <Route path="/ecran-client" element={<EcranClient />} />
    </Routes>
  );
}
