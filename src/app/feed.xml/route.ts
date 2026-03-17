import { allProducts, generateProductName } from '@/lib/products';

const SITE_URL = 'https://minibolt.co.kr';
const CHANNEL_TITLE = '미니볼트 - 마이크로 스크류 전문';
const CHANNEL_DESCRIPTION =
  '미니볼트는 산업용 마이크로 스크류(바인드헤드, 팬헤드, 플랫헤드, 마이크로스크류, 평머리) 전문 온라인 쇼핑몰입니다. 100개 단위 소량 주문부터 대량 주문까지 합리적인 가격에 제공합니다.';

/** XML 특수문자 이스케이프 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 제품 설명 생성 */
function buildProductDescription(product: (typeof allProducts)[number]): string {
  const parts: string[] = [];

  if (product.category) parts.push(`카테고리: ${product.category}`);
  if (product.sub_category) parts.push(`세부: ${product.sub_category}`);
  if (product.type) parts.push(`타입: ${product.type === 'M' ? '머신(M)' : '태핑(T)'}`);
  if (product.diameter) parts.push(`직경: M${product.diameter}`);
  if (product.length) parts.push(`길이: ${product.length}mm`);
  if (product.head_width) parts.push(`헤드폭: Φ${product.head_width}`);
  if (product.head_height) parts.push(`헤드높이: ${product.head_height}t`);
  if (product.color) parts.push(`색상: ${product.color}`);
  parts.push(`100개 가격: ₩${product.price_100_block.toLocaleString()} (VAT별도)`);
  if (product.price_1000_per) {
    parts.push(`1,000개 개당: ₩${product.price_1000_per}`);
  }

  return parts.join(' | ');
}

/** RFC 822 날짜 포맷 */
function toRFC822(date: Date): string {
  return date.toUTCString();
}

export async function GET() {
  const now = new Date();
  const pubDate = toRFC822(now);

  // ── 정적 페이지 항목 ──────────────────────────────────────────
  const staticPages = [
    {
      title: '미니볼트 - 마이크로 스크류 전문 쇼핑몰',
      link: `${SITE_URL}/`,
      description: '산업용 마이크로 스크류 전문 온라인 쇼핑몰. 바인드헤드, 팬헤드, 플랫헤드, 마이크로스크류 등 다양한 제품을 합리적인 가격에 제공합니다.',
      guid: `${SITE_URL}/`,
    },
    {
      title: '전체 제품 목록 - 미니볼트',
      link: `${SITE_URL}/products`,
      description: '미니볼트의 전체 마이크로 스크류 제품 목록입니다. 카테고리별 필터링과 검색 기능을 지원합니다.',
      guid: `${SITE_URL}/products`,
    },
    {
      title: '회사 소개 - 미니볼트',
      link: `${SITE_URL}/company`,
      description: '미니볼트 회사 소개 페이지입니다. 마이크로 스크류 전문 기업으로서의 비전과 서비스를 안내합니다.',
      guid: `${SITE_URL}/company`,
    },
    {
      title: '문의하기 - 미니볼트',
      link: `${SITE_URL}/contact`,
      description: '미니볼트에 문의사항이 있으시면 연락해 주세요. 대량 주문, 맞춤 견적 등 다양한 문의를 받고 있습니다.',
      guid: `${SITE_URL}/contact`,
    },
  ];

  // ── 제품 항목 (전체 포함) ──────────────────────────────────────
  const productItems = allProducts.map((product) => {
    const name = generateProductName(product);
    const description = buildProductDescription(product);
    return {
      title: `${name} - 미니볼트`,
      link: `${SITE_URL}/products/${product.id}`,
      description,
      guid: `${SITE_URL}/products/${product.id}`,
    };
  });

  // ── RSS XML 생성 ───────────────────────────────────────────────
  const items = [...staticPages, ...productItems];

  const itemsXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
    </item>`
    )
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CHANNEL_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>
    <language>ko</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;

  return new Response(rss, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
