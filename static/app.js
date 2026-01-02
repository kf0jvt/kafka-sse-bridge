// Fetch and display the Kafka topic name
async function loadTopicInfo() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        const topicNameElement = document.getElementById('topic-name');
        if (data.kafka_topic) {
            topicNameElement.textContent = data.kafka_topic;
            topicNameElement.classList.add('loaded');
        } else {
            topicNameElement.textContent = 'Unknown';
            topicNameElement.classList.add('error');
        }
    } catch (error) {
        console.error('Error fetching topic info:', error);
        const topicNameElement = document.getElementById('topic-name');
        topicNameElement.textContent = 'Error loading topic';
        topicNameElement.classList.add('error');
    }
}

// Load topic info on page load
loadTopicInfo();

// Connect to the SSE endpoint
const eventSource = new EventSource('/events');

// Get the messages container
const messagesContainer = document.getElementById('messages');

// Counter for message IDs
let messageCount = 0;

// Filter variables
let activeFilter = '';
let hideInternalAPI = false;
let allMessages = []; // Store all messages for filtering

// Filter functionality
document.getElementById('apply-filter').addEventListener('click', applyFilter);
document.getElementById('clear-filter').addEventListener('click', clearFilter);
document.getElementById('clear-messages').addEventListener('click', clearAllMessages);
document.getElementById('filter-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        applyFilter();
    }
});

// Toggle for hiding internal API requests
document.getElementById('hide-internal-toggle').addEventListener('change', function(e) {
    hideInternalAPI = e.target.checked;
    refreshDisplay();
});

function isInternalAPIRequest(content) {
    try {
        const logData = JSON.parse(content);
        
        // Check if remote_ip starts with "10." and url starts with "/api/now/v1"
        if (logData.remote_ip && logData.url) {
            const isInternalIP = logData.remote_ip.startsWith('10.');
            const isAPIEndpoint = logData.url.startsWith('/api/now/v1');
            return isInternalIP && isAPIEndpoint;
        }
        return false;
    } catch (error) {
        // If it's not valid JSON, don't filter it
        return false;
    }
}

function shouldDisplayMessage(content) {
    // Check text filter
    if (activeFilter && !content.toLowerCase().includes(activeFilter.toLowerCase())) {
        return false;
    }
    
    // Check internal API filter
    if (hideInternalAPI && isInternalAPIRequest(content)) {
        return false;
    }
    
    return true;
}

function refreshDisplay() {
    // Clear and redisplay all messages based on current filters
    messagesContainer.innerHTML = '';
    allMessages.forEach(msg => {
        if (shouldDisplayMessage(msg.content)) {
            displayMessage(msg.content, msg.timestamp, msg.type);
        }
    });
}

function applyFilter() {
    const filterInput = document.getElementById('filter-input');
    activeFilter = filterInput.value.trim();
    
    if (activeFilter === '') {
        return;
    }
    
    refreshDisplay();
}

function clearFilter() {
    activeFilter = '';
    document.getElementById('filter-input').value = '';
    
    refreshDisplay();
}

function clearAllMessages() {
    // Clear the display
    messagesContainer.innerHTML = '';
    
    // Clear stored messages
    allMessages = [];
    
    // Reset message counter
    messageCount = 0;
    
    // Add confirmation message
    const timestamp = new Date().toLocaleTimeString();
    displayMessage('Messages cleared. New messages will continue to appear.', timestamp, 'info');
}

function highlightText(text, filter) {
    if (!filter) return text;
    
    const regex = new RegExp(`(${filter})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function displayMessage(content, timestamp, type = 'message') {
    // Check if message should be displayed based on filters
    if (!shouldDisplayMessage(content)) {
        return;
    }
    
    messageCount++;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.setAttribute('data-message-id', messageCount);
    
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = `[${timestamp}] `;
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'content';
    contentSpan.innerHTML = highlightText(content, activeFilter);
    
    messageDiv.appendChild(timestampSpan);
    messageDiv.appendChild(contentSpan);
    
    messagesContainer.insertBefore(messageDiv, messagesContainer.firstChild);
    
    const maxMessages = 1000;
    if (messagesContainer.children.length > maxMessages) {
        messagesContainer.removeChild(messagesContainer.lastChild);
    }
}

// Handle incoming messages
eventSource.onmessage = function(event) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Store message
    allMessages.unshift({
        content: event.data,
        timestamp: timestamp,
        type: 'message'
    });
    
    // Limit stored messages
    if (allMessages.length > 1000) {
        allMessages.pop();
    }
    
    // Display message
    displayMessage(event.data, timestamp, 'message');
};

// Handle connection errors
eventSource.onerror = function(error) {
    console.error('EventSource error:', error);
    const timestamp = new Date().toLocaleTimeString();
    displayMessage('Connection error occurred. Attempting to reconnect...', timestamp, 'error');
};

// Handle connection open
eventSource.onopen = function() {
    console.log('Connected to SSE stream');
    const timestamp = new Date().toLocaleTimeString();
    displayMessage('Connected to Kafka stream', timestamp, 'info');
};