import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

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

  // Submit a new message
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/messages', { text: newMessage });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error posting message:', error);
    }
  };

  // Load messages on component mount
  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>BrainBytes Chat</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ width: '80%', padding: '8px' }}
        />
        <button 
          type="submit" 
          style={{ 
            marginLeft: '10px', 
            padding: '8px 15px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Send
        </button>
      </form>
      
      {loading ? (
        <p>Loading messages...</p>
      ) : (
        <div>
            {messages.length === 0 ? (
            <p>No messages yet. Be the first to say something!</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {messages.map((message) => (
                <li 
                  key={message._id} 
                  style={{ 
                    padding: '10px', 
                    margin: '10px 0', 
                    backgroundColor: '#f0f0f0',
                    borderRadius: '5px'
                  }}
                >
                  <p>{message.text}</p>
                  <small>{new Date(message.createdAt).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

