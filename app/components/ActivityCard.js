'use client';

import { useApp } from '../contexts/AppContext';

export default function ActivityCard({ activity }) {
    const { toggleActivity } = useApp();

    return (
        <div
            className={`activity-card ripple ${activity.completed ? 'completed' : ''}`}
            onClick={() => toggleActivity(activity.id)}
        >
            <div className="activity-icon">
                {activity.icon}
            </div>
            <div className="activity-info">
                <div className="activity-name">{activity.name}</div>
                <div className="activity-time">{activity.time}</div>
            </div>
            <div className="activity-status">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        </div>
    );
}
