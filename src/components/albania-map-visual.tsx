interface CityPoint {
  name: string;
  x: number;
  y: number;
  hub?: boolean;
}

const CITIES: CityPoint[] = [
  { name: "Shkodër", x: 99.2, y: 119.5 },
  { name: "Durrës", x: 93.2, y: 225.9 },
  { name: "Tiranë", x: 132.1, y: 225.2, hub: true },
  { name: "Elbasan", x: 160.5, y: 255.9 },
  { name: "Vlorë", x: 97, y: 348.1 },
  { name: "Sarandë", x: 152.3, y: 430 },
];

// A smoothed silhouette of Albania, traced from the country's real coastline
// and border geometry (simplified to ~65 anchor points, rounded through
// their midpoints) rather than a generic blob. City markers above are
// projected from real lat/lng using the same equirectangular transform, so
// they land in their correct real-world position relative to the outline.
const ALBANIA_OUTLINE =
  "M123.9,36.6 Q121.6,35 98,69 Q74.4,103 80.8,108.8 Q87.3,114.6 85.4,119.2 " +
  "Q83.5,123.7 84.8,129.2 Q86.2,134.7 83.8,134.7 Q81.4,134.7 83.1,142.6 " +
  "Q84.7,150.5 95.8,153.4 Q106.8,156.3 105.6,168.6 Q104.5,180.9 106.5,181.4 " +
  "Q108.6,181.8 103.7,186.3 Q98.9,190.9 96.2,189.1 Q93.5,187.4 95.8,195.7 " +
  "Q98,204.1 92.4,208.4 Q86.7,212.6 87.8,218.7 Q88.8,224.7 93.1,227 " +
  "Q97.4,229.4 98.3,233.5 Q99.1,237.6 95.2,244.2 Q91.2,250.7 93,263 " +
  "Q94.9,275.4 88.7,286.1 Q82.6,296.8 82.9,303.6 Q83.2,310.5 80.4,315.1 " +
  "Q77.6,319.7 82.2,331 Q86.7,342.3 91.9,346.5 Q97,350.7 96.8,357.6 " +
  "Q96.6,364.6 93.1,366.8 Q89.7,369 86.3,361.8 Q82.8,354.7 79,354.8 " +
  "Q75.1,354.9 84.9,369.4 Q94.6,384 116.2,397.3 Q137.8,410.7 141.2,416.5 " +
  "Q144.5,422.3 143.5,425.7 Q142.5,429.1 147.8,430.8 Q153,432.6 151.2,445.9 " +
  "Q149.4,459.3 162.3,462.1 Q175.3,465 180.8,458.7 Q186.2,452.3 184.5,447.5 " +
  "Q182.7,442.7 188.9,441.6 Q195.1,440.6 190.1,427.6 Q185.1,414.7 189.3,414.9 " +
  "Q193.6,415 196.6,409.9 Q199.5,404.8 211.9,402.6 Q224.3,400.3 230.2,376.7 " +
  "Q236.1,353 246.6,349.2 Q257.1,345.3 261.4,335.7 Q265.6,326.2 260.2,315.4 " +
  "Q254.7,304.5 254.6,294 Q254.4,283.5 241.9,284.2 Q229.3,284.9 226.6,272.5 " +
  "Q223.8,260 219.5,259.8 Q215.2,259.5 211,249 Q206.9,238.5 205.9,230.9 " +
  "Q204.8,223.2 206.8,223.4 Q208.7,223.5 209.6,216.7 Q210.4,210 205,204.2 " +
  "Q199.5,198.5 205.4,193.5 Q211.3,188.5 209.1,178 Q206.9,167.5 213,152 " +
  "Q219,136.5 213,116.6 Q206.9,96.6 192.7,89.7 Q178.6,82.7 175.3,70.7 " +
  "Q172.1,58.7 166,54.3 Q159.9,49.9 145.8,56.4 Q131.6,63 128.1,57.5 " +
  "Q124.5,52 125.4,45.1 Q126.3,38.2 123.9,36.6 Z";

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
            fill="var(--foreground)"
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
        fill="var(--foreground)"
        className="text-[15px] font-bold"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,10,11,0.4))" }}
      >
        {hub.name}
      </text>
    </svg>
  );
}
