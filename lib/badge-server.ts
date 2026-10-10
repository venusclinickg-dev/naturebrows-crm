import "server-only";
import { getServiceClient } from "@/lib/supabase-server";

/**
 * SỐ ĐỎ TRÊN MENU — đếm một lượt, dùng chung cho MỌI vỏ trang.
 *
 * Vì sao tách ra đây: trước kia chỉ `app/zalo/layout.tsx` đếm, nên đứng ở màn Đào tạo
 * hay Đơn hàng là số đỏ biến mất — khách nhắn vào mà không ai biết. Chuông chỉ có ích
 * khi nó hiện ở MỌI màn, không phải chỉ màn vừa khéo có người viết mã đếm.
 *
 * KHÔNG nhập gì từ `lib/hop-thu-zalo*` hay `lib/facebook*`: đây là mã của VỎ, không
 * phải của mảng nào — nó chỉ đếm hai con số, không đụng vào ruột mảng nào cả.
 */
export type SoDo = { tinNhan: number; viec: number; fb: number };

export async function demSoDo(userId: string, duocXemNick?: string[] | null): Promise<SoDo> {
  const sb = getServiceClient();
  const moc7Ngay = new Date(Date.now() - 7 * 864e5).toISOString();

  let qZalo = sb.from("zalo_bridge_contacts").select("zalo_uid", { count: "exact", head: true })
    .eq("unreplied", true).gte("last_in_at", moc7Ngay);
  if (duocXemNick && duocXemNick.length) qZalo = qZalo.in("own_id", duocXemNick);

  const [zalo, viec, fb] = await Promise.all([
    duocXemNick && !duocXemNick.length ? Promise.resolve({ count: 0 } as any) : qZalo,
    sb.from("cong_viec").select("id", { count: "exact", head: true })
      .eq("assignee_id", userId).in("status", ["todo", "doing"]),
    // Facebook: khách nói câu cuối, chưa ai đáp. KHÔNG chặn theo 7 ngày như Zalo —
    // cửa sổ nhắn tin của Meta chỉ 24 giờ, quá hạn là mất quyền trả lời, nên tin
    // Facebook cũ lại càng phải kêu to chứ không được lặng đi.
    sb.from("fb_contacts").select("id", { count: "exact", head: true }).eq("unreplied", true),
  ]);

  // Đếm hỏng thì trả 0 chứ không nổ cả trang — nhưng 0 ở đây là "chưa đo được",
  // không phải "không có ai chờ". Vỏ trang không có chỗ nói câu đó nên đành vậy.
  return { tinNhan: zalo?.count || 0, viec: viec?.count || 0, fb: fb?.count || 0 };
}
