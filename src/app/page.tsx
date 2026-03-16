import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import RecentlyViewed from '@/components/RecentlyViewed';

export const metadata: Metadata = {
  title: '미니볼트 - 마이크로 스크류 전문 | 소형 정밀 나사 제조사 직접판매',
  description: '39년 제조 경험의 성원특수금속이 직접 운영하는 마이크로 스크류 전문몰. M1.2~M4 소형 정밀 나사 833종, 제조사 직접판매. 안경나사, 노트북나사, SSD나사, 카메라나사 등 소량 100개부터 구매 가능.',
  alternates: {
    canonical: '/',
  },
};

const categories = [
  {
    img: '/image-1.png',
    alt: '마이크로스크류 평머리 나사 M1.2~M2 블랙 니켈 - MiniBolt 미니볼트',
    title: '마이크로스크류 / 평머리',
    desc: '정밀 전자기기와 소형 장비에 최적화된 미세 나사',
    specs: '헤드: Φ 다양한 사이즈 · 색상: 블랙, 니켈',
    featured: true,
    query: '마이크로스크류/평머리',
  },
  {
    img: '/image-2.png',
    alt: '바인드헤드 마이크로나사 M1.4~M4 둥근머리 스크류 - MiniBolt 미니볼트',
    title: '바인드 헤드',
    desc: '둥근 머리 형태로 다양한 산업 분야에 사용',
    specs: '타입: M/T 규격 · 도금: 블랙, 니켈',
    query: '바인드헤드',
  },
  {
    img: '/image-3.png',
    alt: '팬헤드 마이크로나사 M1.4~M4 넓은머리 스크류 - MiniBolt 미니볼트',
    title: '팬 헤드',
    desc: '넓은 머리로 안정적인 고정력 제공',
    specs: '용도: 플라스틱/목재 · 도금: 블랙, 니켈',
    query: '팬헤드',
  },
  {
    img: '/image-4.png',
    alt: '플랫헤드 마이크로나사 M1.4~M4 매립형 접시머리 스크류 - MiniBolt 미니볼트',
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

// FAQ 데이터 (FAQPage 구조화 데이터 + UI 렌더링 공용)
const faqs = [
  {
    question: '최소 주문 수량은 몇 개인가요?',
    answer: '최소 주문 수량은 100개입니다. 100개 단위로 주문하실 수 있으며, 100개 묶음은 규격에 관계없이 3,000원(VAT 별도)입니다.',
  },
  {
    question: '배송비는 얼마인가요?',
    answer: '50,000원 이상 구매 시 무료배송입니다. 50,000원 미만 주문 시에는 기본 배송비가 부과됩니다. 주문 후 1~2 영업일 내에 출고됩니다.',
  },
  {
    question: '표시 가격은 VAT가 포함된 가격인가요?',
    answer: '제품 목록의 공급가는 VAT 별도 가격입니다. 결제 시 부가세 10%가 추가됩니다. 제품 상세 페이지에서는 VAT 포함 가격도 함께 표시됩니다.',
  },
  {
    question: '어떤 재질의 나사를 판매하나요?',
    answer: '미니볼트의 모든 마이크로 스크류는 스테인리스 스틸(SUS) 재질입니다. 색상은 블랙(3가 BK 도금)과 니켈(NI 도금) 두 가지를 제공합니다.',
  },
  {
    question: '대량 구매 시 할인이 있나요?',
    answer: '5,000개 묶음 기준으로 복수 구매 할인이 적용됩니다. 2묶음 5%, 3묶음 8%, 4묶음 이상 10% 할인됩니다. 30,000개 이상 대량 주문은 별도 견적을 문의해 주세요.',
  },
  {
    question: '맞춤 제작(특수 규격)도 가능한가요?',
    answer: '네, 가능합니다. 미니볼트는 39년 제조 경험의 성원특수금속이 직접 운영하므로, 도면 기반 맞춤 제작이 가능합니다. 와샤붙이, 특수 헤드 등 다양한 요구에 대응합니다. 전화(010-9006-5846) 또는 문의 페이지로 연락 주세요.',
  },
];

// FAQPage JSON-LD 구조화 데이터
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default function HomePage() {
  return (
    <>
      {/* JSON-LD: FAQPage 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* 히어로 - 모바일: 줄인 패딩, 적절한 텍스트 크기, 충분한 CTA 터치 영역 */}
      <section className="safe-area-padding" style={{
        background: 'linear-gradient(135deg, #2c3e50, #34495e)',
        color: '#fff',
        padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 20px) clamp(48px, 8vw, 80px)',
        textAlign: 'center',
        minHeight: 280,
        contain: 'layout style',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, calc(50% - 8px)), 1fr))',
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
                  <div style={{ aspectRatio: '4 / 3', overflow: 'hidden', position: 'relative', background: '#f9f9f9' }}>
                    <Image
                      src={cat.img}
                      alt={cat.alt}
                      width={400}
                      height={300}
                      priority={cat.featured}
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 50vw, 280px"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 'clamp(6px, 2vw, 12px)' }}
                    />
                  </div>
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

      {/* FAQ 섹션 - SEO FAQPage 구조화 데이터와 연동 */}
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
            자주 묻는 질문
          </h2>
          <p style={{
            textAlign: 'center',
            color: '#666',
            marginBottom: 'clamp(1.5rem, 3vw, 2rem)',
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          }}>
            마이크로 스크류 구매 전 궁금한 점을 확인하세요
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 2vw, 1rem)' }}>
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '2px solid #e0e0e0',
                  overflow: 'hidden',
                }}
              >
                <summary style={{
                  padding: 'clamp(1rem, 2.5vw, 1.25rem)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  color: '#333',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}>
                  <span>Q. {faq.question}</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M5 8L10 13L15 8" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div style={{
                  padding: '0 clamp(1rem, 2.5vw, 1.25rem) clamp(1rem, 2.5vw, 1.25rem)',
                  color: '#555',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                  lineHeight: 1.7,
                  borderTop: '1px solid #f0f0f0',
                }}>
                  <p style={{ margin: '1rem 0 0' }}>{faq.answer}</p>
                </div>
              </details>
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
