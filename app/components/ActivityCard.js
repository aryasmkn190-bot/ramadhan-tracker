'use client';

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';

export default function ActivityCard({ activity }) {
    const { toggleActivity, getActivityTimeData, saveActivityTime, selectedRamadanDay, isSelectedDayToday } = useApp();
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Get saved time data for this activity
    const timeData = getActivityTimeData ? getActivityTimeData(activity.id) : null;

    const handleCardClick = (e) => {
        e.stopPropagation();

        // If completed, just toggle off
        if (activity.completed) {
            toggleActivity(activity.id);
            return;
        }

        // If not completed, show time input modal
        setStartTime(activity.time?.split?.(' - ')?.[0] || activity.time?.replace?.(/[^\d:]/g, '') || '');
        setEndTime('');
        setShowTimeModal(true);
    };

    const handleQuickComplete = (e) => {
        e.stopPropagation();
        toggleActivity(activity.id);
    };

    const handleSaveTime = () => {
        // Save the activity with time data
        toggleActivity(activity.id, startTime, endTime);
        setShowTimeModal(false);
        setStartTime('');
        setEndTime('');
    };

    const handleSkipTime = () => {
        // Complete without time data
        toggleActivity(activity.id);
        setShowTimeModal(false);
        setStartTime('');
        setEndTime('');
    };

    // Format display time
    const getDisplayTime = () => {
        if (timeData?.startTime && timeData?.endTime) {
            return `${timeData.startTime} - ${timeData.endTime}`;
        } else if (timeData?.startTime) {
            return timeData.startTime;
        }
        return activity.time;
    };

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
                        {activity.completed && timeData?.startTime ? (
                            <span className="recorded-time">
                                ⏱️ {getDisplayTime()}
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
                onClick={() => setShowTimeModal(false)}
            >
                <div className="modal-content time-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-handle"></div>

                    <div className="time-modal-header">
                        <span className="time-modal-icon">{activity.icon}</span>
                        <h2 className="modal-title">{activity.name}</h2>
                    </div>

                    <p className="time-modal-desc">
                        Catat waktu pelaksanaan untuk Hari {selectedRamadanDay}
                    </p>

                    <div className="time-inputs">
                        <div className="time-input-group">
                            <label className="time-label">Mulai</label>
                            <input
                                type="time"
                                className="time-input"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                placeholder="04:30"
                            />
                        </div>

                        <span className="time-separator">→</span>

                        <div className="time-input-group">
                            <label className="time-label">Selesai</label>
                            <input
                                type="time"
                                className="time-input"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                placeholder="05:00"
                            />
                        </div>
                    </div>

                    <div className="time-modal-actions">
                        <button
                            className="time-btn-skip"
                            onClick={handleSkipTime}
                        >
                            Lewati
                        </button>
                        <button
                            className="time-btn-save"
                            onClick={handleSaveTime}
                            disabled={!startTime}
                        >
                            ✓ Simpan
                        </button>
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
          margin-bottom: 24px;
        }

        .time-inputs {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
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

        .time-modal-actions {
          display: flex;
          gap: 12px;
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
