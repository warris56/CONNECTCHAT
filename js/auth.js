document.addEventListener('DOMContentLoaded', function() {
    let currentUser;
    let selectedUserId = null;
    let selectedUsername = '';
    
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messageForm = document.getElementById('message-form');
    const messagesContainer = document.getElementById('messages');
    const usersList = document.getElementById('users-list');
    const selectedUserHeader = document.getElementById('selected-user');
    const userSearch = document.getElementById('user-search');
    
    // Check authentication and load user data
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUsers();
            setupMessageListener();
            
            // Enable user search
            userSearch.addEventListener('input', filterUsers);
        } else {
            window.location.href = 'login.html';
        }
    });
    
    // Load all users except current user
    function loadUsers() {
        usersList.innerHTML = '<li class="user-item">Loading users...</li>';
        
        db.collection('users').get()
            .then(snapshot => {
                usersList.innerHTML = '';
                if (snapshot.empty) {
                    usersList.innerHTML = '<li class="user-item">No users found</li>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const userData = doc.data();
                    // Don't show current user in the list
                    if (doc.id !== currentUser.uid) {
                        const userItem = document.createElement('li');
                        userItem.className = 'user-item';
                        userItem.setAttribute('data-userid', doc.id);
                        
                        // Add online/offline indicator
                        const statusClass = userData.status === 'online' ? 'online' : 'offline';
                        
                        userItem.innerHTML = `
                            <span class="status-indicator ${statusClass}"></span>
                            ${userData.username}
                        `;
                        
                        // Handle user selection
                        userItem.addEventListener('click', () => {
                            selectUser(doc.id, userData.username);
                            
                            // Mark this user as active
                            document.querySelectorAll('.user-item').forEach(item => {
                                item.classList.remove('active');
                            });
                            userItem.classList.add('active');
                        });
                        
                        usersList.appendChild(userItem);
                    }
                });
            })
            .catch(error => {
                console.error("Error loading users: ", error);
                usersList.innerHTML = '<li class="user-item">Error loading users</li>';
            });
            
        // Setup real-time user status updates
        db.collection('users').where('status', '==', 'online')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const userId = change.doc.id;
                    if (userId !== currentUser.uid) {
                        const userItem = document.querySelector(`.user-item[data-userid="${userId}"]`);
                        if (userItem) {
                            const statusIndicator = userItem.querySelector('.status-indicator');
                            if (statusIndicator) {
                                if (change.type === 'added' || change.type === 'modified') {
                                    statusIndicator.className = 'status-indicator online';
                                }
                            }
                        }
                    }
                });
            });
            
        db.collection('users').where('status', '==', 'offline')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const userId = change.doc.id;
                    if (userId !== currentUser.uid) {
                        const userItem = document.querySelector(`.user-item[data-userid="${userId}"]`);
                        if (userItem) {
                            const statusIndicator = userItem.querySelector('.status-indicator');
                            if (statusIndicator) {
                                if (change.type === 'added' || change.type === 'modified') {
                                    statusIndicator.className = 'status-indicator offline';
                                }
                            }
                        }
                    }
                });
            });
    }
    
    // Filter users based on search input
    function filterUsers() {
        const searchTerm = userSearch.value.toLowerCase();
        const userItems = usersList.querySelectorAll('.user-item');
        
        userItems.forEach(item => {
            const username = item.textContent.toLowerCase();
            if (username.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Select a user to chat with
    function selectUser(userId, username) {
        selectedUserId = userId;
        selectedUsername = username;
        selectedUserHeader.textContent = username;
        
        // Enable message input
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
        
        // Load conversation history
        loadMessages(userId);
    }
    
    // Load messages between current user and selected user
    function loadMessages(userId) {
        messagesContainer.innerHTML = '<div class="loading-messages">Loading messages...</div>';
        
        // Create a unique conversation ID (sorted user IDs to ensure consistency)
        const conversationId = [currentUser.uid, userId].sort().join('_');
        
        db.collection('messages')
            .where('conversationId', '==', conversationId)
            .orderBy('timestamp')
            .get()
            .then(snapshot => {
                messagesContainer.innerHTML = '';
                
                if (snapshot.empty) {
                    messagesContainer.innerHTML = `
                        <div class="empty-chat-message">
                            <i class="fas fa-comments"></i>
                            <p>No messages yet. Send a message to start the conversation!</p>
                        </div>
                    `;
                    return;
                }
                
                snapshot.forEach(doc => {
                    const message = doc.data();
                    displayMessage(message);
                });
                
                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            })
            .catch(error => {
                console.error("Error loading messages: ", error);
                messagesContainer.innerHTML = '<div class="error-message">Error loading messages</div>';
            });
    }
    
    // Setup real-time message listener
    function setupMessageListener() {
        // Listen for new messages in any conversation involving current user
        db.collection('messages')
            .where('participants', 'array-contains', currentUser.uid)
            .orderBy('timestamp')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        
                        // Check if this message belongs to the current active conversation
                        const conversationId = [currentUser.uid, selectedUserId].sort().join('_');
                        if (message.conversationId === conversationId) {
                            displayMessage(message);
                            // Scroll to bottom for new messages
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                        
                        // If message is new and not from current user, show notification
                        if (message.senderId !== currentUser.uid && message.conversationId !== conversationId) {
                            // You could implement browser notifications here
                            const senderId = message.senderId;
                            
                            // Highlight the user in the list
                            const userItem = document.querySelector(`.user-item[data-userid="${senderId}"]`);
                            if (userItem) {
                                userItem.classList.add('new-message');
                            }
                        }
                    }
                });
            }, error => {
                console.error("Error listening for messages: ", error);
            });
    }
    
    // Display a message in the chat
    function displayMessage(message) {
        // Remove empty chat message if present
        const emptyMessage = messagesContainer.querySelector('.empty-chat-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === currentUser.uid ? 'message-sent' : 'message-received'}`;
        
        // Format timestamp
        const timestamp = message.timestamp ? message.timestamp.toDate() : new Date();
        const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-content">${message.text}</div>
            <div class="message-time">${formattedTime}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
    }
    
    // Send message
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const messageText = messageInput.value.trim();
        if (!messageText || !selectedUserId) return;
        
        // Clear input
        messageInput.value = '';
        
        // Create message object
        const conversationId = [currentUser.uid, selectedUserId].sort().join('_');
        const newMessage = {
            senderId: currentUser.uid,
            receiverId: selectedUserId,
            text: messageText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            conversationId: conversationId,
            participants: [currentUser.uid, selectedUserId]
        };
        
        // Add message to Firestore
        db.collection('messages').add(newMessage)
            .then(() => {
                console.log("Message sent successfully");
            })
            .catch(error => {
                console.error("Error sending message: ", error);
                // Show error
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = 'Failed to send message. Please try again.';
                messagesContainer.appendChild(errorDiv);
                
                // Remove error after a few seconds
                setTimeout(() => {
                    errorDiv.remove();
                }, 3000);
            });
    });
});
