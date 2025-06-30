import React, { useState } from 'react';

const AuthModal = ({ isOpen, admins, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Проверяем учетные данные
    const admin = admins.find(admin => 
      admin.name === name && admin.password === password
    );
    
    if (admin) {
      onSuccess();
      onClose();
      setName('');
      setPassword('');
      setError('');
    } else {
      setError('Неверные имя пользователя или пароль');
    }
  };

  const handleClose = () => {
    onClose();
    setName('');
    setPassword('');
    setError('');
  };

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <h2>🔒 Вход администратора</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-content">
            <p>Введите имя и пароль администратора для разблокировки редактирования:</p>
            
            <input 
              type="text"
              placeholder="Имя администратора"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            
            <input 
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {error && (
              <div className="auth-error">
                ❌ {error}
              </div>
            )}
          </div>
          
          <div className="auth-footer">
            <button type="button" className="btn btn-cancel" onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;