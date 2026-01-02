const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');

const SALARY_RESET_KEY = 'lastSalaryResetAt';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const readLastResetDate = async () => {
  const setting = await SystemSetting.findOne({ key: SALARY_RESET_KEY });
  if (!setting?.value) return null;
  const dt = new Date(setting.value);
  // تحاشي قيم غير صالحة
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const writeLastResetDate = async (date) => {
  await SystemSetting.findOneAndUpdate(
    { key: SALARY_RESET_KEY },
    { value: date, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const resetAllSalaries = async (reason = 'manual') => {
  const now = new Date();
  // استخدام تحديث بايبلاين لضبط remainingSalary على monthlySalary لكل المستخدمين
  const result = await User.updateMany({}, [{ $set: { remainingSalary: { $ifNull: ['$monthlySalary', 0] } } }]);
  await writeLastResetDate(now);

  const matched = result?.matchedCount ?? result?.n ?? 0;
  const modified = result?.modifiedCount ?? result?.nModified ?? 0;
  console.log(`[salary-reset] reason=${reason} matched=${matched} modified=${modified} at=${now.toISOString()}`);

  return { matched, modified, resetAt: now, reason };
};

const ensureMonthlySalaryReset = async (reason = 'scheduled') => {
  const now = new Date();
  const lastReset = await readLastResetDate();
  const alreadyThisMonth = lastReset && lastReset.getFullYear() === now.getFullYear() && lastReset.getMonth() === now.getMonth();
  if (alreadyThisMonth) {
    return { skipped: true, reason: 'already-reset-this-month', lastReset };
  }
  const res = await resetAllSalaries(reason);
  return { skipped: false, lastReset, ...res };
};

const msUntilNextMidnight = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
};

const startSalaryResetScheduler = () => {
  const runCheck = () => ensureMonthlySalaryReset('auto-monthly').catch((err) => {
    console.error('[salary-reset] scheduler failed', err);
  });

  // تحقق فور التشغيل لتدارك أي شهر فائت
  runCheck();

  const delay = msUntilNextMidnight();
  setTimeout(() => {
    runCheck();
    setInterval(runCheck, DAY_IN_MS).unref();
  }, delay).unref();
};

module.exports = {
  resetAllSalaries,
  ensureMonthlySalaryReset,
  startSalaryResetScheduler
};
