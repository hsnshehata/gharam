const Booking = require('../models/Booking');
const User = require('../models/User');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const Deduction = require('../models/Deduction');
const Package = require('../models/Package');
const Service = require('../models/Service');
const SystemSetting = require('../models/SystemSetting');

const modelMap = {
  bookings: Booking,
  users: User,
  instantServices: InstantService,
  expenses: Expense,
  advances: Advance,
  deductions: Deduction,
  packages: Package,
  services: Service,
  systemSettings: SystemSetting
};

function buildRoleFilter(collection, role, userId) {
  if (role === 'admin' || role === 'supervisor') return {};
  if (collection === 'users') return { _id: userId };
  if (collection === 'expenses') return { $or: [{ userId }, { createdBy: userId }] };
  if (collection === 'advances' || collection === 'deductions') return { userId };
  if (collection === 'instantServices') return { employeeId: userId };
  if (collection === 'bookings') {
    return {
      $or: [
        { createdBy: userId },
        { 'installments.employeeId': userId },
        { 'packageServices.executedBy': userId }
      ]
    };
  }
  return {};
}

exports.pull = async (req, res) => {
  const { collection } = req.params;
  const Model = modelMap[collection];
  if (!Model) return res.status(400).json({ msg: 'Unknown collection' });

  const since = req.query.since ? new Date(req.query.since) : null;
  const baseFilter = since ? { updatedAt: { $gt: since } } : {};
  const roleFilter = buildRoleFilter(collection, req.user.role, req.user.id);
  const filter = { ...baseFilter, ...roleFilter };

  try {
    const docs = await Model.find(filter).lean();
    res.json({ docs });
  } catch (err) {
    console.error('Pull error', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

async function applyOperation({ collection, op, docId, payload }) {
  const Model = modelMap[collection];
  if (!Model) throw new Error(`Unknown collection ${collection}`);

  const incoming = { ...payload, updatedAt: new Date() };

  if (op === 'delete') {
    await Model.findByIdAndUpdate(docId, { _deleted: true, updatedAt: new Date() }, { new: true, upsert: true });
    return { status: 'ok', id: docId };
  }

  const existing = await Model.findById(docId).lean();
  if (existing && existing.updatedAt && payload.updatedAt) {
    const localTs = new Date(existing.updatedAt).getTime();
    const incomingTs = new Date(payload.updatedAt).getTime();
    if (localTs > incomingTs) {
      return { status: 'skipped', reason: 'lww-kept-local', id: docId };
    }
  }

  await Model.findByIdAndUpdate(docId, incoming, { new: true, upsert: true, setDefaultsOnInsert: true });
  return { status: 'ok', id: docId };
}

exports.pushBatch = async (req, res) => {
  const { collection } = req.params;
  const ops = req.body.operations || [];
  if (!ops.length) return res.json({ results: [] });

  try {
    const results = [];
    for (const op of ops) {
      try {
        const result = await applyOperation({ collection, ...op });
        results.push(result);
      } catch (err) {
        results.push({ status: 'error', id: op.docId, reason: err.message });
      }
    }
    res.json({ results });
  } catch (err) {
    console.error('Push error', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
