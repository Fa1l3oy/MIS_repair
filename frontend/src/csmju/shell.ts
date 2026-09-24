/**
 * ค่าที่ทั้ง AppShell (client) และ layout (server) ใช้ร่วมกัน — ต้องอยู่นอกไฟล์ 'use client'
 * ไม่งั้นฝั่ง server จะได้ client reference แทนค่าจริง
 */

/** คุกกี้จำว่าผู้ใช้ตรึงแถบเมนูไว้หรือไม่ (อ่านฝั่ง server เพื่อไม่ให้หน้ากระตุกตอนโหลด) */
export const SIDEBAR_COOKIE = 'csmju_sidebar';
