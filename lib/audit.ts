import prisma from './prisma';

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  requestId?: string | null;
}

/**
 * تسجيل العمليات الحساسة في سجل التدقيق (غير قابل للتعديل أو الحذف)
 */
export async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  requestId,
}: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        oldValuesJson: oldValues ? JSON.stringify(oldValues) : null,
        newValuesJson: newValues ? JSON.stringify(newValues) : null,
        ipAddress: ipAddress || null,
        requestId: requestId || null,
      },
    });
  } catch (error) {
    console.error('Audit Log Failure:', error);
    // Don't fail the primary transaction, but ensure errors are logged to stderr
    return null;
  }
}
