'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

// Helper: add minutes to a time string "HH:MM", returns "HH:MM"
function addMinutesToTime(timeStr, minutes) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export default function ActivityCard({ activity }) {
  const { toggleActivity, updateActivityTime, getActivityTimeData, selectedRamadanDay, isSelectedDayToday, activities, getDateForRamadanDay } = useApp();
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [sessions, setSessions] = useState([{ start: '', end: '' }]);
  const [notes, setNotes] = useState('');
  const isWajib = activity.category === 'wajib';
  const isAmanah = activity.category === 'amanah';
  const [isEditing, setIsEditing] = useState(false);
  const [showOvernightConfirm, setShowOvernightConfirm] = useState(false);

  // Helper: check if a session crosses midnight
  const getOvernightInfo = (session) => {
    if (!session.start || !session.end) return null;
    const [sh, sm] = session.start.split(':').map(Number);
    const [eh, em] = session.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins >= startMins) return null; // normal, no overnight
    // Crosses midnight
    const todayMins = (24 * 60) - startMins; // from start to 00:00
    const tomorrowMins = endMins; // from 00:00 to end
    const totalMins = todayMins + tomorrowMins;
    // If total > 12 hours, likely a typo (e.g. 10:30 → 10:00 = 23h30m)
    const isSuspicious = totalMins > 12 * 60;
    const fmt = (m) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      if (h > 0 && min > 0) return `${h} jam ${min} menit`;
      if (h > 0) return `${h} jam`;
      return `${min} menit`;
    };
    return { todayMins, tomorrowMins, totalMins, isSuspicious, todayStr: fmt(todayMins), tomorrowStr: fmt(tomorrowMins), totalStr: fmt(totalMins) };
  };

  // Check if any session crosses midnight
  const hasOvernightSession = sessions.some(s => getOvernightInfo(s) !== null);
  // Check if any overnight session looks like a typo
  const hasSuspiciousSession = sessions.some(s => { const info = getOvernightInfo(s); return info?.isSuspicious; });

  // Get saved time data for this activity
  const timeData = getActivityTimeData ? getActivityTimeData(activity.id) : null;

  // Parse time sessions from timeData for display
  const getTimeSessions = () => {
    if (!timeData) return [];

    // Check if it's multi-session data
    if (timeData.endTime === '__multi__' && timeData.startTime) {
      try {
        return JSON.parse(timeData.startTime);
      } catch {
        return [{ start: timeData.startTime, end: '' }];
      }
    }

    // Single session (backward compatible)
    if (timeData.startTime) {
      return [{ start: timeData.startTime, end: timeData.endTime || '' }];
    }

    return [];
  };

  // Get notes from the most recent previous day for this activity (for amanah pre-fill)
  const getPreviousDayNotes = () => {
    if (!isAmanah) return '';
    const baseId = activity.id.replace('__spillover', '');
    // Search up to 7 days back
    for (let d = 1; d <= 7; d++) {
      const prevDay = selectedRamadanDay - d;
      if (prevDay < 1) break;
      const prevDate = getDateForRamadanDay(prevDay);
      const prevData = activities[prevDate]?.[baseId];
      if (prevData?.notes) return prevData.notes;
    }
    return '';
  };

  // Initialize sessions when modal opens
  useEffect(() => {
    if (!showTimeModal) return;

    if (isEditing) {
      // Editing existing completed activity — load saved sessions
      const existingSessions = getTimeSessions();
      if (existingSessions.length > 0) {
        setSessions(existingSessions);
      } else {
        setSessions([{ start: '', end: '' }]);
      }
      // Load saved notes for amanah — fallback to previous day if empty
      setNotes(timeData?.notes || (isAmanah ? getPreviousDayNotes() : ''));
    } else {
      // New activity — set default
      const defaultStart = activity.time?.split?.(' - ')?.[0] || activity.time?.replace?.(/[^\d:]/g, '') || '';
      const defaultEnd = isWajib && defaultStart ? addMinutesToTime(defaultStart, 10) : '';
      setSessions([{ start: defaultStart, end: defaultEnd }]);
      // Pre-fill notes from previous day for amanah activities
      setNotes(isAmanah ? getPreviousDayNotes() : '');
    }
  }, [showTimeModal]);

  // Get Subuh and Maghrib times from prayer schedule in localStorage
  const getPrayerTime = (prayer) => {
    try {
      const saved = localStorage.getItem('ramadhan_shalat_v2');
      if (saved) {
        const { schedule } = JSON.parse(saved);
        if (schedule?.[prayer]) return schedule[prayer];
      }
    } catch (e) { }
    return null;
  };

  const handleCardClick = (e) => {
    e.stopPropagation();

    // Special handling for Puasa — auto-fill from prayer schedule
    if (activity.id === 'puasa') {
      if (activity.completed) {
        toggleActivity(activity.id);
      } else {
        const subuh = getPrayerTime('subuh') || '04:30';
        const maghrib = getPrayerTime('maghrib') || '18:00';
        toggleActivity(activity.id, subuh, maghrib);
      }
      return;
    }

    // Special handling for Buka Puasa — maghrib to maghrib+10min
    if (activity.id === 'buka') {
      if (activity.completed) {
        toggleActivity(activity.id);
      } else {
        const maghrib = getPrayerTime('maghrib') || '18:00';
        const endTime = addMinutesToTime(maghrib, 10);
        toggleActivity(activity.id, maghrib, endTime);
      }
      return;
    }

    if (activity.completed) {
      // Open modal in EDIT mode with existing sessions  
      setIsEditing(true);
      setShowTimeModal(true);
    } else {
      // Open modal in NEW mode
      setIsEditing(false);
      setShowTimeModal(true);
    }
  };

  const handleUncomplete = () => {
    // Uncomplete the activity (toggle off)
    toggleActivity(activity.id);
    setShowTimeModal(false);
    setSessions([{ start: '', end: '' }]);
    setIsEditing(false);
  };

  const handleSaveTime = (bypassOvernightCheck = false) => {
    // Amanah activities require a description
    if (isAmanah && !notes.trim()) {
      return;
    }

    // Block save if any session has suspicious duration (> 12 hours)
    if (hasSuspiciousSession) {
      setShowOvernightConfirm(true);
      return;
    }

    // Check for overnight sessions — show confirmation first
    if (!bypassOvernightCheck && hasOvernightSession) {
      setShowOvernightConfirm(true);
      return;
    }

    // Filter out empty sessions
    const validSessions = sessions.filter(s => s.start);

    let startTimeValue = null;
    let endTimeValue = null;

    if (validSessions.length === 1) {
      startTimeValue = validSessions[0].start;
      endTimeValue = validSessions[0].end || null;
    } else if (validSessions.length > 1) {
      startTimeValue = JSON.stringify(validSessions);
      endTimeValue = '__multi__';
    }

    const notesValue = notes.trim() || null;

    if (isEditing) {
      updateActivityTime(activity.id, startTimeValue, endTimeValue, notesValue);
    } else {
      if (validSessions.length === 0 && !notesValue) {
        toggleActivity(activity.id);
      } else {
        toggleActivity(activity.id, startTimeValue, endTimeValue, notesValue);
      }
    }

    setShowTimeModal(false);
    setShowOvernightConfirm(false);
    setSessions([{ start: '', end: '' }]);
    setNotes('');
    setIsEditing(false);
  };

  // Check if user has entered any time
  const hasInput = sessions.some(s => s.start);

  const handleSkipTime = () => {
    if (isEditing) {
      setShowTimeModal(false);
    } else {
      // If user typed something, 'Skip' becomes 'Cancel' -> don't save.
      // If user typed nothing, 'Skip' means 'Save without time' (toggle ON).
      if (hasInput) {
        setShowTimeModal(false);
      } else {
        toggleActivity(activity.id);
        setShowTimeModal(false);
      }
    }
    setSessions([{ start: '', end: '' }]);
    setIsEditing(false);
    setShowOvernightConfirm(false);
  };

  const addSession = () => {
    setSessions(prev => [...prev, { start: '', end: '' }]);
  };

  const removeSession = (index) => {
    if (sessions.length <= 1) return;
    setSessions(prev => prev.filter((_, i) => i !== index));
  };

  const updateSession = (index, field, value) => {
    setSessions(prev => prev.map((s, i) => {
      if (i !== index) return s;
      const updated = { ...s, [field]: value };
      // Auto-set end time for wajib prayers: start + 10 minutes
      if (isWajib && field === 'start' && value) {
        updated.end = addMinutesToTime(value, 10);
      }
      return updated;
    }));
  };

  // Calculate total duration of all sessions
  const calculateTotalDuration = (timeSessions) => {
    let totalMinutes = 0;
    timeSessions.forEach(session => {
      if (session.start && session.end) {
        const [sh, sm] = session.start.split(':').map(Number);
        const [eh, em] = session.end.split(':').map(Number);
        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        // Handle overnight (e.g., 21:00 - 05:00)
        if (endMins <= startMins) {
          endMins += 24 * 60;
        }
        totalMinutes += (endMins - startMins);
      }
    });
    if (totalMinutes <= 0) return null;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}j ${mins}m`;
    if (hours > 0) return `${hours}j`;
    return `${mins}m`;
  };

  // Format display time
  const getDisplayTime = () => {
    const timeSessions = getTimeSessions();
    if (timeSessions.length === 0) return activity.time;

    if (timeSessions.length === 1) {
      const s = timeSessions[0];
      if (s.start && s.end) return `${s.start} - ${s.end}`;
      if (s.start) return s.start;
      return activity.time;
    }

    // Multiple sessions
    const totalDuration = calculateTotalDuration(timeSessions);
    return `${timeSessions.length} sesi${totalDuration ? ` (${totalDuration})` : ''}`;
  };

  const displaySessions = getTimeSessions();

  return (
    <>
      <div
        className={`activity-card ripple ${activity.completed ? 'completed' : ''}`}
        onClick={handleCardClick}
      >
        <div className="activity-icon">
          {activity.icon}
        </div>
        <div className="activity-info">
          <div className="activity-name">
            {activity.name}
            {isAmanah && activity.completed && timeData?.notes && (
              <span style={{ fontWeight: '400', color: 'var(--emerald-400)', marginLeft: '4px' }}>
                {timeData.notes}
              </span>
            )}
          </div>
          <div className="activity-time">
            {activity.id === 'puasa' && activity.completed && timeData?.startTime ? (
              <span className="recorded-time">
                🌅 Subuh {timeData.startTime} — 🌇 Maghrib {timeData.endTime}
              </span>
            ) : activity.id === 'buka' && activity.completed && timeData?.startTime ? (
              <span className="recorded-time">
                🌇 Maghrib {timeData.startTime} — {timeData.endTime}
              </span>
            ) : activity.completed && displaySessions.length > 0 ? (
              <span className="recorded-time">
                {displaySessions.length > 1 ? (
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {displaySessions.map((s, i) => (
                      <span key={i} style={{ fontSize: '11px' }}>
                        ⏱️ {s.start}{s.end ? ` - ${s.end}` : ''}
                      </span>
                    ))}
                    {calculateTotalDuration(displaySessions) && (
                      <span style={{ fontSize: '10px', color: 'var(--dark-400)' }}>
                        Total: {calculateTotalDuration(displaySessions)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span>⏱️ {getDisplayTime()}</span>
                )}
              </span>
            ) : (
              activity.time
            )}
          </div>
        </div>
        <div className="activity-status">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      {/* Time Input Modal */}
      <div
        className={`modal-overlay ${showTimeModal ? 'active' : ''}`}
        onClick={() => { setShowTimeModal(false); setIsEditing(false); }}
      >
        <div className="modal-content time-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-handle"></div>

          <div className="time-modal-header">
            <span className="time-modal-icon">{activity.icon}</span>
            <div>
              <h2 className="modal-title">{activity.name}</h2>
              {isEditing && (
                <span style={{
                  fontSize: '10px',
                  color: 'var(--emerald-400)',
                  fontWeight: '600',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}>
                  ✏️ Edit Waktu
                </span>
              )}
            </div>
          </div>

          <p className="time-modal-desc">
            {isEditing
              ? `Edit atau tambah sesi waktu untuk Hari ${selectedRamadanDay}`
              : `Catat waktu pelaksanaan untuk Hari ${selectedRamadanDay}`
            }
          </p>

          {/* Sessions */}
          <div className="time-sessions-container">
            {sessions.map((session, index) => (
              <div key={index} className="time-session-row">
                {sessions.length > 1 && (
                  <div className="session-label">
                    <span className="session-badge">Sesi {index + 1}</span>
                    <button
                      className="session-remove-btn"
                      onClick={() => removeSession(index)}
                      title="Hapus sesi"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="time-inputs">
                  <div className="time-input-group">
                    <label className="time-label">Mulai</label>
                    <input
                      type="time"
                      className="time-input"
                      value={session.start}
                      onChange={(e) => updateSession(index, 'start', e.target.value)}
                    />
                  </div>

                  {!isWajib && (
                    <>
                      <span className="time-separator">→</span>
                      <div className="time-input-group">
                        <label className="time-label">Selesai</label>
                        <input
                          type="time"
                          className="time-input"
                          value={session.end}
                          onChange={(e) => updateSession(index, 'end', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                {isWajib && session.start && (
                  <div style={{ fontSize: '11px', color: 'var(--emerald-400)', marginTop: '8px', textAlign: 'center' }}>
                    ⏱️ Selesai otomatis: {addMinutesToTime(session.start, 10)} (10 menit)
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Overnight info banners per session */}
          {sessions.map((session, index) => {
            const overnight = getOvernightInfo(session);
            if (!overnight) return null;
            const borderColor = overnight.isSuspicious ? 'rgba(239, 68, 68, 0.4)' : 'rgba(251, 191, 36, 0.3)';
            const bgColor = overnight.isSuspicious ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)';
            const accentColor = overnight.isSuspicious ? '#f87171' : '#fbbf24';
            const dividerColor = overnight.isSuspicious ? 'rgba(239, 68, 68, 0.25)' : 'rgba(251, 191, 36, 0.2)';
            return (
              <div key={`overnight-${index}`} style={{
                margin: '4px 0 8px',
                padding: '10px 12px',
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px' }}>{overnight.isSuspicious ? '⚠️' : '🌙'}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: accentColor }}>
                    {sessions.length > 1 ? `Sesi ${index + 1}: ` : ''}{overnight.isSuspicious ? 'Durasi Tidak Wajar!' : 'Melewati Tengah Malam'}
                  </span>
                </div>
                {overnight.isSuspicious && (
                  <div style={{
                    fontSize: '11px',
                    color: '#f87171',
                    marginBottom: '8px',
                    padding: '6px 8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderRadius: '6px',
                    lineHeight: '1.5',
                  }}>
                    ⚠️ Durasi terhitung <strong>{overnight.totalStr}</strong> — kemungkinan waktu selesai salah input. Periksa kembali waktu mulai dan selesai.
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--dark-300)', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>📅 Hari ini ({session.start} → 00:00):</span>
                    <span style={{ fontWeight: '600', color: '#60a5fa' }}>{overnight.todayStr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>📅 Hari berikutnya (00:00 → {session.end}):</span>
                    <span style={{ fontWeight: '600', color: '#60a5fa' }}>{overnight.tomorrowStr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${dividerColor}`, paddingTop: '4px', marginTop: '4px' }}>
                    <span style={{ fontWeight: '600' }}>⏱️ Total:</span>
                    <span style={{ fontWeight: '700', color: accentColor }}>{overnight.totalStr}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add session button — hidden for wajib prayers */}
          {!isWajib && (
            <button
              className="add-session-btn"
              onClick={addSession}
            >
              <span style={{ fontSize: '16px' }}>+</span>
              Tambah Sesi
            </button>
          )}

          {/* Amanah description input */}
          {isAmanah && (
            <div style={{
              margin: '12px 0',
              padding: '12px',
              background: 'var(--dark-700)',
              borderRadius: '10px',
              border: '1px solid var(--dark-500)',
            }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--dark-200)',
                marginBottom: '6px',
                letterSpacing: '0.5px',
              }}>
                🎯 Deskripsi Tugas <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kolektor, Rekrut..."
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--dark-800)',
                  border: `1px solid ${!notes.trim() ? '#ef444480' : 'var(--dark-500)'}`,
                  borderRadius: '8px',
                  color: 'var(--dark-100)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {!notes.trim() && (
                <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>
                  Deskripsi wajib diisi untuk aktivitas Tugas
                </p>
              )}
            </div>
          )}

          <div className="time-modal-actions">
            {isEditing ? (
              <>
                <button
                  className="time-btn-undo"
                  onClick={handleUncomplete}
                >
                  ↩️ Batalkan
                </button>
                <button
                  className="time-btn-skip"
                  onClick={handleSkipTime}
                  style={{ flex: 1 }}
                >
                  Tutup
                </button>
                <button
                  className="time-btn-save"
                  onClick={handleSaveTime}
                  style={{ flex: 2 }}
                >
                  ✓ Simpan
                </button>
              </>
            ) : (
              <>
                <button
                  className="time-btn-skip"
                  onClick={handleSkipTime}
                  style={hasInput ? { background: 'var(--dark-600)', color: 'var(--dark-200)' } : {}}
                >
                  {hasInput ? 'Batal' : 'Lewati'}
                </button>
                <button
                  className="time-btn-save"
                  onClick={handleSaveTime}
                >
                  ✓ Simpan
                </button>
              </>
            )}
          </div>

          {/* Overnight Confirmation Modal */}
          {showOvernightConfirm && (
            <div style={{
              margin: '12px 0',
              padding: '14px',
              background: hasSuspiciousSession ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.12)',
              border: `1px solid ${hasSuspiciousSession ? 'rgba(239, 68, 68, 0.4)' : 'rgba(251, 191, 36, 0.35)'}`,
              borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>{hasSuspiciousSession ? '🛑' : '⚠️'}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: hasSuspiciousSession ? '#f87171' : '#fbbf24' }}>
                  {hasSuspiciousSession ? 'Periksa Waktu Input' : 'Konfirmasi Waktu'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--dark-300)', lineHeight: '1.6', marginBottom: '12px' }}>
                {hasSuspiciousSession
                  ? 'Waktu selesai lebih awal dari waktu mulai dan durasi terhitung sangat lama (lebih dari 12 jam). Kemungkinan besar ini adalah kesalahan input. Apakah Anda yakin ingin menyimpan?'
                  : 'Waktu selesai lebih awal dari waktu mulai. Aktivitas ini akan dihitung melewati tengah malam (jam 12 malam). Apakah Anda yakin?'
                }
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowOvernightConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: hasSuspiciousSession ? 'rgba(59, 130, 246, 0.2)' : 'var(--dark-600)',
                    color: hasSuspiciousSession ? '#60a5fa' : 'var(--dark-200)',
                    border: hasSuspiciousSession ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {hasSuspiciousSession ? '← Perbaiki Waktu' : 'Ubah Waktu'}
                </button>
                {!hasSuspiciousSession && (
                  <button
                    onClick={() => handleSaveTime(true)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ✓ Ya, Simpan
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .recorded-time {
          color: var(--emerald-400);
          font-weight: 500;
        }

        .time-modal {
          padding: 20px 24px 24px;
        }

        .time-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .time-modal-icon {
          font-size: 32px;
        }

        .time-modal-desc {
          font-size: 13px;
          color: var(--dark-400);
          margin-bottom: 20px;
        }

        .time-sessions-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 12px;
        }

        .time-session-row {
          background: var(--dark-800);
          border-radius: var(--radius-md);
          padding: 12px;
          border: 1px solid var(--dark-600);
        }

        .time-sessions-container > .time-session-row:only-child {
          background: transparent;
          border: none;
          padding: 0;
        }

        .session-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .session-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--emerald-400);
          background: rgba(16, 185, 129, 0.1);
          padding: 3px 10px;
          border-radius: var(--radius-full);
          letter-spacing: 0.3px;
        }

        .session-remove-btn {
          width: 24px;
          height: 24px;
          border-radius: var(--radius-full);
          border: none;
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .session-remove-btn:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        .time-inputs {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .time-input-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .time-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--dark-300);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .time-input {
          padding: 14px 16px;
          background: var(--dark-700);
          border: 2px solid var(--dark-600);
          border-radius: var(--radius-md);
          color: var(--dark-100);
          font-size: 18px;
          font-weight: 600;
          font-family: 'SF Mono', 'Monaco', monospace;
          text-align: center;
          transition: all 0.2s ease;
        }

        .time-input:focus {
          outline: none;
          border-color: var(--emerald-500);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .time-input::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
          cursor: pointer;
        }

        .time-separator {
          font-size: 20px;
          color: var(--dark-400);
          margin-top: 20px;
        }

        .add-session-btn {
          width: 100%;
          padding: 10px;
          background: transparent;
          border: 2px dashed var(--dark-500);
          border-radius: var(--radius-md);
          color: var(--dark-300);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
          margin-bottom: 20px;
        }

        .add-session-btn:hover {
          border-color: var(--emerald-500);
          color: var(--emerald-400);
          background: rgba(16, 185, 129, 0.05);
        }

        .time-modal-actions {
          display: flex;
          gap: 12px;
        }

        .time-btn-undo {
          flex: 1;
          padding: 14px;
          background: rgba(239, 68, 68, 0.12);
          border: none;
          border-radius: var(--radius-md);
          color: #f87171;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-btn-undo:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .time-btn-skip {
          flex: 1;
          padding: 14px;
          background: var(--dark-600);
          border: none;
          border-radius: var(--radius-md);
          color: var(--dark-200);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-btn-skip:hover {
          background: var(--dark-500);
        }

        .time-btn-save {
          flex: 2;
          padding: 14px;
          background: var(--primary-gradient);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-btn-save:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .time-btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
