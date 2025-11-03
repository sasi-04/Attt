import { useEffect, useCallback, useRef } from 'react'
import wsManager from '../utils/websocket.js'

export function useWebSocket() {
  const isConnectedRef = useRef(false)

  useEffect(() => {
    // Connect to WebSocket when hook is first used
    if (!isConnectedRef.current) {
      wsManager.connect()
      isConnectedRef.current = true
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect here as other components might be using it
      // The WebSocket manager handles connection lifecycle
    }
  }, [])

  const subscribe = useCallback((eventType, callback) => {
    return wsManager.subscribe(eventType, callback)
  }, [])

  const unsubscribe = useCallback((eventType, callback) => {
    wsManager.unsubscribe(eventType, callback)
  }, [])

  const isConnected = useCallback(() => {
    return wsManager.isSocketConnected()
  }, [])

  return {
    subscribe,
    unsubscribe,
    isConnected
  }
}

// Specific hooks for different update types
export function useAdminUpdates(callback) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribe = subscribe('all', callback)
    return unsubscribe
  }, [subscribe, callback])
}

export function useDepartmentUpdates(callback) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribeDeptCreated = subscribe('department-created', callback)
    const unsubscribeYearCreated = subscribe('year-created', callback)
    
    return () => {
      unsubscribeDeptCreated()
      unsubscribeYearCreated()
    }
  }, [subscribe, callback])
}

export function useStaffUpdates(callback) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribeCreated = subscribe('staff-created', callback)
    const unsubscribeUpdated = subscribe('staff-updated', callback)
    const unsubscribeDeleted = subscribe('staff-deleted', callback)
    
    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
    }
  }, [subscribe, callback])
}

export function useStudentUpdates(callback) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribeCreated = subscribe('student-created', callback)
    const unsubscribeDeleted = subscribe('student-deleted', callback)
    
    return () => {
      unsubscribeCreated()
      unsubscribeDeleted()
    }
  }, [subscribe, callback])
}
