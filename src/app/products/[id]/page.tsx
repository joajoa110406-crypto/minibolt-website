import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BLUR_DATA_URL } from '@/lib/image-constants';
import { generateProductName, getCategoryImage, getStockStatus, allProducts } from '@/lib/products';
import ScrewSVG from '@/components/ScrewSVG';
import ProductDetailClient from './ProductDetailClient';

const products = allProducts;

/** 직경에 따른 재질 반환: 1mm대 → SWCH18A, 2mm+ → SWCH10A */
function getMaterial(diameter: number | string) {
  const d = typeof diameter === 'string' ? parseFloat(diameter) : diameter;
  const grade = d < 2 ? 'SWCH18A' : 'SWCH10A';
  return { grade, label: `${grade} 탄소강` };
}

// ---------------------------------------------------------------------------
// ISR: 1시간(3600초)마다 정적 페이지 재생성
// 제품 재고/가격 변동을 반영하면서도 빌드 부하를 최소화
// ---------------------------------------------------------------------------
export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Static params for SSG
// ---------------------------------------------------------------------------
export async function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

// ---------------------------------------------------------------------------
// Dynamic metadata (SEO)
// ---------------------------------------------------------------------------
interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) return { title: '제품을 찾을 수 없습니다 | 미니볼트' };

  const name = generateProductName(product);
  const categoryLabel =
    product.category === '마이크로스크류/평머리'
      ? product.sub_category || '마이크로스크류'
      : product.category || '기타';
  const typeLabel = product.type === 'M' ? '머신스크류' : product.type === 'T' ? '태핑스크류' : '스크류';
  const price100 = Math.round((product.price_100_block ?? 3000) * 1.1).toLocaleString();
  const price5000Per = Math.round(product.price_5000_per * 1.1);
  const productUrl = `https://minibolt.co.kr/products/${product.id}`;
  const imageUrl = `https://minibolt.co.kr${getCategoryImage(product)}`;

  // SEO 최적화: 규격 + 카테고리 + 용도 키워드를 포함한 타이틀
  const title = `${name} ${categoryLabel} - 미니볼트 마이크로나사 | 소량구매 100개 ${price100}원`;

  // 150자 내외의 풍부한 메타 디스크립션: 규격, 가격, 재질, 용도 포함
  const { label: materialLabel } = getMaterial(product.diameter);
  const description = `${name} ${typeLabel} - M${product.diameter}\u00d7${product.length}mm ${product.color} ${materialLabel}. 100개 \u20a9${price100}부터, 개당 ${price5000Per}원(5000개). 39년 제조사 성원특수금속 직접판매. 안경나사 노트북나사 SSD나사 카메라나사 소량 구매 가능.`;

  // 제품별 동적 키워드 생성
  const keywords = [
    `M${product.diameter} 나사`,
    `M${product.diameter} 스크류`,
    `M${product.diameter}x${product.length} 나사`,
    `${product.diameter}mm 나사`,
    `${categoryLabel} 나사`,
    `${categoryLabel} 스크류`,
    `${product.color} 나사`,
    `마이크로 나사 M${product.diameter}`,
    '마이크로 스크류',
    '소형 나사',
    '정밀 나사',
    '미니볼트',
    '소량 나사 구매',
    '나사 100개',
  ];

  return {
    title,
    description,
    keywords: keywords.join(', '),
    alternates: {
      canonical: `/products/${product.id}`,
    },
    openGraph: {
      title: `${name} - 미니볼트 | 100개 \u20a9${price100}부터`,
      description: `${name} ${typeLabel} M${product.diameter}\u00d7${product.length}mm ${product.color} ${materialLabel}. 39년 제조사 직접판매. 100개 \u20a9${price100}부터 소량 구매 가능. 안경나사 노트북나사 SSD나사.`,
      type: 'website',
      siteName: '미니볼트 - 마이크로 스크류 전문',
      url: productUrl,
      locale: 'ko_KR',
      countryName: '대한민국',
      images: [{
        url: imageUrl,
        width: 400,
        height: 400,
        alt: `${name} ${categoryLabel} ${product.color} 마이크로 스크류 제품 이미지`,
        type: 'image/png',
      }],
    },
    twitter: {
      card: 'summary',
      title: `${name} - 미니볼트 | 100개 \u20a9${price100}~`,
      description: `${typeLabel} M${product.diameter}\u00d7${product.length}mm ${product.color} ${materialLabel}. 39년 제조사 직접판매. 소량 구매 가능.`,
      images: [{ url: imageUrl, alt: `${name} 마이크로 스크류` }],
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      'product:price:amount': String(Math.round((product.price_100_block ?? 3000) * 1.1)),
      'product:price:currency': 'KRW',
      'product:availability': product.stock > 0 ? 'instock' : 'oos',
      'product:brand': '미니볼트',
      'product:category': categoryLabel,
    },
  };
}

// ---------------------------------------------------------------------------
// Server Component – Product Detail Page
// ---------------------------------------------------------------------------
export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  const name = generateProductName(product);
  const { label: stockLabel, ok: stockOk } = getStockStatus(product.stock);
  const imgSrc = getCategoryImage(product);

  // Category display name
  const categoryLabel =
    product.category === '마이크로스크류/평머리'
      ? product.sub_category || '마이크로스크류'
      : product.category || '기타';

  // Material
  const material = getMaterial(product.diameter);

  // Prices (VAT included)
  const price100Vat = Math.round((product.price_100_block ?? 3000) * 1.1);
  const price1000PerVat = Math.round(product.price_1000_per * 1.1);
  const price1000BlockVat = Math.round((product.price_1000_block ?? 0) * 1.1);
  const price5000PerVat = Math.round(product.price_5000_per * 1.1);
  const price5000BlockVat = Math.round((product.price_5000_block ?? 0) * 1.1);

  // JSON-LD Structured Data - Product (Google Rich Results 대응)
  const lowPrice = Math.round(product.price_5000_per * 1.1);
  const highPrice = Math.round(((product.price_100_block ?? 3000) / 100) * 1.1);
  const productUrl = `https://minibolt.co.kr/products/${product.id}`;
  const imageUrl = `https://minibolt.co.kr${imgSrc}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: `${name} - M${product.diameter}\u00d7${product.length}mm ${product.color} ${material.label} 마이크로 스크류. 39년 제조사 성원특수금속 직접판매.`,
    image: imageUrl,
    url: productUrl,
    sku: product.id,
    mpn: product.id,
    brand: { '@type': 'Brand', name: '미니볼트' },
    manufacturer: {
      '@type': 'Organization',
      name: '성원특수금속',
      url: 'https://minibolt.co.kr',
      foundingDate: '1987',
    },
    offers: {
      '@type': 'AggregateOffer',
      lowPrice,
      highPrice,
      priceCurrency: 'KRW',
      offerCount: 3,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      priceValidUntil: `${new Date().getFullYear()}-12-31`,
      seller: { '@type': 'Organization', name: '성원특수금속(미니볼트)', url: 'https://minibolt.co.kr' },
      url: productUrl,
    },
    category: categoryLabel,
    material: material.label,
    color: product.color,
    additionalProperty: [
      { '@type': 'PropertyValue', name: '직경', value: `M${product.diameter}`, unitCode: 'MMT' },
      { '@type': 'PropertyValue', name: '길이', value: product.length, unitCode: 'MMT' },
      ...(product.head_width ? [{ '@type': 'PropertyValue', name: '헤드 지름', value: product.head_width, unitCode: 'MMT' }] : []),
      ...(product.head_height ? [{ '@type': 'PropertyValue', name: '헤드 두께', value: product.head_height, unitCode: 'MMT' }] : []),
      { '@type': 'PropertyValue', name: '타입', value: product.type === 'M' ? '머신스크류(M/C)' : product.type === 'T' ? '태핑스크류(T/C)' : product.type },
    ],
  };

  // JSON-LD Breadcrumb (Google 검색결과 경로 노출)
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: 'https://minibolt.co.kr' },
      { '@type': 'ListItem', position: 2, name: '제품', item: 'https://minibolt.co.kr/products' },
      { '@type': 'ListItem', position: 3, name: categoryLabel, item: `https://minibolt.co.kr/products?category=${encodeURIComponent(product.category)}` },
      { '@type': 'ListItem', position: 4, name },
    ],
  };

  // Related products: same category + sub_category, different id, max 4
  const related = products
    .filter((p) => p.category === product.category && p.sub_category === product.sub_category && p.id !== product.id)
    .slice(0, 4);

  return (
    <>
      {/* JSON-LD: Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="pdp-wrap">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="pdp-breadcrumb">
          <ol>
            <li><Link href="/">홈</Link></li>
            <li><Link href="/products">제품</Link></li>
            <li><Link href={`/products?category=${encodeURIComponent(product.category)}`}>{categoryLabel}</Link></li>
            <li aria-current="page">{name}</li>
          </ol>
        </nav>

        {/* Main content: two-column */}
        <div className="pdp-main">
          {/* Left: Image + SVG diagram */}
          <div className="pdp-left">
            <div className="pdp-image-box">
              {/* ProductImage is client component, wrap in a div */}
              <Image
                src={imgSrc}
                alt={`${name} ${categoryLabel} ${product.color} 마이크로 스크류 - M${product.diameter}x${product.length}mm ${material.label}`}
                width={280}
                height={280}
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes="(max-width: 768px) 200px, 280px"
                style={{ borderRadius: 12, border: '1px solid #e0e0e0', objectFit: 'cover', maxWidth: '100%', height: 'auto' }}
              />
              <span className={`pdp-stock-badge ${stockOk ? 'in-stock' : 'low-stock'}`}>
                {stockLabel}
              </span>
            </div>
            <div className="pdp-svg-box">
              <h2 className="pdp-section-title">제품 도면</h2>
              <ScrewSVG product={product} />
            </div>
          </div>

          {/* Right: Info + Order */}
          <div className="pdp-right">
            <h1 className="pdp-product-name">
              {name} <span className="pdp-product-category-badge">{categoryLabel}</span>
            </h1>
            <p className="pdp-product-subtitle">
              M{product.diameter}\u00d7{product.length}mm {product.color} {material.label} {product.type === 'M' ? '머신' : product.type === 'T' ? '태핑' : ''}스크류 | 소량 100개부터 구매 가능
            </p>
            <p className="pdp-product-id">품목코드: {product.id}</p>

            {/* Specs Table */}
            <div className="pdp-specs">
              <h2 className="pdp-section-title">제품 사양</h2>
              <table className="pdp-specs-table">
                <tbody>
                  <tr><th>카테고리</th><td>{categoryLabel}</td></tr>
                  <tr><th>타입</th><td>{product.type === 'M' ? 'M/C (머신)' : product.type === 'T' ? 'T/C (태핑)' : product.type || '-'}</td></tr>
                  <tr><th>직경 (d)</th><td>M{product.diameter}</td></tr>
                  <tr><th>길이 (L)</th><td>{product.length}mm</td></tr>
                  {product.head_width && (
                    <tr><th>헤드 지름 (&Phi;)</th><td>{product.head_width}mm</td></tr>
                  )}
                  {product.head_height && (
                    <tr><th>헤드 두께 (t)</th><td>{product.head_height}mm</td></tr>
                  )}
                  <tr><th>색상</th><td>{product.color}</td></tr>
                  <tr><th>재질</th><td>{material.label} ({material.grade})</td></tr>
                  <tr>
                    <th>재고</th>
                    <td>
                      <span style={{ color: stockOk ? '#155724' : '#856404', fontWeight: 600 }}>
                        {(product.stock || 0).toLocaleString()}개 ({stockLabel})
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Price Table */}
            <div className="pdp-price-section">
              <h2 className="pdp-section-title">{name} 가격표 <small style={{ fontWeight: 400, color: '#999', fontSize: '0.75rem' }}>(VAT 포함)</small></h2>
              <table className="pdp-price-table">
                <thead>
                  <tr>
                    <th>수량</th>
                    <th>개당 단가</th>
                    <th>금액</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>100개</td>
                    <td>{Math.round(price100Vat / 100).toLocaleString()}원</td>
                    <td className="pdp-price-value">{price100Vat.toLocaleString()}원</td>
                  </tr>
                  <tr>
                    <td>1,000개</td>
                    <td>{price1000PerVat.toLocaleString()}원</td>
                    <td className="pdp-price-value">{price1000BlockVat.toLocaleString()}원</td>
                  </tr>
                  <tr className="pdp-price-best-row">
                    <td>5,000개</td>
                    <td>{price5000PerVat.toLocaleString()}원</td>
                    <td className="pdp-price-value pdp-price-best">{price5000BlockVat.toLocaleString()}원</td>
                  </tr>
                </tbody>
              </table>
              <p className="pdp-discount-note">
                5,000개 복수구매 할인: 2묶음 5% / 3묶음 8% / 4묶음+ 10%
              </p>
            </div>

            {/* Client-side order section (block select + qty + add to cart) */}
            <ProductDetailClient product={product} />
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="pdp-related">
            <h2 className="pdp-section-title">같은 카테고리 {categoryLabel} 제품</h2>
            <div className="pdp-related-grid">
              {related.map((rp) => {
                const rpName = generateProductName(rp);
                const rpImg = getCategoryImage(rp);
                const rpPrice = Math.round((rp.price_100_block ?? 3000) * 1.1);
                return (
                  <Link key={rp.id} href={`/products/${rp.id}`} prefetch={false} className="pdp-related-card">
                    <Image
                      src={rpImg}
                      alt={`${rpName} 마이크로나사 - MiniBolt`}
                      width={64}
                      height={64}
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      sizes="(max-width: 768px) 48px, 64px"
                      style={{ borderRadius: 8, border: '1px solid #e0e0e0', objectFit: 'cover' }}
                    />
                    <div className="pdp-related-info">
                      <span className="pdp-related-name">{rpName}</span>
                      <span className="pdp-related-price">100개 {rpPrice.toLocaleString()}원~</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link
                href={`/products?category=${encodeURIComponent(product.category)}`}
                className="pdp-view-all-btn"
              >
                {categoryLabel} 전체 보기
              </Link>
            </div>
          </div>
        )}

        {/* 유해물질 불함유 확인서 */}
        <section className="pdp-certificate" aria-label="유해물질 불함유 확인서">
          <h2 className="pdp-section-title">유해물질 불함유 확인서</h2>
          <p className="pdp-certificate-desc">
            성원특수금속의 모든 제품은 RoHS/REACH 규정을 준수하며, 유해물질이 포함되지 않은 안전한 탄소강 소재를 사용합니다.
          </p>
          <div className="pdp-certificate-img-wrap">
            <Image
              src="/images/certificate-rohs.png"
              alt="성원특수금속 유해물질 불함유 확인서 - RoHS/REACH 준수"
              width={856}
              height={1200}
              loading="lazy"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 100vw, 600px"
              style={{ width: '100%', maxWidth: 600, height: 'auto', borderRadius: 8, border: '1px solid #e0e0e0' }}
            />
          </div>
        </section>

        {/* SEO: 제품 설명 섹션 - 검색엔진이 페이지 컨텍스트를 이해하도록 */}
        <section className="pdp-seo-description" aria-label="제품 상세 설명">
          <h2 className="pdp-section-title">{name} 상세 정보</h2>
          <p>
            {name}은(는) M{product.diameter}\u00d7{product.length}mm 규격의 {product.color} {material.label} {categoryLabel} 제품입니다.
            {product.type === 'M' ? ' 머신스크류(M/C) 타입으로 탭 가공된 암나사에 체결됩니다.' : product.type === 'T' ? ' 태핑스크류(T/C) 타입으로 별도 탭 가공 없이 직접 체결 가능합니다.' : ''}
            {' '}미니볼트는 39년 전통 제조사 성원특수금속의 직접판매 브랜드로, M1.2~M3mm 마이크로 정밀나사를 소량 100개부터 구매하실 수 있습니다.
            안경, 노트북, SSD, 카메라, 드론, 라즈베리파이 등 다양한 용도에 적합합니다.
          </p>
        </section>

        {/* Back to list */}
        <div className="pdp-back">
          <Link href="/products" className="pdp-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            전체 마이크로나사 목록 보기
          </Link>
        </div>
      </div>

      <style>{`
        /* ===== Product Detail Page ===== */
        .pdp-wrap {
          background: #f5f5f5;
          min-height: 100vh;
          padding: 80px 20px 60px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Breadcrumb */
        .pdp-breadcrumb {
          margin-bottom: 1.5rem;
        }
        .pdp-breadcrumb ol {
          display: flex;
          flex-wrap: wrap;
          list-style: none;
          padding: 0;
          margin: 0;
          gap: 0;
          font-size: 0.85rem;
          color: #999;
        }
        .pdp-breadcrumb li {
          display: flex;
          align-items: center;
        }
        .pdp-breadcrumb li:not(:last-child)::after {
          content: '>';
          margin: 0 0.5rem;
          color: #ccc;
        }
        .pdp-breadcrumb a {
          color: #666;
          text-decoration: none;
          transition: color 0.2s;
        }
        .pdp-breadcrumb a:hover {
          color: #ff6b35;
        }
        .pdp-breadcrumb li:last-child {
          color: #333;
          font-weight: 600;
        }

        /* Main two-column */
        .pdp-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          margin-bottom: 3rem;
        }

        /* Left column */
        .pdp-left {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .pdp-image-box {
          background: #fff;
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .pdp-stock-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .pdp-stock-badge.in-stock { background: #d4edda; color: #155724; }
        .pdp-stock-badge.low-stock { background: #fff3cd; color: #856404; }
        .pdp-svg-box {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Section title */
        .pdp-section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #333;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #f0f0f0;
          width: 100%;
        }

        /* Right column */
        .pdp-right {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .pdp-product-name {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1a1a1a;
          line-height: 1.3;
          margin: 0;
        }
        .pdp-product-category-badge {
          display: inline-block;
          background: #f0f7ff;
          color: #2c5282;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          vertical-align: middle;
          margin-left: 4px;
        }
        .pdp-product-subtitle {
          font-size: 0.9rem;
          color: #666;
          margin: 0;
          line-height: 1.5;
        }
        .pdp-product-id {
          font-size: 0.85rem;
          color: #999;
          margin: -0.5rem 0 0 0;
          font-family: monospace;
        }

        /* Specs table */
        .pdp-specs {
          background: #fff;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .pdp-specs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .pdp-specs-table th {
          text-align: left;
          color: #666;
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          width: 35%;
          border-bottom: 1px solid #f0f0f0;
          white-space: nowrap;
        }
        .pdp-specs-table td {
          padding: 0.5rem 0.75rem;
          color: #333;
          border-bottom: 1px solid #f0f0f0;
        }
        .pdp-specs-table tr:last-child th,
        .pdp-specs-table tr:last-child td {
          border-bottom: none;
        }

        /* Price section */
        .pdp-price-section {
          background: #fff;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .pdp-price-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .pdp-price-table thead th {
          background: #f8f9fa;
          padding: 0.6rem 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #555;
          font-size: 0.8rem;
          border-bottom: 2px solid #e0e0e0;
        }
        .pdp-price-table tbody td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid #f0f0f0;
          color: #333;
        }
        .pdp-price-value {
          font-weight: 700;
        }
        .pdp-price-best {
          color: #ff6b35;
        }
        .pdp-price-best-row {
          background: #fff8f5;
        }
        .pdp-price-best-row td {
          border-bottom: none;
        }
        .pdp-discount-note {
          margin: 0.75rem 0 0 0;
          padding: 0.6rem 0.75rem;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 0.78rem;
          color: #888;
          text-align: center;
        }

        /* Related products */
        .pdp-related {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
        }
        .pdp-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
        .pdp-related-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pdp-related-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 2px 8px rgba(255,107,53,0.1);
        }
        .pdp-related-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }
        .pdp-related-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pdp-related-price {
          font-size: 0.8rem;
          color: #ff6b35;
          font-weight: 600;
        }
        .pdp-view-all-btn {
          display: inline-block;
          background: #fff;
          color: #ff6b35;
          border: 2px solid #ff6b35;
          padding: 0.6rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .pdp-view-all-btn:hover {
          background: #ff6b35;
          color: #fff;
        }

        /* Certificate */
        .pdp-certificate {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
        }
        .pdp-certificate-desc {
          font-size: 0.88rem;
          color: #555;
          line-height: 1.6;
          margin: 0 0 1rem 0;
        }
        .pdp-certificate-img-wrap {
          display: flex;
          justify-content: center;
        }

        /* SEO description */
        .pdp-seo-description {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
        }
        .pdp-seo-description p {
          font-size: 0.9rem;
          color: #555;
          line-height: 1.7;
          margin: 0;
        }

        /* Back link */
        .pdp-back {
          text-align: center;
          padding: 1rem 0 2rem;
        }
        .pdp-back-link {
          display: inline-flex;
          align-items: center;
          color: #666;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: color 0.2s;
        }
        .pdp-back-link:hover {
          color: #ff6b35;
        }

        /* ===== Mobile (768px and below) ===== */
        @media (max-width: 768px) {
          .pdp-wrap {
            padding: 70px 12px 40px;
          }
          .pdp-breadcrumb {
            margin-bottom: 1rem;
          }
          .pdp-breadcrumb ol {
            font-size: 0.75rem;
          }
          .pdp-main {
            grid-template-columns: 1fr;
            gap: 1.25rem;
            margin-bottom: 2rem;
          }
          .pdp-image-box {
            padding: 1.25rem;
            border-radius: 12px;
          }
          .pdp-image-box img {
            max-width: 200px;
          }
          .pdp-svg-box {
            padding: 1rem;
            border-radius: 12px;
          }
          .pdp-svg-box svg {
            max-width: 180px;
            height: auto;
          }
          .pdp-product-name {
            font-size: 1.25rem;
          }
          .pdp-product-subtitle {
            font-size: 0.8rem;
          }
          .pdp-certificate {
            padding: 1rem;
            border-radius: 12px;
          }
          .pdp-certificate-desc {
            font-size: 0.82rem;
          }
          .pdp-seo-description {
            padding: 1rem;
            border-radius: 12px;
          }
          .pdp-seo-description p {
            font-size: 0.82rem;
          }
          .pdp-specs, .pdp-price-section {
            padding: 1rem;
            border-radius: 10px;
          }
          .pdp-specs-table {
            font-size: 0.85rem;
          }
          .pdp-specs-table th {
            width: 40%;
            padding: 0.4rem 0.5rem;
          }
          .pdp-specs-table td {
            padding: 0.4rem 0.5rem;
          }
          .pdp-price-table {
            font-size: 0.8rem;
          }
          .pdp-price-table thead th {
            padding: 0.5rem;
            font-size: 0.75rem;
          }
          .pdp-price-table tbody td {
            padding: 0.5rem;
          }
          .pdp-related {
            padding: 1rem;
            border-radius: 12px;
          }
          .pdp-related-grid {
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }
          .pdp-related-card {
            flex-direction: column;
            text-align: center;
            padding: 0.6rem;
          }
          .pdp-related-card img {
            width: 48px !important;
            height: 48px !important;
          }
          .pdp-related-info {
            align-items: center;
          }
          .pdp-related-name {
            font-size: 0.75rem;
          }
          .pdp-related-price {
            font-size: 0.7rem;
          }
        }

        /* ===== Very small screens (360px and below) ===== */
        @media (max-width: 360px) {
          .pdp-wrap {
            padding: 65px 8px 30px;
          }
          .pdp-product-name {
            font-size: 1.1rem;
          }
          .pdp-related-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
