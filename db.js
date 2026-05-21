/**
 * Bharti Jewellers - Core Database Engine
 * Technology: Firebase Cloud Firestore & Authentication
 * Version: 37.2 (Final Stable Integration)
 */

const firebaseConfig = {
    apiKey: "AIzaSyBh0emDQ7xnRsOceWb6lqxJDAFV_AQ3G-k",
    authDomain: "thegoldflow-c0826.firebaseapp.com",
    projectId: "thegoldflow-c0826",
    storageBucket: "thegoldflow-c0826.firebasestorage.app",
    messagingSenderId: "586826669323",
    appId: "1:586826669323:web:61ebedb4806a7683db560e",
    measurementId: "G-6PBMEG5QK5"
};

// 1. Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// 2. 🚀 CRITICAL: dbPromise ko ek real Promise banaya hai 
// Taaki purane "await dbPromise" wale code mein koi error na aaye
const dbPromise = new Promise((resolve) => {
    resolve(db);
});

// 3. Offline Persistence
db.enablePersistence().catch((err) => {
    console.log("[DB] Offline mode info:", err.code);
});

// 4. Authentication Security Lock
firebase.auth().onAuthStateChanged((user) => {
    const currentPage = window.location.pathname.split('/').pop();
    if (!user) {
        if (currentPage !== 'login.html' && currentPage !== '') {
            window.location.href = 'login.html';
        }
    } else {
        if (currentPage === 'login.html') {
            window.location.href = 'index.html';
        }
    }
});

// --- API Helper Functions ---

async function addItem(storeName, data) {
    const id = data.id ? data.id.toString() : Date.now().toString();
    data.id = id;
    await db.collection(storeName).doc(id).set(data);
    return id;
}

async function getAllItems(storeName) {
    const snapshot = await db.collection(storeName).get();
    return snapshot.docs.map(doc => doc.data());
}

async function getItem(storeName, id) {
    const doc = await db.collection(storeName).doc(id.toString()).get();
    return doc.exists ? doc.data() : null;
}

async function updateItem(storeName, data) {
    const id = (data.id || data.key).toString();
    await db.collection(storeName).doc(id).set(data, { merge: true });
    return true;
}

async function deleteItem(storeName, id) {
    await db.collection(storeName).doc(id.toString()).delete();
    return true;
}

async function getSetting(key) {
    const doc = await db.collection('settings').doc(key.toString()).get();
    return doc.exists ? doc.data().value : null;
}

async function generateBarcode(prefix) {
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
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}
