const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  meta,
}) => {
  return (
    <header className="page-header panel">
      <div className="page-header__main">
        <div className="page-header__copy">
          {eyebrow && (
            <span className="page-header__eyebrow">
              {eyebrow}
            </span>
          )}

          <div>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
        </div>

        {meta && (
          <div className="page-header__meta">
            {meta}
          </div>
        )}
      </div>

      {actions && (
        <div className="page-header__actions">
          {actions}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
