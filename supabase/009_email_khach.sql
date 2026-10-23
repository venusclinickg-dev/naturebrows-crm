-- ═══════════════════════════════════════════════════════════════════════════
-- 009 — EMAIL KHÁCH (chuẩn bị cho email marketing)
-- Chạy SAU 001 và 003. Dán lại nhiều lần không sao.
--
-- Để cột RỖNG chứ không bịa: email sai thì thư đi lạc người, và gửi hàng loạt vào
-- địa chỉ sai là đường nhanh nhất để tên miền của tiệm bị đánh dấu spam.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE zalo_bridge_contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE fb_contacts          ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_zbc_email ON zalo_bridge_contacts (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fbc_email ON fb_contacts (email) WHERE email IS NOT NULL;
