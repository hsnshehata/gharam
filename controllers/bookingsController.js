const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Package = require('../models/Package');
const User = require('../models/User');
const { cacheAside, deleteByPrefix } = require('../services/cache');
const { addPointsAndConvertInternal, removePointsAndCoinsInternal } = require('./usersController');
const { logActivity } = require('../services/activityLogger');
const dataStore = require('../services/dataStore');

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
    clientPhone, city, eventDate, hennaDate, deposit, paymentMethod
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
      paymentMethod: paymentMethod || 'cash',
      installments: [], total, remaining, receiptNumber, barcode,
      createdBy: employeeId,
      updates: [{ changes: { created: true }, employeeId }]
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy photographyExecutedBy packageServices.executedBy');
    
    await logActivity({
      action: 'CREATE',
      entityType: 'Booking',
      entityId: booking._id,
      details: `حجز جديد للعميل: ${clientName}`,
      amount: deposit,
      paymentMethod: paymentMethod || 'cash',
      performedBy: employeeId
    });

    await invalidateBookingRelated();
    if (dataStore.isReady()) await dataStore.onBookingCreated(booking._id);
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
    clientPhone, city, eventDate, hennaDate, deposit, paymentMethod
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
      packageServices = [...packageServices, ...extraSrvRecords];
    }

    const formattedPackageServices = packageServices.map(srv => {
      const existingService = oldBooking.packageServices.find(
        oldSrv => oldSrv._id && oldSrv._id.toString() === srv._id.toString()
      );
      
      return {
        _id: srv._id,
        name: srv.name,
        price: srv.price,
        executed: existingService && existingService.executed ? existingService.executed : false,
        executedBy: existingService && existingService.executedBy ? existingService.executedBy : null,
        executedAt: existingService && existingService.executedAt ? existingService.executedAt : null
      };
    });

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
        paymentMethod: paymentMethod || 'cash',
        total, remaining,
        $push: { updates: { changes, employeeId } }
      },
      { new: true }
    ).populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy photographyExecutedBy packageServices.executedBy');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    
    await logActivity({
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: booking._id,
      details: `تعديل حجز العميل: ${clientName}`,
      amount: deposit, // Track new deposit if any, or 0
      paymentMethod: paymentMethod || 'cash',
      performedBy: employeeId
    });

    await invalidateBookingRelated();
    if (dataStore.isReady()) await dataStore.onBookingUpdated(booking._id);
    res.json({ msg: 'Booking updated successfully', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteBooking = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'غير مصرح لك بالحذف، هذه الصلاحية للمدير فقط' });
  }
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    
    await logActivity({
      action: 'DELETE',
      entityType: 'Booking',
      entityId: booking._id,
      details: `حذف حجز العميل: ${booking.clientName}`,
      amount: booking.deposit,
      performedBy: req.user.id
    });

    await invalidateBookingRelated();
    if (dataStore.isReady()) dataStore.onBookingDeleted(req.params.id);
    res.json({ msg: 'Booking deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addInstallment = async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const employeeId = req.user.id;

  const installmentAmount = Number(amount) || 0;
  if (installmentAmount <= 0) {
    return res.status(400).json({ msg: 'Invalid installment amount' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    booking.installments.push({ amount: installmentAmount, date: new Date(), employeeId, paymentMethod: paymentMethod || 'cash' });
    booking.remaining = Math.max(booking.remaining - installmentAmount, 0);

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy');
    
    await logActivity({
      action: 'CREATE', // Using CREATE for new installment
      entityType: 'Installment',
      entityId: booking._id,
      details: `قسط/دفعة جديدة للعميل: ${booking.clientName}`,
      amount: installmentAmount,
      paymentMethod: paymentMethod || 'cash',
      performedBy: employeeId
    });

    await invalidateBookingRelated();
    if (dataStore.isReady()) await dataStore.onBookingUpdated(booking._id);
    res.json({ msg: 'Installment added successfully', booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateInstallment = async (req, res) => {
  const { installmentId } = req.params;
  const { amount, paymentMethod } = req.body;
  const employeeId = req.user.id;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'غير مصرح لك بتعديل الأقساط' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const installment = booking.installments.id(installmentId);
    if (!installment) return res.status(404).json({ msg: 'Installment not found' });

    installment.amount = Number(amount) || installment.amount;
    installment.paymentMethod = paymentMethod || installment.paymentMethod;
    installment.updatedBy = employeeId;
    installment.updatedAt = new Date();

    const installmentsPaid = booking.installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
    booking.remaining = Math.max(booking.total - (booking.deposit + installmentsPaid), 0);

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy');

    await logActivity({
      action: 'UPDATE',
      entityType: 'Installment',
      entityId: booking._id,
      details: `تعديل قسط للعميل: ${booking.clientName}`,
      amount: installment.amount,
      paymentMethod: installment.paymentMethod,
      performedBy: employeeId
    });

    await invalidateBookingRelated();
    if (dataStore.isReady()) await dataStore.onBookingUpdated(booking._id);
    res.json({ msg: 'Installment updated successfully', booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteInstallment = async (req, res) => {
  const { installmentId } = req.params;
  const employeeId = req.user.id;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'غير مصرح لك بحذف الأقساط' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const installment = booking.installments.id(installmentId);
    if (!installment) return res.status(404).json({ msg: 'Installment not found' });

    const amountRemoved = installment.amount;
    booking.installments.pull(installmentId);

    const installmentsPaid = booking.installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
    booking.remaining = Math.max(booking.total - (booking.deposit + installmentsPaid), 0);

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy');

    await logActivity({
      action: 'DELETE',
      entityType: 'Installment',
      entityId: booking._id,
      details: `حذف قسط للعميل: ${booking.clientName}`,
      amount: amountRemoved,
      performedBy: employeeId
    });

    await invalidateBookingRelated();
    if (dataStore.isReady()) await dataStore.onBookingUpdated(booking._id);
    res.json({ msg: 'Installment deleted successfully', booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getBookings = async (req, res) => {
  const { page = 1, limit = 50, search, date, receiptNumber } = req.query;
  try {
    if (dataStore.isReady()) {
      const payload = dataStore.getBookings({ page: parseInt(page), limit: parseInt(limit), search, date, receiptNumber });
      return res.json(payload);
    }
    // Fallback to MongoDB if cache not ready
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
              { clientPhone: { $regex: search, $options: 'i' } },
              { receiptNumber: { $regex: search, $options: 'i' } }
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
          .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy photographyExecutedBy packageServices.executedBy')
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
    if (dataStore.isReady()) {
      const booking = dataStore.getBookingByReceipt(receiptNumber);
      if (!booking) return res.status(404).json({ msg: 'لم يتم العثور على حجز بهذا الرقم' });
      return res.json({ booking });
    }
    // Fallback
    const booking = await Booking.findOne({ receiptNumber })
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy photographyExecutedBy packageServices.executedBy');

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
    if (serviceId === 'hairStraightening' || serviceId === 'hairDye' || serviceId === 'photography') {
      const isStraightening = serviceId === 'hairStraightening';
      const isDye = serviceId === 'hairDye';
      const isPhoto = serviceId === 'photography';
      
      const enabled = isStraightening ? booking.hairStraightening : 
                      isDye ? booking.hairDye : 
                      !!booking.photographyPackage;
      
      const already = isStraightening ? booking.hairStraighteningExecuted : 
                      isDye ? booking.hairDyeExecuted : 
                      booking.photographyExecuted;

      if (enabled && !already) {
        if (isStraightening) {
          booking.hairStraighteningExecuted = true;
          booking.hairStraighteningExecutedBy = employeeId;
          booking.hairStraighteningExecutedAt = new Date();
          points = (booking.hairStraighteningPrice || 0) * 0.15;
          serviceName = 'فرد الشعر';
        } else if (isDye) {
          booking.hairDyeExecuted = true;
          booking.hairDyeExecutedBy = employeeId;
          booking.hairDyeExecutedAt = new Date();
          points = (booking.hairDyePrice || 0) * 0.15;
          serviceName = 'صبغة الشعر';
        } else if (isPhoto) {
          booking.photographyExecuted = true;
          booking.photographyExecutedBy = employeeId;
          booking.photographyExecutedAt = new Date();
          const photoPrice = typeof booking.photographyPackage === 'object' ? booking.photographyPackage.price : 0;
          points = (photoPrice || 0) * 0.15;
          serviceName = 'التصوير';
        }
      } else {
        return res.status(400).json({ msg: 'Hair or Photography service already executed or not applicable' });
      }
    } else {
      let service = booking.packageServices.find(srv => srv._id && srv._id.toString() === serviceId);
      if (!service) {
         const extra = booking.extraServices.find(ex => ex.toString() === serviceId || (ex._id && ex._id.toString() === serviceId));
         if (extra) {
           const srvRecord = await Service.findById(serviceId);
           if (srvRecord) {
             booking.packageServices.push({
                _id: srvRecord._id,
                name: srvRecord.name,
                price: srvRecord.price,
                executed: true,
                executedBy: employeeId,
                executedAt: new Date()
             });
             points = srvRecord.price * 0.15;
             serviceName = srvRecord.name;
             service = booking.packageServices[booking.packageServices.length - 1];
           } else {
             return res.status(404).json({ msg: 'Service not found in Database' });
           }
         } else {
           return res.status(404).json({ msg: 'Service not found' });
         }
      } else {
        if (service.executed) return res.status(400).json({ msg: 'Service already executed' });
        service.executed = true;
        service.executedBy = employeeId;
        service.executedAt = new Date();
        points = service.price * 0.15;
        serviceName = service.name || 'خدمة باكدج';
      }
    }

    // إضافة النقاط وتحويلها لعملات عند الحاجة
    await addPointsAndConvertInternal(employeeId, points, {
      bookingId: id,
      serviceId: (serviceId === 'hairStraightening' || serviceId === 'hairDye' || serviceId === 'photography') ? null : serviceId,
      serviceName,
      receiptNumber: booking.receiptNumber || null
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy packageServices.executedBy hairStraighteningExecutedBy hairDyeExecutedBy');
    await invalidateBookingRelated();
    if (dataStore.isReady()) await dataStore.onBookingUpdated(booking._id);
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

    if (serviceId === 'hairStraightening' || serviceId === 'hairDye' || serviceId === 'photography') {
      const isStraightening = serviceId === 'hairStraightening';
      const isDye = serviceId === 'hairDye';
      const isPhoto = serviceId === 'photography';
      
      const executed = isStraightening ? booking.hairStraighteningExecuted : 
                       isDye ? booking.hairDyeExecuted : 
                       booking.photographyExecuted;
                       
      const execBy = isStraightening ? booking.hairStraighteningExecutedBy : 
                     isDye ? booking.hairDyeExecutedBy : 
                     booking.photographyExecutedBy;
                     
      if (!executed || !execBy) {
        return res.status(400).json({ msg: 'Hair/Photo service is not executed to reset' });
      }
      oldEmployeeId = execBy;
      
      if (isStraightening) {
        points = (booking.hairStraighteningPrice || 0) * 0.15;
        booking.hairStraighteningExecuted = false;
        booking.hairStraighteningExecutedBy = null;
        booking.hairStraighteningExecutedAt = null;
      } else if (isDye) {
        points = (booking.hairDyePrice || 0) * 0.15;
        booking.hairDyeExecuted = false;
        booking.hairDyeExecutedBy = null;
        booking.hairDyeExecutedAt = null;
      } else if (isPhoto) {
        const photoPrice = typeof booking.photographyPackage === 'object' ? booking.photographyPackage.price : 0;
        points = (photoPrice || 0) * 0.15;
        booking.photographyExecuted = false;
        booking.photographyExecutedBy = null;
        booking.photographyExecutedAt = null;
      }
    } else {
      const service = booking.packageServices.find(srv => srv._id && srv._id.toString() === serviceId);
      if (!service) {
         // Check if old extra service that is executed
         const extra = booking.extraServices.find(ex => ex.toString() === serviceId || (ex._id && ex._id.toString() === serviceId));
         if (extra) {
            return res.status(400).json({ msg: 'Service is not executed or handled properly yet' });
         } else {
            return res.status(404).json({ msg: 'Service not found' });
         }
      }
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
          ((serviceId === 'hairStraightening' || serviceId === 'hairDye' || serviceId === 'photography') && !p.serviceId) ||
          (serviceId !== 'hairStraightening' && serviceId !== 'hairDye' && serviceId !== 'photography' && p.serviceId && p.serviceId.toString() === serviceId)
        )
      ));
    }

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy packageServices.executedBy hairStraighteningExecutedBy hairDyeExecutedBy');

    await invalidateBookingRelated();
    if (dataStore.isReady()) await dataStore.onBookingUpdated(booking._id);
    res.json({ msg: 'Service reset successfully', booking: populatedBooking, removedPoints: points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
