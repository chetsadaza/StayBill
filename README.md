# StayBill — Dormitory Management System

ระบบจัดการหอพักที่ช่วยอำนวยความสะดวกในการบริหารจัดการห้องพัก ผู้เช่า คำนวณบิล และออกเอกสารบิล PDF รายเดือน

## Tech Stack
* **Frontend**: Next.js (App Router, JavaScript, CSS Modules)
* **Backend**: Node.js + Express.js
* **Database**: MongoDB (Mongoose)

## Project Structure
* `/frontend`: Next.js Web Application
* `/backend`: Express API Service

## Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or MongoDB Atlas Connection URI)

### 2. Setup Database & Backend
1. เข้าไปที่โฟลเดอร์ backend:
   ```bash
   cd backend
   ```
2. คัดลอกและสร้างไฟล์ `.env` (มีตัวอย่างการกำหนดค่าในไฟล์):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/staybill
   NODE_ENV=development
   ```
3. รันเพื่อเริ่มการทำงานในโหมดพัฒนา (Development):
   ```bash
   npm run dev
   ```

### 3. Setup Frontend
1. เข้าไปที่โฟลเดอร์ frontend:
   ```bash
   cd frontend
   ```
2. รันโปรเจกต์ในโหมดพัฒนา:
   ```bash
   npm run dev
   ```
3. เปิดหน้าเว็บที่: [http://localhost:3000](http://localhost:3000)

## Features
- **Dashboard**: สรุปจำนวนห้องพัก, รายรับ, กราฟเปรียบเทียบรายรับ
- **จัดการห้องพัก**: เพิ่ม/แก้ไข/ลบห้องพัก, ระบุรูปแบบค่าน้ำค่าไฟรายห้อง (หน่วย/เหมาจ่าย/ฟรี)
- **จัดการผู้เช่า**: บันทึกข้อมูล ย้ายเข้า/ย้ายออก
- **คำนวณบิล**: คำนวณบิลอัตโนมัติตามเลขมิเตอร์น้ำ/ไฟ, เพิ่มค่าใช้จ่ายเพิ่มเติม
- **ออกบิล PDF**: พิมพ์ใบแจ้งหนี้ PDF สำหรับแจกจ่ายผู้เช่า
- **รายงานรายรับ**: วิเคราะห์รายรับแต่ละปี/แต่ละเดือนแยกตามประเภท
