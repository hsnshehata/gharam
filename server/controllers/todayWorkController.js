const Booking = require('../models/Booking');

exports.getTodayWork = async (req, res) => {
  const { date } = req.query; // التاريخ على شكل YYYY-MM-DD
  try {
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // جلب الحجوزات اللي تاريخ الباكدج الأساسي أو الحنة أو خدمات الشعر إنهاردة
    const bookings = await Booking.find({
      $or: [
        { eventDate: { $gte: startDate, $lte: endDate } },
        { hennaDate: { $gte: startDate, $lte: endDate } },
        { hairStraighteningDate: { $gte: startDate, $lte: endDate } },
        { hairDyeDate: { $gte: startDate, $lte: endDate } }
      ]
    }).populate({
      path: 'package hennaPackage photographyPackage extraServices returnedServices packageServices._id packageServices.executedBy createdBy installments.employeeId updates.employeeId hairStraighteningExecutedBy hairDyeExecutedBy',
      strictPopulate: false // تجاهل أخطاء الـ populate
    });

    // تقسيم الحجوزات حسب النوع
    const makeupBookings = bookings.filter(
      booking => 
        (booking.package?.type === 'makeup' && new Date(booking.eventDate).toDateString() === startDate.toDateString()) ||
        (booking.hennaPackage && new Date(booking.hennaDate).toDateString() === startDate.toDateString())
    );
    const hairStraighteningBookings = bookings.filter(
      booking => booking.hairStraightening && new Date(booking.hairStraighteningDate).toDateString() === startDate.toDateString()
    );
    const hairDyeBookings = bookings.filter(
      booking => booking.hairDye && new Date(booking.hairDyeDate).toDateString() === startDate.toDateString()
    );
    const photographyBookings = bookings.filter(
      booking => 
        (booking.photographyPackage && new Date(booking.eventDate).toDateString() === startDate.toDateString()) ||
        (booking.photographyPackage && new Date(booking.hennaDate).toDateString() === startDate.toDateString())
    );

    res.json({
      makeupBookings: makeupBookings.map(b => ({
        ...b._doc,
        createdBy: b.createdBy || { username: 'غير معروف' }
      })),
      hairStraighteningBookings: hairStraighteningBookings.map(b => ({
        ...b._doc,
        createdBy: b.createdBy || { username: 'غير معروف' }
      })),
      hairDyeBookings: hairDyeBookings.map(b => ({
        ...b._doc,
        createdBy: b.createdBy || { username: 'غير معروف' }
      })),
      photographyBookings: photographyBookings.map(b => ({
        ...b._doc,
        createdBy: b.createdBy || { username: 'غير معروف' }
      }))
    });
  } catch (err) {
    console.error('Error in getTodayWork:', err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};