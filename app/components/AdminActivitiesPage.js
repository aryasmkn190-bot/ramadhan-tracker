'use client';

import { useState } from 'react';
import CustomActivitiesManager from './CustomActivitiesManager';
import CategoryManager from './CategoryManager';

const SECTIONS = [
    { id: 'categories', label: '🏷️ Kategori Aktivitas', component: CategoryManager },
    { id: 'activities', label: '📋 Daftar Aktivitas', component: CustomActivitiesManager },
];

export default function AdminActivitiesPage() {
    const [activeSection, setActiveSection] = useState('categories');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const currentSection = SECTIONS.find(s => s.id === activeSection);
    const ActiveComponent = currentSection?.component;

    return (
        <main className="main-content">
            {/* Section Dropdown */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'var(--dark-800)',
                        border: '1px solid var(--dark-600)',
                        borderRadius: dropdownOpen ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
                        color: 'var(--dark-100)',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <span>{currentSection?.label}</span>
                    <span style={{
                        fontSize: '12px',
                        color: 'var(--dark-400)',
                        transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                    }}>
                        ▼
                    </span>
                </button>

                {dropdownOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--dark-800)',
                        border: '1px solid var(--dark-600)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                        overflow: 'hidden',
                        zIndex: 50,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}>
                        {SECTIONS.map(section => (
                            <button
                                key={section.id}
                                onClick={() => {
                                    setActiveSection(section.id);
                                    setDropdownOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: activeSection === section.id
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : 'transparent',
                                    border: 'none',
                                    color: activeSection === section.id
                                        ? 'var(--emerald-400)'
                                        : 'var(--dark-300)',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    borderBottom: '1px solid var(--dark-700)',
                                }}
                            >
                                {section.label}
                                {activeSection === section.id && (
                                    <span style={{ float: 'right', color: 'var(--emerald-400)' }}>✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Section Content */}
            {ActiveComponent && <ActiveComponent />}
        </main>
    );
}
