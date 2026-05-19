// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA2jrYahFtup857gd7_OTtA967boF8N_3I",
    authDomain: "goldflow-aac03.firebaseapp.com",
    projectId: "goldflow-aac03",
    storageBucket: "goldflow-aac03.firebasestorage.app",
    messagingSenderId: "454558793172",
    appId: "1:454558793172:web:288f594c0da9b83b2caa41"
};

// 2. Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
console.log(`[DB] Firebase Database Connected Successfully!`);

function parseKey(id) {
    return String(id);
}

// --- API Helper Functions ---
async function addItem(storeName, data) {
    try {
        let docRef;
        if (storeName === 'settings' && data.key) {
            docRef = db.collection(storeName).doc(parseKey(data.key));
        } else {
            docRef = db.collection(storeName).doc(); 
            data.id = docRef.id; 
        }
        await docRef.set(data);
        return storeName === 'settings' ? data.key : data.id;
    } catch (e) {
        console.error(`[DB] Add Error:`, e);
        throw e;
    }
}

async function getAllItems(storeName) {
    try {
        const snapshot = await db.collection(storeName).get();
        let items = [];
        snapshot.forEach(doc => {
            let data = doc.data();
            if(storeName !== 'settings') data.id = doc.id;
            items.push(data);
        });
        return items;
    } catch (e) {
        console.error(`[DB] GetAll Error:`, e);
        return [];
    }
}

async function getItem(storeName, id) {
    try {
        const doc = await db.collection(storeName).doc(parseKey(id)).get();
        if (doc.exists) {
            let data = doc.data();
            if(storeName !== 'settings') data.id = doc.id;
            return data;
        }
        return null;
    } catch (e) {
        console.error(`[DB] GetItem Error:`, e);
        return null;
    }
}

async function updateItem(storeName, data) {
    try {
        let docId = storeName === 'settings' ? data.key : data.id;
        if (!docId) throw new Error("ID/Key is missing for update");
        
        await db.collection(storeName).doc(parseKey(docId)).set(data, { merge: true });
        return data;
    } catch (e) {
        console.error(`[DB] Update Error:`, e);
        throw e;
    }
}

async function deleteItem(storeName, id) {
    try {
        await db.collection(storeName).doc(parseKey(id)).delete();
        return true;
    } catch (e) {
        console.error(`[DB] Delete Error:`, e);
        throw e;
    }
}

async function getSetting(key) {
    try {
        const doc = await db.collection('settings').doc(parseKey(key)).get();
        return doc.exists ? doc.data().value : null;
    } catch (e) {
        console.error("[DB] GetSetting Error:", e);
        return null;
    }
}

async function generateBarcode(prefix) {
    try {
        const items = await getAllItems('inventory');
        const catItems = items.filter(i => i.barcode && i.barcode.startsWith(prefix));
        let maxNum = 0;
        
        catItems.forEach(item => {
            const suffix = item.barcode.substring(prefix.length);
            const match = suffix.match(/^\d+/);
            if (match) {
                const numPart = parseInt(match[0], 10);
                if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            }
        });
        
        const nextNum = maxNum + 1;
        return `${prefix}${String(nextNum).padStart(3, '0')}`;
    } catch (error) {
        return `${prefix}${Date.now().toString().slice(-4)}`;
    }
}
