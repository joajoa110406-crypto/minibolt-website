/**
 * 단가표수정완.js → products.json 변환 스크립트
 * 실행: node scripts/convert-data.js
 */

const fs = require('fs');
const path = require('path');

// 단가표수정완.js 로드
const srcFile = path.join(__dirname, '..', '단가표수정완.js');
const src = fs.readFileSync(srcFile, 'utf8');

eval(src.replace('const productData', 'global.productData'));
const raw = global.productData;

// head_width 자동 채우기 규칙 (마스터플랜 Section 2.3)
// 마이크로스크류/평머리 공통 기본규격
const microSpec = {
  '1.2': { head_width: '2.0', head_height: '0.5' },
  '1.4': { head_width: '2.5', head_height: '0.6' },
  '1.6': { head_width: '3.0', head_height: '0.6' },
  '1.7': { head_width: '3.0', head_height: '0.6' },
  '2.0': { head_width: '3.0', head_height: '0.8' },
  '2':   { head_width: '3.0', head_height: '0.8' },
};

const headSpecs = {
  바인드헤드: {
    '1.4': { head_width: '2.6', head_height: '0.8' },
    '1.6': { head_width: '3.0', head_height: '0.9' },
    '1.7': { head_width: '3.2', head_height: '1.0' },
    '2.0': { head_width: '3.8', head_height: '1.2' },
    '2':   { head_width: '3.8', head_height: '1.2' },
    '2.3': { head_width: '4.2', head_height: '1.3' },
    '2.6': { head_width: '5.0', head_height: '1.5' },
    '3.0': { head_width: '5.5', head_height: '1.8' },
    '3':   { head_width: '5.5', head_height: '1.8' },
    '4.0': { head_width: '7.0', head_height: '2.3' },
    '4':   { head_width: '7.0', head_height: '2.3' },
  },
  팬헤드: {
    '1.4': { head_width: '2.6', head_height: '1.0' },
    '1.6': { head_width: '3.0', head_height: '1.2' },
    '1.7': { head_width: '3.2', head_height: '1.3' },
    '2.0': { head_width: '4.0', head_height: '1.6' },
    '2':   { head_width: '4.0', head_height: '1.6' },
    '2.3': { head_width: '4.5', head_height: '1.8' },
    '2.6': { head_width: '5.0', head_height: '2.0' },
    '3.0': { head_width: '5.5', head_height: '2.2' },
    '3':   { head_width: '5.5', head_height: '2.2' },
    '4.0': { head_width: '8.0', head_height: '3.0' },
    '4':   { head_width: '8.0', head_height: '3.0' },
  },
  플랫헤드: {
    '1.4': { head_width: '2.6', head_height: '0.7' },
    '1.5': { head_width: '2.8', head_height: '0.75' },
    '1.6': { head_width: '3.0', head_height: '0.8' },
    '1.7': { head_width: '3.2', head_height: '0.85' },
    '2.0': { head_width: '3.8', head_height: '1.1' },
    '2':   { head_width: '3.8', head_height: '1.1' },
    '2.3': { head_width: '4.2', head_height: '1.2' },
    '2.6': { head_width: '5.0', head_height: '1.5' },
    '3.0': { head_width: '5.5', head_height: '1.7' },
    '3':   { head_width: '5.5', head_height: '1.7' },
    '4.0': { head_width: '8.0', head_height: '2.4' },
    '4':   { head_width: '8.0', head_height: '2.4' },
  },
  마이크로스크류: microSpec,
  평머리: microSpec,
};

// productData의 키 순서대로 순회
const rawKeys = ['바인드헤드', '팬헤드', '플랫헤드', '마이크로스크류', '평머리', '기타'];

let totalFilled = 0;
let totalProducts = 0;
const allProducts = [];
const stats = {};

for (const key of rawKeys) {
  const items = raw[key] || [];
  stats[key] = { count: items.length, filled: 0 };

  for (const item of items) {
    totalProducts++;
    const product = { ...item };

    // 기타 카테고리는 category/sub_category가 비어있으므로 key로 채움
    if (!product.category) product.category = '기타';

    // head_width/head_height 자동 채우기
    if (!product.head_width || !product.head_height) {
      const specs = headSpecs[key];
      if (specs) {
        const match = specs[product.diameter];
        if (match) {
          if (!product.head_width) product.head_width = match.head_width;
          if (!product.head_height) product.head_height = match.head_height;
          totalFilled++;
          stats[key].filled++;
        }
      }
    }

    allProducts.push(product);
  }
}

// 저장
const dataDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(
  path.join(dataDir, 'products.json'),
  JSON.stringify(allProducts, null, 2),
  'utf8'
);

console.log('✅ 변환 완료');
console.log(`   총 제품: ${totalProducts}개`);
console.log(`   head_width 자동 채움: ${totalFilled}개`);
console.log(`   저장 위치: src/data/products.json`);
console.log('');
console.log('카테고리별 통계:');
for (const [key, s] of Object.entries(stats)) {
  console.log(`   ${key}: ${s.count}개 (head 채움: ${s.filled}개)`);
}
