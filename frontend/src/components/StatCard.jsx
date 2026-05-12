const StatCard = ({
  label,
  value,
  helper,
  icon: Icon,
  accent = 'cyan',
  onClick,
}) => {
  const Component = onClick ? 'button' : 'article';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={`stat-card accent-${accent}${
        onClick ? ' clickable-card' : ''
      }`}
      onClick={onClick}
      aria-label={onClick ? `Open ${label}` : undefined}
    >
      <div className="stat-card__top">
        <span className="stat-label">{label}</span>

        {Icon && (
          <span className="stat-card__icon">
            <Icon size={18} />
          </span>
        )}
      </div>

      <strong>{value}</strong>

      {helper && <span className="stat-helper">{helper}</span>}
    </Component>
  );
};

export default StatCard;
