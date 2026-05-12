// ✅ PREMIER — avant tout require
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const corsOptions = require('./config/cors');
const vulnerabilityRoutes = require('./routes/vulnerabilityRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const importRoutes = require('./routes/importRoutes');
const statsRoutes = require('./routes/statsRoutes');
const externalRoutes = require('./routes/externalRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const sanitizeRequest = require('./middlewares/sanitizeRequest');
const securityHeaders = require('./middlewares/securityHeaders');

// Variables indispensables au fonctionnement securise de l'API.
const requiredEnvVars = [
  'MONGO_URI',
  'KEYCLOAK_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_CLIENT_ID',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (process.env.ALERT_EMAIL_RECIPIENTS) {
  const emailEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingEmailVars = emailEnvVars.filter((envVar) => !process.env[envVar]);
  if (missingEmailVars.length > 0) {
    console.error('❌ FATAL: Email alerts enabled but missing SMTP configuration:');
    missingEmailVars.forEach((envVar) => console.error(`  - ${envVar}`));
    process.exit(1);
  }
}

if (missingEnvVars.length > 0) {
  console.error('❌ FATAL: Missing required environment variables:');
  missingEnvVars.forEach((envVar) => console.error(`  - ${envVar}`));
  process.exit(1);
}

const app = express();

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(sanitizeRequest);

app.get('/api/test', (req, res) => {
  res.json({ message: 'API works' });
});

app.use('/api/vulnerabilities', vulnerabilityRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stats', statsRoutes);
app.use('/api/external', externalRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();