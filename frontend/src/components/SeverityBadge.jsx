const severityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const SeverityBadge = ({ value }) => {
  const severity = (value || 'unknown').toLowerCase();
  const label = severityLabels[severity] || 'Unknown';

  return (
    <span className={`badge severity-${severity}`}>
      <span className="severity-badge__dot" />
      {label}
    </span>
  );
};

export default SeverityBadge;
