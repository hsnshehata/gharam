import { addRxPlugin, createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

let dbPromise;

// تهيئة قاعدة بيانات RxDB مع دعم multi-tab
export async function getDatabase() {
  if (!dbPromise) {
    if (process.env.NODE_ENV !== 'production') {
      // وضع التطوير يعطي تحذيرات مبكرة لو في مشاكل مخطط
      const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode');
      addRxPlugin(RxDBDevModePlugin);
    }

    dbPromise = createRxDatabase({
      name: 'beautycenterdb',
      storage: getRxStorageDexie(),
      multiInstance: true,
      eventReduce: true
    });
  }

  return dbPromise;
}
