const DB_KEY = 'saveen_cms_data';

const defaultData = {
    users: [
        { id: 'u1', username: 'saveen', pin: '760543250', role: 'admin', assignedPageId: null }
    ],
    pages: [
        { id: 'home', title: 'Home', content: '<h1 class="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-500">Welcome</h1><p class="text-xl text-gray-300">This is Saveen Sathsara\'s Personal Web Platform.</p>', isSystem: true }
    ],
    forms: [],
    formSubmissions: []
};

function initDB() {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(defaultData));
    }
}

function getDB() {
    return JSON.parse(localStorage.getItem(DB_KEY));
}

function saveDB(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

initDB();
