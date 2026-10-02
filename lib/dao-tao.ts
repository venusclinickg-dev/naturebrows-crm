/**
 * MẢNG ĐÀO TẠO — phần THUẦN (không đụng CSDL, không đụng mảng khác).
 * Client component nhập được file này; phần hỏi CSDL nằm ở `dao-tao-server.ts`.
 *
 * Luật biên của repo: mảng này KHÔNG nhập gì từ `don-hang*`, `lich*`, `hop-thu-zalo*`.
 * Thứ dùng chung lấy ở `@/lib/chung`. `docTien` dưới đây CỐ Ý là bản riêng của mảng
 * đào tạo (giống luật đọc tiền của mảng đơn hàng) — chép một hàm nhỏ còn hơn để hai
 * mảng chọc vào ruột nhau; bài kiểm `scripts/kiem/dao-tao.mjs` canh cho nó không trôi.
 */

export type TrangThaiLop = "sap-mo" | "dang-hoc" | "da-xong" | "huy";
export type TrangThaiHV = "giu-cho" | "dang-hoc" | "hoan-thanh" | "nghi";

export type KhoaHoc = {
  id: string;
  ten: string;
  hocPhi: number;
  soBuoi: number | null;
  moTa: string | null;
  hien: boolean;
};

export type LopHoc = {
  id: string;
  khoaHocId: string | null;
  khoaHoc: string | null;     // tên khoá, đã nối sẵn để màn hình khỏi hỏi lần hai
  ten: string;
  khaiGiang: string | null;   // YYYY-MM-DD
  giangVien: string | null;
  diaDiem: string | null;
  siSoToiDa: number | null;
  trangThai: TrangThaiLop;
  ghiChu: string | null;
  /** Số học viên đã ghi danh (không tính người đã nghỉ). */
  siSo: number;
};

export type HocVien = {
  id: string;
  hoTen: string;
  sdt: string | null;
  sdtNorm: string | null;
  email: string | null;
  nguon: string | null;
  ghiChu: string | null;
};

export type GhiDanh = {
  id: string;
  lopHocId: string;
  hocVienId: string;
  hoTen: string;
  sdt: string | null;
  hocPhi: number;
  giamGia: number;
  daTra: number;
  trangThai: TrangThaiHV;
  ngayGhiDanh: string | null;
  ghiChu: string | null;
};

export type LanThu = {
  id: string;
  ghiDanhId: string;
  soTien: number;
  ngay: string | null;
  hinhThuc: string | null;
  nguoiThu: string | null;
  ghiChu: string | null;
};

export type BuoiHoc = {
  id: string;
  lopHocId: string;
  ngay: string;
  batDau: string | null;
  ketThuc: string | null;
  chuDe: string | null;
};

/* ------------------------------------------------------------- SỐ TIỀN */

/**
 * Đọc số tiền gõ tay: "15tr", "15 triệu", "1tr5", "500k", "15.000.000" đều hiểu.
 *
 * LUẬT CỐ Ý, đừng "cải tiến" thành đoán hộ: số TRẦN là số tiền ĐÚNG như gõ.
 * "350" = 350 đồng, KHÔNG tự hiểu thành 350.000 — màn nhập in lại số đã hiểu ngay
 * dưới ô để người gõ thấy sai là sửa. Đoán hộ thì sai âm thầm, mà học phí sai âm thầm
 * là mất tiền thật.
 *
 * Trả `null` khi không đọc nổi — nơi gọi phải báo lỗi, KHÔNG được quy về 0
 * (0 là một số tiền hợp lệ: học viên được tặng khoá).
 */
export function docTien(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  let s = String(v ?? "").toLowerCase().trim();
  if (!s) return null;
  s = s.replace(/\s|đ|vnd|₫/g, "");
  if (!s) return null;

  // Cụm DÀI đặt trước cụm NGẮN, nếu không "tr" nuốt mất "trieu".
  const NHAN: [RegExp, number][] = [
    [/^(.*?)(?:triệu|trieu|tr|m)(.*)$/, 1_000_000],
    [/^(.*?)(?:nghìn|nghin|ngàn|ngan|ng|k)(.*)$/, 1_000],
  ];
  for (const [re, he] of NHAN) {
    const m = s.match(re);
    if (!m) continue;
    const g = soTho(m[1]);
    if (g === null) return null;
    const duoi = m[2];
    // "1tr5" = 1,5 triệu: phần sau hậu tố là PHẦN LẺ của bậc đó, không cộng thẳng.
    if (duoi) {
      if (!/^\d+$/.test(duoi)) return null;
      return Math.round(g * he + Number("0." + duoi) * he);
    }
    return Math.round(g * he);
  }
  return soTho(s) === null ? null : Math.round(soTho(s)!);
}

/** "1.500.000" · "1,5" · "15" -> số. Trả null nếu còn ký tự lạ. */
function soTho(s: string): number | null {
  if (!s) return null;
  let t = s.trim();
  if (!/^[0-9.,]+$/.test(t)) return null;
  const phay = t.lastIndexOf(","), cham = t.lastIndexOf(".");
  const cuoi = Math.max(phay, cham);
  if (cuoi >= 0) {
    const sauCung = t.slice(cuoi + 1);
    // 3 chữ số sau dấu = dấu NGHÌN kiểu Việt ("1.500.000"); khác đi là dấu THẬP PHÂN ("1,5").
    if (sauCung.length === 3) t = t.replace(/[.,]/g, "");
    else t = t.replace(/[.,]/g, (c, i) => (i === cuoi ? "." : ""));
  }
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* ------------------------------------------------------------ HỌC PHÍ */

/** Số phải thu của một ghi danh = học phí − giảm giá (không âm). */
export function phaiThu(g: { hocPhi: number; giamGia: number }): number {
  return Math.max(0, Math.round((g.hocPhi || 0) - (g.giamGia || 0)));
}

/** Còn nợ bao nhiêu. Trả số ÂM nghĩa là thu dư — hiện ra để kế toán biết mà trả lại. */
export function conLai(g: { hocPhi: number; giamGia: number; daTra: number }): number {
  return phaiThu(g) - Math.round(g.daTra || 0);
}

export type TinhTrangTien = "chua-dong" | "con-no" | "du" | "thu-du";

/**
 * Tình trạng học phí. Tách "chưa đóng" khỏi "còn nợ" vì hai việc khác nhau:
 * người chưa đóng đồng nào thì gọi điện nhắc, người còn thiếu đợt cuối thì nhắc kiểu khác.
 */
export function tinhTrangTien(g: { hocPhi: number; giamGia: number; daTra: number }): TinhTrangTien {
  const con = conLai(g);
  if (con < 0) return "thu-du";
  if (con === 0) return "du";
  return (g.daTra || 0) <= 0 ? "chua-dong" : "con-no";
}

export const NHAN_TIEN: Record<TinhTrangTien, string> = {
  "chua-dong": "Chưa đóng",
  "con-no": "Còn thiếu",
  "du": "Đủ",
  "thu-du": "Thu dư",
};

export const NHAN_TRANG_THAI_HV: Record<TrangThaiHV, string> = {
  "giu-cho": "Giữ chỗ",
  "dang-hoc": "Đang học",
  "hoan-thanh": "Hoàn thành",
  "nghi": "Nghỉ",
};

export const NHAN_TRANG_THAI_LOP: Record<TrangThaiLop, string> = {
  "sap-mo": "Sắp mở",
  "dang-hoc": "Đang học",
  "da-xong": "Đã xong",
  "huy": "Huỷ",
};

/* --------------------------------------------------------- TỔNG KẾT LỚP */

export type TongKetLop = {
  siSo: number;
  phaiThu: number;
  daThu: number;
  conThieu: number;
  soNguoiConNo: number;
};

export function tongKetLop(ds: Array<{ hocPhi: number; giamGia: number; daTra: number; trangThai: TrangThaiHV }>): TongKetLop {
  // Người đã nghỉ vẫn tính tiền đã thu (tiền đã vào két là có thật), nhưng KHÔNG tính
  // vào "phải thu" nữa — nếu không thì tháng nào cũng có một khoản nợ ma không ai đòi được.
  let phai = 0, thu = 0, no = 0, si = 0;
  for (const g of ds) {
    const dathu = Math.round(g.daTra || 0);
    thu += dathu;
    if (g.trangThai === "nghi") continue;
    si++;
    const p = phaiThu(g);
    phai += p;
    if (p - dathu > 0) no++;
  }
  return { siSo: si, phaiThu: phai, daThu: thu, conThieu: Math.max(0, phai - thu), soNguoiConNo: no };
}

/* ----------------------------------------------------------- ĐIỂM DANH */

/**
 * Tỷ lệ đi học, 0–100. Trả `null` khi CHƯA có buổi nào đã điểm danh —
 * hiện "chưa đo được" chứ không hiện 0% (0% đọc thành "cả lớp bỏ học").
 */
export function tyLeDiHoc(coMat: number, tongLuot: number): number | null {
  if (!tongLuot || tongLuot <= 0) return null;
  return Math.round((coMat / tongLuot) * 100);
}

/** Tháng YYYY-MM của một ngày YYYY-MM-DD. */
export function thangCua(ngay: string): string {
  return /^\d{4}-\d{2}/.test(ngay) ? ngay.slice(0, 7) : "";
}

/** Khoảng ngày đầu–cuối của tháng YYYY-MM. Trả null nếu tháng không hợp lệ. */
export function khoangThang(thang: string): { tu: string; den: string } | null {
  if (!/^\d{4}-\d{2}$/.test(thang)) return null;
  const [y, m] = thang.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  const cuoi = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { tu: `${thang}-01`, den: `${thang}-${String(cuoi).padStart(2, "0")}` };
}
