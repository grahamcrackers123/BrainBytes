import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const SUBJECT_OPTIONS = ['math', 'science', 'history', 'english', 'technology', 'geography'];

export default function Profile() {
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [preferredSubjects, setPreferredSubjects] = useState([]);
  const [saving, setSaving] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile._id === selectedId),
    [profiles, selectedId]
  );

  const fetchProfiles = async () => {
    try {
      const resp = await axios.get('http://localhost:3000/api/profiles');
      setProfiles(resp.data);
    } catch (err) {
      console.error('Error fetching profiles', err);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!selectedProfile) {
      setName('');
      setEmail('');
      setPreferredSubjects([]);
      return;
    }

    setName(selectedProfile.name || '');
    setEmail(selectedProfile.email || '');
    setPreferredSubjects(selectedProfile.preferredSubjects || []);
  }, [selectedProfile]);

  const toggleSubject = (subject) => {
    setPreferredSubjects((current) => {
      if (current.includes(subject)) {
        return current.filter((s) => s !== subject);
      }
      return [...current, subject];
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name,
      email,
      preferredSubjects
    };

    try {
      if (selectedId) {
        const resp = await axios.put(`http://localhost:3000/api/profiles/${selectedId}`, payload);
        setProfiles((prev) => prev.map((profile) => (profile._id === selectedId ? resp.data : profile)));
      } else {
        const resp = await axios.post('http://localhost:3000/api/profiles', payload);
        setProfiles((prev) => [resp.data, ...prev]);
        setSelectedId(resp.data._id);
      }
    } catch (err) {
      console.error('Error saving profile', err);
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/profiles/${selectedId}`);
      setProfiles((prev) => prev.filter((profile) => profile._id !== selectedId));
      setSelectedId('');
    } catch (err) {
      console.error('Error deleting profile', err);
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, fontFamily: 'Nunito, sans-serif' }}>
      <h2>User Profile</h2>
      <p style={{ color: '#666' }}>Set your preferred subjects to personalize the tutoring experience.</p>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="profileSelect" style={{ display: 'block', marginBottom: 8 }}>Select Existing Profile</label>
        <select
          id="profileSelect"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        >
          <option value="">Create new profile</option>
          {profiles.map((profile) => (
            <option key={profile._id} value={profile._id}>
              {profile.name} ({profile.email})
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSave} style={{ background: '#fff', border: '1px solid #e1e1e1', borderRadius: 12, padding: 16 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ display: 'block', padding: 10, marginBottom: 10, width: '100%', borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: 'block', padding: 10, marginBottom: 14, width: '100%', borderRadius: 8, border: '1px solid #ccc' }}
        />

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: '600' }}>Preferred Subjects</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUBJECT_OPTIONS.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => toggleSubject(subject)}
                style={{
                  border: preferredSubjects.includes(subject) ? '1px solid #1e88e5' : '1px solid #ccc',
                  background: preferredSubjects.includes(subject) ? '#e3f2fd' : '#f9f9f9',
                  borderRadius: 999,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#57bcff', color: '#fff' }}>
            {saving ? 'Saving...' : selectedId ? 'Update Profile' : 'Create Profile'}
          </button>
          <button type="button" onClick={handleDelete} disabled={!selectedId} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ccc', background: '#fff' }}>
            Delete Profile
          </button>
          <button type="button" onClick={() => (window.location.href = '/')} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ccc', background: '#fff' }}>
            Back to Chat
          </button>
        </div>
      </form>
    </div>
  );
}
