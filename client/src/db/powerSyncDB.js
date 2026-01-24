import { PowerSyncDatabase } from '@powersync/web';
import { WASQLiteDBAdapter } from '@journeyapps/wa-sqlite';

// تعريف مخطط SQLite المحلي بناءً على الـcollections الحالية
const schema = {
  tables: {
    bookings: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        package: 'TEXT',
        hennaPackage: 'TEXT',
        photographyPackage: 'TEXT',
        clientName: 'TEXT',
        clientPhone: 'TEXT',
        city: 'TEXT',
        eventDate: 'TEXT',
        hennaDate: 'TEXT',
        deposit: 'REAL',
        total: 'REAL',
        remaining: 'REAL',
        receiptNumber: 'TEXT',
        barcode: 'TEXT',
        createdBy: 'TEXT',
        createdAt: 'TEXT',
        updatedAt: 'TEXT',
        // الحقول المصفوفة نخزنها كسلاسل JSON
        returnedServices: 'TEXT',
        extraServices: 'TEXT',
        packageServices: 'TEXT',
        installments: 'TEXT',
        updates: 'TEXT',
        hairStraightening: 'INTEGER',
        hairStraighteningPrice: 'REAL',
        hairStraighteningDate: 'TEXT',
        hairStraighteningExecuted: 'INTEGER',
        hairStraighteningExecutedBy: 'TEXT',
        hairStraighteningExecutedAt: 'TEXT',
        hairDye: 'INTEGER',
        hairDyePrice: 'REAL',
        hairDyeDate: 'TEXT',
        hairDyeExecuted: 'INTEGER',
        hairDyeExecutedBy: 'TEXT',
        hairDyeExecutedAt: 'TEXT'
      }
    },
    users: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        username: 'TEXT',
        role: 'TEXT',
        monthlySalary: 'REAL',
        remainingSalary: 'REAL',
        phone: 'TEXT',
        totalPoints: 'REAL',
        convertiblePoints: 'REAL',
        level: 'INTEGER',
        points: 'TEXT',
        efficiencyCoins: 'TEXT',
        coinsRedeemed: 'TEXT',
        createdAt: 'TEXT'
      }
    },
    instantservices: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        employeeId: 'TEXT',
        services: 'TEXT',
        total: 'REAL',
        receiptNumber: 'TEXT',
        barcode: 'TEXT',
        createdAt: 'TEXT'
      }
    },
    expenses: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        details: 'TEXT',
        amount: 'REAL',
        userId: 'TEXT',
        createdBy: 'TEXT',
        createdAt: 'TEXT'
      }
    },
    advances: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        userId: 'TEXT',
        createdBy: 'TEXT',
        amount: 'REAL',
        createdAt: 'TEXT'
      }
    },
    deductions: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        userId: 'TEXT',
        createdBy: 'TEXT',
        amount: 'REAL',
        reason: 'TEXT',
        createdAt: 'TEXT'
      }
    },
    packages: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        name: 'TEXT',
        price: 'REAL',
        type: 'TEXT',
        createdAt: 'TEXT'
      }
    },
    services: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        name: 'TEXT',
        price: 'REAL',
        type: 'TEXT',
        packageId: 'TEXT',
        createdAt: 'TEXT'
      }
    },
    systemsettings: {
      columns: {
        _id: 'TEXT PRIMARY KEY',
        key: 'TEXT',
        value: 'TEXT',
        updatedAt: 'TEXT'
      }
    }
  },
  indexes: {
    bookings_eventDate: { table: 'bookings', columns: ['eventDate'] },
    bookings_clientPhone: { table: 'bookings', columns: ['clientPhone'] },
    users_username: { table: 'users', columns: ['username'] },
    instant_receipt: { table: 'instantservices', columns: ['receiptNumber'] }
  }
};

const adapter = WASQLiteDBAdapter();

export const db = new PowerSyncDatabase({
  adapter,
  schema,
  database: {
    dbFilename: 'beauty-center.db',
    dbLocation: 'default'
  },
  flags: {
    enableMultiTabs: true
  }
});
