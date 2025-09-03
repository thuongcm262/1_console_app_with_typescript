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
      await handleAdd();
      break;
    case "2":
      // Sửa user
      await handleUpdate();
      break;
    case "3":
      // Xoá user
      await handleDelete();
      break;
    case "4":
      // Tìm kiếm user
      await handleSearch();
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


//save user
async function saveUsers(users: User[]): Promise<void> {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
    console.log("User data saved successfully.");
  } catch (e) {
    console.error("Error saving user data:", e);
  }
}


// CRUD
async function addUser(name: string, email: string, age?: number) {
  const users = await loadUsers();
  const user: User = { id: randomUUID(), name, email, age };
  users.push(user);
  await saveUsers(users);
  return user;
}

async function updateUser(id: string, updates: Partial<Omit<User, "id">>) {
  const users = await loadUsers();
  const index = users.findIndex(u => u.id === id);
  if(index===-1){
    throw new Error("User not found");
  }
  // check email is valid and unique

  //
  const updated: User = { ...users[index], ...updates };
  users[index] = updated;
  await saveUsers(users);
  return updated;
}

async function deleteUser(id: string) {
  const users = await loadUsers();
  const before = users.length;
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === before) {
    throw new Error("User not found");
  }
  await saveUsers(filtered);
  return true;
}

async function searchUsers(keyword: string): Promise<User[]> {
  const users = await loadUsers();
  const k = keyword.trim().toLowerCase();
  if (!k) return users;
  return users.filter(u => u.name.toLowerCase().includes(k) || u.email.toLowerCase().includes(k));
}




// handle action
async function handleAdd() {
  try {
    const name = await ask("Nhập tên: ");
  const email = await ask("Nhập email: ");
  const ageInput = await ask("Nhập tuổi (bỏ qua nếu không muốn nhập): ");
  const age = ageInput ? parseInt(ageInput) : undefined;

  const user = await addUser(name, email, age);
  console.log("User added:");
  printUsers([user]);
  } catch (error: any) {
    console.error("Error adding user:", error.message);
  }
}

async function handleUpdate() {
  try {
    const id = await ask("Nhập ID của user cần sửa: ");
    const name = await ask("Nhập tên mới (bỏ qua nếu không muốn sửa): ");
    const email = await ask("Nhập email mới (bỏ qua nếu không muốn sửa): ");
    const ageInput = await ask("Nhập tuổi mới (bỏ qua nếu không muốn sửa): ");
    
    const updates: Partial<Omit<User, "id">> = {};
    if(name.trim()) updates.name = name.trim();
    if(email.trim()) updates.email = email.trim();
    if(ageInput.trim()) updates.age = parseInt(ageInput.trim());

    if(Object.keys(updates).length === 0){
      console.log("Không có thông tin nào để cập nhật.");
      return;
    }
    const updatedUser = await updateUser(id, updates);
    console.log("User updated:");
    printUsers([updatedUser]);
  } catch (error: any) {
    console.error("Error updating user:", error.message);
  }
}

async function handleDelete() {
  try {
    const id = await ask("Nhập ID của user cần xoá: ");
    const success = await deleteUser(id);
    if (success) {
      console.log("User deleted successfully.");
    }
  } catch (error: any) {
    console.error("Error deleting user:", error.message);
  }
}

async function handleSearch() {
  try{
    const k = await ask("Nhập từ khoá (Name/Email, bỏ trống = xem tất cả): ");
    const result = await searchUsers(k);
    console.log("Search results:");
    printUsers(result);
  } catch (error: any) {
    console.error("Error searching users:", error.message);
  }
}