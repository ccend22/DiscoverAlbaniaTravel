interface CityPoint {
  name: string;
  x: number;
  y: number;
  hub?: boolean;
}

const CITIES: CityPoint[] = [
  { name: "Shkodër", x: 150, y: 55 },
  { name: "Durrës", x: 100, y: 175 },
  { name: "Tiranë", x: 185, y: 185, hub: true },
  { name: "Elbasan", x: 235, y: 220 },
  { name: "Vlorë", x: 135, y: 330 },
  { name: "Sarandë", x: 170, y: 445 },
];

// A stylized silhouette of Albania — smoothed through anchor points that
// trace the country's real coastline and eastern border proportions, not a
// surveyed boundary. It's tuned so every city marker above sits correctly
// inside it, north to south.
const ALBANIA_OUTLINE =
  "M120,44 Q95,70 81.5,110 Q68,150 84,205 Q100,260 87.5,280 Q75,300 95,317.5 " +
  "Q115,335 112.5,367.5 Q110,400 130,435 Q150,470 180,465 Q210,460 230,430 " +
  "Q250,400 252.5,360 Q255,320 267.5,290 Q280,260 265,225 Q250,190 252.5,160 " +
  "Q255,130 232.5,100 Q210,70 177.5,44 Q145,18 120,44 Z";

const hub = CITIES.find((c) => c.hub)!;
const spokes = CITIES.filter((c) => !c.hub);

export function AlbaniaMapVisual({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 500"
      className={className}
      role="img"
      aria-label="Illustrative map of Albania with connected travel routes"
    >
      <defs>
        <clipPath id="albania-clip">
          <path d={ALBANIA_OUTLINE} />
        </clipPath>
        <linearGradient id="albania-fill" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--red)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
        </radialGradient>
        <pattern id="map-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1.2" fill="currentColor" opacity="0.3" />
        </pattern>
        <filter id="map-soft-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* Country silhouette, glassy fill over a fine dot texture clipped to its coastline. */}
      <path d={ALBANIA_OUTLINE} fill="url(#albania-fill)" stroke="currentColor" strokeOpacity="0.42" strokeWidth={1.4} />
      <rect width="340" height="500" fill="url(#map-dots)" clipPath="url(#albania-clip)" />

      {/* Routes: blurred glow + dashed base line + a flowing pulse of light. */}
      {spokes.map((city, i) => (
        <g key={city.name}>
          <line
            x1={hub.x}
            y1={hub.y}
            x2={city.x}
            y2={city.y}
            stroke="currentColor"
            strokeOpacity={0.16}
            strokeWidth={5}
            strokeLinecap="round"
            filter="url(#map-soft-blur)"
          />
          <line
            x1={hub.x}
            y1={hub.y}
            x2={city.x}
            y2={city.y}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={1.4}
            strokeDasharray="2 6"
            strokeLinecap="round"
          />
          <line
            x1={hub.x}
            y1={hub.y}
            x2={city.x}
            y2={city.y}
            stroke="var(--red)"
            strokeOpacity={0.85}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeDasharray="3 42"
            className="route-pulse"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        </g>
      ))}

      {spokes.map((city) => (
        <g key={city.name} style={{ filter: "drop-shadow(0 1px 2px rgba(0,10,11,0.4))" }}>
          <circle cx={city.x} cy={city.y} r={5} fill="var(--surface)" stroke="currentColor" strokeWidth={2.25} />
          <text
            x={city.x}
            y={city.y - 12}
            textAnchor="middle"
            fill="#ffffff"
            fillOpacity={0.92}
            className="text-[13px] font-medium"
          >
            {city.name}
          </text>
        </g>
      ))}

      {/* Hub: capital city, emphasized with a soft glow and a radar-style pulse ring. */}
      <circle cx={hub.x} cy={hub.y} r={24} fill="url(#hub-glow)" />
      <circle cx={hub.x} cy={hub.y} r={9} fill="none" stroke="var(--red)" strokeWidth={1.5} className="hub-ring" />
      <circle
        cx={hub.x}
        cy={hub.y}
        r={9}
        fill="none"
        stroke="var(--red)"
        strokeWidth={1.5}
        className="hub-ring"
        style={{ animationDelay: "1.2s" }}
      />
      <circle cx={hub.x} cy={hub.y} r={5.5} fill="var(--red)" style={{ filter: "drop-shadow(0 1px 3px rgba(0,10,11,0.5))" }} />
      <text
        x={hub.x}
        y={hub.y - 17}
        textAnchor="middle"
        fill="#ffffff"
        className="text-[15px] font-bold"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,10,11,0.4))" }}
      >
        {hub.name}
      </text>
    </svg>
  );
}
