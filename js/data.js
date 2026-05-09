const DB_KEY = 'saveen_cms_data';

const defaultData = {
    users: [
        { id: 'u1', username: 'saveen', pin: '760543250', role: 'admin', assignedPageIds: [], chatEnabled: true },
        { id: 'u2', username: 'support', pin: '1234', role: 'admin', assignedPageIds: [], chatEnabled: true, profilePic: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
        { id: 'u3', username: 'testuser', pin: '0000', role: 'user', assignedPageIds: [], chatEnabled: true, profilePic: 'https://cdn-icons-png.flaticon.com/512/147/147144.png' }
    ],
    pages: [
        { id: 'home', title: 'Home', content: '<h1 class="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-500">Welcome</h1><p class="text-xl text-gray-600 dark:text-gray-300">This is Saveen Sathsara\'s Personal Web Platform.</p>', isSystem: true }
    ],
    forms: [],
    formSubmissions: [],
    galleries: [],
    userRequests: [],
    settings: {
        logo: '',
        siteName: 'Saveen Sathsara'
    }
};

let cloudDataCache = null;

// ඔයා ලබා දුන් කේතය
const firebaseConfig = {
    apiKey: "AIzaSyAZbz94Xu3Kcc-yp5nbrKZuu_TRzYj9ZXk",
    authDomain: "saveen-aac00.firebaseapp.com",
    databaseURL: "https://saveen-aac00-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "saveen-aac00",
    storageBucket: "saveen-aac00.firebasestorage.app",
    messagingSenderId: "750117066979",
    appId: "1:750117066979:web:16ce2db451beab98e80dd6"
};

// Firebase V8 සක්‍රිය කිරීම (Local file එකකින් වුනත් වැඩ කරයි)
try {
    firebase.initializeApp(firebaseConfig);
    window.dbRef = firebase.database().ref("website/mainData");
    
    // Cloud එකෙන් දත්ත Real-time ලබා ගැනීම
    window.dataInitialized = new Promise((resolve, reject) => {
        window.dbRef.on('value', (snap) => {
            if (snap.exists()) {
                cloudDataCache = snap.val();
                // දත්ත වෙනස් වුනොත් Auto Refresh වෙනවා
                if (window.appReady && typeof render === 'function') {
                    render();
                }
            } else {
                cloudDataCache = defaultData;
                window.dbRef.set(defaultData);
            }
            resolve();
        }, (error) => {
            console.error("Firebase error:", error);
            alert("Firebase Database Error: " + error.message);
            reject(error);
        });
    });

} catch (err) {
    console.error("Firebase load error. Offline mode activated.", err);
    alert("Firebase Database Error: " + err.message);
    const local = localStorage.getItem(DB_KEY);
    cloudDataCache = local ? JSON.parse(local) : defaultData;
    window.dataInitialized = Promise.resolve();
}

// දත්ත ලබා දෙන function එක
function getDB() {
    let dbData = cloudDataCache;
    if (!dbData) {
        dbData = defaultData;
    }
    
    // Firebase හි හිස් Arrays Save නොවන නිසා ඒවා නැති නම් නැවත සකසන්න
    if (!dbData.users) dbData.users = [];
    if (!dbData.pages) dbData.pages = [];
    if (!dbData.forms) dbData.forms = [];
    if (!dbData.formSubmissions) dbData.formSubmissions = [];
    if (!dbData.galleries) dbData.galleries = [];
    if (!dbData.userRequests) dbData.userRequests = [];
    if (!dbData.settings) dbData.settings = { logo: '', siteName: 'Saveen Sathsara' };

    // Migration: assignedPageId -> assignedPageIds
    dbData.users.forEach(u => {
        if (u.assignedPageId !== undefined) {
            if (!u.assignedPageIds) {
                u.assignedPageIds = u.assignedPageId ? [u.assignedPageId] : [];
            }
            delete u.assignedPageId;
        }
        if (!u.assignedPageIds) {
            u.assignedPageIds = [];
        }
        if (u.profilePic === undefined) {
            u.profilePic = '';
        }
    });
    
    return dbData;
}

// දත්ත Save කරන function එක
function saveDB(data) {
    cloudDataCache = data;
    
    // Backup එකක් විදිහට Browser එකෙත් Save කරනවා
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    
    // Cloud එකට Save කරනවා
    if (window.dbRef) {
        window.dbRef.set(data).then(() => {
            console.log("Data saved to Firebase Realtime DB!");
        }).catch((err) => {
            console.error("Save error:", err);
            alert("Database Error: දත්ත Save කිරීමට නොහැකි විය. Error: " + err.message);
        });
    }
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
