import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('brainbytesUser') || '';
    if (savedUser) setUsername(savedUser);

    const fetchActivity = async () => {
      try {
        const resp = await axios.get(
          `${API_URL}/api/messages?limit=100&username=${encodeURIComponent(savedUser)}`
        );
        setMessages(resp.data || []);
      } catch (error) {
        console.error('Error loading dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  // Only count user messages for subject breakdown — avoids double-counting AI replies
  const userMessages = messages.filter(m => m.isUser);
  const aiMessages = messages.filter(m => !m.isUser);

  const activityBySubject = useMemo(() => {
    const totals = {};
    for (const msg of userMessages) {
      const key = (msg.subject && msg.subject !== 'general') ? msg.subject : 'general';
      totals[key] = (totals[key] || 0) + 1;
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [userMessages]);

  // Sort messages newest first for display
  const recentMessages = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20, fontFamily: "'Poppins', sans-serif", boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Learning Dashboard</h2>
        <button
          onClick={() => window.location.href = '/'}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', backgroundColor: '#57bcff', color: '#fff', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
        >
          Back to Chat
        </button>
      </div>
      <p style={{ color: '#666', marginBottom: 20 }}>
        {username ? `Welcome back, ${username}!` : ''} Track your recent learning activity.
      </p>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Messages', value: messages.length },
          { label: 'Questions Asked', value: userMessages.length },
          { label: 'AI Responses', value: aiMessages.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#666', fontSize: 13 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#57bcff' }}>{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>

        {/* Recent Messages — fixed height, scrollable, no horizontal overflow */}
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff', minWidth: 0 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Recent Messages</h3>
          <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: 400 }}>
            {loading ? (
              <p style={{ color: '#999', margin: 0 }}>Loading...</p>
            ) : recentMessages.length === 0 ? (
              <p style={{ color: '#999', margin: 0 }}>No messages yet. Start a chat!</p>
            ) : (
              recentMessages.slice(0, 20).map((msg) => (
                <div key={msg._id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {msg.isUser ? '🧑 You' : '🤖 AI'}
                    </span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>
                      {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#57bcff', textTransform: 'capitalize', marginBottom: 4 }}>
                    {msg.subject || 'general'}
                  </div>
                  <div style={{ fontSize: 13, color: '#444', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: subject activity + recent questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Activity by Subject */}
          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Activity by Subject</h3>
            {loading ? (
              <p style={{ color: '#999', margin: 0 }}>Loading...</p>
            ) : activityBySubject.length === 0 ? (
              <p style={{ color: '#999', margin: 0 }}>No activity yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activityBySubject.map(([subject, count]) => {
                  const max = activityBySubject[0][1];
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

          {/* Recent Questions only */}
          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Recent Questions</h3>
            {loading ? (
              <p style={{ color: '#999', margin: 0 }}>Loading...</p>
            ) : userMessages.length === 0 ? (
              <p style={{ color: '#999', margin: 0 }}>No questions yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[...userMessages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map((msg) => (
                  <li key={msg._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 12, color: '#57bcff', textTransform: 'capitalize', marginBottom: 2 }}>{msg.subject || 'general'}</div>
                    <div style={{ fontSize: 13, color: '#333', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {msg.text}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}