/**
 * Chat & Calling Feature for Saveen CMS
 * Uses Firebase Realtime Database for messaging and WebRTC signaling
 */

let activeChatUser = null;
let chatMessagesRef = null;
let isChatOpen = false;
let isChatUnlocked = false; // PIN lock status
let replyingTo = null; // Currently replying to this message

function initChat() {
    // Permission Check: Only for logged in users with chatEnabled
    if (!currentUser || currentUser.chatEnabled === false) {
        const existing = document.getElementById('chat-widget-container');
        if (existing) existing.remove();
        return;
    }

    if (document.getElementById('chat-widget-container')) return;

    // Presence Tracking
    const presenceRef = firebase.database().ref(`website/presence/${currentUser.id}`);
    const connectionRef = firebase.database().ref('.info/connected');
    connectionRef.on('value', (snap) => {
        if (snap.val() === true) {
            presenceRef.onDisconnect().set({
                status: 'offline',
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
            presenceRef.set({
                status: 'online',
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
    });

    const container = document.createElement('div');
    container.id = 'chat-widget-container';
    container.innerHTML = `
        <!-- Floating Button -->
        <button id="chat-toggle-btn" onclick="handleChatToggle()" class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center hover:scale-110 transition-all z-[1000] glow-btn">
            <i class="fas fa-comment-dots text-2xl"></i>
            <span id="unread-count" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full hidden">0</span>
        </button>

        <!-- PIN Lock Modal -->
        <div id="chat-pin-modal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm hidden p-4">
            <div class="glass-panel w-full max-w-[320px] p-8 rounded-3xl text-center slide-up">
                <div class="w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <i class="fas fa-lock text-white text-2xl"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Chat Locked</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your Chat PIN to unlock</p>
                <input type="password" id="chat-pin-input" maxlength="6" class="w-full text-center text-2xl tracking-[1em] py-3 rounded-xl bg-gray-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-500 mb-4" placeholder="••••••">
                <div id="pin-error" class="text-red-500 text-xs mb-4 hidden">Invalid PIN! Try again.</div>
                <button onclick="verifyChatPin()" class="w-full bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-500 transition-colors">Unlock</button>
                <button onclick="closePinModal()" class="w-full text-gray-500 mt-4 text-sm">Cancel</button>
            </div>
        </div>

        <!-- Chat Window -->
        <div id="chat-window" class="chat-window hidden glass-panel border-none">
            <div id="chat-header" class="p-4 bg-brand-600 text-white flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <button id="chat-back-btn" onclick="showContacts()" class="hidden"><i class="fas fa-arrow-left"></i></button>
                    <div id="chat-header-info" class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">S</div>
                        <div>
                            <div class="font-bold text-sm">Messages</div>
                            <div class="text-[10px] opacity-80">Loading...</div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="toggleChat()" class="hover:text-gray-200 transition-colors ml-1"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <div id="chat-body" class="flex-grow overflow-y-auto p-4 flex flex-col custom-scrollbar bg-gray-50/50 dark:bg-slate-900/50"></div>

            <div id="reply-preview" class="reply-preview-container hidden">
                <div class="flex-grow border-l-2 border-brand-500 pl-3">
                    <div id="reply-preview-name" class="text-xs font-bold text-brand-600">Replying to User</div>
                    <div id="reply-preview-text" class="text-xs text-gray-500 truncate">Message content...</div>
                </div>
                <button onclick="cancelReply()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
            </div>

            <div id="chat-footer" class="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-white/5 hidden flex-col">
                <div id="chat-attachment-preview" class="hidden mb-2 relative self-start">
                    <img id="chat-attachment-img" src="" class="h-20 rounded-lg shadow-md border border-gray-200 dark:border-white/10 object-cover">
                    <button onclick="clearChatAttachment()" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-sm"><i class="fas fa-times"></i></button>
                </div>
                <form onsubmit="handleSendMessage(event)" class="flex gap-2 items-center w-full relative">
                    <input type="file" id="chat-file-input" accept="image/*" class="hidden" onchange="handleChatAttachment(this)">
                    <button type="button" id="chat-image-btn" onclick="document.getElementById('chat-file-input').click()" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors shrink-0">
                        <i class="fas fa-image"></i>
                    </button>
                    
                    <!-- Voice Recording Overlay -->
                    <div id="voice-record-ui" class="hidden flex-grow flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-1.5 rounded-full text-red-600 dark:text-red-400 text-sm">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span class="font-semibold">Recording:</span>
                            <span id="voice-record-timer" class="font-mono">0:00</span>
                        </div>
                        <button type="button" onclick="window.cancelVoiceRecording()" class="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>

                    <input type="text" id="chat-input" placeholder="Type a message..." class="flex-grow px-4 py-2 rounded-full bg-gray-100 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white">
                    
                    <button type="button" id="chat-voice-btn" onclick="window.toggleVoiceRecord()" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors shrink-0">
                        <i class="fas fa-microphone"></i>
                    </button>
                    
                    <button type="submit" id="chat-send-btn" class="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-500 transition-colors shrink-0">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // Global click listener for context menu
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('msg-menu');
        if (menu && !menu.contains(e.target)) {
            menu.remove();
        }
    });

    showContacts();
}

// Configuration for WebRTC
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

function handleChatToggle() {
    if (isChatUnlocked) {
        toggleChat();
    } else {
        document.getElementById('chat-pin-modal').classList.remove('hidden');
        document.getElementById('chat-pin-input').focus();
    }
}

function verifyChatPin() {
    const pinInput = document.getElementById('chat-pin-input');
    const errorEl = document.getElementById('pin-error');
    
    if (pinInput.value === currentUser.chatPin) {
        isChatUnlocked = true;
        closePinModal();
        toggleChat();
    } else {
        errorEl.classList.remove('hidden');
        pinInput.value = '';
        pinInput.focus();
    }
}

function closePinModal() {
    document.getElementById('chat-pin-modal').classList.add('hidden');
    document.getElementById('pin-error').classList.add('hidden');
    document.getElementById('chat-pin-input').value = '';
}

function toggleChat() {
    const win = document.getElementById('chat-window');
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
        win.classList.remove('hidden');
        const badge = document.getElementById('unread-count');
        badge.innerText = '0';
        badge.classList.add('hidden');
    } else {
        win.classList.add('hidden');
        if (typeof window.cancelVoiceRecording === 'function') {
            window.cancelVoiceRecording();
        }
    }
}

function showContacts() {
    const body = document.getElementById('chat-body');
    const footer = document.getElementById('chat-footer');
    const backBtn = document.getElementById('chat-back-btn');
    const headerInfo = document.getElementById('chat-header-info');

    footer.classList.add('hidden');
    backBtn.classList.add('hidden');
    if (typeof window.cancelVoiceRecording === 'function') {
        window.cancelVoiceRecording();
    }
    headerInfo.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold"><i class="fas fa-users"></i></div>
        <div>
            <div class="font-bold text-sm">Contacts</div>
            <div class="text-[10px] opacity-80">Choose someone to chat</div>
        </div>
    `;

    const db = getDB();
    const users = db.users.filter(u => u.username !== (currentUser ? currentUser.username : ''));
    
    if (users.length === 0) {
        body.innerHTML = `<div class="flex-grow flex items-center justify-center text-gray-500 text-sm italic">No other users found.</div>`;
        return;
    }

    body.innerHTML = users.map(u => `
        <div onclick="openChat('${u.id}')" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/5 mb-2">
            <div class="relative">
                ${u.profilePic 
                    ? `<img src="${u.profilePic}" class="w-12 h-12 rounded-full object-cover">` 
                    : `<div class="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">${u.username.charAt(0).toUpperCase()}</div>`
                }
                <div id="status-dot-${u.id}" class="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-center">
                    <div class="font-bold text-gray-900 dark:text-white text-sm">${u.username}</div>
                    <div class="text-[10px] text-brand-600 font-mono">#${u.chatNumber || '00000'}</div>
                </div>
                <div id="status-text-${u.id}" class="text-xs text-gray-500 dark:text-gray-400 truncate">Loading status...</div>
            </div>
        </div>
    `).join('');

    // Listen for presence for each user
    users.forEach(u => {
        firebase.database().ref(`website/presence/${u.id}`).on('value', (snap) => {
            const data = snap.val();
            const dot = document.getElementById(`status-dot-${u.id}`);
            const text = document.getElementById(`status-text-${u.id}`);
            if (!dot || !text) return;

            if (data && data.status === 'online') {
                dot.classList.replace('bg-gray-400', 'bg-green-500');
                text.innerText = 'Online';
                text.classList.add('text-green-500');
            } else {
                dot.classList.replace('bg-green-500', 'bg-gray-400');
                const lastSeen = data ? new Date(data.lastSeen).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'Long ago';
                text.innerText = `Last seen: ${lastSeen}`;
                text.classList.remove('text-green-500');
            }
        });
    });
}

// Audio assets
const msgSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');

function playMsgSound() {
    msgSound.currentTime = 0;
    msgSound.play().catch(e => console.log("Sound play blocked"));
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function renderVoicePlayer(msgId, audioUrl, duration) {
    const formattedDuration = duration ? formatTime(duration) : "--:--";
    return `
        <div class="flex items-center gap-3 bg-white/15 dark:bg-black/20 p-2.5 rounded-2xl min-w-[210px] max-w-[250px] border border-white/10 select-none my-1" onclick="event.stopPropagation()">
            <audio id="audio-${msgId}" src="${audioUrl}" preload="metadata" ontimeupdate="window.updateAudioProgress('${msgId}')" onended="window.audioEnded('${msgId}')"></audio>
            <button type="button" onclick="window.toggleAudioPlay('${msgId}')" id="play-btn-${msgId}" class="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow hover:scale-105 transition-all shrink-0">
                <i class="fas fa-play pl-0.5 text-xs" id="play-icon-${msgId}"></i>
            </button>
            <div class="flex-grow flex flex-col justify-center min-w-[120px]">
                <input type="range" id="seek-${msgId}" min="0" max="100" value="0" oninput="window.seekAudio('${msgId}', this.value)" class="w-full h-1 bg-gray-300 dark:bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-brand-500">
                <div class="flex justify-between items-center text-[9px] opacity-75 mt-1 font-mono">
                    <span id="time-${msgId}">0:00</span>
                    <span id="dur-${msgId}">${formattedDuration}</span>
                </div>
            </div>
        </div>
    `;
}

function renderMessages(snapshotValue) {
    const body = document.getElementById('chat-body');
    if (!snapshotValue) {
        body.innerHTML = `<div class="flex-grow flex items-center justify-center text-gray-400 text-sm italic">No messages yet. Say hi!</div>`;
        return;
    }

    const messageList = Object.entries(snapshotValue).map(([id, data]) => ({ id, ...data }));
    
    // Play sound logic
    const lastMessage = messageList[messageList.length - 1];
    if (lastMessage.senderId !== currentUser?.id && (!window._lastMsgId || window._lastMsgId !== lastMessage.timestamp)) {
        playMsgSound();
        window._lastMsgId = lastMessage.timestamp;
        if (!isChatOpen) {
            const badge = document.getElementById('unread-count');
            const count = parseInt(badge.innerText || '0') + 1;
            badge.innerText = count;
            badge.classList.remove('hidden');
        }
    }

    body.innerHTML = messageList.map(m => {
        // Check if message is deleted for current user
        if (m.deletedBy && m.deletedBy[currentUser.id]) return '';
        
        const isSent = m.senderId === currentUser.id;
        
        let content = m.text;
        if (m.imageUrl && !m.deletedForEveryone) {
            content = `<div class="mb-1"><img src="${m.imageUrl}" class="rounded-lg max-w-full max-h-48 object-contain cursor-pointer" onclick="window.open(this.src)"></div>` + (content ? `<div class="mt-1">${content}</div>` : '');
        }

        if (m.audioUrl && !m.deletedForEveryone) {
            content = renderVoicePlayer(m.id, m.audioUrl, m.audioDuration) + (content ? `<div class="mt-1">${content}</div>` : '');
        }

        if (m.deletedForEveryone) {
            content = `<i class="fas fa-ban mr-1 opacity-50"></i> <span class="italic opacity-50">This message was deleted</span>`;
        }

        // Reply UI
        const replyHtml = m.replyTo ? `
            <div class="reply-context mb-2">
                <div class="font-bold text-[10px] text-brand-600">${m.replyTo.senderName}</div>
                <div class="text-[10px] opacity-70 truncate">${m.replyTo.text}</div>
            </div>
        ` : '';

        // Reactions UI
        let reactionsHtml = '';
        if (m.reactions && !m.deletedForEveryone) {
            reactionsHtml = '<div class="msg-reactions">';
            Object.entries(m.reactions).forEach(([emoji, users]) => {
                if (users && Object.keys(users).length > 0) {
                    reactionsHtml += `<span>${emoji} ${Object.keys(users).length > 1 ? Object.keys(users).length : ''}</span>`;
                }
            });
            reactionsHtml += '</div>';
        }

        // Determine data-text representation for copying/replying
        let msgBubbleText = m.text || '';
        if (m.audioUrl) {
            msgBubbleText = '[Voice Message]';
        } else if (m.imageUrl) {
            msgBubbleText = '[Image]';
        }

        return `
            <div id="msg-${m.id}" 
                 onclick="openMessageMenu('${m.id}', event)" 
                 data-text="${msgBubbleText.replace(/"/g, '&quot;')}"
                 data-is-audio="${m.audioUrl ? 'true' : 'false'}"
                 class="chat-bubble ${isSent ? 'sent' : 'received'} relative group">
                ${replyHtml}
                <div class="message-text">${content}</div>
                <div class="text-[9px] opacity-50 mt-1 text-right">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                ${reactionsHtml}
            </div>
        `;
    }).join('');
    
    body.scrollTop = body.scrollHeight;
}

function handleSendMessage(e) {
    e.preventDefault();
    if (typeof isRecording !== 'undefined' && isRecording) {
        window.stopAndSendVoiceRecording();
        return;
    }
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if ((!text && !chatAttachment) || !activeChatUser || !currentUser) return;

    const message = {
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: text,
        timestamp: Date.now()
    };

    if (chatAttachment) {
        message.imageUrl = chatAttachment;
    }

    if (replyingTo) {
        message.replyTo = {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName
        };
        cancelReply();
    }

    chatMessagesRef.push(message);
    input.value = '';
    if (chatAttachment) {
        clearChatAttachment();
    }
}

let chatAttachment = null;

window.handleChatAttachment = (input) => {
    const file = input.files[0];
    if (!file) return;
    
    // Check size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large. Maximum size is 2MB.");
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        chatAttachment = e.target.result;
        document.getElementById('chat-attachment-img').src = chatAttachment;
        document.getElementById('chat-attachment-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
};

window.clearChatAttachment = () => {
    chatAttachment = null;
    document.getElementById('chat-file-input').value = '';
    document.getElementById('chat-attachment-preview').classList.add('hidden');
    document.getElementById('chat-attachment-img').src = '';
};

// --- ADVANCED CHAT FUNCTIONS ---

function openMessageMenu(msgId, e) {
    e.stopPropagation();
    // Remove existing menu
    const existing = document.getElementById('msg-menu');
    if (existing) existing.remove();

    // Get message data
    const messageEl = document.getElementById(`msg-${msgId}`);
    const isSent = messageEl.classList.contains('sent');
    const text = messageEl.getAttribute('data-text') || '';
    const isAudio = messageEl.getAttribute('data-is-audio') === 'true';
    const senderName = isSent ? currentUser.username : activeChatUser.username;

    const menu = document.createElement('div');
    menu.id = 'msg-menu';
    menu.className = 'message-menu slide-up';
    
    // Position menu
    menu.style.top = `${Math.min(e.clientY, window.innerHeight - 250)}px`;
    menu.style.left = `${Math.min(e.clientX, window.innerWidth - 180)}px`;

    menu.innerHTML = `
        <div class="reaction-bar">
            <span class="react-btn" onclick="reactToMessage('${msgId}', '❤️')">❤️</span>
            <span class="react-btn" onclick="reactToMessage('${msgId}', '😂')">😂</span>
            <span class="react-btn" onclick="reactToMessage('${msgId}', '😮')">😮</span>
            <span class="react-btn" onclick="reactToMessage('${msgId}', '😢')">😢</span>
            <span class="react-btn" onclick="reactToMessage('${msgId}', '👍')">👍</span>
        </div>
        <div class="menu-item" onclick="setReply('${msgId}', '${text.replace(/'/g, "\\'")}', '${senderName}')">
            <i class="fas fa-reply"></i> Reply
        </div>
        <div class="menu-item" onclick="copyToClipboard('${text.replace(/'/g, "\\'")}')">
            <i class="fas fa-copy"></i> Copy
        </div>
        <div class="menu-item danger" onclick="deleteMessage('${msgId}', 'me')">
            <i class="fas fa-trash"></i> Delete for me
        </div>
        ${isSent ? `
            <div class="menu-item danger" onclick="deleteMessage('${msgId}', 'everyone')">
                <i class="fas fa-trash-alt"></i> Delete for everyone
            </div>
        ` : ''}
    `;
    document.body.appendChild(menu);
}

function setReply(id, text, senderName) {
    replyingTo = { id, text, senderName };
    const preview = document.getElementById('reply-preview');
    const previewName = document.getElementById('reply-preview-name');
    const previewText = document.getElementById('reply-preview-text');
    
    previewName.innerText = `Replying to ${senderName}`;
    previewText.innerText = text;
    preview.classList.remove('hidden');
    document.getElementById('chat-input').focus();
    
    const menu = document.getElementById('msg-menu');
    if (menu) menu.remove();
}

function cancelReply() {
    replyingTo = null;
    document.getElementById('reply-preview').classList.add('hidden');
}

function reactToMessage(msgId, emoji) {
    if (!chatMessagesRef) return;
    const ref = chatMessagesRef.child(`${msgId}/reactions/${emoji}/${currentUser.id}`);
    
    // Toggle reaction
    ref.once('value', snap => {
        if (snap.exists()) {
            ref.remove();
        } else {
            ref.set(true);
        }
    });
    
    const menu = document.getElementById('msg-menu');
    if (menu) menu.remove();
}

function deleteMessage(msgId, mode) {
    if (!chatMessagesRef) return;
    
    if (mode === 'everyone') {
        if (confirm('Delete this message for everyone?')) {
            chatMessagesRef.child(msgId).update({
                deletedForEveryone: true,
                text: 'This message was deleted'
            });
        }
    } else {
        // Delete for me
        chatMessagesRef.child(`${msgId}/deletedBy/${currentUser.id}`).set(true);
    }
    
    const menu = document.getElementById('msg-menu');
    if (menu) menu.remove();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Optional: show a small toast
    });
    const menu = document.getElementById('msg-menu');
    if (menu) menu.remove();
}

function openChat(userId) {
    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;

    activeChatUser = user;
    const body = document.getElementById('chat-body');
    const footer = document.getElementById('chat-footer');
    const backBtn = document.getElementById('chat-back-btn');
    const headerInfo = document.getElementById('chat-header-info');

    footer.classList.remove('hidden');
    backBtn.classList.remove('hidden');
    
    headerInfo.innerHTML = `
        ${user.profilePic 
            ? `<img src="${user.profilePic}" class="w-10 h-10 rounded-full object-cover">` 
            : `<div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">${user.username.charAt(0).toUpperCase()}</div>`
        }
        <div>
            <div class="font-bold text-sm flex items-center gap-2">
                ${user.username}
                <span class="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">#${user.chatNumber || '00000'}</span>
            </div>
            <div id="chat-online-status" class="text-[10px] opacity-80">Checking...</div>
        </div>
    `;

    // Listen for presence for active chat user
    firebase.database().ref(`website/presence/${user.id}`).on('value', (snap) => {
        const data = snap.val();
        const statusEl = document.getElementById('chat-online-status');
        if (!statusEl) return;
        if (data && data.status === 'online') {
            statusEl.innerText = 'Online';
        } else {
            const lastSeen = data ? new Date(data.lastSeen).toLocaleString([], {hour: '2-digit', minute:'2-digit'}) : 'offline';
            statusEl.innerText = `Last seen: ${lastSeen}`;
        }
    });

    body.innerHTML = `<div class="flex-grow flex items-center justify-center"><i class="fas fa-spinner fa-spin text-brand-500"></i></div>`;

    // Connect to Firebase Messages
    if (!currentUser) {
        body.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">Please login to chat.</div>`;
        footer.classList.add('hidden');
        return;
    }

    const chatId = [currentUser.id, user.id].sort().join('_');
    const messagesRef = firebase.database().ref(`website/chats/${chatId}/messages`);
    
    if (chatMessagesRef) chatMessagesRef.off();
    chatMessagesRef = messagesRef;

    messagesRef.on('value', (snapshot) => {
        const messages = snapshot.val();
        renderMessages(messages);
    });
}

// --- VOICE RECORDING & PLAYBACK CONTROLS ---

// Audio Player Helpers
window.toggleAudioPlay = (msgId) => {
    const audio = document.getElementById(`audio-${msgId}`);
    const playIcon = document.getElementById(`play-icon-${msgId}`);
    if (!audio) return;
    
    // Pause other playing audios
    const allAudios = document.querySelectorAll('audio[id^="audio-"]');
    allAudios.forEach(aud => {
        if (aud.id !== `audio-${msgId}` && !aud.paused) {
            aud.pause();
            const otherId = aud.id.replace('audio-', '');
            const otherIcon = document.getElementById(`play-icon-${otherId}`);
            if (otherIcon) otherIcon.className = 'fas fa-play pl-0.5 text-xs';
        }
    });

    if (audio.paused) {
        audio.play().then(() => {
            if (playIcon) playIcon.className = 'fas fa-pause text-xs';
        }).catch(err => console.log("Audio play error:", err));
    } else {
        audio.pause();
        if (playIcon) playIcon.className = 'fas fa-play pl-0.5 text-xs';
    }
};

window.updateAudioProgress = (msgId) => {
    const audio = document.getElementById(`audio-${msgId}`);
    const seek = document.getElementById(`seek-${msgId}`);
    const timeEl = document.getElementById(`time-${msgId}`);
    const durEl = document.getElementById(`dur-${msgId}`);
    
    if (!audio) return;
    const current = audio.currentTime;
    const duration = audio.duration;
    
    if (!isNaN(current)) {
        if (timeEl) timeEl.innerText = formatTime(current);
    }
    if (!isNaN(duration) && duration !== Infinity) {
        if (durEl) durEl.innerText = formatTime(duration);
        if (seek) seek.value = (current / duration) * 100;
    }
};

window.audioEnded = (msgId) => {
    const playIcon = document.getElementById(`play-icon-${msgId}`);
    const seek = document.getElementById(`seek-${msgId}`);
    const timeEl = document.getElementById(`time-${msgId}`);
    if (playIcon) playIcon.className = 'fas fa-play pl-0.5 text-xs';
    if (seek) seek.value = 0;
    if (timeEl) timeEl.innerText = "0:00";
};

window.seekAudio = (msgId, percent) => {
    const audio = document.getElementById(`audio-${msgId}`);
    if (!audio) return;
    const duration = audio.duration;
    if (!isNaN(duration) && duration !== Infinity) {
        audio.currentTime = (percent / 100) * duration;
    }
};

// Voice Recording API
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = null;
let recordTimerInterval = null;
let isRecording = false;
window._shouldSendVoice = false;

window.toggleVoiceRecord = () => {
    if (isRecording) {
        window.stopAndSendVoiceRecording();
    } else {
        window.startVoiceRecording();
    }
};

window.startVoiceRecording = async () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Voice recording is not supported in this browser/protocol (requires HTTPS or localhost).");
            return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            if (audioBlob.size > 2.5 * 1024 * 1024) {
                alert("Voice message too long (exceeds size limit).");
                window.resetVoiceRecordingUI();
                return;
            }
            
            if (window._shouldSendVoice && audioChunks.length > 0) {
                const duration = Math.round((Date.now() - recordStartTime) / 1000);
                if (duration >= 1) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        sendVoiceMessage(e.target.result, duration);
                    };
                    reader.readAsDataURL(audioBlob);
                }
            }
            window.resetVoiceRecordingUI();
        };
        
        mediaRecorder.start();
        recordStartTime = Date.now();
        isRecording = true;
        window._shouldSendVoice = false;
        
        window.showVoiceRecordingUI();
    } catch (err) {
        console.error("Microphone error:", err);
        alert("Cannot access microphone. Please grant permission.");
    }
};

window.stopAndSendVoiceRecording = () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    window._shouldSendVoice = true;
    mediaRecorder.stop();
};

window.cancelVoiceRecording = () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    window._shouldSendVoice = false;
    mediaRecorder.stop();
};

window.showVoiceRecordingUI = () => {
    const input = document.getElementById('chat-input');
    const imageBtn = document.getElementById('chat-image-btn');
    const voiceBtn = document.getElementById('chat-voice-btn');
    const recordUI = document.getElementById('voice-record-ui');
    const sendBtn = document.getElementById('chat-send-btn');
    const timer = document.getElementById('voice-record-timer');
    
    if (input) input.classList.add('hidden');
    if (imageBtn) imageBtn.classList.add('hidden');
    if (voiceBtn) {
        voiceBtn.innerHTML = '<i class="fas fa-microphone-slash text-red-500 animate-pulse"></i>';
        voiceBtn.classList.add('bg-red-100', 'dark:bg-red-950/30');
    }
    if (recordUI) recordUI.classList.remove('hidden');
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-check"></i>';
        sendBtn.classList.replace('bg-brand-600', 'bg-green-600');
        sendBtn.classList.replace('hover:bg-brand-500', 'hover:bg-green-500');
    }
    if (timer) timer.innerText = "0:00";
    
    if (recordTimerInterval) clearInterval(recordTimerInterval);
    recordTimerInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - recordStartTime) / 1000);
        if (timer) timer.innerText = formatTime(elapsed);
        if (elapsed >= 120) {
            window.stopAndSendVoiceRecording();
        }
    }, 1000);
};

window.resetVoiceRecordingUI = () => {
    isRecording = false;
    if (recordTimerInterval) {
        clearInterval(recordTimerInterval);
        recordTimerInterval = null;
    }
    
    const input = document.getElementById('chat-input');
    const imageBtn = document.getElementById('chat-image-btn');
    const voiceBtn = document.getElementById('chat-voice-btn');
    const recordUI = document.getElementById('voice-record-ui');
    const sendBtn = document.getElementById('chat-send-btn');
    
    if (input) input.classList.remove('hidden');
    if (imageBtn) imageBtn.classList.remove('hidden');
    if (voiceBtn) {
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.className = "w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors shrink-0";
    }
    if (recordUI) recordUI.classList.add('hidden');
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendBtn.className = "w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-500 transition-colors shrink-0";
    }
};

function sendVoiceMessage(base64Audio, duration) {
    if (!activeChatUser || !currentUser || !chatMessagesRef) return;
    const message = {
        senderId: currentUser.id,
        senderName: currentUser.username,
        audioUrl: base64Audio,
        audioDuration: duration,
        timestamp: Date.now()
    };
    if (replyingTo) {
        message.replyTo = {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName
        };
        cancelReply();
    }
    chatMessagesRef.push(message);
}

function resetChatLock() {
    isChatUnlocked = false;
    isChatOpen = false;
    const win = document.getElementById('chat-window');
    if (win) win.classList.add('hidden');
    const modal = document.getElementById('chat-pin-modal');
    if (modal) modal.classList.add('hidden');
}

window.handleChatToggle = handleChatToggle;
window.verifyChatPin = verifyChatPin;
window.closePinModal = closePinModal;
window.toggleChat = toggleChat;
window.resetChatLock = resetChatLock;
window.showContacts = showContacts;
window.openChat = openChat;
window.handleSendMessage = handleSendMessage;
window.openMessageMenu = openMessageMenu;
window.reactToMessage = reactToMessage;
window.setReply = setReply;
window.cancelReply = cancelReply;
window.deleteMessage = deleteMessage;
window.copyToClipboard = copyToClipboard;
window.initChat = initChat;
Object.defineProperty(window, 'isChatOpen', { get: () => isChatOpen });
Object.defineProperty(window, 'isChatUnlocked', { get: () => isChatUnlocked });
