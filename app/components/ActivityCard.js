'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

export default function ActivityCard({ activity }) {
  const { toggleActivity, updateActivityTime, getActivityTimeData, selectedRamadanDay, isSelectedDayToday } = useApp();
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [sessions, setSessions] = useState([{ start: '', end: '' }]);
  const [isEditing, setIsEditing] = useState(false); // true when editing a completed activity

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
    } else {
      // New activity — set default
      const defaultStart = activity.time?.split?.(' - ')?.[0] || activity.time?.replace?.(/[^\d:]/g, '') || '';
      setSessions([{ start: defaultStart, end: '' }]);
    }
  }, [showTimeModal]);

  const handleCardClick = (e) => {
    e.stopPropagation();

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

  const handleSaveTime = () => {
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

    if (isEditing) {
      // Already completed — just update the time data
      updateActivityTime(activity.id, startTimeValue, endTimeValue);
    } else {
      // New completion
      if (validSessions.length === 0) {
        toggleActivity(activity.id);
      } else {
        toggleActivity(activity.id, startTimeValue, endTimeValue);
      }
    }

    setShowTimeModal(false);
    setSessions([{ start: '', end: '' }]);
    setIsEditing(false);
  };

  const handleSkipTime = () => {
    if (isEditing) {
      // Just close modal, don't change anything
      setShowTimeModal(false);
    } else {
      // Complete without time data
      toggleActivity(activity.id);
      setShowTimeModal(false);
    }
    setSessions([{ start: '', end: '' }]);
    setIsEditing(false);
  };

  const addSession = () => {
    setSessions(prev => [...prev, { start: '', end: '' }]);
  };

  const removeSession = (index) => {
    if (sessions.length <= 1) return;
    setSessions(prev => prev.filter((_, i) => i !== index));
  };

  const updateSession = (index, field, value) => {
    setSessions(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ));
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
          <div className="activity-name">{activity.name}</div>
          <div className="activity-time">
            {activity.completed && displaySessions.length > 0 ? (
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
                </div>
              </div>
            ))}
          </div>

          {/* Add session button */}
          <button
            className="add-session-btn"
            onClick={addSession}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            Tambah Sesi
          </button>

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
                >
                  Lewati
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
