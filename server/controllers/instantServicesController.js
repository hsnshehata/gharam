const InstantService = require('../models/InstantService');
const Service = require('../models/Service');
const User = require('../models/User');
const { cacheAside, deleteByPrefix } = require('../services/cache');
const { addPointsAndConvertInternal, removePointsAndCoinsInternal } = require('./usersController');
const { logActivity } = require('../services/activityLogger');
const dataStore = require('../services/dataStore');

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

    if (dataStore.isReady()) await dataStore.onInstantServiceCreated(instantService._id);

    return res.json({ msg: 'تم إضافة الخدمة الفورية بنجاح', instantService: populatedService, points: totalPoints });
  } catch (err) {
    console.error('Error in addInstantService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.updateInstantService = async (req, res) => {
  const { employeeId, services, customServices = [], paymentMethod } = req.body;

  try {
    const existingInstant = await InstantService.findById(req.params.id);
    if (!existingInstant) return res.status(404).json({ msg: 'الخدمة الفورية غير موجودة' });

    const existingMap = new Map();
    existingInstant.services.forEach(srv => {
      existingMap.set(srv._id.toString(), srv);
    });

    const srvRecords = await Service.find({ _id: { $in: services } });
    if (srvRecords.length !== services.length) {
      return res.status(400).json({ msg: 'بعض الخدمات غير موجودة' });
    }

    let addedPoints = 0;
    const formattedServices = [];

    // 1. Process Normal Services
    srvRecords.forEach(srv => {
      const _idStr = srv._id.toString();
      const oldSrv = existingMap.get(_idStr);
      if (oldSrv) {
        formattedServices.push({
          _id: _idStr,
          name: srv.name,
          price: srv.price,
          isCustom: false,
          executed: oldSrv.executed,
          executedBy: oldSrv.executedBy || null,
          executedAt: oldSrv.executedAt || null
        });
      } else {
        formattedServices.push({
          _id: _idStr,
          name: srv.name,
          price: srv.price,
          isCustom: false,
          executed: !!employeeId,
          executedBy: employeeId || null,
          executedAt: employeeId ? new Date() : null
        });
        if (employeeId) addedPoints += srv.price * 0.15;
      }
    });

    // 2. Process Custom Services
    if (Array.isArray(customServices)) {
      customServices.forEach((customSrv, idx) => {
        if (!customSrv.name || !customSrv.price) return;
        const _idStr = customSrv._id || `custom-${Date.now()}-${idx}`;
        const price = Number(customSrv.price) || 0;
        const oldSrv = existingMap.get(_idStr);
        if (oldSrv) {
          formattedServices.push({
            _id: _idStr,
            name: customSrv.name,
            price: price,
            isCustom: true,
            executed: oldSrv.executed,
            executedBy: oldSrv.executedBy || null,
            executedAt: oldSrv.executedAt || null
          });
        } else {
          formattedServices.push({
            _id: _idStr,
            name: customSrv.name,
            price: price,
            isCustom: true,
            executed: !!employeeId,
            executedBy: employeeId || null,
            executedAt: employeeId ? new Date() : null
          });
          if (employeeId) addedPoints += price * 0.15;
        }
      });
    }

    // 3. Handle Point Deductions for Removed Services that were Executed
    const newServiceIds = new Set(formattedServices.map(s => s._id.toString()));
    for (const oldSrv of existingInstant.services) {
      if (!newServiceIds.has(oldSrv._id.toString()) && oldSrv.executed && oldSrv.executedBy) {
        // deduct points
        await removePointsAndCoinsInternal(oldSrv.executedBy, (p) => (
          p.instantServiceId?.toString() === existingInstant._id.toString() && p.serviceId?.toString() === oldSrv._id.toString()
        ));
      }
    }

    // 4. Add Points for newly added and immediately executed services
    if (employeeId) {
      for (const srv of formattedServices) {
        if (!existingMap.has(srv._id) && srv.executed) {
          await addPointsAndConvertInternal(employeeId, srv.price * 0.15, {
            bookingId: null,
            serviceId: srv._id,
            serviceName: srv.name,
            instantServiceId: existingInstant._id,
            receiptNumber: existingInstant.receiptNumber
          });
        }
      }
    }

    const total = formattedServices.reduce((sum, srv) => sum + srv.price, 0);

    const instantService = await InstantService.findByIdAndUpdate(
      req.params.id,
      {
        employeeId: employeeId !== undefined ? (employeeId || null) : existingInstant.employeeId,
        services: formattedServices,
        total,
        paymentMethod: paymentMethod || existingInstant.paymentMethod
      },
      { new: true }
    )
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    await logActivity({
      action: 'UPDATE',
      entityType: 'InstantService',
      entityId: instantService._id,
      details: `تعديل خدمة فورية: ${formattedServices.map(s => s.name).join(', ')}`,
      amount: total,
      paymentMethod: instantService.paymentMethod,
      performedBy: req.user.id
    });

    await invalidateInstantServiceCaches();
    if (dataStore.isReady()) await dataStore.onInstantServiceUpdated(instantService._id);

    return res.json({ msg: 'تم تعديل الخدمة الفورية بنجاح', instantService, points: addedPoints });
  } catch (err) {
    console.error('Error in updateInstantService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.deleteInstantService = async (req, res) => {
  if (!['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ msg: 'غير مصرح لك بالحذف، هذه الصلاحية للمدير والمشرف فقط' });
  }
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
    if (dataStore.isReady()) dataStore.onInstantServiceDeleted(req.params.id);
    return res.json({ msg: 'تم حذف الخدمة الفورية بنجاح' });
  } catch (err) {
    console.error('Error in deleteInstantService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getInstantServices = async (req, res) => {
  const { page = 1, limit = 50, search, date, receiptNumber } = req.query;

  try {
    if (dataStore.isReady()) {
      const payload = dataStore.getInstantServices({ page: parseInt(page), limit: parseInt(limit), search, date, receiptNumber });
      return res.json({ instantServices: payload.instantServices, total: payload.total, pages: payload.pages });
    }
    // Fallback to MongoDB
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
    if (dataStore.isReady()) {
      const instantService = dataStore.getInstantServiceByReceipt(receiptNumber);
      if (!instantService) return res.status(404).json({ msg: 'لم يتم العثور على خدمة فورية بهذا الرقم' });
      return res.json({ instantService });
    }
    // Fallback
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

    // تسجيل العملية: تكليف أو سحب ذاتي
    const isSelfExecute = req.user.id === employeeId;
    const performer = isSelfExecute ? user : await User.findById(req.user.id).select('username');
    const performerName = performer?.username || 'غير معروف';
    await logActivity({
      action: isSelfExecute ? 'SELF_EXECUTE' : 'ASSIGN',
      entityType: 'Service',
      entityId: instantService._id,
      details: isSelfExecute
        ? `قام الموظف "${user.username}" بسحب وتنفيذ خدمة فورية "${service.name || 'خدمة'}" بنفسه - وصل ${instantService.receiptNumber || '-'}`
        : `تكليف خدمة فورية "${service.name || 'خدمة'}" للموظف "${user.username}" بواسطة "${performerName}" - وصل ${instantService.receiptNumber || '-'}`,
      amount: points,
      performedBy: req.user.id,
      targetUser: employeeId
    });

    const populatedService = await InstantService.findById(id)
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    await invalidateInstantServiceCaches();
    if (dataStore.isReady()) await dataStore.onInstantServiceUpdated(id);

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

    const oldEmployee = await User.findById(oldEmployeeId).select('username');
    const oldEmployeeName = oldEmployee?.username || 'غير معروف';

    await removePointsAndCoinsInternal(oldEmployeeId, (p) => (
      p.instantServiceId?.toString() === id && p.serviceId?.toString() === serviceId
    ));

    service.executed = false;
    service.executedBy = null;
    service.executedAt = null;

    await instantService.save();

    // تسجيل عملية سحب التكليف
    const resetPerformer = await User.findById(req.user.id).select('username');
    const resetPerformerName = resetPerformer?.username || 'غير معروف';
    await logActivity({
      action: 'UNASSIGN',
      entityType: 'Service',
      entityId: instantService._id,
      details: `سحب التكليف من الموظف "${oldEmployeeName}" لخدمة فورية "${service.name || 'خدمة'}" بواسطة "${resetPerformerName}" - وصل ${instantService.receiptNumber || '-'}`,
      amount: points,
      performedBy: req.user.id,
      targetUser: oldEmployeeId
    });

    const populatedService = await InstantService.findById(id)
      .populate('employeeId', 'username')
      .populate('services.executedBy', 'username');

    await invalidateInstantServiceCaches();
    if (dataStore.isReady()) await dataStore.onInstantServiceUpdated(id);

    return res.json({ msg: 'تم سحب التكليف وإلغاء النقاط', instantService: populatedService, removedPoints: points });
  } catch (err) {
    console.error('Error in resetService:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};
