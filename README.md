# FinSight-AI

ต้นแบบสำหรับอ่าน สรุป ถามตอบ และเปรียบเทียบเอกสารการเงินพร้อมหลักฐานหน้า PDF
ใช้ React + Tailwind CSS / FastAPI / PyMuPDF / SQLite / Gemini
ไม่ทำนายราคาและไม่ให้คำแนะนำซื้อขาย

## เปิดใน VS Code

เปิดโฟลเดอร์ repository นี้ด้วย File → Open Folder และเปิด Terminal ที่โฟลเดอร์หลัก
ต้องมี Python 3.12 หรือ 3.13, Node.js 22 และ Git

ติดตั้งครั้งแรกบน Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm --prefix frontend ci
```

## พัฒนาเว็บ

เปิด Terminal สองหน้าต่าง:

```powershell
# Terminal 1: Backend พร้อมโหลดใหม่เมื่อแก้ไฟล์
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
# Terminal 2: Frontend
npm --prefix frontend run dev
```

เปิด URL ที่ Vite แสดง (ปกติ http://127.0.0.1:5173)
Frontend ส่งคำขอ /api ไป Backend ผ่าน Vite proxy
ใน VS Code ใช้ Terminal → Run Task → Dev: backend หรือ Dev: frontend ได้เช่นกัน

## เปิดแบบสาธิตในเครื่อง

```powershell
npm --prefix frontend run build
.\start.ps1
```

เปิด http://127.0.0.1:8000 ระบบนี้ยังไม่ได้เผยแพร่สู่เว็บสาธารณะ
ฐานข้อมูลและ PDF ที่อัปโหลดสร้างใหม่ใน data/ ของแต่ละเครื่อง ไม่แชร์ผ่าน Git

## ทดสอบ

```powershell
.\.venv\Scripts\python.exe -m pytest backend/test_app.py -q
npm --prefix frontend run build
```

Backend tests ใช้ PDF fixture, temporary database และ mock provider ไม่เรียก Gemini จริง
GitHub Actions ตรวจ Backend และ Frontend ทุก push และ pull request

## AI และหลักฐาน

ใส่ Key ในเมนูตั้งค่า AI ของแอปเท่านั้น ห้ามใส่ในแชต โค้ด screenshot หรือ commit
Key อยู่ในหน่วยความจำ Backend; ปิด server แล้วต้องใส่ใหม่
ก่อนเรียก Gemini ต้องได้รับอนุญาตและกำหนดโควตา/งบ ไม่รับรองว่าบัญชีเป็น free tier
ระบบไม่สร้างคำตอบ AI เมื่อไม่มี Key

ตั้งจำนวนเรียกสูงสุดในเมนู AI (เริ่มต้น 3 ครั้ง) ทุกคำขอที่ส่งไป Gemini รวมคำขอที่ล้มเหลวใช้โควตา 1 ครั้ง
ผลเดิมจาก cache ไม่ใช้โควตาและไม่มีการลองซ้ำอัตโนมัติ จำนวนนี้เป็นข้อจำกัดต่อรอบการตั้งค่าในหน่วยความจำ
ตั้งค่าใหม่หรือเริ่ม Backend ใหม่จะเริ่มตัวนับใหม่ ไม่ใช่วงเงินค่าใช้จ่ายของบัญชี Google

ค้นด้วย keyword และคำแปลศัพท์ไทย/อังกฤษ ยังไม่มี semantic embeddings
เลขหน้าเป็นลำดับหน้า PDF เริ่มที่ 1 อาจต่างจากเลขหน้าที่พิมพ์ในรายงาน
การตรวจ quote ตรงกับข้อความไม่ได้รับรองว่าคำตอบถูกต้อง ต้องให้คนตรวจหลักฐาน
การเปรียบเทียบ Apple/Microsoft FY2025 ต้องระบุวันสิ้นสุดรอบบัญชีของแต่ละบริษัทที่ต่างกัน

## สถานะหลักฐานเดิม

บันทึกเดิมระบุ Backend tests ผ่าน 7 ข้อ และค้นหน้าที่มีเฉลยได้ 16/16 ข้อ
จาก Apple PDF 80 หน้าและ Microsoft PDF 158 หน้า (แปลงจาก DOCX ทางการ)
ยังไม่มีผลคุณภาพ AI หรือการทดลองผู้ใช้จริง ตัวเลขนี้ไม่ใช่คะแนนความถูกต้อง AI
ไฟล์หลักฐานเดิมและเอกสารวิจัย 20 เรื่องอยู่ใน workspace โครงงานเดิม ไม่รวมใน repo นี้

## ทำงานร่วมกัน

อ่าน CONTRIBUTING.md ก่อนเริ่มงาน ตั้งค่า GitHub repository แล้วเชิญเพื่อนด้วยบัญชี GitHub
เพื่อน clone repository และติดตั้งตามขั้นตอนข้างบน
ใช้ branch แยกสำหรับแต่ละงานและเปิด pull request ให้เพื่อนตรวจ ก่อนรวมเข้า main
