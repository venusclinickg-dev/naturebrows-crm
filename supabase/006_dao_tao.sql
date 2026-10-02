-- ════════════════════════════════════════════════════════════════════════════
-- 006 — MẢNG ĐÀO TẠO (học viên · lớp · học phí · điểm danh)
-- Chạy SAU 001. Dán lại nhiều lần không sao (mọi lệnh đều IF NOT EXISTS).
--
-- Vì sao tách bảng riêng mà không nhét học viên vào bảng khách của lõi:
-- khách đi làm dịch vụ và học viên đi học là hai quan hệ khác nhau với tiệm —
-- một người có thể vừa là khách vừa là học viên. Hai mảng gặp nhau ở `sdt_norm`
-- (84xxx) đúng như lịch hẹn và đơn hàng đang làm, KHÔNG khoá ngoại vào nhau.
-- ════════════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------- KHOÁ HỌC
-- Danh mục khoá (phun mày, phun môi, mí, hairstroke…). Học phí ở đây là GIÁ NIÊM YẾT;
-- giá thật của từng học viên nằm ở `ghi_danh.hoc_phi` vì gần như ai cũng có giá riêng.
CREATE TABLE IF NOT EXISTS khoa_hoc (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten         TEXT NOT NULL,
  hoc_phi     BIGINT NOT NULL DEFAULT 0,      -- đồng
  so_buoi     INT,
  mo_ta       TEXT,
  hien        BOOLEAN NOT NULL DEFAULT TRUE,  -- tắt khoá cũ mà không xoá lịch sử
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------- LỚP
-- Một khoá mở nhiều lớp (K1, K2…). Lớp mới là thứ người ta thật sự quản lý hằng ngày.
CREATE TABLE IF NOT EXISTS lop_hoc (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  khoa_hoc_id    UUID REFERENCES khoa_hoc(id) ON DELETE SET NULL,
  ten            TEXT NOT NULL,
  khai_giang     DATE,
  giang_vien     TEXT,
  dia_diem       TEXT,
  si_so_toi_da   INT,
  trang_thai     TEXT NOT NULL DEFAULT 'sap-mo'
                 CHECK (trang_thai IN ('sap-mo','dang-hoc','da-xong','huy')),
  ghi_chu        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lop_khai_giang ON lop_hoc (khai_giang DESC);

-- --------------------------------------------------------------- HỌC VIÊN
CREATE TABLE IF NOT EXISTS hoc_vien (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_ten      TEXT NOT NULL,
  sdt         TEXT,
  sdt_norm    TEXT,                 -- 84xxx — trục nối sang Zalo / đơn hàng / lịch hẹn
  email       TEXT,
  nguon       TEXT,                 -- Facebook, Zalo, giới thiệu…
  ghi_chu     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Một số điện thoại là MỘT học viên. Không chặn thì cùng một người đăng ký hai khoá
-- sẽ thành hai hồ sơ, và lịch sử học phí vỡ làm đôi.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hv_sdt_norm ON hoc_vien (sdt_norm) WHERE sdt_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hv_ten ON hoc_vien (ho_ten);

-- --------------------------------------------------------------- GHI DANH
-- Một học viên trong một lớp. Giá tiền của THƯƠNG VỤ nằm ở đây, không ở khoá học.
CREATE TABLE IF NOT EXISTS ghi_danh (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lop_hoc_id      UUID NOT NULL REFERENCES lop_hoc(id)  ON DELETE CASCADE,
  hoc_vien_id     UUID NOT NULL REFERENCES hoc_vien(id) ON DELETE CASCADE,
  hoc_phi         BIGINT NOT NULL DEFAULT 0,   -- giá chốt với học viên này
  giam_gia        BIGINT NOT NULL DEFAULT 0,
  trang_thai      TEXT NOT NULL DEFAULT 'giu-cho'
                  CHECK (trang_thai IN ('giu-cho','dang-hoc','hoan-thanh','nghi')),
  ngay_ghi_danh   DATE,
  ghi_chu         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Ghi danh trùng là nguồn gốc của "đã đóng tiền rồi mà hệ thống báo chưa".
CREATE UNIQUE INDEX IF NOT EXISTS uq_ghi_danh ON ghi_danh (lop_hoc_id, hoc_vien_id);
CREATE INDEX IF NOT EXISTS idx_gd_lop ON ghi_danh (lop_hoc_id);
CREATE INDEX IF NOT EXISTS idx_gd_hv  ON ghi_danh (hoc_vien_id);

-- ------------------------------------------------------------- THU HỌC PHÍ
-- Mỗi lần thu là MỘT dòng, không sửa đè vào cột "đã đóng" của ghi danh.
-- Học phí ngành này gần như luôn đóng làm nhiều đợt; giữ từng lần thu thì còn đối soát
-- được ai thu, thu ngày nào — ghi đè một con số thì mất sạch dấu vết.
CREATE TABLE IF NOT EXISTS thu_hoc_phi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghi_danh_id  UUID NOT NULL REFERENCES ghi_danh(id) ON DELETE CASCADE,
  so_tien      BIGINT NOT NULL CHECK (so_tien > 0),
  ngay         DATE,
  hinh_thuc    TEXT,            -- tiền mặt, chuyển khoản, thẻ…
  nguoi_thu    TEXT,
  ghi_chu      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_thp_gd   ON thu_hoc_phi (ghi_danh_id);
CREATE INDEX IF NOT EXISTS idx_thp_ngay ON thu_hoc_phi (ngay DESC);

-- ---------------------------------------------------------------- BUỔI HỌC
CREATE TABLE IF NOT EXISTS buoi_hoc (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lop_hoc_id  UUID NOT NULL REFERENCES lop_hoc(id) ON DELETE CASCADE,
  ngay        DATE NOT NULL,
  bat_dau     TIME,
  ket_thuc    TIME,
  chu_de      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_buoi ON buoi_hoc (lop_hoc_id, ngay, COALESCE(bat_dau, '00:00'::time));
CREATE INDEX IF NOT EXISTS idx_buoi_lop ON buoi_hoc (lop_hoc_id, ngay);

-- ---------------------------------------------------------------- ĐIỂM DANH
CREATE TABLE IF NOT EXISTS diem_danh (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buoi_hoc_id  UUID NOT NULL REFERENCES buoi_hoc(id) ON DELETE CASCADE,
  ghi_danh_id  UUID NOT NULL REFERENCES ghi_danh(id) ON DELETE CASCADE,
  co_mat       BOOLEAN NOT NULL DEFAULT TRUE,
  ghi_chu      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Điểm danh hai lần cho cùng một buổi thì tỷ lệ đi học sai mà không ai thấy.
CREATE UNIQUE INDEX IF NOT EXISTS uq_diem_danh ON diem_danh (buoi_hoc_id, ghi_danh_id);

-- ------------------------------------------------------------------- RLS
-- Deny-all như các mảng khác: chỉ server (service_role) đọc/ghi. Dữ liệu học viên là
-- dữ liệu cá nhân — không mở cho khoá anon dù chỉ đọc.
ALTER TABLE khoa_hoc    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lop_hoc     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hoc_vien    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghi_danh    ENABLE ROW LEVEL SECURITY;
ALTER TABLE thu_hoc_phi ENABLE ROW LEVEL SECURITY;
ALTER TABLE buoi_hoc    ENABLE ROW LEVEL SECURITY;
ALTER TABLE diem_danh   ENABLE ROW LEVEL SECURITY;
