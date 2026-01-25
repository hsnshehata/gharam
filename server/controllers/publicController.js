const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const GOOGLE_FIELDS = 'rating,user_ratings_total,reviews';

const FALLBACK_RESPONSE = {
  msg: 'تعذر جلب تقييمات جوجل حالياً',
  rating: 5,
  totalReviews: 1100,
  reviews: [],
  source: 'fallback'
};

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

exports.getGoogleReviews = async (_req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (typeof fetch !== 'function') {
    return res.status(200).json({ ...FALLBACK_RESPONSE, msg: 'الخادم محتاج تحديث لإصدار Node يدعم fetch قبل جلب تقييمات جوجل' });
  }

  if (!apiKey || !placeId) {
    return res.status(200).json({ ...FALLBACK_RESPONSE, msg: 'برجاء ضبط GOOGLE_PLACES_API_KEY و GOOGLE_PLACE_ID في ملف البيئة' });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=${GOOGLE_FIELDS}&reviews_sort=newest&reviews_no_translations=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google API HTTP ${response.status}`);

    const data = await response.json();
    if (data.status !== 'OK') throw new Error(`Google API status ${data.status}`);

    const result = data.result || {};
    const reviews = Array.isArray(result.reviews) ? result.reviews.slice(0, 12).map((r) => ({
      author: r.author_name,
      relativeTime: r.relative_time_description,
      text: r.text,
      rating: r.rating,
      photoUrl: r.profile_photo_url,
      authorUrl: r.author_url,
      time: r.time,
      timeISO: r.time ? new Date(r.time * 1000).toISOString() : undefined
    })) : [];

    res.json({
      rating: result.rating,
      totalReviews: result.user_ratings_total,
      reviews,
      source: 'google'
    });
  } catch (err) {
    console.error('Google reviews error:', err.message);
    res.status(200).json(FALLBACK_RESPONSE);
  }
};

// بحث سريع عن الوصل (حجز أو خدمة فورية) بدون إرجاع 404 لو片ته جهة واحدة فقط
exports.findByReceipt = async (req, res) => {
  const receiptNumber = (req.params.receiptNumber || '').toString().trim();
  if (!receiptNumber) return res.status(400).json({ msg: 'رقم الوصل غير صالح' });

  try {
    const [booking, instantService] = await Promise.all([
      Booking.findOne({ receiptNumber })
        .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy packageServices.executedBy'),
      InstantService.findOne({ receiptNumber })
        .populate('employeeId', 'username')
        .populate('services.executedBy', 'username')
    ]);

    if (!booking && !instantService) {
      return res.status(404).json({ msg: 'لم يتم العثور على حجز أو خدمة فورية بهذا الرقم' });
    }

    return res.json({ booking, instantService });
  } catch (err) {
    console.error('Error in findByReceipt:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};
