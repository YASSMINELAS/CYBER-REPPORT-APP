import AppLayout from '../layouts/AppLayout';
import keycloak from '../keycloak';

const ProtectedRoute = () => {
  if (!keycloak.authenticated) {
    keycloak.login();
    return null;
  }

  return <AppLayout />;
};

export default ProtectedRoute;