-- ═══════════════════════════════════════════════════════════════════════════
-- 007 — ẢNH ĐẠI DIỆN KHÁCH ZALO
-- Chạy SAU 001. Dán lại nhiều lần không sao.
--
-- Vì sao cần: hộp thư chỉ hiện chữ cái đầu ("TH", "MI") nên chủ tiệm phải đọc tên
-- mới biết ai — mà khách Zalo hay đặt tên kiểu "Min", "Vy", "Mir" trùng nhau liên tục.
-- Nhìn mặt nhận ra người nhanh hơn đọc chữ nhiều lần.
--
-- Chỉ lưu ĐƯỜNG DẪN ảnh trên CDN Zalo, KHÔNG tải ảnh về: ảnh khách là dữ liệu cá nhân,
-- giữ bản sao trong kho của tiệm là ôm thêm trách nhiệm mà không được gì.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE zalo_bridge_contacts ADD COLUMN IF NOT EXISTS anh TEXT;
