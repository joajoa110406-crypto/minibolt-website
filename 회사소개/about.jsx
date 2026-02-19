import { useState, useEffect, useRef } from "react";

const FACTORY_IMAGES = [
  { src: "/images/about/factory/production_line.jpg", label: "생산 라인 전경", desc: "헤딩머신, 전조기 등 다양한 설비" },
  { src: "/images/about/factory/heading_machines.jpg", label: "헤딩머신 라인", desc: "고정밀 냉간단조 설비" },
  { src: "/images/about/factory/wire_materials.jpg", label: "원자재 보관", desc: "다양한 규격의 와이어 원자재" },
];

const PRODUCTS = [
  {
    name: "일반 소형 나사",
    desc: "규격 제품과 와샤붙이, 제품에 맞게 제작 가능",
    img: "/images/about/products/small_screws.jpg",
    color: "#3B82F6",
  },
  {
    name: "소형 0번 SCREW",
    desc: "M1 ~ M2 CAMERA SCREW 전문",
    img: "/images/about/products/zero_screw_camera.jpg",
    color: "#10B981",
  },
  {
    name: "소형 렌지나사 · 별나사",
    desc: "규격 제품과 제품에 맞게 제작 가능",
    img: "/images/about/products/wrench_star_screws.jpg",
    color: "#F59E0B",
  },
  {
    name: "쌤스 · 육각볼트",
    desc: "규격 제품과 제품에 맞게 제작 가능",
    img: "/images/about/products/sems_hex_bolts.jpg",
    color: "#8B5CF6",
  },
  {
    name: "리벳 · 단자 · 쌤스",
    desc: "다양한 특수 제품 제작 가능",
    img: "/images/about/products/rivet_terminal_sems.jpg",
    color: "#EF4444",
  },
  {
    name: "렌치볼트 · 단자볼트",
    desc: "규격 제품과 제품에 맞게 제작 가능",
    img: "/images/about/products/wrench_terminal_bolts.jpg",
    color: "#06B6D4",
  },
];

const STATS = [
  { value: "39", label: "제조 업력 (1987~)", suffix: "년" },
  { value: "833+", label: "취급 제품 수", suffix: "" },
  { value: "1.2", label: "최소 규격", suffix: "mm" },
  { value: "4", label: "주요 카테고리", suffix: "개" },
];

const STRENGTHS = [
  {
    title: "39년 제조 공장 직접 운영",
    desc: "성원특수금속은 1987년부터 소형 정밀 나사를 직접 생산해온 제조 전문 공장입니다. MINIBOLT는 이 제조 역량을 온라인으로 확장한 채널입니다.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      </svg>
    ),
  },
  {
    title: "제조사 직접 판매, 중간 마진 없음",
    desc: "유통 단계 없이 공장에서 직접 판매합니다. 기존에는 거래처를 통해서만 구매 가능했던 제품을, 소량이든 대량이든 누구나 주문할 수 있습니다.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "맞춤 제작 · 규격 상담",
    desc: "제조사가 직접 운영하기 때문에 정확한 규격 상담과 도면 기반 맞춤 제작이 가능합니다. 와샤붙이, 특수 헤드 등 다양한 요구에 대응합니다.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: "개인 · 기업 모두 환영",
    desc: "소량 구매 개인 고객부터 정기 납품이 필요한 신규 기업 거래처까지, 주문 규모에 관계없이 동일한 품질과 서비스를 제공합니다.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

// Animated counter hook
function useCounter(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started, startOnView]);

  useEffect(() => {
    if (!started) return;
    const numEnd = parseFloat(end);
    if (isNaN(numEnd)) {
      setCount(end);
      return;
    }
    const isFloat = String(end).includes(".");
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numEnd;
      setCount(isFloat ? current.toFixed(1) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, end, duration]);

  return { count, ref };
}

function StatCard({ value, label, suffix, delay }) {
  const { count, ref } = useCounter(value.replace("+", ""), 1800);
  const hasPlus = value.includes("+");

  return (
    <div
      ref={ref}
      className="stat-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-value">
        {count}
        {hasPlus && <span className="stat-plus">+</span>}
        {suffix && <span className="stat-suffix">{suffix}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function StrengthCard({ title, desc, icon, index }) {
  return (
    <div className="strength-card" style={{ animationDelay: `${index * 120}ms` }}>
      <div className="strength-icon">{icon}</div>
      <h3 className="strength-title">{title}</h3>
      <p className="strength-desc">{desc}</p>
    </div>
  );
}

function ProductTag({ name, desc, img, color, index }) {
  return (
    <div
      className="product-tag"
      style={{
        animationDelay: `${index * 80}ms`,
        "--tag-color": color,
      }}
    >
      <div className="product-tag-img">
        <img src={img} alt={name} />
      </div>
      <div>
        <div className="product-tag-name">{name}</div>
        <div className="product-tag-desc">{desc}</div>
      </div>
    </div>
  );
}

export default function MiniBoltAbout() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap');

        :root {
          --mb-black: #0A0A0A;
          --mb-dark: #141414;
          --mb-card: #1A1A1A;
          --mb-border: #2A2A2A;
          --mb-muted: #666666;
          --mb-text: #B0B0B0;
          --mb-light: #E0E0E0;
          --mb-white: #F5F5F5;
          --mb-accent: #3B82F6;
          --mb-accent-dim: rgba(59, 130, 246, 0.15);
          --mb-green: #10B981;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .about-page {
          font-family: 'Noto Sans KR', sans-serif;
          background: var(--mb-black);
          color: var(--mb-text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ===== HERO ===== */
        .about-hero {
          position: relative;
          height: 85vh;
          min-height: 600px;
          display: flex;
          align-items: flex-end;
          padding: 0 clamp(24px, 5vw, 80px) 80px;
          overflow: hidden;
        }

        .about-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            linear-gradient(180deg, 
              rgba(10,10,10,0.3) 0%, 
              rgba(10,10,10,0.1) 40%,
              rgba(10,10,10,0.7) 70%,
              rgba(10,10,10,0.95) 100%
            );
          z-index: 1;
        }

        .hero-bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          z-index: 0;
        }

        .hero-gradient-orb {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.15;
          z-index: 0;
        }

        .hero-gradient-orb.blue {
          background: var(--mb-accent);
          top: -200px;
          right: -100px;
        }

        .hero-gradient-orb.green {
          background: var(--mb-green);
          bottom: -200px;
          left: -100px;
          opacity: 0.08;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 800px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: var(--mb-accent-dim);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          color: var(--mb-accent);
          letter-spacing: 0.5px;
          margin-bottom: 24px;
          animation: fadeUp 0.8s ease both;
        }

        .hero-badge-dot {
          width: 6px;
          height: 6px;
          background: var(--mb-accent);
          border-radius: 50%;
          animation: pulse-dot 2s ease infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .hero-title {
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 900;
          color: var(--mb-white);
          line-height: 1.1;
          letter-spacing: -2px;
          margin-bottom: 20px;
          animation: fadeUp 0.8s ease 0.15s both;
        }

        .hero-title .accent {
          color: var(--mb-accent);
        }

        .hero-subtitle {
          font-size: clamp(16px, 2vw, 20px);
          color: var(--mb-text);
          line-height: 1.7;
          font-weight: 300;
          max-width: 600px;
          animation: fadeUp 0.8s ease 0.3s both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== SECTION BASE ===== */
        .about-section {
          padding: clamp(60px, 10vw, 120px) clamp(24px, 5vw, 80px);
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--mb-accent);
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 900;
          color: var(--mb-white);
          letter-spacing: -1px;
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .section-desc {
          font-size: 16px;
          color: var(--mb-muted);
          line-height: 1.7;
          max-width: 560px;
        }

        .section-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--mb-border), transparent);
          margin: 0;
        }

        /* ===== STATS ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--mb-border);
          border: 1px solid var(--mb-border);
          border-radius: 16px;
          overflow: hidden;
          margin-top: 48px;
        }

        .stat-card {
          background: var(--mb-dark);
          padding: 40px 24px;
          text-align: center;
          animation: fadeUp 0.6s ease both;
        }

        .stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 600;
          color: var(--mb-white);
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-plus {
          color: var(--mb-accent);
          font-size: 0.7em;
        }

        .stat-suffix {
          font-size: 0.5em;
          color: var(--mb-muted);
          font-weight: 400;
          margin-left: 2px;
        }

        .stat-label {
          font-size: 14px;
          color: var(--mb-muted);
          font-weight: 400;
        }

        /* ===== STRENGTHS ===== */
        .strengths-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 48px;
        }

        .strength-card {
          background: var(--mb-card);
          border: 1px solid var(--mb-border);
          border-radius: 16px;
          padding: 32px;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeUp 0.6s ease both;
        }

        .strength-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.04);
          transform: translateY(-2px);
        }

        .strength-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--mb-accent-dim);
          border-radius: 12px;
          color: var(--mb-accent);
          margin-bottom: 20px;
        }

        .strength-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--mb-white);
          margin-bottom: 8px;
        }

        .strength-desc {
          font-size: 14px;
          color: var(--mb-muted);
          line-height: 1.7;
        }

        /* ===== PRODUCTS ===== */
        .products-showcase {
          margin-top: 48px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .product-tag {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          background: var(--mb-card);
          border: 1px solid var(--mb-border);
          border-radius: 14px;
          transition: all 0.3s ease;
          animation: fadeUp 0.5s ease both;
        }

        .product-tag:hover {
          border-color: var(--tag-color, var(--mb-accent));
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.06);
          transform: translateY(-1px);
        }

        .product-tag-img {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255,255,255,0.04);
        }

        .product-tag-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-tag-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--mb-white);
          margin-bottom: 4px;
        }

        .product-tag-desc {
          font-size: 13px;
          color: var(--mb-muted);
          line-height: 1.5;
        }

        /* ===== FACTORY ===== */
        .factory-section {
          position: relative;
          padding: clamp(60px, 10vw, 120px) clamp(24px, 5vw, 80px);
          background: var(--mb-dark);
        }

        .factory-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .factory-gallery {
          display: grid;
          grid-template-columns: 2fr 1fr;
          grid-template-rows: 280px 280px;
          gap: 12px;
          margin-top: 48px;
          border-radius: 20px;
          overflow: hidden;
        }

        .factory-img {
          position: relative;
          background: var(--mb-card);
          overflow: hidden;
          border-radius: 16px;
        }

        .factory-img:first-child {
          grid-row: 1 / 3;
        }

        .factory-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--mb-muted);
          font-size: 14px;
          background: 
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              rgba(255,255,255,0.01) 20px,
              rgba(255,255,255,0.01) 40px
            );
        }

        .factory-img-placeholder svg {
          opacity: 0.3;
        }

        .factory-img-label {
          position: absolute;
          bottom: 16px;
          left: 16px;
          padding: 6px 14px;
          background: rgba(10, 10, 10, 0.75);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          font-size: 13px;
          color: var(--mb-light);
          font-weight: 500;
        }

        /* ===== CTA ===== */
        .cta-section {
          text-align: center;
          padding: clamp(80px, 12vw, 140px) clamp(24px, 5vw, 80px);
          position: relative;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 400px;
          background: var(--mb-accent);
          filter: blur(160px);
          opacity: 0.06;
          border-radius: 50%;
        }

        .cta-title {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 900;
          color: var(--mb-white);
          letter-spacing: -1px;
          margin-bottom: 16px;
        }

        .cta-desc {
          font-size: 16px;
          color: var(--mb-muted);
          margin-bottom: 36px;
          line-height: 1.7;
        }

        .cta-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          border: none;
          font-family: inherit;
        }

        .cta-btn.primary {
          background: var(--mb-accent);
          color: white;
        }

        .cta-btn.primary:hover {
          background: #2563EB;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25);
        }

        .cta-btn.secondary {
          background: var(--mb-card);
          color: var(--mb-light);
          border: 1px solid var(--mb-border);
        }

        .cta-btn.secondary:hover {
          border-color: var(--mb-accent);
          color: var(--mb-white);
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .strengths-grid,
          .products-showcase {
            grid-template-columns: 1fr;
          }
          .factory-gallery {
            grid-template-columns: 1fr;
            grid-template-rows: 240px 200px 200px;
          }
          .factory-img:first-child {
            grid-row: auto;
          }
          .about-hero {
            height: auto;
            min-height: auto;
            padding-top: 120px;
            padding-bottom: 60px;
          }
        }
      `}</style>

      <div className="about-page">
        {/* ===== HERO ===== */}
        <section className="about-hero">
          <div className="hero-bg-grid" />
          <div
            className="hero-gradient-orb blue"
            style={{ transform: `translate(${scrollY * 0.02}px, ${scrollY * 0.03}px)` }}
          />
          <div
            className="hero-gradient-orb green"
            style={{ transform: `translate(-${scrollY * 0.015}px, -${scrollY * 0.02}px)` }}
          />
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              성원특수금속 · SINCE 1987
            </div>
            <h1 className="hero-title">
              39년 제조 기술,
              <br />
              <span className="accent">온라인으로 만나다</span>
            </h1>
            <p className="hero-subtitle">
              성원특수금속은 1987년부터 소형 정밀 나사를 직접 생산해온 제조 전문 공장입니다.
              MINIBOLT는 그동안 공장을 직접 방문하거나 거래처를 통해서만 구매할 수 있었던
              제품을, 누구나 온라인으로 주문할 수 있도록 만든 채널입니다.
            </p>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="about-section">
          <div className="section-label">OVERVIEW</div>
          <h2 className="section-title">숫자로 보는 MINIBOLT</h2>
          <div className="stats-grid">
            {STATS.map((stat, i) => (
              <StatCard key={i} {...stat} delay={i * 100} />
            ))}
          </div>
        </section>

        <div className="section-divider" />

        {/* ===== STRENGTHS ===== */}
        <section className="about-section">
          <div className="section-label">WHY MINIBOLT</div>
          <h2 className="section-title">왜 MINIBOLT인가</h2>
          <p className="section-desc">
            제조 공장이 직접 운영하는 온라인 채널이기에 가능한 것들입니다.
          </p>
          <div className="strengths-grid">
            {STRENGTHS.map((s, i) => (
              <StrengthCard key={i} {...s} index={i} />
            ))}
          </div>
        </section>

        <div className="section-divider" />

        {/* ===== PRODUCTS ===== */}
        <section className="about-section">
          <div className="section-label">PRODUCTS</div>
          <h2 className="section-title">취급 제품</h2>
          <p className="section-desc">
            규격 제품부터 맞춤 제작까지, 소형 나사의 모든 분야를 다룹니다.
          </p>
          <div className="products-showcase">
            {PRODUCTS.map((p, i) => (
              <ProductTag key={i} {...p} index={i} />
            ))}
          </div>
        </section>

        {/* ===== FACTORY ===== */}
        <section className="factory-section">
          <div className="factory-inner">
            <div className="section-label">FACILITY</div>
            <h2 className="section-title">자체 생산 설비</h2>
            <p className="section-desc">
              헤딩머신, 전조기, 탭핑기, 선반, 밀링 등 다양한 장비를 자체 보유하고 있습니다.
              원자재에서 완제품까지, 한 공장에서 일관된 품질 관리가 이루어집니다.
            </p>
            <div className="factory-gallery">
              {FACTORY_IMAGES.map((img, i) => (
                <div key={i} className="factory-img">
                  <img
                    src={img.src}
                    alt={img.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className="factory-img-label">{img.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ===== CTA ===== */}
        <section className="cta-section">
          <h2 className="cta-title">필요한 나사를 찾고 계신가요?</h2>
          <p className="cta-desc">
            833종 이상의 제품에서 원하시는 규격을 찾아보세요.
            <br />
            소량 주문, 대량 납품, 맞춤 제작 문의 모두 환영합니다.
          </p>
          <div className="cta-buttons">
            <a href="/products" className="cta-btn primary">
              제품 보러가기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a href="/contact" className="cta-btn secondary">
              거래 · 제작 문의
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
