const Loader = ({ label = 'Loading...' }) => {
  return (
    <div
      className="loader-card panel"
      role="status"
      aria-live="polite"
    >
      <div className="loader-header">
        <div className="loader-orb">
          <span className="loader-orb__ring" />
          <span className="loader-orb__core" />
        </div>

        <div>
          <strong>Synchronizing workspace</strong>
          <span>{label}</span>
        </div>
      </div>

      <div className="skeleton-line skeleton-wide" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-short" />
    </div>
  );
};

export default Loader;
