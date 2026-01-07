import { vi } from "vitest";

// In-memory store for mock Firestore data
const mockStore: Map<string, Map<string, any>> = new Map();

// Helper to get a collection's data
function getCollection(path: string): Map<string, any> {
  if (!mockStore.has(path)) {
    mockStore.set(path, new Map());
  }
  return mockStore.get(path)!;
}

// Mock document reference
function createMockDocRef(collectionPath: string, docId: string) {
  return {
    id: docId,
    path: `${collectionPath}/${docId}`,
    get: vi.fn().mockImplementation(async () => {
      const collection = getCollection(collectionPath);
      const data = collection.get(docId);
      return {
        exists: !!data,
        id: docId,
        data: () => data,
        ref: { id: docId, path: `${collectionPath}/${docId}` },
      };
    }),
    set: vi.fn().mockImplementation(async (data: any, options?: { merge?: boolean }) => {
      const collection = getCollection(collectionPath);
      if (options?.merge) {
        const existing = collection.get(docId) || {};
        collection.set(docId, { ...existing, ...data });
      } else {
        collection.set(docId, data);
      }
    }),
    update: vi.fn().mockImplementation(async (data: any) => {
      const collection = getCollection(collectionPath);
      const existing = collection.get(docId) || {};
      collection.set(docId, { ...existing, ...data });
    }),
    delete: vi.fn().mockImplementation(async () => {
      const collection = getCollection(collectionPath);
      collection.delete(docId);
    }),
    collection: (subCollectionPath: string) =>
      createMockCollectionRef(`${collectionPath}/${docId}/${subCollectionPath}`),
  };
}

// Mock collection reference
function createMockCollectionRef(path: string) {
  return {
    path,
    doc: (docId?: string) => {
      const id = docId || `auto_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      return createMockDocRef(path, id);
    },
    add: vi.fn().mockImplementation(async (data: any) => {
      const id = `auto_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const collection = getCollection(path);
      collection.set(id, { ...data, id });
      return createMockDocRef(path, id);
    }),
    get: vi.fn().mockImplementation(async () => {
      const collection = getCollection(path);
      const docs = Array.from(collection.entries()).map(([id, data]) => ({
        id,
        data: () => data,
        exists: true,
        ref: { id, path: `${path}/${id}` },
      }));
      return {
        empty: docs.length === 0,
        size: docs.length,
        docs,
        forEach: (callback: (doc: any) => void) => docs.forEach(callback),
      };
    }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
  };
}

// Mock Firestore instance
export const mockFirestore = {
  collection: vi.fn().mockImplementation((path: string) => createMockCollectionRef(path)),
  doc: vi.fn().mockImplementation((path: string) => {
    const parts = path.split("/");
    const docId = parts.pop()!;
    const collectionPath = parts.join("/");
    return createMockDocRef(collectionPath, docId);
  }),
  batch: vi.fn().mockReturnValue({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
  runTransaction: vi.fn().mockImplementation(async (callback: any) => {
    const transaction = {
      get: vi.fn().mockImplementation(async (docRef: any) => docRef.get()),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    return callback(transaction);
  }),
};

// Mock Firebase Admin
export const mockFirebaseAdmin = {
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
  },
  firestore: vi.fn(() => mockFirestore),
  apps: [],
};

// Seed test data
export function seedTestData(collectionPath: string, documents: Record<string, any>): void {
  const collection = getCollection(collectionPath);
  for (const [id, data] of Object.entries(documents)) {
    collection.set(id, { ...data, id });
  }
}

// Clear all mock data
export function clearMockData(): void {
  mockStore.clear();
}

// Get all data from a collection (for assertions)
export function getMockCollection(path: string): Record<string, any> {
  const collection = getCollection(path);
  const result: Record<string, any> = {};
  for (const [id, data] of collection.entries()) {
    result[id] = data;
  }
  return result;
}

// Reset all mocks
export function resetFirebaseMock(): void {
  clearMockData();
  mockFirestore.collection.mockClear();
  mockFirestore.doc.mockClear();
  mockFirestore.batch.mockClear();
  mockFirestore.runTransaction.mockClear();
}
