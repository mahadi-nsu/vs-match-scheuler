"use client";

import { useId } from "react";

const CENTER = 50;
const ANGLES = [-90, -18, 54, 126, 198];

const point = (radius: number, degrees: number, cx = CENTER, cy = CENTER) => {
  const rad = (degrees * Math.PI) / 180;
  return `${(cx + radius * Math.cos(rad)).toFixed(2)},${(cy + radius * Math.sin(rad)).toFixed(2)}`;
};

const pentagon = (cx: number, cy: number, radius: number, rotation: number) =>
  ANGLES.map((a) => point(radius, a + rotation, cx, cy)).join(" ");

const centrePatch = pentagon(CENTER, CENTER, 13, 0);

const outerPatches = ANGLES.map((a) => {
  const [x, y] = point(45, a).split(",").map(Number);
  return pentagon(x, y, 10, a + 90);
});

/** Classic black-and-white ball. Decorative unless given a title. */
export function Football({ className, title }: { className?: string; title?: string }) {
  const id = `ball${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const clip = `${id}-clip`;
  const shade = `${id}-shade`;
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="47" />
        </clipPath>
        <radialGradient id={shade} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e8edf5" />
          <stop offset="100%" stopColor="#b9c3d3" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${shade})`} />
      <g clipPath={`url(#${clip})`} fill="#0b1730" stroke="#0b1730" strokeWidth="1.2" strokeLinejoin="round">
        <polygon points={centrePatch} />
        {ANGLES.map((a) => (
          <polyline key={`s${a}`} points={`${point(14, a)} ${point(34, a)}`} />
        ))}
        {ANGLES.map((a) => (
          <polyline key={`m${a}`} points={`${point(27, a + 36)} ${point(50, a + 36)}`} />
        ))}
        {ANGLES.map((a, i) => (
          <polyline
            key={`h${a}`}
            fill="none"
            points={`${point(34, a)} ${point(27, a + 36)} ${point(34, ANGLES[(i + 1) % 5])}`}
          />
        ))}
        {outerPatches.map((points, i) => (
          <polygon key={i} points={points} />
        ))}
      </g>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#0b1730" strokeWidth="2" />
    </svg>
  );
}
