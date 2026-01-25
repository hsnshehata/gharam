const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Package = require('../models/Package');
const User = require('../models/User');
const { cacheAside, deleteByPrefix } = require('../services/cache');
const { addPointsAndConvertInternal, removePointsAndCoinsInternal } = require('./usersController');

const invalidateBookingRelated = async () => {
  await Promise.all([
    deleteByPrefix('bookings:'),
    deleteByPrefix('dashboard:'),
    deleteByPrefix('reports:')
  ]);
};

exports.addBooking = async (req, res) => {
  const {
    packageId, hennaPackageId, photographyPackageId, returnedServices, extraServices,
    hairStraightening, hairStraighteningPrice, hairStraighteningDate,
    hairDye, hairDyePrice, hairDyeDate,
    clientName,
    clientPhone, city, eventDate, hennaDate, deposit
  } = req.body;
  const employeeId = req.user.id;

  try {
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ msg: 'Package not found' });

    let total = pkg.price;
    let hennaPrice = 0, photoPrice = 0, returnedPrice = 0, extraPrice = 0;

    let hennaPkg = null;
    if (hennaPackageId && hennaPackageId !== '') {
      hennaPkg = await Package.findById(hennaPackageId);
      if (!hennaPkg) return res.status(404).json({ msg: 'Henna package not found' });
      hennaPrice = hennaPkg.price;
    }

    let photoPkg = null;
    if (photographyPackageId && photographyPackageId !== '') {
      photoPkg = await Package.findById(photographyPackageId);
      if (!photoPkg) return res.status(404).json({ msg: 'Photography package not found' });
      photoPrice = photoPkg.price;
    }

    if (returnedServices && returnedServices.length > 0) {
      const services = await Service.find({ _id: { $in: returnedServices } });
      returnedPrice = services.reduce((sum, srv) => sum + srv.price, 0);
    }

    if (extraServices && extraServices.length > 0) {
      const services = await Service.find({ _id: { $in: extraServices } });
      extraPrice = services.reduce((sum, srv) => sum + srv.price, 0);
    }

    total = total
      + hennaPrice
      + photoPrice
      + extraPrice
      - returnedPrice
      + (hairStraightening ? parseFloat(hairStraighteningPrice) : 0)
      + (hairDye ? parseFloat(hairDyePrice) : 0);

    const remaining = total - deposit;

    const receiptNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
    const barcode = receiptNumber;

    // جلب خدمات الباكدجات
    const packageIds = [packageId, hennaPackageId, photographyPackageId].filter(id => id);
    let packageServices = await Service.find({ packageId: { $in: packageIds } }).select('_id name price');

    // استثناء المرتجع من خدمات الباكدج
    if (returnedServices && returnedServices.length > 0) {
      packageServices = packageServices.filter(srv => !returnedServices.includes(srv._id.toString()));
    }

    // إضافة الخدمات الإكسترا إلى packageServices
    if (extraServices && extraServices.length > 0) {
      const extraSrvRecords = await Service.find({ _id: { $in: extraServices } }).select('_id name price');
      const formattedExtraServices = extraSrvRecords.map(srv => ({
        _id: srv._id,
        name: srv.name,
        price: srv.price,
        executed: false,
        executedBy: null
      }));
      packageServices = [...packageServices, ...formattedExtraServices];
    }

    const formattedPackageServices = packageServices.map(srv => ({
      _id: srv._id,
      name: srv.name,
      price: srv.price,
      executed: false,
      executedBy: null,
      executedAt: null
    }));

    const booking = new Booking({
      package: packageId,
      hennaPackage: hennaPackageId && hennaPackageId !== '' ? hennaPackageId : null,
      photographyPackage: photographyPackageId && photographyPackageId !== '' ? photographyPackageId : null,
      returnedServices, extraServices, packageServices: formattedPackageServices,
      hairStraightening, hairStraighteningPrice, hairStraighteningDate,
      hairDye, hairDyePrice, hairDyeDate,
      clientName, clientPhone, city, eventDate, hennaDate, deposit,
      installments: [], total, remaining, receiptNumber, barcode,
      createdBy: employeeId,
      updates: [{ changes: { created: true }, employeeId }]
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy packageServices.executedBy');
    await invalidateBookingRelated();
    res.json({ msg: 'Booking added successfully', booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateBooking = async (req, res) => {
  const {
    packageId, hennaPackageId, photographyPackageId, returnedServices, extraServices,
    hairStraightening, hairStraighteningPrice, hairStraighteningDate,
    hairDye, hairDyePrice, hairDyeDate,
    clientName,
    clientPhone, city, eventDate, hennaDate, deposit
  } = req.body;
  const employeeId = req.user.id;

  try {
    const oldBooking = await Booking.findById(req.params.id);
    if (!oldBooking) return res.status(404).json({ msg: 'Booking not found' });

    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ msg: 'Package not found' });

    let total = pkg.price;
    let hennaPrice = 0, photoPrice = 0, returnedPrice = 0, extraPrice = 0;

    let hennaPkg = null;
    if (hennaPackageId && hennaPackageId !== '') {
      hennaPkg = await Package.findById(hennaPackageId);
      if (!hennaPkg) return res.status(404).json({ msg: 'Henna package not found' });
      hennaPrice = hennaPkg.price;
    }

    let photoPkg = null;
    if (photographyPackageId && photographyPackageId !== '') {
      photoPkg = await Package.findById(photographyPackageId);
      if (!photoPkg) return res.status(404).json({ msg: 'Photography package not found' });
      photoPrice = photoPkg.price;
    }

    if (returnedServices && returnedServices.length > 0) {
      const services = await Service.find({ _id: { $in: returnedServices } });
      returnedPrice = services.reduce((sum, srv) => sum + srv.price, 0);
    }

    if (extraServices && extraServices.length > 0) {
      const services = await Service.find({ _id: { $in: extraServices } });
      extraPrice = services.reduce((sum, srv) => sum + srv.price, 0);
    }

    total = total
      + hennaPrice
      + photoPrice
      + extraPrice
      - returnedPrice
      + (hairStraightening ? parseFloat(hairStraighteningPrice) : 0)
      + (hairDye ? parseFloat(hairDyePrice) : 0);

    const installmentsPaid = Array.isArray(oldBooking.installments)
      ? oldBooking.installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0)
      : 0;
    const paid = (Number(deposit) || 0) + installmentsPaid;
    const remaining = Math.max(total - paid, 0);

    // جلب خدمات الباكدجات
    const packageIds = [packageId, hennaPackageId, photographyPackageId].filter(id => id);
    let packageServices = await Service.find({ packageId: { $in: packageIds } }).select('_id name price');

    // استثناء المرتجع من خدمات الباكدج
    if (returnedServices && returnedServices.length > 0) {
      packageServices = packageServices.filter(srv => !returnedServices.includes(srv._id.toString()));
    }

    // إضافة الخدمات الإكسترا إلى packageServices
    if (extraServices && extraServices.length > 0) {
      const extraSrvRecords = await Service.find({ _id: { $in: extraServices } }).select('_id name price');
      const formattedExtraServices = extraSrvRecords.map(srv => ({
        _id: srv._id,
        name: srv.name,
        price: srv.price,
        executed: false,
        executedBy: null,
        executedAt: null
      }));
      packageServices = [...packageServices, ...formattedExtraServices];
    }

    const formattedPackageServices = packageServices.map(srv => ({
      _id: srv._id,
      name: srv.name,
      price: srv.price,
      executed: false,
      executedBy: null,
      executedAt: null
    }));

    const changes = {};
    if (oldBooking.total !== total) changes.total = total;
    if (oldBooking.deposit !== deposit) changes.deposit = deposit;
    if (oldBooking.clientName !== clientName) changes.clientName = clientName;
    if (oldBooking.clientPhone !== clientPhone) changes.clientPhone = clientPhone;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        package: packageId,
        hennaPackage: hennaPackageId && hennaPackageId !== '' ? hennaPackageId : null,
        photographyPackage: photographyPackageId && photographyPackageId !== '' ? photographyPackageId : null,
        returnedServices, extraServices, packageServices: formattedPackageServices,
        hairStraightening, hairStraighteningPrice, hairStraighteningDate,
        hairDye, hairDyePrice, hairDyeDate,
        clientName, clientPhone, city, eventDate, hennaDate, deposit,
        total, remaining,
        $push: { updates: { changes, employeeId } }
      },
      { new: true }
    ).populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy packageServices.executedBy');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    await invalidateBookingRelated();
    res.json({ msg: 'Booking updated successfully', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    await invalidateBookingRelated();
    res.json({ msg: 'Booking deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addInstallment = async (req, res) => {
  const { amount } = req.body;
  const employeeId = req.user.id;

  const installmentAmount = Number(amount) || 0;
  if (installmentAmount <= 0) {
    return res.status(400).json({ msg: 'Invalid installment amount' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    booking.installments.push({ amount: installmentAmount, date: new Date(), employeeId });
    booking.remaining = Math.max(booking.remaining - installmentAmount, 0);

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy');
    await invalidateBookingRelated();
    res.json({ msg: 'Installment added successfully', booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getBookings = async (req, res) => {
  const { page = 1, limit = 50, search, date, receiptNumber } = req.query;
  try {
    const key = `bookings:list:${JSON.stringify({ page, limit, search, date, receiptNumber })}`;
    const payload = await cacheAside({
      key,
      ttlSeconds: 60,
      staleSeconds: 120,
      fetchFn: async () => {
        let query = {};
        if (search) {
          query = {
            $or: [
              { clientName: { $regex: search, $options: 'i' } },
              { clientPhone: { $regex: search, $options: 'i' } }
            ]
          };
        }
        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          query.eventDate = { $gte: startOfDay, $lte: endOfDay };
        }
        if (receiptNumber) {
          query.receiptNumber = receiptNumber;
        }

        const bookings = await Booking.find(query)
          .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy packageServices.executedBy')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));
        const total = await Booking.countDocuments(query);
        return { bookings, total, pages: Math.ceil(total / limit) };
      }
    });

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// جلب حجز واحد برقم الوصل بدقة لتفادي الالتباس بين الوصلات
exports.getBookingByReceipt = async (req, res) => {
  const receiptNumber = (req.params.receiptNumber || '').toString().trim();
  if (!receiptNumber) return res.status(400).json({ msg: 'رقم الوصل غير صالح' });

  try {
    const booking = await Booking.findOne({ receiptNumber })
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy packageServices.executedBy');

    if (!booking) return res.status(404).json({ msg: 'لم يتم العثور على حجز بهذا الرقم' });

    return res.json({ booking });
  } catch (err) {
    console.error('Error in getBookingByReceipt:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.executeService = async (req, res) => {
  const { id, serviceId } = req.params;
  const employeeId = req.body.employeeId || req.user.id;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const user = await User.findById(employeeId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    let points = 0;
    let serviceName = 'غير معروف';
    if (serviceId === 'hairStraightening' || serviceId === 'hairDye') {
      const isStraightening = serviceId === 'hairStraightening';
      const enabled = isStraightening ? booking.hairStraightening : booking.hairDye;
      const already = isStraightening ? booking.hairStraighteningExecuted : booking.hairDyeExecuted;
      if (enabled && !already) {
        if (isStraightening) {
          booking.hairStraighteningExecuted = true;
          booking.hairStraighteningExecutedBy = employeeId;
          booking.hairStraighteningExecutedAt = new Date();
          points = (booking.hairStraighteningPrice || 0) * 0.15;
          serviceName = 'فرد الشعر';
        } else {
          booking.hairDyeExecuted = true;
          booking.hairDyeExecutedBy = employeeId;
          booking.hairDyeExecutedAt = new Date();
          points = (booking.hairDyePrice || 0) * 0.15;
          serviceName = 'صبغة الشعر';
        }
      } else {
        return res.status(400).json({ msg: 'Hair service already executed or not applicable' });
      }
    } else {
      const service = booking.packageServices.find(srv => srv._id.toString() === serviceId);
      if (!service) return res.status(404).json({ msg: 'Service not found' });
      if (service.executed) return res.status(400).json({ msg: 'Service already executed' });
      service.executed = true;
      service.executedBy = employeeId;
      service.executedAt = new Date();
      points = service.price * 0.15;
      serviceName = service.name || 'خدمة باكدج';
    }

    // إضافة النقاط وتحويلها لعملات عند الحاجة
    await addPointsAndConvertInternal(employeeId, points, {
      bookingId: id,
      serviceId: (serviceId === 'hairStraightening' || serviceId === 'hairDye') ? null : serviceId,
      serviceName,
      receiptNumber: booking.receiptNumber || null
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy packageServices.executedBy hairStraighteningExecutedBy hairDyeExecutedBy');
    await invalidateBookingRelated();
    res.json({ msg: 'Service executed successfully', booking: populatedBooking, points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// إعادة الخدمة لحالة غير منفذة وإلغاء النقاط من الموظف السابق
exports.resetService = async (req, res) => {
  const { id, serviceId } = req.params;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    let oldEmployeeId = null;
    let points = 0;

    if (serviceId === 'hairStraightening' || serviceId === 'hairDye') {
      const isStraightening = serviceId === 'hairStraightening';
      const executed = isStraightening ? booking.hairStraighteningExecuted : booking.hairDyeExecuted;
      const execBy = isStraightening ? booking.hairStraighteningExecutedBy : booking.hairDyeExecutedBy;
      if (!executed || !execBy) {
        return res.status(400).json({ msg: 'Hair service is not executed to reset' });
      }
      oldEmployeeId = execBy;
      points = (isStraightening ? booking.hairStraighteningPrice : booking.hairDyePrice) * 0.15;
      if (isStraightening) {
        booking.hairStraighteningExecuted = false;
        booking.hairStraighteningExecutedBy = null;
        booking.hairStraighteningExecutedAt = null;
      } else {
        booking.hairDyeExecuted = false;
        booking.hairDyeExecutedBy = null;
        booking.hairDyeExecutedAt = null;
      }
    } else {
      const service = booking.packageServices.find(srv => srv._id.toString() === serviceId);
      if (!service) return res.status(404).json({ msg: 'Service not found' });
      if (!service.executed || !service.executedBy) {
        return res.status(400).json({ msg: 'Service is not executed to reset' });
      }
      oldEmployeeId = service.executedBy;
      points = service.price * 0.15;
      service.executed = false;
      service.executedBy = null;
      service.executedAt = null;
    }

    if (oldEmployeeId) {
      await removePointsAndCoinsInternal(oldEmployeeId, (p) => (
        p.bookingId?.toString() === id && (
          ((serviceId === 'hairStraightening' || serviceId === 'hairDye') && !p.serviceId) ||
          (serviceId !== 'hairStraightening' && serviceId !== 'hairDye' && p.serviceId && p.serviceId.toString() === serviceId)
        )
      ));
    }

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy packageServices.executedBy hairStraighteningExecutedBy hairDyeExecutedBy');

    await invalidateBookingRelated();
    res.json({ msg: 'Service reset successfully', booking: populatedBooking, removedPoints: points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
