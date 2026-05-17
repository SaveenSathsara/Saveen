// ==========================================
//           LIVE GAMES MODULE
// ==========================================

window.activeGameId = null;
window.isMultiplayer = null; // null = chooser, false = single-player, true = multiplayer
window.localStream = null;
window.peerConnection = null;
window.gameRoomId = null;
window.isCameraOn = true;
window.isMicOn = true;

// Define 20 premium games
const gamesList = [
    { id: 'live_xox', name: 'Live XOX (Multiplayer)', desc: 'Play Tic-Tac-Toe live with real-time camera & voice feed!', icon: 'fa-gamepad', type: 'multiplayer', color: 'from-pink-500 to-rose-600' },
    { id: 'xox_bot', name: 'XOX vs Bot', desc: 'Sharpen your skills against an advanced AI bot.', icon: 'fa-robot', type: 'single', color: 'from-blue-500 to-indigo-600' },
    { id: 'snake', name: 'Cyber Snake', desc: 'Classic retro snake game with a neon grid aesthetic.', icon: 'fa-circle-chevron-right', type: 'single', color: 'from-green-400 to-emerald-600' },
    { id: 'tetris', name: 'Neon Blocks (Tetris)', desc: 'Stack block formations to clear full rows.', icon: 'fa-shapes', type: 'single', color: 'from-purple-500 to-violet-700' },
    { id: 'minesweeper', name: 'Minesweeper', desc: 'Expose all safe grid cells without clicking mines.', icon: 'fa-bomb', type: 'single', color: 'from-amber-500 to-orange-600' },
    { id: 'memory', name: 'Memory Match', desc: 'Flip and pair card designs in record time.', icon: 'fa-clone', type: 'single', color: 'from-cyan-400 to-blue-500' },
    { id: 'game_2048', name: '2048 Fusion', desc: 'Slide matching tiles to compound them up to 2048.', icon: 'fa-cubes', type: 'single', color: 'from-yellow-400 to-amber-500' },
    { id: 'flappy', name: 'Flappy Bird', desc: 'Guide the pixelated bird safely through industrial pipes.', icon: 'fa-feather', type: 'single', color: 'from-orange-400 to-red-500' },
    { id: 'pong', name: 'Retro Ping Pong', desc: 'Deflect the ball past the opponent paddle.', icon: 'fa-table-tennis-paddle-ball', type: 'single', color: 'from-teal-400 to-emerald-500' },
    { id: 'brick_breaker', name: 'Brick Breaker', desc: 'Destroy brick structures with a bouncing projectile.', icon: 'fa-border-all', type: 'single', color: 'from-fuchsia-500 to-pink-600' },
    { id: 'whack_mole', name: 'Whack-a-Mole', desc: 'Hit fast emerging targets before time expires.', icon: 'fa-hammer', type: 'single', color: 'from-red-500 to-rose-600' },
    { id: 'simon_says', name: 'Simon Says', desc: 'Memorize and replicate the sequence of sounds & colors.', icon: 'fa-brain', type: 'single', color: 'from-violet-500 to-indigo-500' },
    { id: 'rps', name: 'Rock Paper Scissors', desc: 'Classic choice battle against a clever bot.', icon: 'fa-hand-back-fist', type: 'single', color: 'from-indigo-400 to-purple-600' },
    { id: 'guess_number', name: 'Guess the Number', desc: 'Find the hidden number under high/low tips.', icon: 'fa-question-circle', type: 'single', color: 'from-emerald-400 to-teal-600' },
    { id: 'word_scramble', name: 'Word Scramble', desc: 'Rearrange shuffled letters into valid words.', icon: 'fa-font', type: 'single', color: 'from-sky-400 to-indigo-600' },
    { id: 'dice_roller', name: '3D Dice Roller', desc: 'Cast standard multi-sided dice for random results.', icon: 'fa-dice', type: 'single', color: 'from-pink-400 to-purple-500' },
    { id: 'coin_flip', name: '3D Coin Flip', desc: 'Toss a premium custom coin for Heads/Tails.', icon: 'fa-coins', type: 'single', color: 'from-yellow-500 to-orange-500' },
    { id: 'color_tap', name: 'Color Tap Speed', desc: 'Tap specified color targets within fractional seconds.', icon: 'fa-gauge-high', type: 'single', color: 'from-rose-400 to-red-600' },
    { id: 'math_quiz', name: 'Math Quiz Master', desc: 'Solve rapid math equations under strict limits.', icon: 'fa-calculator', type: 'single', color: 'from-cyan-500 to-teal-500' },
    { id: 'hangman', name: 'Cyber Hangman', desc: 'Deduce words before the neon structural gallows complete.', icon: 'fa-skull-crossbones', type: 'single', color: 'from-red-600 to-amber-600' }
];

// ==========================================
//    GLOBAL SCORE & LEADERBOARD CONTROLLER
// ==========================================

window.activeGamesTab = window.activeGamesTab || 'games';

window.saveGameScore = (gameId, score) => {
    if (!currentUser) return;
    const db = getDB();
    const user = db.users.find(u => u.username === currentUser.username);
    if (!user) return;
    
    if (!user.gameScores) user.gameScores = {};
    user.gameScores[gameId] = (user.gameScores[gameId] || 0) + score;
    
    currentUser.gameScores = user.gameScores;
    saveDB(db);
};

function renderLeaderboardHTML() {
    const db = getDB();
    const allUsers = db.users || [];
    
    const leaderboardData = allUsers.map(u => {
        const scores = u.gameScores || {};
        const totalScore = Object.values(scores).reduce((sum, val) => sum + parseInt(val || 0), 0);
        return {
            username: u.username,
            profilePic: u.profilePic || '',
            totalScore: totalScore,
            scores: scores
        };
    });
    
    leaderboardData.sort((a, b) => b.totalScore - a.totalScore);
    
    const myRankIdx = leaderboardData.findIndex(u => u.username === currentUser.username);
    const myRank = myRankIdx !== -1 ? myRankIdx + 1 : '-';
    const myTotalScore = myRankIdx !== -1 ? leaderboardData[myRankIdx].totalScore : 0;
    
    let myRankHTML = `
        <div class="p-6 bg-gradient-to-r from-brand-600/10 via-indigo-600/10 to-purple-600/10 border border-brand-500/30 rounded-3xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden">
            <div class="absolute -top-10 -left-10 w-24 h-24 bg-brand-500/20 rounded-full blur-2xl pointer-events-none"></div>
            <div class="flex items-center gap-4 relative z-10">
                <div class="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-3xl font-black shadow-md">
                    #${myRank}
                </div>
                <div>
                    <span class="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest">Your Standing</span>
                    <h3 class="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        ${currentUser.username}
                        <span class="px-2 py-0.5 text-[9px] bg-brand-600 text-white rounded-full font-bold uppercase">Active</span>
                    </h3>
                </div>
            </div>
            <div class="text-center sm:text-right relative z-10">
                <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Aggregate Score</span>
                <p class="text-3xl font-black text-brand-600 dark:text-brand-400">${myTotalScore} <span class="text-sm text-gray-400 font-bold">PTS</span></p>
            </div>
        </div>
    `;

    let rankRows = leaderboardData.map((player, idx) => {
        const rank = idx + 1;
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        else medal = `<span class="text-gray-400 dark:text-gray-500 font-bold font-mono text-sm">#${rank}</span>`;
        
        let highlightClass = player.username === currentUser.username
            ? 'bg-brand-500/10 border border-brand-500/30 shadow-inner animate-pulse'
            : 'bg-white/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-white/5';
            
        let nameHighlight = player.username === currentUser.username ? 'text-brand-600 dark:text-brand-400 font-black' : 'text-gray-900 dark:text-white font-bold';
        
        const avatar = player.profilePic
            ? `<img src="${player.profilePic}" class="w-10 h-10 object-cover rounded-xl shadow-inner border border-gray-200 dark:border-white/10">`
            : `<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm"><i class="fas fa-user text-xs"></i></div>`;

        return `
            <div class="flex items-center justify-between p-4 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 shadow-sm ${highlightClass}">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 flex items-center justify-center text-xl">
                        ${medal}
                    </div>
                    ${avatar}
                    <div>
                        <h4 class="text-sm ${nameHighlight}">${player.username} ${player.username === currentUser.username ? '<span class="text-[9px] px-1.5 py-0.5 bg-brand-500 text-white rounded font-bold uppercase ml-1.5">You</span>' : ''}</h4>
                        <p class="text-[10px] text-gray-400 font-bold uppercase">${Object.keys(player.scores).length} Games Played</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-sm font-black text-gray-800 dark:text-gray-200">${player.totalScore}</span>
                    <span class="text-[9px] text-gray-400 font-extrabold uppercase ml-0.5">PTS</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="max-w-4xl mx-auto space-y-6">
            ${myRankHTML}
            
            <div class="bg-gray-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 space-y-4">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-2"><i class="fas fa-users text-indigo-500"></i> Global Leaderboard Ranking</h3>
                <div class="space-y-3">
                    ${rankRows}
                </div>
            </div>
        </div>
    `;
}

function renderScorecardHTML() {
    const scores = currentUser.gameScores || {};
    const totalScore = Object.values(scores).reduce((sum, val) => sum + parseInt(val || 0), 0);
    
    let breakdownCards = gamesList.map(game => {
        const score = scores[game.id] || 0;
        const color = score > 0 ? 'text-brand-500 font-black' : 'text-gray-400 font-medium';
        return `
            <div class="bg-white/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${game.color} text-white flex items-center justify-center text-sm shadow-sm">
                        <i class="fas ${game.icon}"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-sm text-gray-800 dark:text-white">${game.name}</h4>
                        <p class="text-[9px] text-gray-400 uppercase font-bold tracking-wider">${game.type === 'multiplayer' ? 'Multiplayer' : 'Single / Multi'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-base ${color}">${score}</span>
                    <span class="text-[9px] text-gray-400 font-extrabold uppercase ml-0.5">PTS</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="max-w-5xl mx-auto space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-gradient-to-br from-brand-600 to-indigo-600 p-6 rounded-3xl shadow-xl text-white text-center flex flex-col justify-center min-h-[140px]">
                    <span class="text-[10px] text-brand-200 font-bold uppercase tracking-widest">Aggregate Marks</span>
                    <h4 class="text-4xl font-black mt-2">${totalScore}</h4>
                    <p class="text-xs text-brand-100 mt-1">Total score accumulated across all games</p>
                </div>
                <div class="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-3xl shadow-xl text-white text-center flex flex-col justify-center min-h-[140px]">
                    <span class="text-[10px] text-cyan-100 font-bold uppercase tracking-widest">Games Played</span>
                    <h4 class="text-4xl font-black mt-2">${Object.keys(scores).length}</h4>
                    <p class="text-xs text-cyan-100 mt-1">Unique game types successfully completed</p>
                </div>
                <div class="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-3xl shadow-xl text-white text-center flex flex-col justify-center min-h-[140px]">
                    <span class="text-[10px] text-purple-100 font-bold uppercase tracking-widest">Level Progression</span>
                    <h4 class="text-4xl font-black mt-2">LVL ${Math.floor(totalScore / 100) + 1}</h4>
                    <p class="text-xs text-purple-100 mt-1">Earn 100 marks to advance your level</p>
                </div>
            </div>

            <div class="bg-gray-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 space-y-4">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-2"><i class="fas fa-list-check text-brand-500"></i> Game-wise Marks Breakdown</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    ${breakdownCards}
                </div>
            </div>
        </div>
    `;
}

window.renderLiveGamesHTML = () => {
    if (currentUser) {
        const db = getDB();
        const freshUser = db.users.find(u => u.username === currentUser.username);
        if (freshUser) {
            currentUser = freshUser;
        }
    }

    if (!currentUser) {
        return `
            <div class="glass-panel p-10 text-center my-10 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 font-sans">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4 animate-pulse"></i>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Authentication Required</h3>
                <p class="text-gray-600 dark:text-gray-400 mt-2">You must be logged in to view and play Live Games. Please log in first.</p>
            </div>
        `;
    }

    if (window.activeGameId) {
        return renderActiveGameLayout();
    }

    const tabClass = (tab) => window.activeGamesTab === tab
        ? "bg-brand-600 text-white shadow-lg scale-105"
        : "bg-white/50 dark:bg-slate-800/40 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200/50 dark:border-white/5";

    const tabsHTML = `
        <div class="flex flex-wrap gap-3 mb-8">
            <button onclick="switchGamesTab('games')" class="px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${tabClass('games')}">
                <i class="fas fa-gamepad"></i> 🎮 Games Hub
            </button>
            <button onclick="switchGamesTab('leaderboard')" class="px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${tabClass('leaderboard')}">
                <i class="fas fa-trophy text-yellow-500"></i> 🏆 Global Leaderboard
            </button>
            <button onclick="switchGamesTab('scorecard')" class="px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${tabClass('scorecard')}">
                <i class="fas fa-chart-pie text-cyan-500"></i> 📊 My Scorecard
            </button>
        </div>
    `;

    if (window.activeGamesTab === 'leaderboard') {
        return `
            <div class="space-y-8 font-sans max-w-7xl mx-auto py-6">
                <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 p-8 md:p-12 shadow-2xl text-white">
                    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
                    <div class="relative z-10 max-w-xl">
                        <span class="px-3.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-md uppercase tracking-wider mb-4 inline-block">Real-time Rankings</span>
                        <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">Global Leaderboard</h1>
                        <p class="text-sm md:text-base text-brand-100 leading-relaxed">See where you stand among all registered users in the network. Win games and scale the ranks!</p>
                    </div>
                </div>

                ${tabsHTML}
                ${renderLeaderboardHTML()}
            </div>
        `;
    }

    if (window.activeGamesTab === 'scorecard') {
        return `
            <div class="space-y-8 font-sans max-w-7xl mx-auto py-6">
                <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 via-brand-600 to-indigo-600 p-8 md:p-12 shadow-2xl text-white">
                    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
                    <div class="relative z-10 max-w-xl">
                        <span class="px-3.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-md uppercase tracking-wider mb-4 inline-block">Player Insights</span>
                        <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">Personal Scorecard</h1>
                        <p class="text-sm md:text-base text-brand-100 leading-relaxed">Detailed visual breakdown of your accomplishments game-by-game and total overall score.</p>
                    </div>
                </div>

                ${tabsHTML}
                ${renderScorecardHTML()}
            </div>
        `;
    }

    let gamesGrid = gamesList.map(game => `
        <div onclick="selectGame('${game.id}')" class="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-white/5 bg-white/70 dark:bg-slate-900/40 p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between">
            <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br ${game.color} rounded-full opacity-10 blur-xl group-hover:scale-150 transition-all duration-500"></div>
            <div>
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} text-white flex items-center justify-center text-xl shadow-md mb-4 group-hover:rotate-6 transition-all">
                    <i class="fas ${game.icon}"></i>
                </div>
                <h4 class="font-bold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    ${game.name}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">${game.desc}</p>
            </div>
            <div class="mt-6 flex items-center justify-between">
                <span class="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-slate-500">${game.type === 'multiplayer' ? 'Multiplayer Only' : 'Single / Multiplayer'}</span>
                <span class="text-brand-500 group-hover:translate-x-1 transition-transform text-sm font-semibold flex items-center gap-1">Play <i class="fas fa-arrow-right text-[10px]"></i></span>
            </div>
        </div>
    `).join('');

    return `
        <div class="space-y-8 font-sans max-w-7xl mx-auto py-6">
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 p-8 md:p-12 shadow-2xl text-white">
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
                <div class="relative z-10 max-w-xl">
                    <span class="px-3.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-md uppercase tracking-wider mb-4 inline-block">Saveen Arcade Hub</span>
                    <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">Interactive Arcade Center</h1>
                    <p class="text-sm md:text-base text-brand-100 leading-relaxed">Experience zero-latency Real-time Multiplayer games complete with instant WebRTC camera feeds and HD voice calls on ALL games!</p>
                </div>
            </div>

            ${tabsHTML}

            <div>
                <h3 class="font-bold text-xl mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                    <i class="fas fa-play text-brand-500"></i> Browse Available Games (${gamesList.length})
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${gamesGrid}
                </div>
            </div>
        </div>
    `;
};

window.switchGamesTab = (tab) => {
    window.activeGamesTab = tab;
    render();
};

window.selectGame = (gameId) => {
    window.activeGameId = gameId;
    window.isMultiplayer = null; // Show Game Mode Chooser first
    render();
};

window.exitGame = () => {
    stopLocalStream();
    cleanupPeerConnection();
    if (window.gameRoomId) {
        removePlayerFromRoom(window.gameRoomId);
        window.gameRoomId = null;
    }
    window.activeGameId = null;
    window.isMultiplayer = null;
    render();
};

// ==========================================
//           GAME LAYOUT DISPATCHER
// ==========================================

function renderActiveGameLayout() {
    let title = gamesList.find(g => g.id === window.activeGameId)?.name || 'Game';
    
    return `
        <div class="font-sans max-w-6xl mx-auto py-6 space-y-6">
            <!-- Header bar -->
            <div class="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-gray-200/50 dark:border-white/5 px-6 py-4 rounded-2xl shadow-sm">
                <div class="flex items-center gap-3">
                    <button onclick="exitGame()" class="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors bg-gray-100 dark:bg-white/5 w-10 h-10 rounded-xl flex items-center justify-center">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">${title}</h2>
                        <p class="text-[10px] text-gray-500 dark:text-gray-400">Saveen Arcade Platform</p>
                    </div>
                </div>
                <div>
                    <span class="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/20">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Live Connection
                    </span>
                </div>
            </div>

            <!-- Game Container -->
            <div id="game-workspace" class="bg-white/80 dark:bg-slate-900/60 backdrop-blur border border-gray-200/50 dark:border-white/5 p-6 rounded-3xl min-h-[500px] shadow-lg flex flex-col justify-between">
                ${renderIndividualGame()}
            </div>
        </div>
    `;
}

function renderIndividualGame() {
    if (window.isMultiplayer === null) {
        return renderGameModeChooser();
    }
    
    if (window.isMultiplayer && !window.gameRoomId) {
        return renderGenericMultiplayerLobby();
    }
    
    if (window.isMultiplayer && window.gameRoomId) {
        return renderActiveMultiplayerGameRoom();
    }

    // Offline / Bot mode dispatching
    switch (window.activeGameId) {
        case 'live_xox':
            // Tic-Tac-Toe Live Multiplayer
            window.isMultiplayer = true;
            initMultiplayerLobby();
            return renderGenericMultiplayerLobby();
        case 'xox_bot':
            return renderXOXBot();
        case 'snake':
            return renderSnake();
        case 'tetris':
            return renderTetris();
        case 'minesweeper':
            return renderMinesweeper();
        case 'memory':
            return renderMemory();
        case 'game_2048':
            return render2048();
        case 'flappy':
            return renderFlappy();
        case 'pong':
            return renderPong();
        case 'brick_breaker':
            return renderBrickBreaker();
        case 'whack_mole':
            return renderWhackMole();
        case 'simon_says':
            return renderSimonSays();
        case 'rps':
            return renderRPS();
        case 'guess_number':
            return renderGuessNumber();
        case 'word_scramble':
            return renderWordScramble();
        case 'dice_roller':
            return renderDiceRoller();
        case 'coin_flip':
            return renderCoinFlip();
        case 'color_tap':
            return renderColorTap();
        case 'math_quiz':
            return renderMathQuiz();
        case 'hangman':
            return renderHangman();
        default:
            return `<div class="text-center py-20 text-gray-500">Game template loaded! Game ID: ${window.activeGameId}</div>`;
    }
}

// Mode Selector
function renderGameModeChooser() {
    const game = gamesList.find(g => g.id === window.activeGameId);
    const hasOfflineMode = game.id !== 'live_xox';
    
    return `
        <div class="max-w-2xl mx-auto py-10 text-center space-y-8 font-sans">
            <div class="space-y-4">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} text-white flex items-center justify-center text-3xl shadow-lg mx-auto transform hover:scale-105 transition-all">
                    <i class="fas ${game.icon}"></i>
                </div>
                <h3 class="text-3xl font-extrabold text-gray-900 dark:text-white">${game.name}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">${game.desc}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                ${hasOfflineMode ? `
                <div onclick="selectGameMode(false)" class="group rounded-2xl border border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-slate-900/30 p-6 hover:border-brand-500/50 hover:bg-brand-500/[0.02] cursor-pointer transition-all duration-300 hover:-translate-y-1 text-left flex flex-col justify-between min-h-[160px] shadow-sm">
                    <div>
                        <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300 flex items-center justify-center text-lg mb-4 group-hover:bg-brand-500 group-hover:text-white transition-all">
                            <i class="fas fa-user"></i>
                        </div>
                        <h4 class="font-bold text-base text-gray-900 dark:text-white mb-1">Single Player Mode</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 leading-normal">Play solo offline to practice and master your score.</p>
                    </div>
                    <span class="text-brand-500 text-xs font-bold mt-4 flex items-center gap-1">Start Offline <i class="fas fa-chevron-right text-[9px]"></i></span>
                </div>
                ` : ''}

                <div onclick="selectGameMode(true)" class="group rounded-2xl border border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-slate-900/30 p-6 hover:border-pink-500/50 hover:bg-pink-500/[0.02] cursor-pointer transition-all duration-300 hover:-translate-y-1 text-left flex flex-col justify-between min-h-[160px] shadow-sm ${!hasOfflineMode ? 'col-span-full max-w-md mx-auto w-full' : ''}">
                    <div>
                        <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300 flex items-center justify-center text-lg mb-4 group-hover:bg-pink-500 group-hover:text-white transition-all">
                            <i class="fas fa-users"></i>
                        </div>
                        <h4 class="font-bold text-base text-gray-900 dark:text-white mb-1">Online Multiplayer Mode</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 leading-normal">Invite online users, talk in real-time on live camera, and sync scores & moves instantly!</p>
                    </div>
                    <span class="text-pink-500 text-xs font-bold mt-4 flex items-center gap-1">Challenge Online Players <i class="fas fa-chevron-right text-[9px]"></i></span>
                </div>
            </div>
        </div>
    `;
}

window.selectGameMode = (isMulti) => {
    window.isMultiplayer = isMulti;
    if (isMulti) {
        initMultiplayerLobby();
    }
    render();
};

// ==========================================
//      UNIVERSAL MULTIPLAYER MATCH ENGINE
// ==========================================

let currentLobbyRooms = {};

function initMultiplayerLobby() {
    if (window.dbRef) {
        window.dbRef.child('gamesState/rooms').on('value', (snap) => {
            currentLobbyRooms = snap.val() || {};
            // Realtime rendering updates
            if (window.activeGameId && window.isMultiplayer) {
                if (!window.gameRoomId) {
                    const lobbyEl = document.getElementById('multiplayer-lobby-content');
                    if (lobbyEl) {
                        lobbyEl.innerHTML = renderMultiplayerRoomsList();
                    }
                } else {
                    // Update active multiplayer view reactive to Firebase syncing
                    const room = currentLobbyRooms[window.gameRoomId];
                    if (room) {
                        const workspace = document.getElementById('game-workspace');
                        if (workspace && room.players?.guest) {
                            // If player was waiting and now guest joined, reload to start camera WebRTC
                            const opponentPlaceholder = document.getElementById('opponentCamPlaceholder');
                            if (opponentPlaceholder && opponentPlaceholder.textContent.includes('Awaiting Opponent...')) {
                                negotiatePeerConnection();
                            }
                        }
                    }
                }
            }
        });
    }
}

function renderGenericMultiplayerLobby() {
    const game = gamesList.find(g => g.id === window.activeGameId);
    
    return `
        <div class="max-w-4xl mx-auto space-y-8 py-6 font-sans">
            <div class="text-center max-w-xl mx-auto space-y-3">
                <span class="px-2.5 py-0.5 text-[9px] bg-rose-500 text-white rounded-full font-bold uppercase animate-pulse">Lobby</span>
                <h3 class="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">${game.name} Matching</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Join a waiting room or create a custom one. Real-time camera streams & microphone audio will activate automatically!</p>
                <button onclick="createNewMultiplayerRoom('${game.id}')" class="mt-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mx-auto">
                    <i class="fas fa-plus-circle"></i> Create Room for ${game.name}
                </button>
            </div>

            <div class="border-t border-gray-100 dark:border-white/5 pt-8">
                <h4 class="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span> Active Matching Rooms
                </h4>
                <div id="multiplayer-lobby-content" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${renderMultiplayerRoomsList()}
                </div>
            </div>
        </div>
    `;
}

function renderMultiplayerRoomsList() {
    const rooms = Object.entries(currentLobbyRooms).filter(([_, r]) => r.gameId === window.activeGameId);
    if (rooms.length === 0) {
        return `
            <div class="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-900/20 border border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                <i class="fas fa-hourglass-start text-3xl mb-3 text-gray-400"></i>
                <p class="font-bold text-sm">No Waiting Rooms Available</p>
                <p class="text-xs text-gray-400">Create a room above to wait for opponents!</p>
            </div>
        `;
    }

    return rooms.map(([roomId, room]) => {
        const isFull = room.players?.guest !== undefined;
        return `
            <div class="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-gray-200/50 dark:border-white/5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                <div>
                    <h5 class="font-extrabold text-sm text-gray-900 dark:text-white">Host: ${room.players?.host?.username}</h5>
                    <p class="text-[10px] text-gray-400 mt-1">Room ID: ${roomId} • status: ${isFull ? '<span class="text-red-500 font-bold">Full</span>' : '<span class="text-emerald-500 font-bold">Waiting for Player</span>'}</p>
                </div>
                ${!isFull ? `
                    <button onclick="joinMultiplayerRoom('${roomId}')" class="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all">
                        Join Match
                    </button>
                ` : `
                    <button disabled class="bg-gray-100 dark:bg-white/5 text-gray-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed">
                        Room Full
                    </button>
                `}
            </div>
        `;
    }).join('');
}

window.createNewMultiplayerRoom = (gameId) => {
    const roomId = 'room_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const db = getDB();
    
    if (!db.gamesState) db.gamesState = { rooms: {}, activePlayers: {} };
    if (!db.gamesState.rooms) db.gamesState.rooms = {};
    
    const newRoom = {
        roomId: roomId,
        gameId: gameId,
        players: {
            host: { username: currentUser.username, id: currentUser.id }
        },
        gameState: {
            status: 'waiting',
            turn: 'host',
            hostScore: 0,
            guestScore: 0,
            board: Array(9).fill(''),
            winner: null,
            isDraw: false,
            timestamp: new Date().toISOString()
        }
    };

    // Custom configuration parameters per-game
    if (gameId === 'memory') {
        const icons = ['ghost', 'star', 'fire', 'heart', 'gem', 'paw', 'bolt', 'bomb'];
        const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
        newRoom.gameState.cards = deck.map(icon => ({ icon, flipped: false, matched: false }));
        newRoom.gameState.selectedIndices = [];
    } else if (gameId === 'minesweeper') {
        const board = Array(64).fill().map(() => ({ mine: false, count: 0, open: false }));
        let planted = 0;
        while (planted < 12) {
            let idx = Math.floor(Math.random() * 64);
            if (!board[idx].mine) { board[idx].mine = true; planted++; }
        }
        for (let i = 0; i < 64; i++) {
            if (board[i].mine) continue;
            let r = Math.floor(i / 8), c = i % 8;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        if (board[nr * 8 + nc].mine) count++;
                    }
                }
            }
            board[i].count = count;
        }
        newRoom.gameState.minesBoard = board;
    } else if (gameId === 'guess_number') {
        newRoom.gameState.secretNumber = Math.floor(Math.random() * 100) + 1;
        newRoom.gameState.hint = 'Start guessing!';
    } else if (gameId === 'word_scramble') {
        const pool = ['DEVELOPER', 'FIREBASE', 'PORTFOLIO', 'CREATIVE', 'PROGRAMMER', 'INVENTORY', 'DATABASE'];
        const word = pool[Math.floor(Math.random() * pool.length)];
        newRoom.gameState.word = word;
        newRoom.gameState.scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    } else if (gameId === 'hangman') {
        const pool = ['REACT', 'FIREBASE', 'HTML', 'PROGRAM', 'ARCADE', 'INVENTORY'];
        newRoom.gameState.word = pool[Math.floor(Math.random() * pool.length)];
        newRoom.gameState.guesses = [];
        newRoom.gameState.errors = 0;
    } else if (gameId === 'rps') {
        newRoom.gameState.hostChoice = '';
        newRoom.gameState.guestChoice = '';
    } else if (gameId === 'math_quiz') {
        newRoom.gameState.board = ['7 + 8 = ?'];
    }

    db.gamesState.rooms[roomId] = newRoom;
    saveDB(db);
    
    window.gameRoomId = roomId;
    startLocalWebcam();
    setupFirebaseSignalListener(roomId, true);
    render();
};

window.joinMultiplayerRoom = (roomId) => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[roomId];
    if (!room) {
        alert('Room does not exist!');
        return;
    }
    
    room.players.guest = { username: currentUser.username, id: currentUser.id };
    room.gameState.status = 'playing';
    saveDB(db);
    
    window.gameRoomId = roomId;
    startLocalWebcam();
    setupFirebaseSignalListener(roomId, false);
    render();
};

window.resetMultiplayerMatch = () => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const gameId = room.gameId;
    room.gameState = {
        status: 'playing',
        turn: 'host',
        hostScore: 0,
        guestScore: 0,
        board: Array(9).fill(''),
        winner: null,
        isDraw: false,
        timestamp: new Date().toISOString()
    };

    if (gameId === 'memory') {
        const icons = ['ghost', 'star', 'fire', 'heart', 'gem', 'paw', 'bolt', 'bomb'];
        const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
        room.gameState.cards = deck.map(icon => ({ icon, flipped: false, matched: false }));
        room.gameState.selectedIndices = [];
    } else if (gameId === 'minesweeper') {
        const board = Array(64).fill().map(() => ({ mine: false, count: 0, open: false }));
        let planted = 0;
        while (planted < 12) {
            let idx = Math.floor(Math.random() * 64);
            if (!board[idx].mine) { board[idx].mine = true; planted++; }
        }
        for (let i = 0; i < 64; i++) {
            if (board[i].mine) continue;
            let r = Math.floor(i / 8), c = i % 8;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        if (board[nr * 8 + nc].mine) count++;
                    }
                }
            }
            board[i].count = count;
        }
        room.gameState.minesBoard = board;
    } else if (gameId === 'guess_number') {
        room.gameState.secretNumber = Math.floor(Math.random() * 100) + 1;
        room.gameState.hint = 'Start guessing!';
    } else if (gameId === 'word_scramble') {
        const pool = ['DEVELOPER', 'FIREBASE', 'PORTFOLIO', 'CREATIVE', 'PROGRAMMER', 'INVENTORY', 'DATABASE'];
        const word = pool[Math.floor(Math.random() * pool.length)];
        room.gameState.word = word;
        room.gameState.scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    } else if (gameId === 'hangman') {
        const pool = ['REACT', 'FIREBASE', 'HTML', 'PROGRAM', 'ARCADE', 'INVENTORY'];
        room.gameState.word = pool[Math.floor(Math.random() * pool.length)];
        room.gameState.guesses = [];
        room.gameState.errors = 0;
    } else if (gameId === 'rps') {
        room.gameState.hostChoice = '';
        room.gameState.guestChoice = '';
    } else if (gameId === 'math_quiz') {
        room.gameState.board = ['7 + 8 = ?'];
    }

    saveDB(db);
};

function removePlayerFromRoom(roomId) {
    const db = getDB();
    const room = db.gamesState?.rooms?.[roomId];
    if (!room) return;

    const amHost = room.players.host.username === currentUser.username;
    if (amHost) {
        delete db.gamesState.rooms[roomId];
    } else {
        delete room.players.guest;
        room.gameState = {
            status: 'waiting',
            turn: 'host',
            hostScore: 0,
            guestScore: 0,
            board: Array(9).fill(''),
            winner: null,
            isDraw: false
        };
    }
    saveDB(db);
}

// Score Duel Synchronizer
window.syncMultiplayerScore = (score) => {
    if (!window.gameRoomId) return;
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    if (amHost) {
        room.gameState.hostScore = score;
    } else {
        room.gameState.guestScore = score;
    }
    
    if (window.dbRef) {
        window.dbRef.child(`gamesState/rooms/${window.gameRoomId}/gameState`).update({
            hostScore: room.gameState.hostScore,
            guestScore: room.gameState.guestScore
        });
    }
};

window.syncMultiplayerGameOver = () => {
    if (!window.gameRoomId) return;
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    if (amHost) {
        room.gameState.hostFinished = true;
    } else {
        room.gameState.guestFinished = true;
    }
    
    if (room.gameState.hostFinished && room.gameState.guestFinished) {
        if (room.gameState.hostScore > room.gameState.guestScore) {
            room.gameState.winner = 'host';
        } else if (room.gameState.guestScore > room.gameState.hostScore) {
            room.gameState.winner = 'guest';
        } else {
            room.gameState.isDraw = true;
        }
    }
    
    if (window.dbRef) {
        window.dbRef.child(`gamesState/rooms/${window.gameRoomId}/gameState`).update({
            hostFinished: room.gameState.hostFinished || false,
            guestFinished: room.gameState.guestFinished || false,
            winner: room.gameState.winner || null,
            isDraw: room.gameState.isDraw || false
        });
    }
};

// ==========================================
//      UNIVERSAL ROOM RENDERING ENGINE
// ==========================================

function renderActiveMultiplayerGameRoom() {
    const room = currentLobbyRooms[window.gameRoomId];
    if (!room) {
        return `<div class="text-center py-20 text-gray-500 font-bold">Connecting to Room...</div>`;
    }

    const hostUser = room.players?.host;
    const guestUser = room.players?.guest;
    const amHost = hostUser?.username === currentUser.username;
    
    // Check turn
    const isMyTurn = (room.gameState?.turn === 'host' && amHost) || (room.gameState?.turn === 'guest' && !amHost);
    const winner = room.gameState?.winner;
    const isDraw = room.gameState?.isDraw;
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            <!-- Left Panel: Game Board -->
            <div class="lg:col-span-2 space-y-6 flex flex-col justify-between">
                <div class="flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-gray-200/50 dark:border-white/5">
                    <div>
                        <span class="text-[10px] text-gray-500 font-bold uppercase">Room Code: ${window.gameRoomId}</span>
                        <h4 class="font-extrabold text-lg text-gray-900 dark:text-white">
                            ${winner ? `${winner === 'host' ? hostUser?.username : guestUser?.username} Won the Match! 🎉` : isDraw ? 'Match Draw!' : isMyTurn ? '🚨 Your Turn! Make your move.' : `Waiting for ${room.gameState?.turn === 'host' ? hostUser?.username : guestUser?.username}...`}
                        </h4>
                    </div>
                    ${(winner || isDraw) ? `
                        <button onclick="resetMultiplayerMatch()" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md">
                            <i class="fas fa-rotate-right"></i> Play Again
                        </button>
                    ` : ''}
                </div>

                <!-- Interactive Game Workspace -->
                <div class="flex-grow flex items-center justify-center p-4 bg-slate-900/10 dark:bg-black/10 rounded-2xl border border-gray-200/50 dark:border-white/5 min-h-[300px]">
                    ${renderMultiplayerGameContent(room, amHost, isMyTurn)}
                </div>

                <!-- Score Board -->
                <div class="flex justify-around items-center bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-gray-200/50 dark:border-white/5 text-center">
                    <div>
                        <p class="text-xs text-gray-400 font-bold uppercase">Host: ${hostUser?.username}</p>
                        <p class="font-extrabold text-xl text-brand-600 dark:text-brand-400">${room.gameState?.hostScore || 0}</p>
                    </div>
                    <div class="text-xl font-extrabold text-gray-300">vs</div>
                    <div>
                        <p class="text-xs text-gray-400 font-bold uppercase">Guest: ${guestUser ? guestUser.username : '<span class="text-rose-500 animate-pulse">Waiting...</span>'}</p>
                        <p class="font-extrabold text-xl text-purple-600 dark:text-purple-400">${room.gameState?.guestScore || 0}</p>
                    </div>
                </div>
            </div>

            <!-- Right Panel: Camera & Voice Streams -->
            <div class="space-y-6">
                <div class="bg-gray-50/50 dark:bg-slate-800/30 border border-gray-200/50 dark:border-white/5 rounded-3xl p-5 space-y-4">
                    <h4 class="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2"><i class="fas fa-video text-rose-500"></i> Video & Audio Feeds</h4>
                    
                    <!-- My Video Feed -->
                    <div class="relative rounded-2xl bg-black overflow-hidden aspect-video border border-gray-200/50 dark:border-white/10 shadow-inner">
                        <video id="myWebcamVideo" autoplay muted playsinline class="w-full h-full object-cover transform -scale-x-100"></video>
                        <div class="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white/50 text-xs hidden" id="myCamPlaceholder">
                            <div class="text-center">
                                <i class="fas fa-video-slash text-2xl mb-1.5 text-rose-500"></i>
                                <p>Camera Off</p>
                            </div>
                        </div>
                        <span class="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur rounded-lg text-[10px] font-bold text-white uppercase flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 bg-brand-500 rounded-full animate-ping"></span> You (${currentUser.username})
                        </span>
                    </div>

                    <!-- Opponent's Video Feed -->
                    <div class="relative rounded-2xl bg-black overflow-hidden aspect-video border border-gray-200/50 dark:border-white/10 shadow-inner">
                        <video id="opponentWebcamVideo" autoplay playsinline class="w-full h-full object-cover"></video>
                        <div class="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white/50 text-xs flex" id="opponentCamPlaceholder">
                            <div class="text-center">
                                <i class="fas fa-video-slash text-2xl mb-1.5 text-rose-500"></i>
                                <p>${guestUser ? 'Awaiting camera stream...' : 'Awaiting Opponent...'}</p>
                            </div>
                        </div>
                        <span class="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur rounded-lg text-[10px] font-bold text-white uppercase flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span> ${guestUser ? guestUser.username : 'Opponent'}
                        </span>
                    </div>

                    <!-- Media Controls -->
                    <div class="flex gap-2">
                        <button onclick="toggleMyCamera()" id="btnToggleCam" class="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5">
                            <i class="fas fa-video"></i> <span>Stop Camera</span>
                        </button>
                        <button onclick="toggleMyMic()" id="btnToggleMic" class="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5">
                            <i class="fas fa-microphone"></i> <span>Mute Audio</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderMultiplayerGameContent(room, amHost, isMyTurn) {
    const gameId = room.gameId;
    const winner = room.gameState?.winner;
    const isDraw = room.gameState?.isDraw;
    
    // 1. TIC-TAC-TOE (live_xox, xox_bot)
    if (gameId === 'live_xox' || gameId === 'xox_bot') {
        const board = room.gameState?.board || Array(9).fill('');
        let cellsHTML = board.map((cell, idx) => {
            let hoverClass = (cell === '' && !winner && !isDraw && isMyTurn) ? 'hover:bg-pink-500/10 cursor-pointer' : 'cursor-not-allowed';
            let colorClass = cell === 'X' ? 'text-pink-500' : 'text-blue-500';
            return `
                <div onclick="makeMultiplayerXOXMove(${idx})" class="aspect-square bg-gray-100/50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-center text-4xl font-black border border-gray-200/50 dark:border-white/5 transition-all ${hoverClass} ${colorClass}">
                    ${cell === 'X' ? '<i class="fas fa-times animate-scale-up"></i>' : cell === 'O' ? '<i class="far fa-circle animate-scale-up"></i>' : ''}
                </div>
            `;
        }).join('');
        
        return `<div class="grid grid-cols-3 gap-4 max-w-[320px] mx-auto w-full py-4">${cellsHTML}</div>`;
    }
    
    // 2. MEMORY MATCH
    if (gameId === 'memory') {
        const cards = room.gameState?.cards || [];
        let cardsHTML = cards.map((card, idx) => {
            let inner = '<i class="fas fa-question text-gray-300"></i>';
            let cardClass = 'bg-gray-100 dark:bg-slate-800 hover:scale-105';
            
            if (card.flipped || card.matched) {
                inner = `<i class="fas fa-${card.icon} text-brand-500"></i>`;
                cardClass = 'bg-brand-500/10 border border-brand-500/20';
            }
            
            return `<div onclick="makeMemoryMultiplayerMove(${idx})" class="aspect-square rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-gray-200/50 dark:border-white/5 cursor-pointer transition-all duration-300 ${cardClass}">${inner}</div>`;
        }).join('');
        
        return `<div class="grid grid-cols-4 gap-3 max-w-[300px] mx-auto w-full">${cardsHTML}</div>`;
    }
    
    // 3. MINESWEEPER
    if (gameId === 'minesweeper') {
        const board = room.gameState?.minesBoard || [];
        let minesHTML = board.map((cell, idx) => {
            let content = '';
            let cellClass = 'bg-gray-200 dark:bg-slate-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-700';
            
            if (cell.open) {
                cellClass = 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5';
                if (cell.mine) {
                    content = '<i class="fas fa-bomb text-red-500 animate-scale-up"></i>';
                    cellClass = 'bg-red-500/10 border border-red-500/20';
                } else if (cell.count > 0) {
                    content = cell.count;
                }
            }
            
            return `<div onclick="makeMinesweeperMultiplayerMove(${idx})" class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black select-none ${cellClass}">${content}</div>`;
        }).join('');
        
        return `
            <div class="space-y-3 text-center">
                <p class="text-xs text-gray-400 font-bold uppercase">Minesweeper Turn-Based Board</p>
                <div class="grid grid-cols-8 gap-1 p-2 bg-gray-100/50 dark:bg-slate-800/40 rounded-xl border border-gray-200/50 dark:border-white/5 max-w-[280px] mx-auto">${minesHTML}</div>
            </div>
        `;
    }
    
    // 4. GUESS THE NUMBER
    if (gameId === 'guess_number') {
        return `
            <div class="space-y-4 text-center max-w-sm mx-auto">
                <p class="text-xs text-gray-400 font-bold uppercase">Guess the Secret Number (1-100)</p>
                <h4 class="text-lg font-black text-brand-600 dark:text-brand-400 my-2">${room.gameState?.hint || 'Start guessing!'}</h4>
                <div class="flex gap-2 justify-center">
                    <input type="number" id="guessMultiInput" placeholder="42" class="glass-input px-4 py-2 rounded-xl text-center focus:ring-2 focus:ring-brand-500 flex-1 max-w-[120px]">
                    <button onclick="makeGuessNumberMultiplayerMove()" ${!isMyTurn ? 'disabled' : ''} class="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold shadow-md disabled:opacity-50">Guess</button>
                </div>
            </div>
        `;
    }
    
    // 5. ROCK PAPER SCISSORS
    if (gameId === 'rps') {
        const myChoice = amHost ? room.gameState?.hostChoice : room.gameState?.guestChoice;
        const oppChoice = amHost ? room.gameState?.guestChoice : room.gameState?.hostChoice;
        
        if (room.gameState?.hostChoice && room.gameState?.guestChoice) {
            return `
                <div class="space-y-4 text-center">
                    <p class="text-sm font-bold text-gray-500">Choice Reveal</p>
                    <div class="flex gap-10 justify-center items-center text-3xl">
                        <div>
                            <p class="text-xs text-gray-400 font-bold uppercase mb-1">You</p>
                            <p>${myChoice === 'rock' ? '✊' : myChoice === 'paper' ? '✋' : '✌️'}</p>
                        </div>
                        <div class="text-base text-gray-400 font-mono">VS</div>
                        <div>
                            <p class="text-xs text-gray-400 font-bold uppercase mb-1">Opponent</p>
                            <p>${oppChoice === 'rock' ? '✊' : oppChoice === 'paper' ? '✋' : '✌️'}</p>
                        </div>
                    </div>
                    <p class="text-base font-extrabold text-brand-600 my-4">
                        ${winner ? `${winner === (amHost ? 'host' : 'guest') ? 'You Won the round! 🎉' : 'Opponent Won! 🤖'}` : 'Tie Match! ✊✋✌️'}
                    </p>
                </div>
            `;
        }
        
        return `
            <div class="space-y-4 text-center">
                <p class="text-xs text-gray-400 font-bold uppercase">Secret Battle (Make Choice)</p>
                <div class="flex gap-4 justify-center py-4">
                    <button onclick="makeRPSMultiplayerMove('rock')" ${myChoice ? 'disabled' : ''} class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border hover:bg-brand-500 hover:text-white transition-all text-2xl flex items-center justify-center disabled:opacity-50 disabled:bg-brand-500 disabled:text-white">✊</button>
                    <button onclick="makeRPSMultiplayerMove('paper')" ${myChoice ? 'disabled' : ''} class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border hover:bg-brand-500 hover:text-white transition-all text-2xl flex items-center justify-center disabled:opacity-50 disabled:bg-brand-500 disabled:text-white">✋</button>
                    <button onclick="makeRPSMultiplayerMove('scissors')" ${myChoice ? 'disabled' : ''} class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border hover:bg-brand-500 hover:text-white transition-all text-2xl flex items-center justify-center disabled:opacity-50 disabled:bg-brand-500 disabled:text-white">✌️</button>
                </div>
                <p class="text-xs text-gray-400">${myChoice ? 'Waiting for opponent choice...' : 'Select your weapon!'}</p>
            </div>
        `;
    }
    
    // 6. DICE ROLLER
    if (gameId === 'dice_roller') {
        const myRoll = amHost ? room.gameState?.hostChoice : room.gameState?.guestChoice;
        const oppRoll = amHost ? room.gameState?.guestChoice : room.gameState?.hostChoice;
        
        if (room.gameState?.hostChoice && room.gameState?.guestChoice) {
            return `
                <div class="space-y-4 text-center">
                    <div class="flex gap-10 justify-center items-center">
                        <div>
                            <p class="text-xs text-gray-400 font-bold uppercase mb-1">Your Roll</p>
                            <div class="w-16 h-16 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-2xl font-bold shadow-md">${myRoll}</div>
                        </div>
                        <div class="text-base text-gray-400 font-mono">VS</div>
                        <div>
                            <p class="text-xs text-gray-400 font-bold uppercase mb-1">Opponent</p>
                            <div class="w-16 h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center text-2xl font-bold shadow-md">${oppRoll}</div>
                        </div>
                    </div>
                    <p class="text-base font-extrabold text-brand-600 my-4">
                        ${winner ? `${winner === (amHost ? 'host' : 'guest') ? 'You Won! 🎉' : 'Opponent Won! 🤖'}` : 'Draw Roll! 🎲'}
                    </p>
                </div>
            `;
        }
        
        return `
            <div class="space-y-4 text-center">
                <p class="text-xs text-gray-400 font-bold uppercase">Roll Battle</p>
                <div class="w-20 h-20 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black text-white shadow-xl mb-4 ${myRoll ? 'animate-pulse' : ''}">
                    ${myRoll || '🎲'}
                </div>
                <button onclick="makeDiceMultiplayerMove()" ${myRoll ? 'disabled' : ''} class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50">
                    Roll Die
                </button>
            </div>
        `;
    }
    
    // 7. COIN FLIPPER
    if (gameId === 'coin_flip') {
        const myFlip = amHost ? room.gameState?.hostChoice : room.gameState?.guestChoice;
        const oppFlip = amHost ? room.gameState?.guestChoice : room.gameState?.hostChoice;
        
        if (room.gameState?.hostChoice && room.gameState?.guestChoice) {
            return `
                <div class="space-y-4 text-center">
                    <div class="flex gap-10 justify-center items-center">
                        <div>
                            <p class="text-xs text-gray-400 font-bold uppercase mb-1">Your Choice</p>
                            <div class="px-3.5 py-1.5 rounded-xl bg-yellow-400/20 text-yellow-500 border border-yellow-400/30 text-xs font-bold">${myFlip}</div>
                        </div>
                        <div class="text-base text-gray-400 font-mono">VS</div>
                        <div>
                            <p class="text-xs text-gray-400 font-bold uppercase mb-1">Opponent</p>
                            <div class="px-3.5 py-1.5 rounded-xl bg-orange-400/20 text-orange-500 border border-orange-400/30 text-xs font-bold">${oppFlip}</div>
                        </div>
                    </div>
                    <p class="text-base font-extrabold text-brand-600 my-4">
                        ${winner ? `${winner === (amHost ? 'host' : 'guest') ? 'You Won prediction! 🎉' : 'Opponent Won! 🤖'}` : 'Draw Coin Flip! 🪙'}
                    </p>
                </div>
            `;
        }
        
        return `
            <div class="space-y-4 text-center">
                <p class="text-xs text-gray-400 font-bold uppercase">Coin Flip Duel</p>
                <div class="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mx-auto flex items-center justify-center text-xs font-black text-amber-900 border-4 border-yellow-300 shadow-xl mb-4">
                    🪙
                </div>
                <div class="flex gap-3 justify-center">
                    <button onclick="makeCoinMultiplayerMove('HEADS')" ${myFlip ? 'disabled' : ''} class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-xl text-xs disabled:opacity-50">HEADS</button>
                    <button onclick="makeCoinMultiplayerMove('TAILS')" ${myFlip ? 'disabled' : ''} class="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs disabled:opacity-50">TAILS</button>
                </div>
            </div>
        `;
    }
    
    // 8. WORD SCRAMBLE
    if (gameId === 'word_scramble') {
        return `
            <div class="space-y-4 text-center max-w-sm mx-auto">
                <p class="text-xs text-gray-400 font-bold uppercase">Unscramble the letters</p>
                <h4 class="text-2xl font-black tracking-widest text-brand-600 dark:text-brand-400 animate-pulse my-2">${room.gameState?.scrambled}</h4>
                <div class="flex gap-2 justify-center">
                    <input type="text" id="scrambleMultiInput" placeholder="Enter word" class="glass-input px-4 py-2 rounded-xl text-center focus:ring-2 focus:ring-brand-500 flex-1">
                    <button onclick="submitScrambleMultiplayerWord()" class="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold shadow-md">Submit</button>
                </div>
            </div>
        `;
    }
    
    // 9. MATH QUIZ
    if (gameId === 'math_quiz') {
        const eq = room.gameState?.board?.[0] || '1 + 1 = ?';
        return `
            <div class="space-y-4 text-center max-w-sm mx-auto">
                <p class="text-xs text-gray-400 font-bold uppercase">Math master duel</p>
                <h4 id="mathMultiEquation" class="text-3xl font-black text-brand-600 dark:text-brand-400 my-2">${eq}</h4>
                <div class="flex gap-2 justify-center">
                    <input type="number" id="mathMultiInput" placeholder="Solution" class="glass-input px-4 py-2 rounded-xl text-center focus:ring-2 focus:ring-brand-500 flex-1">
                    <button onclick="submitMathMultiplayerSolution()" class="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold shadow-md">Check</button>
                </div>
            </div>
        `;
    }
    
    // DEFAULT SCORE-BATTLE WRAPPER for Snake, Tetris, 2048, Flappy, Pong, Brick Breaker, Whack-a-Mole, Simon Says, Hangman
    return `
        <div class="space-y-6 text-center max-w-md mx-auto w-full py-4">
            <div class="space-y-2">
                <span class="px-2.5 py-0.5 text-[9px] bg-rose-500 text-white rounded-full font-bold uppercase animate-pulse">Live Score Battle</span>
                <h4 class="text-lg font-black text-gray-900 dark:text-white">Active Competitor Match</h4>
                <p class="text-xs text-gray-400">Play the local game below! Your score updates are synchronized in real-time. Highest score wins the duel!</p>
            </div>
            
            <!-- Embed Local Game Template Inside multiplayer wrapper -->
            <div class="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-white/5 shadow-inner">
                ${renderLocalGameTemplate(gameId)}
            </div>
        </div>
    `;
}

function renderLocalGameTemplate(gameId) {
    switch (gameId) {
        case 'snake':
            return renderSnake();
        case 'tetris':
            return renderTetris();
        case 'game_2048':
            return render2048();
        case 'flappy':
            return renderFlappy();
        case 'pong':
            return renderPong();
        case 'brick_breaker':
            return renderBrickBreaker();
        case 'whack_mole':
            return renderWhackMole();
        case 'simon_says':
            return renderSimonSays();
        case 'hangman':
            return renderHangman();
        default:
            return `<div class="text-center py-20 text-gray-500">Game loaded!</div>`;
    }
}

// Multiplayer Board Clicks & Submissions
window.makeMultiplayerXOXMove = (cellIndex) => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;

    const amHost = room.players.host.username === currentUser.username;
    const isMyTurn = (room.gameState.turn === 'host' && amHost) || (room.gameState.turn === 'guest' && !amHost);

    if (room.gameState.board[cellIndex] !== '' || room.gameState.winner || room.gameState.isDraw || !isMyTurn) {
        return;
    }

    const mark = amHost ? 'X' : 'O';
    room.gameState.board[cellIndex] = mark;

    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    let hasWon = false;
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (room.gameState.board[a] !== '' && room.gameState.board[a] === room.gameState.board[b] && room.gameState.board[a] === room.gameState.board[c]) {
            hasWon = true;
            break;
        }
    }

    if (hasWon) {
        room.gameState.winner = amHost ? 'host' : 'guest';
        if (amHost) room.gameState.hostScore += 10;
        else room.gameState.guestScore += 10;
    } else if (room.gameState.board.every(cell => cell !== '')) {
        room.gameState.isDraw = true;
    } else {
        room.gameState.turn = room.gameState.turn === 'host' ? 'guest' : 'host';
    }

    saveDB(db);
};

window.makeMemoryMultiplayerMove = (idx) => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    const isMyTurn = (room.gameState.turn === 'host' && amHost) || (room.gameState.turn === 'guest' && !amHost);
    
    if (!isMyTurn || room.gameState.winner || room.gameState.isDraw) return;
    
    let cards = room.gameState.cards;
    let selected = room.gameState.selectedIndices || [];
    
    if (cards[idx].flipped || cards[idx].matched || selected.length === 2) return;
    
    cards[idx].flipped = true;
    selected.push(idx);
    room.gameState.selectedIndices = selected;
    saveDB(db);
    
    if (selected.length === 2) {
        setTimeout(() => {
            const db2 = getDB();
            const r2 = db2.gamesState?.rooms?.[window.gameRoomId];
            if (!r2) return;
            
            let c2 = r2.gameState.cards;
            let sel2 = r2.gameState.selectedIndices || [];
            if (sel2.length < 2) return;
            
            const [first, second] = sel2;
            if (c2[first].icon === c2[second].icon) {
                c2[first].matched = true;
                c2[second].matched = true;
                
                if (r2.gameState.turn === 'host') r2.gameState.hostScore += 10;
                else r2.gameState.guestScore += 10;
                
                if (c2.every(c => c.matched)) {
                    if (r2.gameState.hostScore > r2.gameState.guestScore) r2.gameState.winner = 'host';
                    else if (r2.gameState.guestScore > r2.gameState.hostScore) r2.gameState.winner = 'guest';
                    else r2.gameState.isDraw = true;
                }
            } else {
                c2[first].flipped = false;
                c2[second].flipped = false;
                r2.gameState.turn = r2.gameState.turn === 'host' ? 'guest' : 'host';
            }
            
            r2.gameState.selectedIndices = [];
            saveDB(db2);
        }, 1200);
    }
};

window.makeMinesweeperMultiplayerMove = (idx) => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    const isMyTurn = (room.gameState.turn === 'host' && amHost) || (room.gameState.turn === 'guest' && !amHost);
    
    if (!isMyTurn || room.gameState.winner || room.gameState.isDraw) return;
    
    let board = room.gameState.minesBoard;
    if (board[idx].open) return;
    
    board[idx].open = true;
    
    if (board[idx].mine) {
        if (room.gameState.turn === 'host') {
            room.gameState.hostScore = Math.max(0, room.gameState.hostScore - 20);
        } else {
            room.gameState.guestScore = Math.max(0, room.gameState.guestScore - 20);
        }
        room.gameState.turn = room.gameState.turn === 'host' ? 'guest' : 'host';
    } else {
        if (room.gameState.turn === 'host') room.gameState.hostScore += 10;
        else room.gameState.guestScore += 10;
    }
    
    const totalSafe = board.filter(c => !c.mine).length;
    const openedSafe = board.filter(c => !c.mine && c.open).length;
    if (openedSafe === totalSafe) {
        board.forEach(c => c.open = true);
        if (room.gameState.hostScore > room.gameState.guestScore) room.gameState.winner = 'host';
        else if (room.gameState.guestScore > room.gameState.hostScore) room.gameState.winner = 'guest';
        else room.gameState.isDraw = true;
    }
    
    saveDB(db);
};

window.makeGuessNumberMultiplayerMove = () => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    const isMyTurn = (room.gameState.turn === 'host' && amHost) || (room.gameState.turn === 'guest' && !amHost);
    
    if (!isMyTurn || room.gameState.winner || room.gameState.isDraw) return;
    
    const input = document.getElementById('guessMultiInput');
    if (!input) return;
    const val = parseInt(input.value);
    if (isNaN(val)) return;
    
    const target = room.gameState.secretNumber;
    if (val === target) {
        if (room.gameState.turn === 'host') { room.gameState.hostScore += 50; room.gameState.winner = 'host'; }
        else { room.gameState.guestScore += 50; room.gameState.winner = 'guest'; }
        room.gameState.hint = `Correct! The number was ${target}!`;
    } else if (val < target) {
        room.gameState.hint = `${currentUser.username} guessed ${val} - Too Low!`;
        room.gameState.turn = room.gameState.turn === 'host' ? 'guest' : 'host';
    } else {
        room.gameState.hint = `${currentUser.username} guessed ${val} - Too High!`;
        room.gameState.turn = room.gameState.turn === 'host' ? 'guest' : 'host';
    }
    
    saveDB(db);
};

window.makeRPSMultiplayerMove = (choice) => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    if (amHost) room.gameState.hostChoice = choice;
    else room.gameState.guestChoice = choice;
    
    if (room.gameState.hostChoice && room.gameState.guestChoice) {
        const hc = room.gameState.hostChoice;
        const gc = room.gameState.guestChoice;
        
        if (hc === gc) {
            room.gameState.isDraw = true;
        } else if (
            (hc === 'rock' && gc === 'scissors') ||
            (hc === 'paper' && gc === 'rock') ||
            (hc === 'scissors' && gc === 'paper')
        ) {
            room.gameState.hostScore += 10;
            room.gameState.winner = 'host';
        } else {
            room.gameState.guestScore += 10;
            room.gameState.winner = 'guest';
        }
    }
    
    saveDB(db);
};

window.makeDiceMultiplayerMove = () => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    const roll = Math.floor(Math.random() * 6) + 1;
    
    if (amHost) room.gameState.hostChoice = roll;
    else room.gameState.guestChoice = roll;
    
    if (room.gameState.hostChoice && room.gameState.guestChoice) {
        const hr = room.gameState.hostChoice;
        const gr = room.gameState.guestChoice;
        
        if (hr === gr) {
            room.gameState.isDraw = true;
        } else if (hr > gr) {
            room.gameState.hostScore += 10;
            room.gameState.winner = 'host';
        } else {
            room.gameState.guestScore += 10;
            room.gameState.winner = 'guest';
        }
    }
    
    saveDB(db);
};

window.makeCoinMultiplayerMove = (choice) => {
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const amHost = room.players.host.username === currentUser.username;
    const actual = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    
    if (amHost) room.gameState.hostChoice = choice;
    else room.gameState.guestChoice = choice;
    
    if (room.gameState.hostChoice && room.gameState.guestChoice) {
        const hc = room.gameState.hostChoice;
        const gc = room.gameState.guestChoice;
        
        if (hc === actual && gc !== actual) {
            room.gameState.hostScore += 10;
            room.gameState.winner = 'host';
        } else if (gc === actual && hc !== actual) {
            room.gameState.guestScore += 10;
            room.gameState.winner = 'guest';
        } else {
            room.gameState.isDraw = true;
        }
    }
    
    saveDB(db);
};

window.submitScrambleMultiplayerWord = () => {
    const input = document.getElementById('scrambleMultiInput');
    if (!input) return;
    const val = input.value.trim().toUpperCase();
    
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    if (val === room.gameState.word) {
        const amHost = room.players.host.username === currentUser.username;
        if (amHost) room.gameState.hostScore += 10;
        else room.gameState.guestScore += 10;
        
        const pool = ['DEVELOPER', 'FIREBASE', 'PORTFOLIO', 'CREATIVE', 'PROGRAMMER', 'INVENTORY', 'DATABASE'];
        const next = pool[Math.floor(Math.random() * pool.length)];
        room.gameState.word = next;
        room.gameState.scrambled = next.split('').sort(() => Math.random() - 0.5).join('');
    } else {
        alert('Incorrect! Try again.');
    }
    
    saveDB(db);
};

window.submitMathMultiplayerSolution = () => {
    const input = document.getElementById('mathMultiInput');
    if (!input) return;
    const val = parseInt(input.value);
    
    const db = getDB();
    const room = db.gamesState?.rooms?.[window.gameRoomId];
    if (!room) return;
    
    const title = document.getElementById('mathMultiEquation').textContent;
    const parts = title.replace(' = ?', '').split(' ');
    const n1 = parseInt(parts[0]);
    const op = parts[1];
    const n2 = parseInt(parts[2]);
    
    let correctAns = 0;
    if (op === '+') correctAns = n1 + n2;
    else if (op === '-') correctAns = n1 - n2;
    else if (op === '*') correctAns = n1 * n2;
    
    if (val === correctAns) {
        const amHost = room.players.host.username === currentUser.username;
        if (amHost) room.gameState.hostScore += 10;
        else room.gameState.guestScore += 10;
        
        const num1 = Math.floor(Math.random() * 15) + 1;
        const num2 = Math.floor(Math.random() * 15) + 1;
        const ops = ['+', '-', '*'];
        const nextOp = ops[Math.floor(Math.random() * 3)];
        room.gameState.board[0] = `${num1} ${nextOp} ${num2} = ?`;
    } else {
        alert('Arithmetic error! Try again.');
    }
    
    saveDB(db);
};

// ==========================================
//      WEBRTC STREAM CAPTURE & SIGNALING
// ==========================================

function startLocalWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        window.localStream = stream;
        const videoElement = document.getElementById('myWebcamVideo');
        if (videoElement) {
            videoElement.srcObject = stream;
        }
        window.isCameraOn = true;
        window.isMicOn = true;
        
        // Auto negotiate WebRTC P2P peer connection if opponent is ready
        negotiatePeerConnection();
    })
    .catch((err) => {
        console.error("Camera access blocked / unavailable:", err);
        // Display custom fallback warning in video container
        const placeholder = document.getElementById('myCamPlaceholder');
        if (placeholder) {
            placeholder.classList.remove('hidden');
        }
    });
}

function stopLocalStream() {
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
        window.localStream = null;
    }
}

window.toggleMyCamera = () => {
    if (window.localStream) {
        const videoTrack = window.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            window.isCameraOn = videoTrack.enabled;
            
            // UI Toggle States
            const btn = document.getElementById('btnToggleCam');
            const placeholder = document.getElementById('myCamPlaceholder');
            if (window.isCameraOn) {
                btn.innerHTML = `<i class="fas fa-video"></i> <span>Stop Camera</span>`;
                btn.className = "flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5";
                if (placeholder) placeholder.classList.add('hidden');
            } else {
                btn.innerHTML = `<i class="fas fa-video-slash"></i> <span>Start Camera</span>`;
                btn.className = "flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gray-500 hover:bg-gray-400 text-white transition-all shadow-md flex items-center justify-center gap-1.5";
                if (placeholder) placeholder.classList.remove('hidden');
            }
        }
    }
};

window.toggleMyMic = () => {
    if (window.localStream) {
        const audioTrack = window.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            window.isMicOn = audioTrack.enabled;

            // UI Toggle States
            const btn = document.getElementById('btnToggleMic');
            if (window.isMicOn) {
                btn.innerHTML = `<i class="fas fa-microphone"></i> <span>Mute Audio</span>`;
                btn.className = "flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5";
            } else {
                btn.innerHTML = `<i class="fas fa-microphone-slash"></i> <span>Unmute Audio</span>`;
                btn.className = "flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gray-500 hover:bg-gray-400 text-white transition-all shadow-md flex items-center justify-center gap-1.5";
            }
        }
    }
};

// WebRTC Signaling using Firebase database node `website/webrtcSignals/[roomId]`
function setupFirebaseSignalListener(roomId, isHost) {
    if (!window.dbRef) return;
    
    const signalsRef = window.dbRef.child(`gamesState/rooms/${roomId}/signals`);
    signalsRef.on('value', (snap) => {
        const signalObj = snap.val();
        if (!signalObj) return;

        if (isHost && signalObj.guestAnswer && !window.peerConnection.currentRemoteDescription) {
            const answer = new RTCSessionDescription(JSON.parse(signalObj.guestAnswer));
            window.peerConnection.setRemoteDescription(answer).catch(err => console.error("Error setting answer:", err));
        } else if (!isHost && signalObj.hostOffer && !window.peerConnection.currentRemoteDescription) {
            const offer = new RTCSessionDescription(JSON.parse(signalObj.hostOffer));
            window.peerConnection.setRemoteDescription(offer)
            .then(() => window.peerConnection.createAnswer())
            .then(answer => window.peerConnection.setLocalDescription(answer))
            .then(() => {
                signalsRef.update({
                    guestAnswer: JSON.stringify(window.peerConnection.localDescription)
                });
            })
            .catch(err => console.error("Error handling offer:", err));
        }

        // Handle remote ICE candidates
        const remoteCandidates = isHost ? signalObj.guestIceCandidates : signalObj.hostIceCandidates;
        if (remoteCandidates) {
            Object.values(remoteCandidates).forEach(candidateStr => {
                const candidate = new RTCIceCandidate(JSON.parse(candidateStr));
                window.peerConnection.addIceCandidate(candidate).catch(err => console.log("ICE error:", err));
            });
        }
    });
}

function negotiatePeerConnection() {
    cleanupPeerConnection();

    // Standard STUN servers for WebRTC firewall traversal
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    window.peerConnection = new RTCPeerConnection(config);

    // Add local media tracks
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => {
            window.peerConnection.addTrack(track, window.localStream);
        });
    }

    // Capture remote stream
    window.peerConnection.ontrack = (event) => {
        const opponentVideo = document.getElementById('opponentWebcamVideo');
        const placeholder = document.getElementById('opponentCamPlaceholder');
        if (opponentVideo) {
            opponentVideo.srcObject = event.streams[0];
            if (placeholder) placeholder.classList.add('hidden');
        }
    };

    const roomId = window.gameRoomId;
    if (!roomId || !window.dbRef) return;
    const signalsRef = window.dbRef.child(`gamesState/rooms/${roomId}/signals`);
    const isHost = currentLobbyRooms[roomId]?.players?.host?.username === currentUser.username;

    // Send local ICE candidates to Firebase
    window.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const listName = isHost ? 'hostIceCandidates' : 'guestIceCandidates';
            signalsRef.child(listName).push(JSON.stringify(event.candidate));
        }
    };

    // If host, create Offer and push to Firebase
    if (isHost) {
        window.peerConnection.createOffer()
        .then(offer => window.peerConnection.setLocalDescription(offer))
        .then(() => {
            signalsRef.update({
                hostOffer: JSON.stringify(window.peerConnection.localDescription)
            });
        })
        .catch(err => console.error("Error creating WebRTC Offer:", err));
    }
}

function cleanupPeerConnection() {
    if (window.peerConnection) {
        window.peerConnection.close();
        window.peerConnection = null;
    }
}

// ==========================================
//      GAME 2: TIC-TAC-TOE VS BOT
// ==========================================

let tttBotBoard = Array(9).fill('');
let tttBotTurn = 'X';
let tttBotWinner = null;
let tttBotIsDraw = false;

function renderXOXBot() {
    // Generate board grid
    let cellsHTML = tttBotBoard.map((cell, idx) => {
        let hoverClass = (cell === '' && !tttBotWinner && !tttBotIsDraw && tttBotTurn === 'X') ? 'hover:bg-brand-500/10 cursor-pointer' : 'cursor-not-allowed';
        let colorClass = cell === 'X' ? 'text-brand-500' : 'text-purple-500';
        return `
            <div onclick="makeBotMove(${idx})" class="aspect-square bg-gray-100/50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-center text-4xl font-black border border-gray-200/50 dark:border-white/5 transition-all ${hoverClass} ${colorClass}">
                ${cell === 'X' ? '<i class="fas fa-times animate-scale-up"></i>' : cell === 'O' ? '<i class="far fa-circle animate-scale-up"></i>' : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Tic-Tac-Toe vs Bot</h3>
            
            <div class="flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-200/50 dark:border-white/5">
                <span class="text-xs font-bold uppercase text-gray-500">Status</span>
                <span class="font-extrabold text-sm text-brand-600 dark:text-brand-400">
                    ${tttBotWinner ? `${tttBotWinner === 'X' ? 'You Won! 🎉' : 'Bot Won! 🤖'}` : tttBotIsDraw ? 'Draw Match!' : tttBotTurn === 'X' ? 'Your Turn (X)' : 'Bot is thinking...'}
                </span>
            </div>

            <div class="grid grid-cols-3 gap-4 max-w-[320px] mx-auto w-full py-4">
                ${cellsHTML}
            </div>

            <button onclick="resetXOXBot()" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md">
                Restart Game
            </button>
        </div>
    `;
}

window.makeBotMove = (idx) => {
    if (tttBotBoard[idx] !== '' || tttBotWinner || tttBotIsDraw || tttBotTurn !== 'X') return;

    tttBotBoard[idx] = 'X';
    checkTTTBotGameState();
    
    if (!tttBotWinner && !tttBotIsDraw) {
        tttBotTurn = 'O';
        render();
        setTimeout(playBotMove, 600);
    } else {
        render();
    }
};

function playBotMove() {
    // Find empty cells
    let empties = tttBotBoard.map((c, i) => c === '' ? i : null).filter(v => v !== null);
    if (empties.length === 0) return;

    // Simple AI: block win or choose random
    let chosen = empties[Math.floor(Math.random() * empties.length)];
    
    // Check if bot can win in next move
    const winPatterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let pattern of winPatterns) {
        let [a, b, c] = pattern;
        if (tttBotBoard[a] === 'O' && tttBotBoard[b] === 'O' && tttBotBoard[c] === '') { chosen = c; break; }
        if (tttBotBoard[a] === 'O' && tttBotBoard[c] === 'O' && tttBotBoard[b] === '') { chosen = b; break; }
        if (tttBotBoard[b] === 'O' && tttBotBoard[c] === 'O' && tttBotBoard[a] === '') { chosen = a; break; }
    }
    // Check if player is about to win and block it
    for (let pattern of winPatterns) {
        let [a, b, c] = pattern;
        if (tttBotBoard[a] === 'X' && tttBotBoard[b] === 'X' && tttBotBoard[c] === '') { chosen = c; break; }
        if (tttBotBoard[a] === 'X' && tttBotBoard[c] === 'X' && tttBotBoard[b] === '') { chosen = b; break; }
        if (tttBotBoard[b] === 'X' && tttBotBoard[c] === 'X' && tttBotBoard[a] === '') { chosen = a; break; }
    }

    tttBotBoard[chosen] = 'O';
    checkTTTBotGameState();
    tttBotTurn = 'X';
    render();
}

function checkTTTBotGameState() {
    const winPatterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let won = false;
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (tttBotBoard[a] !== '' && tttBotBoard[a] === tttBotBoard[b] && tttBotBoard[a] === tttBotBoard[c]) {
            won = true;
            tttBotWinner = tttBotBoard[a];
            break;
        }
    }
    if (!won && tttBotBoard.every(c => c !== '')) {
        tttBotIsDraw = true;
    }
}

window.resetXOXBot = () => {
    tttBotBoard = Array(9).fill('');
    tttBotTurn = 'X';
    tttBotWinner = null;
    tttBotIsDraw = false;
    render();
};

// ==========================================
//      GAME 3: CYBER SNAKE GAME
// ==========================================

let snakeInstance = null;

function renderSnake() {
    setTimeout(initSnakeGame, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Cyber Snake Game</h3>
            <div class="relative bg-slate-900 border border-brand-500/20 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                <canvas id="snakeCanvas" width="300" height="300" class="bg-slate-950 rounded-xl shadow-inner"></canvas>
            </div>
            <div class="flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-200/50 dark:border-white/5">
                <span class="text-xs font-bold uppercase text-gray-500">Score: <span id="snakeScore" class="text-brand-500 text-sm">0</span></span>
                <span class="text-xs font-bold uppercase text-gray-500">High: <span id="snakeHigh" class="text-emerald-500 text-sm">0</span></span>
            </div>
            
            <!-- Direct touch controls for mobile players -->
            <div class="grid grid-cols-3 gap-2 max-w-[150px] mx-auto">
                <div></div>
                <button onclick="changeSnakeDir('up')" class="bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-up"></i></button>
                <div></div>
                <button onclick="changeSnakeDir('left')" class="bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-left"></i></button>
                <div></div>
                <button onclick="changeSnakeDir('right')" class="bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-right"></i></button>
                <div></div>
                <button onclick="changeSnakeDir('down')" class="bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-down"></i></button>
                <div></div>
            </div>
        </div>
    `;
}

function initSnakeGame() {
    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let snake = [{x: 10, y: 10}];
    let dir = 'right';
    let food = {x: 15, y: 15};
    let score = 0;
    let highScore = parseInt(localStorage.getItem('snake_highscore') || '0');
    let loop = null;
    
    document.getElementById('snakeHigh').textContent = highScore;
    
    function randomFood() {
        food = {
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20)
        };
    }
    
    function update() {
        let head = Object.assign({}, snake[0]);
        if (dir === 'right') head.x++;
        else if (dir === 'left') head.x--;
        else if (dir === 'up') head.y--;
        else if (dir === 'down') head.y++;
        
        // Wall hits
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
            gameOver();
            return;
        }
        
        // Self eating
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            gameOver();
            return;
        }
        
        snake.unshift(head);
        
        // Eat food
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            document.getElementById('snakeScore').textContent = score;
            if (window.syncMultiplayerScore) window.syncMultiplayerScore(score);
            randomFood();
        } else {
            snake.pop();
        }
    }
    
    function draw() {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 300, 300);
        
        // Grid pattern
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 300; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, 0); ctx.lineTo(i, 300);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i); ctx.lineTo(300, i);
            ctx.stroke();
        }
        
        // Draw Snake
        ctx.fillStyle = '#6366f1';
        snake.forEach((s, idx) => {
            ctx.fillStyle = idx === 0 ? '#4f46e5' : '#818cf8';
            ctx.fillRect(s.x * 15 + 1, s.y * 15 + 1, 13, 13);
        });
        
        // Draw Food
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(food.x * 15 + 7.5, food.y * 15 + 7.5, 6, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    function gameOver() {
        clearInterval(loop);
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snake_highscore', highScore.toString());
        }
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 150, 140);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText(`Final Score: ${score}`, 150, 175);
    }
    
    window.changeSnakeDir = (newDir) => {
        if (newDir === 'up' && dir !== 'down') dir = 'up';
        if (newDir === 'down' && dir !== 'up') dir = 'down';
        if (newDir === 'left' && dir !== 'right') dir = 'left';
        if (newDir === 'right' && dir !== 'left') dir = 'right';
    };
    
    // Keyboard handlers
    const keydownHandler = (e) => {
        if (e.key === 'ArrowUp') changeSnakeDir('up');
        if (e.key === 'ArrowDown') changeSnakeDir('down');
        if (e.key === 'ArrowLeft') changeSnakeDir('left');
        if (e.key === 'ArrowRight') changeSnakeDir('right');
    };
    document.addEventListener('keydown', keydownHandler);
    
    // Loop
    loop = setInterval(() => {
        update();
        draw();
    }, 150);
}

// ==========================================
//      GAME 4: TETRIS Blocks (CANVAS)
// ==========================================

function renderTetris() {
    setTimeout(initTetris, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Neon Blocks (Tetris)</h3>
            <div class="relative bg-slate-900 border border-brand-500/20 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                <canvas id="tetrisCanvas" width="200" height="360" class="bg-slate-950 rounded-xl shadow-inner"></canvas>
            </div>
            <div class="flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-200/50 dark:border-white/5">
                <span class="text-xs font-bold uppercase text-gray-500">Score: <span id="tetrisScore" class="text-brand-500 text-sm">0</span></span>
            </div>
            <div class="flex gap-2 max-w-[200px] mx-auto">
                <button onclick="tetrisLeft()" class="flex-1 bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-left"></i></button>
                <button onclick="tetrisRotate()" class="flex-1 bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-rotate"></i></button>
                <button onclick="tetrisRight()" class="flex-1 bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    `;
}

function initTetris() {
    const canvas = document.getElementById('tetrisCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ROW = 18, COL = 10, SQ = 20;
    
    let board = Array(ROW).fill().map(() => Array(COL).fill(''));
    let score = 0;
    
    // Pieces structures
    const PIECES = [
        [ [[1,1,1,1]], '#f43f5e' ], // I
        [ [[1,1,1],[0,1,0]], '#a855f7' ], // T
        [ [[1,1,1],[1,0,0]], '#3b82f6' ], // L
        [ [[1,1],[1,1]], '#eab308' ] // O
    ];
    
    let p = randomPiece();
    let loop = setInterval(tick, 1000);
    
    function randomPiece() {
        let r = Math.floor(Math.random() * PIECES.length);
        return {
            matrix: PIECES[r][0],
            color: PIECES[r][1],
            x: 3, y: 0
        };
    }
    
    function tick() {
        if (!collision(0, 1)) {
            p.y++;
        } else {
            lock();
            p = randomPiece();
            if (collision(0, 0)) {
                gameOver();
            }
        }
        draw();
    }
    
    function collision(xOffset, yOffset) {
        for (let r = 0; r < p.matrix.length; r++) {
            for (let c = 0; c < p.matrix[r].length; c++) {
                if (!p.matrix[r][c]) continue;
                let newX = p.x + c + xOffset;
                let newY = p.y + r + yOffset;
                if (newX < 0 || newX >= COL || newY >= ROW) return true;
                if (newY < 0) continue;
                if (board[newY][newX]) return true;
            }
        }
        return false;
    }
    
    function lock() {
        for (let r = 0; r < p.matrix.length; r++) {
            for (let c = 0; c < p.matrix[r].length; c++) {
                if (!p.matrix[r][c]) continue;
                if (p.y + r < 0) continue;
                board[p.y + r][p.x + c] = p.color;
            }
        }
        // Clear lines
        for (let r = 0; r < ROW; r++) {
            if (board[r].every(cell => cell !== '')) {
                board.splice(r, 1);
                board.unshift(Array(COL).fill(''));
                score += 100;
                document.getElementById('tetrisScore').textContent = score;
                if (window.syncMultiplayerScore) window.syncMultiplayerScore(score);
            }
        }
    }
    
    function draw() {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 200, 360);
        
        // Draw grid
        for (let r = 0; r < ROW; r++) {
            for (let c = 0; c < COL; c++) {
                let color = board[r][c] || '#111827';
                ctx.fillStyle = color;
                ctx.fillRect(c * SQ, r * SQ, SQ - 1, SQ - 1);
            }
        }
        
        // Draw falling piece
        ctx.fillStyle = p.color;
        for (let r = 0; r < p.matrix.length; r++) {
            for (let c = 0; c < p.matrix[r].length; c++) {
                if (p.matrix[r][c]) {
                    ctx.fillRect((p.x + c) * SQ, (p.y + r) * SQ, SQ - 1, SQ - 1);
                }
            }
        }
    }
    
    function gameOver() {
        clearInterval(loop);
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(0, 0, 200, 360);
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 100, 180);
    }
    
    window.tetrisLeft = () => { if (!collision(-1, 0)) p.x--; draw(); };
    window.tetrisRight = () => { if (!collision(1, 0)) p.x++; draw(); };
    window.tetrisRotate = () => {
        let rotated = [];
        for (let c = 0; c < p.matrix[0].length; c++) {
            let row = [];
            for (let r = p.matrix.length - 1; r >= 0; r--) {
                row.push(p.matrix[r][c]);
            }
            rotated.push(row);
        }
        let old = p.matrix;
        p.matrix = rotated;
        if (collision(0, 0)) p.matrix = old;
        draw();
    };
}

// ==========================================
//      GAME 5: MINESWEEPER
// ==========================================

let minesBoard = [];
let minesRevealed = 0;
let minesOver = false;

function renderMinesweeper() {
    setTimeout(initMinesweeper, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Minesweeper Grid</h3>
            <div id="minesGrid" class="grid grid-cols-8 gap-1.5 max-w-[280px] mx-auto p-3 bg-gray-100 dark:bg-slate-800/40 border border-gray-200/50 dark:border-white/5 rounded-2xl"></div>
            <button onclick="initMinesweeper()" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2 rounded-xl transition-all shadow-md">
                Reset Mines
            </button>
        </div>
    `;
}

function initMinesweeper() {
    const grid = document.getElementById('minesGrid');
    if (!grid) return;
    minesRevealed = 0;
    minesOver = false;
    minesBoard = Array(64).fill().map(() => ({ mine: false, count: 0, open: false }));
    
    // Plant 10 mines
    let planted = 0;
    while (planted < 10) {
        let idx = Math.floor(Math.random() * 64);
        if (!minesBoard[idx].mine) {
            minesBoard[idx].mine = true;
            planted++;
        }
    }
    
    // Calculate counts
    for (let i = 0; i < 64; i++) {
        if (minesBoard[i].mine) continue;
        let r = Math.floor(i / 8), c = i % 8;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (minesBoard[nr * 8 + nc].mine) count++;
                }
            }
        }
        minesBoard[i].count = count;
    }
    
    drawMines();
}

function drawMines() {
    const grid = document.getElementById('minesGrid');
    if (!grid) return;
    
    grid.innerHTML = minesBoard.map((cell, idx) => {
        let content = '';
        let cellClass = 'bg-gray-200 dark:bg-slate-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-700';
        
        if (cell.open) {
            cellClass = 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5';
            if (cell.mine) {
                content = '<i class="fas fa-bomb text-red-500 animate-scale-up"></i>';
                cellClass = 'bg-red-500/10 border border-red-500/20';
            } else if (cell.count > 0) {
                content = cell.count;
            }
        }
        
        return `<div onclick="revealMineCell(${idx})" class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black select-none ${cellClass}">${content}</div>`;
    }).join('');
}

window.revealMineCell = (idx) => {
    if (minesOver || minesBoard[idx].open) return;
    minesBoard[idx].open = true;
    
    if (minesBoard[idx].mine) {
        minesOver = true;
        // Reveal all mines
        minesBoard.forEach(c => { if (c.mine) c.open = true; });
        alert('💥 Boom! Game Over!');
    } else {
        minesRevealed++;
        if (minesRevealed === 54) {
            minesOver = true;
            alert('🎉 You Defused All Mines! You Win!');
        }
    }
    drawMines();
};

// ==========================================
//      GAME 6: MEMORY MATCH CARD GAME
// ==========================================

let memoryCards = [];
let memorySelected = [];
let memoryMatches = 0;

function renderMemory() {
    setTimeout(initMemoryGame, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Card Memory Match</h3>
            <div id="memoryGrid" class="grid grid-cols-4 gap-3 max-w-[300px] mx-auto"></div>
            <button onclick="initMemoryGame()" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2 rounded-xl transition-all shadow-md">
                Reset Cards
            </button>
        </div>
    `;
}

function initMemoryGame() {
    const grid = document.getElementById('memoryGrid');
    if (!grid) return;
    memorySelected = [];
    memoryMatches = 0;
    
    const icons = ['ghost', 'star', 'fire', 'heart', 'gem', 'paw', 'bolt', 'bomb'];
    const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
    
    memoryCards = deck.map(icon => ({ icon, flipped: false, matched: false }));
    drawMemory();
}

function drawMemory() {
    const grid = document.getElementById('memoryGrid');
    if (!grid) return;
    
    grid.innerHTML = memoryCards.map((card, idx) => {
        let inner = '<i class="fas fa-question text-gray-300"></i>';
        let cardClass = 'bg-gray-100 dark:bg-slate-800 hover:scale-105';
        
        if (card.flipped || card.matched) {
            inner = `<i class="fas fa-${card.icon} text-brand-500"></i>`;
            cardClass = 'bg-brand-500/10 border border-brand-500/20';
        }
        
        return `<div onclick="flipMemoryCard(${idx})" class="aspect-square rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-gray-200/50 dark:border-white/5 cursor-pointer transition-all duration-300 ${cardClass}">${inner}</div>`;
    }).join('');
}

window.flipMemoryCard = (idx) => {
    if (memoryCards[idx].flipped || memoryCards[idx].matched || memorySelected.length === 2) return;
    
    memoryCards[idx].flipped = true;
    memorySelected.push(idx);
    drawMemory();
    
    if (memorySelected.length === 2) {
        const [first, second] = memorySelected;
        if (memoryCards[first].icon === memoryCards[second].icon) {
            memoryCards[first].matched = true;
            memoryCards[second].matched = true;
            memorySelected = [];
            memoryMatches++;
            if (memoryMatches === 8) {
                alert('🎉 Incredible Match Memory! You Win!');
            }
            drawMemory();
        } else {
            setTimeout(() => {
                memoryCards[first].flipped = false;
                memoryCards[second].flipped = false;
                memorySelected = [];
                drawMemory();
            }, 800);
        }
    }
};

// ==========================================
//      GAME 7: 2048 FUSION GAME
// ==========================================

let g2048Board = Array(16).fill(0);
let g2048Score = 0;

function render2048() {
    setTimeout(init2048Game, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">2048 Fusion</h3>
            <div id="grid2048" class="grid grid-cols-4 gap-2.5 max-w-[280px] mx-auto p-3 bg-gray-100 dark:bg-slate-800/40 border border-gray-200/50 dark:border-white/5 rounded-2xl shadow-inner"></div>
            <div class="flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-200/50 dark:border-white/5">
                <span class="text-xs font-bold uppercase text-gray-500">Score: <span id="2048ScoreVal" class="text-brand-500 text-sm">0</span></span>
                <button onclick="init2048Game()" class="text-xs bg-brand-600 hover:bg-brand-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm">Restart</button>
            </div>
            <div class="flex gap-2 max-w-[200px] mx-auto">
                <button onclick="move2048('left')" class="flex-1 bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-left"></i></button>
                <div class="flex-1 flex flex-col gap-1">
                    <button onclick="move2048('up')" class="bg-gray-100 dark:bg-slate-800 p-2 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-up text-xs"></i></button>
                    <button onclick="move2048('down')" class="bg-gray-100 dark:bg-slate-800 p-2 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-down text-xs"></i></button>
                </div>
                <button onclick="move2048('right')" class="flex-1 bg-gray-100 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    `;
}

function init2048Game() {
    g2048Board = Array(16).fill(0);
    g2048Score = 0;
    spawn2048Tile();
    spawn2048Tile();
    draw2048Board();
}

function spawn2048Tile() {
    let empties = g2048Board.map((val, idx) => val === 0 ? idx : null).filter(val => val !== null);
    if (empties.length > 0) {
        let randIdx = empties[Math.floor(Math.random() * empties.length)];
        g2048Board[randIdx] = Math.random() < 0.9 ? 2 : 4;
    }
}

function draw2048Board() {
    const grid = document.getElementById('grid2048');
    if (!grid) return;
    
    grid.innerHTML = g2048Board.map(val => {
        let colorClass = 'bg-slate-200 dark:bg-slate-800/40 text-transparent';
        if (val === 2) colorClass = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300';
        if (val === 4) colorClass = 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300';
        if (val === 8) colorClass = 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300';
        if (val >= 16) colorClass = 'bg-rose-500 text-white font-bold';
        
        return `<div class="aspect-square rounded-xl flex items-center justify-center text-sm font-black transition-all ${colorClass}">${val || ''}</div>`;
    }).join('');
    
    document.getElementById('2048ScoreVal').textContent = g2048Score;
    if (window.syncMultiplayerScore) window.syncMultiplayerScore(g2048Score);

    // Check game over
    let hasZero = g2048Board.includes(0);
    let canMerge = false;
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let val = g2048Board[r*4+c];
            if (c < 3 && val === g2048Board[r*4+c+1]) canMerge = true;
            if (r < 3 && val === g2048Board[(r+1)*4+c]) canMerge = true;
        }
    }
    if (!hasZero && !canMerge) {
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        alert('Game Over! No more moves possible.');
    }
}

window.move2048 = (dir) => {
    let moved = false;
    
    function slideRow(row) {
        let filtered = row.filter(val => val !== 0);
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i+1]) {
                filtered[i] *= 2;
                g2048Score += filtered[i];
                filtered.splice(i+1, 1);
                moved = true;
            }
        }
        while (filtered.length < 4) filtered.push(0);
        return filtered;
    }

    // slide direction helper logic
    for (let r = 0; r < 4; r++) {
        let row = [];
        if (dir === 'left') {
            row = [g2048Board[r*4], g2048Board[r*4+1], g2048Board[r*4+2], g2048Board[r*4+3]];
            let next = slideRow(row);
            for (let c = 0; c < 4; c++) {
                if (g2048Board[r*4+c] !== next[c]) { g2048Board[r*4+c] = next[c]; moved = true; }
            }
        } else if (dir === 'right') {
            row = [g2048Board[r*4+3], g2048Board[r*4+2], g2048Board[r*4+1], g2048Board[r*4]];
            let next = slideRow(row);
            for (let c = 0; c < 4; c++) {
                if (g2048Board[r*4+3-c] !== next[c]) { g2048Board[r*4+3-c] = next[c]; moved = true; }
            }
        } else if (dir === 'up') {
            row = [g2048Board[r], g2048Board[r+4], g2048Board[r+8], g2048Board[r+12]];
            let next = slideRow(row);
            for (let c = 0; c < 4; c++) {
                if (g2048Board[r+c*4] !== next[c]) { g2048Board[r+c*4] = next[c]; moved = true; }
            }
        } else if (dir === 'down') {
            row = [g2048Board[r+12], g2048Board[r+8], g2048Board[r+4], g2048Board[r]];
            let next = slideRow(row);
            for (let c = 0; c < 4; c++) {
                if (g2048Board[r+(3-c)*4] !== next[c]) { g2048Board[r+(3-c)*4] = next[c]; moved = true; }
            }
        }
    }

    if (moved) {
        spawn2048Tile();
        draw2048Board();
    }
};

// ==========================================
//      GAME 8: FLAPPY BIRD
// ==========================================

function renderFlappy() {
    setTimeout(initFlappyGame, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Flappy Sky Bird</h3>
            <canvas id="flappyCanvas" width="280" height="360" class="bg-indigo-950/20 rounded-2xl shadow-inner border border-gray-200/50 dark:border-white/5 mx-auto"></canvas>
            <button onclick="flappyJump()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-2xl transition-all shadow-md">
                JUMP (TAP/SPACE)
            </button>
        </div>
    `;
}

function initFlappyGame() {
    const canvas = document.getElementById('flappyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let birdY = 150;
    let velocity = 0;
    let gravity = 0.5;
    let score = 0;
    let loop = null;
    let pipes = [{x: 300, y: 150}];
    
    window.flappyJump = () => {
        velocity = -7;
    };
    
    function update() {
        velocity += gravity;
        birdY += velocity;
        
        // Ground/ceiling hits
        if (birdY > 350 || birdY < 0) {
            gameOver();
        }
        
        // Move pipes
        pipes.forEach(pipe => {
            pipe.x -= 2;
            
            // Collision check
            if (pipe.x < 45 && pipe.x > 15) {
                if (birdY < pipe.y || birdY > pipe.y + 100) {
                    gameOver();
                }
            }
            
            // Score tracking
            if (pipe.x === 14) {
                score++;
                if (window.syncMultiplayerScore) window.syncMultiplayerScore(score);
            }
        });
        
        // Spawn pipe
        if (pipes[pipes.length - 1].x < 180) {
            pipes.push({
                x: 300,
                y: Math.floor(Math.random() * 180) + 40
            });
        }
        
        if (pipes[0].x < -30) pipes.shift();
    }
    
    function draw() {
        ctx.fillStyle = '#1e1b4b'; // Night sky
        ctx.fillRect(0, 0, 280, 360);
        
        // Draw Bird
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(30, birdY, 10, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw Pipes
        ctx.fillStyle = '#10b981';
        pipes.forEach(pipe => {
            ctx.fillRect(pipe.x, 0, 30, pipe.y);
            ctx.fillRect(pipe.x, pipe.y + 100, 30, 360);
        });
        
        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText(score, 140, 40);
    }
    
    function gameOver() {
        clearInterval(loop);
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, 280, 360);
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 20px Inter';
        ctx.fillText('GAME OVER', 80, 180);
    }
    
    loop = setInterval(() => {
        update();
        draw();
    }, 1000 / 30);
}

// ==========================================
//      GAME 9: RETRO PING PONG
// ==========================================

function renderPong() {
    setTimeout(initPongGame, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Retro Pong</h3>
            <canvas id="pongCanvas" width="280" height="200" class="bg-slate-950 rounded-2xl border border-gray-200/50 dark:border-white/5 mx-auto"></canvas>
            <div class="flex gap-2 max-w-[150px] mx-auto">
                <button onclick="movePaddle('up')" class="flex-grow bg-gray-100 dark:bg-slate-800 p-2 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-chevron-up"></i></button>
                <button onclick="movePaddle('down')" class="flex-grow bg-gray-100 dark:bg-slate-800 p-2 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-chevron-down"></i></button>
            </div>
        </div>
    `;
}

function initPongGame() {
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let paddleY = 70;
    let ball = {x: 140, y: 100, dx: 4, dy: 2};
    let score = 0;
    let loop = null;
    
    window.movePaddle = (dir) => {
        if (dir === 'up' && paddleY > 10) paddleY -= 20;
        if (dir === 'down' && paddleY < 140) paddleY += 20;
    };
    
    function tick() {
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Ceiling bounce
        if (ball.y < 5 || ball.y > 195) ball.dy = -ball.dy;
        
        // Wall bounces / Paddle
        if (ball.x > 270) ball.dx = -ball.dx; // Right wall
        
        if (ball.x < 15) {
            if (ball.y > paddleY && ball.y < paddleY + 50) {
                ball.dx = -ball.dx;
                score++;
                if (window.syncMultiplayerScore) window.syncMultiplayerScore(score);
            } else {
                clearInterval(loop);
                if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
                alert(`Game Over! Score: ${score}`);
            }
        }
        
        // Draw
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 280, 200);
        
        // Paddle
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(5, paddleY, 10, 50);
        
        // Ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    loop = setInterval(tick, 1000 / 30);
}

// ==========================================
//      GAME 10: BRICK BREAKER
// ==========================================

function renderBrickBreaker() {
    setTimeout(initBrickBreaker, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Neon Brick Breaker</h3>
            <canvas id="brickCanvas" width="280" height="200" class="bg-slate-950 rounded-2xl border border-gray-200/50 dark:border-white/5 mx-auto"></canvas>
            <div class="flex gap-2 max-w-[150px] mx-auto">
                <button onclick="moveBrickPaddle('left')" class="flex-grow bg-gray-100 dark:bg-slate-800 p-2 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-left"></i></button>
                <button onclick="moveBrickPaddle('right')" class="flex-grow bg-gray-100 dark:bg-slate-800 p-2 rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    `;
}

function initBrickBreaker() {
    const canvas = document.getElementById('brickCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let paddleX = 110;
    let ball = {x: 140, y: 150, dx: 3, dy: -3};
    let bricks = Array(12).fill(true);
    let score = 0;
    let loop = null;
    
    window.moveBrickPaddle = (dir) => {
        if (dir === 'left' && paddleX > 5) paddleX -= 25;
        if (dir === 'right' && paddleX < 215) paddleX += 25;
    };
    
    function tick() {
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Wall hits
        if (ball.x < 5 || ball.x > 275) ball.dx = -ball.dx;
        if (ball.y < 5) ball.dy = -ball.dy;
        
        // Paddle bounce
        if (ball.y > 185 && ball.x > paddleX && ball.x < paddleX + 60) {
            ball.dy = -ball.dy;
        }
        
        // Brick hits
        bricks.forEach((active, i) => {
            if (active) {
                let bx = (i % 4) * 65 + 15;
                let by = Math.floor(i / 4) * 20 + 20;
                if (ball.x > bx && ball.x < bx + 55 && ball.y > by && ball.y < by + 15) {
                    bricks[i] = false;
                    ball.dy = -ball.dy;
                    score += 10;
                    if (window.syncMultiplayerScore) window.syncMultiplayerScore(score);
                }
            }
        });
        
        if (ball.y > 200) {
            clearInterval(loop);
            if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
            alert('Game Over!');
        }
        
        // Draw
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 280, 200);
        
        // Draw Bricks
        ctx.fillStyle = '#eab308';
        bricks.forEach((active, i) => {
            if (active) {
                let bx = (i % 4) * 65 + 15;
                let by = Math.floor(i / 4) * 20 + 20;
                ctx.fillRect(bx, by, 55, 15);
            }
        });
        
        // Paddle
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(paddleX, 190, 60, 8);
        
        // Ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    loop = setInterval(tick, 1000 / 30);
}

// ==========================================
//      GAME 11: WHACK-A-MOLE
// ==========================================

let moleScore = 0;
let activeMoleIdx = null;

function renderWhackMole() {
    setTimeout(startWhackMole, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Target Whack-a-Mole</h3>
            <div id="moleGrid" class="grid grid-cols-3 gap-4 max-w-[240px] mx-auto"></div>
            <div class="bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-200/50 dark:border-white/5">
                <span class="text-xs font-bold uppercase text-gray-500">Hits: <span id="moleScoreVal" class="text-brand-500 text-sm">0</span></span>
            </div>
        </div>
    `;
}

let moleTimer = null;

function startWhackMole() {
    moleScore = 0;
    if (moleTimer) clearTimeout(moleTimer);
    moleTimer = setTimeout(() => {
        activeMoleIdx = null;
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        alert(`Time's Up! Game Over! You hit ${moleScore} moles!`);
    }, 30000);
    nextMoleCycle();
}

function nextMoleCycle() {
    const grid = document.getElementById('moleGrid');
    if (!grid) return;
    
    activeMoleIdx = Math.floor(Math.random() * 9);
    
    grid.innerHTML = Array(9).fill(0).map((_, i) => {
        let isMole = i === activeMoleIdx;
        let cellClass = isMole ? 'bg-amber-600 text-white hover:scale-105' : 'bg-gray-100 dark:bg-slate-850';
        let inner = isMole ? '<i class="fas fa-ghost animate-bounce text-2xl"></i>' : '';
        return `<div onclick="hitMole(${i})" class="aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 border border-gray-200/50 dark:border-white/5 ${cellClass}">${inner}</div>`;
    }).join('');
    
    setTimeout(() => {
        if (window.activeGameId === 'whack_mole' && activeMoleIdx !== null) nextMoleCycle();
    }, 1200);
}

window.hitMole = (idx) => {
    if (idx === activeMoleIdx && activeMoleIdx !== null) {
        moleScore++;
        document.getElementById('moleScoreVal').textContent = moleScore;
        if (window.syncMultiplayerScore) window.syncMultiplayerScore(moleScore);
        activeMoleIdx = null;
    }
};

// ==========================================
//      GAME 12: SIMON SAYS MEMORY
// ==========================================

let simonPattern = [];
let simonUserPattern = [];
let simonLevel = 0;

function renderSimonSays() {
    setTimeout(startSimon, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Simon Says Brain Master</h3>
            <div class="grid grid-cols-2 gap-4 max-w-[200px] mx-auto">
                <button onclick="pressSimon(0)" id="simon-0" class="aspect-square rounded-2xl bg-emerald-500 opacity-60 transition-opacity active:opacity-100 border border-white/10 shadow-lg"></button>
                <button onclick="pressSimon(1)" id="simon-1" class="aspect-square rounded-2xl bg-rose-500 opacity-60 transition-opacity active:opacity-100 border border-white/10 shadow-lg"></button>
                <button onclick="pressSimon(2)" id="simon-2" class="aspect-square rounded-2xl bg-amber-500 opacity-60 transition-opacity active:opacity-100 border border-white/10 shadow-lg"></button>
                <button onclick="pressSimon(3)" id="simon-3" class="aspect-square rounded-2xl bg-indigo-500 opacity-60 transition-opacity active:opacity-100 border border-white/10 shadow-lg"></button>
            </div>
            <div class="bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-200/50 dark:border-white/5">
                <span class="text-xs font-bold uppercase text-gray-500">Level: <span id="simonLvlVal" class="text-brand-500 text-sm">0</span></span>
            </div>
        </div>
    `;
}

function startSimon() {
    simonPattern = [];
    simonLevel = 0;
    nextSimonRound();
}

function nextSimonRound() {
    simonLevel++;
    document.getElementById('simonLvlVal').textContent = simonLevel;
    if (window.syncMultiplayerScore) window.syncMultiplayerScore(simonLevel);
    simonUserPattern = [];
    simonPattern.push(Math.floor(Math.random() * 4));
    
    // Play sequence
    let i = 0;
    const interval = setInterval(() => {
        flashSimonBtn(simonPattern[i]);
        i++;
        if (i >= simonPattern.length) clearInterval(interval);
    }, 700);
}

function flashSimonBtn(id) {
    const btn = document.getElementById(`simon-${id}`);
    if (btn) {
        btn.style.opacity = '1';
        setTimeout(() => { btn.style.opacity = '0.6'; }, 400);
    }
}

window.pressSimon = (id) => {
    flashSimonBtn(id);
    simonUserPattern.push(id);
    
    const idx = simonUserPattern.length - 1;
    if (simonUserPattern[idx] !== simonPattern[idx]) {
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        alert('Wrong Pattern! Restarting level.');
        startSimon();
        return;
    }
    
    if (simonUserPattern.length === simonPattern.length) {
        setTimeout(nextSimonRound, 1000);
    }
};

// ==========================================
//      GAME 13: ROCK PAPER SCISSORS
// ==========================================

function renderRPS() {
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Rock Paper Scissors</h3>
            
            <div class="flex gap-4 justify-center">
                <button onclick="playRPS('rock')" class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border hover:bg-brand-500 hover:text-white transition-all text-2xl flex items-center justify-center">✊</button>
                <button onclick="playRPS('paper')" class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border hover:bg-brand-500 hover:text-white transition-all text-2xl flex items-center justify-center">✋</button>
                <button onclick="playRPS('scissors')" class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border hover:bg-brand-500 hover:text-white transition-all text-2xl flex items-center justify-center">✌️</button>
            </div>

            <div id="rpsResult" class="bg-gray-50/50 dark:bg-slate-800/30 p-5 rounded-2xl border border-gray-200/50 dark:border-white/5 hidden"></div>
        </div>
    `;
}

window.playRPS = (user) => {
    const choices = ['rock', 'paper', 'scissors'];
    const bot = choices[Math.floor(Math.random() * 3)];
    let result = '';
    
    if (user === bot) result = "It's a Tie!";
    else if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) {
        result = "🎉 You Won the Round!";
        if (window.saveGameScore) window.saveGameScore('rps', 10);
    } else {
        result = "🤖 Bot Won this time!";
    }
    
    const panel = document.getElementById('rpsResult');
    panel.classList.remove('hidden');
    panel.innerHTML = `
        <p class="text-xs text-gray-400 font-bold uppercase mb-2">Result</p>
        <p class="text-lg font-extrabold text-brand-600 dark:text-brand-400">${result}</p>
        <p class="text-xs text-gray-500 mt-2">You chose <strong>${user}</strong> • Bot chose <strong>${bot}</strong></p>
    `;
};

// ==========================================
//      GAME 14: GUESS THE NUMBER
// ==========================================

let targetGuessNum = 0;

function renderGuessNumber() {
    setTimeout(startGuessGame, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Guess the Secret Number (1-100)</h3>
            <div class="flex gap-2 justify-center max-w-[280px] mx-auto">
                <input type="number" id="guessInput" placeholder="42" class="glass-input px-4 py-2 rounded-xl text-center focus:ring-2 focus:ring-brand-500 flex-1">
                <button onclick="checkUserGuess()" class="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold shadow-md">Guess</button>
            </div>
            <div id="guessResult" class="bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-200/50 dark:border-white/5 hidden text-sm font-bold"></div>
        </div>
    `;
}

function startGuessGame() {
    targetGuessNum = Math.floor(Math.random() * 100) + 1;
}

window.checkUserGuess = () => {
    const input = document.getElementById('guessInput');
    const val = parseInt(input.value);
    const panel = document.getElementById('guessResult');
    
    if (isNaN(val)) return;
    panel.classList.remove('hidden');
    
    if (val === targetGuessNum) {
        panel.innerHTML = `<span class="text-emerald-500">🎉 Correct! The number was indeed ${targetGuessNum}!</span>`;
        if (window.saveGameScore) window.saveGameScore('guess_number', 20);
        startGuessGame();
    } else if (val < targetGuessNum) {
        panel.innerHTML = `<span class="text-amber-500">📉 Too Low! Guess higher.</span>`;
    } else {
        panel.innerHTML = `<span class="text-rose-500">📈 Too High! Guess lower.</span>`;
    }
    input.value = '';
};

// ==========================================
//      GAME 15: WORD SCRAMBLE
// ==========================================

let scrambleWord = '';
let scrambleScrambled = '';

function renderWordScramble() {
    setTimeout(startScramble, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Word Scramble</h3>
            <div>
                <p class="text-xs text-gray-400 font-bold uppercase mb-2">Unscramble the letters</p>
                <h4 id="scrambledTitle" class="text-2xl font-black tracking-widest text-brand-600 dark:text-brand-400 animate-pulse"></h4>
            </div>
            <div class="flex gap-2 justify-center max-w-[280px] mx-auto">
                <input type="text" id="scrambleInput" placeholder="Enter word" class="glass-input px-4 py-2 rounded-xl text-center focus:ring-2 focus:ring-brand-500 flex-1">
                <button onclick="checkScrambleWord()" class="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold shadow-md">Submit</button>
            </div>
        </div>
    `;
}

function startScramble() {
    const pool = ['DEVELOPER', 'FIREBASE', 'PORTFOLIO', 'CREATIVE', 'PROGRAMMER', 'INVENTORY', 'DATABASE'];
    scrambleWord = pool[Math.floor(Math.random() * pool.length)];
    scrambleScrambled = scrambleWord.split('').sort(() => Math.random() - 0.5).join('');
    
    const el = document.getElementById('scrambledTitle');
    if (el) el.textContent = scrambleScrambled;
}

window.checkScrambleWord = () => {
    const input = document.getElementById('scrambleInput');
    const val = input.value.trim().toUpperCase();
    
    if (val === scrambleWord) {
        alert('🎉 Amazing! That is the correct word.');
        if (window.saveGameScore) window.saveGameScore('word_scramble', 20);
        startScramble();
    } else {
        alert('❌ Try again!');
    }
    input.value = '';
};

// ==========================================
//      GAME 16: 3D DICE ROLLER
// ==========================================

function renderDiceRoller() {
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">3D Neon Dice Roller</h3>
            <div id="diceViewport" class="w-24 h-24 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-4xl font-black text-white shadow-xl border border-white/20 animate-scale-up">
                6
            </div>
            <button onclick="roll3DDice()" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md">
                Roll Dice
            </button>
        </div>
    `;
}

window.roll3DDice = () => {
    const el = document.getElementById('diceViewport');
    el.classList.add('animate-spin');
    
    setTimeout(() => {
        const val = Math.floor(Math.random() * 6) + 1;
        el.classList.remove('animate-spin');
        el.textContent = val;
        if (window.saveGameScore) window.saveGameScore('dice_roller', 5);
    }, 600);
};

// ==========================================
//      GAME 17: 3D COIN FLIPPER
// ==========================================

function renderCoinFlip() {
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Gold Coin Flipper</h3>
            <div id="coinViewport" class="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mx-auto flex items-center justify-center text-sm font-black text-amber-900 shadow-xl border-4 border-yellow-300 animate-scale-up">
                HEADS
            </div>
            <button onclick="flip3DCoin()" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md">
                Flip Coin
            </button>
        </div>
    `;
}

window.flip3DCoin = () => {
    const el = document.getElementById('coinViewport');
    el.style.transform = 'rotateY(180deg)';
    el.style.transition = 'transform 0.5s';
    
    setTimeout(() => {
        const side = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        el.style.transform = 'rotateY(0deg)';
        el.textContent = side;
        if (window.saveGameScore) window.saveGameScore('coin_flip', 5);
    }, 500);
};

// ==========================================
//      GAME 18: COLOR SPEED TAP
// ==========================================

let targetTapColor = '';

function renderColorTap() {
    setTimeout(startColorTap, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Color Tap Speed Test</h3>
            <div>
                <p class="text-xs text-gray-400 font-bold uppercase mb-2">Tap the specified color</p>
                <h4 id="colorTapTitle" class="text-lg font-black uppercase"></h4>
            </div>
            <div class="grid grid-cols-2 gap-4 max-w-[200px] mx-auto">
                <button onclick="tapColorChoice('#ef4444')" class="aspect-square rounded-2xl bg-red-500 border border-white/10 shadow-md"></button>
                <button onclick="tapColorChoice('#3b82f6')" class="aspect-square rounded-2xl bg-blue-500 border border-white/10 shadow-md"></button>
                <button onclick="tapColorChoice('#10b981')" class="aspect-square rounded-2xl bg-emerald-500 border border-white/10 shadow-md"></button>
                <button onclick="tapColorChoice('#eab308')" class="aspect-square rounded-2xl bg-yellow-500 border border-white/10 shadow-md"></button>
            </div>
        </div>
    `;
}

function startColorTap() {
    const colors = [
        { hex: '#ef4444', name: 'RED' },
        { hex: '#3b82f6', name: 'BLUE' },
        { hex: '#10b981', name: 'GREEN' },
        { hex: '#eab308', name: 'YELLOW' }
    ];
    const picked = colors[Math.floor(Math.random() * colors.length)];
    targetTapColor = picked.hex;
    
    const el = document.getElementById('colorTapTitle');
    if (el) {
        el.textContent = picked.name;
        el.style.color = picked.hex;
    }
}

window.tapColorChoice = (hex) => {
    if (hex === targetTapColor) {
        alert('🎉 Rapid Reflex! Correct Color.');
        if (window.saveGameScore) window.saveGameScore('color_tap', 10);
        startColorTap();
    } else {
        alert('❌ Oops! Wrong Color.');
    }
};

// ==========================================
//      GAME 19: MATH QUIZ MASTER
// ==========================================

let mathAnswer = 0;

function renderMathQuiz() {
    setTimeout(nextMathQuiz, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Math Master Rapid Equations</h3>
            <h4 id="mathEquationTitle" class="text-3xl font-black text-brand-600 dark:text-brand-400"></h4>
            <div class="flex gap-2 justify-center max-w-[280px] mx-auto">
                <input type="number" id="mathInput" placeholder="Solution" class="glass-input px-4 py-2 rounded-xl text-center focus:ring-2 focus:ring-brand-500 flex-1">
                <button onclick="submitMathQuiz()" class="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold shadow-md">Check</button>
            </div>
        </div>
    `;
}

function nextMathQuiz() {
    const num1 = Math.floor(Math.random() * 15) + 1;
    const num2 = Math.floor(Math.random() * 15) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * 3)];
    
    if (op === '+') mathAnswer = num1 + num2;
    else if (op === '-') mathAnswer = num1 - num2;
    else if (op === '*') mathAnswer = num1 * num2;
    
    const el = document.getElementById('mathEquationTitle');
    if (el) el.textContent = `${num1} ${op} ${num2} = ?`;
}

window.submitMathQuiz = () => {
    const input = document.getElementById('mathInput');
    const val = parseInt(input.value);
    
    if (val === mathAnswer) {
        alert('🎉 Genius! That is mathematically correct.');
        if (window.saveGameScore) window.saveGameScore('math_quiz', 15);
        nextMathQuiz();
    } else {
        alert('❌ Arithmetic Error! Try again.');
    }
    input.value = '';
};

// ==========================================
//      GAME 20: CYBER HANGMAN
// ==========================================

let hangmanWord = '';
let hangmanGuesses = [];
let hangmanErrors = 0;

function renderHangman() {
    setTimeout(startHangman, 100);
    return `
        <div class="max-w-md mx-auto space-y-6 font-sans text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Cyber Hangman</h3>
            <div>
                <p id="hangmanWordDisplay" class="text-2xl font-mono tracking-widest text-brand-600 dark:text-brand-400"></p>
                <p class="text-xs text-gray-400 font-bold uppercase mt-2">Misses: <span id="hangmanErrDisplay" class="text-rose-500">0/6</span></p>
            </div>
            
            <div class="flex gap-2 justify-center max-w-[280px] mx-auto">
                <input type="text" id="hangmanInput" maxlength="1" placeholder="a" class="glass-input px-4 py-2 rounded-xl text-center focus:ring-2 focus:ring-brand-500 w-20">
                <button onclick="submitHangmanChar()" class="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl font-bold shadow-md">Guess Letter</button>
            </div>
        </div>
    `;
}

let hangmanScore = 0;

function startHangman() {
    const pool = ['REACT', 'FIREBASE', 'HTML', 'PROGRAM', 'ARCADE', 'INVENTORY'];
    hangmanWord = pool[Math.floor(Math.random() * pool.length)];
    hangmanGuesses = [];
    hangmanErrors = 0;
    hangmanScore = 0;
    updateHangmanUI();
}

function updateHangmanUI() {
    const display = hangmanWord.split('').map(char => hangmanGuesses.includes(char) ? char : '_').join(' ');
    
    document.getElementById('hangmanWordDisplay').textContent = display;
    document.getElementById('hangmanErrDisplay').textContent = `${hangmanErrors}/6`;
    
    let correctGuessesCount = hangmanGuesses.filter(char => hangmanWord.includes(char)).length;
    hangmanScore = correctGuessesCount * 10;
    if (window.syncMultiplayerScore) window.syncMultiplayerScore(hangmanScore);
    
    if (!display.includes('_')) {
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        if (window.saveGameScore) window.saveGameScore('hangman', hangmanScore + 50);
        alert('🎉 Survivors Triumph! You guessed the word.');
        startHangman();
    } else if (hangmanErrors >= 6) {
        if (window.syncMultiplayerGameOver) window.syncMultiplayerGameOver();
        if (window.saveGameScore) window.saveGameScore('hangman', hangmanScore);
        alert(`💀 Structural Collapse! The word was: ${hangmanWord}`);
        startHangman();
    }
}

window.submitHangmanChar = () => {
    const input = document.getElementById('hangmanInput');
    const char = input.value.trim().toUpperCase();
    input.value = '';
    
    if (!char || hangmanGuesses.includes(char)) return;
    
    hangmanGuesses.push(char);
    if (!hangmanWord.includes(char)) {
        hangmanErrors++;
    }
    updateHangmanUI();
};
