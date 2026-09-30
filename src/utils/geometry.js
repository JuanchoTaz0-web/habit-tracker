// src/utils/geometry.js — trigonometría del calendario radial en forma de "C"

export const DEFAULT_GEOMETRY = {
  cx: 270,
  cy: 270,
  innerRadius: 64,
  outerRadius: 240,
  startAngle: -90, // grados: -90 = arriba (día 1)
  sweep: 270, // grados totales de la "C" (queda libre el cuadrante superior izquierdo)
  days: 31,
  rings: 8,
  ringGap: 0, // separación radial entre anillos
  sectorGap: 0, // separación angular (grados) entre días
  labelOffset: 16, // distancia del número de día al borde exterior
};

export const degToRad = (deg) => (deg * Math.PI) / 180;

export function polarToCartesian(cx, cy, r, angleDeg) {
  const a = degToRad(angleDeg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function getRingRadii(ringIndex, cfg = DEFAULT_GEOMETRY) {
  const { innerRadius, outerRadius, rings, ringGap } = cfg;
  const step = (outerRadius - innerRadius) / rings;
  // ringIndex 0 = anillo exterior (coincide con la primera línea de hábitos)
  const rOuter = outerRadius - ringIndex * step;
  const rInner = rOuter - step + ringGap;
  return { rInner, rOuter };
}

export function getDayAngles(dayIndex, cfg = DEFAULT_GEOMETRY) {
  const { startAngle, sweep, days, sectorGap } = cfg;
  const step = sweep / days;
  const start = startAngle + dayIndex * step + sectorGap / 2;
  const end = start + step - sectorGap;
  return { start, end, mid: (start + end) / 2 };
}

export function describeAnnularSector(cx, cy, rInner, rOuter, startDeg, endDeg) {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, startDeg);
  const p2 = polarToCartesian(cx, cy, rOuter, endDeg);
  const p3 = polarToCartesian(cx, cy, rInner, endDeg);
  const p4 = polarToCartesian(cx, cy, rInner, startDeg);

  return [
    `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
    `L ${p3.x.toFixed(3)} ${p3.y.toFixed(3)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(3)} ${p4.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

export function getCellPath(dayIndex, ringIndex, cfg = DEFAULT_GEOMETRY) {
  const { rInner, rOuter } = getRingRadii(ringIndex, cfg);
  const { start, end } = getDayAngles(dayIndex, cfg);
  return describeAnnularSector(cfg.cx, cfg.cy, rInner, rOuter, start, end);
}

export function getDayLabel(dayIndex, cfg = DEFAULT_GEOMETRY) {
  const { cx, cy, outerRadius, labelOffset } = cfg;
  const { mid } = getDayAngles(dayIndex, cfg);
  const { x, y } = polarToCartesian(cx, cy, outerRadius + labelOffset, mid);
  // Texto orientado radialmente; se voltea en la mitad inferior para que sea legible
  const rotate = mid > 90 ? mid + 180 : mid;
  return { x, y, rotate, angle: mid };
}

export function getRingStartPoints(ringIndex, cfg = DEFAULT_GEOMETRY) {
  const { cx, cy, startAngle } = cfg;
  const { rInner, rOuter } = getRingRadii(ringIndex, cfg);
  return {
    outer: polarToCartesian(cx, cy, rOuter, startAngle),
    inner: polarToCartesian(cx, cy, rInner, startAngle),
  };
}

export function buildGrid(cfg = DEFAULT_GEOMETRY) {
  const cells = [];
  for (let ring = 0; ring < cfg.rings; ring++) {
    for (let day = 0; day < cfg.days; day++) {
      cells.push({ ring, day, d: getCellPath(day, ring, cfg) });
    }
  }
  const labels = Array.from({ length: cfg.days }, (_, i) => ({ day: i + 1, ...getDayLabel(i, cfg) }));
  return { cells, labels };
}
