import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '회사소개 | 미니볼트 - 39년 마이크로 스크류 제조 전문',
  description: '1987년 창립, 39년 제조 경험의 성원특수금속이 직접 운영하는 마이크로 스크류 전문몰 미니볼트. 마이크로나사, 정밀나사 제조사 직접판매.',
  alternates: {
    canonical: '/company',
  },
};

export default function CompanyPage() {
  return (
    <div>
      {/* 히어로 - 모바일: 줄인 패딩, 반응형 텍스트 */}
      <section className="safe-area-padding" style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2c3e50 100%)',
        color: '#fff',
        padding: 'clamp(3rem, 8vw, 5rem) clamp(1rem, 3vw, 1.5rem)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{
            color: '#ff6b35',
            fontWeight: 600,
            marginBottom: '0.75rem',
            fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
            letterSpacing: 2,
          }}>
            SINCE 1987
          </p>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 5vw, 3rem)',
            fontWeight: 800,
            marginBottom: '1rem',
            lineHeight: 1.3,
          }}>
            39년의 정밀 제조 기술,<br />
            <span style={{ color: '#ff6b35' }}>성원특수금속</span>이 만듭니다
          </h1>
          <p style={{
            fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
            color: '#aaa',
            lineHeight: 1.8,
            maxWidth: 600,
            margin: '0 auto',
          }}>
            1987년 창립 이후 단 하나의 철학 &mdash; &quot;정밀함&quot;으로 대한민국 산업의 작은 곳을 책임져왔습니다.
          </p>
        </div>
      </section>

      {/* 핵심 수치 - 모바일: 2열 그리드 */}
      <section style={{
        background: '#ff6b35',
        padding: 'clamp(2rem, 5vw, 3rem) clamp(1rem, 3vw, 1.5rem)',
      }}>
        <div style={{
          maxWidth: 1000,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 45%), 1fr))',
          gap: 'clamp(1.25rem, 3vw, 2rem)',
          textAlign: 'center',
        }}>
          {[
            { num: '39', unit: '년', label: '제조 업력' },
            { num: '833', unit: '+', label: '취급 제품 수' },
            { num: '1.2', unit: 'mm~', label: '최소 나사 직경' },
            { num: '100%', unit: '', label: '국내 생산' },
          ].map(({ num, unit, label }) => (
            <div key={label} style={{ color: '#fff' }}>
              <div style={{
                fontSize: 'clamp(1.75rem, 5vw, 3rem)',
                fontWeight: 800,
                lineHeight: 1,
              }}>
                {num}<span style={{ fontSize: 'clamp(0.9rem, 2vw, 1.2rem)' }}>{unit}</span>
              </div>
              <div style={{
                marginTop: '0.4rem',
                fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                opacity: 0.9,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 회사 소개 - 모바일: 1열 스택, 개선된 간격 */}
      <section style={{
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 3vw, 1.5rem)',
        background: '#fff',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionTitle>회사 소개</SectionTitle>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
            gap: 'clamp(1.5rem, 4vw, 3rem)',
            marginTop: 'clamp(1.75rem, 4vw, 2.5rem)',
          }}>
            <div>
              <h3 style={{
                fontSize: 'clamp(1.05rem, 3vw, 1.2rem)',
                fontWeight: 700,
                color: '#2c3e50',
                marginBottom: '0.75rem',
              }}>
                성원특수금속
              </h3>
              <p style={{
                lineHeight: 1.9,
                color: '#555',
                fontSize: 'clamp(0.875rem, 2vw, 0.95rem)',
              }}>
                1987년 경기도 시흥에서 창립한 성원특수금속은 마이크로 스크류(소형 정밀 나사) 제조 전문 업체입니다.
                전자기기, 카메라, 안경, 의료기기 등 다양한 산업에 사용되는 M1.2 ~ M4 규격의
                초소형 정밀 나사를 직접 제조합니다.
              </p>
              <p style={{
                lineHeight: 1.9,
                color: '#555',
                fontSize: 'clamp(0.875rem, 2vw, 0.95rem)',
                marginTop: '0.75rem',
              }}>
                39년의 제조 경험과 최신 CNC 가공 설비를 통해 0.01mm 단위의 정밀도를 유지하며,
                국내 주요 전자기업 및 해외 바이어에 납품하고 있습니다.
              </p>
            </div>

            <div>
              <h3 style={{
                fontSize: 'clamp(1.05rem, 3vw, 1.2rem)',
                fontWeight: 700,
                color: '#2c3e50',
                marginBottom: '0.75rem',
              }}>
                미니볼트
              </h3>
              <p style={{
                lineHeight: 1.9,
                color: '#555',
                fontSize: 'clamp(0.875rem, 2vw, 0.95rem)',
              }}>
                미니볼트는 성원특수금속이 직접 운영하는 B2B/B2C 온라인 쇼핑몰입니다.
                제조사 직접 판매 구조로 중간 유통 마진 없이 합리적인 가격을 제공합니다.
              </p>
              <p style={{
                lineHeight: 1.9,
                color: '#555',
                fontSize: 'clamp(0.875rem, 2vw, 0.95rem)',
                marginTop: '0.75rem',
              }}>
                100개 소량 주문부터 대량 납품까지, 규격품 재고 즉시 출고 및
                맞춤 제작(MOQ 10,000개) 서비스를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 제품 라인업 - 모바일: 2열 그리드, 줄인 패딩 */}
      <section style={{
        padding: 'clamp(3rem, 6vw, 5rem) clamp(0.75rem, 2vw, 1rem)',
        background: '#f5f5f5',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionTitle>제품 라인업</SectionTitle>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 45%), 1fr))',
            gap: 'clamp(0.625rem, 2vw, 1.5rem)',
            marginTop: 'clamp(1.75rem, 4vw, 2.5rem)',
          }}>
            {[
              { icon: '🔩', name: '바인드헤드', desc: '넓고 낮은 둥근 머리. 전자기기용', range: 'M1.4 ~ M4.0' },
              { icon: '🔩', name: '팬헤드', desc: '둥근 반구형 머리. 범용 고정용', range: 'M1.4 ~ M4.0' },
              { icon: '🔩', name: '플랫헤드', desc: '접시형 매립 머리. 표면 연결용', range: 'M1.4 ~ M4.0' },
              { icon: '🔬', name: '마이크로스크류', desc: '초소형 카메라 및 정밀기기용', range: 'Φ1.2 ~ Φ2.0' },
              { icon: '🔩', name: '평머리', desc: '납작한 머리. 정밀 고정용', range: 'Φ1.2 ~ Φ2.0' },
              { icon: '⚙️', name: '기타', desc: '특수 규격 및 맞춤 제작', range: '문의' },
            ].map(({ icon, name, desc, range }) => (
              <div key={name} style={{
                background: '#fff',
                borderRadius: 12,
                padding: 'clamp(1rem, 3vw, 1.5rem)',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.5rem' }}>{icon}</div>
                <h3 style={{
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  fontWeight: 700,
                  color: '#333',
                  marginBottom: '0.375rem',
                }}>
                  {name}
                </h3>
                <p style={{
                  fontSize: 'clamp(0.75rem, 2vw, 0.825rem)',
                  color: '#777',
                  lineHeight: 1.5,
                  marginBottom: '0.5rem',
                }}>
                  {desc}
                </p>
                <span style={{
                  display: 'inline-block',
                  background: '#ff6b3520',
                  color: '#ff6b35',
                  borderRadius: 20,
                  padding: '0.2rem 0.6rem',
                  fontSize: 'clamp(0.7rem, 1.8vw, 0.8rem)',
                  fontWeight: 600,
                }}>
                  {range}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 강점 - 모바일: 1열 스택, 줄인 패딩 */}
      <section style={{
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 3vw, 1.5rem)',
        background: '#2c3e50',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionTitle light>왜 미니볼트인가요?</SectionTitle>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 2rem)',
            marginTop: 'clamp(1.75rem, 4vw, 2.5rem)',
          }}>
            {[
              {
                icon: '🏭',
                title: '제조사 직접 판매',
                desc: '중간 유통 없이 공장에서 직접 판매. 동일 품질, 더 낮은 가격.',
              },
              {
                icon: '📦',
                title: '소량부터 대량까지',
                desc: '100개 소량 주문도 OK. 1,000개 이상 납품 단가 적용.',
              },
              {
                icon: '⚡',
                title: '빠른 출고',
                desc: '재고 보유 제품 당일~익일 출고. 전국 2~3일 배송.',
              },
              {
                icon: '🔧',
                title: '맞춤 제작',
                desc: '규격 외 특수 나사 맞춤 제작. CAD 도면 제출 후 견적.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: 'clamp(1.25rem, 3vw, 1.75rem)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{icon}</div>
                <h3 style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}>
                  {title}
                </h3>
                <p style={{
                  fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                  color: '#aaa',
                  lineHeight: 1.7,
                }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 사업자 정보 & 연락처 - 모바일: 줄인 패딩, 세로 버튼 스택 */}
      <section className="safe-area-bottom" style={{
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 3vw, 1.5rem)',
        background: '#fff',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <SectionTitle>사업자 정보</SectionTitle>

          <div style={{
            marginTop: 'clamp(1.5rem, 3vw, 2rem)',
            background: '#f8f9fa',
            borderRadius: 16,
            padding: 'clamp(1.25rem, 3vw, 2rem)',
            fontSize: 'clamp(0.875rem, 2vw, 0.95rem)',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
              gap: 'clamp(0.75rem, 2vw, 1rem)',
            }}>
              {[
                ['상호', '미니볼트'],
                ['대표', '김민수'],
                ['사업자등록번호', '279-52-00982'],
                ['통신판매업 신고번호', '2025-경기시흥-3264'],
                ['사업장 주소', '경기도 시흥시 신현로38번길 23 태산아파트 3동 1108호'],
                ['운영시간', '평일 09:00 ~ 18:00'],
                ['전화', '010-9006-5846'],
                ['이메일', 'contact@minibolt.co.kr'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}>
                  <span style={{
                    fontSize: 'clamp(0.75rem, 1.8vw, 0.8rem)',
                    color: '#888',
                    fontWeight: 600,
                  }}>
                    {label}
                  </span>
                  <span style={{
                    color: '#333',
                    fontWeight: 500,
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                  }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 연락처 버튼 - 모바일: 세로 스택, 충분한 터치 타겟 */}
          <div style={{
            marginTop: 'clamp(1.5rem, 3vw, 2rem)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 'clamp(0.5rem, 2vw, 1rem)',
          }}>
            <a
              href="tel:01090065846"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                background: '#ff6b35',
                color: '#fff',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                minHeight: 52,
                minWidth: 160,
              }}
            >
              전화 문의
            </a>
            <a
              href="mailto:contact@minibolt.co.kr"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                background: '#fff',
                color: '#ff6b35',
                border: '2px solid #ff6b35',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                minHeight: 52,
                minWidth: 160,
              }}
            >
              이메일 문의
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{
        fontSize: 'clamp(1.375rem, 4vw, 2rem)',
        fontWeight: 800,
        color: light ? '#fff' : '#2c3e50',
        marginBottom: '0.5rem',
      }}>
        {children}
      </h2>
      <div style={{ width: 48, height: 4, background: '#ff6b35', borderRadius: 2, margin: '0 auto' }} />
    </div>
  );
}
