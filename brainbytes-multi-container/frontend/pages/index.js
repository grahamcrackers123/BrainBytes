import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('general');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messageEndRef = useRef(null);

  // Fetch messages from the API
  const fetchMessages = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/messages');
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  // Fetch subjects from learning materials
  const fetchSubjects = async () => {
    try {
      const resp = await axios.get('http://localhost:3000/api/materials');
      const mats = resp.data || [];
      const unique = Array.from(new Set(mats.map(m => m.subject))).filter(Boolean);
      setSubjects(unique);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  // Submit a new message
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setIsTyping(true); // Show typing indicator
      const userMsg = newMessage;
      setNewMessage('');

      // Optimistically add user message to UI
      const tempUserMsg = {
        _id: Date.now().toString(),
        text: userMsg,
        isUser: true,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempUserMsg]);

      // Send to backend and get AI response
      const response = await axios.post('http://localhost:3000/api/messages', {
        text: userMsg,
        subject: subjectFilter
      });

      // Replace the temporary message with the actual one and add AI response
      setMessages(prev => {
        // Filter out the temporary message
        const filteredMessages = prev.filter(msg => msg._id !== tempUserMsg._id);
        // Add the real messages from the API
        return [...filteredMessages, response.data.userMessage, response.data.aiMessage];
      });
    } catch (error) {
      console.error('Error posting message:', error);
      // Show error in chat
      setMessages(prev => [...prev, {
        _id: Date.now().toString(),
        text: "Sorry, I couldn't process your request. Please try again later.",
        isUser: false,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages on component mount
  useEffect(() => {
    fetchMessages();
    fetchSubjects();
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', fontFamily: 'Nunito, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>BrainBytes AI Tutor</h1>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', height: '80vh', gap: '20px', width: '100%' }}>
        {/* <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}> */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <button onClick={() => window.location.href = '/profile'} style={{ marginBottom: '16px', padding: '10px 70px', border: 'none', borderRadius: '16px', backgroundColor: '#57bcff', color: '#fff', cursor: isTyping ? 'not-allowed' : 'pointer', }}> Profile </button>
          <button onClick={() => window.location.href = '/dashboard'} style={{ marginBottom: '16px', padding: '10px 70px', border: 'none', borderRadius: '16px', backgroundColor: '#57bcff', color: '#fff', cursor: isTyping ? 'not-allowed' : 'pointer', }}> Dashboard </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="subjectFilter" style={{ display: 'block', marginBottom: '6px', color: '#666' }}>Subject filter</label>
            <select
              id="subjectFilter"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: '12px', backgroundColor: '#fff', fontSize: '15px', cursor: 'pointer' }}
            >
              <option value="general">General</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject.charAt(0).toUpperCase() + subject.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              flex: 1,
              border: '1px solid #ddd',
              borderRadius: '12px',
              overflowY: 'auto',
              padding: '16px',
              marginBottom: '20px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Loading conversation history...</p>
              </div>
            ) : (
              <div>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <h3>Welcome to BrainBytes AI Tutor!</h3>
                    <p>Ask me any question about math, science, or history.</p>
                  </div>
                ) : (
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {messages.map((message) => (
                      <li
                        key={message._id}
                        style={{
                          padding: '12px 16px',
                          margin: '8px 0',
                          backgroundColor: message.isUser ? '#e3f2fd' : '#e8f5e9',
                          color: '#333',
                          borderRadius: '12px',
                          maxWidth: '70%',
                          wordBreak: 'break-word',
                          marginLeft: message.isUser ? 'auto' : '0',
                          marginRight: message.isUser ? '0' : 'auto',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ margin: '0 0 5px 0', lineHeight: '1.5' }}>{message.text}</div>
                        <div style={{
                          fontSize: '12px',
                          color: '#666',
                          textAlign: message.isUser ? 'right' : 'left'
                        }}>
                          {message.isUser ? 'You' : 'AI Tutor'} • {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </li>
                    ))}
                    {isTyping && (
                      <li
                        style={{
                          padding: '12px 16px',
                          margin: '8px 0',
                          backgroundColor: '#e8f5e9',
                          color: '#333',
                          borderRadius: '12px',
                          maxWidth: '80%',
                          marginLeft: '0',
                          marginRight: 'auto',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ margin: '0' }}>AI tutor is typing...</div>
                      </li>
                    )}
                    <div ref={messageEndRef} />
                  </ul>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a question..."
              style={{
                flex: '1',
                padding: '10px',
                borderRadius: '16px',
                border: '1px solid #ddd',
                fontSize: '16px',
                outline: 'none'
              }}
              disabled={isTyping}
            />
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                backgroundColor: isTyping ? '#90caf9' : '#57bcff',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '16px',
                cursor: isTyping ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s'
              }}
              disabled={isTyping}
            >
              {isTyping ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}