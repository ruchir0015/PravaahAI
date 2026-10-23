import './StarBorder.css';

export default function StarBorder({
  as: Component = 'button',
  className = '',
  color = 'var(--color-indigo-ink-300)',
  speed = '4s',
  children,
  ...props
}) {
  return (
    <Component className={`star-border-container ${className}`} {...props}>
      <div
        className="star-border-glow-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 60%)`,
          animationDuration: speed,
        }}
        aria-hidden="true"
      />
      <div
        className="star-border-glow-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 60%)`,
          animationDuration: speed,
        }}
        aria-hidden="true"
      />
      <div className="star-border-content">{children}</div>
    </Component>
  );
}
