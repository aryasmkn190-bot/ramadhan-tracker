'use client';

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';

export default function DaySelector() {
  const {
    currentRamadanDay,
    selectedRamadanDay,
    isSelectedDayToday,
    goToPreviousDay,
    goToNextDay,
    goToDay,
    goToToday,
    activities,
    getDateForRamadanDay,
    DEFAULT_PRAYERS,
  } = useApp();

  const [showDayPicker, setShowDayPicker] = useState(false);

  // Check if a day has any completed activities
  const getDayStatus = (day) => {
    const dateStr = getDateForRamadanDay(day);
    const dayData = activities[dateStr] || {};
    const completedCount = Object.values(dayData).filter(Boolean).length;
    const wajibCompleted = DEFAULT_PRAYERS.every(p => dayData[p.id]);

    if (completedCount === 0) return 'empty';
    if (wajibCompleted) return 'complete';
    return 'partial';
  };

  // Generate array of all 30 days
  const availableDays = Array.from({ length: 30 }, (_, i) => i + 1);

  const isRamadanStarted = currentRamadanDay >= 1;

  return (
    <>
      {/* Day Navigator */}
      <div className="day-selector">
        <button
          className="day-nav-btn"
          onClick={goToPreviousDay}
          disabled={selectedRamadanDay <= 1}
          aria-label="Previous day"
        >
          ‹
        </button>

        <button
          className="day-display"
          onClick={() => setShowDayPicker(true)}
        >
          <div className="day-display-content">
            <span className="day-number">Hari {selectedRamadanDay}</span>
            <span className="day-label">
              {isSelectedDayToday && isRamadanStarted ? '(Hari Ini)' : getDateForRamadanDay(selectedRamadanDay)}
            </span>
          </div>
          <span className="day-dropdown-icon">▼</span>
        </button>

        <button
          className="day-nav-btn"
          onClick={goToNextDay}
          disabled={selectedRamadanDay >= 30}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Not Today Banner */}
      {!isSelectedDayToday && (
        <div className="past-day-banner">
          <div className="past-day-info">
            <span className="past-day-icon">📅</span>
            <span>Mengisi aktivitas untuk <strong>Hari {selectedRamadanDay}</strong></span>
          </div>
          <button className="past-day-today-btn" onClick={goToToday}>
            Ke Hari Ini
          </button>
        </div>
      )}

      {/* Day Picker Modal */}
      <div
        className={`modal-overlay ${showDayPicker ? 'active' : ''}`}
        onClick={() => setShowDayPicker(false)}
      >
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-handle"></div>
          <div className="modal-header">
            <h2 className="modal-title">Pilih Hari Ramadhan</h2>
            <button
              className="modal-close"
              onClick={() => setShowDayPicker(false)}
            >
              ×
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--dark-400)', marginBottom: '16px' }}>
            Kamu bisa mengisi aktivitas untuk hari-hari sebelumnya yang terlewat
          </p>

          <div className="day-picker-grid">
            {availableDays.map(day => {
              const status = getDayStatus(day);
              const isSelected = day === selectedRamadanDay;
              const isToday = day === currentRamadanDay;

              return (
                <button
                  key={day}
                  className={`day-picker-item ${isSelected ? 'selected' : ''} ${status}`}
                  onClick={() => {
                    goToDay(day);
                    setShowDayPicker(false);
                  }}
                >
                  <span className="day-picker-number">{day}</span>
                  {isToday && <span className="day-picker-today">Hari Ini</span>}
                  {!isToday && status === 'complete' && <span className="day-picker-status">✓</span>}
                  {!isToday && status === 'partial' && <span className="day-picker-status partial">◐</span>}
                  {!isToday && status === 'empty' && <span className="day-picker-status empty">○</span>}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="day-picker-legend">
            <div className="legend-item">
              <span className="legend-dot complete"></span>
              <span>Lengkap</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot partial"></span>
              <span>Sebagian</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot empty"></span>
              <span>Kosong</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .day-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 8px 0;
        }

        .day-nav-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          background: var(--dark-700);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--dark-200);
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .day-nav-btn:hover:not(:disabled) {
          background: var(--dark-600);
          color: white;
        }

        .day-nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .day-display {
          flex: 1;
          max-width: 200px;
          padding: 10px 16px;
          background: var(--primary-gradient);
          border: none;
          border-radius: var(--radius-lg);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-glow);
        }

        .day-display:hover {
          transform: scale(1.02);
        }

        .day-display-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .day-number {
          font-size: 16px;
          font-weight: 700;
        }

        .day-label {
          font-size: 11px;
          opacity: 0.8;
        }

        .day-dropdown-icon {
          font-size: 10px;
          opacity: 0.7;
        }

        .past-day-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: var(--radius-md);
          margin-bottom: 16px;
        }

        .past-day-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--gold-400);
        }

        .past-day-icon {
          font-size: 16px;
        }

        .past-day-today-btn {
          padding: 6px 12px;
          background: var(--gold-gradient);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--dark-900);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .day-picker-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .day-picker-item {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 8px;
          background: var(--dark-700);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .day-picker-item:hover {
          background: var(--dark-600);
        }

        .day-picker-item.selected {
          border-color: var(--emerald-500);
          background: rgba(16, 185, 129, 0.15);
        }

        .day-picker-item.complete {
          border-color: rgba(34, 197, 94, 0.5);
        }

        .day-picker-item.partial {
          border-color: rgba(251, 191, 36, 0.5);
        }

        .day-picker-number {
          font-size: 16px;
          font-weight: 700;
          color: var(--dark-100);
        }

        .day-picker-today {
          font-size: 8px;
          color: var(--emerald-400);
          font-weight: 600;
        }

        .day-picker-status {
          font-size: 10px;
          color: var(--success);
        }

        .day-picker-status.partial {
          color: var(--gold-400);
        }

        .day-picker-status.empty {
          color: var(--dark-400);
        }

        .day-picker-legend {
          display: flex;
          justify-content: center;
          gap: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--dark-600);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--dark-400);
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid;
        }

        .legend-dot.complete {
          border-color: var(--success);
          background: rgba(34, 197, 94, 0.3);
        }

        .legend-dot.partial {
          border-color: var(--gold-400);
          background: rgba(251, 191, 36, 0.3);
        }

        .legend-dot.empty {
          border-color: var(--dark-500);
          background: transparent;
        }
      `}</style>
    </>
  );
}
