import type { Product } from '@/types/product';

interface Props {
  product: Product;
}

function DimLine({ x1, y1, x2, y2, label, labelX, labelY }: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; labelX: number; labelY: number;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#888" strokeWidth={1} strokeDasharray="3,2" />
      <text x={labelX} y={labelY} textAnchor="middle" fontSize={10} fill="#ff6b35" fontWeight="bold">{label}</text>
    </g>
  );
}

// 바인드헤드: 넓고 낮은 원형 머리
function BindHeadSVG({ hw, hh, d, L }: { hw: string; hh: string; d: string; L: string }) {
  return (
    <svg viewBox="0 0 220 200" width="220" height="200">
      <rect x="95" y="60" width="30" height="100" fill="#b0b8c8" stroke="#555" strokeWidth="1.5" />
      <ellipse cx="110" cy="58" rx="38" ry="12" fill="#d0d8e8" stroke="#555" strokeWidth="1.5" />
      <line x1="100" y1="50" x2="120" y2="66" stroke="#555" strokeWidth="2" />
      <line x1="120" y1="50" x2="100" y2="66" stroke="#555" strokeWidth="2" />
      <DimLine x1={72} y1={46} x2={72} y2={70} label={`Φ${hw}`} labelX={45} labelY={60} />
      <line x1="72" y1="46" x2="148" y2="46" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="72" y1="70" x2="148" y2="70" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={158} y1={60} x2={158} y2={160} label={`L${L}`} labelX={178} labelY={110} />
      <line x1="95" y1="60" x2="161" y2="60" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="95" y1="160" x2="161" y2="160" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={95} y1={175} x2={125} y2={175} label={`d${d}`} labelX={110} labelY={190} />
      <line x1="95" y1="160" x2="95" y2="178" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="125" y1="160" x2="125" y2="178" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
    </svg>
  );
}

// 팬헤드: 반구형 머리
function PanHeadSVG({ hw, hh, d, L }: { hw: string; hh: string; d: string; L: string }) {
  return (
    <svg viewBox="0 0 220 210" width="220" height="210">
      <rect x="95" y="65" width="30" height="100" fill="#b0b8c8" stroke="#555" strokeWidth="1.5" />
      <path d="M72 65 Q110 30 148 65 Z" fill="#d0d8e8" stroke="#555" strokeWidth="1.5" />
      <line x1="72" y1="65" x2="148" y2="65" stroke="#555" strokeWidth="1.5" />
      <line x1="100" y1="52" x2="120" y2="64" stroke="#555" strokeWidth="2" />
      <line x1="120" y1="52" x2="100" y2="64" stroke="#555" strokeWidth="2" />
      <DimLine x1={72} y1={76} x2={148} y2={76} label={`Φ${hw}`} labelX={110} labelY={90} />
      <DimLine x1={58} y1={65} x2={58} y2={165} label={`L${L}`} labelX={38} labelY={115} />
      <line x1="72" y1="65" x2="60" y2="65" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="95" y1="165" x2="60" y2="165" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <text x={150} y={50} fontSize={10} fill="#ff6b35" fontWeight="bold">t{hh}</text>
      <DimLine x1={95} y1={178} x2={125} y2={178} label={`d${d}`} labelX={110} labelY={193} />
      <line x1="95" y1="165" x2="95" y2="181" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="125" y1="165" x2="125" y2="181" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
    </svg>
  );
}

// 플랫헤드: 접시머리 (매립형)
function FlatHeadSVG({ hw, hh, d, L }: { hw: string; hh: string; d: string; L: string }) {
  return (
    <svg viewBox="0 0 220 200" width="220" height="200">
      <rect x="95" y="60" width="30" height="100" fill="#b0b8c8" stroke="#555" strokeWidth="1.5" />
      <polygon points="72,48 148,48 125,60 95,60" fill="#d0d8e8" stroke="#555" strokeWidth="1.5" />
      <line x1="86" y1="48" x2="110" y2="56" stroke="#555" strokeWidth="2" />
      <line x1="134" y1="48" x2="110" y2="56" stroke="#555" strokeWidth="2" />
      <DimLine x1={72} y1={38} x2={148} y2={38} label={`Φ${hw}`} labelX={110} labelY={32} />
      <line x1="72" y1="38" x2="72" y2="50" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="148" y1="38" x2="148" y2="50" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={158} y1={48} x2={158} y2={60} label={`t${hh}`} labelX={176} labelY={57} />
      <line x1="148" y1="48" x2="161" y2="48" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="125" y1="60" x2="161" y2="60" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={165} y1={60} x2={165} y2={160} label={`L${L}`} labelX={183} labelY={110} />
      <line x1="125" y1="60" x2="168" y2="60" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="95" y1="160" x2="168" y2="160" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={95} y1={173} x2={125} y2={173} label={`d${d}`} labelX={110} labelY={188} />
      <line x1="95" y1="160" x2="95" y2="176" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="125" y1="160" x2="125" y2="176" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
    </svg>
  );
}

// 마이크로스크류 / 평머리: 납작한 원형 머리
function MicroSVG({ hw, hh, d, L }: { hw: string; hh: string; d: string; L: string }) {
  return (
    <svg viewBox="0 0 220 200" width="220" height="200">
      <rect x="95" y="58" width="30" height="102" fill="#b0b8c8" stroke="#555" strokeWidth="1.5" />
      <rect x="76" y="48" width="68" height="10" rx="3" fill="#d0d8e8" stroke="#555" strokeWidth="1.5" />
      <line x1="100" y1="48" x2="120" y2="58" stroke="#555" strokeWidth="2" />
      <line x1="120" y1="48" x2="100" y2="58" stroke="#555" strokeWidth="2" />
      <DimLine x1={76} y1={38} x2={144} y2={38} label={`Φ${hw}`} labelX={110} labelY={32} />
      <line x1="76" y1="38" x2="76" y2="50" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="144" y1="38" x2="144" y2="50" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={152} y1={48} x2={152} y2={58} label={`t${hh}`} labelX={170} labelY={56} />
      <line x1="144" y1="48" x2="155" y2="48" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="125" y1="58" x2="155" y2="58" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={162} y1={58} x2={162} y2={160} label={`L${L}`} labelX={180} labelY={109} />
      <line x1="125" y1="58" x2="165" y2="58" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="95" y1="160" x2="165" y2="160" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <DimLine x1={95} y1={173} x2={125} y2={173} label={`d${d}`} labelX={110} labelY={187} />
      <line x1="95" y1="160" x2="95" y2="176" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
      <line x1="125" y1="160" x2="125" y2="176" stroke="#ccc" strokeWidth="0.8" strokeDasharray="2,2" />
    </svg>
  );
}

export default function ScrewSVG({ product }: Props) {
  const hw = product.head_width || '-';
  const hh = product.head_height || '-';
  const d = product.diameter;
  const L = product.length;
  const cat = product.category;

  if (cat === '바인드헤드') return <BindHeadSVG hw={hw} hh={hh} d={d} L={L} />;
  if (cat === '팬헤드') return <PanHeadSVG hw={hw} hh={hh} d={d} L={L} />;
  if (cat === '플랫헤드') return <FlatHeadSVG hw={hw} hh={hh} d={d} L={L} />;
  return <MicroSVG hw={hw} hh={hh} d={d} L={L} />;
}
