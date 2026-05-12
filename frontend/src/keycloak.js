import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://localhost:8080",
  realm: "cyber-reports",
  clientId: "cyber-reports-app",
});

export default keycloak;