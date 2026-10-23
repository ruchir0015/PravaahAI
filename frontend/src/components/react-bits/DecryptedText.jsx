import { useEffect, useState, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=~';

export default function DecryptedText({
  text = '',
  speed = 40,
  maxIterations = 8,
  sequential = true,
  revealDirection = 'start',
  className = '',
  animateOn = 'hover', // 'hover' or 'mount' or 'both'
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef(null);

  const triggerAnimation = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            const progress = iteration / maxIterations;
            const threshold =
              revealDirection === 'start'
                ? index / text.length
                : (text.length - 1 - index) / text.length;

            if (sequential) {
              if (progress > threshold) return char;
            } else {
              if (iteration >= maxIterations) return char;
            }

            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      iteration++;
      if (iteration > maxIterations + (sequential ? text.length : 0)) {
        clearInterval(intervalRef.current);
        setDisplayText(text);
      }
    }, speed);
  };

  useEffect(() => {
    setDisplayText(text);
    if (animateOn === 'mount' || animateOn === 'both') {
      triggerAnimation();
    }
    return () => clearInterval(intervalRef.current);
  }, [text]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (animateOn === 'hover' || animateOn === 'both') {
      triggerAnimation();
    }
  };

  return (
    <span
      className={`decrypted-text ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}
    >
      {displayText}
    </span>
  );
}
