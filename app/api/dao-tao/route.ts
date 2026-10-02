import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import {
  themKhoaHoc, themLop, suaLop,
  themGhiDanh, suaGhiDanh,
  thuHocPhi, xoaLanThu, dsLanThu,
  themBuoi, diemDanh,
  dsGhiDanh, dsBuoi, bangDiemDanh,
} from "@/lib/dao-tao-server";

export const dynamic = "force-dynamic";

/**
 * Cửa của mảng đào tạo cho người ĐÃ ĐĂNG NHẬP.
 * Hồ sơ học viên và học phí là dữ liệu cá nhân + tiền bạc, nên không có đường công khai
 * nào ở đây (khác `/api/lich/cong-khai` — chỗ đó cố ý mở cho khách tự đặt lịch).
 *
 * Một đường cho cả mảng, phân nhánh bằng `viec`: màn đào tạo có nhiều thao tác nhỏ
 * (thêm lớp, ghi danh, thu tiền, điểm danh) — dựng 6 file route cho 6 việc thì nhiều
 * file hơn mà vẫn cùng một luật gác cửa.
 */
async function canhCua() {
  const user = await getCurrentUser();
  return user ? null : NextResponse.json({ ok: false, loi: "Chưa đăng nhập" }, { status: 401 });
}

export async function GET(req: Request) {
  const chan = await canhCua(); if (chan) return chan;
  const u = new URL(req.url);
  const viec = u.searchParams.get("viec") || "";
  const lop = u.searchParams.get("lop") || "";
  try {
    if (viec === "ghi-danh") return NextResponse.json({ ok: true, ds: await dsGhiDanh(lop) });
    if (viec === "buoi") return NextResponse.json({ ok: true, ds: await dsBuoi(lop) });
    if (viec === "diem-danh") return NextResponse.json({ ok: true, ...(await bangDiemDanh(lop)) });
    if (viec === "lan-thu") return NextResponse.json({ ok: true, ds: await dsLanThu(u.searchParams.get("ghiDanh") || "") });
    return NextResponse.json({ ok: false, loi: "Không hiểu việc cần làm" }, { status: 400 });
  } catch (e: any) {
    // Hỏng thì nói hỏng — KHÔNG trả danh sách rỗng kèm 200, vì màn hình sẽ hiện
    // "lớp chưa có học viên" và chủ tiệm tưởng chưa ai đăng ký.
    return NextResponse.json({ ok: false, loi: e?.message || "Không đọc được kho đào tạo" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const chan = await canhCua(); if (chan) return chan;
  const b = await req.json().catch(() => ({} as any));
  const viec = String(b.viec || "");
  let kq;
  switch (viec) {
    case "them-khoa": kq = await themKhoaHoc(b); break;
    case "them-lop": kq = await themLop(b); break;
    case "sua-lop": kq = await suaLop(String(b.id || ""), b); break;
    case "ghi-danh": kq = await themGhiDanh(b); break;
    case "sua-ghi-danh": kq = await suaGhiDanh(String(b.id || ""), b); break;
    case "thu-hoc-phi": kq = await thuHocPhi(b); break;
    case "xoa-lan-thu": kq = await xoaLanThu(String(b.id || "")); break;
    case "them-buoi": kq = await themBuoi(b); break;
    case "diem-danh": kq = await diemDanh(b); break;
    default: return NextResponse.json({ ok: false, loi: "Không hiểu việc cần làm" }, { status: 400 });
  }
  return NextResponse.json(kq, { status: kq.ok ? 200 : 400 });
}
