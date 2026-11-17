import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    await requireAuth('ADMIN');
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          filename: f,
          sizeBytes: stat.size,
          sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: stat.mtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ backups: files });
  } catch (error: any) {
    return NextResponse.json({ error: 'غير مصرح أو فشل في قراءة النسخ الاحتياطية' }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('ADMIN');
    const dbPath = path.resolve(process.cwd(), 'prisma/fleet_erp.db');
    const backupDir = path.resolve(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'ملف قاعدة البيانات غير موجود' }, { status: 404 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `fleet_erp_backup_${timestamp}.db`;
    const destPath = path.join(backupDir, backupFilename);

    fs.copyFileSync(dbPath, destPath);
    const stat = fs.statSync(destPath);

    await logAuditEvent({
      userId: user.userId,
      action: 'SYSTEM_BACKUP',
      entityType: 'DATABASE',
      newValues: { backupFilename, sizeBytes: stat.size },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء النسخة الاحتياطية بنجاح على الخادم الداخلي',
      backup: {
        filename: backupFilename,
        sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'فشل في تنفيذ النسخ الاحتياطي' }, { status: 500 });
  }
}
