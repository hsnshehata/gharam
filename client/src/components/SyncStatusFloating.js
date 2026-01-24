import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt, faCloudArrowUp, faWifi } from '@fortawesome/free-solid-svg-icons';
import { useRxdb } from '../db/RxdbProvider';

function SyncStatusFloating() {
  const { status } = useRxdb() || {};
  const lastSyncText = useMemo(() => {
    if (!status?.lastSync) return '—';
    try {
      return new Date(status.lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '—';
    }
  }, [status?.lastSync]);

  if (!status) return null;

  const online = status.online;
  const syncing = status.syncing;
  const pending = typeof status.pending === 'number' ? status.pending : 0;
  const badgeText = syncing ? '🟡 جاري المزامنة' : online ? '🟢 متصل' : '🔴 غير متصل';

  return (
    <div className={`sync-status-fab ${!online ? 'is-offline' : ''}`}>
      <div className="sync-row">
        <span className={`sync-dot ${syncing ? 'is-syncing' : online ? 'is-online' : 'is-offline'}`} aria-hidden="true" />
        <div className="sync-meta">
          <div className="sync-title">حالة المزامنة</div>
          <div className="sync-badge">{badgeText}</div>
        </div>
        {syncing && <FontAwesomeIcon icon={faSyncAlt} spin className="sync-icon" />}
        {!syncing && <FontAwesomeIcon icon={faWifi} className="sync-icon" />}
      </div>
      <div className="sync-row muted">
        <FontAwesomeIcon icon={faSyncAlt} className="sync-icon" />
        <span>آخر مزامنة: {lastSyncText}</span>
      </div>
      <div className="sync-row muted">
        <FontAwesomeIcon icon={faCloudArrowUp} className="sync-icon" />
        <span>الطوابير: {pending}</span>
      </div>
    </div>
  );
}

export default SyncStatusFloating;
