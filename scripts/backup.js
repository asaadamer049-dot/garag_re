const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../prisma/fleet_erp.db');
const backupDir = path.resolve(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function backupDatabase() {
  if (!fs.existsSync(dbPath)) {
    console.error('Database file not found at:', dbPath);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPath = path.join(backupDir, `fleet_erp_backup_${timestamp}.db`);

  fs.copyFileSync(dbPath, destPath);
  console.log(`[BACKUP SUCCESS] Database backup created at: ${destPath}`);

  // Maintain last 30 daily backups
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 30) {
    for (let i = 30; i < files.length; i++) {
      fs.unlinkSync(path.join(backupDir, files[i].name));
      console.log(`[CLEANUP] Pruned older backup: ${files[i].name}`);
    }
  }
}

backupDatabase();
