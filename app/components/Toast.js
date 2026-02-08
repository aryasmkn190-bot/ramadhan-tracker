'use client';

import { useApp } from '../contexts/AppContext';

export default function Toast() {
    const { toasts } = useApp();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
