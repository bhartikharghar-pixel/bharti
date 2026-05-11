/**
 * Bharti Jewellers - Core Database Engine
 * Technology: IndexedDB
 * Version: 13.0 (Enhanced Schema & Payments Support)
 */

const DB_NAME = 'BhartiJewellersDB';
const DB_VERSION = 13; // Bumped to add Payment History table

const dbPromise = new Promise((resolve, reject) => {
    console.log(`[DB] Opening Database: ${DB_NAME} (v${DB_VERSION})...`);
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
        console.log(`[DB] Upgrade needed from v${event.oldVersion} to v${DB_VERSION}`);
        const db = event.target.result;
        const tx = event.target.transaction;

        // --- Robust Table Creator Helper ---
        // Safely creates tables or adds missing indexes without data loss
        function createStore(name, keyPath = 'id', autoIncrement = true, indexes = []) {
            let store;
            if (!db.objectStoreNames.contains(name)) {
                console.log(`[DB] Creating table: ${name}`);
                store = db.createObjectStore(name, { keyPath, autoIncrement });
            } else {
                store = tx.objectStore(name);
            }

            indexes.forEach(idx => {
                if (!store.indexNames.contains(idx.name)) {
                    console.log(`[DB] Adding index '${idx.name}' to ${name}`);
                    store.createIndex(idx.name, idx.keyPath, idx.options);
                }
            });
        }

        // --- 1. Settings (Global App Config) ---
        createStore('settings', 'key', false);

        // --- 2. Merchants (Suppliers) ---
        createStore('merchants', 'id', true, [
            { name: 'name', keyPath: 'name', options: { unique: false } }
        ]);

        // --- 3. Merchant Payments (NEW: Tracks Cash/Gold given to merchants) ---
        createStore('merchant_payments', 'id', true, [
            { name: 'merchantId', keyPath: 'merchantId', options: { unique: false } },
            { name: 'date', keyPath: 'date', options: { unique: false } }
        ]);

        // --- 4. Customers (Buyers) ---
        createStore('customers', 'id', true, [
            { name: 'mobile', keyPath: 'mobile', options: { unique: true } },
            { name: 'name', keyPath: 'name', options: { unique: false } }
        ]);

        // --- 5. Purchases (Inward Stock) ---
        createStore('purchases', 'id', true, [
            { name: 'merchantId', keyPath: 'merchantId', options: { unique: false } },
            { name: 'date', keyPath: 'date', options: { unique: false } }
        ]);

        // --- 6. Inventory (Stock Items) ---
        createStore('inventory', 'id', true, [
            { name: 'barcode', keyPath: 'barcode', options: { unique: true } },
            { name: 'category', keyPath: 'category', options: { unique: false } },
            { name: 'status', keyPath: 'status', options: { unique: false } },
            { name: 'purity', keyPath: 'purity', options: { unique: false } }
        ]);

        // --- 7. Sales (Outward Invoices) ---
        createStore('sales', 'id', true, [
            { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
            { name: 'date', keyPath: 'date', options: { unique: false } }
        ]);

        // --- 8. Loans (Mortgages) ---
        createStore('loans', 'id', true, [
            { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
            { name: 'status', keyPath: 'status', options: { unique: false } }
        ]);

        // --- 9. Rate Cuts (Rate Fixing) ---
        createStore('rate_cuts', 'id', true, [
            { name: 'merchantId', keyPath: 'merchantId', options: { unique: false } },
            { name: 'status', keyPath: 'status', options: { unique: false } }
        ]);
    };

    request.onsuccess = (event) => {
        console.log('[DB] Database Connected Successfully.');
        resolve(event.target.result);
    };

    request.onerror = (event) => {
        console.error('[DB] Critical Error:', event.target.error);
        alert("Database Error: " + event.target.error.message);
        reject(event.target.error);
    };
});

// --- API Helper Functions (Standardized) ---

// 1. Add Data
async function addItem(storeName, data) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => {
            console.error(`[DB] Add Error (${storeName}):`, e.target.error);
            reject(e.target.error);
        };
    });
}

// 2. Get All Data
async function getAllItems(storeName) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 3. Get Single Item by ID
async function getItem(storeName, id) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(parseInt(id));

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 4. Update Data
async function updateItem(storeName, data) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 5. Delete Data
async function deleteItem(storeName, id) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(parseInt(id));

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 6. Get Settings
async function getSetting(key) {
    const db = await dbPromise;
    return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const request = tx.objectStore('settings').get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => resolve(null);
    });
}

// 7. Auto-Generate Barcode (Robust Version)
async function generateBarcode(prefix) {
    try {
        const items = await getAllItems('inventory');
        // Filter items matching the category prefix
        const catItems = items.filter(i => i.barcode && i.barcode.startsWith(prefix));
        
        let maxNum = 0;
        catItems.forEach(item => {
            // Safe parsing: Remove non-numeric chars after prefix
            const numStr = item.barcode.replace(prefix, '');
            const numPart = parseInt(numStr);
            if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
        });

        const nextNum = maxNum + 1;
        // Pad with zeros: 5 -> 005
        return `${prefix}${String(nextNum).padStart(3, '0')}`;
    } catch (error) {
        console.error("Barcode Error:", error);
        return `${prefix}${Date.now().toString().slice(-4)}`; // Fallback unique ID
    }
}