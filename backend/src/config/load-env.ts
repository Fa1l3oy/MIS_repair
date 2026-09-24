import { basename, resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * โหลด .env ของ backend ก่อน แล้วจึงเป็น .env ที่รากของ repo (ตามคำแนะนำใน .env.example)
 * ค่าที่ตั้งไว้ใน environment จริงมาก่อนเสมอ — dotenv ไม่ทับค่าที่มีอยู่แล้ว
 * ไฟล์นี้อยู่ที่ backend/src/config (ตอนพัฒนา) หรือ backend/dist/src/config (หลัง build)
 */
const twoUp = resolve(__dirname, '..', '..');
const backendDir = basename(twoUp) === 'dist' ? resolve(twoUp, '..') : twoUp;

config({ path: [resolve(backendDir, '.env'), resolve(backendDir, '..', '.env')] });
