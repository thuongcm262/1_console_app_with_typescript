import { createInterface } from "readline";
import { promises as fs } from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// create console interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// hàm này dùng để hỏi người dùng
function ask(q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, (answer) => resolve(answer)));
}



type User = {
  id: string;
  name: string;
  email: string;
  age?: number;
};

// file du lieu nguoi dung
const DATA_FILE = path.join(__dirname, "..", "data", "users.json");

async function loadUsers(): Promise<User[]> {
    try {
        const data = await fs.readFile(DATA_FILE, "utf-8");
        console.log("Loaded user data:", data);
        return Array.isArray(JSON.parse(data)) ? JSON.parse(data) as User[] : [];
    } catch (e: any) {
        if (e.code === "ENOENT") {
            console.warn("Data file not found, returning empty user list.");
            return [];
        }
        console.error("Error loading users:", e);
        throw e;
    }
}

async function printUsers(users: User[]){
    if (users.length === 0) {
        console.log("No users found.");
        return;
    }
    console.log("User List:");
    users.forEach(user => {
        console.log(`- ${user.name} - <${user.email}> (ID: ${user.id}) - ${user.age ? user.age + " years old" : "Age not specified"}`);
    });
}

// main
async function main(): Promise<void> {
  console.log("\n=== USER MANAGER CLI ===");
  console.log("1) Thêm user");
  console.log("2) Sửa user");
  console.log("3) Xoá user");
  console.log("4) Tìm kiếm user");
  console.log("5) Xem tất cả");
  console.log("0) Thoát");
  const choice = await ask("Nhập lựa chọn của bạn: ");
  switch (choice) {
    case "1":
      // Thêm user
      break;
    case "2":
      // Sửa user
      break;
    case "3":
      // Xoá user
      break;
    case "4":
      // Tìm kiếm user
      break;
    case "5":
      // Xem tất cả
      printUsers(await loadUsers());
      break;
    case "0":
      console.log("Thoát chương trình.");
      rl.close();
      process.exit(0);
    default:
      console.log("Lựa chọn không hợp lệ.");
  }
  
}

async function loop(){
    while (true) {
        await main();
    }
}

loop().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});