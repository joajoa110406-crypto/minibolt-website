/**
 * CVSnet (GS Postbox) 택배 예약 자동화
 * - Puppeteer로 cvsnet.co.kr에 로그인
 * - 국내택배 예약 페이지에서 발송/수취인 정보 입력
 * - 예약 완료 후 운송장번호 반환
 */
const puppeteer = require('puppeteer');

const CVSNET_BASE = 'https://www.cvsnet.co.kr';
const URLS = {
  login: `${CVSNET_BASE}/member/login/index.do`,
  reservation: `${CVSNET_BASE}/reservation-inquiry/domestic/index.do`,
  myReservations: `${CVSNET_BASE}/my-page/reservation/list.do`,
};

// 페이지 대기 유틸
const wait = (ms) => new Promise(r => setTimeout(r, ms));

class CvsnetAutomation {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
  }

  /**
   * 브라우저 시작
   */
  async init() {
    const headless = this.config.headless !== false;
    console.log(`🌐 브라우저 시작 (headless: ${headless})`);

    this.browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1280,900',
      ],
      defaultViewport: { width: 1280, height: 900 },
    });

    this.page = await this.browser.newPage();

    // 타임아웃 설정
    this.page.setDefaultTimeout(30000);
    this.page.setDefaultNavigationTimeout(30000);
  }

  /**
   * CVSnet 로그인
   */
  async login() {
    const { cvsnetId, cvsnetPw } = this.config;
    console.log(`🔐 CVSnet 로그인 중... (ID: ${cvsnetId})`);

    await this.page.goto(URLS.login, { waitUntil: 'networkidle2' });
    await wait(1000);

    // 로그인 폼 찾기 & 입력
    // CVSnet 로그인 페이지의 입력 필드 (실제 셀렉터는 사이트 구조에 따라 조정 필요)
    const idSelectors = ['input[name="userId"]', 'input[name="id"]', '#userId', '#id', 'input[type="text"]'];
    const pwSelectors = ['input[name="userPw"]', 'input[name="password"]', '#userPw', '#password', 'input[type="password"]'];

    const idInput = await this.findElement(idSelectors);
    const pwInput = await this.findElement(pwSelectors);

    if (!idInput || !pwInput) {
      // 스크린샷 저장 후 에러
      await this.screenshot('login-page');
      throw new Error('로그인 폼을 찾을 수 없습니다. login-page.png 스크린샷을 확인하세요.');
    }

    await idInput.click({ clickCount: 3 });
    await idInput.type(cvsnetId, { delay: 50 });
    await pwInput.click({ clickCount: 3 });
    await pwInput.type(cvsnetPw, { delay: 50 });

    // 로그인 버튼 클릭
    const loginBtnSelectors = ['button[type="submit"]', '.btn-login', 'a.btn-login', 'input[type="submit"]'];
    const loginBtn = await this.findElement(loginBtnSelectors);
    if (loginBtn) {
      await loginBtn.click();
    } else {
      await this.page.keyboard.press('Enter');
    }

    await this.page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await wait(2000);

    // 로그인 성공 확인
    const currentUrl = this.page.url();
    const isLoggedIn = !currentUrl.includes('/login');
    if (isLoggedIn) {
      console.log('✅ 로그인 성공');
    } else {
      await this.screenshot('login-failed');
      throw new Error('로그인 실패 - login-failed.png 스크린샷을 확인하세요. ID/PW를 확인하세요.');
    }
  }

  /**
   * 국내택배 예약 1건 등록
   */
  async registerDelivery(order, sender) {
    console.log(`\n📦 택배 예약 등록 #${order.index}: ${order.recipientName} (${order.address})`);

    // 예약 페이지 이동
    await this.page.goto(URLS.reservation, { waitUntil: 'networkidle2' });
    await wait(2000);
    await this.screenshot(`reservation-page-${order.index}`);

    // ── 1) 보내는 사람 정보 (회원 정보에서 자동으로 채워지면 건너뜀) ──
    if (this.config.senderPrefilled) {
      console.log('  → 보내는 사람: 회원정보 자동입력 (건너뜀)');
    } else {
      console.log('  → 보내는 사람 정보 입력...');
      await this.fillSenderInfo(sender);
    }

    // ── 2) 받는 사람 정보 입력 ──
    console.log('  → 받는 사람 정보 입력...');
    await this.fillRecipientInfo(order);

    // ── 3) 물품 정보 입력 ──
    console.log('  → 물품 정보 입력...');
    await this.fillProductInfo(order);

    // ── 4) 예약 제출 ──
    if (this.config.dryRun) {
      console.log('  🧪 [DRY RUN] 실제 제출 건너뜀');
      await this.screenshot(`dry-run-${order.index}`);
      return { success: true, trackingNo: 'DRY-RUN', orderNo: order.orderNo };
    }

    console.log('  → 예약 제출 중...');
    const result = await this.submitReservation(order);
    return result;
  }

  /**
   * 보내는 사람 정보 입력
   */
  async fillSenderInfo(sender) {
    // 보내는 사람 이름
    await this.clearAndType(
      ['input[name="sndNm"]', 'input[name="senderName"]', '#sndNm', '#senderName'],
      sender.name
    );

    // 보내는 사람 연락처
    await this.clearAndType(
      ['input[name="sndTel"]', 'input[name="senderPhone"]', '#sndTel', '#senderPhone'],
      sender.phone
    );

    // 보내는 사람 우편번호 (주소 검색 필요할 수 있음)
    await this.clearAndType(
      ['input[name="sndZip"]', 'input[name="senderZipcode"]', '#sndZip'],
      sender.zipcode
    );

    // 보내는 사람 주소
    await this.clearAndType(
      ['input[name="sndAddr"]', 'input[name="senderAddress"]', '#sndAddr'],
      sender.address
    );

    // 보내는 사람 상세주소
    if (sender.addressDetail) {
      await this.clearAndType(
        ['input[name="sndAddrDtl"]', 'input[name="senderAddressDetail"]', '#sndAddrDtl'],
        sender.addressDetail
      );
    }
  }

  /**
   * 받는 사람 정보 입력
   */
  async fillRecipientInfo(order) {
    // 받는 사람 이름
    await this.clearAndType(
      ['input[name="rcvNm"]', 'input[name="receiverName"]', '#rcvNm', '#receiverName'],
      order.recipientName
    );

    // 받는 사람 연락처
    await this.clearAndType(
      ['input[name="rcvTel"]', 'input[name="receiverPhone"]', '#rcvTel', '#receiverPhone'],
      order.recipientPhone
    );

    // 받는 사람 우편번호
    if (order.zipcode) {
      await this.clearAndType(
        ['input[name="rcvZip"]', 'input[name="receiverZipcode"]', '#rcvZip'],
        order.zipcode
      );
    }

    // 받는 사람 주소
    await this.clearAndType(
      ['input[name="rcvAddr"]', 'input[name="receiverAddress"]', '#rcvAddr'],
      order.address
    );
  }

  /**
   * 물품 정보 입력
   */
  async fillProductInfo(order) {
    const productName = this.config.productName || '마이크로스크류';
    await this.clearAndType(
      ['input[name="goodsNm"]', 'input[name="productName"]', '#goodsNm'],
      productName
    );
  }

  /**
   * 예약 제출
   */
  async submitReservation(order) {
    const submitSelectors = [
      'button.btn-reservation',
      'button[type="submit"]',
      '.btn-submit',
      'a.btn-reservation',
      'button:has-text("예약")',
      'button:has-text("접수")',
    ];

    const submitBtn = await this.findElement(submitSelectors);
    if (submitBtn) {
      await submitBtn.click();
    } else {
      // 버튼을 텍스트로 찾기
      await this.page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button, a.btn, input[type="submit"]')];
        const target = buttons.find(b =>
          b.textContent.includes('예약') || b.textContent.includes('접수') || b.textContent.includes('등록')
        );
        if (target) target.click();
      });
    }

    await wait(3000);
    await this.screenshot(`submitted-${order.index}`);

    // 결과 확인 (운송장번호 추출 시도)
    const trackingNo = await this.page.evaluate(() => {
      const text = document.body.innerText;
      // 운송장번호 패턴 (숫자 10~15자리)
      const match = text.match(/운송장\s*(?:번호)?\s*[:：]?\s*(\d{10,15})/);
      return match ? match[1] : null;
    });

    if (trackingNo) {
      console.log(`  ✅ 예약 완료! 운송장번호: ${trackingNo}`);
    } else {
      console.log('  ✅ 예약 제출 완료 (운송장번호는 예약현황에서 확인하세요)');
    }

    return {
      success: true,
      trackingNo: trackingNo || '',
      orderNo: order.orderNo,
    };
  }

  // ─── 유틸리티 메서드 ───

  /**
   * 여러 셀렉터 중 존재하는 요소 찾기
   */
  async findElement(selectors) {
    for (const sel of selectors) {
      try {
        const el = await this.page.$(sel);
        if (el) return el;
      } catch {}
    }
    return null;
  }

  /**
   * 입력 필드 클리어 후 텍스트 입력
   */
  async clearAndType(selectors, text) {
    if (!text) return;
    const el = await this.findElement(selectors);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(text, { delay: 30 });
    } else {
      console.log(`    ⚠️  입력 필드를 찾을 수 없음: ${selectors[0]} (값: ${text})`);
    }
  }

  /**
   * 스크린샷 저장
   */
  async screenshot(name) {
    const dir = this.config.screenshotDir || './screenshots';
    const fs = require('fs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = `${dir}/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: filePath, fullPage: true });
    console.log(`    📸 스크린샷: ${filePath}`);
  }

  /**
   * 현재 페이지의 모든 입력 필드 정보 출력 (디버깅용)
   */
  async debugFormFields() {
    console.log('\n🔍 [디버그] 현재 페이지 폼 필드 분석:');
    const fields = await this.page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input, select, textarea')];
      return inputs.map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        className: el.className.substring(0, 50),
        visible: el.offsetParent !== null,
      }));
    });
    fields.forEach(f => {
      if (f.visible) {
        console.log(`  [${f.tag}] name="${f.name}" id="${f.id}" type="${f.type}" placeholder="${f.placeholder}"`);
      }
    });
    return fields;
  }

  /**
   * 브라우저 종료
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🌐 브라우저 종료');
    }
  }
}

module.exports = { CvsnetAutomation };
