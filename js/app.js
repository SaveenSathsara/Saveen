// Global State
let currentUser = null;
let currentView = 'home'; // home, login, admin, userView, publicPage
let adminTab = 'pages'; // pages, users, forms, galleries
let activeModal = null; // modal id if open
let activePublicPageId = null; // public page id being viewed
let activeUserPageId = null; // user page id being viewed

const appContainer = document.getElementById('app');

function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('themeToggleIcon');
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (icon) icon.className = 'fas fa-moon';
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if (icon) icon.className = 'fas fa-sun';
    }
}

function navigate(view) {
    currentView = view;
    render();
}

function switchAdminTab(tab) {
    adminTab = tab;
    render();
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const pin = document.getElementById('pin').value;
    const errorEl = document.getElementById('loginError');
    
    const db = getDB();
    const user = db.users.find(u => u.username === username && u.pin === pin);
    
    if (user) {
        currentUser = user;
        if (user.role === 'admin') {
            navigate('admin');
        } else {
            activeUserPageId = user.assignedPageIds && user.assignedPageIds.length > 0 ? user.assignedPageIds[0] : null;
            navigate('userView');
        }
    } else {
        errorEl.innerText = 'Invalid username or PIN';
        errorEl.classList.remove('hidden');
    }
}

function openResetPinModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center modal-overlay fade-in p-4';
    modal.innerHTML = `
        <div class="glass-panel w-full max-w-md rounded-2xl p-8 slide-up relative overflow-hidden">
            <div class="absolute -top-20 -right-20 w-40 h-40 bg-purple-400 dark:bg-purple-500 rounded-full mix-blend-multiply filter blur-[60px] opacity-30 dark:opacity-40 pointer-events-none"></div>
            
            <div class="flex justify-between items-center mb-6 relative z-10">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">Reset PIN</h3>
                <button onclick="closeModal()" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <form id="resetPinForm" onsubmit="handleResetPin(event)" class="space-y-4 relative z-10">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                    <input type="text" id="resetUsername" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500" placeholder="Username">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Old PIN</label>
                    <input type="password" id="resetOldPin" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500" placeholder="••••••••">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New PIN</label>
                    <input type="password" id="resetNewPin" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500" placeholder="••••••••">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New PIN</label>
                    <input type="password" id="resetConfirmPin" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500" placeholder="••••••••">
                </div>
                
                <div id="resetError" class="text-red-500 dark:text-red-400 text-sm hidden bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-500/30 text-center"></div>
                <div id="resetSuccess" class="text-green-500 dark:text-green-400 text-sm hidden bg-green-100 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-500/30 text-center"></div>
                
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="closeModal()" class="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
                    <button type="submit" class="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all shadow-lg shadow-brand-500/30 glow-btn">Update PIN</button>
                </div>
            </form>
        </div>
    `;
    activeModal = modal;
    render();
}

function handleResetPin(e) {
    e.preventDefault();
    const username = document.getElementById('resetUsername').value;
    const oldPin = document.getElementById('resetOldPin').value;
    const newPin = document.getElementById('resetNewPin').value;
    const confirmPin = document.getElementById('resetConfirmPin').value;
    const errorEl = document.getElementById('resetError');
    const successEl = document.getElementById('resetSuccess');
    
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');
    
    if (newPin !== confirmPin) {
        errorEl.innerText = 'New PIN and Confirm PIN do not match!';
        errorEl.classList.remove('hidden');
        return;
    }
    
    const db = getDB();
    const user = db.users.find(u => u.username === username && u.pin === oldPin);
    
    if (user) {
        user.pin = newPin;
        saveDB(db);
        successEl.innerText = 'PIN updated successfully! You can now login with your new PIN.';
        successEl.classList.remove('hidden');
        setTimeout(() => closeModal(), 3000);
    } else {
        errorEl.innerText = 'Invalid username or old PIN!';
        errorEl.classList.remove('hidden');
    }
}

function logout() {
    currentUser = null;
    navigate('home');
}

function render() {
    appContainer.innerHTML = '';
    renderNavbar();
    
    const mainContent = document.createElement('main');
    mainContent.className = 'flex-grow flex flex-col pt-24 px-4 md:px-8 max-w-7xl mx-auto w-full slide-up z-10';
    
    if (currentView === 'home') {
        mainContent.appendChild(createHomeView());
    } else if (currentView === 'login') {
        mainContent.appendChild(createLoginView());
    } else if (currentView === 'admin') {
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('home');
            return;
        }
        mainContent.appendChild(createAdminView());
    } else if (currentView === 'userView') {
        if (!currentUser) {
            navigate('login');
            return;
        }
        mainContent.appendChild(createUserView());
    } else if (currentView === 'publicPage') {
        mainContent.appendChild(createPublicPageView());
    }

    appContainer.appendChild(mainContent);
    renderFooter();
    
    if (activeModal) {
        appContainer.appendChild(activeModal);
    }
}

function renderNavbar() {
    const nav = document.createElement('nav');
    nav.className = 'fixed top-0 w-full z-50 glass-panel border-b-0 py-4 px-6 flex justify-between items-center transition-colors';
    
    const logo = document.createElement('div');
    logo.className = 'text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-purple-600 cursor-pointer flex items-center gap-2';
    logo.innerHTML = '<i class="fas fa-layer-group text-brand-500"></i> Saveen Sathsara';
    logo.onclick = () => navigate('home');
    
    const menu = document.createElement('div');
    menu.className = 'flex items-center gap-2 md:gap-4';
    
    const db = getDB();
    const navLinks = document.createElement('div');
    navLinks.className = 'hidden md:flex items-center gap-6 mr-4';
    db.pages.forEach(p => {
        if (p.showInNav && !p.isSystem) {
            const btn = document.createElement('button');
            btn.onclick = () => viewPublicPage(p.id);
            btn.className = 'text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-white transition-colors';
            btn.innerText = p.title;
            navLinks.appendChild(btn);
        }
    });
    menu.appendChild(navLinks);
    
    // Theme Toggle
    const themeBtn = document.createElement('button');
    themeBtn.onclick = toggleTheme;
    themeBtn.className = 'w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-300 transition-colors md:mr-2 hover:bg-gray-300 dark:hover:bg-slate-700';
    themeBtn.innerHTML = `<i id="themeToggleIcon" class="fas ${document.documentElement.classList.contains('dark') ? 'fa-sun' : 'fa-moon'}"></i>`;
    menu.appendChild(themeBtn);
    
    const authArea = document.createElement('div');
    authArea.className = 'flex items-center gap-2';
    
    if (!currentUser) {
        authArea.innerHTML = `<button onclick="navigate('login')" class="px-6 py-2 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all glow-btn shadow-lg shadow-brand-500/30">Login</button>`;
    } else {
        const dashboardBtn = currentUser.role === 'admin' 
            ? `<button onclick="navigate('admin')" class="px-3 md:px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-white transition-colors text-sm md:text-base">Dashboard</button>`
            : `<button onclick="navigate('userView')" class="px-3 md:px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-white transition-colors text-sm md:text-base">My Pages</button>`;
            
        const userAvatar = currentUser.profilePic 
            ? `<img src="${currentUser.profilePic}" class="w-8 h-8 rounded-full object-cover shadow-lg border border-white/20">`
            : `<div class="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    ${currentUser.username.charAt(0).toUpperCase()}
                </div>`;

        authArea.innerHTML = `
            ${dashboardBtn}
            <div class="flex items-center gap-3 ml-1 md:ml-2 border-l border-gray-300 dark:border-gray-700 pl-3 md:pl-4">
                ${userAvatar}
                <button onclick="logout()" class="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
    }
    menu.appendChild(authArea);
    
    nav.appendChild(logo);
    nav.appendChild(menu);
    appContainer.appendChild(nav);
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'py-6 text-center text-gray-500 dark:text-gray-400 text-sm mt-auto glass-panel border-t-0 z-10 transition-colors';
    footer.innerHTML = `&copy; ${new Date().getFullYear()} Saveen Sathsara. All rights reserved.`;
    appContainer.appendChild(footer);
}

function createHomeView() {
    const div = document.createElement('div');
    div.className = 'flex-grow flex flex-col items-center justify-center text-center pb-20';
    
    const db = getDB();
    const homePage = db.pages.find(p => p.id === 'home');
    
    div.innerHTML = `
        <div class="glass-panel p-10 md:p-16 rounded-3xl max-w-4xl w-full shadow-2xl relative overflow-hidden transition-colors">
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-brand-400 dark:bg-brand-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 dark:opacity-40 pointer-events-none"></div>
            <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-400 dark:bg-purple-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 dark:opacity-40 pointer-events-none"></div>
            
            <div class="relative z-10 prose prose-lg dark:prose-invert max-w-none text-center text-gray-800 dark:text-gray-200">
                ${homePage ? homePage.content : '<h1 class="text-5xl font-bold text-gray-900 dark:text-white">Welcome</h1>'}
            </div>
        </div>
    `;
    return div;
}

function createLoginView() {
    const div = document.createElement('div');
    div.className = 'flex-grow flex items-center justify-center pb-20';
    
    div.innerHTML = `
        <div class="glass-panel p-8 md:p-12 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden fade-in transition-colors">
            <div class="absolute -top-20 -right-20 w-40 h-40 bg-brand-400 dark:bg-brand-500 rounded-full mix-blend-multiply filter blur-[60px] opacity-30 dark:opacity-40 pointer-events-none"></div>
            
            <div class="text-center mb-8 relative z-10">
                <div class="w-16 h-16 bg-gradient-to-tr from-brand-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
                    <i class="fas fa-lock text-2xl text-white"></i>
                </div>
                <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h2>
                <p class="text-gray-600 dark:text-gray-400">Enter your credentials to access</p>
            </div>
            
            <form id="loginForm" class="space-y-6 relative z-10" onsubmit="handleLogin(event)">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 dark:text-gray-500"><i class="fas fa-user"></i></span>
                        <input type="text" id="username" required class="glass-input w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-500 border-none bg-white/50 dark:bg-slate-800/50" placeholder="Username">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PIN</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 dark:text-gray-500"><i class="fas fa-key"></i></span>
                        <input type="password" id="pin" required class="glass-input w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-500 border-none bg-white/50 dark:bg-slate-800/50" placeholder="••••••••">
                    </div>
                </div>
                
                <div id="loginError" class="text-red-500 dark:text-red-400 text-sm hidden bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-500/30 text-center"></div>
                
                <button type="submit" class="w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25 glow-btn mt-4">
                    Sign In <i class="fas fa-arrow-right ml-2"></i>
                </button>
                <div class="text-center mt-6">
                    <button type="button" onclick="openResetPinModal()" class="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Forgot PIN?</button>
                </div>
            </form>
        </div>
    `;
    return div;
}

function createAdminView() {
    const div = document.createElement('div');
    div.className = 'w-full flex-grow flex flex-col fade-in pb-10';
    
    div.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-1">Admin Dashboard</h1>
                <p class="text-gray-600 dark:text-gray-400">Manage your website content, users, and forms.</p>
            </div>
            
            <div class="flex p-1 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md">
                <button onclick="switchAdminTab('pages')" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ${adminTab === 'pages' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}">
                    <i class="fas fa-file-alt mr-2"></i>Pages
                </button>
                <button onclick="switchAdminTab('users')" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ${adminTab === 'users' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}">
                    <i class="fas fa-users mr-2"></i>Users
                </button>
                <button onclick="switchAdminTab('forms')" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ${adminTab === 'forms' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}">
                    <i class="fas fa-wpforms mr-2"></i>Forms
                </button>
                <button onclick="switchAdminTab('galleries')" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ${adminTab === 'galleries' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}">
                    <i class="fas fa-images mr-2"></i>Galleries
                </button>
                <button onclick="manualCloudSync()" class="ml-2 px-4 py-2 rounded-lg text-sm font-bold bg-green-500 hover:bg-green-600 text-white transition-all shadow-md flex items-center gap-2">
                    <i class="fas fa-cloud-upload-alt"></i> Save to Cloud
                </button>
            </div>
        </div>
        
        <div id="adminContent" class="glass-panel rounded-2xl p-6 min-h-[500px] transition-colors">
            <!-- Content loaded dynamically based on tab -->
        </div>
    `;
    
    setTimeout(() => {
        const contentDiv = document.getElementById('adminContent');
        if (contentDiv) {
            if (adminTab === 'pages') contentDiv.appendChild(renderAdminPages());
            if (adminTab === 'users') contentDiv.appendChild(renderAdminUsers());
            if (adminTab === 'forms') contentDiv.appendChild(renderAdminForms());
            if (adminTab === 'galleries') contentDiv.appendChild(renderAdminGalleries());
        }
    }, 0);
    
    return div;
}

// ---------------- Admin: Pages ----------------
function renderAdminPages() {
    const div = document.createElement('div');
    const db = getDB();
    
    let html = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Pages Management</h2>
            <button onclick="openPageModal()" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2">
                <i class="fas fa-plus"></i> New Page
            </button>
        </div>
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/5">
            <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 uppercase text-xs">
                    <tr>
                        <th class="px-6 py-4 font-medium">Title</th>
                        <th class="px-6 py-4 font-medium">ID / URL</th>
                        <th class="px-6 py-4 font-medium text-center">Nav Visible</th>
                        <th class="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-transparent">
    `;
    
    db.pages.forEach(p => {
        html += `
            <tr class="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">${p.title} ${p.isSystem ? '<span class="ml-2 text-[10px] bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 px-2 py-1 rounded">System</span>' : ''}</td>
                <td class="px-6 py-4 text-gray-500 dark:text-gray-400">${p.id}</td>
                <td class="px-6 py-4 text-center">
                    ${p.showInNav ? '<i class="fas fa-check text-green-500 dark:text-green-400"></i>' : '<i class="fas fa-times text-gray-300 dark:text-gray-600"></i>'}
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="openPageModal('${p.id}')" class="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 mr-3 transition-colors" title="Edit"><i class="fas fa-edit"></i></button>
                    ${!p.isSystem ? `<button onclick="deletePage('${p.id}')" class="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    div.innerHTML = html;
    return div;
}

function openPageModal(pageId = null) {
    const db = getDB();
    let page = { id: '', title: '', content: '' };
    let isEdit = false;
    
    if (pageId) {
        page = db.pages.find(p => p.id === pageId);
        isEdit = true;
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center modal-overlay fade-in p-4';
    modal.innerHTML = `
        <div class="glass-panel w-full max-w-3xl rounded-2xl p-6 md:p-8 slide-up relative overflow-hidden flex flex-col max-h-[90vh]">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">${isEdit ? 'Edit Page' : 'Create New Page'}</h3>
                <button onclick="closeModal()" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <div class="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <form id="pageForm" onsubmit="savePage(event, '${pageId || ''}')" class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page Title</label>
                        <input type="text" id="pageTitle" value="${page.title}" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    
                    ${!page.isSystem ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page ID (URL Slug, letters/numbers only)</label>
                        <input type="text" id="pageIdInput" value="${page.id}" ${isEdit ? 'readonly' : 'required'} pattern="[a-zA-Z0-9_-]+" class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500 ${isEdit ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-slate-800' : ''}">
                    </div>
                    <div>
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" id="pageShowInNav" ${page.showInNav ? 'checked' : ''} class="w-5 h-5 text-brand-500 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show in Main Navigation Menu (Public view)</span>
                        </label>
                    </div>` : ''}
                    
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Content (HTML allowed)</label>
                            <div class="flex gap-2">
                                <button type="button" onclick="insertShortcode('form')" class="text-xs bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"><i class="fas fa-wpforms mr-1 text-brand-500 dark:text-brand-400"></i> Form</button>
                                <button type="button" onclick="insertShortcode('gallery')" class="text-xs bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"><i class="fas fa-images mr-1 text-green-500 dark:text-green-400"></i> Gallery</button>
                                <button type="button" onclick="insertShortcode('youtube')" class="text-xs bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"><i class="fab fa-youtube mr-1 text-red-500 dark:text-red-400"></i> YouTube</button>
                                <button type="button" onclick="insertShortcode('gdoc')" class="text-xs bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"><i class="fas fa-file-alt mr-1 text-blue-500 dark:text-blue-400"></i> Google Doc/Form</button>
                            </div>
                        </div>
                        <textarea id="pageContent" required rows="10" class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500 font-mono text-sm">${page.content}</textarea>
                    </div>
                    
                    <div class="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-gray-200 dark:border-white/10 p-4 -mx-6 -mb-6 mt-4 flex justify-end">
                        <button type="button" onclick="closeModal()" class="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-4 transition-colors">Cancel</button>
                        <button type="submit" class="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all shadow-lg shadow-brand-500/30 glow-btn">Save Page</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    activeModal = modal;
    render();
}

function savePage(e, editId) {
    e.preventDefault();
    const db = getDB();
    const title = document.getElementById('pageTitle').value;
    const content = document.getElementById('pageContent').value;
    const showInNavEl = document.getElementById('pageShowInNav');
    const showInNav = showInNavEl ? showInNavEl.checked : false;
    
    let pageObj;
    if (editId) {
        pageObj = db.pages.find(p => p.id === editId);
        pageObj.title = title;
        pageObj.content = content;
        if (!pageObj.isSystem) pageObj.showInNav = showInNav;
    } else {
        const idInput = document.getElementById('pageIdInput').value;
        if (db.pages.find(p => p.id === idInput)) {
            alert('Page ID already exists!');
            return;
        }
        pageObj = {
            id: idInput,
            title: title,
            content: content,
            showInNav: showInNav
        };
        db.pages.push(pageObj);
    }
    
    saveDB(db);
    closeModal();
    render();
}

function deletePage(id) {
    if (confirm('Are you sure you want to delete this page?')) {
        const db = getDB();
        db.pages = db.pages.filter(p => p.id !== id);
        saveDB(db);
        render();
    }
}

function closeModal() {
    activeModal = null;
    render();
}

// ---------------- Admin: Users ----------------
function renderAdminUsers() {
    const div = document.createElement('div');
    const db = getDB();
    
    let html = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Users Management</h2>
            <button onclick="openUserModal()" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2">
                <i class="fas fa-user-plus"></i> New User
            </button>
        </div>
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/5">
            <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 uppercase text-xs">
                    <tr>
                        <th class="px-6 py-4 font-medium">Username</th>
                        <th class="px-6 py-4 font-medium">Role</th>
                        <th class="px-6 py-4 font-medium">Assigned Page</th>
                        <th class="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-transparent">
    `;
    
    db.users.forEach(u => {
        const assignedPages = (u.assignedPageIds || []).map(pid => db.pages.find(p => p.id === pid)?.title || pid);
        const pageNames = assignedPages.length > 0 ? assignedPages.join(', ') : 'None';
        html += `
            <tr class="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                    ${u.profilePic 
                        ? `<img src="${u.profilePic}" class="w-8 h-8 rounded-full object-cover">` 
                        : `<div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                ${u.username.charAt(0).toUpperCase()}
                           </div>`
                    }
                    ${u.username}
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold ${u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'}">
                        ${u.role}
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-500 dark:text-gray-400">${pageNames}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="openUserModal('${u.id}')" class="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 mr-3 transition-colors" title="Edit"><i class="fas fa-edit"></i></button>
                    ${u.username !== 'saveen' ? `<button onclick="deleteUser('${u.id}')" class="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    div.innerHTML = html;
    return div;
}

function openUserModal(userId = null) {
    const db = getDB();
    let user = { id: '', username: '', pin: '', role: 'user', assignedPageIds: [], profilePic: '' };
    let isEdit = false;
    
    if (userId) {
        user = db.users.find(u => u.id === userId);
        isEdit = true;
    }
    
    let pageOptions = '';
    db.pages.forEach(p => {
        const isSelected = (user.assignedPageIds || []).includes(p.id);
        pageOptions += `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${p.title}</option>`;
    });
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center modal-overlay fade-in p-4';
    modal.innerHTML = `
        <div class="glass-panel w-full max-w-md rounded-2xl p-6 md:p-8 slide-up relative">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">${isEdit ? 'Edit User' : 'Create New User'}</h3>
                <button onclick="closeModal()" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <form onsubmit="saveUser(event, '${userId || ''}')" class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                    <input type="text" id="userUsername" value="${user.username}" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500" ${user.username === 'saveen' ? 'readonly opacity-50 bg-gray-100 dark:bg-slate-800' : ''}>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PIN</label>
                    <input type="text" id="userPin" value="${user.pin}" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Picture URL</label>
                    <input type="text" id="userProfilePic" value="${user.profilePic || ''}" class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500" placeholder="https://example.com/image.jpg">
                </div>
                
                ${user.username !== 'saveen' ? `
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                    <select id="userRole" class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500 dark:[&>option]:bg-slate-800">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                ` : '<input type="hidden" id="userRole" value="admin">'}
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Pages (Hold Ctrl to select multiple)</label>
                    <select id="userAssignedPages" multiple class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500 dark:[&>option]:bg-slate-800 min-h-[120px]">
                        ${pageOptions}
                    </select>
                    <p class="text-[10px] text-gray-500 mt-1">Users will be able to see all selected pages after login.</p>
                </div>
                
                <div class="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-gray-200 dark:border-white/10 p-4 -mx-6 -mb-6 mt-4 flex justify-end">
                    <button type="button" onclick="closeModal()" class="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-4 transition-colors">Cancel</button>
                    <button type="submit" class="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all shadow-lg shadow-brand-500/30 glow-btn">Save User</button>
                </div>
            </form>
        </div>
    `;
    
    activeModal = modal;
    render();
}

function saveUser(e, editId) {
    e.preventDefault();
    const db = getDB();
    const username = document.getElementById('userUsername').value;
    const pin = document.getElementById('userPin').value;
    const role = document.getElementById('userRole').value;
    const profilePic = document.getElementById('userProfilePic').value;
    const assignedPagesSelect = document.getElementById('userAssignedPages');
        const assignedPageIds = Array.from(assignedPagesSelect.selectedOptions).map(opt => opt.value);
        
        if (editId) {
            const userObj = db.users.find(u => u.id === editId);
            userObj.username = username;
            userObj.pin = pin;
            if (userObj.username !== 'saveen') {
                userObj.role = role;
            }
            userObj.profilePic = profilePic;
            userObj.assignedPageIds = assignedPageIds;
        } else {
            if (db.users.find(u => u.username === username)) {
                alert('Username already exists!');
                return;
            }
            db.users.push({ id: generateId(), username, pin, role, profilePic, assignedPageIds });
        }
    
    saveDB(db);
    closeModal();
    render();
}

function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        const db = getDB();
        db.users = db.users.filter(u => u.id !== id);
        saveDB(db);
        render();
    }
}

// ---------------- Admin: Forms ----------------
function renderAdminForms() {
    const div = document.createElement('div');
    const db = getDB();
    
    let html = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Forms Management</h2>
            <button onclick="openFormModal()" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2">
                <i class="fas fa-plus"></i> New Form
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;
    
    if (db.forms.length === 0) {
        html += `<div class="col-span-full text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/5 border-dashed">No forms created yet.</div>`;
    }
    
    db.forms.forEach(f => {
        const submissionCount = db.formSubmissions.filter(s => s.formId === f.id).length;
        html += `
            <div class="glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/5 relative group hover:-translate-y-1 transition-transform">
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onclick="openFormModal('${f.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 flex items-center justify-center transition-colors"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteForm('${f.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 flex items-center justify-center transition-colors"><i class="fas fa-trash"></i></button>
                </div>
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                    <i class="fas fa-wpforms text-white text-xl"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">${f.title}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${f.fields.length} Fields</p>
                <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                    <span class="text-sm font-medium text-gray-600 dark:text-gray-300">${submissionCount} Submissions</span>
                    <button onclick="viewSubmissions('${f.id}')" class="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 text-sm font-medium transition-colors">View Data &rarr;</button>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    div.innerHTML = html;
    return div;
}

function openFormModal(formId = null) {
    const db = getDB();
    let form = { id: '', title: '', fields: [] };
    let isEdit = false;
    
    if (formId) {
        form = db.forms.find(f => f.id === formId);
        isEdit = true;
    }
    
    window._tempFormFields = JSON.parse(JSON.stringify(form.fields));
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center modal-overlay fade-in p-4';
    
    window.renderFieldsHTML = () => {
        if (window._tempFormFields.length === 0) return '<div class="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">No fields added yet.</div>';
        return window._tempFormFields.map((field, idx) => `
            <div class="flex flex-col gap-3 mb-4 bg-gray-50 dark:bg-white/[0.02] p-4 rounded-lg border border-gray-200 dark:border-white/5">
                <div class="flex gap-3 items-start">
                    <div class="flex-grow">
                        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Field Question / Label</label>
                        <input type="text" value="${field.label}" onchange="updateTempField(${idx}, 'label', this.value)" class="glass-input w-full px-3 py-2 text-sm rounded bg-white dark:bg-slate-800/50 border-gray-200 dark:border-none text-gray-900 dark:text-white">
                    </div>
                    <div class="w-1/3 min-w-[120px]">
                        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Type</label>
                        <select onchange="updateTempField(${idx}, 'type', this.value)" class="glass-input w-full px-3 py-2 text-sm rounded bg-white dark:bg-slate-800/50 border-gray-200 dark:border-none text-gray-900 dark:text-white dark:[&>option]:bg-slate-800">
                            <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
                            <option value="email" ${field.type === 'email' ? 'selected' : ''}>Email</option>
                            <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                            <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Textarea</option>
                            <option value="date" ${field.type === 'date' ? 'selected' : ''}>Date</option>
                            <option value="time" ${field.type === 'time' ? 'selected' : ''}>Time</option>
                            <option value="radio" ${field.type === 'radio' ? 'selected' : ''}>Single Choice (Radio)</option>
                            <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Multi Choice (Checkbox)</option>
                        </select>
                    </div>
                    <div class="pt-6">
                        <label class="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            <input type="checkbox" onchange="updateTempField(${idx}, 'required', this.checked)" ${field.required !== false ? 'checked' : ''} class="w-4 h-4 rounded text-brand-500">
                            Required
                        </label>
                    </div>
                    <button type="button" onclick="removeTempField(${idx})" class="w-9 h-9 mt-5 shrink-0 rounded bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 flex items-center justify-center transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${['radio', 'checkbox'].includes(field.type) ? `
                <div class="pl-4 border-l-2 border-brand-500/50 mt-2">
                    <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Options (Answers):</p>
                    ${(field.options || []).map((opt, optIdx) => `
                        <div class="flex gap-2 mb-2 items-center">
                            <input type="text" placeholder="Option text" value="${opt.text}" onchange="updateTempFieldOption(${idx}, ${optIdx}, 'text', this.value)" class="glass-input px-3 py-1.5 text-sm rounded w-1/2 bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                            <input type="text" placeholder="Image URL (optional)" value="${opt.image || ''}" onchange="updateTempFieldOption(${idx}, ${optIdx}, 'image', this.value)" class="glass-input px-3 py-1.5 text-sm rounded w-1/2 bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                            <button type="button" onclick="removeTempFieldOption(${idx}, ${optIdx})" class="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 w-8 h-8 flex items-center justify-center"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                    <button type="button" onclick="addTempFieldOption(${idx})" class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mt-1"><i class="fas fa-plus"></i> Add Option</button>
                </div>
                ` : ''}
            </div>
        `).join('');
    };
    
    window.updateTempField = (idx, key, value) => {
        window._tempFormFields[idx][key] = value;
        if (key === 'type' && ['radio', 'checkbox'].includes(value)) {
            if (!window._tempFormFields[idx].options || window._tempFormFields[idx].options.length === 0) {
                window._tempFormFields[idx].options = [{ text: 'Option 1', image: '' }];
            }
        }
        if (key === 'type') document.getElementById('formFieldsContainer').innerHTML = renderFieldsHTML();
    };
    window.removeTempField = (idx) => {
        window._tempFormFields.splice(idx, 1);
        document.getElementById('formFieldsContainer').innerHTML = renderFieldsHTML();
    };
    window.addTempField = () => {
        window._tempFormFields.push({ label: 'New Question', type: 'text', required: true });
        document.getElementById('formFieldsContainer').innerHTML = renderFieldsHTML();
    };
    window.addTempFieldOption = (fieldIdx) => {
        if(!window._tempFormFields[fieldIdx].options) window._tempFormFields[fieldIdx].options = [];
        window._tempFormFields[fieldIdx].options.push({ text: `Option ${window._tempFormFields[fieldIdx].options.length + 1}`, image: '' });
        document.getElementById('formFieldsContainer').innerHTML = renderFieldsHTML();
    };
    window.updateTempFieldOption = (fieldIdx, optIdx, key, value) => {
        window._tempFormFields[fieldIdx].options[optIdx][key] = value;
    };
    window.removeTempFieldOption = (fieldIdx, optIdx) => {
        window._tempFormFields[fieldIdx].options.splice(optIdx, 1);
        document.getElementById('formFieldsContainer').innerHTML = renderFieldsHTML();
    };
    
    modal.innerHTML = `
        <div class="glass-panel w-full max-w-3xl rounded-2xl p-6 md:p-8 slide-up relative max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">${isEdit ? 'Edit Form' : 'Create New Form'}</h3>
                <button onclick="closeModal()" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <form onsubmit="saveForm(event, '${formId || ''}')" class="space-y-6 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form Title</label>
                    <input type="text" id="formTitle" value="${form.title}" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500">
                </div>
                
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Form Fields / Questions</label>
                        <button type="button" onclick="addTempField()" class="text-xs bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white px-3 py-1.5 rounded transition-colors border border-gray-200 dark:border-transparent font-medium"><i class="fas fa-plus mr-1"></i> Add Question</button>
                    </div>
                    <div id="formFieldsContainer" class="bg-gray-50/50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 min-h-[150px]">
                        ${renderFieldsHTML()}
                    </div>
                </div>
                
                <div class="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-gray-200 dark:border-white/10 p-4 -mx-6 -mb-6 mt-4 flex justify-end">
                    <button type="button" onclick="closeModal()" class="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-4 transition-colors">Cancel</button>
                    <button type="submit" class="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all shadow-lg shadow-brand-500/30 glow-btn">Save Form</button>
                </div>
            </form>
        </div>
    `;
    
    activeModal = modal;
    render();
}

function saveForm(e, editId) {
    e.preventDefault();
    const db = getDB();
    const title = document.getElementById('formTitle').value;
    
    if (editId) {
        const formObj = db.forms.find(f => f.id === editId);
        formObj.title = title;
        formObj.fields = window._tempFormFields;
    } else {
        db.forms.push({ id: generateId(), title, fields: window._tempFormFields });
    }
    
    saveDB(db);
    closeModal();
    render();
}

function deleteForm(id) {
    if (confirm('Are you sure you want to delete this form? All submissions will also be deleted.')) {
        const db = getDB();
        db.forms = db.forms.filter(f => f.id !== id);
        db.formSubmissions = db.formSubmissions.filter(s => s.formId !== id);
        saveDB(db);
        render();
    }
}

function viewSubmissions(formId) {
    const db = getDB();
    const form = db.forms.find(f => f.id === formId);
    const submissions = db.formSubmissions.filter(s => s.formId === formId);
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center modal-overlay fade-in p-4';
    
    let tableHtml = '<div class="text-gray-500 dark:text-gray-400 text-center py-8">No submissions yet.</div>';
    
    if (submissions.length > 0) {
        tableHtml = `
            <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/5">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 uppercase text-xs">
                        <tr>
                            <th class="px-4 py-3 font-medium">Date</th>
                            ${form.fields.map(f => `<th class="px-4 py-3 font-medium">${f.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-transparent text-gray-700 dark:text-gray-300">
                        ${submissions.map(s => `
                            <tr class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">${new Date(s.timestamp).toLocaleString()}</td>
                                ${form.fields.map(f => `<td class="px-4 py-3">${s.data[f.label] || ''}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="glass-panel w-full max-w-5xl rounded-2xl p-6 md:p-8 slide-up relative max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-white">${form.title}</h3>
                    <p class="text-sm text-brand-600 dark:text-brand-400">Submissions Data</p>
                </div>
                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center"><i class="fas fa-times"></i></button>
            </div>
            <div class="flex-grow overflow-y-auto custom-scrollbar pr-2">
                ${tableHtml}
            </div>
        </div>
    `;
    activeModal = modal;
    render();
}

window.insertShortcode = (type) => {
    const contentEl = document.getElementById('pageContent');
    if (!contentEl) return;
    let insertion = '';
    
    if (type === 'form') {
        const db = getDB();
        let options = db.forms.map(f => `${f.title} (ID: ${f.id})`).join('\n');
        const formId = prompt("Enter the Form ID to insert:\nAvailable Forms:\n" + (options || "No forms available"));
        if (formId) insertion = `\n[FORM:${formId.trim()}]\n`;
    } else if (type === 'gallery') {
        const db = getDB();
        let options = db.galleries.map(g => `${g.title} (ID: ${g.id})`).join('\n');
        const galleryId = prompt("Enter the Gallery ID to insert:\nAvailable Galleries:\n" + (options || "No galleries available"));
        if (galleryId) insertion = `\n[GALLERY:${galleryId.trim()}]\n`;
    } else if (type === 'youtube') {
        const url = prompt("Enter YouTube Video URL:");
        if (url) {
            let videoId = '';
            if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
            
            if (videoId) {
                insertion = `\n<div class="aspect-w-16 aspect-h-9 my-4"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-[400px] rounded-xl shadow-lg border border-gray-200 dark:border-white/10"></iframe></div>\n`;
            }
        }
    } else if (type === 'gdoc') {
        const embedUrl = prompt("Enter Google Docs/Forms/Sheets Embed URL:");
        if (embedUrl) {
            let finalUrl = embedUrl;
            if (embedUrl.includes('<iframe') && embedUrl.includes('src="')) {
                finalUrl = embedUrl.split('src="')[1].split('"')[0];
            }
            insertion = `\n<div class="my-4"><iframe src="${finalUrl}" width="100%" height="600" frameborder="0" marginheight="0" marginwidth="0" class="rounded-xl shadow-lg border border-gray-200 dark:border-white/10">Loading…</iframe></div>\n`;
        }
    }
    
    if (insertion) {
        const startPos = contentEl.selectionStart;
        const endPos = contentEl.selectionEnd;
        contentEl.value = contentEl.value.substring(0, startPos) + insertion + contentEl.value.substring(endPos, contentEl.value.length);
        contentEl.focus();
        contentEl.selectionStart = startPos + insertion.length;
        contentEl.selectionEnd = startPos + insertion.length;
    }
}

function parsePageContent(content) {
    const db = getDB();
    const formRegex = /\[FORM:([a-zA-Z0-9]+)\]/g;
    const galleryRegex = /\[GALLERY:([a-zA-Z0-9]+)\]/g;
    
    let parsedContent = content.replace(formRegex, (match, formId) => {
        const form = db.forms.find(f => f.id === formId);
        if (!form) return `<div class="text-red-500 p-4 border border-red-200 rounded bg-red-50 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400 my-4">Error: Form not found (ID: ${formId})</div>`;
        
        return `
            <div class="glass-panel p-6 md:p-8 rounded-2xl my-8 border border-gray-200 dark:border-white/10 shadow-xl relative overflow-hidden bg-white/90 dark:bg-slate-900/50">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-purple-500"></div>
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">${form.title}</h3>
                <form onsubmit="submitForm(event, '${form.id}')" class="space-y-6">
                    ${form.fields.map((f, i) => {
                        const requiredAttr = f.required !== false ? 'required' : '';
                        const reqStar = f.required !== false ? '<span class="text-red-500 ml-1">*</span>' : '';
                        let inputHtml = '';
                        
                        if (f.type === 'textarea') {
                            inputHtml = `<textarea name="field_${i}" ${requiredAttr} class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500" rows="4"></textarea>`;
                        } else if (f.type === 'radio' || f.type === 'checkbox') {
                            inputHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">`;
                            (f.options || []).forEach((opt, optIdx) => {
                                const inputName = f.type === 'checkbox' ? `field_${i}[]` : `field_${i}`;
                                inputHtml += `
                                    <label class="flex flex-col cursor-pointer p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-brand-300 dark:hover:border-brand-500/50 transition-all">
                                        <div class="flex items-start gap-3">
                                            <input type="${f.type}" name="${inputName}" value="${opt.text}" ${f.type === 'radio' ? requiredAttr : ''} class="mt-1 w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                                            <span class="text-gray-900 dark:text-white font-medium text-sm md:text-base leading-tight">${opt.text}</span>
                                        </div>
                                        ${opt.image ? `<div class="mt-3 ml-7 overflow-hidden rounded-lg border border-gray-100 dark:border-white/5"><img src="${opt.image}" class="w-full h-auto object-cover max-h-48" alt="Option Image"></div>` : ''}
                                    </label>
                                `;
                            });
                            inputHtml += `</div>`;
                        } else {
                            inputHtml = `<input type="${f.type}" name="field_${i}" ${requiredAttr} class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500">`;
                        }
                        
                        return `
                            <div class="bg-gray-50/50 dark:bg-white/[0.01] p-4 md:p-6 rounded-xl border border-gray-100 dark:border-white/5">
                                <label class="block text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">${f.label} ${reqStar}</label>
                                ${inputHtml}
                            </div>
                        `;
                    }).join('')}
                    <button type="submit" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-brand-500/20 mt-4 glow-btn text-lg">
                        Submit Answer
                    </button>
                </form>
            </div>
        `;
    });

    return parsedContent.replace(galleryRegex, (match, galleryId) => {
        const gallery = db.galleries.find(g => g.id === galleryId);
        if (!gallery) return `<div class="text-red-500 p-4 border border-red-200 rounded bg-red-50 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400 my-4">Error: Gallery not found (ID: ${galleryId})</div>`;
        
        return `
            <div class="my-8">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">${gallery.title}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${(gallery.images || []).map(img => `
                        <div class="group relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                            <img src="${img.url}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${img.caption || ''}">
                            ${img.caption ? `
                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                    <p class="text-white font-medium">${img.caption}</p>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
}

window.submitForm = (e, formId) => {
    e.preventDefault();
    const formEl = e.target;
    const formData = new FormData(formEl);
    const db = getDB();
    const formObj = db.forms.find(f => f.id === formId);
    if (!formObj) return;
    
    const dataToSave = {};
    formObj.fields.forEach((f, i) => {
        if (f.type === 'checkbox') {
            dataToSave[f.label] = formData.getAll(`field_${i}[]`).join(', ');
        } else {
            dataToSave[f.label] = formData.get(`field_${i}`);
        }
    });
    
    // Check required for checkboxes (HTML5 doesn't enforce array of checkboxes naturally)
    for(let f of formObj.fields) {
        if(f.type === 'checkbox' && f.required !== false) {
            if(!dataToSave[f.label] || dataToSave[f.label] === '') {
                alert(`Please select at least one option for: ${f.label}`);
                return;
            }
        }
    }
    
    db.formSubmissions.push({
        id: generateId(),
        formId: formId,
        timestamp: new Date().toISOString(),
        data: dataToSave
    });
    
    saveDB(db);
    
    formEl.innerHTML = `
        <div class="text-center py-10">
            <div class="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-200 dark:border-green-500/30 shadow-xl shadow-green-500/10">
                <i class="fas fa-check text-4xl text-green-500 dark:text-green-400"></i>
            </div>
            <h4 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">Thank You!</h4>
            <p class="text-gray-600 dark:text-green-300 text-lg">Your response has been successfully recorded.</p>
        </div>
    `;
};

// ---------------- Public View ----------------
function viewPublicPage(pageId) {
    activePublicPageId = pageId;
    navigate('publicPage');
}

function createPublicPageView() {
    const div = document.createElement('div');
    div.className = 'flex-grow flex flex-col fade-in pb-20 w-full';
    
    const db = getDB();
    const page = db.pages.find(p => p.id === activePublicPageId);
    
    if (!page) {
        div.innerHTML = `<div class="text-center text-gray-900 dark:text-gray-400 mt-10 text-2xl">Page not found</div>`;
        return div;
    }
    
    const content = parsePageContent(page.content);
    
    div.innerHTML = `
        <div class="prose prose-lg dark:prose-invert max-w-none w-full bg-white/80 dark:bg-white/[0.01] p-8 md:p-12 rounded-3xl border border-gray-200 dark:border-white/5 backdrop-blur-sm shadow-2xl relative mt-8">
            <h1 class="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-500">${page.title}</h1>
            ${content}
        </div>
    `;
    
    return div;
}

// ---------------- User View ----------------
function createUserView() {
    const div = document.createElement('div');
    div.className = 'flex-grow flex flex-col md:flex-row gap-8 fade-in pb-20 w-full';
    
    const db = getDB();
    const assignedIds = currentUser.assignedPageIds || [];
    
    if (assignedIds.length === 0) {
        div.innerHTML = `
            <div class="glass-panel p-10 rounded-3xl text-center max-w-2xl mx-auto w-full mt-10">
                <div class="w-20 h-20 bg-yellow-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="fas fa-exclamation-triangle text-3xl text-yellow-500"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Pages Assigned</h2>
                <p class="text-gray-600 dark:text-gray-400">Please contact the administrator to assign pages to your account.</p>
            </div>
        `;
        return div;
    }
    
    // Ensure activeUserPageId is valid
    if (!activeUserPageId || !assignedIds.includes(activeUserPageId)) {
        activeUserPageId = assignedIds[0];
    }
    
    const page = db.pages.find(p => p.id === activeUserPageId);
    
    // Sidebar for page selection
    const sidebar = document.createElement('div');
    sidebar.className = 'w-full md:w-64 shrink-0';
    
    let sidebarHtml = `
        <div class="glass-panel p-6 rounded-2xl sticky top-28">
            <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">My Assigned Pages</h3>
            <div class="space-y-1">
    `;
    
    assignedIds.forEach(pid => {
        const p = db.pages.find(pg => pg.id === pid);
        if (p) {
            const isActive = activeUserPageId === pid;
            sidebarHtml += `
                <button onclick="switchUserPage('${pid}')" class="w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}">
                    <i class="fas ${isActive ? 'fa-file-alt' : 'fa-file'}"></i>
                    <span class="font-medium">${p.title}</span>
                </button>
            `;
        }
    });
    
    sidebarHtml += `</div></div>`;
    sidebar.innerHTML = sidebarHtml;
    
    const contentArea = document.createElement('div');
    contentArea.className = 'flex-grow';
    
    if (!page) {
        contentArea.innerHTML = `<div class="text-center text-gray-900 dark:text-gray-400 mt-10 text-2xl">Page not found</div>`;
    } else {
        const content = parsePageContent(page.content);
        contentArea.innerHTML = `
            <div class="prose prose-lg dark:prose-invert max-w-none w-full bg-white/80 dark:bg-white/[0.01] p-8 md:p-12 rounded-3xl border border-gray-200 dark:border-white/5 backdrop-blur-sm shadow-2xl relative">
                <div class="absolute -top-40 -right-40 w-80 h-80 bg-brand-300 dark:bg-brand-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none"></div>
                <h1 class="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-500">${page.title}</h1>
                ${content}
            </div>
        `;
    }
    
    div.appendChild(sidebar);
    div.appendChild(contentArea);
    
    return div;
}

window.switchUserPage = (pageId) => {
    activeUserPageId = pageId;
    render();
};

// ---------------- Admin: Galleries ----------------
function renderAdminGalleries() {
    const div = document.createElement('div');
    const db = getDB();
    
    let html = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Galleries Management</h2>
            <button onclick="openGalleryModal()" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2">
                <i class="fas fa-plus"></i> New Gallery
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;
    
    if (db.galleries.length === 0) {
        html += `<div class="col-span-full text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/5 border-dashed">No galleries created yet.</div>`;
    }
    
    db.galleries.forEach(g => {
        html += `
            <div class="glass-panel p-6 rounded-xl border border-gray-200 dark:border-white/5 relative group hover:-translate-y-1 transition-transform">
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onclick="openGalleryModal('${g.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 flex items-center justify-center transition-colors"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteGallery('${g.id}')" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 flex items-center justify-center transition-colors"><i class="fas fa-trash"></i></button>
                </div>
                <div class="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-slate-800">
                    ${g.images && g.images.length > 0 ? `<img src="${g.images[0].url}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-gray-400"><i class="fas fa-images text-2xl"></i></div>'}
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">${g.title}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">${g.images ? g.images.length : 0} Images</p>
                <div class="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400 font-mono">
                    ID: ${g.id}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    div.innerHTML = html;
    return div;
}

function openGalleryModal(galleryId = null) {
    const db = getDB();
    let gallery = { id: '', title: '', images: [] };
    let isEdit = false;
    
    if (galleryId) {
        gallery = db.galleries.find(g => g.id === galleryId);
        isEdit = true;
    }
    
    window._tempGalleryImages = JSON.parse(JSON.stringify(gallery.images || []));
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center modal-overlay fade-in p-4';
    
    window.renderGalleryImagesHTML = () => {
        if (window._tempGalleryImages.length === 0) return '<div class="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">No images added yet.</div>';
        return window._tempGalleryImages.map((img, idx) => `
            <div class="flex gap-4 mb-4 bg-gray-50 dark:bg-white/[0.02] p-4 rounded-lg border border-gray-200 dark:border-white/5 items-center">
                <div class="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-slate-800">
                    <img src="${img.url}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/150?text=Invalid+URL'">
                </div>
                <div class="flex-grow space-y-2">
                    <input type="text" value="${img.url}" onchange="updateTempGalleryImage(${idx}, 'url', this.value)" placeholder="Image URL" class="glass-input w-full px-3 py-2 text-sm rounded bg-white dark:bg-slate-800/50 border-gray-200 dark:border-none text-gray-900 dark:text-white">
                    <input type="text" value="${img.caption || ''}" onchange="updateTempGalleryImage(${idx}, 'caption', this.value)" placeholder="Caption (optional)" class="glass-input w-full px-3 py-2 text-sm rounded bg-white dark:bg-slate-800/50 border-gray-200 dark:border-none text-gray-900 dark:text-white">
                </div>
                <button type="button" onclick="removeTempGalleryImage(${idx})" class="w-10 h-10 shrink-0 rounded bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 flex items-center justify-center transition-colors">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    };
    
    window.updateTempGalleryImage = (idx, key, value) => {
        window._tempGalleryImages[idx][key] = value;
        if (key === 'url') document.getElementById('galleryImagesContainer').innerHTML = renderGalleryImagesHTML();
    };
    window.removeTempGalleryImage = (idx) => {
        window._tempGalleryImages.splice(idx, 1);
        document.getElementById('galleryImagesContainer').innerHTML = renderGalleryImagesHTML();
    };
    window.addTempGalleryImage = () => {
        window._tempGalleryImages.push({ url: '', caption: '' });
        document.getElementById('galleryImagesContainer').innerHTML = renderGalleryImagesHTML();
    };
    
    modal.innerHTML = `
        <div class="glass-panel w-full max-w-3xl rounded-2xl p-6 md:p-8 slide-up relative max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">${isEdit ? 'Edit Gallery' : 'Create New Gallery'}</h3>
                <button onclick="closeModal()" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <form onsubmit="saveGallery(event, '${galleryId || ''}')" class="space-y-6 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gallery Title</label>
                    <input type="text" id="galleryTitle" value="${gallery.title}" required class="glass-input w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-none focus:ring-2 focus:ring-brand-500">
                </div>
                
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Images</label>
                        <button type="button" onclick="addTempGalleryImage()" class="text-xs bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white px-3 py-1.5 rounded transition-colors border border-gray-200 dark:border-transparent font-medium"><i class="fas fa-plus mr-1"></i> Add Image</button>
                    </div>
                    <div id="galleryImagesContainer" class="bg-gray-50/50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 min-h-[150px]">
                        ${renderGalleryImagesHTML()}
                    </div>
                </div>
                
                <div class="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-gray-200 dark:border-white/10 p-4 -mx-6 -mb-6 mt-4 flex justify-end">
                    <button type="button" onclick="closeModal()" class="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-4 transition-colors">Cancel</button>
                    <button type="submit" class="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all shadow-lg shadow-brand-500/30 glow-btn">Save Gallery</button>
                </div>
            </form>
        </div>
    `;
    
    activeModal = modal;
    render();
}

function saveGallery(e, editId) {
    e.preventDefault();
    const db = getDB();
    const title = document.getElementById('galleryTitle').value;
    
    if (editId) {
        const galleryObj = db.galleries.find(g => g.id === editId);
        galleryObj.title = title;
        galleryObj.images = window._tempGalleryImages;
    } else {
        db.galleries.push({ id: generateId(), title, images: window._tempGalleryImages });
    }
    
    saveDB(db);
    closeModal();
    render();
}

function deleteGallery(id) {
    if (confirm('Are you sure you want to delete this gallery?')) {
        const db = getDB();
        db.galleries = db.galleries.filter(g => g.id !== id);
        saveDB(db);
        render();
    }
}

// Manual sync to cloud button logic
window.manualCloudSync = () => {
    const db = getDB();
    saveDB(db);
    alert("Data successfully synced to Cloud!");
};

// Ensure the initial render runs after Firebase data is loaded
if (window.dataInitialized) {
    window.dataInitialized.then(() => {
        window.appReady = true;
        render();
    }).catch(err => {
        console.error("Failed to initialize data:", err);
        window.appReady = true;
        render(); // Try rendering with default/local data
    });
} else {
    console.error("Data initialization script (data.js) failed to load.");
    window.appReady = true;
    render(); // Try rendering anyway (will use default data if defined in app.js scope, but it's not)
}
