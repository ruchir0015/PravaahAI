import './ShinyText.css';

export default function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = '',
  ...props
}) {
  return (
    <span
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{ animationDuration: `${speed}s` }}
      {...props}
    >
      {text}
    </span>
  );
}
