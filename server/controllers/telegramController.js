const TelegramAccount = require('../models/TelegramAccount');

exports.getAccounts = async (req, res) => {
    try {
        const accounts = await TelegramAccount.find().populate('addedBy', 'username').sort({ createdAt: -1 });
        res.json({ success: true, accounts });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الحسابات المربوطة', error: err.message });
    }
};

exports.addAccount = async (req, res) => {
    try {
        const { telegramId, name, role } = req.body;
        
        if (!telegramId || !name || !role) {
            return res.status(400).json({ success: false, message: 'كل الحقول مطلوبة' });
        }

        const existing = await TelegramAccount.findOne({ telegramId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'هذا الحساب مربوط بالفعل' });
        }

        const account = new TelegramAccount({
            telegramId,
            name,
            role,
            addedBy: req.user.id
        });

        await account.save();
        
        // Return populated version for frontend if needed
        const populated = await TelegramAccount.findById(account._id).populate('addedBy', 'username');
        res.json({ success: true, message: 'تم ربط الحساب بنجاح', account: populated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ أثناء رفع الحساب', error: err.message });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const account = await TelegramAccount.findByIdAndDelete(req.params.id);
        if (!account) return res.status(404).json({ success: false, message: 'لم يتم العثور على الحساب' });
        
        res.json({ success: true, message: 'تم إلغاء الربط بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ أثناء الحذف', error: err.message });
    }
};
