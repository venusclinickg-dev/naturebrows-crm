#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# GỌI LỆNH QUÉT BOT ZALO trên web, mỗi 2 phút một lượt (launchd gọi).
#
# Vì sao phải có: Zalo không có webhook — máy chủ web KHÔNG tự biết khách vừa nhắn.
# Bot Zalo chỉ chạy khi có người gõ lệnh quét. Thiếu việc này thì bot bật trong cài
# đặt vẫn im như thóc, mà màn hình không báo gì cả (đã gặp thật: chủ tiệm bật bot,
# chờ mãi không thấy trả lời).
#
# Mất mạng thì curl trượt, lần sau launchd gọi lại — không cần xử lý gì thêm.
# ─────────────────────────────────────────────────────────────────────────────
set -u
GOC="/Users/dohuong/naturebrows-crm"
KEY=$(grep -m1 '^BOT_QUET_KEY=' "$GOC/.env.local" | cut -d= -f2-)
WEB=$(grep -m1 '^NEXT_PUBLIC_APP_URL=' "$GOC/.env.local" | cut -d= -f2-)
WEB=${WEB:-https://naturebrows-crm.vercel.app}

if [ -z "$KEY" ]; then
  echo "$(date '+%F %T') THIEU BOT_QUET_KEY trong .env.local — bo qua luot quet"
  exit 0
fi

KQ=$(curl -s --max-time 25 -X POST "$WEB/api/bot/zalo" -H "x-bot-key: $KEY")
# Chỉ ghi nhật ký khi CÓ việc xảy ra, để file log không phình vì 720 dòng "không có ai" mỗi ngày.
case "$KQ" in
  *'"daDap":[]'*) : ;;
  *) echo "$(date '+%F %T') $KQ" ;;
esac
