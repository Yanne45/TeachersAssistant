import React from 'react';
import './AppHeader.css';

export interface AppHeaderProps {
  /** Nombre de notifications non lues */
  notificationCount?: number;
  /** Connecté au réseau */
  isOnline?: boolean;
  /** Initiales utilisateur */
  userInitials?: string;
  onSearchClick?: () => void;
  onAIClick?: () => void;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  notificationCount = 0,
  isOnline = true,
  userInitials = 'YD',
  onSearchClick,
  onAIClick,
  onNotificationsClick,
  onSettingsClick,
}) => (
  <header className="app-header">
    {/* Logo */}
    <div className="app-header__brand">
      <span className="app-header__logo">🎓</span>
      <span className="app-header__title">Teacher Assistant</span>
    </div>

    {/* Recherche */}
    <button className="app-header__search" onClick={onSearchClick} type="button">
      <span className="app-header__search-icon">🔍</span>
      <span className="app-header__search-placeholder">Rechercher...</span>
    </button>

    {/* Actions droite */}
    <div className="app-header__actions">
      {/* IA */}
      <button className="app-header__action" onClick={onAIClick} type="button" title="Générateur IA">
        <span>🤖</span>
        <span className="app-header__action-label">IA</span>
      </button>

      {/* Notifications */}
      <button className="app-header__action" onClick={onNotificationsClick} type="button" title="Notifications">
        <span>🔔</span>
        {notificationCount > 0 && (
          <span className="app-header__notif-badge">{notificationCount > 99 ? '99+' : notificationCount}</span>
        )}
      </button>

      {/* Connectivité */}
      <span
        className={`app-header__connectivity ${isOnline ? 'app-header__connectivity--online' : ''}`}
        title={isOnline ? 'Connecté' : 'Hors-ligne'}
      />

      {/* Paramètres */}
      <button className="app-header__action" onClick={onSettingsClick} type="button" title="Paramètres">
        <span>⚙️</span>
      </button>

      {/* Avatar */}
      <div className="app-header__avatar" title="Profil">
        {userInitials}
      </div>
    </div>
  </header>
);
