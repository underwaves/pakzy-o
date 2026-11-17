#!/usr/bin/env node
/**
 * สคริปต์สร้างหรือรีเซ็ตบัญชีแอดมินคนแรกสำหรับร้าน qokhims (PBKDF2-SHA256)
 * รับค่าชื่อผู้ใช้และรหัสผ่านผ่าน Interactive Input หรือ Environment Variable (ไม่ฝังรหัสผ่านในโค้ด)
 *
 * วิธีใช้งาน:
 *   node scripts/create-admin.mjs --local
 *   node scripts/create-admin.mjs --remote
 * หรือระบุผ่าน Environment:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD="your-strong-password" node scripts/create-admin.mjs --remote
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32; // 256 bits

async function promptCredentials() {
  let username = (process.env.ADMIN_USERNAME || '').trim();
  let password = process.env.ADMIN_PASSWORD || '';

  if (!username || !password) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!username) {
        const ans = await rl.question('กรอกชื่อผู้ใช้แอดมิน (ค่าเริ่มต้น: admin): ');
        username = ans.trim() || 'admin';
      }
      while (!password || password.length < 6) {
        password = await rl.question('กรอกรหัสผ่านแอดมิน (อย่างน้อย 6 ตัวอักษร): ');
        if (password.length < 6) {
          console.error('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร กรุณาลองใหม่ค่ะ');
        }
      }
    } finally {
      rl.close();
    }
  }

  return { username, password };
}

function hashPasswordPBKDF2Node(password) {
  const saltBytes = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(
    Buffer.from(password, 'utf-8'),
    saltBytes,
    PBKDF2_ITERATIONS,
    KEY_LENGTH_BYTES,
    'sha256'
  );
  return {
    hashHex: derived.toString('hex'),
    saltHex: saltBytes.toString('hex'),
  };
}

async function main() {
  const isRemote = process.argv.includes('--remote');
  const targetFlag = isRemote ? '--remote' : '--local';

  console.log(`\n🌸 สคริปต์สร้าง/อัปเดตบัญชีแอดมิน qokhims (${isRemote ? 'Production D1' : 'Local D1'}) 🌸\n`);

  const { username, password } = await promptCredentials();
  if (!/^[a-zA-Z0-9_.-]{2,64}$/.test(username)) {
    console.error('❌ ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ . - (2-64 ตัวอักษร)');
    process.exit(1);
  }

  const { hashHex, saltHex } = hashPasswordPBKDF2Node(password);

  const sql = `INSERT INTO admins (username, password_hash, salt, failed_attempts, locked_until) VALUES ('${username}', '${hashHex}', '${saltHex}', 0, NULL) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt, failed_attempts = 0, locked_until = NULL, updated_at = datetime('now');`;

  console.log(`\n⏳ กำลังบันทึกบัญชี "${username}" ลงฐานข้อมูล D1 (${targetFlag})...`);

  const tmpFile = `temp_admin_${Date.now()}.sql`;
  fs.writeFileSync(tmpFile, sql, 'utf-8');

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const res = spawnSync(
    npxCmd,
    ['wrangler', 'd1', 'execute', 'pakzy-o-db', targetFlag, `--file=${tmpFile}`],
    { stdio: 'inherit', shell: true }
  );

  try {
    fs.unlinkSync(tmpFile);
  } catch {}

  if (res.status !== 0) {
    console.error('\n❌ ไม่สามารถบันทึกข้อมูลแอดมินลง D1 ได้');
    process.exit(res.status || 1);
  }

  console.log(`\n✅ สร้าง/อัปเดตบัญชีแอดมิน "${username}" สำเร็จเรียบร้อยแล้วค่ะ ♡\n`);
}

main().catch((err) => {
  console.error('❌ เกิดข้อผิดพลาด:', err);
  process.exit(1);
});
