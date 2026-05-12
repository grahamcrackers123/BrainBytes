import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const [messagesResp, materialsResp] = await Promise.all([
          axios.get('http://localhost:3000/api/messages?limit=30'),
          axios.get('http://localhost:3000/api/materials')
        ]);
        setMessages(messagesResp.data || []);
        setMaterials((materialsResp.data || []).slice(0, 10));
      } catch (error) {
        console.error('Error loading dashboard data', error);
      }
    };

    fetchActivity();
  }, []);

  const activityBySubject = useMemo(() => {
    const totals = {};
    for (const message of messages) {
      const key = message.subject || 'general';
      totals[key] = (totals[key] || 0) + 1;
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [messages]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20, fontFamily: 'Nunito, sans-serif' }}>
      <h2>Learning Dashboard</h2>
      <p style={{ color: '#666' }}>Track your recent learning activity and materials.</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent Conversation Activity</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{messages.length}</div>
          <div style={{ color: '#666' }}>messages analyzed</div>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Learning Materials</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{materials.length}</div>
          <div style={{ color: '#666' }}>recent resources</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.2fr 1fr' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Recent Messages</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {messages.map((msg) => (
              <li key={msg._id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 600 }}>
                  {msg.isUser ? 'You' : 'AI'}
                  <span style={{ marginLeft: 8, color: '#777', fontWeight: 400, textTransform: 'capitalize' }}>
                    {msg.subject || 'general'}
                  </span>
                </div>
                <div>{msg.text}</div>
                <small style={{ color: '#777' }}>{new Date(msg.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Activity by Subject</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activityBySubject.map(([subject, count]) => (
                <li key={subject} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', textTransform: 'capitalize' }}>
                  <span>{subject}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Recent Materials</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {materials.map((mat) => (
                <li key={mat._id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{mat.subject} - {mat.topic}</div>
                  <div style={{ color: '#444' }}>{mat.content.substring(0, 120)}{mat.content.length > 120 ? '...' : ''}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
