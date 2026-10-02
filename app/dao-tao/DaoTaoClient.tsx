"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Plus, X, TriangleAlert, Wallet, Users, CalendarDays,
  CheckCircle2, CircleSlash, Pencil, Receipt,
} from "lucide-react";
import {
  conLai, phaiThu, tinhTrangTien, tongKetLop, tyLeDiHoc, docTien,
  NHAN_TIEN, NHAN_TRANG_THAI_HV, NHAN_TRANG_THAI_LOP,
  type BuoiHoc, type GhiDanh, type KhoaHoc, type LopHoc, type TrangThaiHV,
} from "@/lib/dao-tao";
import { tienDep, ngayDep, sdtDep } from "@/lib/chung";

const INPUT = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]";
const MAU_TIEN: Record<string, string> = {
  "chua-dong": "bg-rose-50 text-rose-700",
  "con-no": "bg-amber-50 text-amber-700",
  "du": "bg-emerald-50 text-emerald-700",
  "thu-du": "bg-sky-50 text-sky-700",
};

export default function DaoTaoClient({
  homNay, khoa, lop, lopDangMo, hocVien, buoi, diemDanh, coMat, tongLuot, thuThangNay, loi,
}: {
  homNay: string;
  khoa: KhoaHoc[];
  lop: LopHoc[];
  lopDangMo: LopHoc | null;
  hocVien: GhiDanh[];
  buoi: BuoiHoc[];
  diemDanh: Record<string, Record<string, boolean>>;
  coMat: number;
  tongLuot: number;
  thuThangNay: { tong: number; soLan: number } | null;
  loi: string | null;
}) {
  const router = useRouter();
  const [mo, setMo] = useState<null | "lop" | "khoa" | "hoc-vien" | "buoi" | { thu: GhiDanh } | { sua: GhiDanh }>(null);
  const [loiGhi, setLoiGhi] = useState("");
  const [chay, setChay] = useState(false);

  const tk = useMemo(() => tongKetLop(hocVien), [hocVien]);
  const tyLe = tyLeDiHoc(coMat, tongLuot);

  async function gui(body: any) {
    setChay(true); setLoiGhi("");
    try {
      const r = await fetch("/api/dao-tao", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setLoiGhi(j?.loi || "Không lưu được"); return false; }
      setMo(null); router.refresh(); return true;
    } catch { setLoiGhi("Mất mạng, thử lại giúp em"); return false; }
    finally { setChay(false); }
  }

  function chonLop(id: string) { router.push(`/dao-tao?lop=${id}`); }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <GraduationCap className="h-5 w-5 text-[#0068FF]" /> Đào tạo
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setMo("khoa")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            + Khoá học
          </button>
          <button onClick={() => setMo("lop")} className="flex items-center gap-1.5 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0058DB]">
            <Plus className="h-4 w-4" /> Mở lớp
          </button>
        </div>
      </div>

      {loi && (
        <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Không đọc được kho đào tạo nên <b>những con số dưới đây không đáng tin</b>: {loi}</span>
        </p>
      )}

      {/* ---------------------------------------------------------- SỐ TỔNG */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <The icon={<Users className="h-4 w-4" />} nhan="Sĩ số lớp này" so={lopDangMo ? String(tk.siSo) : "—"} phu={lopDangMo?.ten || "chưa chọn lớp"} />
        <The icon={<Wallet className="h-4 w-4" />} nhan="Đã thu của lớp" so={tienDep(tk.daThu)} phu={`cần thu ${tienDep(tk.phaiThu)}`} />
        <The
          icon={<Receipt className="h-4 w-4" />}
          nhan="Còn thiếu"
          so={tienDep(tk.conThieu)}
          phu={tk.soNguoiConNo > 0 ? `${tk.soNguoiConNo} người chưa đóng đủ` : "không ai nợ"}
          doi={tk.conThieu > 0}
        />
        <The
          icon={<CheckCircle2 className="h-4 w-4" />}
          nhan="Tỷ lệ đi học"
          so={tyLe === null ? "chưa đo được" : `${tyLe}%`}
          phu={tyLe === null ? "chưa điểm danh buổi nào" : `${coMat}/${tongLuot} lượt`}
        />
      </div>

      {thuThangNay && (
        <p className="text-xs text-slate-500">
          Học phí thu trong tháng này (tất cả các lớp): <b className="text-slate-700">{tienDep(thuThangNay.tong)}</b> · {thuThangNay.soLan} lần thu
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        {/* ------------------------------------------------------ CỘT LỚP */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lớp ({lop.length})</p>
          {lop.length === 0 && !loi && (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
              Chưa có lớp nào. Bấm <b>Mở lớp</b> để bắt đầu.
            </p>
          )}
          <ul className="space-y-1.5">
            {lop.map((l) => {
              const dangMo = lopDangMo?.id === l.id;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => chonLop(l.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${dangMo ? "border-[#0068FF] bg-[#EAF2FF]" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm font-semibold ${dangMo ? "text-[#0068FF]" : "text-slate-800"}`}>{l.ten}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {NHAN_TRANG_THAI_LOP[l.trangThai]}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                      {l.khoaHoc ? `${l.khoaHoc} · ` : ""}{l.siSo} học viên
                      {l.khaiGiang ? ` · khai giảng ${ngayDep(l.khaiGiang)}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ------------------------------------------------- DANH SÁCH HỌC VIÊN */}
        <div className="space-y-3">
          {lopDangMo && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{lopDangMo.ten}</h2>
                  <p className="text-xs text-slate-500">
                    {lopDangMo.giangVien ? `Giảng viên ${lopDangMo.giangVien}` : "chưa ghi giảng viên"}
                    {lopDangMo.diaDiem ? ` · ${lopDangMo.diaDiem}` : ""}
                    {lopDangMo.siSoToiDa ? ` · tối đa ${lopDangMo.siSoToiDa}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setMo("buoi")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <CalendarDays className="h-4 w-4" /> Thêm buổi
                  </button>
                  <button onClick={() => setMo("hoc-vien")} className="flex items-center gap-1.5 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0058DB]">
                    <Plus className="h-4 w-4" /> Thêm học viên
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Học viên</th>
                      <th className="px-3 py-2">Trạng thái</th>
                      <th className="px-3 py-2 text-right">Phải thu</th>
                      <th className="px-3 py-2 text-right">Đã thu</th>
                      <th className="px-3 py-2 text-right">Còn lại</th>
                      {buoi.map((b) => (
                        <th key={b.id} className="px-2 py-2 text-center" title={b.chuDe || ""}>
                          {b.ngay.slice(8, 10)}/{b.ngay.slice(5, 7)}
                        </th>
                      ))}
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hocVien.length === 0 && (
                      <tr><td colSpan={6 + buoi.length} className="px-3 py-8 text-center text-slate-500">Lớp chưa có học viên nào.</td></tr>
                    )}
                    {hocVien.map((g) => {
                      const tt = tinhTrangTien(g);
                      return (
                        <tr key={g.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <span className="block font-medium text-slate-800">{g.hoTen}</span>
                            <span className="block text-[11px] text-slate-500">{g.sdt ? sdtDep(g.sdt) : "chưa có số"}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{NHAN_TRANG_THAI_HV[g.trangThai]}</span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700">{tienDep(phaiThu(g))}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{tienDep(g.daTra)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${MAU_TIEN[tt]}`}>
                              {tt === "du" ? NHAN_TIEN[tt] : tienDep(Math.abs(conLai(g)))}
                            </span>
                          </td>
                          {buoi.map((b) => {
                            const v = diemDanh[g.id]?.[b.id];
                            return (
                              <td key={b.id} className="px-2 py-2 text-center">
                                <button
                                  disabled={chay}
                                  onClick={() => gui({ viec: "diem-danh", buoiHocId: b.id, ghiDanhId: g.id, coMat: !(v === true) })}
                                  title={v === undefined ? "Chưa điểm danh" : v ? "Có mặt" : "Vắng"}
                                  className="rounded p-1 hover:bg-slate-50"
                                >
                                  {v === undefined
                                    ? <span className="block h-4 w-4 rounded border border-dashed border-slate-300" />
                                    : v
                                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                      : <CircleSlash className="h-4 w-4 text-rose-500" />}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2">
                            <span className="flex justify-end gap-1">
                              <button onClick={() => setMo({ thu: g })} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                                Thu tiền
                              </button>
                              <button onClick={() => setMo({ sua: g })} className="rounded p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600" title="Sửa">
                                <Pencil className="h-4 w-4" />
                              </button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {buoi.length === 0 && (
                <p className="text-xs text-slate-500">Chưa có buổi học nào — thêm buổi rồi mới điểm danh được.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ HỘP */}
      {mo === "khoa" && (
        <Hop ten="Thêm khoá học" dong={() => setMo(null)} loi={loiGhi} chay={chay}
          luu={(f) => gui({ viec: "them-khoa", ten: f.ten, hocPhi: f.hocPhi, soBuoi: f.soBuoi, moTa: f.moTa })}
          truong={[
            { k: "ten", nhan: "Tên khoá (Phun mày cơ bản…)", bat: true },
            { k: "hocPhi", nhan: "Học phí niêm yết", tien: true },
            { k: "soBuoi", nhan: "Số buổi" },
            { k: "moTa", nhan: "Mô tả" },
          ]}
        />
      )}

      {mo === "lop" && (
        <Hop ten="Mở lớp mới" dong={() => setMo(null)} loi={loiGhi} chay={chay}
          luu={(f) => gui({ viec: "them-lop", ...f })}
          truong={[
            { k: "ten", nhan: "Tên lớp (K12 phun mày…)", bat: true },
            { k: "khoaHocId", nhan: "Khoá học", chon: [{ v: "", t: "— không chọn —" }, ...khoa.map((k) => ({ v: k.id, t: k.ten }))] },
            { k: "khaiGiang", nhan: "Ngày khai giảng", ngay: true, mac: homNay },
            { k: "giangVien", nhan: "Giảng viên" },
            { k: "diaDiem", nhan: "Địa điểm" },
            { k: "siSoToiDa", nhan: "Sĩ số tối đa" },
          ]}
        />
      )}

      {mo === "hoc-vien" && lopDangMo && (
        <Hop ten={`Thêm học viên vào ${lopDangMo.ten}`} dong={() => setMo(null)} loi={loiGhi} chay={chay}
          luu={(f) => gui({ viec: "ghi-danh", lopHocId: lopDangMo.id, ...f })}
          truong={[
            { k: "hoTen", nhan: "Họ tên", bat: true },
            { k: "sdt", nhan: "Số điện thoại" },
            { k: "hocPhi", nhan: "Học phí chốt với học viên", tien: true, mac: String(khoa.find((k) => k.id === lopDangMo.khoaHocId)?.hocPhi || "") },
            { k: "giamGia", nhan: "Giảm giá", tien: true },
            { k: "ngayGhiDanh", nhan: "Ngày ghi danh", ngay: true, mac: homNay },
            { k: "ghiChu", nhan: "Ghi chú" },
          ]}
        />
      )}

      {mo === "buoi" && lopDangMo && (
        <Hop ten={`Thêm buổi học cho ${lopDangMo.ten}`} dong={() => setMo(null)} loi={loiGhi} chay={chay}
          luu={(f) => gui({ viec: "them-buoi", lopHocId: lopDangMo.id, ...f })}
          truong={[
            { k: "ngay", nhan: "Ngày", ngay: true, mac: homNay, bat: true },
            { k: "batDau", nhan: "Giờ bắt đầu (08:30)" },
            { k: "ketThuc", nhan: "Giờ kết thúc (11:30)" },
            { k: "chuDe", nhan: "Chủ đề buổi học" },
          ]}
        />
      )}

      {mo && typeof mo === "object" && "thu" in mo && (
        <Hop ten={`Thu học phí — ${mo.thu.hoTen}`} dong={() => setMo(null)} loi={loiGhi} chay={chay}
          ghiChuTren={`Còn thiếu ${tienDep(Math.max(0, conLai(mo.thu)))}`}
          luu={(f) => gui({ viec: "thu-hoc-phi", ghiDanhId: mo.thu.id, ...f })}
          truong={[
            { k: "soTien", nhan: "Số tiền thu", tien: true, bat: true, mac: String(Math.max(0, conLai(mo.thu)) || "") },
            { k: "ngay", nhan: "Ngày thu", ngay: true, mac: homNay },
            { k: "hinhThuc", nhan: "Hình thức", chon: [{ v: "tien-mat", t: "Tiền mặt" }, { v: "chuyen-khoan", t: "Chuyển khoản" }, { v: "the", t: "Quẹt thẻ" }] },
            { k: "nguoiThu", nhan: "Người thu" },
            { k: "ghiChu", nhan: "Ghi chú" },
          ]}
        />
      )}

      {mo && typeof mo === "object" && "sua" in mo && (
        <Hop ten={`Sửa — ${mo.sua.hoTen}`} dong={() => setMo(null)} loi={loiGhi} chay={chay}
          luu={(f) => gui({ viec: "sua-ghi-danh", id: mo.sua.id, ...f })}
          truong={[
            { k: "hocPhi", nhan: "Học phí", tien: true, mac: String(mo.sua.hocPhi) },
            { k: "giamGia", nhan: "Giảm giá", tien: true, mac: String(mo.sua.giamGia) },
            {
              k: "trangThai", nhan: "Trạng thái", mac: mo.sua.trangThai,
              chon: (["giu-cho", "dang-hoc", "hoan-thanh", "nghi"] as TrangThaiHV[]).map((v) => ({ v, t: NHAN_TRANG_THAI_HV[v] })),
            },
            { k: "ghiChu", nhan: "Ghi chú", mac: mo.sua.ghiChu || "" },
          ]}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- MẢNH NHỎ */

function The({ icon, nhan, so, phu, doi }: { icon: React.ReactNode; nhan: string; so: string; phu?: string; doi?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">{icon}{nhan}</p>
      <p className={`mt-1 text-lg font-bold ${doi ? "text-rose-600" : "text-slate-900"}`}>{so}</p>
      {phu && <p className="text-[11px] text-slate-500">{phu}</p>}
    </div>
  );
}

type Truong = {
  k: string; nhan: string; bat?: boolean; tien?: boolean; ngay?: boolean; mac?: string;
  chon?: Array<{ v: string; t: string }>;
};

/**
 * Hộp nhập chung cho cả màn. Ô tiền in lại số ĐÃ HIỂU ngay dưới ô ("= 15.000.000đ")
 * — người gõ "15" định nói 15 triệu sẽ thấy ngay là máy hiểu 15 đồng và sửa được,
 * thay vì để sai âm thầm đi vào sổ học phí.
 */
function Hop({
  ten, truong, dong, luu, loi, chay, ghiChuTren,
}: {
  ten: string; truong: Truong[]; dong: () => void; luu: (f: Record<string, string>) => void;
  loi: string; chay: boolean; ghiChuTren?: string;
}) {
  const [f, setF] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const t of truong) o[t.k] = t.mac ?? (t.chon ? t.chon[0].v : "");
    return o;
  });
  const thieu = truong.some((t) => t.bat && !String(f[t.k] || "").trim());
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 lg:items-center lg:p-4" onClick={dong}>
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-t-2xl bg-white p-4 lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{ten}</h3>
          <button onClick={dong} className="rounded p-1 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>
        {ghiChuTren && <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{ghiChuTren}</p>}
        <div className="space-y-3">
          {truong.map((t) => {
            const v = f[t.k] ?? "";
            const hieu = t.tien && String(v).trim() ? docTien(v) : null;
            return (
              <label key={t.k} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  {t.nhan}{t.bat && <span className="text-rose-500"> *</span>}
                </span>
                {t.chon ? (
                  <select className={INPUT} value={v} onChange={(e) => setF({ ...f, [t.k]: e.target.value })}>
                    {t.chon.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
                  </select>
                ) : (
                  <input
                    className={INPUT}
                    type={t.ngay ? "date" : "text"}
                    value={v}
                    onChange={(e) => setF({ ...f, [t.k]: e.target.value })}
                  />
                )}
                {t.tien && String(v).trim() && (
                  <span className={`mt-1 block text-[11px] ${hieu === null ? "text-rose-600" : "text-slate-500"}`}>
                    {hieu === null ? "không đọc được số tiền này" : `= ${tienDep(hieu)}`}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {loi && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loi}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={dong} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Thôi</button>
          <button
            disabled={chay || thieu}
            onClick={() => luu(f)}
            className="flex-1 rounded-lg bg-[#0068FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0058DB] disabled:opacity-50"
          >
            {chay ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
