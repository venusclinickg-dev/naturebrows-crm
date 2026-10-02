/**
 * BÀI KIỂM MẢNG ĐÀO TẠO — chạy: node scripts/kiem/dao-tao.mjs
 *
 * Vì sao phải có: bốn lỗi nguy nhất ở đây đều KHÔNG gãy build và KHÔNG ném lỗi —
 *  1. đọc nhầm học phí ("15tr5" ra 15.000.005) -> sổ học phí lệch mà bảng vẫn đẹp;
 *  2. "không hiểu" bị quy thành 0 -> học viên thành "được tặng khoá";
 *  3. tính còn nợ sai dấu khi thu dư -> đi đòi tiền người đã đóng thừa;
 *  4. tỷ lệ đi học trả 0% khi chưa điểm danh -> đọc thành "cả lớp bỏ học".
 */
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// Biên dịch thẳng file gốc — nó cố ý KHÔNG nhập gì nên đứng một mình được.
const d = mkdtempSync(join(tmpdir(), "kiem-dao-tao-"));
const ts = join(d, "dao-tao.ts");
writeFileSync(ts, readFileSync(new URL("../../lib/dao-tao.ts", import.meta.url), "utf8"));
execFileSync("npx", ["tsc", ts, "--target", "es2020", "--module", "es2020",
  "--moduleResolution", "node", "--skipLibCheck", "--outDir", d], { stdio: "pipe" });
const M = await import(join(d, "dao-tao.js"));

let dat = 0, truot = 0;
const la = (ten, thuc, mong) => {
  const ok = JSON.stringify(thuc) === JSON.stringify(mong);
  ok ? dat++ : truot++;
  console.log(`  ${ok ? "ok " : "x  "} ${ten}${ok ? "" : `\n        ra  : ${JSON.stringify(thuc)}\n        mong: ${JSON.stringify(mong)}`}`);
};

console.log("\n-- đọc học phí gõ tay --");
la("15tr", M.docTien("15tr"), 15_000_000);
la("15 triệu", M.docTien("15 triệu"), 15_000_000);
la("15tr5 = 15,5 triệu chứ KHÔNG phải 15.000.005", M.docTien("15tr5"), 15_500_000);
la("1tr2", M.docTien("1tr2"), 1_200_000);
la("500k", M.docTien("500k"), 500_000);
la("500 nghìn", M.docTien("500 nghìn"), 500_000);
la("15.000.000 (dấu nghìn kiểu Việt)", M.docTien("15.000.000"), 15_000_000);
la("1,5tr", M.docTien("1,5tr"), 1_500_000);
la("số trần 350 = 350 đồng, KHÔNG đoán hộ thành 350k", M.docTien("350"), 350);
la("0 là số tiền hợp lệ (tặng khoá)", M.docTien("0"), 0);
la("rỗng -> null, KHÔNG phải 0", M.docTien(""), null);
la("chữ bậy -> null", M.docTien("mười lăm triệu"), null);
la("âm -> null", M.docTien(-5), null);
la("số -> giữ nguyên", M.docTien(12_000_000), 12_000_000);

console.log("\n-- học phí còn lại --");
const g = (hocPhi, giamGia, daTra) => ({ hocPhi, giamGia, daTra });
la("phải thu = học phí - giảm", M.phaiThu(g(15_000_000, 2_000_000, 0)), 13_000_000);
la("giảm quá tay không ra số âm", M.phaiThu(g(1_000_000, 5_000_000, 0)), 0);
la("còn lại sau khi đóng một nửa", M.conLai(g(15_000_000, 0, 7_000_000)), 8_000_000);
la("đóng đủ -> 0", M.conLai(g(15_000_000, 0, 15_000_000)), 0);
la("thu dư -> số ÂM (để kế toán thấy mà trả lại)", M.conLai(g(15_000_000, 0, 16_000_000)), -1_000_000);

console.log("\n-- tình trạng tiền --");
la("chưa đóng đồng nào", M.tinhTrangTien(g(15_000_000, 0, 0)), "chua-dong");
la("còn thiếu", M.tinhTrangTien(g(15_000_000, 0, 5_000_000)), "con-no");
la("đủ", M.tinhTrangTien(g(15_000_000, 0, 15_000_000)), "du");
la("đủ nhờ được giảm hết", M.tinhTrangTien(g(15_000_000, 15_000_000, 0)), "du");
la("thu dư", M.tinhTrangTien(g(15_000_000, 0, 20_000_000)), "thu-du");

console.log("\n-- tổng kết lớp --");
const lop = [
  { hocPhi: 15_000_000, giamGia: 0, daTra: 15_000_000, trangThai: "dang-hoc" },
  { hocPhi: 15_000_000, giamGia: 1_000_000, daTra: 5_000_000, trangThai: "dang-hoc" },
  { hocPhi: 15_000_000, giamGia: 0, daTra: 0, trangThai: "giu-cho" },
  { hocPhi: 15_000_000, giamGia: 0, daTra: 3_000_000, trangThai: "nghi" },
];
const tk = M.tongKetLop(lop);
la("sĩ số KHÔNG đếm người đã nghỉ", tk.siSo, 3);
la("tiền đã thu vẫn tính cả người nghỉ (tiền vào két là có thật)", tk.daThu, 23_000_000);
la("phải thu KHÔNG tính người đã nghỉ (không dựng nợ ma)", tk.phaiThu, 44_000_000);
la("còn thiếu", tk.conThieu, 21_000_000);
la("số người còn nợ", tk.soNguoiConNo, 2);
la("lớp rỗng: mọi số là 0, không ném lỗi", M.tongKetLop([]), { siSo: 0, phaiThu: 0, daThu: 0, conThieu: 0, soNguoiConNo: 0 });

console.log("\n-- tỷ lệ đi học --");
la("12/15 lượt", M.tyLeDiHoc(12, 15), 80);
la("chưa điểm danh buổi nào -> null (chưa đo được), KHÔNG phải 0", M.tyLeDiHoc(0, 0), null);
la("điểm danh rồi mà vắng hết -> 0 thật", M.tyLeDiHoc(0, 10), 0);

console.log("\n-- mốc tháng --");
la("tháng của một ngày", M.thangCua("2026-10-02"), "2026-10");
la("tháng 2 năm nhuận", M.khoangThang("2024-02"), { tu: "2024-02-01", den: "2024-02-29" });
la("tháng 12", M.khoangThang("2026-12"), { tu: "2026-12-01", den: "2026-12-31" });
la("tháng bậy -> null", M.khoangThang("2026-13"), null);
la("chuỗi bậy -> null", M.khoangThang("linh tinh"), null);

console.log(`\n${truot === 0 ? "✅" : "❌"} đào tạo: ${dat} đạt, ${truot} trượt\n`);
process.exit(truot === 0 ? 0 : 1);
