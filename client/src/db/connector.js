import { PowerSyncBackendConnector } from '@powersync/web';

export class BeautyCenterConnector extends PowerSyncBackendConnector {
  async fetchCredentials() {
    const token = localStorage.getItem('token') || '';
    const endpoint = process.env.REACT_APP_POWERSYNC_URL || 'https://gharam.onrender.com/powersync';
    return { endpoint, token };
  }

  async uploadData(database) {
    // TODO: توصيل عمليات الرفع مع REST API حسب جداول ps_crud
    // placeholder لإبقاء الواجهة متماسكة أثناء الدمج التدريجي
    const pending = await database.getAll('SELECT * FROM ps_crud WHERE upload_state = 0');
    return pending;
  }

  async resolveConflict(local, remote) {
    // Last-Write-Wins مبدئياً لحين تخصيص سياسة مالية أدق
    if (!local || !local.updated_at) return remote;
    if (!remote || !remote.updated_at) return local;
    return new Date(local.updated_at) > new Date(remote.updated_at) ? local : remote;
  }
}
