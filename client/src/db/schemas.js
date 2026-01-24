// مخططات RxDB مطابقة لحقول MongoDB الحالية

export const bookingSchema = {
  title: 'booking schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    package: { type: 'string' },
    hennaPackage: { type: 'string' },
    photographyPackage: { type: 'string' },
    returnedServices: { type: 'array', items: { type: 'string' }, default: [] },
    extraServices: { type: 'array', items: { type: 'string' }, default: [] },
    packageServices: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          executed: { type: 'boolean', default: false },
          executedBy: { type: 'string' },
          executedAt: { type: 'string', format: 'date-time' }
        }
      }
    },
    hairStraightening: { type: 'boolean', default: false },
    hairStraighteningPrice: { type: 'number', default: 0 },
    hairStraighteningDate: { type: 'string', format: 'date-time' },
    hairStraighteningExecuted: { type: 'boolean', default: false },
    hairStraighteningExecutedBy: { type: 'string' },
    hairStraighteningExecutedAt: { type: 'string', format: 'date-time' },
    hairDye: { type: 'boolean', default: false },
    hairDyePrice: { type: 'number', default: 0 },
    hairDyeDate: { type: 'string', format: 'date-time' },
    hairDyeExecuted: { type: 'boolean', default: false },
    hairDyeExecutedBy: { type: 'string' },
    hairDyeExecutedAt: { type: 'string', format: 'date-time' },
    clientName: { type: 'string' },
    clientPhone: { type: 'string' },
    city: { type: 'string' },
    eventDate: { type: 'string', format: 'date-time' },
    hennaDate: { type: 'string', format: 'date-time' },
    deposit: { type: 'number' },
    installments: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          date: { type: 'string', format: 'date-time' },
          employeeId: { type: 'string' }
        }
      }
    },
    total: { type: 'number' },
    remaining: { type: 'number' },
    receiptNumber: { type: 'string' },
    barcode: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false },
    createdBy: { type: 'string' },
    updates: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date-time' },
          changes: { type: 'object' },
          employeeId: { type: 'string' }
        }
      }
    }
  },
  required: ['_id', 'package', 'clientName', 'clientPhone', 'eventDate', 'deposit', 'total', 'remaining', 'createdAt', 'updatedAt'],
  indexes: ['eventDate', 'clientPhone', 'clientName', 'updatedAt', 'receiptNumber']
};

export const userSchema = {
  title: 'user schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    username: { type: 'string' },
    password: { type: 'string' },
    role: { type: 'string' },
    monthlySalary: { type: 'number', default: 0 },
    remainingSalary: { type: 'number', default: 0 },
    phone: { type: 'string' },
    totalPoints: { type: 'number', default: 0 },
    convertiblePoints: { type: 'number', default: 0 },
    level: { type: 'number', default: 1 },
    efficiencyCoins: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          level: { type: 'number' },
          value: { type: 'number' },
          earnedAt: { type: 'string', format: 'date-time' },
          sourcePointId: { type: 'string' },
          receiptNumber: { type: 'string' }
        }
      }
    },
    coinsRedeemed: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          level: { type: 'number' },
          value: { type: 'number' },
          redeemedAt: { type: 'string', format: 'date-time' },
          sourcePointId: { type: 'string' }
        }
      }
    },
    points: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          date: { type: 'string', format: 'date-time' },
          bookingId: { type: 'string' },
          serviceId: { type: 'string' },
          serviceName: { type: 'string' },
          instantServiceId: { type: 'string' },
          receiptNumber: { type: 'string' },
          type: { type: 'string' },
          note: { type: 'string' },
          giftedBy: { type: 'string' },
          giftedByName: { type: 'string' },
          status: { type: 'string' },
          openedAt: { type: 'string', format: 'date-time' }
        }
      }
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'username', 'password', 'role', 'createdAt', 'updatedAt'],
  indexes: ['username', 'role', 'phone', 'updatedAt']
};

export const instantServiceSchema = {
  title: 'instant service schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    employeeId: { type: 'string' },
    services: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          executed: { type: 'boolean', default: false },
          executedBy: { type: 'string' },
          executedAt: { type: 'string', format: 'date-time' }
        }
      }
    },
    total: { type: 'number' },
    receiptNumber: { type: 'string' },
    barcode: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'total', 'createdAt', 'updatedAt'],
  indexes: ['employeeId', 'receiptNumber', 'updatedAt']
};

export const expenseSchema = {
  title: 'expense schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    details: { type: 'string' },
    amount: { type: 'number' },
    userId: { type: 'string' },
    createdBy: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'details', 'amount', 'userId', 'createdBy', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'createdAt', 'updatedAt']
};

export const advanceSchema = {
  title: 'advance schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    userId: { type: 'string' },
    createdBy: { type: 'string' },
    amount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'userId', 'createdBy', 'amount', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'createdAt', 'updatedAt']
};

export const deductionSchema = {
  title: 'deduction schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    userId: { type: 'string' },
    createdBy: { type: 'string' },
    amount: { type: 'number' },
    reason: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'userId', 'createdBy', 'amount', 'reason', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'createdAt', 'updatedAt']
};

export const packageSchema = {
  title: 'package schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    name: { type: 'string' },
    price: { type: 'number' },
    type: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'name', 'price', 'type', 'createdAt', 'updatedAt'],
  indexes: ['type', 'name', 'updatedAt']
};

export const serviceSchema = {
  title: 'service schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    name: { type: 'string' },
    price: { type: 'number' },
    type: { type: 'string' },
    packageId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'name', 'price', 'type', 'createdAt', 'updatedAt'],
  indexes: ['type', 'packageId', 'name', 'updatedAt']
};

export const systemSettingSchema = {
  title: 'system setting schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    key: { type: 'string' },
    value: { type: 'object' },
    updatedAt: { type: 'string', format: 'date-time' },
    _deleted: { type: 'boolean', default: false }
  },
  required: ['_id', 'key', 'updatedAt'],
  indexes: ['key', 'updatedAt']
};

export const syncQueueSchema = {
  title: 'sync queue schema',
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: { type: 'string', maxLength: 128 },
    collection: { type: 'string' },
    operation: { type: 'string', enum: ['insert', 'update', 'delete'] },
    docId: { type: 'string' },
    payload: { type: 'object' },
    createdAt: { type: 'string', format: 'date-time' }
  },
  required: ['_id', 'collection', 'operation', 'docId', 'createdAt'],
  indexes: ['collection', 'createdAt']
};
