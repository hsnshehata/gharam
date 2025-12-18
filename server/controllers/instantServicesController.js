const InstantService = require('../models/InstantService');
const Service = require('../models/Service');
const User = require('../models/User');
const { addPointsAndConvertInternal, removePointsAndCoinsInternal } = require('./usersController');

exports.addInstantService = async (req, res) => {
  const { employeeId, services } = req.body;

  try {
    const srvRecords = await Service.find({ _id: { $in: services } });
    if (srvRecords.length !== services.length) {
      return res.status(400).json({ msg: 'بعض الخدمات غير موجودة' });
    }

    let totalPoints = 0;
    const formattedServices = srvRecords.map(srv => {
      const service = {
        _id: srv._id.toString(),
        name: srv.name,
        price: srv.price,
        executed: !!employeeId, // executed: true لو فيه employeeId
        executedBy: employeeId || null // executedBy: employeeId لو موجود
      };
      if (employeeId) {
        totalPoints += srv.price * 0.15; // احتساب النقاط
      }
      return service;
    });

    const total = srvRecords.reduce((sum, srv) => sum + srv.price, 0);
    const receiptNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
    const barcode = receiptNumber;

    const instantService = new InstantService({
      employeeId: employeeId || null,
      services: formattedServices,
      total,
      receiptNumber,
      barcode
    });

    await instantService.save();

    // إضافة النقاط والعملة لو فيه employeeId (لكل خدمة منفذة)
    if (employeeId) {
      for (const srv of formattedServices) {
        if (srv.executed) {
          const pointsForService = srv.price * 0.15;
          await addPointsAndConvertInternal(employeeId, pointsForService, {
            bookingId: null,
            serviceId: srv._id,
            serviceName: srv.name,
            instantServiceId: instantService._id,
            receiptNumber
          });
        }
      }
    }

    const populatedService = await InstantService.findById(instantService._id)
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    return res.json({ msg: 'تم إضافة الخدمة الفورية بنجاح', instantService: populatedService, points: totalPoints });
  } catch (err) {
    console.error('Error in addInstantService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.updateInstantService = async (req, res) => {
  const { employeeId, services } = req.body;

  try {
    const srvRecords = await Service.find({ _id: { $in: services } });
    if (srvRecords.length !== services.length) {
      return res.status(400).json({ msg: 'بعض الخدمات غير موجودة' });
    }

    let totalPoints = 0;
    const formattedServices = srvRecords.map(srv => {
      const service = {
        _id: srv._id.toString(),
        name: srv.name,
        price: srv.price,
        executed: !!employeeId, // executed: true لو فيه employeeId
        executedBy: employeeId || null // executedBy: employeeId لو موجود
      };
      if (employeeId) {
        totalPoints += srv.price * 0.15; // احتساب النقاط
      }
      return service;
    });

    const total = srvRecords.reduce((sum, srv) => sum + srv.price, 0);

    const instantService = await InstantService.findByIdAndUpdate(
      req.params.id,
      {
        employeeId: employeeId || null,
        services: formattedServices,
        total
      },
      { new: true }
    )
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    if (!instantService) {
      return res.status(404).json({ msg: 'الخدمة الفورية غير موجودة' });
    }

    // إضافة النقاط والعملة لو فيه employeeId (لكل خدمة منفذة)
    if (employeeId) {
      for (const srv of formattedServices) {
        if (srv.executed) {
          const pointsForService = srv.price * 0.15;
          await addPointsAndConvertInternal(employeeId, pointsForService, {
            bookingId: null,
            serviceId: srv._id,
            serviceName: srv.name,
            instantServiceId: instantService._id,
            receiptNumber: instantService.receiptNumber
          });
        }
      }
    }

    return res.json({ msg: 'تم تعديل الخدمة الفورية بنجاح', instantService, points: totalPoints });
  } catch (err) {
    console.error('Error in updateInstantService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.deleteInstantService = async (req, res) => {
  try {
    const instantService = await InstantService.findByIdAndDelete(req.params.id);
    if (!instantService) {
      return res.status(404).json({ msg: 'الخدمة الفورية غير موجودة' });
    }
    return res.json({ msg: 'تم حذف الخدمة الفورية بنجاح' });
  } catch (err) {
    console.error('Error in deleteInstantService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getInstantServices = async (req, res) => {
  const { page = 1, limit = 50, search, date, receiptNumber } = req.query;

  try {
    let query = {};

    if (receiptNumber) {
      query.receiptNumber = receiptNumber.toString().trim();
    } else if (search) {
      const users = await User.find({
        username: { $regex: search, $options: 'i' }
      }).select('_id');
      const userIds = users.map(user => user._id);
      query = {
        $or: [
          { receiptNumber: { $regex: search, $options: 'i' } },
          { employeeId: { $in: userIds } }
        ]
      };
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const instantServices = await InstantService.find(query)
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await InstantService.countDocuments(query);

    return res.json({ instantServices, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error in getInstantServices:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.executeService = async (req, res) => {
  const { id, serviceId } = req.params;
  const { employeeId } = req.body;

  try {
    console.log('Executing service with params:', { id, serviceId, employeeId });

    if (!employeeId) {
      return res.status(400).json({ msg: 'يجب اختيار موظف لتنفيذ الخدمة' });
    }

    const instantService = await InstantService.findById(id);
    if (!instantService) {
      console.error('Instant service not found:', id);
      return res.status(404).json({ msg: 'الخدمة الفورية غير موجودة' });
    }

    const service = instantService.services.find(srv => srv._id === serviceId);
    if (!service) {
      console.error('Service not found in instant service:', serviceId);
      return res.status(404).json({ msg: 'الخدمة غير موجودة' });
    }
    if (service.executed) {
      console.warn('Service already executed:', serviceId);
      return res.status(400).json({ msg: 'الخدمة تم تنفيذها بالفعل' });
    }

    const user = await User.findById(employeeId);
    if (!user) {
      console.error('User not found:', employeeId);
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    // فحص إذا كان points مش array
    if (!Array.isArray(user.points)) {
      console.warn(`Points field for user ${employeeId} is not an array (type: ${typeof user.points}), fixing it`);
      await User.findByIdAndUpdate(employeeId, { $set: { points: [] } });
    }

    service.executed = true;
    service.executedBy = employeeId;
    const points = service.price * 0.15;

    await addPointsAndConvertInternal(employeeId, points, {
      bookingId: null,
      serviceId,
      serviceName: service.name || 'خدمة فورية',
      instantServiceId: instantService._id,
      receiptNumber: instantService.receiptNumber || null
    });

    await instantService.save();

    const populatedService = await InstantService.findById(id)
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    return res.json({ msg: 'تم تنفيذ الخدمة بنجاح', instantService: populatedService, points });
  } catch (err) {
    console.error('Error in executeService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

// إعادة خدمة فورية لحالة غير منفذة وإزالة النقاط من الموظف السابق
exports.resetService = async (req, res) => {
  const { id, serviceId } = req.params;

  try {
    const instantService = await InstantService.findById(id);
    if (!instantService) {
      return res.status(404).json({ msg: 'الخدمة الفورية غير موجودة' });
    }

    const service = instantService.services.find(srv => srv._id === serviceId);
    if (!service) {
      return res.status(404).json({ msg: 'الخدمة غير موجودة' });
    }
    if (!service.executed || !service.executedBy) {
      return res.status(400).json({ msg: 'الخدمة ليست منفذة لإلغائها' });
    }

    const oldEmployeeId = service.executedBy;
    const points = service.price * 0.15;

    await removePointsAndCoinsInternal(oldEmployeeId, (p) => (
      p.instantServiceId?.toString() === id && p.serviceId?.toString() === serviceId
    ));

    service.executed = false;
    service.executedBy = null;

    await instantService.save();

    const populatedService = await InstantService.findById(id)
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    return res.json({ msg: 'تم سحب التكليف وإلغاء النقاط', instantService: populatedService, removedPoints: points });
  } catch (err) {
    console.error('Error in resetService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};