const InstantService = require('../models/InstantService');
const Service = require('../models/Service');
const User = require('../models/User');
const { cacheAside, deleteByPrefix } = require('../services/cache');
const { addPointsAndConvertInternal, removePointsAndCoinsInternal } = require('./usersController');
const { logActivity } = require('../services/activityLogger');

const invalidateInstantServiceCaches = async () => {
  await Promise.all([
    deleteByPrefix('instantServices:'),
    deleteByPrefix('dashboard:'),
    deleteByPrefix('reports:')
  ]);
};

exports.addInstantService = async (req, res) => {
  const { employeeId, services, customServices = [], paymentMethod } = req.body;

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
        isCustom: false,
        executed: !!employeeId, // executed: true لو فيه employeeId
        executedBy: employeeId || null, // executedBy: employeeId لو موجود
        executedAt: employeeId ? new Date() : null
      };
      if (employeeId) {
        totalPoints += srv.price * 0.15; // احتساب النقاط
      }
      return service;
    });

    // Add custom services to the list
    if (Array.isArray(customServices)) {
      customServices.forEach((customSrv, idx) => {
        if (!customSrv.name || !customSrv.price) return; // Skip invalid custom services
        
        const price = Number(customSrv.price) || 0;
        const service = {
          _id: `custom-${Date.now()}-${idx}`,
          name: customSrv.name,
          price: price,
          isCustom: true,
          executed: !!employeeId,
          executedBy: employeeId || null,
          executedAt: employeeId ? new Date() : null
        };
        formattedServices.push(service);

        if (employeeId) {
          totalPoints += price * 0.15;
        }
      });
    }

    const total = formattedServices.reduce((sum, srv) => sum + srv.price, 0);
    const receiptNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
    const barcode = receiptNumber;

    // حساب رقم الترتيب اليومي (يبدأ من 2)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const lastServiceToday = await InstantService.findOne({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ dailyQueueNumber: -1 });

    const dailyQueueNumber = lastServiceToday && lastServiceToday.dailyQueueNumber 
      ? lastServiceToday.dailyQueueNumber + 1 
      : 2;

    const instantService = new InstantService({
      employeeId: employeeId || null,
      services: formattedServices,
      total,
      paymentMethod: paymentMethod || 'cash',
      receiptNumber,
      barcode,
      dailyQueueNumber
    });

    await instantService.save();

    await logActivity({
      action: 'CREATE',
      entityType: 'InstantService',
      entityId: instantService._id,
      details: `إنشاء خدمة فورية: ${formattedServices.map(s => s.name).join(', ')}`,
      amount: total,
      paymentMethod: paymentMethod || 'cash',
      performedBy: req.user.id
    });

    await invalidateInstantServiceCaches();

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
  const { employeeId, services, customServices = [] } = req.body;

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
        isCustom: false,
        executed: !!employeeId, // executed: true لو فيه employeeId
        executedBy: employeeId || null, // executedBy: employeeId لو موجود
        executedAt: employeeId ? new Date() : null
      };
      if (employeeId) {
        totalPoints += srv.price * 0.15; // احتساب النقاط
      }
      return service;
    });

    // Add custom services to the list
    if (Array.isArray(customServices)) {
      customServices.forEach((customSrv, idx) => {
        if (!customSrv.name || !customSrv.price) return; // Skip invalid custom services
        
        const price = Number(customSrv.price) || 0;
        const service = {
          _id: customSrv._id || `custom-${Date.now()}-${idx}`,
          name: customSrv.name,
          price: price,
          isCustom: true,
          executed: !!employeeId,
          executedBy: employeeId || null,
          executedAt: employeeId ? new Date() : null
        };
        formattedServices.push(service);

        if (employeeId) {
          totalPoints += price * 0.15;
        }
      });
    }

    const total = formattedServices.reduce((sum, srv) => sum + srv.price, 0);

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

    await logActivity({
      action: 'UPDATE',
      entityType: 'InstantService',
      entityId: instantService._id,
      details: `تعديل خدمة فورية: ${formattedServices.map(s => s.name).join(', ')}`,
      amount: total,
      paymentMethod: instantService.paymentMethod, // Assuming it doesn't change here or we use existing one
      performedBy: req.user.id
    });

    await invalidateInstantServiceCaches();

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

    await logActivity({
      action: 'DELETE',
      entityType: 'InstantService',
      entityId: instantService._id,
      details: `حذف خدمة فورية برقم ${instantService.receiptNumber}`,
      amount: instantService.total,
      performedBy: req.user.id
    });

    await invalidateInstantServiceCaches();
    return res.json({ msg: 'تم حذف الخدمة الفورية بنجاح' });
  } catch (err) {
    console.error('Error in deleteInstantService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getInstantServices = async (req, res) => {
  const { page = 1, limit = 50, search, date, receiptNumber } = req.query;

  try {
    const key = `instantServices:list:${JSON.stringify({ page, limit, search, date, receiptNumber })}`;
    const payload = await cacheAside({
      key,
      ttlSeconds: 60,
      staleSeconds: 120,
      fetchFn: async () => {
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
        return { instantServices, total };
      }
    });

    const pages = Math.ceil(payload.total / limit);
    return res.json({ instantServices: payload.instantServices, total: payload.total, pages });
  } catch (err) {
    console.error('Error in getInstantServices:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

// جلب خدمة فورية برقم الوصل بدقة
exports.getInstantServiceByReceipt = async (req, res) => {
  const receiptNumber = (req.params.receiptNumber || '').toString().trim();
  if (!receiptNumber) return res.status(400).json({ msg: 'رقم الوصل غير صالح' });

  try {
    const instantService = await InstantService.findOne({ receiptNumber })
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    if (!instantService) return res.status(404).json({ msg: 'لم يتم العثور على خدمة فورية بهذا الرقم' });

    return res.json({ instantService });
  } catch (err) {
    console.error('Error in getInstantServiceByReceipt:', err);
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
    service.executedAt = new Date();
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

    await invalidateInstantServiceCaches();

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
    service.executedAt = null;

    await instantService.save();

    const populatedService = await InstantService.findById(id)
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    await invalidateInstantServiceCaches();

    return res.json({ msg: 'تم سحب التكليف وإلغاء النقاط', instantService: populatedService, removedPoints: points });
  } catch (err) {
    console.error('Error in resetService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};
