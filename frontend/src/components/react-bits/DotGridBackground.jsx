import { useEffect, useRef } from 'react';
import './DotGridBackground.css';

export default function DotGridBackground({
  dotSize = 1.5,
  gap = 28,
  baseColor = 'rgba(180, 169, 239, 0.12)',
  glowColor = 'rgba(104, 84, 222, 0.55)',
  proximity = 140,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const render = () => {
      // Smooth mouse follow
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      const cols = Math.floor(width / gap);
      const rows = Math.floor(height / gap);
      const offsetX = (width - cols * gap) / 2;
      const offsetY = (height - rows * gap) / 2;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = offsetX + i * gap;
          const y = offsetY + j * gap;

          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let currentSize = dotSize;
          let color = baseColor;

          if (dist < proximity) {
            const factor = 1 - dist / proximity;
            currentSize = dotSize + factor * 2.5;
            color = glowColor;
            ctx.shadowBlur = factor * 8;
            ctx.shadowColor = 'rgba(104, 84, 222, 0.8)';
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, currentSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotSize, gap, baseColor, glowColor, proximity]);

  return (
    <div className="dotgrid-container" aria-hidden="true">
      <div className="aurora-glow aurora-one" />
      <div className="aurora-glow aurora-two" />
      <div className="aurora-glow aurora-three" />
      <canvas ref={canvasRef} className="dotgrid-canvas" />
    </div>
  );
}
