/**
 * 재고 초기화 스크립트
 * products.json의 stock 필드를 product_stock 테이블에 INSERT
 *
 * 실행: npx tsx scripts/migrate-stock.ts
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

interface ProductEntry {
  id: string;
  stock: number;
  name: string;
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
  const products: ProductEntry[] = JSON.parse(raw);

  console.log(`총 ${products.length}개 제품의 재고를 마이그레이션합니다.`);

  // 배치 처리 (100개씩)
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const rows = batch.map((p) => ({
      product_id: p.id,
      current_stock: p.stock ?? 0,
    }));

    const { error } = await supabase
      .from('product_stock')
      .upsert(rows, { onConflict: 'product_id' });

    if (error) {
      console.error(`배치 ${i / BATCH_SIZE + 1} 오류:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    // 진행 상황 표시
    const progress = Math.min(i + BATCH_SIZE, products.length);
    process.stdout.write(`\r진행: ${progress}/${products.length}`);
  }

  console.log('\n');
  console.log('=== 마이그레이션 완료 ===');
  console.log(`성공: ${inserted}개`);
  console.log(`오류: ${errors}개`);
  if (skipped > 0) console.log(`건너뜀: ${skipped}개`);
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
