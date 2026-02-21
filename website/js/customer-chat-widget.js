// ============================================================
// SMARTCABB - CHAT WIDGET CLIENT (VERSION BACKEND)
// ============================================================
// Widget de chat qui envoie les messages au backend
// ============================================================

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        backendUrl: window.location.hostname.includes('localhost') 
            ? 'http://localhost:54321/functions/v1/make-server-2eb02e52/chat'
            : 'https://rjyhdwqpnrqgwomcbzpg.supabase.co/functions/v1/make-server-2eb02e52/chat',
        autoReplyDelay: 1000,
    };
    
    // État du chat
    let isChatOpen = false;
    let sessionId = null;
    let userName = null;
    let userEmail = null;
    let userPhone = null;
    let messagesHistory = [];
    
    // Générer ou récupérer session ID
    function getSessionId() {
        if (sessionId) return sessionId;
        
        // Vérifier si session existe dans localStorage
        let stored = localStorage.getItem('smartcabb_chat_session');
        if (stored) {
            try {
                const session = JSON.parse(stored);
                // Vérifier si la session n'est pas trop ancienne (24h)
                if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
                    sessionId = session.id;
                    userName = session.userName;
                    userEmail = session.userEmail;
                    userPhone = session.userPhone;
                    console.log('✅ Session chat récupérée:', sessionId);
                    return sessionId;
                }
            } catch (e) {
                console.warn('Session chat corrompue, création d\'une nouvelle');
            }
        }
        
        // Créer nouvelle session
        sessionId = 'chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        saveSessionData();
        console.log('✅ Nouvelle session chat créée:', sessionId);
        return sessionId;
    }
    
    // Sauvegarder les données de session
    function saveSessionData() {
        localStorage.setItem('smartcabb_chat_session', JSON.stringify({
            id: sessionId,
            userName,
            userEmail,
            userPhone,
            timestamp: Date.now(),
        }));
    }
    
    // Toggle chat
    function toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        const chatButton = document.getElementById('chat-toggle-btn');
        
        if (!chatWindow || !chatButton) return;
        
        isChatOpen = !isChatOpen;
        
        if (isChatOpen) {
            chatWindow.style.display = 'flex';
            chatButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            
            // Charger l'historique si pas encore fait
            if (messagesHistory.length === 0) {
                loadConversationHistory();
            }
            
            setTimeout(() => {
                const input = document.getElementById('chat-input');
                if (input) input.focus();
            }, 300);
        } else {
            chatWindow.style.display = 'none';
            chatButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="chat-notification-badge">💬</span>
            `;
        }
    }
    
    // Charger l'historique de la conversation
    async function loadConversationHistory() {
        const currentSessionId = getSessionId();
        
        try {
            const response = await fetch(`${CONFIG.backendUrl}/conversation/${currentSessionId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                console.warn('Impossible de charger l\'historique');
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.messages && data.messages.length > 0) {
                console.log('📜 Historique chargé:', data.messages.length, 'messages');
                
                // Effacer les messages existants
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = '';
                }
                
                // Afficher chaque message
                data.messages.forEach(msg => {
                    addMessageToUI(msg.message, 'user', new Date(msg.created_at));
                    if (msg.reply) {
                        addMessageToUI(msg.reply, 'bot', new Date(msg.replied_at || msg.created_at));
                    }
                });
                
                messagesHistory = data.messages;
            }
        } catch (error) {
            console.error('❌ Erreur chargement historique:', error);
        }
    }
    
    // Envoyer un message
    async function sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        
        const message = input.value.trim();
        
        if (!message) return;
        
        // Demander les infos utilisateur si première fois
        if (!userName) {
            await collectUserInfo();
        }
        
        // Ajouter le message à l'UI immédiatement
        addMessageToUI(message, 'user');
        input.value = '';
        
        // Envoyer au backend
        try {
            const currentSessionId = getSessionId();
            
            const response = await fetch(`${CONFIG.backendUrl}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    userName,
                    userEmail,
                    userPhone,
                    message,
                    pageUrl: window.location.href,
                    userAgent: navigator.userAgent,
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Message envoyé au backend');
                
                // Afficher la réponse automatique
                if (data.autoReply) {
                    setTimeout(() => {
                        addMessageToUI(data.autoReply.message, 'bot');
                    }, CONFIG.autoReplyDelay);
                }
            } else {
                console.error('❌ Erreur backend:', data.error);
                // Afficher quand même une réponse locale
                setTimeout(() => {
                    addMessageToUI(
                        'Merci pour votre message ! Notre équipe SmartCabb vous répondra dans les plus brefs délais. Pour une assistance immédiate, appelez le +243 990 666 661.',
                        'bot'
                    );
                }, CONFIG.autoReplyDelay);
            }
            
        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            // Afficher une réponse locale en cas d'erreur
            setTimeout(() => {
                addMessageToUI(
                    'Merci pour votre message ! Notre équipe SmartCabb vous répondra dans les plus brefs délais. Pour une assistance immédiate, appelez le +243 990 666 661.',
                    'bot'
                );
            }, CONFIG.autoReplyDelay);
        }
    }
    
    // Collecter les infos utilisateur
    async function collectUserInfo() {
        return new Promise((resolve) => {
            // Simple prompt pour l'instant (peut être amélioré avec un modal)
            userName = prompt('Quel est votre nom ?');
            userEmail = prompt('Votre email (optionnel) ?') || '';
            userPhone = prompt('Votre téléphone (optionnel) ?') || '';
            
            saveSessionData();
            resolve();
        });
    }
    
    // Ajouter un message à l'UI
    function addMessageToUI(text, sender, timestamp = new Date()) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const emptyState = messagesContainer.querySelector('.chat-empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        const time = timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${text}
                <div class="message-time">${time}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Initialiser le chat
    function init() {
        console.log('💬 SmartCabb Chat Widget (Backend Version) initialisé');
        
        // Générer session ID
        getSessionId();
        
        // Event listeners
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const closeBtn = document.getElementById('chat-close-btn');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleChat);
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', toggleChat);
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }
        
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
        
        // Animation du badge après 3 secondes
        setTimeout(() => {
            const badge = document.querySelector('.chat-notification-badge');
            if (badge && !isChatOpen) {
                badge.style.animation = 'pulse 2s infinite';
            }
        }, 3000);
    }
    
    // Lancer l'initialisation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
