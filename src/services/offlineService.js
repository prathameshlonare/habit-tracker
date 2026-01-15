class OfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.queue = [];
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  addToQueue(action) {
    this.queue.push({
      ...action,
      timestamp: Date.now(),
      id: this.generateId()
    });
    this.saveQueue();
  }

  async processQueue() {
    if (!this.isOnline || this.queue.length === 0) return;
    
    const actions = [...this.queue];
    this.queue = [];
    
    for (const action of actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error('Sync failed:', error);
        this.queue.unshift(action); // Put back at front
        break;
      }
    }
    this.saveQueue();
  }

  async executeAction(action) {
    // This will be implemented by syncService
    console.log('Executing action:', action);
  }

  saveQueue() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  loadQueue() {
    const saved = localStorage.getItem('offlineQueue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getQueueLength() {
    return this.queue.length;
  }
}

export default new OfflineService();