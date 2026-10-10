-- ═══════════════════════════════════════════════════════════════════════════
-- 008 — BẬT/TẮT BOT RIÊNG TỪNG KÊNH + BOT BIẾT TRẢ LỜI VỀ SỰ KIỆN
-- Chạy SAU 003. Dán lại nhiều lần không sao.
--
-- VÌ SAO TÁCH NÚT BẬT THEO KÊNH:
-- Một nút chung cho cả Zalo lẫn Facebook là cái bẫy. Facebook còn đang chờ Meta
-- duyệt nên chỉ quản trị viên nhắn được — bật thoải mái để thử. Nhưng Zalo đã nối
-- nick thật với hàng trăm khách thật: bật nhầm là bot nhắn thẳng cho khách. Hai
-- mức rủi ro khác hẳn nhau thì không được chung một công tắc.
--
-- VÌ SAO `bot_su_kien` LÀ MỘT Ô CHỮ CHỦ TIỆM TỰ SỬA:
-- Nhồi thông tin sự kiện vào mã thì đổi ngày, đổi giá vé, hết vé... đều phải sửa
-- mã rồi deploy lại. Để ở đây thì chủ tiệm sửa trong 10 giây. Ô TRỐNG = bot IM và
-- gọi người thật, KHÔNG bịa — đúng luật cũ của bot này.
-- ═══════════════════════════════════════════════════════════════════════════

-- Kế thừa trạng thái của nút cũ để không vô tình bật bot lên khi chạy migration.
INSERT INTO config (key, value, description)
SELECT 'bot_bat_fb', COALESCE((SELECT value FROM config WHERE key = 'bot_bat'), '0'),
       'Bot trả lời tự động trên FACEBOOK: 1 = bật, 0 = tắt'
WHERE NOT EXISTS (SELECT 1 FROM config WHERE key = 'bot_bat_fb');

INSERT INTO config (key, value, description)
SELECT 'bot_bat_zalo', COALESCE((SELECT value FROM config WHERE key = 'bot_bat'), '0'),
       'Bot trả lời tự động trên ZALO: 1 = bật, 0 = tắt'
WHERE NOT EXISTS (SELECT 1 FROM config WHERE key = 'bot_bat_zalo');

INSERT INTO config (key, value, description) VALUES
  ('bot_su_kien', '', 'Thông tin sự kiện/workshop bot đọc khi khách hỏi. Để TRỐNG thì bot im và gọi người thật.')
ON CONFLICT (key) DO NOTHING;
