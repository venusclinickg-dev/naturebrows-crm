import "server-only";
import { getServiceClient } from "@/lib/supabase-server";
import { chuanSdt } from "@/lib/chung";
import {
  docTien, khoangThang,
  type GhiDanh, type HocVien, type KhoaHoc, type LanThu, type LopHoc, type BuoiHoc,
  type TrangThaiHV, type TrangThaiLop,
} from "@/lib/dao-tao";

export type KetQua = { ok: true; id: string; daThu?: number; vuaThu?: number } | { ok: false; loi: string };

/* ============================================================== KHOÁ HỌC */

export async function dsKhoaHoc(): Promise<KhoaHoc[]> {
  const sb = getServiceClient();
  const { data, error } = await sb.from("khoa_hoc")
    .select("id,ten,hoc_phi,so_buoi,mo_ta,hien").order("ten");
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id, ten: r.ten, hocPhi: Number(r.hoc_phi) || 0,
    soBuoi: r.so_buoi ?? null, moTa: r.mo_ta ?? null, hien: r.hien !== false,
  }));
}

export async function themKhoaHoc(v: { ten: string; hocPhi?: unknown; soBuoi?: unknown; moTa?: string }): Promise<KetQua> {
  const ten = String(v.ten || "").trim();
  if (!ten) return { ok: false, loi: "Thiếu tên khoá học" };
  const phi = v.hocPhi === undefined || v.hocPhi === "" ? 0 : docTien(v.hocPhi);
  if (phi === null) return { ok: false, loi: "Không đọc được học phí" };
  const sb = getServiceClient();
  const { data, error } = await sb.from("khoa_hoc").insert({
    ten, hoc_phi: phi,
    so_buoi: v.soBuoi === undefined || v.soBuoi === "" ? null : Number(v.soBuoi) || null,
    mo_ta: v.moTa || null,
  }).select("id").single();
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id: data.id };
}

/* =================================================================== LỚP */

export async function dsLop(): Promise<LopHoc[]> {
  const sb = getServiceClient();
  const { data, error } = await sb.from("lop_hoc")
    .select("id,khoa_hoc_id,ten,khai_giang,giang_vien,dia_diem,si_so_toi_da,trang_thai,ghi_chu,khoa_hoc(ten)")
    .order("khai_giang", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const lop = (data || []).map((r: any): LopHoc => ({
    id: r.id,
    khoaHocId: r.khoa_hoc_id ?? null,
    khoaHoc: r.khoa_hoc?.ten ?? null,
    ten: r.ten,
    khaiGiang: r.khai_giang ?? null,
    giangVien: r.giang_vien ?? null,
    diaDiem: r.dia_diem ?? null,
    siSoToiDa: r.si_so_toi_da ?? null,
    trangThai: (r.trang_thai || "sap-mo") as TrangThaiLop,
    ghiChu: r.ghi_chu ?? null,
    siSo: 0,
  }));
  if (!lop.length) return lop;

  // Sĩ số đếm một lượt cho TẤT CẢ lớp thay vì mỗi lớp một câu truy vấn:
  // 20 lớp = 20 vòng mạng thì màn danh sách chậm thấy rõ.
  const { data: gd } = await sb.from("ghi_danh").select("lop_hoc_id,trang_thai");
  const dem = new Map<string, number>();
  for (const g of gd || []) {
    if (g.trang_thai === "nghi") continue;
    dem.set(g.lop_hoc_id, (dem.get(g.lop_hoc_id) || 0) + 1);
  }
  for (const l of lop) l.siSo = dem.get(l.id) || 0;
  return lop;
}

export async function themLop(v: {
  ten: string; khoaHocId?: string | null; khaiGiang?: string | null;
  giangVien?: string | null; diaDiem?: string | null; siSoToiDa?: unknown; ghiChu?: string | null;
}): Promise<KetQua> {
  const ten = String(v.ten || "").trim();
  if (!ten) return { ok: false, loi: "Thiếu tên lớp" };
  const sb = getServiceClient();
  const { data, error } = await sb.from("lop_hoc").insert({
    ten,
    khoa_hoc_id: v.khoaHocId || null,
    khai_giang: v.khaiGiang || null,
    giang_vien: v.giangVien || null,
    dia_diem: v.diaDiem || null,
    si_so_toi_da: v.siSoToiDa === undefined || v.siSoToiDa === "" ? null : Number(v.siSoToiDa) || null,
    ghi_chu: v.ghiChu || null,
  }).select("id").single();
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id: data.id };
}

export async function suaLop(id: string, v: Partial<{ ten: string; trangThai: TrangThaiLop; khaiGiang: string | null; giangVien: string | null; diaDiem: string | null; ghiChu: string | null }>): Promise<KetQua> {
  if (!id) return { ok: false, loi: "Thiếu id lớp" };
  const p: any = {};
  if (v.ten !== undefined) p.ten = String(v.ten).trim();
  if (v.trangThai !== undefined) p.trang_thai = v.trangThai;
  if (v.khaiGiang !== undefined) p.khai_giang = v.khaiGiang || null;
  if (v.giangVien !== undefined) p.giang_vien = v.giangVien || null;
  if (v.diaDiem !== undefined) p.dia_diem = v.diaDiem || null;
  if (v.ghiChu !== undefined) p.ghi_chu = v.ghiChu || null;
  if (!Object.keys(p).length) return { ok: false, loi: "Không có gì để sửa" };
  const sb = getServiceClient();
  const { error } = await sb.from("lop_hoc").update(p).eq("id", id);
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id };
}

/* ============================================================= HỌC VIÊN */

export async function timHocVien(q: string, gioiHan = 30): Promise<HocVien[]> {
  const sb = getServiceClient();
  const s = String(q || "").trim();
  let truyVan = sb.from("hoc_vien").select("id,ho_ten,sdt,sdt_norm,email,nguon,ghi_chu").limit(gioiHan);
  if (s) {
    const so = s.replace(/[^0-9]/g, "");
    truyVan = so.length >= 3
      ? truyVan.or(`ho_ten.ilike.%${s}%,sdt.ilike.%${so}%,sdt_norm.ilike.%${so}%`)
      : truyVan.ilike("ho_ten", `%${s}%`);
  }
  const { data, error } = await truyVan.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(doHocVien);
}

function doHocVien(r: any): HocVien {
  return {
    id: r.id, hoTen: r.ho_ten || "", sdt: r.sdt ?? null, sdtNorm: r.sdt_norm ?? null,
    email: r.email ?? null, nguon: r.nguon ?? null, ghiChu: r.ghi_chu ?? null,
  };
}

/**
 * Thêm học viên — hoặc trả về người ĐÃ CÓ nếu trùng số điện thoại.
 * Cố ý không báo lỗi khi trùng: nhân viên gõ lại số cũ là chuyện bình thường,
 * và tạo hồ sơ thứ hai cho cùng một người thì lịch sử học phí vỡ làm đôi.
 */
export async function themHocVien(v: { hoTen: string; sdt?: string; email?: string; nguon?: string; ghiChu?: string }): Promise<KetQua> {
  const hoTen = String(v.hoTen || "").trim();
  if (!hoTen) return { ok: false, loi: "Thiếu họ tên học viên" };
  const norm = chuanSdt(v.sdt);
  const sb = getServiceClient();

  if (norm) {
    const { data: cu } = await sb.from("hoc_vien").select("id").eq("sdt_norm", norm).maybeSingle();
    if (cu?.id) return { ok: true, id: cu.id };
  }
  const { data, error } = await sb.from("hoc_vien").insert({
    ho_ten: hoTen, sdt: v.sdt || null, sdt_norm: norm,
    email: v.email || null, nguon: v.nguon || null, ghi_chu: v.ghiChu || null,
  }).select("id").single();
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id: data.id };
}

/* ============================================================= GHI DANH */

/** Danh sách học viên của một lớp, kèm số tiền đã thu của từng người. */
export async function dsGhiDanh(lopId: string): Promise<GhiDanh[]> {
  if (!lopId) return [];
  const sb = getServiceClient();
  const { data, error } = await sb.from("ghi_danh")
    .select("id,lop_hoc_id,hoc_vien_id,hoc_phi,giam_gia,trang_thai,ngay_ghi_danh,ghi_chu,hoc_vien(ho_ten,sdt)")
    .eq("lop_hoc_id", lopId)
    .order("created_at");
  if (error) throw new Error(error.message);
  const ds = data || [];
  if (!ds.length) return [];

  // Tổng đã thu: một câu cho cả lớp rồi cộng ở đây. Dùng view/aggregate của PostgREST thì
  // phải thêm view vào schema — cộng ở đây đơn giản hơn và lớp vài chục người không nặng.
  const ids = ds.map((r: any) => r.id);
  const { data: thu } = await sb.from("thu_hoc_phi").select("ghi_danh_id,so_tien").in("ghi_danh_id", ids);
  const tong = new Map<string, number>();
  for (const t of thu || []) tong.set(t.ghi_danh_id, (tong.get(t.ghi_danh_id) || 0) + (Number(t.so_tien) || 0));

  return ds.map((r: any): GhiDanh => ({
    id: r.id,
    lopHocId: r.lop_hoc_id,
    hocVienId: r.hoc_vien_id,
    hoTen: r.hoc_vien?.ho_ten || "(không tên)",
    sdt: r.hoc_vien?.sdt ?? null,
    hocPhi: Number(r.hoc_phi) || 0,
    giamGia: Number(r.giam_gia) || 0,
    daTra: tong.get(r.id) || 0,
    trangThai: (r.trang_thai || "giu-cho") as TrangThaiHV,
    ngayGhiDanh: r.ngay_ghi_danh ?? null,
    ghiChu: r.ghi_chu ?? null,
  }));
}

export async function themGhiDanh(v: {
  lopHocId: string; hoTen: string; sdt?: string; hocPhi?: unknown; giamGia?: unknown;
  trangThai?: TrangThaiHV; ngayGhiDanh?: string | null; ghiChu?: string;
}): Promise<KetQua> {
  if (!v.lopHocId) return { ok: false, loi: "Thiếu lớp" };
  const hv = await themHocVien({ hoTen: v.hoTen, sdt: v.sdt });
  if (!hv.ok) return hv;

  const phi = v.hocPhi === undefined || v.hocPhi === "" ? 0 : docTien(v.hocPhi);
  if (phi === null) return { ok: false, loi: "Không đọc được học phí" };
  const giam = v.giamGia === undefined || v.giamGia === "" ? 0 : docTien(v.giamGia);
  if (giam === null) return { ok: false, loi: "Không đọc được số tiền giảm" };

  const sb = getServiceClient();
  const { data, error } = await sb.from("ghi_danh").insert({
    lop_hoc_id: v.lopHocId, hoc_vien_id: hv.id,
    hoc_phi: phi, giam_gia: giam,
    trang_thai: v.trangThai || "dang-hoc",
    ngay_ghi_danh: v.ngayGhiDanh || null,
    ghi_chu: v.ghiChu || null,
  }).select("id").single();

  if (error) {
    // Ràng buộc duy nhất ở CSDL bắt được trường hợp hai người cùng bấm thêm một lúc —
    // kiểm bằng mã trước khi insert thì vẫn lọt, nên để CSDL chặn rồi dịch lỗi ở đây.
    if (/duplicate key|uq_ghi_danh/i.test(error.message)) return { ok: false, loi: "Học viên này đã có trong lớp" };
    return { ok: false, loi: error.message };
  }
  return { ok: true, id: data.id };
}

export async function suaGhiDanh(id: string, v: Partial<{ hocPhi: unknown; giamGia: unknown; trangThai: TrangThaiHV; ghiChu: string }>): Promise<KetQua> {
  if (!id) return { ok: false, loi: "Thiếu id ghi danh" };
  const p: any = {};
  if (v.hocPhi !== undefined) {
    const n = docTien(v.hocPhi);
    if (n === null) return { ok: false, loi: "Không đọc được học phí" };
    p.hoc_phi = n;
  }
  if (v.giamGia !== undefined) {
    const n = docTien(v.giamGia);
    if (n === null) return { ok: false, loi: "Không đọc được số tiền giảm" };
    p.giam_gia = n;
  }
  if (v.trangThai !== undefined) p.trang_thai = v.trangThai;
  if (v.ghiChu !== undefined) p.ghi_chu = v.ghiChu || null;
  if (!Object.keys(p).length) return { ok: false, loi: "Không có gì để sửa" };
  const sb = getServiceClient();
  const { error } = await sb.from("ghi_danh").update(p).eq("id", id);
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id };
}

/* ============================================================ HỌC PHÍ */

export async function dsLanThu(ghiDanhId: string): Promise<LanThu[]> {
  if (!ghiDanhId) return [];
  const sb = getServiceClient();
  const { data, error } = await sb.from("thu_hoc_phi")
    .select("id,ghi_danh_id,so_tien,ngay,hinh_thuc,nguoi_thu,ghi_chu")
    .eq("ghi_danh_id", ghiDanhId).order("ngay", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any): LanThu => ({
    id: r.id, ghiDanhId: r.ghi_danh_id, soTien: Number(r.so_tien) || 0,
    ngay: r.ngay ?? null, hinhThuc: r.hinh_thuc ?? null, nguoiThu: r.nguoi_thu ?? null, ghiChu: r.ghi_chu ?? null,
  }));
}

export async function thuHocPhi(v: { ghiDanhId: string; soTien: unknown; ngay?: string | null; hinhThuc?: string; nguoiThu?: string; ghiChu?: string }): Promise<KetQua> {
  if (!v.ghiDanhId) return { ok: false, loi: "Thiếu học viên" };
  const n = docTien(v.soTien);
  if (n === null) return { ok: false, loi: "Không đọc được số tiền" };
  if (n <= 0) return { ok: false, loi: "Số tiền phải lớn hơn 0" };
  const sb = getServiceClient();
  const { data, error } = await sb.from("thu_hoc_phi").insert({
    ghi_danh_id: v.ghiDanhId, so_tien: n, ngay: v.ngay || null,
    hinh_thuc: v.hinhThuc || null, nguoi_thu: v.nguoiThu || null, ghi_chu: v.ghiChu || null,
  }).select("id").single();
  if (error) return { ok: false, loi: error.message };

  // Trả về TỔNG ĐÃ ĐÓNG ngay tại đây, không để màn hình tự đoán.
  // Màn hình làm mới bằng router.refresh() có lúc về chậm; người thu tiền nhìn thấy
  // ô "đã thu" vẫn 0đ thì tưởng chưa lưu và THU LẠI LẦN NỮA — sổ sách sai gấp đôi,
  // còn học viên thì bị đòi tiền đã đóng. Nên con số thật phải đi kèm ngay câu trả lời.
  const { data: ds } = await sb.from("thu_hoc_phi").select("so_tien").eq("ghi_danh_id", v.ghiDanhId);
  const daThu = (ds || []).reduce((t, r: any) => t + Math.round(Number(r.so_tien) || 0), 0);
  return { ok: true, id: data.id, vuaThu: n, daThu };
}

export async function xoaLanThu(id: string): Promise<KetQua> {
  if (!id) return { ok: false, loi: "Thiếu id" };
  const sb = getServiceClient();
  const { error } = await sb.from("thu_hoc_phi").delete().eq("id", id);
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id };
}

/** Tổng học phí thu được trong một tháng (YYYY-MM) — cho màn tổng quan. */
export async function thuTrongThang(thang: string): Promise<{ tong: number; soLan: number } | null> {
  const k = khoangThang(thang);
  if (!k) return null;
  const sb = getServiceClient();
  const { data, error } = await sb.from("thu_hoc_phi").select("so_tien").gte("ngay", k.tu).lte("ngay", k.den);
  if (error) throw new Error(error.message);
  const rows = data || [];
  return { tong: rows.reduce((s: number, r: any) => s + (Number(r.so_tien) || 0), 0), soLan: rows.length };
}

/* =========================================================== BUỔI HỌC */

export async function dsBuoi(lopId: string): Promise<BuoiHoc[]> {
  if (!lopId) return [];
  const sb = getServiceClient();
  const { data, error } = await sb.from("buoi_hoc")
    .select("id,lop_hoc_id,ngay,bat_dau,ket_thuc,chu_de").eq("lop_hoc_id", lopId).order("ngay");
  if (error) throw new Error(error.message);
  return (data || []).map((r: any): BuoiHoc => ({
    id: r.id, lopHocId: r.lop_hoc_id, ngay: r.ngay,
    batDau: r.bat_dau ?? null, ketThuc: r.ket_thuc ?? null, chuDe: r.chu_de ?? null,
  }));
}

export async function themBuoi(v: { lopHocId: string; ngay: string; batDau?: string; ketThuc?: string; chuDe?: string }): Promise<KetQua> {
  if (!v.lopHocId) return { ok: false, loi: "Thiếu lớp" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.ngay || ""))) return { ok: false, loi: "Ngày không hợp lệ" };
  const sb = getServiceClient();
  const { data, error } = await sb.from("buoi_hoc").insert({
    lop_hoc_id: v.lopHocId, ngay: v.ngay,
    bat_dau: v.batDau || null, ket_thuc: v.ketThuc || null, chu_de: v.chuDe || null,
  }).select("id").single();
  if (error) {
    if (/duplicate key|uq_buoi/i.test(error.message)) return { ok: false, loi: "Lớp này đã có buổi đúng ngày giờ đó" };
    return { ok: false, loi: error.message };
  }
  return { ok: true, id: data.id };
}

/** Điểm danh một buổi: ghi đè đúng dòng của học viên đó (có ràng buộc duy nhất ở CSDL). */
export async function diemDanh(v: { buoiHocId: string; ghiDanhId: string; coMat: boolean; ghiChu?: string }): Promise<KetQua> {
  if (!v.buoiHocId || !v.ghiDanhId) return { ok: false, loi: "Thiếu buổi học hoặc học viên" };
  const sb = getServiceClient();
  const { data, error } = await sb.from("diem_danh")
    .upsert({ buoi_hoc_id: v.buoiHocId, ghi_danh_id: v.ghiDanhId, co_mat: !!v.coMat, ghi_chu: v.ghiChu || null },
            { onConflict: "buoi_hoc_id,ghi_danh_id" })
    .select("id").single();
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id: data.id };
}

/** Bảng điểm danh của lớp: { ghiDanhId: { buoiId: coMat } } + tổng lượt có mặt. */
export async function bangDiemDanh(lopId: string): Promise<{ bang: Record<string, Record<string, boolean>>; coMat: number; tongLuot: number }> {
  const buoi = await dsBuoi(lopId);
  if (!buoi.length) return { bang: {}, coMat: 0, tongLuot: 0 };
  const sb = getServiceClient();
  const { data, error } = await sb.from("diem_danh")
    .select("buoi_hoc_id,ghi_danh_id,co_mat").in("buoi_hoc_id", buoi.map((b) => b.id));
  if (error) throw new Error(error.message);
  const bang: Record<string, Record<string, boolean>> = {};
  let coMat = 0;
  for (const r of data || []) {
    (bang[r.ghi_danh_id] ||= {})[r.buoi_hoc_id] = !!r.co_mat;
    if (r.co_mat) coMat++;
  }
  return { bang, coMat, tongLuot: (data || []).length };
}
