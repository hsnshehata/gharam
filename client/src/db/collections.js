import { getDatabase } from './database';
import {
  advanceSchema,
  bookingSchema,
  deductionSchema,
  expenseSchema,
  instantServiceSchema,
  packageSchema,
  serviceSchema,
  systemSettingSchema,
  userSchema,
  syncQueueSchema
} from './schemas';

let collectionsPromise;

export async function initCollections() {
  if (!collectionsPromise) {
    const db = await getDatabase();
    collectionsPromise = db.addCollections({
      bookings: { schema: bookingSchema },
      users: { schema: userSchema },
      instantServices: { schema: instantServiceSchema },
      expenses: { schema: expenseSchema },
      advances: { schema: advanceSchema },
      deductions: { schema: deductionSchema },
      packages: { schema: packageSchema },
      services: { schema: serviceSchema },
      systemSettings: { schema: systemSettingSchema },
      syncQueue: { schema: syncQueueSchema }
    });
  }

  return collectionsPromise;
}
