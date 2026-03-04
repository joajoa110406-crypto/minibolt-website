/**
 * 스마트스토어 주문 엑셀 파서
 * - 엑셀 파일을 읽어 주문 데이터 배열로 반환
 * - 컬럼명 자동 감지 (여러 가지 변형 지원)
 */
const XLSX = require('xlsx');
const path = require('path');

// 스마트스토어 엑셀에서 사용될 수 있는 컬럼명 매핑
// key: 내부 필드명, value: 엑셀에서 가능한 컬럼명들
const COLUMN_ALIASES = {
  orderNo: ['주문번호', '상품주문번호', '주문 번호', 'order_no'],
  recipientName: ['수취인명', '수취인', '받는분', '받는사람', '수령인', '수령인명'],
  recipientPhone: ['수취인연락처1', '수취인연락처', '수취인 연락처', '연락처1', '받는분 연락처', '수취인전화번호'],
  recipientPhone2: ['수취인연락처2', '연락처2', '수취인 연락처2'],
  zipcode: ['우편번호', '배송지 우편번호', '수취인 우편번호', 'zipcode'],
  address: ['배송지', '배송주소', '수취인주소', '배송지주소', '기본주소'],
  addressDetail: ['상세주소', '배송지 상세주소', '나머지주소'],
  productName: ['상품명', '상품 명', '품명'],
  optionInfo: ['옵션정보', '옵션 정보', '옵션'],
  quantity: ['수량', '주문수량', '상품수량'],
  deliveryMemo: ['배송메모', '배송 메모', '배송메시지', '배송 메시지', '요청사항'],
  buyerName: ['구매자명', '구매자', '주문자명', '주문자'],
  buyerPhone: ['구매자연락처', '구매자 연락처', '주문자연락처'],
};

/**
 * 엑셀 헤더에서 내부 필드명으로 매핑
 */
function buildColumnMap(headers) {
  const map = {};
  const unmapped = [];

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = headers.find(h => aliases.includes(h?.trim()));
    if (found) {
      map[field] = found;
    }
  }

  // 필수 필드 체크
  const required = ['recipientName', 'recipientPhone', 'address'];
  const missing = required.filter(f => !map[f]);
  if (missing.length > 0) {
    console.error('\n❌ 필수 컬럼을 찾을 수 없습니다:');
    missing.forEach(f => {
      console.error(`  - ${f}: 가능한 컬럼명 → [${COLUMN_ALIASES[f].join(', ')}]`);
    });
    console.error('\n📋 엑셀 파일의 실제 헤더:', headers.join(', '));
    console.error('\n💡 parse-orders.js의 COLUMN_ALIASES에 실제 컬럼명을 추가하세요.\n');
    return null;
  }

  return map;
}

/**
 * 엑셀 파일에서 주문 데이터를 파싱
 * @param {string} filePath - 엑셀 파일 경로
 * @returns {Array} 주문 배열
 */
function parseOrders(filePath) {
  const absPath = path.resolve(filePath);
  console.log(`📂 엑셀 파일 읽는 중: ${absPath}`);

  const workbook = XLSX.readFile(absPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawData.length === 0) {
    console.log('⚠️  엑셀에 데이터가 없습니다.');
    return [];
  }

  // 헤더 매핑
  const headers = Object.keys(rawData[0]);
  console.log(`📋 감지된 컬럼 (${headers.length}개): ${headers.join(', ')}`);

  const columnMap = buildColumnMap(headers);
  if (!columnMap) {
    throw new Error('컬럼 매핑 실패 - 위의 안내를 확인하세요.');
  }

  console.log('✅ 컬럼 매핑 완료:', JSON.stringify(columnMap, null, 2));

  // 데이터 변환
  const orders = rawData.map((row, idx) => {
    const get = (field) => {
      const col = columnMap[field];
      return col ? String(row[col] || '').trim() : '';
    };

    // 주소: address + addressDetail 합치기
    let fullAddress = get('address');
    const detail = get('addressDetail');
    if (detail && !fullAddress.includes(detail)) {
      fullAddress += ' ' + detail;
    }

    return {
      index: idx + 1,
      orderNo: get('orderNo'),
      recipientName: get('recipientName'),
      recipientPhone: normalizePhone(get('recipientPhone')),
      recipientPhone2: normalizePhone(get('recipientPhone2')),
      zipcode: get('zipcode'),
      address: fullAddress,
      productName: get('productName'),
      optionInfo: get('optionInfo'),
      quantity: parseInt(get('quantity')) || 1,
      deliveryMemo: get('deliveryMemo'),
      buyerName: get('buyerName'),
      buyerPhone: normalizePhone(get('buyerPhone')),
    };
  });

  // 수취인명이 비어있는 행 제거 (빈 행 방지)
  const validOrders = orders.filter(o => o.recipientName);
  console.log(`📦 총 ${validOrders.length}건의 주문 파싱 완료\n`);

  return validOrders;
}

/**
 * 전화번호 정규화 (하이픈 추가)
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

module.exports = { parseOrders };

// 직접 실행 시 테스트
if (require.main === module) {
  const filePath = process.argv[2] || './orders.xlsx';
  try {
    const orders = parseOrders(filePath);
    orders.forEach(o => {
      console.log(`  #${o.index} ${o.recipientName} | ${o.recipientPhone} | ${o.address}`);
    });
  } catch (err) {
    console.error(err.message);
  }
}
