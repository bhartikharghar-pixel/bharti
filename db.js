/**
 * Bharti Jewellers - Core Database Engine (ONLINE CLOUD)
 * Technology: Firebase Cloud Firestore
 * Features: Real-time Sync + Offline Superfast Support
 * Version: 36.0 (Cloud Migration)
 */

// 1. Firebase Project Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBh0emDQ7xnRsOceWb6lqxJDAFV_AQ3G-k",
    authDomain: "thegoldflow-c0826.firebaseapp.com",
    projectId: "thegoldflow-c0826",
    storageBucket: "thegoldflow-c0826.firebasestorage.app",
    messagingSenderId: "586826669323",
    appId: "1:586826669323:web:61ebedb4806a7683db560e",
    measurementId: "G-6PBMEG5QK5"
};

// 2. Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 3. 🔥 OFFLINE JADOO (Local Cache Enable Karna) 🔥
// Ye line ensure karegi ki app bina internet ke bhi fast chale aur data save ho
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log("[DB] Multiple tabs open hain, offline mode ek tab me chalega.");
        } else if (err.code == 'unimplemented') {
            console.log("[DB] Is browser me offline support nahi hai.");
        }
    });

// --- API Helper Functions ---
// Ye functions wese hi kaam karenge jaise pehle karte the, taaki HTML files change na karni pade.

async function addItem(storeName, data) {
    try {
        // Agar ID nahi hai toh naya ID banayenge (Date.now use karke)
        if (!data.id) {
            data.id = Date.now().toString(); 
        } else {
            data.id = data.id.toString();
        }
        await db.collection(storeName).doc(data.id).set(data);
        return data.id;
    } catch (error) {
        console.error(`[DB] Add Error (${storeName}):`, error);
        throw error;
    }
}

async function getAllItems(storeName) {
    try {
        const snapshot = await db.collection(storeName).get();
        const items = [];
        snapshot.forEach((doc) => {
            items.push(doc.data());
        });
        return items;
    } catch (error) {
        console.error(`[DB] GetAll Error (${storeName}):`, error);
        throw error;
    }
}

async function getItem(storeName, id) {
    try {
        const docRef = await db.collection(storeName).doc(id.toString()).get();
        return docRef.exists ? docRef.data() : null;
    } catch (error) {
        console.error(`[DB] GetItem Error (${storeName}):`, error);
        throw error;
    }
}

async function updateItem(storeName, data) {
    try {
        // Settings table me 'key' use hota hai, baaki sab me 'id'
        const docId = (data.id || data.key).toString();
        await db.collection(storeName).doc(docId).set(data, { merge: true });
        return true;
    } catch (error) {
        console.error(`[DB] Update Error (${storeName}):`, error);
        throw error;
    }
}

async function deleteItem(storeName, id) {
    try {
        await db.collection(storeName).doc(id.toString()).delete();
        return true;
    } catch (error) {
        console.error(`[DB] Delete Error (${storeName}):`, error);
        throw error;
    }
}

async function getSetting(key) {
    try {
        const docRef = await db.collection('settings').doc(key.toString()).get();
        return docRef.exists ? docRef.data().value : null;
    } catch (error) {
        console.error(`[DB] GetSetting Error:`, error);
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
        console.error("[DB] Barcode Error:", error);
        return `${prefix}${Date.now().toString().slice(-4)}`; 
    }
}
