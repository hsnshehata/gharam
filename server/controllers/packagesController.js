const Package = require('../models/Package');
const Service = require('../models/Service');

exports.addPackage = async (req, res) => {
  const { name, price, type } = req.body;
  try {
    const pkg = new Package({ name, price, type });
    await pkg.save();
    res.json({ msg: 'Package added successfully', pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updatePackage = async (req, res) => {
  const { name, price, type } = req.body;
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, { name, price, type }, { new: true });
    if (!pkg) return res.status(404).json({ msg: 'Package not found' });
    res.json({ msg: 'Package updated successfully', pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ msg: 'Package not found' });
    res.json({ msg: 'Package deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addService = async (req, res) => {
  const { name, price, type, packageId } = req.body;
  try {
    const serviceData = { name, price, type };
    if (type === 'package' && packageId) {
      serviceData.packageId = packageId;
    }
    const service = new Service(serviceData);
    await service.save();
    res.json({ msg: 'Service added successfully', service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateService = async (req, res) => {
  const { name, price, type, packageId } = req.body;
  try {
    const serviceData = { name, price, type };
    if (type === 'package' && packageId) {
      serviceData.packageId = packageId;
    } else {
      serviceData.packageId = null;
    }
    const service = await Service.findByIdAndUpdate(req.params.id, serviceData, { new: true }).populate('packageId');
    if (!service) return res.status(404).json({ msg: 'Service not found' });
    res.json({ msg: 'Service updated successfully', service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ msg: 'Service not found' });
    res.json({ msg: 'Service deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getPackages = async (req, res) => {
  try {
    const packages = await Package.find();
    res.json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getServices = async (req, res) => {
  try {
    const services = await Service.find().populate('packageId');
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};