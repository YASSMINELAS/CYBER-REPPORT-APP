/**
 * Service email.
 *
 * Role architectural:
 * - Centralise l'envoi d'emails pour alertes incidents/vulnerabilites.
 * - Est appele par les services metier, pas directement par les routes.
 *
 * Point securite:
 * - Les credentials SMTP viennent de l'environnement.
 */
// Nodemailer envoie les emails via SMTP.
const nodemailer = require('nodemailer');

// Cree un transport SMTP a partir des variables d'environnement.
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  if (!config.host || !config.auth.user || !config.auth.pass) {
    // Configuration incomplete: mieux vaut echouer explicitement.
    throw new Error('SMTP configuration missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport(config);
};

// Produit une version texte simple d'un contenu HTML.
const stripHtml = (html) => html.replace(/<[^>]*>/g, '');

// Fonction bas niveau d'envoi email.
const sendEmail = async (to, subject, html, text = '') => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text: text || stripHtml(html),
  };

  return transporter.sendMail(mailOptions);
};

// Lit la liste des destinataires d'alertes.
const getAlertRecipients = () => {
  if (!process.env.ALERT_EMAIL_RECIPIENTS) return [];
  return process.env.ALERT_EMAIL_RECIPIENTS.split(',').map((email) => email.trim()).filter(Boolean);
};

// Associe une couleur HTML a une severite.
const severityColor = (severity) => {
  if (severity === 'critical') return '#dc2626';
  if (severity === 'high') return '#ea580c';
  if (severity === 'medium') return '#2563eb';
  return '#16a34a';
};

// Envoie une alerte email pour incidents high/critical uniquement.
const sendIncidentAlert = async (incident) => {
  // Condition metier: ne pas spammer pour les severites faibles.
  if (!['high', 'critical'].includes(incident.severity)) return;

  const recipients = getAlertRecipients();
  // Sans destinataire configure, l'envoi est simplement ignore.
  if (!recipients.length) return;

  const subject = `SOC Alert: ${incident.severity.toUpperCase()} Incident - ${incident.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">SOC Security Alert</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">${incident.title}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold;">Severity:</td><td style="padding: 8px 0; color: ${severityColor(incident.severity)};">${incident.severity.toUpperCase()}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td style="padding: 8px 0;">${incident.status}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Agent:</td><td style="padding: 8px 0;">${incident.agentName || 'N/A'} (${incident.agentIP || 'N/A'})</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Host:</td><td style="padding: 8px 0;">${incident.host || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Port:</td><td style="padding: 8px 0;">${incident.port || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Rule Level:</td><td style="padding: 8px 0;">${incident.ruleLevel}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Source:</td><td style="padding: 8px 0;">${incident.source}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Time:</td><td style="padding: 8px 0;">${new Date(incident.timestamp || incident.createdAt).toLocaleString()}</td></tr>
        </table>
        ${incident.description ? `<div style="margin-top: 20px;"><strong>Description:</strong><p style="margin: 8px 0; white-space: pre-wrap;">${incident.description}</p></div>` : ''}
        ${incident.mitreTactic?.length ? `<div style="margin-top: 20px;"><strong>MITRE Tactics:</strong><p style="margin: 8px 0;">${incident.mitreTactic.join(', ')}</p></div>` : ''}
        ${incident.cve?.length ? `<div style="margin-top: 20px;"><strong>CVE:</strong><p style="margin: 8px 0;">${incident.cve.join(', ')}</p></div>` : ''}
      </div>
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
        <p>This is an automated alert from your SOC platform.</p>
        <p>Please investigate this incident immediately.</p>
      </div>
    </div>
  `;

  try {
    // Appel SMTP effectif.
    await sendEmail(recipients, subject, html);
  } catch (error) {
    console.error('Failed to send incident alert email:', error.message);
  }
};

// Envoie une alerte email pour une vulnerabilite.
const sendVulnerabilityAlert = async (vulnerability) => {
  const recipients = getAlertRecipients();
  if (!recipients.length) return;

  const subject = `Vulnerability Alert: ${vulnerability.severity.toUpperCase()} - ${vulnerability.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ea580c;">Vulnerability Alert</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">${vulnerability.title}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold;">Severity:</td><td style="padding: 8px 0; color: ${severityColor(vulnerability.severity)};">${vulnerability.severity.toUpperCase()}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td style="padding: 8px 0;">${vulnerability.status}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Host:</td><td style="padding: 8px 0;">${vulnerability.host || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Port:</td><td style="padding: 8px 0;">${vulnerability.port || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Protocol:</td><td style="padding: 8px 0;">${vulnerability.protocol || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Source:</td><td style="padding: 8px 0;">${vulnerability.source}</td></tr>
        </table>
        ${vulnerability.description ? `<div style="margin-top: 20px;"><strong>Description:</strong><p style="margin: 8px 0; white-space: pre-wrap;">${vulnerability.description}</p></div>` : ''}
        ${vulnerability.solution ? `<div style="margin-top: 20px;"><strong>Solution:</strong><p style="margin: 8px 0; white-space: pre-wrap;">${vulnerability.solution}</p></div>` : ''}
        ${vulnerability.cve?.length ? `<div style="margin-top: 20px;"><strong>CVE:</strong><p style="margin: 8px 0;">${vulnerability.cve.join(', ')}</p></div>` : ''}
      </div>
    </div>
  `;

  try {
    await sendEmail(recipients, subject, html);
  } catch (error) {
    console.error('Failed to send vulnerability alert email:', error.message);
  }
};

module.exports = {
  sendEmail,
  sendIncidentAlert,
  sendVulnerabilityAlert,
};
