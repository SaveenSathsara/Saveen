/**
 * Chat & Calling Feature for Saveen CMS
 * Uses Firebase Realtime Database for messaging and WebRTC signaling
 */

let activeChatUser = null;
let chatMessagesRef = null;
let isChatOpen = false;
let isChatUnlocked = false; // PIN lock status
let pc = null; // RTCPeerConnection
let localStream = null;
let currentCall = null;

const CHAT_UNLOCK_PIN = "750711";

function initChat() {
    // Permission Check: Only for logged in users with chatEnabled
    if (!currentUser || currentUser.chatEnabled === false) {
        const existing = document.getElementById('chat-widget-container');
        if (existing) existing.remove();
        return;
    }

    if (document.getElementById('chat-widget-container')) return;

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
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter PIN to unlock chat</p>
                <input type="password" id="chat-pin-input" maxlength="6" class="w-full text-center text-2xl tracking-[1em] py-3 rounded-xl bg-gray-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-500 mb-4" placeholder="••••••">
                <div id="pin-error" class="text-red-500 text-xs mb-4 hidden">Invalid PIN! Try again.</div>
                <button onclick="verifyChatPin()" class="w-full bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-500 transition-colors">Unlock</button>
                <button onclick="closePinModal()" class="w-full text-gray-500 mt-4 text-sm">Cancel</button>
            </div>
        </div>

        <!-- Chat Window -->
        <div id="chat-window" class="chat-window hidden glass-panel border-none">
            <!-- Header, Body, Footer same as before -->
            <div id="chat-header" class="p-4 bg-brand-600 text-white flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <button id="chat-back-btn" onclick="showContacts()" class="hidden"><i class="fas fa-arrow-left"></i></button>
                    <div id="chat-header-info" class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">S</div>
                        <div>
                            <div class="font-bold text-sm">Messages</div>
                            <div class="text-[10px] opacity-80">Online</div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="startCall('audio')" class="hover:text-gray-200 transition-colors"><i class="fas fa-phone-alt"></i></button>
                    <button onclick="startCall('video')" class="hover:text-gray-200 transition-colors"><i class="fas fa-video"></i></button>
                    <button onclick="toggleChat()" class="hover:text-gray-200 transition-colors ml-1"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <div id="chat-body" class="flex-grow overflow-y-auto p-4 flex flex-col custom-scrollbar bg-gray-50/50 dark:bg-slate-900/50"></div>

            <div id="chat-footer" class="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-white/5 hidden">
                <form onsubmit="handleSendMessage(event)" class="flex gap-2">
                    <input type="text" id="chat-input" placeholder="Type a message..." class="flex-grow px-4 py-2 rounded-full bg-gray-100 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white">
                    <button type="submit" class="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-500 transition-colors">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
        <!-- ... Call Overlay same as before ... -->
        <div id="call-overlay" class="call-overlay hidden">
            <div id="video-ui" class="video-container hidden">
                <video id="remoteVideo" autoplay playsinline></video>
                <video id="localVideo" autoplay playsinline muted></video>
            </div>
            
            <div id="call-info" class="text-center flex flex-col items-center">
                <div id="call-avatar" class="w-24 h-24 rounded-full bg-brand-500 flex items-center justify-center text-4xl font-bold mb-4 shadow-2xl">U</div>
                <h2 id="call-name" class="text-2xl font-bold mb-2">User Name</h2>
                <p id="call-status" class="text-gray-400">Calling...</p>
            </div>

            <div class="flex gap-10 items-center">
                <button id="decline-btn" onclick="endCall()" class="call-btn decline shadow-lg shadow-red-500/30">
                    <i class="fas fa-phone-slash"></i>
                </button>
                <button id="accept-btn" onclick="answerCall()" class="call-btn accept shadow-lg shadow-green-500/30 hidden">
                    <i class="fas fa-phone"></i>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    showContacts();
    listenForCalls();
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
    
    if (pinInput.value === CHAT_UNLOCK_PIN) {
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
    }
}

function showContacts() {
    const body = document.getElementById('chat-body');
    const footer = document.getElementById('chat-footer');
    const backBtn = document.getElementById('chat-back-btn');
    const headerInfo = document.getElementById('chat-header-info');

    footer.classList.add('hidden');
    backBtn.classList.add('hidden');
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
                <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div class="flex-grow">
                <div class="font-bold text-gray-900 dark:text-white text-sm">${u.username}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 truncate">Click to chat</div>
            </div>
            <div class="text-[10px] text-gray-400">Online</div>
        </div>
    `).join('');
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
            <div class="font-bold text-sm">${user.username}</div>
            <div id="chat-online-status" class="text-[10px] opacity-80">Online</div>
        </div>
    `;

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

function renderMessages(messages) {
    const body = document.getElementById('chat-body');
    if (!messages) {
        body.innerHTML = `<div class="flex-grow flex items-center justify-center text-gray-400 text-sm italic">No messages yet. Say hi!</div>`;
        return;
    }

    body.innerHTML = Object.values(messages).map(m => `
        <div class="chat-bubble ${m.senderId === currentUser.id ? 'sent' : 'received'}">
            ${m.text}
            <div class="text-[9px] opacity-50 mt-1 text-right">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
    `).join('');
    
    body.scrollTop = body.scrollHeight;
}

function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !activeChatUser || !currentUser) return;

    const message = {
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: text,
        timestamp: Date.now()
    };

    chatMessagesRef.push(message);
    input.value = '';
}

// --- CALLING LOGIC ---

async function startCall(type) {
    if (!activeChatUser || !currentUser) return;
    
    const callOverlay = document.getElementById('call-overlay');
    const callName = document.getElementById('call-name');
    const callStatus = document.getElementById('call-status');
    const callAvatar = document.getElementById('call-avatar');
    
    callOverlay.classList.remove('hidden');
    callName.innerText = activeChatUser.username;
    callStatus.innerText = `Ringing...`;
    callAvatar.innerText = activeChatUser.username.charAt(0).toUpperCase();

    // Initialize WebRTC
    pc = new RTCPeerConnection(iceServers);
    
    // Get Local Stream
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: type === 'video' 
        });
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        
        if (type === 'video') {
            document.getElementById('video-ui').classList.remove('hidden');
            document.getElementById('localVideo').srcObject = localStream;
        }
    } catch (err) {
        console.error("Media access error:", err);
        alert("Could not access camera/microphone.");
        endCall();
        return;
    }

    // Remote Stream
    pc.ontrack = (event) => {
        document.getElementById('video-ui').classList.remove('hidden');
        document.getElementById('remoteVideo').srcObject = event.streams[0];
    };

    // Ice Candidates
    const callId = [currentUser.id, activeChatUser.id].sort().join('_');
    const callRef = firebase.database().ref(`website/calls/${callId}`);
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            callRef.child('candidates').push({
                candidate: event.candidate.toJSON(),
                sender: currentUser.id
            });
        }
    };

    // Create Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await callRef.set({
        caller: currentUser.id,
        callerName: currentUser.username,
        receiver: activeChatUser.id,
        type: type,
        offer: {
            type: offer.type,
            sdp: offer.sdp
        },
        status: 'calling',
        timestamp: Date.now()
    });

    // Listen for Answer
    callRef.on('value', async (snap) => {
        const data = snap.val();
        if (data && data.answer && !pc.currentRemoteDescription) {
            const answerDesc = new RTCSessionDescription(data.answer);
            await pc.setRemoteDescription(answerDesc);
            callStatus.innerText = 'Connected';
        }
        if (data && data.status === 'ended') {
            endCall();
        }
    });

    // Listen for remote ice candidates
    callRef.child('candidates').on('child_added', (snap) => {
        const data = snap.val();
        if (data && data.sender !== currentUser.id) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });

    currentCall = callRef;
}

function listenForCalls() {
    if (!currentUser) return;

    firebase.database().ref('website/calls').on('child_added', (snap) => {
        const call = snap.val();
        if (call && call.receiver === currentUser.id && call.status === 'calling') {
            showIncomingCall(call, snap.ref);
        }
    });
    
    // Also listen for changes to existing calls (e.g. if caller cancels)
    firebase.database().ref('website/calls').on('child_changed', (snap) => {
        const call = snap.val();
        if (call && call.receiver === currentUser.id && call.status === 'ended') {
            endCall();
        }
    });
}

function showIncomingCall(call, ref) {
    const callOverlay = document.getElementById('call-overlay');
    const callName = document.getElementById('call-name');
    const callStatus = document.getElementById('call-status');
    const acceptBtn = document.getElementById('accept-btn');
    const callAvatar = document.getElementById('call-avatar');
    
    currentCall = ref;
    callOverlay.classList.remove('hidden');
    acceptBtn.classList.remove('hidden');
    callName.innerText = call.callerName;
    callStatus.innerText = `Incoming ${call.type} call...`;
    callAvatar.innerText = call.callerName.charAt(0).toUpperCase();

    // Play Ringtone logic could go here
}

async function answerCall() {
    const callOverlay = document.getElementById('call-overlay');
    const callStatus = document.getElementById('call-status');
    const acceptBtn = document.getElementById('accept-btn');
    
    acceptBtn.classList.add('hidden');
    callStatus.innerText = 'Connecting...';

    const snap = await currentCall.once('value');
    const callData = snap.val();

    pc = new RTCPeerConnection(iceServers);

    // Get Local Stream
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: callData.type === 'video' 
        });
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        
        if (callData.type === 'video') {
            document.getElementById('video-ui').classList.remove('hidden');
            document.getElementById('localVideo').srcObject = localStream;
        }
    } catch (err) {
        console.error("Media access error:", err);
        endCall();
        return;
    }

    pc.ontrack = (event) => {
        document.getElementById('video-ui').classList.remove('hidden');
        document.getElementById('remoteVideo').srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            currentCall.child('candidates').push({
                candidate: event.candidate.toJSON(),
                sender: currentUser.id
            });
        }
    };

    // Remote Offer
    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

    // Create Answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await currentCall.update({
        answer: {
            type: answer.type,
            sdp: answer.sdp
        },
        status: 'connected'
    });

    // Listen for remote ice candidates
    currentCall.child('candidates').on('child_added', (snap) => {
        const data = snap.val();
        if (data && data.sender !== currentUser.id) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });

    callStatus.innerText = 'Connected';
}

function endCall() {
    if (pc) {
        pc.close();
        pc = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (currentCall) {
        currentCall.update({ status: 'ended' });
        // Optionally delete the call after some time
        setTimeout(() => currentCall.remove(), 2000);
        currentCall = null;
    }

    document.getElementById('call-overlay').classList.add('hidden');
    document.getElementById('video-ui').classList.add('hidden');
    document.getElementById('accept-btn').classList.add('hidden');
    document.getElementById('remoteVideo').srcObject = null;
    document.getElementById('localVideo').srcObject = null;
}

// Export to window
// Audio assets
const ringtone = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
ringtone.loop = true;
const msgSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');

function playMsgSound() {
    msgSound.currentTime = 0;
    msgSound.play().catch(e => console.log("Sound play blocked"));
}

// Updated renderMessages to play sound
function renderMessages(messages) {
    const body = document.getElementById('chat-body');
    if (!messages) {
        body.innerHTML = `<div class="flex-grow flex items-center justify-center text-gray-400 text-sm italic">No messages yet. Say hi!</div>`;
        return;
    }

    const messageList = Object.values(messages);
    const lastMessage = messageList[messageList.length - 1];
    
    // Play sound if last message is from someone else and it's new
    if (lastMessage.senderId !== currentUser?.id && (!window._lastMsgId || window._lastMsgId !== lastMessage.timestamp)) {
        playMsgSound();
        window._lastMsgId = lastMessage.timestamp;
        
        // Show unread badge if chat closed
        if (!isChatOpen) {
            const badge = document.getElementById('unread-count');
            const count = parseInt(badge.innerText) + 1;
            badge.innerText = count;
            badge.classList.remove('hidden');
        }
    }

    body.innerHTML = messageList.map(m => `
        <div class="chat-bubble ${m.senderId === currentUser.id ? 'sent' : 'received'}">
            ${m.text}
            <div class="text-[9px] opacity-50 mt-1 text-right">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
    `).join('');
    
    body.scrollTop = body.scrollHeight;
}

// Update showIncomingCall and endCall for ringtone
function showIncomingCall(call, ref) {
    const callOverlay = document.getElementById('call-overlay');
    const callName = document.getElementById('call-name');
    const callStatus = document.getElementById('call-status');
    const acceptBtn = document.getElementById('accept-btn');
    const callAvatar = document.getElementById('call-avatar');
    
    currentCall = ref;
    callOverlay.classList.remove('hidden');
    acceptBtn.classList.remove('hidden');
    callName.innerText = call.callerName;
    callStatus.innerText = `Incoming ${call.type} call...`;
    callAvatar.innerText = call.callerName.charAt(0).toUpperCase();

    ringtone.play().catch(e => console.log("Ringtone blocked"));
}

// Update endCall to stop ringtone
const originalEndCall = endCall;
function endCall() {
    ringtone.pause();
    ringtone.currentTime = 0;
    originalEndCall();
}

// Update answerCall to stop ringtone
const originalAnswerCall = answerCall;
async function answerCall() {
    ringtone.pause();
    ringtone.currentTime = 0;
    await originalAnswerCall();
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
window.startCall = startCall;
window.answerCall = answerCall;
window.endCall = endCall;
window.initChat = initChat;
Object.defineProperty(window, 'isChatOpen', { get: () => isChatOpen });
Object.defineProperty(window, 'isChatUnlocked', { get: () => isChatUnlocked });
