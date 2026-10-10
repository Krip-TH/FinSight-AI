# แนวทางทำงานร่วมกัน

## เริ่มงานแต่ละรอบ

```powershell
git switch main
git pull --ff-only
git switch -c feature/your-task
```

ใช้ชื่อ branch ตามงาน เช่น feature/pdf-viewer หรือ fix/upload-validation
แบ่งงาน Frontend ใน frontend/ และ Backend ใน backend/ ตกลง API ก่อนแก้ทั้งสองฝั่ง

## ส่งงานให้เพื่อนตรวจ

```powershell
git status
git add <ไฟล์ที่แก้>
git commit -m "Describe the change"
git push -u origin HEAD
```

เปิด Pull Request บน GitHub ระบุสิ่งที่เปลี่ยน วิธีทดสอบ และภาพหน้าเว็บเมื่อแก้ UI
ตรวจ Backend tests และ Frontend build ให้ผ่าน ขอให้เพื่อนตรวจแล้วจึง merge
ถ้าพบ conflict ให้คุยกับเจ้าของส่วนที่เกี่ยวข้องก่อนเลือกโค้ดที่จะเก็บ

## ขอบเขตข้อมูล

- ไม่ commit API Key, .env, data/, SQLite, PDF ที่อัปโหลด หรือไฟล์ส่วนบุคคล
- ห้ามแก้ ย้าย หรือลบ sources/ และไฟล์ต้นฉบับใน workspace โครงงานเดิม
- แยกผล technical tests, AI quality และ user study อย่างชัดเจน
- ไม่อ้างผล AI/ผู้ใช้จริงจนมีหลักฐาน พร้อมรุ่นโมเดล prompt เวลา และผู้ตรวจ
- งานเปรียบเทียบ FY2025 ต้องแสดงวันสิ้นสุดรอบบัญชีที่ต่างกัน
- การเรียกบริการที่ใช้ Key ต้องมีการอนุมัติและโควตา/งบก่อน

## เชิญสมาชิก

เจ้าของ repo ไป Settings → Collaborators (หรือ Manage access) → Add people
เลือกบัญชี GitHub ของเพื่อนให้ถูกต้อง เพื่อนต้องรับคำเชิญก่อน clone repo แบบ Private
อย่าใช้บัญชีหรือ Key ร่วมกัน แต่ละคนใช้บัญชีของตนเอง
