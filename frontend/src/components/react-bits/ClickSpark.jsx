import { useEffect, useRef } from 'react';

export default function ClickSpark({
  sparkColor = 'var(--color-periwinkle-300)',
  sparkSize = 10,
  sparkCount = 8,
  duration = 450,
}) {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleClick = (e) => {
      const colors = ['#8e7ee7', '#6879fd', '#00ff88', '#eceafb'];
      const newSparks = Array.from({ length: sparkCount }).map(() => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3.5 + 1.5;
        return {
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * sparkSize + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          createdAt: performance.now(),
        };
      });
      sparksRef.current.push(...newSparks);
    };

    window.addEventListener('click', handleClick);

    const animate = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((s) => {
        const age = time - s.createdAt;
        if (age > duration) return false;

        const progress = age / duration;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.alpha = 1 - progress;

        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animId);
    };
  }, [sparkColor, sparkSize, sparkCount, duration]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
