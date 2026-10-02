import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { dsKhoaHoc, dsLop, dsGhiDanh, dsBuoi, bangDiemDanh, thuTrongThang } from "@/lib/dao-tao-server";
import { thangCua, type GhiDanh, type KhoaHoc, type LopHoc, type BuoiHoc } from "@/lib/dao-tao";
import { vnDateStr } from "@/lib/chung";
import DaoTaoClient from "./DaoTaoClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đào tạo | Nature Brows CRM" };

export default async function Page({ searchParams }: { searchParams?: { lop?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const homNay = vnDateStr();

  // Kho hỏng thì NÓI hỏng. Trả danh sách rỗng kèm giao diện bình thường thì chủ tiệm
  // đọc thành "chưa có lớp nào" và tưởng mất sạch dữ liệu.
  let lop: LopHoc[] = [];
  let khoa: KhoaHoc[] = [];
  let loi: string | null = null;
  try {
    [lop, khoa] = await Promise.all([dsLop(), dsKhoaHoc()]);
  } catch (e: any) {
    loi = e?.message || "Không đọc được kho đào tạo";
  }

  const dangMo = lop.find((l) => l.id === searchParams?.lop) || lop[0] || null;

  let hocVien: GhiDanh[] = [];
  let buoi: BuoiHoc[] = [];
  let diemDanh: Record<string, Record<string, boolean>> = {};
  let coMat = 0, tongLuot = 0;
  if (dangMo && !loi) {
    try {
      const [a, b, c] = await Promise.all([dsGhiDanh(dangMo.id), dsBuoi(dangMo.id), bangDiemDanh(dangMo.id)]);
      hocVien = a; buoi = b; diemDanh = c.bang; coMat = c.coMat; tongLuot = c.tongLuot;
    } catch (e: any) {
      loi = e?.message || "Không đọc được danh sách lớp";
    }
  }

  const thu = await thuTrongThang(thangCua(homNay)).catch(() => null);

  return (
    <DaoTaoClient
      homNay={homNay}
      khoa={khoa}
      lop={lop}
      lopDangMo={dangMo}
      hocVien={hocVien}
      buoi={buoi}
      diemDanh={diemDanh}
      coMat={coMat}
      tongLuot={tongLuot}
      thuThangNay={thu}
      loi={loi}
    />
  );
}
