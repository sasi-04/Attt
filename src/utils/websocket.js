import { io } from 'socket.io-client'

class WebSocketManager {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.isConnected = false
  }

  connect() {
    if (this.socket) {
      return this.socket
    }

    // Connect to the backend WebSocket server
    this.socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id)
      this.isConnected = true
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.isConnected = false
    })

    this.socket.on('admin-update', (update) => {
      console.log('Received admin update:', update)
      this.handleAdminUpdate(update)
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })

    return this.socket
  }

  handleAdminUpdate(update) {
    const { type, data } = update
    
    // Notify all registered listeners for this update type
    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type)
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in WebSocket listener:', error)
        }
      })
    }

    // Notify listeners for 'all' updates
    if (this.listeners.has('all')) {
      const callbacks = this.listeners.get('all')
      callbacks.forEach(callback => {
        try {
          callback(update)
        } catch (error) {
          console.error('Error in WebSocket listener:', error)
        }
      })
    }
  }

  // Subscribe to specific update types
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType).add(callback)

    // Return unsubscribe function
    return () => {
      if (this.listeners.has(eventType)) {
        this.listeners.get(eventType).delete(callback)
        if (this.listeners.get(eventType).size === 0) {
          this.listeners.delete(eventType)
        }
      }
    }
  }

  // Unsubscribe from updates
  unsubscribe(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback)
      if (this.listeners.get(eventType).size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.listeners.clear()
    }
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected
  }
}

// Create a singleton instance
const wsManager = new WebSocketManager()

export default wsManager
