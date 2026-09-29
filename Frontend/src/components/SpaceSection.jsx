export function SpaceSection({ label, action, children }) {
  return (
    <section className="space" aria-label={label}>
      <div className="section-head">
        <h2>{label}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
