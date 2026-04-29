import React, { useState, useEffect } from 'react';
import students from '../../api/api';
import './SystemNotificationBar.css';

export default function SystemNotificationBar() {
    const [notifications, setNotifications] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await students.get('system-notifications/');
                if (data && data.length > 0) {
                    setNotifications(data);
                    setVisible(true);
                }
            } catch (err) {
                console.error("Failed to fetch system notifications", err);
            }
        };
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (visible) {
            document.body.classList.add('has-notif-bar');
        } else {
            document.body.classList.remove('has-notif-bar');
        }
        return () => document.body.classList.remove('has-notif-bar');
    }, [visible]);

    useEffect(() => {
        if (notifications.length > 1) {
            const timer = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % notifications.length);
            }, 8000);
            return () => clearInterval(timer);
        }
    }, [notifications]);

    if (!visible || notifications.length === 0) return null;

    const current = notifications[currentIndex];

    return (
        <div className={`sys-notif-bar ${current.priority}`}>
            <div className="sys-notif-content">
                <span className="sys-notif-badge">
                    {current.priority === 'danger' ? '🚨 URGENT' : 
                     current.priority === 'warning' ? '⚠️ NOTICE' : 
                     current.priority === 'success' ? '✨ UPDATE' : 'ℹ️ INFO'}
                </span>
                <span className="sys-notif-title">{current.title}:</span>
                <span className="sys-notif-text">{current.content}</span>
            </div>
            <button className="sys-notif-close" onClick={() => setVisible(false)}>✕</button>
        </div>
    );
}
