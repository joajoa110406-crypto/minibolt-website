#!/usr/bin/env node
/**
 * 미니볼트 택배 자동 접수 스크립트
 *
 * 사용법:
 *   node index.js                    # .env의 ORDER_EXCEL_PATH 파일 사용
 *   node index.js ./주문목록.xlsx      # 직접 파일 지정
 *   node index.js --dry-run           # 실제 제출 없이 테스트
 *   node index.js --debug             # 폼 필드 분석 모드
 *
 * 흐름:
 *   1. 스마트스토어에서 다운받은 주문 엑셀 읽기
 *   2. CVSnet 로그인
 *   3. 각 주문별 택배 예약 등록
 *   4. 결과 리포트 출력
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { parseOrders } = require('./parse-orders');
const { CvsnetAutomation } = require('./cvsnet-register');

// ─── 설정 로드 ───
function loadConfig() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const debug = args.includes('--debug');
  const excelArg = args.find(a => !a.startsWith('--'));

  const config = {
    // CVSnet 로그인
    cvsnetId: process.env.CVSNET_ID,
    cvsnetPw: process.env.CVSNET_PW,

    // 보내는 사람: CVSnet 회원정보에 이미 등록되어 있으면 true
    senderPrefilled: process.env.SENDER_PREFILLED === 'true',
    sender: {
      name: process.env.SENDER_NAME || '',
      phone: process.env.SENDER_PHONE || '',
      zipcode: process.env.SENDER_ZIPCODE || '',
      address: process.env.SENDER_ADDRESS || '',
      addressDetail: process.env.SENDER_ADDRESS_DETAIL || '',
    },

    // 물품
    productName: process.env.PRODUCT_NAME || '마이크로스크류',
    productWeight: process.env.PRODUCT_WEIGHT || '1',

    // 엑셀 파일
    excelPath: excelArg || process.env.ORDER_EXCEL_PATH || './orders.xlsx',

    // 옵션
    headless: process.env.HEADLESS !== 'false',
    dryRun,
    debug,
    screenshotDir: path.join(__dirname, 'screenshots'),
  };

  return config;
}

// ─── 설정 검증 ───
function validateConfig(config) {
  const errors = [];

  if (!config.cvsnetId) errors.push('CVSNET_ID가 설정되지 않았습니다.');
  if (!config.cvsnetPw) errors.push('CVSNET_PW가 설정되지 않았습니다.');
  // 보내는 사람 정보가 CVSnet에 이미 등록되어 있으면 체크 건너뜀
  if (!config.senderPrefilled) {
    if (!config.sender.name) errors.push('SENDER_NAME이 설정되지 않았습니다.');
    if (!config.sender.phone) errors.push('SENDER_PHONE이 설정되지 않았습니다.');
    if (!config.sender.address) errors.push('SENDER_ADDRESS가 설정되지 않았습니다.');
  }

  if (!fs.existsSync(path.resolve(config.excelPath))) {
    errors.push(`엑셀 파일을 찾을 수 없습니다: ${config.excelPath}`);
  }

  if (errors.length > 0) {
    console.error('\n❌ 설정 오류:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('\n💡 .env 파일을 확인하세요. (.env.example 참고)\n');
    process.exit(1);
  }
}

// ─── 결과 리포트 ───
function printReport(results) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 택배 접수 결과 리포트');
  console.log('═'.repeat(60));

  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`  총 ${results.length}건 | ✅ 성공 ${success.length}건 | ❌ 실패 ${failed.length}건`);
  console.log('─'.repeat(60));

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    const tracking = r.trackingNo ? ` | 운송장: ${r.trackingNo}` : '';
    const error = r.error ? ` | 오류: ${r.error}` : '';
    console.log(`  ${icon} #${r.index} ${r.recipientName}${tracking}${error}`);
  });

  console.log('═'.repeat(60));

  // 결과 JSON 저장
  const reportPath = path.join(__dirname, `report-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n📁 상세 리포트 저장됨: ${reportPath}`);
}

// ─── 메인 실행 ───
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 미니볼트 택배 자동 접수 시작');
  console.log(`📅 ${new Date().toLocaleString('ko-KR')}`);
  console.log('═'.repeat(60));

  const config = loadConfig();

  if (config.dryRun) {
    console.log('🧪 [DRY RUN 모드] 실제 택배 접수는 하지 않습니다.\n');
  }

  // 설정 검증
  validateConfig(config);

  // 1. 엑셀 파싱
  const orders = parseOrders(config.excelPath);
  if (orders.length === 0) {
    console.log('⚠️  처리할 주문이 없습니다. 종료합니다.');
    return;
  }

  // 2. CVSnet 자동화 시작
  const cvs = new CvsnetAutomation(config);
  const results = [];

  try {
    await cvs.init();
    await cvs.login();

    // 디버그 모드: 폼 필드 분석만 수행
    if (config.debug) {
      console.log('\n🔍 [디버그 모드] 예약 페이지 폼 필드 분석...');
      await cvs.page.goto('https://www.cvsnet.co.kr/reservation-inquiry/domestic/index.do', {
        waitUntil: 'networkidle2',
      });
      const { wait } = require('./cvsnet-register');
      await new Promise(r => setTimeout(r, 2000));
      await cvs.debugFormFields();
      await cvs.screenshot('debug-form');
      console.log('\n💡 위 필드 정보를 참고하여 cvsnet-register.js의 셀렉터를 조정하세요.');
      await cvs.close();
      return;
    }

    // 3. 각 주문 처리
    for (const order of orders) {
      try {
        const result = await cvs.registerDelivery(order, config.sender);
        results.push({ ...result, index: order.index, recipientName: order.recipientName });
      } catch (err) {
        console.error(`  ❌ 주문 #${order.index} 실패: ${err.message}`);
        results.push({
          success: false,
          index: order.index,
          recipientName: order.recipientName,
          orderNo: order.orderNo,
          error: err.message,
        });
        // 실패해도 다음 주문 계속 처리
        await cvs.screenshot(`error-${order.index}`);
      }
    }
  } catch (err) {
    console.error(`\n💥 치명적 오류: ${err.message}`);
  } finally {
    await cvs.close();
  }

  // 4. 결과 리포트
  if (results.length > 0) {
    printReport(results);
  }
}

main().catch(err => {
  console.error('💥 예상치 못한 오류:', err);
  process.exit(1);
});
