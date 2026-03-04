#!/bin/bash
# ═══════════════════════════════════════════════════
# 미니볼트 택배 자동 접수 - cron 설정 스크립트
#
# 사용법:
#   chmod +x setup-cron.sh
#   ./setup-cron.sh          # 매일 12시 cron 등록
#   ./setup-cron.sh remove   # cron 제거
# ═══════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_PATH=$(which node)
CRON_COMMENT="# minibolt-auto-delivery"
LOG_FILE="$SCRIPT_DIR/cron.log"

# 실행할 명령어
CRON_CMD="cd $SCRIPT_DIR && $NODE_PATH index.js >> $LOG_FILE 2>&1"
# 매일 12시 (정오)
CRON_SCHEDULE="0 12 * * *"
CRON_LINE="$CRON_SCHEDULE $CRON_CMD $CRON_COMMENT"

if [ "$1" = "remove" ]; then
  echo "🗑️  cron 작업 제거 중..."
  crontab -l 2>/dev/null | grep -v "minibolt-auto-delivery" | crontab -
  echo "✅ cron 작업이 제거되었습니다."
  exit 0
fi

echo "═══════════════════════════════════════════════"
echo "🕐 미니볼트 택배 자동 접수 cron 설정"
echo "═══════════════════════════════════════════════"
echo ""
echo "  스크립트 위치: $SCRIPT_DIR"
echo "  Node.js 경로: $NODE_PATH"
echo "  실행 시간: 매일 12:00 (정오)"
echo "  로그 파일: $LOG_FILE"
echo ""

# 기존 cron에서 minibolt 항목 제거 후 새로 추가
(crontab -l 2>/dev/null | grep -v "minibolt-auto-delivery"; echo "$CRON_LINE") | crontab -

echo "✅ cron 작업이 등록되었습니다!"
echo ""
echo "📋 현재 cron 목록:"
crontab -l 2>/dev/null | grep "minibolt"
echo ""
echo "💡 참고:"
echo "  - 로그 확인: tail -f $LOG_FILE"
echo "  - cron 제거: ./setup-cron.sh remove"
echo "  - 수동 실행: cd $SCRIPT_DIR && node index.js"
echo ""
echo "⚠️  중요: 매일 12시 전에 스마트스토어에서 주문 엑셀을"
echo "   $SCRIPT_DIR/orders.xlsx 로 다운받아 놓아야 합니다!"
echo "   (또는 .env에서 ORDER_EXCEL_PATH를 다운로드 폴더로 지정)"
