interface BrandProps {
  readonly compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <span className="brand-lockup" aria-label="MesaFlow">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && <span className="brand-name">MesaFlow</span>}
    </span>
  );
}
