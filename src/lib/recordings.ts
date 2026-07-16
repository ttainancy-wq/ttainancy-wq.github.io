import type { RecordingMeta } from '../types/progress'

const DATABASE = 'forest-english-recordings'
const STORE = 'recordings'
const VERSION = 1

export interface StoredRecording {
  meta: RecordingMeta
  blob: Blob
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'meta.id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveRecording(recording: StoredRecording): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(recording)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export async function listRecordings(): Promise<StoredRecording[]> {
  if (!('indexedDB' in window)) return []
  const database = await openDatabase()
  const result = await new Promise<StoredRecording[]>((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result as StoredRecording[])
    request.onerror = () => reject(request.error)
  })
  database.close()
  return result.sort((left, right) => right.meta.createdAt.localeCompare(left.meta.createdAt))
}

export async function deleteRecording(id: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}
