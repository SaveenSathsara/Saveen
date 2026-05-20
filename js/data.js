const DB_KEY = 'saveen_cms_data';

const defaultData = {
    users: [
        { id: 'u1', username: 'saveen', pin: '760543250', role: 'admin', assignedPageIds: [], chatEnabled: true, chatNumber: '11111', chatPin: '750711', profilePic: '', dirEnabled: true, dirLoginPin: '7605', dirViewPin: '7605', dirAddPin: '7605', dirEditPin: '7605', dirDeletePin: '7605', dirSearchFullNamePin: '7605' },
        { id: 'lx09fqlo7', username: 'sehiru', pin: '123456', role: 'user', assignedPageIds: ['user_directory'], chatEnabled: true, chatNumber: '22222', chatPin: '750711', profilePic: '', dirEnabled: true, dirLoginPin: '123456', dirViewPin: '123456', dirAddPin: '123456', dirEditPin: '123456', dirDeletePin: '123456', dirSearchFullNamePin: '123456' },
        { id: 'xejavtvx6', username: 'imira', pin: '123456', role: 'user', assignedPageIds: ['user_directory'], chatEnabled: true, chatNumber: '33333', chatPin: '750711', profilePic: '', dirEnabled: true, dirLoginPin: '123456', dirViewPin: '123456', dirAddPin: '123456', dirEditPin: '123456', dirDeletePin: '123456', dirSearchFullNamePin: '123456' },
        { id: 'kiylj5vvs', username: 'vishwa', pin: '123456', role: 'user', assignedPageIds: ['user_directory'], chatEnabled: true, chatNumber: '44444', chatPin: '750711', profilePic: '', dirEnabled: true, dirLoginPin: '123456', dirViewPin: '123456', dirAddPin: '123456', dirEditPin: '123456', dirDeletePin: '123456', dirSearchFullNamePin: '123456' },
        { id: 'tj94hfok7', username: 'sathsara', pin: '123456', role: 'user', assignedPageIds: ['user_directory'], chatEnabled: true, chatNumber: '55555', chatPin: '750711', profilePic: '', dirEnabled: true, dirLoginPin: '123456', dirViewPin: '123456', dirAddPin: '123456', dirEditPin: '123456', dirDeletePin: '123456', dirSearchFullNamePin: '123456' }
    ],
    pages: [
        { id: 'home', title: 'Home', content: '<h1 class="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-500">Welcome</h1><p class="text-xl text-gray-600 dark:text-gray-300">This is Saveen Sathsara\'s Personal Web Platform.</p>', isSystem: true },
        { id: 'user_directory', title: 'Member Directory', content: '[USER_DIRECTORY]', isSystem: false, showInNav: false }
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
    if (!dbData.directoryUsers) dbData.directoryUsers = [];
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

    // Auto-inject Member Directory page definition if it doesn't exist
    if (dbData.pages && !dbData.pages.find(p => p.id === 'user_directory')) {
        dbData.pages.push({ id: 'user_directory', title: 'Member Directory', content: '[USER_DIRECTORY]', isSystem: false, showInNav: false });
    }

    // Auto-inject Inventory page definition if it doesn't exist
    if (dbData.pages && !dbData.pages.find(p => p.id === 'inventory')) {
        dbData.pages.push({ id: 'inventory', title: 'Inventory Management', content: '[INVENTORY]', isSystem: false, showInNav: false });
    }

    // Auto-inject Live Games page definition if it doesn't exist
    if (dbData.pages && !dbData.pages.find(p => p.id === 'live_games')) {
        dbData.pages.push({ id: 'live_games', title: 'Live Games', content: '[LIVE_GAMES]', isSystem: false, showInNav: false });
    }



    // Ensure all users have a bankAccount initialized
    dbData.users.forEach(u => {

    });

    // Initialize Inventory Data Structures
    if (!dbData.inventoryItems) dbData.inventoryItems = [];
    if (!dbData.inventoryCategories) {
        dbData.inventoryCategories = [
            { id: 'cat_books', name: 'Books' }
        ];
    }
    if (dbData.inventoryCategories && !dbData.inventoryCategories.find(c => c.name.toLowerCase() === 'books')) {
        dbData.inventoryCategories.push({ id: 'cat_books', name: 'Books' });
    }
    if (!dbData.inventoryLocations) dbData.inventoryLocations = [];
    if (!dbData.inventoryPlaces) dbData.inventoryPlaces = [];

    // Initialize Live Games Data Structures
    if (!dbData.gamesState) {
        dbData.gamesState = {
            rooms: {},
            activePlayers: {}
        };
    }

    // Ensure all users have an Inventory Access PIN field initialized and gameScores
    dbData.users.forEach(u => {
        if (u.invAccessPin === undefined) {
            u.invAccessPin = u.role === 'admin' ? '2014518' : '123456';
        }
        if (u.gameScores === undefined) {
            u.gameScores = {};
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
