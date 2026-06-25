import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Profile() {
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('brainbytesUser') || '';
    setUsername(savedUser);

    const savedHistory = localStorage.getItem(`brainbytesChatHistory_${savedUser}`);
    setChatHistory(savedHistory ? JSON.parse(savedHistory) : []);

    fetchMessages(savedUser);
  }, []);

  const fetchMessages = async (user) => {
    try {
      const resp = await axios.get(`${API_URL}/api/messages?limit=100&username=${encodeURIComponent(user || '')}`);
      setMessages(resp.data || []);
    } catch (err) {
      console.error('Error fetching messages', err);
    } finally {
      setLoading(false);
    }
  };

  // Only count user messages so subject counts aren't doubled by AI replies
  const userMessages = messages.filter(m => m.isUser);
  const aiMessages = messages.filter(m => !m.isUser);

  const subjectCounts = useMemo(() => {
    const totals = {};
    for (const msg of userMessages) {
      const key = (msg.subject && msg.subject !== 'general') ? msg.subject : 'general';
      totals[key] = (totals[key] || 0) + 1;
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [userMessages]);

  const favoriteSubject = subjectCounts.length > 0 ? subjectCounts[0][0] : 'None yet';

  // Newest messages first
  const recentMessages = [...userMessages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, fontFamily: "'Poppins', sans-serif", boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>My Account</h2>
        <button
          onClick={() => window.location.href = '/'}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', backgroundColor: '#57bcff', color: '#fff', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
        >
          Back to Chat
        </button>
      </div>
      <p style={{ color: '#666', marginBottom: 24 }}>
        {username ? `Logged in as: ${username}` : ''}
      </p>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Questions Asked', value: userMessages.length },
          { label: 'Favorite Subject', value: favoriteSubject, capitalize: true, small: true },
          { label: 'AI Responses Received', value: aiMessages.length },
          { label: 'Total Chats', value: chatHistory.length },
        ].map(({ label, value, capitalize, small }) => (
          <div key={label} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#666', fontSize: 13 }}>{label}</div>
            <div style={{ fontSize: small ? 20 : 28, fontWeight: 700, color: '#57bcff', textTransform: capitalize ? 'capitalize' : 'none' }}>
              {loading ? '—' : value}
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Left: Recent Questions — scrollable */}
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff', minWidth: 0 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Recent Questions</h3>
          <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: 360 }}>
            {loading ? (
              <p style={{ color: '#999', margin: 0 }}>Loading...</p>
            ) : recentMessages.length === 0 ? (
              <p style={{ color: '#999', margin: 0 }}>No questions yet. Start a chat!</p>
            ) : (
              recentMessages.slice(0, 20).map((msg) => (
                <div key={msg._id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 12, color: '#57bcff', textTransform: 'capitalize', marginBottom: 2 }}>
                    {msg.subject || 'general'}
                  </div>
                  <div style={{ fontSize: 13, color: '#333', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Recent Chats */}
          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Recent Chats</h3>
            {chatHistory.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14, margin: 0 }}>No chats yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {chatHistory.slice(0, 6).map((chat) => (
                  <li key={chat.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.title}
                    </div>
                    <div style={{ color: '#57bcff', fontSize: 12, textTransform: 'capitalize' }}>{chat.subject}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Subject Breakdown */}
          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Subject Breakdown</h3>
            {loading ? (
              <p style={{ color: '#999', margin: 0 }}>Loading...</p>
            ) : subjectCounts.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14, margin: 0 }}>No activity yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {subjectCounts.map(([subject, count]) => {
                  const max = subjectCounts[0][1];
                  const pct = Math.round((count / max) * 100);
                  return (
                    <li key={subject} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, textTransform: 'capitalize', fontSize: 14 }}>
                        <span>{subject}</span>
                        <strong>{count} {count === 1 ? 'question' : 'questions'}</strong>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: '#f0f0f0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#57bcff', borderRadius: 99, transition: 'width 0.3s ease' }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}