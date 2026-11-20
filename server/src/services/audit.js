// -- Nhật ký thao tác trong trang quản trị: ai, làm gì, với cái gì, lúc nào --
const { AuditLog } = require('../models');
const { AUDIT_ACTIONS } = require('../constants');

function actorOf(admin) {
  return { account: admin._id, name: admin.name || admin.username, username: admin.username, role: admin.role || 'admin' };
}

function stamp(admin) {
  return { kind: 'admin', account: admin._id, name: admin.name || admin.username };
}

async function record(req, action, target = {}, details) {
  if (!AUDIT_ACTIONS.includes(action)) throw new Error(`Hành động nhật ký chưa khai báo: ${action}`);
  try {
    await AuditLog.create({
      actor: req.auditActor || actorOf(req.admin),
      action,
      target,
      details,
      ip: req.ip
    });
  } catch (err) {
    console.error(`Không ghi được nhật ký ${action}:`, err.message);
  }
}

function diff(before, after, fields) {
  const changes = {};
  for (const field of fields) {
    const a = before[field] ?? null;
    const b = after[field] ?? null;
    if (String(a) !== String(b)) changes[field] = [a, b];
  }
  return changes;
}

module.exports = { actorOf, stamp, record, diff };
