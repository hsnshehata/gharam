const Booking = require('../models/Booking');

exports.checkAvailability = async (req, res) => {
  const { date, packageType } = req.query;
  if (!date) {
    return res.status(400).json({ status: 'error', msg: 'التاريخ مطلوب' });
  }

  const type = packageType === 'photo' ? 'photo' : 'makeup';

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = { eventDate: { $gte: startOfDay, $lte: endOfDay } };

    if (type === 'photo') {
      query.photographyPackage = { $exists: true, $ne: null };
    } else {
      // اعتبر الحجوزات الغير تصوير ضمن الميك أب
      query.$or = [
        { photographyPackage: { $exists: false } },
        { photographyPackage: null }
      ];
    }

    const count = await Booking.countDocuments(query);

    let status = 'available';
    if (type === 'photo') {
      if (count >= 5) status = 'busy';
      else if (count >= 3) status = 'nearly';
    } else {
      if (count >= 10) status = 'busy';
      else if (count >= 5) status = 'nearly';
    }

    res.json({ status, count, type });
  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ status: 'error', msg: 'Server error' });
  }
};
