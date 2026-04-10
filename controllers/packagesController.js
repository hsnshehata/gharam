const Package = require('../models/Package');
const Service = require('../models/Service');
const dataStore = require('../services/dataStore');

exports.addPackage = async (req, res) => {
  let { name, price, type, isActive, expiresAt, showInPrices } = req.body;
  expiresAt = expiresAt || null;
  try {
    const pkg = new Package({ name, price, type, isActive, expiresAt, showInPrices });
    await pkg.save();
    if (dataStore.isReady()) await dataStore.onPackageChanged();
    res.json({ msg: 'Package added successfully', pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updatePackage = async (req, res) => {
  let { name, price, type, isActive, expiresAt, showInPrices } = req.body;
  expiresAt = expiresAt || null;
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, { name, price, type, isActive, expiresAt, showInPrices }, { new: true });
    if (!pkg) return res.status(404).json({ msg: 'Package not found' });
    if (dataStore.isReady()) await dataStore.onPackageChanged();
    res.json({ msg: 'Package updated successfully', pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deletePackage = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'صلاحية غير كافية - الحذف للمديرين فقط' });
  }
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ msg: 'Package not found' });
    if (dataStore.isReady()) await dataStore.onPackageChanged();
    res.json({ msg: 'Package deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addService = async (req, res) => {
  let { name, price, type, packageId, isActive, expiresAt, showInPrices } = req.body;
  expiresAt = expiresAt || null;
  try {
    const serviceData = { name, price, type, isActive, expiresAt, showInPrices };
    if (type === 'package' && packageId) {
      serviceData.packageId = packageId;
    }
    const service = new Service(serviceData);
    await service.save();
    if (dataStore.isReady()) await dataStore.onServiceChanged();
    res.json({ msg: 'Service added successfully', service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateService = async (req, res) => {
  let { name, price, type, packageId, isActive, expiresAt, showInPrices } = req.body;
  expiresAt = expiresAt || null;
  try {
    const serviceData = { name, price, type, isActive, expiresAt, showInPrices };
    if (type === 'package' && packageId) {
      serviceData.packageId = packageId;
    } else {
      serviceData.packageId = null;
    }
    const service = await Service.findByIdAndUpdate(req.params.id, serviceData, { new: true }).populate('packageId');
    if (!service) return res.status(404).json({ msg: 'Service not found' });
    if (dataStore.isReady()) await dataStore.onServiceChanged();
    res.json({ msg: 'Service updated successfully', service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteService = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'صلاحية غير كافية - الحذف للمديرين فقط' });
  }
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ msg: 'Service not found' });
    if (dataStore.isReady()) await dataStore.onServiceChanged();
    res.json({ msg: 'Service deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getPackages = async (req, res) => {
  try {
    if (dataStore.isReady()) {
      return res.json(dataStore.getPackages());
    }
    const packages = await Package.find();
    res.json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getServices = async (req, res) => {
  try {
    if (dataStore.isReady()) {
      return res.json(dataStore.getServices());
    }
    const services = await Service.find().populate('packageId');
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};