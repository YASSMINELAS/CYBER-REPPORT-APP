/**
 * Page Login.
 *
 * Role architectural:
 * - Collecte username/password.
 * - Appelle /api/auth/login.
 * - Stocke le JWT puis redirige vers le dashboard.
 */
// useState gere les champs du formulaire et les etats loading/error.
import { useState } from 'react';
// useNavigate redirige apres connexion.
import { useNavigate } from 'react-router-dom';
// toast affiche succes/echec de login.
import { toast } from 'react-toastify';
// api appelle le backend; setAuthToken persiste le JWT.
import api, { getApiErrorMessage, setAuthToken } from '../services/api';

// Composant React de connexion.
const Login = () => {
  // Navigation programmee vers /dashboard apres succes.
  const navigate = useNavigate();
  // Etat React du formulaire controle: chaque input lit/ecrit ici.
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  // Message d'erreur local affiche sous le formulaire.
  const [error, setError] = useState('');
  // Etat de chargement pour desactiver le bouton.
  const [loading, setLoading] = useState(false);

  // Met a jour le champ correspondant a event.target.name.
  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  // Soumet le formulaire au backend.
  const handleSubmit = async (event) => {
    // Evite le rechargement HTML classique de la page.
    event.preventDefault();
    // Reset UI avant l'appel API.
    setError('');
    setLoading(true);

    try {
      // Appel API: POST /api/auth/login avec username/password.
      const response = await api.post('/auth/login', formData);
      // Stocke le JWT pour les prochains appels Axios authentifies.
      setAuthToken(response.data.token);
      toast.success('Welcome back.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // Transforme l'erreur Axios en message lisible.
      const message = getApiErrorMessage(error, 'Login failed. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <section className="panel auth-panel">
        <h1> Sign in to continue.</h1>
      

        <form onSubmit={handleSubmit} className="form">
          <label>
            Username
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default Login;
