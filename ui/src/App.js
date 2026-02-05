import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalExchanges, setTotalExchanges] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  const API_URL = 'http://127.0.0.1:5000';

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/history`);
      const data = await response.json();
      
      if (data.status === 'success') {
        const formattedMessages = [];
        data.history.forEach(exchange => {
          formattedMessages.push({ type: 'user', text: exchange.user });
          formattedMessages.push({ type: 'assistant', text: exchange.assistant });
        });
        setMessages(formattedMessages);
        setTotalExchanges(data.total_exchanges);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    // Add user message to UI
    const userMessage = inputValue;
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessages(prev => [...prev, { type: 'assistant', text: data.response }]);
        setTotalExchanges(data.history_count);
        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
        }
      } else {
        setMessages(prev => [...prev, { type: 'error', text: `Error: ${data.error}` }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { type: 'error', text: 'Connection error. Make sure backend is running on port 5000' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      try {
        await fetch(`${API_URL}/history`, { method: 'DELETE' });
        setMessages([]);
        setTotalExchanges(0);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
  };

  const getSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/summary`);
      const data = await response.json();
      if (data.status === 'success') {
        alert(data.summary || 'No conversation history yet');
      }
    } catch (error) {
      console.error('Error getting summary:', error);
      alert('Error fetching summary');
    }
  };

  return (
    <div className="App">
      {/* Floating Bot Icon */}
      <div 
        className={`bot-icon ${isOpen ? 'hidden' : 'visible'}`}
        onClick={() => {
          setIsOpen(true);
          setUnreadCount(0);
        }}
      >
        <div className="icon-content">
          🤖
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div className={`chat-container ${isOpen ? 'open' : 'closed'}`}>
        <div className="chat-header">
          <div className="header-content">
            <h1>🤖 Groq AI Assistant</h1>
            <p className="model-info">Powered by Llama 3.1 8B</p>
          </div>
          <div className="header-stats">
            <span className="stat-badge">💬 {totalExchanges} Exchanges</span>
            <button 
              className="btn-close"
              onClick={() => setIsOpen(false)}
              title="Close chat"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💡</div>
              <p>Start a conversation with the AI assistant</p>
              <p className="empty-hint">Ask me anything!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message message-${msg.type}`}>
                <div className="message-wrapper">
                  <div className="message-avatar">
                    {msg.type === 'user' ? '👤' : msg.type === 'error' ? '❌' : '🤖'}
                  </div>
                  <div className="message-content">
                    <div className="message-label">
                      {msg.type === 'user' && <strong>You</strong>}
                      {msg.type === 'assistant' && <strong>AI Assistant</strong>}
                      {msg.type === 'error' && <strong>Error</strong>}
                    </div>
                    <div className="message-text">
                      {msg.type === 'assistant' ? (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      ) : (
                        <p>{msg.text}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message message-loading">
              <div className="message-wrapper">
                <div className="message-avatar">🤖</div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <form onSubmit={sendMessage} className="message-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>

          <div className="action-buttons">
            <button onClick={getSummary} className="btn-secondary">
              View Summary
            </button>
            <button onClick={clearHistory} className="btn-danger">
              Clear 
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
