import Link from 'next/link';
import Image from 'next/image';
import RecentlyViewed from '@/components/RecentlyViewed';

const categories = [
  {
    img: '/image-1.png',
    alt: '마이크로스크류',
    title: '마이크로스크류 / 평머리',
    desc: '정밀 전자기기와 소형 장비에 최적화된 미세 나사',
    specs: '헤드: Φ 다양한 사이즈 · 색상: 블랙, 니켈',
    featured: true,
    query: '마이크로스크류/평머리',
  },
  {
    img: '/image-2.png',
    alt: '바인드헤드',
    title: '바인드 헤드',
    desc: '둥근 머리 형태로 다양한 산업 분야에 사용',
    specs: '타입: M/T 규격 · 도금: 블랙, 니켈',
    query: '바인드헤드',
  },
  {
    img: '/image-3.png',
    alt: '팬헤드',
    title: '팬 헤드',
    desc: '넓은 머리로 안정적인 고정력 제공',
    specs: '용도: 플라스틱/목재 · 도금: 블랙, 니켈',
    query: '팬헤드',
  },
  {
    img: '/image-4.png',
    alt: '플랫헤드',
    title: '플랫 헤드',
    desc: '매끈한 마감이 필요한 작업에 적합',
    specs: '특징: 매립형 · 도금: 블랙, 니켈',
    query: '플랫헤드',
  },
];

const stats = [
  { value: '39', label: '제조 업력 (1987~)' },
  { value: '833+', label: '취급 제품 수' },
  { value: '1.2mm', label: '최소 규격' },
  { value: '100%', label: '자체 생산' },
];

const strengths = [
  {
    icon: '🏭',
    title: '39년 제조 공장 직접 운영',
    desc: '성원특수금속은 1987년부터 소형 정밀 나사를 직접 생산해온 제조 전문 공장입니다. MINIBOLT는 이 제조 역량을 온라인으로 확장한 채널입니다.',
  },
  {
    icon: '💰',
    title: '제조사 직접 판매, 중간 마진 없음',
    desc: '유통 단계 없이 공장에서 직접 판매합니다. 기존에는 거래처를 통해서만 구매 가능했던 제품을, 소량이든 대량이든 누구나 주문할 수 있습니다.',
  },
  {
    icon: '🎯',
    title: '맞춤 제작 · 규격 상담',
    desc: '제조사가 직접 운영하기 때문에 정확한 규격 상담과 도면 기반 맞춤 제작이 가능합니다. 와샤붙이, 특수 헤드 등 다양한 요구에 대응합니다.',
  },
  {
    icon: '♻️',
    title: 'ROHS 6종 환경규제 준수',
    desc: '유해물질 사용 제한 지침(ROHS)을 준수하며, 납, 수은, 카드뮴 등 6종 유해물질을 철저히 관리합니다. 친환경 제품 생산을 실천합니다.',
  },
];

const features = [
  { icon: '📦', title: '833+ 제품 상시 재고', desc: '다양한 규격의 소형 스크류를 상시 보유하여 즉시 출고 가능합니다' },
  { icon: '⚡', title: '빠른 배송 (1-2일)', desc: '주문 후 1-2일 내 배송으로 프로젝트 일정에 차질 없습니다' },
  { icon: '✅', title: '품질 보증 · 불량 교환', desc: '엄격한 품질 관리와 불량 발생 시 즉시 교환 보증' },
  { icon: '🔍', title: '소량 구매 가능', desc: '100개부터 주문 가능, 개인 개발자도 부담 없이 구매' },
];

export default function HomePage() {
  return (
    <>
      {/* 히어로 - 모바일: 줄인 패딩, 적절한 텍스트 크기, 충분한 CTA 터치 영역 */}
      <section className="safe-area-padding" style={{
        background: 'linear-gradient(135deg, #2c3e50, #34495e)',
        color: '#fff',
        padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 20px) clamp(48px, 8vw, 80px)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(1.75rem, 5vw, 3rem)',
          fontWeight: 700,
          marginBottom: '0.75rem',
          lineHeight: 1.3,
        }}>
          마이크로 스크류 전문, Mini Bolt
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          color: '#ccc',
          marginBottom: '0.5rem',
          lineHeight: 1.6,
        }}>
          개발자와 기업을 위한 고품질 마이크로 스크류
        </p>
        <p style={{
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          color: '#aaa',
          marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        }}>
          합리적인 가격, 폭넓은 소형 스크류 라인업
        </p>
        <Link
          href="/products"
          style={{
            background: '#ff6b35',
            color: '#fff',
            padding: '0.875rem 2rem',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 52,
            minWidth: 180,
          }}
        >
          제품 둘러보기
        </Link>
      </section>

      {/* 카테고리 - 모바일: 2열 그리드, 줄인 간격 */}
      <section style={{
        padding: 'clamp(2.5rem, 6vw, 4rem) clamp(12px, 3vw, 20px)',
        background: '#f5f5f5',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            marginBottom: '0.5rem',
          }}>
            제품 카테고리
          </h2>
          <p style={{
            textAlign: 'center',
            color: '#666',
            marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          }}>
            다양한 헤드 타입과 규격을 준비했습니다
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            {categories.map(cat => (
              <Link
                key={cat.title}
                href={`/products?category=${encodeURIComponent(cat.query)}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  background: '#fff',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: cat.featured ? '2px solid #ff6b35' : '2px solid #e0e0e0',
                  position: 'relative',
                  height: '100%',
                }}>
                  {cat.featured && (
                    <span style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: '#ff6b35',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      zIndex: 1,
                    }}>
                      주력
                    </span>
                  )}
                  <Image
                    src={cat.img}
                    alt={cat.alt}
                    width={400}
                    height={180}
                    style={{ width: '100%', height: 'clamp(140px, 20vw, 180px)', objectFit: 'cover' }}
                  />
                  <div style={{ padding: 'clamp(0.875rem, 2vw, 1.2rem)' }}>
                    <h3 style={{
                      fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                      fontWeight: 700,
                      marginBottom: '0.4rem',
                    }}>
                      {cat.title}
                    </h3>
                    <p style={{
                      color: '#666',
                      fontSize: 'clamp(0.825rem, 2vw, 0.9rem)',
                      marginBottom: '0.5rem',
                      lineHeight: 1.5,
                    }}>
                      {cat.desc}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#888' }}>{cat.specs}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 회사소개 - 모바일: 줄인 패딩, 반응형 텍스트 */}
      <section style={{
        background: '#2c3e50',
        color: '#fff',
        padding: 'clamp(3rem, 6vw, 5rem) clamp(16px, 3vw, 20px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
            <span style={{
              background: '#ff6b35',
              color: '#fff',
              padding: '4px 16px',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-block',
            }}>
              COMPANY PROFILE
            </span>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              marginTop: '1rem',
              marginBottom: '1rem',
            }}>
              39년 경험의 제조사 직접 판매
            </h2>
            <p style={{
              color: '#ccc',
              lineHeight: 1.8,
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              maxWidth: 600,
              margin: '0 auto',
            }}>
              MINIBOLT는 1987년부터 소형 정밀 나사를 생산해온 <strong style={{ color: '#fff' }}>성원특수금속</strong>의 온라인 채널입니다.
              제조사가 직접 운영하기 때문에 중간 유통 단계 없이 합리적인 가격으로 제공합니다.
            </p>
          </div>

          {/* 통계 - 모바일: 2열 그리드, 줄인 텍스트 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 45%), 1fr))',
            gap: 'clamp(1rem, 3vw, 2rem)',
            marginBottom: 'clamp(2rem, 4vw, 3rem)',
            textAlign: 'center',
          }}>
            {stats.map(s => (
              <div key={s.label}>
                <div style={{
                  fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                  fontWeight: 700,
                  color: '#ff6b35',
                }}>
                  {s.value}
                </div>
                <div style={{
                  color: '#ccc',
                  marginTop: '0.35rem',
                  fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* 강점 카드 - 모바일: 1열, 줄인 패딩 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            {strengths.map(s => (
              <div key={s.title} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 'clamp(1.125rem, 3vw, 1.5rem)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                <h3 style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}>
                  {s.title}
                </h3>
                <p style={{
                  color: '#ccc',
                  fontSize: 'clamp(0.825rem, 2vw, 0.9rem)',
                  lineHeight: 1.7,
                }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 가격 - 모바일: 1열, 줄인 패딩 */}
      <section style={{
        padding: 'clamp(2.5rem, 6vw, 4rem) clamp(12px, 3vw, 20px)',
        background: '#f5f5f5',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            marginBottom: '0.5rem',
          }}>
            합리적인 가격
          </h2>
          <p style={{
            textAlign: 'center',
            color: '#888',
            fontSize: 'clamp(0.825rem, 2vw, 0.9rem)',
            marginBottom: 'clamp(1.5rem, 3vw, 2rem)',
          }}>
            * 표시 가격은 VAT 포함 (공급가 + 부가세 10%)
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
            gap: 'clamp(1rem, 2vw, 1.5rem)',
          }}>
            {[
              { title: '소량 구매', qty: '100개', price: '₩3,300~', desc: '기본 단위', popular: false },
              { title: '인기', qty: '1,000개', price: '₩6,600~', desc: '개당 7~20원', popular: true },
              { title: '대량 구매', qty: '30,000개 이상', price: '견적 문의', desc: '특별 할인가 적용', popular: false },
            ].map(p => (
              <div key={p.title} style={{
                background: '#fff',
                borderRadius: 12,
                padding: 'clamp(1.25rem, 3vw, 2rem)',
                textAlign: 'center',
                border: p.popular ? '3px solid #ff6b35' : '2px solid #e0e0e0',
                position: 'relative',
              }}>
                {p.popular && (
                  <span style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ff6b35',
                    color: '#fff',
                    padding: '2px 16px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    추천
                  </span>
                )}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>{p.title}</h3>
                <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.4rem)', fontWeight: 700, color: '#333', marginBottom: '0.4rem' }}>{p.qty}</div>
                <div style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.6rem)', fontWeight: 700, color: '#ff6b35', marginBottom: '0.4rem' }}>{p.price}</div>
                <p style={{ color: '#888', fontSize: '0.85rem' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 구매 혜택 - 모바일: 1열, 줄인 간격 */}
      <section style={{
        padding: 'clamp(2.5rem, 6vw, 4rem) clamp(12px, 3vw, 20px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)',
          }}>
            구매 혜택
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: '#f8f9fa',
                borderRadius: 12,
                padding: 'clamp(1.125rem, 3vw, 1.5rem)',
              }}>
                <h3 style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}>
                  <span style={{ marginRight: '0.5rem' }}>{f.icon}</span>{f.title}
                </h3>
                <p style={{
                  color: '#666',
                  fontSize: 'clamp(0.825rem, 2vw, 0.9rem)',
                  lineHeight: 1.7,
                }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최근 본 상품 */}
      <RecentlyViewed />

      {/* 문의 - 모바일: 줄인 텍스트, 전화번호 터치 가능 */}
      <section className="safe-area-bottom" style={{
        background: '#2c3e50',
        color: '#fff',
        padding: 'clamp(2.5rem, 6vw, 4rem) clamp(16px, 3vw, 20px)',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          marginBottom: '0.75rem',
        }}>
          주문 및 견적 문의
        </h2>
        <p style={{
          color: '#ccc',
          marginBottom: '1.25rem',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
        }}>
          30,000개 이상 대량 구매 또는 맞춤 제작 상담
        </p>
        <a
          href="tel:01090065846"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 700,
            color: '#ff6b35',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 52,
            minWidth: 48,
            textDecoration: 'none',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          010-9006-5846
        </a>
        <p style={{
          color: '#aaa',
          fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
        }}>
          평일 09:00 - 18:00 (주말 및 공휴일 휴무)
        </p>
      </section>
    </>
  );
}
