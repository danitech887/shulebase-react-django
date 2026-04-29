import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import students from '../../api/api'; 

import '../Account/ChangeUsernamePassword.css'

const ChangeUsernamePassword = () => {
    const { user, setUser } = useContext(AuthContext);

    // State for password change
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    // State for username change
    const [newUsername, setNewUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [usernameMessage, setUsernameMessage] = useState({ text: '', type: '' });
    const [isUsernameLoading, setIsUsernameLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setIsPasswordLoading(true);
        setPasswordMessage({ text: '', type: '' });

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ text: 'New passwords do not match.', type: 'error' });
            setIsPasswordLoading(false);
            return;
        }

        try {
            const response = await students.post('auth/change-password/', {
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setPasswordMessage({ text: response.data.message, type: 'success' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'An error occurred while changing password.';
            setPasswordMessage({ text: errorMsg, type: 'error' });
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleUsernameChange = async (e) => {
        e.preventDefault();
        setIsUsernameLoading(true);
        setUsernameMessage({ text: '', type: '' });

        try {
            const response = await students.post('auth/change-username/', {
                new_username: newUsername,
                password: currentPassword,
            });
            setUsernameMessage({ text: response.data.message, type: 'success' });
            
            // Update user in context and local storage
            if (setUser) {
                setUser(response.data.user);
            }

            setNewUsername('');
            setCurrentPassword('');
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'An error occurred while changing username.';
            setUsernameMessage({ text: errorMsg, type: 'error' });
        } finally {
            setIsUsernameLoading(false);
        }
    };

    const canChangeUsername = user && user.role.toLowerCase() !== 'student' && user.role.toLowerCase() !== 'parent';

    return (
        <div className="account-settings-container">
            <h2>Account Security</h2>

            <div className="settings-card">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordChange} className="settings-form">
                    <div className="form-group">
                        <label htmlFor="oldPassword">Old Password</label>
                        <input type="password" id="oldPassword" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-submit" disabled={isPasswordLoading}>
                        {isPasswordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                    {passwordMessage.text && (
                        <p className={`message ${passwordMessage.type}`}>{passwordMessage.text}</p>
                    )}
                </form>
            </div>

            {canChangeUsername && (
                <div className="settings-card">
                    <h3>Change Username</h3>
                    <p className="form-hint">Your current username is: <strong>{user.username}</strong></p>
                    <form onSubmit={handleUsernameChange} className="settings-form">
                        <div className="form-group">
                            <label htmlFor="newUsername">New Username</label>
                            <input type="text" id="newUsername" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="currentPassword">Confirm with Current Password</label>
                            <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn-submit" disabled={isUsernameLoading}>
                            {isUsernameLoading ? 'Updating...' : 'Update Username'}
                        </button>
                        {usernameMessage.text && (
                            <p className={`message ${usernameMessage.type}`}>{usernameMessage.text}</p>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChangeUsernamePassword;