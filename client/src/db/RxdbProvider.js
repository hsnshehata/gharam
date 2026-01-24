import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { startReplication } from './replication';

const RxdbContext = createContext(null);

export function RxdbProvider({ token, children }) {
  const [collections, setCollections] = useState(null);
  const [queueOperation, setQueueOperation] = useState(null);
  const [status, setStatus] = useState({ online: typeof navigator !== 'undefined' ? navigator.onLine : true, syncing: false, lastSync: null, pending: 0 });

  useEffect(() => {
    let stop;
    let mounted = true;
    if (!token) {
      setCollections(null);
      setQueueOperation(null);
      setStatus((s) => ({ ...s, syncing: false, pending: 0 }));
      return () => {};
    }

    (async () => {
      const { collections: cols, queueOperation: qOp, stop: stopFn } = await startReplication(token, (nextStatus) => {
        if (mounted) setStatus(nextStatus);
      });
      if (!mounted) {
        stopFn?.();
        return;
      }
      stop = stopFn;
      setCollections(cols);
      setQueueOperation(() => qOp);
    })();

    return () => {
      mounted = false;
      if (stop) stop();
    };
  }, [token]);

  const value = useMemo(() => ({ collections, queueOperation, status }), [collections, queueOperation, status]);

  return <RxdbContext.Provider value={value}>{children}</RxdbContext.Provider>;
}

export function useRxdb() {
  return useContext(RxdbContext);
}
