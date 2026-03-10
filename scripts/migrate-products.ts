/**
 * 제품 마이그레이션 스크립트
 * products.json (762개) → products 테이블로 UPSERT
 *
 * 실행: npx tsx scripts/migrate-products.ts
 *
 * 필요 환경변수 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// dotenv 없이 .env.local 직접 파싱
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn('.env.local 파일을 찾을 수 없습니다. 환경변수가 이미 설정되어 있어야 합니다.');
  }
}

loadEnv();

import { createClient } from '@supabase/supabase-js';

interface ProductJSON {
  id: string;
  name: string;
  category: string;
  sub_category: string;
  type: string;
  diameter: string;
  length: string;
  head_width: string;
  head_height: string;
  color: string;
  color_raw: string;
  stock: number;
  price_unit: number;
  price_100_block: number;
  price_1000_per: number;
  price_1000_block: number;
  price_5000_per: number;
  price_5000_block: number;
  price_floor: number;
  bulk_discount: {
    x1: number;
    x2: number;
    x3: number;
    x4_plus: number;
  };
}

interface ProductRow {
  product_id: string;
  name: string;
  category: string;
  sub_category: string;
  type: string;
  diameter: string;
  length: string;
  head_width: string | null;
  head_height: string | null;
  material: string;
  color: string;
  price_unit: number;
  price_100: number;
  price_1000_per: number;
  price_1000_block: number;
  price_5000_per: number;
  price_5000_block: number;
  price_floor: number;
  bulk_discount: Record<string, number>;
}

function mapProduct(p: ProductJSON): ProductRow {
  return {
    product_id: p.id,
    name: p.name,
    category: p.category,
    sub_category: p.sub_category || '',
    type: p.type || '',
    diameter: p.diameter || '',
    length: p.length || '',
    head_width: p.head_width || null,
    head_height: p.head_height || null,
    material: '',  // products.json에 material 필드 없음
    color: p.color || '',
    price_unit: p.price_unit,
    price_100: p.price_100_block ?? 3000,
    price_1000_per: p.price_1000_per,
    price_1000_block: p.price_1000_block,
    price_5000_per: p.price_5000_per,
    price_5000_block: p.price_5000_block,
    price_floor: p.price_floor,
    bulk_discount: p.bulk_discount ?? { x1: 0, x2: 5, x3: 8, x4_plus: 10 },
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // products.json 로드
  const productsPath = resolve(__dirname, '..', 'src', 'data', 'products.json');
  const raw = readFileSync(productsPath, 'utf-8');
  const products: ProductJSON[] = JSON.parse(raw);

  console.log(`총 ${products.length}개 제품을 products 테이블에 마이그레이션합니다.`);
  console.log('');

  // 중복 ID 체크
  const ids = products.map(p => p.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    console.warn(`주의: 중복 ID가 ${ids.length - uniqueIds.size}개 있습니다.`);
  }

  // 배치 처리 (100개씩)
  const BATCH_SIZE = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const rows = batch.map(mapProduct);

    const { error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'product_id' });

    if (error) {
      console.error(`\n배치 ${Math.floor(i / BATCH_SIZE) + 1} 오류:`, error.message);
      errors += batch.length;

      // 개별 삽입으로 재시도
      for (const row of rows) {
        const { error: singleErr } = await supabase
          .from('products')
          .upsert(row, { onConflict: 'product_id' });
        if (singleErr) {
          console.error(`  실패: ${row.product_id} - ${singleErr.message}`);
        } else {
          errors--;
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }

    // 진행 상황 표시
    const progress = Math.min(i + BATCH_SIZE, products.length);
    process.stdout.write(`\r진행: ${progress}/${products.length} (성공: ${inserted}, 오류: ${errors})`);
  }

  console.log('\n');
  console.log('=== 제품 마이그레이션 완료 ===');
  console.log(`전체: ${products.length}개`);
  console.log(`성공: ${inserted}개`);
  console.log(`오류: ${errors}개`);

  // 검증: DB에서 카운트
  const { count, error: countErr } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (!countErr && count !== null) {
    console.log(`DB 총 제품 수: ${count}개`);
  }

  // ─── 재고 데이터 마이그레이션 (product_stock) ───────────────────
  console.log('\n재고 데이터를 product_stock 테이블에 마이그레이션합니다...');

  const stockRows = products
    .filter(p => p.stock > 0)
    .map(p => ({
      product_id: p.id,
      current_stock: p.stock,
    }));

  let stockInserted = 0;
  let stockErrors = 0;

  for (let i = 0; i < stockRows.length; i += BATCH_SIZE) {
    const batch = stockRows.slice(i, i + BATCH_SIZE);

    const { error: stockErr } = await supabase
      .from('product_stock')
      .upsert(batch, { onConflict: 'product_id' });

    if (stockErr) {
      console.error(`\n재고 배치 ${Math.floor(i / BATCH_SIZE) + 1} 오류:`, stockErr.message);
      stockErrors += batch.length;
    } else {
      stockInserted += batch.length;
    }

    const progress = Math.min(i + BATCH_SIZE, stockRows.length);
    process.stdout.write(`\r재고 진행: ${progress}/${stockRows.length} (성공: ${stockInserted}, 오류: ${stockErrors})`);
  }

  console.log('\n');
  console.log('=== 재고 마이그레이션 완료 ===');
  console.log(`재고 있는 제품: ${stockRows.length}개`);
  console.log(`성공: ${stockInserted}개`);
  console.log(`오류: ${stockErrors}개`);
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
