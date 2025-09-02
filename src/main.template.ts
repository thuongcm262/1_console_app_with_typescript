import { createInterface } from "readline";
import { promises as fs } from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

type User = {
  id: string;
  name: string;
  email: string;
  age?: number;
};

const DATA_FILE = path.join(__dirname, "..", "data", "users.json");

// ---------- I/O helpers ----------
async function loadUsers(): Promise<User[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as User[] : [];
  } catch (e: any) {
    if (e.code === "ENOENT") {
      await saveUsers([]);
      return [];
    }
    throw e;
  }
}

async function saveUsers(users: User[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

// ---------- Validation ----------
function isValidEmail(email: string): boolean {
  // đơn giản & đủ dùng cho CLI
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireNonEmpty(input: string, fieldName: string): string {
  const value = input.trim();
  if (!value) throw new Error(`${fieldName} không được để trống.`);
  return value;
}

function parseOptionalAge(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0 || n > 150) {
    throw new Error("Tuổi phải là số nguyên trong khoảng 0–150.");
  }
  return n;
}

// ---------- CRUD ----------
async function addUser(name: string, email: string, age?: number) {
  const users = await loadUsers();

  if (!isValidEmail(email)) throw new Error("Email không hợp lệ.");
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email đã tồn tại.");
  }

  const user: User = { id: randomUUID(), name, email, age };
  users.push(user);
  await saveUsers(users);
  return user;
}

async function updateUser(id: string, updates: Partial<Omit<User, "id">>) {
  const users = await loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error("Không tìm thấy User với id đã nhập.");

  // kiểm tra email trùng
  if (updates.email) {
    if (!isValidEmail(updates.email)) throw new Error("Email không hợp lệ.");
    if (users.some(u => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== id)) {
      throw new Error("Email đã tồn tại ở user khác.");
    }
  }

  const updated: User = { ...users[idx], ...updates };
  users[idx] = updated;
  await saveUsers(users);
  return updated;
}

async function deleteUser(id: string) {
  const users = await loadUsers();
  const before = users.length;
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === before) throw new Error("Không tìm thấy User để xoá.");
  await saveUsers(filtered);
  return true;
}

async function searchUsers(keyword: string): Promise<User[]> {
  const users = await loadUsers();
  const k = keyword.trim().toLowerCase();
  if (!k) return users;
  return users.filter(u =>
    u.id.toLowerCase().includes(k) ||
    u.name.toLowerCase().includes(k) ||
    u.email.toLowerCase().includes(k)
  );
}

async function listUsers(): Promise<User[]> {
  return await loadUsers();
}

// ---------- UI (console) ----------
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q: string): Promise<string> {
  return new Promise(resolve => rl.question(q, (answer) => resolve(answer)));
}

function printUsers(users: User[]) {
  if (users.length === 0) {
    console.log("— Không có user nào —");
    return;
  }
  console.log("\nDanh sách User:");
  console.log("=".repeat(60));
  for (const u of users) {
    const ageStr = typeof u.age === "number" ? ` | Age: ${u.age}` : "";
    console.log(`ID: ${u.id}\nName: ${u.name} | Email: ${u.email}${ageStr}`);
    console.log("-".repeat(60));
  }
}

async function handleAdd() {
  try {
    const name = requireNonEmpty(await ask("Nhập tên: "), "Tên");
    const email = requireNonEmpty(await ask("Nhập email: "), "Email");
    const age = parseOptionalAge(await ask("Nhập tuổi (bỏ trống nếu không): "));
    const user = await addUser(name, email, age);
    console.log("\n✅ Đã thêm User:");
    printUsers([user]);
  } catch (e: any) {
    console.error("❌ Lỗi:", e.message);
  }
}

async function handleUpdate() {
  try {
    const id = requireNonEmpty(await ask("Nhập ID user cần sửa: "), "ID");
    const nameRaw = await ask("Tên mới (bỏ trống nếu giữ nguyên): ");
    const emailRaw = await ask("Email mới (bỏ trống nếu giữ nguyên): ");
    const ageRaw = await ask("Tuổi mới (bỏ trống nếu giữ nguyên): ");

    const updates: Partial<Omit<User, "id">> = {};
    if (nameRaw.trim()) updates.name = nameRaw.trim();
    if (emailRaw.trim()) updates.email = emailRaw.trim();
    if (ageRaw.trim()) updates.age = parseOptionalAge(ageRaw);

    if (Object.keys(updates).length === 0) {
      console.log("Không có thay đổi nào.");
      return;
    }

    const updated = await updateUser(id, updates);
    console.log("\n✏️  Đã cập nhật:");
    printUsers([updated]);
  } catch (e: any) {
    console.error("❌ Lỗi:", e.message);
  }
}

async function handleDelete() {
  try {
    const id = requireNonEmpty(await ask("Nhập ID user cần xoá: "), "ID");
    await deleteUser(id);
    console.log("🗑️  Đã xoá user.");
  } catch (e: any) {
    console.error("❌ Lỗi:", e.message);
  }
}

async function handleSearch() {
  try {
    const k = await ask("Nhập từ khoá (ID/Name/Email, bỏ trống = xem tất cả): ");
    const result = await searchUsers(k);
    printUsers(result);
  } catch (e: any) {
    console.error("❌ Lỗi:", e.message);
  }
}

async function mainMenu(): Promise<void> {
  console.log("\n=== USER MANAGER CLI ===");
  console.log("1) Thêm user");
  console.log("2) Sửa user");
  console.log("3) Xoá user");
  console.log("4) Tìm kiếm user");
  console.log("5) Xem tất cả");
  console.log("0) Thoát");
  const choice = (await ask("Chọn: ")).trim();

  switch (choice) {
    case "1": await handleAdd(); break;
    case "2": await handleUpdate(); break;
    case "3": await handleDelete(); break;
    case "4": await handleSearch(); break;
    case "5": printUsers(await listUsers()); break;
    case "0":
      console.log("Tạm biệt!");
      rl.close();
      process.exit(0);
    default:
      console.log("Lựa chọn không hợp lệ.");
  }
}

async function loop() {
  while (true) {
    await mainMenu();
  }
}

loop().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
