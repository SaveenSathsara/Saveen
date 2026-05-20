// ============================================================
//                  SAPNA WEB BANK MODULE
// ============================================================

window.activeBankingTab = window.activeBankingTab || 'dashboard';

// Helper: Format Currency
function formatLKR(amount) {
    return 'LKR ' + parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Global Re-render triggers
function triggerBankingRender() {
    if (typeof render === 'function') {
        render();
    }
}

// ============================================================
//                 CORE TRANSACTION ACTIONS
// ============================================================

// 1. Perform Deposit
window.performBankingDeposit = (e) => {
    e.preventDefault();
    const amountInput = document.getElementById('depositAmount');
    const descInput = document.getElementById('depositDesc');
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput.value);
    const desc = descInput ? descInput.value.trim() : 'Self Deposit';
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid deposit amount.');
        return;
    }
    
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const user = db.users[userIndex];
    if (!user.bankAccount) {
        alert('Bank account not initialized.');
        return;
    }
    
    const prevBalance = user.bankAccount.balance || 0;
    user.bankAccount.balance = prevBalance + amount;
    
    const txId = 'tx_' + generateId();
    user.bankAccount.transactions.unshift({
        id: txId,
        type: 'Deposit',
        amount: amount,
        date: new Date().toISOString(),
        description: desc || 'Deposit to account'
    });
    
    // Log in global audit logs
    if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
    if (!db.bankingGlobal.auditLogs) db.bankingGlobal.auditLogs = [];
    
    db.bankingGlobal.auditLogs.unshift({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        user: user.username,
        action: 'DEPOSIT',
        details: `Deposited ${formatLKR(amount)}. Description: ${desc}`
    });
    
    saveDB(db);
    currentUser = user;
    alert(`Success! Successfully deposited ${formatLKR(amount)}.`);
    triggerBankingRender();
};

// 2. Perform Withdrawal
window.performBankingWithdraw = (e) => {
    e.preventDefault();
    const amountInput = document.getElementById('withdrawAmount');
    const descInput = document.getElementById('withdrawDesc');
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput.value);
    const desc = descInput ? descInput.value.trim() : 'Self Withdrawal';
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid withdrawal amount.');
        return;
    }
    
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const user = db.users[userIndex];
    if (!user.bankAccount) return;
    
    // Check Freeze Status
    if (user.bankAccount.atmCard && user.bankAccount.atmCard.status === 'Frozen') {
        alert('Your account/ATM card is currently FROZEN. Please unfreeze it under Card Manager before completing this action.');
        return;
    }
    
    const dailyLimit = user.bankAccount.atmCard?.dailyLimit || 50000;
    // Calculate today's withdrawals
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const todayWithdrawals = user.bankAccount.transactions
        .filter(t => (t.type === 'Withdrawal' || t.type === 'Transfer Out') && new Date(t.date) >= startOfToday)
        .reduce((sum, t) => sum + t.amount, 0);
        
    if (todayWithdrawals + amount > dailyLimit) {
        alert(`Transaction Denied! This transaction exceeds your daily limit of ${formatLKR(dailyLimit)}. Remaining limit today: ${formatLKR(Math.max(0, dailyLimit - todayWithdrawals))}`);
        return;
    }
    
    const prevBalance = user.bankAccount.balance || 0;
    if (prevBalance < amount) {
        alert('Insufficient balance. Transaction cancelled.');
        return;
    }
    
    user.bankAccount.balance = prevBalance - amount;
    
    const txId = 'tx_' + generateId();
    user.bankAccount.transactions.unshift({
        id: txId,
        type: 'Withdrawal',
        amount: amount,
        date: new Date().toISOString(),
        description: desc || 'Withdrawal from account'
    });
    
    // Log in global audit logs
    if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
    if (!db.bankingGlobal.auditLogs) db.bankingGlobal.auditLogs = [];
    db.bankingGlobal.auditLogs.unshift({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        user: user.username,
        action: 'WITHDRAWAL',
        details: `Withdrew ${formatLKR(amount)}. Description: ${desc}`
    });
    
    // Fraud detection check: amount > 50,000
    if (amount > 50000) {
        if (!db.bankingGlobal.fraudAlerts) db.bankingGlobal.fraudAlerts = [];
        db.bankingGlobal.fraudAlerts.unshift({
            id: 'fa_' + generateId(),
            timestamp: new Date().toISOString(),
            user: user.username,
            type: 'LARGE_WITHDRAWAL',
            details: `Large withdrawal of ${formatLKR(amount)} detected on user account.`,
            status: 'Active'
        });
    }
    
    saveDB(db);
    currentUser = user;
    alert(`Success! Successfully withdrew ${formatLKR(amount)}.`);
    triggerBankingRender();
};

// 3. Perform Funds Transfer
window.performBankingTransfer = (e) => {
    e.preventDefault();
    const targetAccInput = document.getElementById('transferTarget');
    const amountInput = document.getElementById('transferAmount');
    const pinInput = document.getElementById('transferPin');
    const descInput = document.getElementById('transferDesc');
    
    if (!targetAccInput || !amountInput || !pinInput) return;
    
    const targetAcc = targetAccInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const pin = pinInput.value.trim();
    const desc = descInput ? descInput.value.trim() : 'Transfer';
    
    if (pin !== currentUser.pin) {
        alert('Invalid Security PIN! Authentication failed.');
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid transfer amount.');
        return;
    }
    
    const db = getDB();
    const senderIdx = db.users.findIndex(u => u.id === currentUser.id);
    if (senderIdx === -1) return;
    
    const sender = db.users[senderIdx];
    if (sender.bankAccount.atmCard?.status === 'Frozen') {
        alert('Your ATM card is FROZEN. All outgoing transfers are blocked.');
        return;
    }
    
    if (sender.bankAccount.balance < amount) {
        alert('Insufficient balance for this transfer.');
        return;
    }
    
    // Find receiver
    const receiverIdx = db.users.findIndex(u => u.bankAccount && u.bankAccount.accountNumber === targetAcc);
    if (receiverIdx === -1) {
        alert('Receiver account number not found. Please double-check.');
        return;
    }
    
    if (receiverIdx === senderIdx) {
        alert('You cannot transfer funds to yourself.');
        return;
    }
    
    const receiver = db.users[receiverIdx];
    
    // Execute Transfer
    sender.bankAccount.balance -= amount;
    receiver.bankAccount.balance += amount;
    
    const txId = 'tx_' + generateId();
    
    // Sender Transaction Log
    sender.bankAccount.transactions.unshift({
        id: txId + '_S',
        type: 'Transfer Out',
        amount: amount,
        date: new Date().toISOString(),
        description: desc || `Transfer to ${receiver.username}`,
        reference: targetAcc
    });
    
    // Receiver Transaction Log
    receiver.bankAccount.transactions.unshift({
        id: txId + '_R',
        type: 'Transfer In',
        amount: amount,
        date: new Date().toISOString(),
        description: desc || `Transfer from ${sender.username}`,
        reference: sender.bankAccount.accountNumber
    });
    
    // Audit log
    if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
    if (!db.bankingGlobal.auditLogs) db.bankingGlobal.auditLogs = [];
    db.bankingGlobal.auditLogs.unshift({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        user: sender.username,
        action: 'TRANSFER',
        details: `Transferred ${formatLKR(amount)} to ${receiver.username} (Acc: ${targetAcc})`
    });
    
    // Fraud Detection: Transfers > 50,000 LKR
    if (amount > 50000) {
        if (!db.bankingGlobal.fraudAlerts) db.bankingGlobal.fraudAlerts = [];
        db.bankingGlobal.fraudAlerts.unshift({
            id: 'fa_' + generateId(),
            timestamp: new Date().toISOString(),
            user: sender.username,
            type: 'LARGE_TRANSFER',
            details: `High-value transfer of ${formatLKR(amount)} to ${receiver.username} flagged.`,
            status: 'Active'
        });
    }
    
    // Check multiple transfer spikes (velocity fraud check: > 3 transactions in last 2 mins)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentTxCount = sender.bankAccount.transactions.filter(t => new Date(t.date) >= twoMinutesAgo).length;
    if (recentTxCount >= 3) {
        if (!db.bankingGlobal.fraudAlerts) db.bankingGlobal.fraudAlerts = [];
        db.bankingGlobal.fraudAlerts.unshift({
            id: 'fa_' + generateId(),
            timestamp: new Date().toISOString(),
            user: sender.username,
            type: 'VELOCITY_SPIKE',
            details: `Rapid transaction spike (${recentTxCount} transfers in 2 minutes) flagged.`,
            status: 'Active'
        });
    }
    
    saveDB(db);
    currentUser = sender;
    alert(`Success! Successfully transferred ${formatLKR(amount)} to ${receiver.username}.`);
    triggerBankingRender();
};

// ============================================================
//                     LOANS & LIABILITIES
// ============================================================

window.applyForLoan = (e) => {
    e.preventDefault();
    const typeSelect = document.getElementById('loanType');
    const amountInput = document.getElementById('loanAmount');
    const termInput = document.getElementById('loanTerm');
    
    if (!typeSelect || !amountInput || !termInput) return;
    
    const type = typeSelect.value;
    const amount = parseFloat(amountInput.value);
    const term = parseInt(termInput.value);
    
    if (isNaN(amount) || amount <= 0 || isNaN(term) || term <= 0) {
        alert('Please enter valid amount and term values.');
        return;
    }
    
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const user = db.users[userIndex];
    if (!user.bankAccount.loans) user.bankAccount.loans = [];
    
    let rate = 8.5; // default
    if (type === 'Home') rate = 9.5;
    else if (type === 'Business') rate = 11.0;
    else if (type === 'Personal') rate = 12.0;
    
    const monthlyRate = (rate / 100) / 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    const totalRepay = emi * term;
    
    const loanId = 'loan_' + generateId();
    const isApproved = user.role === 'admin'; // Auto-approve for admin
    
    const newLoan = {
        id: loanId,
        type: type,
        amount: amount,
        rate: rate,
        term: term,
        emi: emi,
        totalRepayable: totalRepay,
        totalPaid: 0,
        outstanding: totalRepay,
        status: isApproved ? 'Active' : 'Pending',
        dateApplied: new Date().toISOString(),
        dateApproved: isApproved ? new Date().toISOString() : null
    };
    
    user.bankAccount.loans.push(newLoan);
    
    if (isApproved) {
        user.bankAccount.balance += amount;
        user.bankAccount.transactions.unshift({
            id: 'tx_' + generateId(),
            type: 'Deposit',
            amount: amount,
            date: new Date().toISOString(),
            description: `Loan Credit: ${type} Loan approved`
        });
        
        if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
        db.bankingGlobal.auditLogs.unshift({
            id: 'log_' + generateId(),
            timestamp: new Date().toISOString(),
            user: user.username,
            action: 'LOAN_AUTO_APPROVE',
            details: `Auto-approved ${type} Loan of ${formatLKR(amount)} for Administrator.`
        });
    } else {
        if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
        db.bankingGlobal.auditLogs.unshift({
            id: 'log_' + generateId(),
            timestamp: new Date().toISOString(),
            user: user.username,
            action: 'LOAN_APPLY',
            details: `Applied for ${type} Loan of ${formatLKR(amount)}.`
        });
    }
    
    saveDB(db);
    currentUser = user;
    alert(isApproved ? `Success! Your administrator loan has been auto-approved and LKR ${amount.toLocaleString()} has been credited to your account.` : 'Success! Your loan application has been submitted and is currently pending review.');
    triggerBankingRender();
};

window.payLoanEMI = (loanId) => {
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const user = db.users[userIndex];
    const loan = user.bankAccount.loans.find(l => l.id === loanId);
    if (!loan) return;
    
    const emiAmount = Math.min(loan.emi, loan.outstanding);
    
    if (user.bankAccount.balance < emiAmount) {
        alert('Insufficient funds to pay your monthly loan EMI.');
        return;
    }
    
    user.bankAccount.balance -= emiAmount;
    loan.totalPaid += emiAmount;
    loan.outstanding -= emiAmount;
    
    if (loan.outstanding <= 0.05) {
        loan.status = 'Fully Paid';
        loan.outstanding = 0;
    }
    
    user.bankAccount.transactions.unshift({
        id: 'tx_' + generateId(),
        type: 'Withdrawal',
        amount: emiAmount,
        date: new Date().toISOString(),
        description: `Loan Repayment: ${loan.type} Loan EMI`
    });
    
    if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
    db.bankingGlobal.auditLogs.unshift({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        user: user.username,
        action: 'LOAN_EMI_PAYMENT',
        details: `Paid EMI of ${formatLKR(emiAmount)} towards ${loan.type} Loan.`
    });
    
    saveDB(db);
    currentUser = user;
    alert(`Success! paid loan installment of ${formatLKR(emiAmount)}. Remaining outstanding: ${formatLKR(loan.outstanding)}.`);
    triggerBankingRender();
};

// ============================================================
//                   ATM CARD CONTROLLERS
// ============================================================

window.toggleATMCardStatus = () => {
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const user = db.users[userIndex];
    if (!user.bankAccount.atmCard) return;
    
    const curStatus = user.bankAccount.atmCard.status;
    const newStatus = curStatus === 'Active' ? 'Frozen' : 'Active';
    user.bankAccount.atmCard.status = newStatus;
    
    if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
    db.bankingGlobal.auditLogs.unshift({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        user: user.username,
        action: newStatus === 'Frozen' ? 'FREEZE_CARD' : 'UNFREEZE_CARD',
        details: `ATM card status toggled to ${newStatus}.`
    });
    
    saveDB(db);
    currentUser = user;
    alert(`Success! ATM Card has been successfully ${newStatus === 'Frozen' ? 'Frozen / Blocked' : 'Unfrozen / Activated'}.`);
    triggerBankingRender();
};

window.updateATMDailyLimit = (limitVal) => {
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const user = db.users[userIndex];
    if (!user.bankAccount.atmCard) return;
    
    const parsedLimit = parseFloat(limitVal);
    user.bankAccount.atmCard.dailyLimit = parsedLimit;
    
    saveDB(db);
    currentUser = user;
    
    const valText = document.getElementById('limitValueText');
    if (valText) {
        valText.innerText = formatLKR(parsedLimit);
    }
};

// ============================================================
//                  ADMIN BANK MANAGEMENT
// ============================================================

window.approveLoan = (userId, loanId) => {
    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    
    const loan = user.bankAccount.loans.find(l => l.id === loanId);
    if (!loan) return;
    
    loan.status = 'Active';
    loan.dateApproved = new Date().toISOString();
    user.bankAccount.balance += loan.amount;
    
    user.bankAccount.transactions.unshift({
        id: 'tx_' + generateId(),
        type: 'Deposit',
        amount: loan.amount,
        date: new Date().toISOString(),
        description: `Loan Credit: ${loan.type} Loan approved by Admin`
    });
    
    if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
    db.bankingGlobal.auditLogs.unshift({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'LOAN_APPROVE',
        details: `Approved ${loan.type} Loan of ${formatLKR(loan.amount)} for ${user.username}.`
    });
    
    saveDB(db);
    alert(`Loan successfully approved! LKR ${loan.amount.toLocaleString()} has been credited to ${user.username}.`);
    triggerBankingRender();
};

window.rejectLoan = (userId, loanId) => {
    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    
    const loanIndex = user.bankAccount.loans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) return;
    
    const loan = user.bankAccount.loans[loanIndex];
    loan.status = 'Rejected';
    
    if (!db.bankingGlobal) db.bankingGlobal = { auditLogs: [], fraudAlerts: [] };
    db.bankingGlobal.auditLogs.unshift({
        id: 'log_' + generateId(),
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'LOAN_REJECT',
        details: `Rejected ${loan.type} Loan of ${formatLKR(loan.amount)} for ${user.username}.`
    });
    
    saveDB(db);
    alert(`Loan successfully rejected for ${user.username}.`);
    triggerBankingRender();
};

window.clearFraudAlert = (alertId) => {
    const db = getDB();
    if (!db.bankingGlobal || !db.bankingGlobal.fraudAlerts) return;
    
    const alert = db.bankingGlobal.fraudAlerts.find(a => a.id === alertId);
    if (alert) {
        alert.status = 'Cleared';
        alert.clearedAt = new Date().toISOString();
    }
    
    saveDB(db);
    alert('Security Fraud Alert cleared successfully.');
    triggerBankingRender();
};

// ============================================================
//                     BANKING UI LAYOUTS
// ============================================================

window.switchBankingTab = (tab) => {
    window.activeBankingTab = tab;
    triggerBankingRender();
};

// 1. Dashboard Tab View
function renderBankingDashboard() {
    const acc = currentUser.bankAccount;
    
    // Draw SVG Balance Chart
    let chartHTML = '';
    if (acc.transactions && acc.transactions.length > 0) {
        // Collect balances historically
        let cur = acc.balance;
        const history = [{ balance: cur, date: new Date() }];
        
        // Traverse backwards
        acc.transactions.forEach(t => {
            if (t.type === 'Deposit' || t.type === 'Transfer In') {
                cur -= t.amount;
            } else {
                cur += t.amount;
            }
            history.push({ balance: cur, date: new Date(t.date) });
        });
        
        history.reverse();
        
        // Normalize points for SVG viewport 400x120
        const minBal = Math.min(...history.map(h => h.balance));
        const maxBal = Math.max(...history.map(h => h.balance));
        const range = maxBal - minBal || 1;
        
        const points = history.map((h, i) => {
            const x = (i / (history.length - 1)) * 360 + 20;
            const y = 100 - ((h.balance - minBal) / range) * 80;
            return `${x},${y}`;
        }).join(' ');
        
        const areaPoints = `${history.map((h, i) => {
            const x = (i / (history.length - 1)) * 360 + 20;
            const y = 100 - ((h.balance - minBal) / range) * 80;
            return `${x},${y}`;
        }).join(' ')} ${history.length > 1 ? `380,110 20,110` : ''}`;

        chartHTML = `
            <div class="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden bg-slate-900/30 flex-grow">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Balance Projection Analytics</h4>
                <div class="w-full h-32 relative">
                    <svg viewBox="0 0 400 120" class="w-full h-full">
                        <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.3"/>
                                <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
                            </linearGradient>
                        </defs>
                        ${history.length > 1 ? `<polygon points="${areaPoints}" fill="url(#chartGrad)"/>` : ''}
                        <polyline fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" points="${points}" />
                        ${history.map((h, i) => {
                            const x = (i / (history.length - 1)) * 360 + 20;
                            const y = 100 - ((h.balance - minBal) / range) * 80;
                            return `<circle cx="${x}" cy="${y}" r="3" fill="#818cf8" stroke="#0f172a" stroke-width="1.5" class="cursor-pointer group"><title>${formatLKR(h.balance)} (${h.date.toLocaleDateString()})</title></circle>`;
                        }).join('')}
                    </svg>
                </div>
            </div>
        `;
    }

    // ATM Card View
    const cardStatus = acc.atmCard?.status || 'Active';
    const cardColor = currentUser.role === 'admin' 
        ? 'from-amber-500 via-yellow-600 to-amber-700 text-amber-50' 
        : 'from-[#1e293b] via-[#334155] to-[#0f172a] text-slate-100';
        
    const cardShine = currentUser.role === 'admin' ? 'bg-gradient-to-tr from-white/10 to-transparent' : '';
    const isFrozen = cardStatus === 'Frozen';
    
    let cardHTML = `
        <div class="group perspective w-full max-w-sm h-52 mx-auto sm:mx-0 shrink-0">
            <div class="relative w-full h-full rounded-2xl shadow-2xl p-6 flex flex-col justify-between overflow-hidden transition-all duration-500 bg-gradient-to-br ${cardColor} border border-white/10 ${isFrozen ? 'filter grayscale blur-[0.5px] opacity-75' : ''}">
                <div class="absolute inset-0 ${cardShine} pointer-events-none"></div>
                <div class="flex justify-between items-start z-10">
                    <div>
                        <p class="text-[9px] font-bold tracking-widest opacity-80 uppercase">${acc.atmCard?.cardType || 'Visa Debit'}</p>
                        <h4 class="text-lg font-black tracking-tight mt-0.5">${currentUser.role === 'admin' ? '💎 SAPNA PLATINUM' : '💎 SAPNA CLASSIC'}</h4>
                    </div>
                    <span class="text-xl font-bold italic opacity-90"><i class="fab fa-cc-visa text-2xl"></i></span>
                </div>
                
                <div class="flex gap-2 items-center z-10">
                    <!-- Holographic chip mock -->
                    <div class="w-9 h-7 rounded-md bg-gradient-to-br from-yellow-300 via-amber-200 to-yellow-400 border border-amber-300 shadow-inner relative overflow-hidden">
                        <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.1)_60%)]"></div>
                        <div class="w-full h-[1px] bg-amber-600/30 absolute top-1/2"></div>
                        <div class="h-full w-[1px] bg-amber-600/30 absolute left-1/2"></div>
                    </div>
                    <span class="text-xs font-mono font-bold tracking-widest text-white/50"><i class="fas fa-wifi text-sm"></i></span>
                </div>

                <div class="z-10 mt-2">
                    <p class="text-sm font-mono tracking-widest text-center">${acc.atmCard?.cardNumber?.replace(/(.{4})/g, '$1 ') || '4216 0000 0000 0000'}</p>
                    <div class="flex justify-between items-end mt-4">
                        <div>
                            <p class="text-[7px] uppercase tracking-widest opacity-60">Card Holder</p>
                            <p class="text-xs font-bold font-mono tracking-wider truncate max-w-[180px]">${currentUser.username.toUpperCase()}</p>
                        </div>
                        <div class="flex gap-4">
                            <div>
                                <p class="text-[7px] uppercase tracking-widest opacity-60">Expiry</p>
                                <p class="text-xs font-bold font-mono">${acc.atmCard?.expiryDate || '12/31'}</p>
                            </div>
                            <div>
                                <p class="text-[7px] uppercase tracking-widest opacity-60">CVV</p>
                                <p class="text-xs font-bold font-mono">***</p>
                            </div>
                        </div>
                    </div>
                </div>
                ${isFrozen ? `
                <div class="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm z-20">
                    <span class="px-4 py-2 rounded-xl bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest shadow-md flex items-center gap-2 border border-red-500/30"><i class="fas fa-lock"></i> Card Frozen</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    // Recent Transactions list
    let txRows = '';
    const limitTx = acc.transactions?.slice(0, 5) || [];
    limitTx.forEach(tx => {
        let icon = 'fa-arrow-down-long text-red-500 bg-red-500/10 border-red-500/20';
        let prefix = '-';
        if (tx.type === 'Deposit' || tx.type === 'Transfer In') {
            icon = 'fa-arrow-up-long text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            prefix = '+';
        } else if (tx.type === 'Transfer Out') {
            icon = 'fa-right-left text-brand-500 bg-brand-500/10 border-brand-500/20';
            prefix = '-';
        }
        
        txRows += `
            <div class="p-4 rounded-xl bg-white/50 dark:bg-slate-900/20 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-slate-800/20 transition-all flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center border ${icon}">
                        <i class="fas ${tx.type === 'Deposit' ? 'fa-arrow-up' : tx.type === 'Withdrawal' ? 'fa-arrow-down' : 'fa-exchange-alt'}"></i>
                    </div>
                    <div>
                        <h5 class="text-sm font-bold text-gray-900 dark:text-white">${tx.description}</h5>
                        <p class="text-[10px] text-gray-400 font-bold mt-0.5">${new Date(tx.date).toLocaleString()}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-sm font-black ${prefix === '+' ? 'text-emerald-500' : 'text-red-500'}">${prefix} ${formatLKR(tx.amount)}</span>
                </div>
            </div>
        `;
    });
    
    if (limitTx.length === 0) {
        txRows = '<div class="text-center py-6 text-gray-500">No transaction logs available.</div>';
    }

    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left: Card and balance overview -->
            <div class="lg:col-span-2 space-y-6">
                <div class="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden bg-slate-900/20">
                    <div class="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div class="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
                        <div class="text-center sm:text-left">
                            <span class="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest">Available Account Balance</span>
                            <h2 class="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mt-2 drop-shadow-md">${formatLKR(acc.balance)}</h2>
                            <p class="text-xs text-gray-500 mt-2 font-mono">Account Number: ${acc.accountNumber}</p>
                        </div>
                        ${cardHTML}
                    </div>
                </div>
                
                <!-- SVG Line Graph Balance analytics -->
                ${chartHTML}
            </div>

            <!-- Right: Fast transaction action widgets -->
            <div class="space-y-6 shrink-0">
                <div class="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/10">
                    <h3 class="font-bold text-sm text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2"><i class="fas fa-wallet text-brand-500"></i> Fast Transactions</h3>
                    
                    <div class="flex p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl mb-6 relative border border-gray-200 dark:border-white/5 shrink-0">
                        <button onclick="switchFastTxTab('deposit')" id="btnFastDeposit" class="flex-grow py-2 rounded-lg text-xs font-bold transition-all bg-brand-600 text-white shadow-md">Deposit</button>
                        <button onclick="switchFastTxTab('withdraw')" id="btnFastWithdraw" class="flex-grow py-2 rounded-lg text-xs font-bold transition-all text-gray-600 dark:text-gray-400">Withdraw</button>
                    </div>

                    <form id="fastDepositForm" onsubmit="performBankingDeposit(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Amount *</label>
                            <input type="number" id="depositAmount" placeholder="e.g. 5000" required min="1" class="glass-input w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Description</label>
                            <input type="text" id="depositDesc" placeholder="e.g. ATM cash deposit" class="glass-input w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                        </div>
                        <button type="submit" class="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-500/20 glow-btn"><i class="fas fa-plus"></i> Execute Deposit</button>
                    </form>

                    <form id="fastWithdrawForm" onsubmit="performBankingWithdraw(event)" class="space-y-4 hidden">
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Amount *</label>
                            <input type="number" id="withdrawAmount" placeholder="e.g. 5000" required min="1" class="glass-input w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Description</label>
                            <input type="text" id="withdrawDesc" placeholder="e.g. ATM Cash withdrawal" class="glass-input w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                        </div>
                        <button type="submit" class="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/20"><i class="fas fa-minus"></i> Execute Withdrawal</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Bottom Row: Recent Transaction Ledger -->
        <div class="mt-8 bg-gray-50/50 dark:bg-slate-800/10 p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 space-y-4">
            <h3 class="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-2"><i class="fas fa-list text-brand-500"></i> Recent Account Statement Logs</h3>
            <div class="space-y-3">
                ${txRows}
            </div>
        </div>
    `;
}

window.switchFastTxTab = (tab) => {
    const fDep = document.getElementById('fastDepositForm');
    const fWith = document.getElementById('fastWithdrawForm');
    const bDep = document.getElementById('btnFastDeposit');
    const bWith = document.getElementById('btnFastWithdraw');
    
    if (tab === 'deposit') {
        if (fDep) fDep.classList.remove('hidden');
        if (fWith) fWith.classList.add('hidden');
        if (bDep) {
            bDep.className = "flex-grow py-2 rounded-lg text-xs font-bold transition-all bg-brand-600 text-white shadow-md";
        }
        if (bWith) {
            bWith.className = "flex-grow py-2 rounded-lg text-xs font-bold transition-all text-gray-600 dark:text-gray-400";
        }
    } else {
        if (fDep) fDep.classList.add('hidden');
        if (fWith) fWith.classList.remove('hidden');
        if (bDep) {
            bDep.className = "flex-grow py-2 rounded-lg text-xs font-bold transition-all text-gray-600 dark:text-gray-400";
        }
        if (bWith) {
            bWith.className = "flex-grow py-2 rounded-lg text-xs font-bold transition-all bg-brand-600 text-white shadow-md";
        }
    }
};

// 2. Transfer Tab View
function renderBankingTransfer() {
    const db = getDB();
    const otherUsers = (db.users || []).filter(u => u.id !== currentUser.id && u.bankAccount);
    
    let userOptions = '<option value="">-- Select Beneficiary --</option>';
    otherUsers.forEach(u => {
        userOptions += `<option value="${u.bankAccount.accountNumber}">${u.username} (Acc: ${u.bankAccount.accountNumber})</option>`;
    });

    return `
        <div class="max-w-xl mx-auto space-y-6 py-6 font-sans">
            <div class="text-center max-w-md mx-auto space-y-3">
                <span class="px-2.5 py-0.5 text-[9px] bg-brand-500 text-white rounded-full font-bold uppercase tracking-wider">LKR Transfer</span>
                <h3 class="text-2xl font-black text-gray-900 dark:text-white">Secure Inter-bank Funds Transfer</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">Transfer funds instantly to any registered user in the network. Funds are wired in zero latency!</p>
            </div>
            
            <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 bg-slate-900/10">
                <form onsubmit="performBankingTransfer(event)" class="space-y-6">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-2 uppercase">Beneficiary Account *</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"><i class="fas fa-university"></i></span>
                            <select id="transferTarget" required class="glass-input w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm dark:[&>option]:bg-slate-800">
                                ${userOptions}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-2 uppercase">Transfer Amount (LKR) *</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold text-xs">LKR</span>
                            <input type="number" id="transferAmount" placeholder="e.g. 1000" required min="1" class="glass-input w-full pl-12 pr-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                        </div>
                        <p class="text-[10px] text-gray-500 mt-1">Available Balance: ${formatLKR(currentUser.bankAccount.balance)}</p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-2 uppercase">Your Security/Login PIN *</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"><i class="fas fa-lock"></i></span>
                            <input type="password" id="transferPin" placeholder="Enter PIN to authenticate" required class="glass-input w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm font-mono tracking-widest">
                        </div>
                        <p class="text-[10px] text-gray-500 mt-1">Enter your login account PIN for authentication.</p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-2 uppercase">Payment Reference / Description</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"><i class="fas fa-comment-dots"></i></span>
                            <input type="text" id="transferDesc" placeholder="e.g. Rent payment, bill, etc." class="glass-input w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                        </div>
                    </div>

                    <button type="submit" class="w-full py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold transition-all shadow-xl shadow-brand-500/20 mt-4 glow-btn uppercase tracking-wider text-xs">
                        <i class="fas fa-shield-alt mr-1"></i> Authorize & Wire Funds
                    </button>
                </form>
            </div>
        </div>
    `;
}

// 3. Loans Tab View
function renderBankingLoans() {
    const acc = currentUser.bankAccount;
    const loans = acc.loans || [];
    
    let loansRows = '';
    loans.forEach(loan => {
        const isPending = loan.status === 'Pending';
        const isRejected = loan.status === 'Rejected';
        const isPaid = loan.status === 'Fully Paid';
        
        let statusBadge = `<span class="px-2.5 py-1 text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-bold uppercase">Active</span>`;
        if (isPending) {
            statusBadge = `<span class="px-2.5 py-1 text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full font-bold uppercase animate-pulse">Pending Review</span>`;
        } else if (isRejected) {
            statusBadge = `<span class="px-2.5 py-1 text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 rounded-full font-bold uppercase">Rejected</span>`;
        } else if (isPaid) {
            statusBadge = `<span class="px-2.5 py-1 text-[9px] bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded-full font-bold uppercase">Fully Settled</span>`;
        }

        loansRows += `
            <div class="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/20 border border-gray-150 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div class="flex items-center gap-3">
                        <h4 class="text-base font-extrabold text-gray-900 dark:text-white">${loan.type} Loan</h4>
                        ${statusBadge}
                    </div>
                    <p class="text-xs text-gray-400 font-medium mt-1">Principal: ${formatLKR(loan.amount)} at ${loan.rate}% • Term: ${loan.term} Months</p>
                    <div class="mt-2.5 flex items-center gap-6">
                        <div>
                            <span class="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">EMI Amount</span>
                            <span class="text-sm font-black text-gray-800 dark:text-gray-200">${formatLKR(loan.emi)}/mo</span>
                        </div>
                        <div>
                            <span class="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Outstanding Balance</span>
                            <span class="text-sm font-black text-brand-500">${formatLKR(loan.outstanding)}</span>
                        </div>
                    </div>
                </div>
                ${loan.status === 'Active' && loan.outstanding > 0 ? `
                    <button onclick="payLoanEMI('${loan.id}')" class="w-full md:w-auto bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0">
                        <i class="fas fa-credit-card mr-1"></i> Pay EMI
                    </button>
                ` : ''}
            </div>
        `;
    });

    if (loans.length === 0) {
        loansRows = `
            <div class="py-10 text-center text-gray-500 bg-gray-50/50 dark:bg-slate-900/10 border border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                <i class="fas fa-folder-open text-3xl mb-3 text-gray-400"></i>
                <p class="font-bold text-sm">No Active Loans Registered</p>
                <p class="text-xs text-gray-400">Calculate and apply for loans on the left panel.</p>
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left: Loan Calculator Form -->
            <div class="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/10">
                <h3 class="font-bold text-sm text-gray-900 dark:text-white mb-5 uppercase tracking-wider flex items-center gap-2"><i class="fas fa-calculator text-brand-500"></i> Apply for a Loan</h3>
                
                <form onsubmit="applyForLoan(event)" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Loan Type *</label>
                        <select id="loanType" required onchange="calculateEMILive()" class="glass-input w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm dark:[&>option]:bg-slate-800">
                            <option value="Personal">Personal Loan (12.0%)</option>
                            <option value="Home">Home Loan (9.5%)</option>
                            <option value="Business">Business Loan (11.0%)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Principal Amount (LKR) *</label>
                        <input type="number" id="loanAmount" placeholder="e.g. 100000" required min="1000" value="100000" oninput="calculateEMILive()" class="glass-input w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Tenure term (Months) *</label>
                        <input type="number" id="loanTerm" placeholder="e.g. 12" required min="1" max="120" value="12" oninput="calculateEMILive()" class="glass-input w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm">
                    </div>

                    <!-- Live EMI Estimator Widget -->
                    <div class="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-2 mt-4">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-400 font-bold uppercase">Estimated EMI</span>
                            <span id="liveEmiText" class="font-black text-brand-600 dark:text-brand-400 text-sm">LKR 8,884.88</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-gray-500">
                            <span>Total Repayment</span>
                            <span id="liveTotalText" class="font-bold">LKR 106,618.55</span>
                        </div>
                    </div>

                    <button type="submit" class="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-500/20 glow-btn"><i class="fas fa-file-signature"></i> Submit Loan Application</button>
                </form>
            </div>

            <!-- Right: Active/Pending Loans -->
            <div class="lg:col-span-2 space-y-6">
                <h3 class="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"><i class="fas fa-list text-brand-500"></i> Your Loan Portfolio Registry</h3>
                <div class="space-y-4">
                    ${loansRows}
                </div>
            </div>
        </div>
    `;
}

// Live Loan EMI calculations on input
window.calculateEMILive = () => {
    const typeSelect = document.getElementById('loanType');
    const amountInput = document.getElementById('loanAmount');
    const termInput = document.getElementById('loanTerm');
    
    const liveEmi = document.getElementById('liveEmiText');
    const liveTotal = document.getElementById('liveTotalText');
    
    if (!typeSelect || !amountInput || !termInput || !liveEmi || !liveTotal) return;
    
    const type = typeSelect.value;
    const amount = parseFloat(amountInput.value) || 0;
    const term = parseInt(termInput.value) || 0;
    
    if (amount <= 0 || term <= 0) {
        liveEmi.innerText = 'LKR 0.00';
        liveTotal.innerText = 'LKR 0.00';
        return;
    }
    
    let rate = 8.5;
    if (type === 'Home') rate = 9.5;
    else if (type === 'Business') rate = 11.0;
    else if (type === 'Personal') rate = 12.0;
    
    const monthlyRate = (rate / 100) / 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    const totalRepay = emi * term;
    
    liveEmi.innerText = isNaN(emi) ? 'LKR 0.00' : 'LKR ' + emi.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    liveTotal.innerText = isNaN(totalRepay) ? 'LKR 0.00' : 'LKR ' + totalRepay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 4. ATM Card Manager Tab View
function renderBankingATM() {
    const acc = currentUser.bankAccount;
    const card = acc.atmCard;
    if (!card) return '<div class="text-center py-10">Card details not initialized.</div>';
    
    const cardStatus = card.status || 'Active';
    const isFrozen = cardStatus === 'Frozen';
    const cardColor = currentUser.role === 'admin' 
        ? 'from-amber-500 via-yellow-600 to-amber-700 text-amber-50' 
        : 'from-[#1e293b] via-[#334155] to-[#0f172a] text-slate-100';
        
    const cardShine = currentUser.role === 'admin' ? 'bg-gradient-to-tr from-white/10 to-transparent' : '';
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 font-sans">
            <!-- Left: Card Interactive visual -->
            <div class="space-y-6 flex flex-col items-center">
                <div class="group perspective w-full max-w-sm h-52">
                    <div class="relative w-full h-full rounded-2xl shadow-2xl p-6 flex flex-col justify-between overflow-hidden transition-all duration-500 bg-gradient-to-br ${cardColor} border border-white/10 ${isFrozen ? 'filter grayscale blur-[0.5px] opacity-75' : ''}">
                        <div class="absolute inset-0 ${cardShine} pointer-events-none"></div>
                        <div class="flex justify-between items-start z-10">
                            <div>
                                <p class="text-[9px] font-bold tracking-widest opacity-80 uppercase">${card.cardType || 'Visa Debit'}</p>
                                <h4 class="text-lg font-black tracking-tight mt-0.5">${currentUser.role === 'admin' ? '💎 SAPNA PLATINUM' : '💎 SAPNA CLASSIC'}</h4>
                            </div>
                            <span class="text-xl font-bold italic opacity-90"><i class="fab fa-cc-visa text-2xl"></i></span>
                        </div>
                        
                        <div class="flex gap-2 items-center z-10">
                            <div class="w-9 h-7 rounded-md bg-gradient-to-br from-yellow-300 via-amber-200 to-yellow-400 border border-amber-300 shadow-inner relative overflow-hidden">
                                <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.1)_60%)]"></div>
                                <div class="w-full h-[1px] bg-amber-600/30 absolute top-1/2"></div>
                                <div class="h-full w-[1px] bg-amber-600/30 absolute left-1/2"></div>
                            </div>
                            <span class="text-xs font-mono font-bold tracking-widest text-white/50"><i class="fas fa-wifi text-sm"></i></span>
                        </div>

                        <div class="z-10 mt-2">
                            <p class="text-sm font-mono tracking-widest text-center">${card.cardNumber?.replace(/(.{4})/g, '$1 ') || '4216 0000 0000 0000'}</p>
                            <div class="flex justify-between items-end mt-4">
                                <div>
                                    <p class="text-[7px] uppercase tracking-widest opacity-60">Card Holder</p>
                                    <p class="text-xs font-bold font-mono tracking-wider truncate max-w-[180px]">${currentUser.username.toUpperCase()}</p>
                                </div>
                                <div class="flex gap-4">
                                    <div>
                                        <p class="text-[7px] uppercase tracking-widest opacity-60">Expiry</p>
                                        <p class="text-xs font-bold font-mono">${card.expiryDate || '12/31'}</p>
                                    </div>
                                    <div>
                                        <p class="text-[7px] uppercase tracking-widest opacity-60">CVV</p>
                                        <p class="text-xs font-bold font-mono">${card.cvv || '123'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${isFrozen ? `
                        <div class="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm z-20">
                            <span class="px-4 py-2 rounded-xl bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest shadow-md flex items-center gap-2 border border-red-500/30"><i class="fas fa-lock"></i> Card Frozen</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <button onclick="toggleATMCardStatus()" class="w-full max-w-sm py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all ${isFrozen ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}">
                    <i class="fas ${isFrozen ? 'fa-unlock-alt' : 'fa-lock'} mr-1.5"></i> ${isFrozen ? 'Unfreeze ATM Card' : 'Freeze / Lock Card'}
                </button>
            </div>
            
            <!-- Right: Settings and Daily limits -->
            <div class="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/10 space-y-6">
                <h3 class="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"><i class="fas fa-sliders-h text-brand-500"></i> Card Limit Controls</h3>
                
                <div class="space-y-4">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-400 font-bold uppercase">Daily Limit (Transfer/Withdrawal)</span>
                        <span id="limitValueText" class="font-black text-brand-600 dark:text-brand-400 text-sm">${formatLKR(card.dailyLimit || 50000)}</span>
                    </div>
                    
                    <input type="range" min="5000" max="100000" step="5000" value="${card.dailyLimit || 50000}" 
                           oninput="updateATMDailyLimit(this.value)"
                           class="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600">
                           
                    <div class="flex justify-between text-[10px] text-gray-500">
                        <span>Min: LKR 5,000</span>
                        <span>Max: LKR 100,000</span>
                    </div>
                </div>

                <div class="border-t border-gray-150 dark:border-white/5 pt-6 space-y-3">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Card Security Settings</h4>
                    
                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/50 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-gray-300">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-globe text-brand-500"></i>
                            <span>Online Transactions (e-Commerce)</span>
                        </div>
                        <span class="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold uppercase">Allowed</span>
                    </div>
                    
                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/50 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-gray-300">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-plane text-brand-500"></i>
                            <span>International Usage</span>
                        </div>
                        <span class="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold uppercase">Blocked</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 5. Admin Security Tab View (For roles === 'admin')
function renderBankingAdmin() {
    const db = getDB();
    const globalBank = db.bankingGlobal || { auditLogs: [], fraudAlerts: [] };
    const allUsers = db.users || [];
    
    // System Aggregate values
    const totalDeposits = allUsers.reduce((sum, u) => sum + (u.bankAccount?.balance || 0), 0);
    
    const allLoans = [];
    let pendingLoansCount = 0;
    allUsers.forEach(u => {
        if (u.bankAccount && u.bankAccount.loans) {
            u.bankAccount.loans.forEach(l => {
                allLoans.push({ user: u, loan: l });
                if (l.status === 'Pending') pendingLoansCount++;
            });
        }
    });
    
    const activeLoansVal = allLoans
        .filter(al => al.loan.status === 'Active')
        .reduce((sum, al) => sum + al.loan.amount, 0);

    // Pending Loans Rows
    let pendingLoanRows = '';
    allLoans.filter(al => al.loan.status === 'Pending').forEach(al => {
        pendingLoanRows += `
            <div class="p-4 rounded-xl bg-white/50 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-slate-800/10 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h5 class="font-extrabold text-sm text-gray-900 dark:text-white">Applicant: ${al.user.username}</h5>
                    <p class="text-xs text-gray-400 mt-1">${al.loan.type} Loan: ${formatLKR(al.loan.amount)} over ${al.loan.term} mo (EMI: ${formatLKR(al.loan.emi)}/mo)</p>
                </div>
                <div class="flex gap-2 w-full sm:w-auto shrink-0">
                    <button onclick="approveLoan('${al.user.id}', '${al.loan.id}')" class="flex-grow sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-[10px] uppercase shadow-md transition-colors"><i class="fas fa-check"></i> Approve</button>
                    <button onclick="rejectLoan('${al.user.id}', '${al.loan.id}')" class="flex-grow sm:flex-none bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-[10px] uppercase shadow-md transition-colors"><i class="fas fa-times"></i> Reject</button>
                </div>
            </div>
        `;
    });
    
    if (pendingLoanRows === '') {
        pendingLoanRows = '<div class="text-center py-6 text-gray-500">No pending loan applications available.</div>';
    }

    // Fraud alerts
    let fraudAlertRows = '';
    const activeAlerts = globalBank.fraudAlerts || [];
    activeAlerts.forEach(alert => {
        const isCleared = alert.status === 'Cleared';
        fraudAlertRows += `
            <div class="p-4 rounded-xl bg-red-500/5 dark:bg-red-500/[0.02] border border-red-500/20 hover:border-red-500/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-red-500 ${isCleared ? '' : 'animate-ping'}"></span>
                        <h5 class="font-extrabold text-sm text-red-500 dark:text-red-400">${alert.type}</h5>
                        <span class="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${isCleared ? 'bg-gray-100 text-gray-500' : 'bg-red-600 text-white'}">${alert.status}</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">${alert.details} (${alert.user})</p>
                    <p class="text-[9px] text-gray-500 font-mono mt-0.5">${new Date(alert.timestamp).toLocaleString()}</p>
                </div>
                ${!isCleared ? `
                    <button onclick="clearFraudAlert('${alert.id}')" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors shrink-0">
                        Dismiss Alert
                    </button>
                ` : ''}
            </div>
        `;
    });
    
    if (activeAlerts.length === 0) {
        fraudAlertRows = '<div class="text-center py-6 text-gray-500">No security alerts triggered. System safe.</div>';
    }

    // Audit logs
    let auditRows = '';
    const logs = globalBank.auditLogs?.slice(0, 15) || [];
    logs.forEach(log => {
        auditRows += `
            <div class="p-3 text-xs border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all flex justify-between font-mono">
                <span class="text-gray-400 shrink-0 select-none mr-4">${new Date(log.timestamp).toLocaleTimeString()}</span>
                <span class="text-brand-500 dark:text-brand-400 font-bold shrink-0 w-24 truncate">${log.action}</span>
                <span class="text-gray-600 dark:text-gray-300 flex-grow text-left truncate max-w-sm md:max-w-none">${log.details}</span>
                <span class="text-purple-500 font-bold shrink-0 ml-4">${log.user}</span>
            </div>
        `;
    });

    return `
        <div class="space-y-8 font-sans">
            <!-- Admin Top System stats -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div class="bg-gradient-to-br from-brand-600 to-indigo-600 p-6 rounded-3xl shadow-lg text-white text-center flex flex-col justify-center min-h-[120px]">
                    <span class="text-[10px] text-brand-200 font-bold uppercase tracking-widest">Total system Assets</span>
                    <h4 class="text-3xl font-black mt-2">${formatLKR(totalDeposits)}</h4>
                    <p class="text-xs text-brand-100 mt-1">Aggregated bank accounts balances</p>
                </div>
                <div class="bg-gradient-to-br from-purple-600 to-violet-700 p-6 rounded-3xl shadow-lg text-white text-center flex flex-col justify-center min-h-[120px]">
                    <span class="text-[10px] text-purple-200 font-bold uppercase tracking-widest">Active Loan Portfolio</span>
                    <h4 class="text-3xl font-black mt-2">${formatLKR(activeLoansVal)}</h4>
                    <p class="text-xs text-purple-100 mt-1">Total values of currently approved loans</p>
                </div>
                <div class="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl shadow-lg text-white text-center flex flex-col justify-center min-h-[120px]">
                    <span class="text-[10px] text-amber-200 font-bold uppercase tracking-widest">Pending Loan Reviews</span>
                    <h4 class="text-3xl font-black mt-2">${pendingLoansCount} Applications</h4>
                    <p class="text-xs text-amber-100 mt-1">Requires manual administrator authorization</p>
                </div>
            </div>

            <!-- Middle Row: Loan approval queue and fraud alerts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-gray-50/50 dark:bg-slate-800/10 p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 space-y-4">
                    <h3 class="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"><i class="fas fa-file-invoice-dollar text-brand-500"></i> Loan Approval Queue</h3>
                    <div class="space-y-3">
                        ${pendingLoanRows}
                    </div>
                </div>

                <div class="bg-gray-50/50 dark:bg-slate-800/10 p-6 rounded-3xl border border-gray-200/50 dark:border-white/5 space-y-4">
                    <h3 class="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-red-500"><i class="fas fa-shield-virus"></i> Security Fraud Logs</h3>
                    <div class="space-y-3">
                        ${fraudAlertRows}
                    </div>
                </div>
            </div>

            <!-- Bottom Row: Audit Logs Console -->
            <div class="bg-slate-950 p-6 rounded-3xl border border-white/5 shadow-2xl space-y-4">
                <h3 class="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2"><i class="fas fa-terminal text-green-400"></i> System Security Audit Console Logs</h3>
                <div class="max-h-80 overflow-y-auto space-y-1 custom-scrollbar pr-2 divide-y divide-white/5">
                    ${auditRows}
                </div>
            </div>
        </div>
    `;
}

// ============================================================
//                  MAIN DISPATCHER RENDERS
// ============================================================

window.renderBankingAppHTML = () => {
    // Sync local current user from DB state in case balance updated
    if (currentUser) {
        const db = getDB();
        const freshUser = db.users.find(u => u.username === currentUser.username);
        if (freshUser) {
            currentUser = freshUser;
        }
    }
    
    // Auth Guard
    if (!currentUser) {
        return `
            <div class="glass-panel p-10 text-center my-10 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 font-sans">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4 animate-pulse"></i>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Authentication Required</h3>
                <p class="text-gray-600 dark:text-gray-400 mt-2">You must log in to access the secure banking portal.</p>
            </div>
        `;
    }
    
    // Ensure all tabs match the user's role (don't display admin tab if normal user)
    if (window.activeBankingTab === 'admin' && currentUser.role !== 'admin') {
        window.activeBankingTab = 'dashboard';
    }

    const tabClass = (tab) => window.activeBankingTab === tab
        ? "bg-brand-600 text-white shadow-lg scale-105"
        : "bg-white/50 dark:bg-slate-800/40 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200/50 dark:border-white/5";

    const tabsHTML = `
        <div class="flex flex-wrap gap-3 mb-8 shrink-0">
            <button onclick="switchBankingTab('dashboard')" class="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tabClass('dashboard')}">
                <i class="fas fa-columns"></i> Dashboard
            </button>
            <button onclick="switchBankingTab('transfer')" class="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tabClass('transfer')}">
                <i class="fas fa-paper-plane"></i> Transfer Funds
            </button>
            <button onclick="switchBankingTab('loans')" class="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tabClass('loans')}">
                <i class="fas fa-file-invoice-dollar"></i> Loans & Credit
            </button>
            <button onclick="switchBankingTab('atm')" class="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tabClass('atm')}">
                <i class="fas fa-credit-card"></i> Card Manager
            </button>
            ${currentUser.role === 'admin' ? `
            <button onclick="switchBankingTab('admin')" class="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tabClass('admin')}">
                <i class="fas fa-shield-alt text-yellow-500"></i> Security Manager
            </button>
            ` : ''}
        </div>
    `;

    // Tab content dispatcher
    let tabContent = '';
    if (window.activeBankingTab === 'transfer') {
        tabContent = renderBankingTransfer();
    } else if (window.activeBankingTab === 'loans') {
        tabContent = renderBankingLoans();
    } else if (window.activeBankingTab === 'atm') {
        tabContent = renderBankingATM();
    } else if (window.activeBankingTab === 'admin' && currentUser.role === 'admin') {
        tabContent = renderBankingAdmin();
    } else {
        tabContent = renderBankingDashboard();
    }

    return `
        <div class="space-y-8 font-sans max-w-7xl mx-auto py-6">
            <!-- Portal Header -->
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 p-8 md:p-12 shadow-2xl text-white">
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
                <div class="relative z-10 max-w-xl">
                    <span class="px-3.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-md uppercase tracking-wider mb-4 inline-block"><i class="fas fa-lock mr-1 text-[10px]"></i> SECURED END-TO-END</span>
                    <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">Sapna Web Bank</h1>
                    <p class="text-sm md:text-base text-brand-100 leading-relaxed">Experience a next-generation high-security digital banking dashboard complete with real-time financial tracking, secure instant funds routing, card settings controls, and automated fraud analysis engines!</p>
                </div>
            </div>

            <!-- Tab switcher -->
            ${tabsHTML}

            <!-- Active Tab Content Workspace -->
            <div id="banking-workspace" class="fade-in pb-10">
                ${tabContent}
            </div>
        </div>
    `;
};
