import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('general');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  const messageEndRef = useRef(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await axios.get(

      `${API_URL}/api/messages?subject=${subjectFilter}${
        currentChatId
          ? `&chatId=${currentChatId}`
          : ''
      }`

    );

      const sortedMessages = response.data.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      setMessages(sortedMessages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/materials`);

      const mats = response.data || [];

      const uniqueSubjects = Array.from(
        new Set(mats.map((m) => m.subject))
      ).filter(Boolean);

      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // Send message
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    const userText = newMessage;
    let activeChatId = currentChatId;

if (!activeChatId) {

  activeChatId =
    `chat_${subjectFilter}_${Date.now()}`;

  setCurrentChatId(activeChatId);

  const newHistory = [

    {
      id: activeChatId,
      title:
        userText.substring(0, 25),
      subject: subjectFilter
    },

    ...chatHistory

  ];

  setChatHistory(newHistory);

  localStorage.setItem(
    'brainbytesChatHistory',
    JSON.stringify(newHistory)
  );
}

    setNewMessage('');

    // USER MESSAGE FIRST
    const tempUserMessage = {
      _id: Date.now().toString(),
      text: userText,
      isUser: true,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    setIsTyping(true);

    try {
      const response = await axios.post(`${API_URL}/api/messages`, {
        text: userText,
        subject: subjectFilter,
        preferredSubjects: [subjectFilter],
        chatId: activeChatId
      });

      const aiMessage = response.data.aiMessage;

      setMessages((prev) => {
        const filtered = prev.filter(
          (msg) => msg._id !== tempUserMessage._id
        );

        const updated = [
          ...filtered,
          response.data.userMessage,
          aiMessage
        ];

        updated.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        return updated;
      });

    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage = {
        _id: Date.now().toString(),
        text: 'Sorry, AI service is currently unavailable.',
        isUser: false,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, errorMessage]);

    } finally {
      setIsTyping(false);
    }
  };

  const handleLogin = () => {
  if (!username.trim()) return;

  localStorage.setItem('brainbytesUser', username);

  setLoggedIn(true);
  const firstChatId =
  `chat_general_${Date.now()}`;

setCurrentChatId(firstChatId);

const starterHistory = [

  {
    id: firstChatId,
    title: 'New Chat',
    subject: 'general'
  }

];

setChatHistory(starterHistory);

localStorage.setItem(
  'brainbytesChatHistory',
  JSON.stringify(starterHistory)
);
};

const handleLogout = () => {
  localStorage.removeItem('brainbytesUser');

  setLoggedIn(false);
  setUsername('');
};

const handleNewChat = () => {

  const newChatId =
    `chat_${subjectFilter}_${Date.now()}`;

  setCurrentChatId(newChatId);

  setMessages([]);

  const updatedHistory = [

    {
      id: newChatId,
      title:
        `${subjectFilter.toUpperCase()} Chat`,
      subject: subjectFilter
    },

    ...chatHistory

  ];

  setChatHistory(updatedHistory);

  localStorage.setItem(
    'brainbytesChatHistory',
    JSON.stringify(updatedHistory)
  );
};

const handleDeleteChat = (chatId) => {

  const updatedHistory =
    chatHistory.filter(
      chat => chat.id !== chatId
    );

  setChatHistory(updatedHistory);

  localStorage.setItem(
    'brainbytesChatHistory',
    JSON.stringify(updatedHistory)
  );

  // If active chat deleted
  if (currentChatId === chatId) {

    setCurrentChatId(null);

    setMessages([]);
  }
};

  // Auto scroll
  useEffect(() => {

  const scrollToBottom = () => {

    setTimeout(() => {

      messageEndRef.current?.scrollIntoView({
        behavior: 'auto'
      });

    }, 100);

  };

  scrollToBottom();

}, [messages]);

  // Initial load
useEffect(() => {

  const savedUser =
    localStorage.getItem('brainbytesUser');

  if (savedUser) {

    setUsername(savedUser);

    setLoggedIn(true);

    const savedHistory =
      localStorage.getItem(
        'brainbytesChatHistory'
      );

    if (savedHistory) {

      setChatHistory(
        JSON.parse(savedHistory)
      );
    }
  }

  // =========================
  // ONLY LOAD IF ACTIVE CHAT
  // =========================

  if (currentChatId) {

    fetchMessages();

  } else {

    setMessages([]);
  }

  fetchSubjects();

}, [subjectFilter, currentChatId]);

if (!loggedIn) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fb',
        fontFamily: "'Poppins', sans-serif"
      }}
    >
      <div
        style={{
          width: '400px',
          padding: '40px',
          borderRadius: '24px',
          backgroundColor: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}
      >
        <h1>BrainBytes AI</h1>

        <p
          style={{
            color: '#666',
            marginBottom: '30px'
          }}
        >
          Your AI learning assistant
        </p>

        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: '1px solid #ddd',
            marginBottom: '20px',
            fontSize: '16px'
          }}
        />

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            backgroundColor: '#57bcff',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: "'Poppins', sans-serif"
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          color: '#333'
        }}
      >
        BrainBytes AI Tutor
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          height: '80vh'
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: '250px',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <h2
            style={{
              textAlign: 'center',
              marginBottom: '25px',
              color: '#333',
              fontWeight: '700'
            }}
          >
            👋 {username}
          </h2>

          <button
            onClick={() => (window.location.href = '/profile')}
            style={buttonStyle}
          >
            Profile
          </button>

          <button
            onClick={() => (window.location.href = '/dashboard')}
            style={buttonStyle}
          >
            Dashboard
          </button>

            <button
              onClick={handleNewChat}
              style={{
                ...buttonStyle,
                backgroundColor: '#4caf50'
              }}
            >
              + New Chat
            </button>

            <div
              style={{
                marginTop: '25px'
              }}
            >
              <h3
                style={{
                  marginBottom: '12px',
                  fontSize: '16px'
                }}
              >
                Recent Chats
              </h3>

              {chatHistory.map((chat) => (

                <div
                  key={chat.id}

                  onClick={() => {

                    setCurrentChatId(chat.id);

                    // AUTO SWITCH SUBJECT
                    setSubjectFilter(chat.subject);

                    setTimeout(() => {

                      fetchMessages();

                    }, 100);

                  }}

                  style={{
                    padding: '10px',
                    marginBottom: '8px',
                    borderRadius: '10px',

                    backgroundColor:
                      currentChatId === chat.id
                        ? '#dbeafe'
                        : '#f5f5f5',

                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >

                    <span>
                      {chat.title}
                    </span>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        handleDeleteChat(chat.id);

                      }}

                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ff4d4f',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      ✕
                    </button>

                  </div>

                </div>

              ))}
            </div>

          <button
            onClick={handleLogout}
            style={{
              ...buttonStyle,
              backgroundColor: '#ff6b6b'
            }}
          >
            Logout
          </button>
        </div>

        {/* Main Chat */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}
        >
          {/* Subject Filter */}
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="subjectFilter"
              style={{
                display: 'block',
                marginBottom: '6px'
              }}
            >
              Subject filter
            </label>

            <select
              id="subjectFilter"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid #ddd'
              }}
            >
              <option value="general">General</option>
              <option value="math">Math</option>
              <option value="science">Science</option>
              <option value="history">History</option>
              <option value="english">English</option>
              <option value="technology">Technology</option>
              <option value="geography">Geography</option>

              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject.charAt(0).toUpperCase() + subject.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Chat Box */}
          <div
            style={{
              flex: 1,
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '16px',
              overflowY: 'auto',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}
          >
            {loading && messages.length > 0 ? (

  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      color: '#777'
    }}
  >
    Loading messages...
  </div>

) : (

  <>

    {messages.length === 0 ? (

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          height: '100%',
          color: '#666',
          padding: '20px'
        }}
      >

        <h2
          style={{
            marginBottom: '10px'
          }}
        >
          👋 Welcome to BrainBytes AI Tutor
        </h2>

        <p
          style={{
            maxWidth: '500px',
            lineHeight: '1.6'
          }}
        >
          Ask questions about math, science,
          history, programming, technology,
          and more.
        </p>

        <p
          style={{
            marginTop: '15px',
            fontSize: '14px',
            color: '#999'
          }}
        >
          Click "New Chat" to start a new conversation.
        </p>

      </div>

    ) : (

      messages.map((message) => (
                    <div
                      key={message._id}
                      style={{
                        maxWidth: '75%',
                        padding: '12px 16px',
                        marginBottom: '12px',
                        borderRadius: '12px',
                        backgroundColor: message.isUser
                          ? '#e3f2fd'
                          : '#e8f5e9',
                        marginLeft: message.isUser
                          ? 'auto'
                          : '0',
                        marginRight: message.isUser
                          ? '0'
                          : 'auto',
                        boxShadow:
                          '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div>
                        <ReactMarkdown
                          components={{
                            code({ inline, children }) {
                              return !inline ? (
                                <pre
                                  style={{
                                    backgroundColor: '#1e1e1e',
                                    color: '#fff',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    overflowX: 'auto',
                                    marginTop: '10px'
                                  }}
                                >
                                  <code>{children}</code>
                                </pre>
                              ) : (
                                <code
                                  style={{
                                    backgroundColor: '#eee',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {children}
                                </code>
                              );
                            },

                            ul({ children }) {
                              return (
                                <ul
                                  style={{
                                    paddingLeft: '20px',
                                    marginTop: '8px'
                                  }}
                                >
                                  {children}
                                </ul>
                              );
                            },

                            ol({ children }) {
                              return (
                                <ol
                                  style={{
                                    paddingLeft: '20px',
                                    marginTop: '8px'
                                  }}
                                >
                                  {children}
                                </ol>
                              );
                            },

                            li({ children }) {
                              return (
                                <li
                                  style={{
                                    marginBottom: '6px'
                                  }}
                                >
                                  {children}
                                </li>
                              );
                            },

                            h1({ children }) {
                              return (
                                <h1
                                  style={{
                                    fontSize: '28px',
                                    marginBottom: '10px'
                                  }}
                                >
                                  {children}
                                </h1>
                              );
                            },

                            h2({ children }) {
                              return (
                                <h2
                                  style={{
                                    fontSize: '22px',
                                    marginBottom: '8px'
                                  }}
                                >
                                  {children}
                                </h2>
                              );
                            },

                            p({ children }) {
                              return (
                                <p
                                  style={{
                                    lineHeight: '1.6',
                                    marginBottom: '8px',
                                    whiteSpace: 'pre-wrap'
                                  }}
                                >
                                  {children}
                                </p>
                              );
                            }
                          }}
                        >
                          {message.text}
</ReactMarkdown>
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          marginTop: '6px',
                          textAlign: message.isUser
                            ? 'right'
                            : 'left'
                        }}
                      >
                        {message.isUser ? 'You' : 'AI Tutor'} •{' '}
                        {new Date(
                          message.createdAt
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}

                {isTyping && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#e8f5e9',
                      maxWidth: '200px'
                    }}
                  >
                    AI Tutor is typing...
                  </div>
                )}

                <div ref={messageEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: '10px'
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a question..."
              disabled={isTyping}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '16px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
            />

            <button
              type="submit"
              disabled={isTyping}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '16px',
                backgroundColor: '#57bcff',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {isTyping ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Button style
const buttonStyle = {
  width: '100%',
  marginBottom: '16px',
  padding: '10px',
  border: 'none',
  borderRadius: '16px',
  backgroundColor: '#57bcff',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '16px'
};