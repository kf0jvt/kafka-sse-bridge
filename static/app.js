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

// Handle incoming messages
eventSource.onmessage = function(event) {
    messageCount++;
    
    // Create a new div for the message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.setAttribute('data-message-id', messageCount);
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = `[${timestamp}] `;
    
    // Add message content
    const contentSpan = document.createElement('span');
    contentSpan.className = 'content';
    contentSpan.textContent = event.data;
    
    messageDiv.appendChild(timestampSpan);
    messageDiv.appendChild(contentSpan);
    
    // Add to the container (newest at top)
    messagesContainer.insertBefore(messageDiv, messagesContainer.firstChild);
    
    // Optional: limit the number of messages displayed
    const maxMessages = 1000;
    if (messagesContainer.children.length > maxMessages) {
        messagesContainer.removeChild(messagesContainer.lastChild);
    }
};

// Handle connection errors
eventSource.onerror = function(error) {
    console.error('EventSource error:', error);
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error';
    errorDiv.textContent = `Connection error occurred. Attempting to reconnect...`;
    messagesContainer.insertBefore(errorDiv, messagesContainer.firstChild);
};

// Handle connection open
eventSource.onopen = function() {
    console.log('Connected to SSE stream');
    
    // Create connection message
    const connectDiv = document.createElement('div');
    connectDiv.className = 'message info';
    connectDiv.textContent = `Connected to Kafka stream at ${new Date().toLocaleTimeString()}`;
    messagesContainer.insertBefore(connectDiv, messagesContainer.firstChild);
};