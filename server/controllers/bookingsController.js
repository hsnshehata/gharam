const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Package = require('../models/Package');
const User = require('../models/User');

exports.addBooking = async (req, res) => {
  const {
    packageId, hennaPackageId, photographyPackageId, returnedServices, extraServices,
    hairStraightening, hairStraighteningPrice, hairStraighteningDate, clientName,
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

    total = total + hennaPrice + photoPrice + extraPrice - returnedPrice + (hairStraightening ? parseFloat(hairStraighteningPrice) : 0);
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
      executedBy: null
    }));

    const booking = new Booking({
      package: packageId,
      hennaPackage: hennaPackageId && hennaPackageId !== '' ? hennaPackageId : null,
      photographyPackage: photographyPackageId && photographyPackageId !== '' ? photographyPackageId : null,
      returnedServices, extraServices, packageServices: formattedPackageServices,
      hairStraightening, hairStraighteningPrice, hairStraighteningDate,
      clientName, clientPhone, city, eventDate, hennaDate, deposit,
      installments: [], total, remaining, receiptNumber, barcode,
      createdBy: employeeId,
      updates: [{ changes: { created: true }, employeeId }]
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy');
    res.json({ msg: 'Booking added successfully', booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateBooking = async (req, res) => {
  const {
    packageId, hennaPackageId, photographyPackageId, returnedServices, extraServices,
    hairStraightening, hairStraighteningPrice, hairStraighteningDate, clientName,
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

    total = total + hennaPrice + photoPrice + extraPrice - returnedPrice + (hairStraightening ? parseFloat(hairStraighteningPrice) : 0);
    const remaining = total - deposit;

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
      executedBy: null
    }));

    const oldBooking = await Booking.findById(req.params.id);
    if (!oldBooking) return res.status(404).json({ msg: 'Booking not found' });

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
        clientName, clientPhone, city, eventDate, hennaDate, deposit,
        total, remaining,
        $push: { updates: { changes, employeeId } }
      },
      { new: true }
    ).populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
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
    res.json({ msg: 'Booking deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addInstallment = async (req, res) => {
  const { amount } = req.body;
  const employeeId = req.user.id;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    booking.installments.push({ amount, date: new Date(), employeeId });
    booking.deposit += amount;
    booking.remaining -= amount;
    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy');
    res.json({ msg: 'Installment added successfully', booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getBookings = async (req, res) => {
  const { page = 1, limit = 50, search, date, receiptNumber } = req.query;
  try {
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
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Booking.countDocuments(query);
    res.json({ bookings, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.executeService = async (req, res) => {
  const { id, serviceId } = req.params;
  const employeeId = req.user.id;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    let points = 0;
    if (serviceId === 'hairStraightening') {
      if (booking.hairStraightening && !booking.hairStraighteningExecuted) {
        booking.hairStraighteningExecuted = true;
        booking.hairStraighteningExecutedBy = employeeId;
        points = booking.hairStraighteningPrice * 0.15;
      } else {
        return res.status(400).json({ msg: 'Hair straightening already executed or not applicable' });
      }
    } else {
      const service = booking.packageServices.find(srv => srv._id.toString() === serviceId);
      if (!service) return res.status(404).json({ msg: 'Service not found' });
      if (service.executed) return res.status(400).json({ msg: 'Service already executed' });
      service.executed = true;
      service.executedBy = employeeId;
      points = service.price * 0.15;
    }

    // إضافة النقاط للموظف
    await User.findByIdAndUpdate(employeeId, {
      $push: {
        points: {
          amount: points,
          date: new Date(),
          bookingId: id,
          serviceId: serviceId === 'hairStraightening' ? null : serviceId
        }
      }
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy packageServices.executedBy hairStraighteningExecutedBy');
    res.json({ msg: 'Service executed successfully', booking: populatedBooking, points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};