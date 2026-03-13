import React from 'react';
import './AppHeader.css';

export interface AppHeaderProps {
  /** Nombre de notifications non lues */
  notificationCount?: number;
  /** Connecté au réseau */
  isOnline?: boolean;
  /** Initiales utilisateur */
  userInitials?: string;
  /** Nom de la base / workspace affichée */
  workspaceLabel?: string;
  onSearchClick?: () => void;
  onAIClick?: () => void;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  /** Clic sur le logo → retour écran d'accueil */
  onLogoClick?: () => void;
  /** Clic sur l'icône base → changer de base */
  onSwitchDatabase?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  notificationCount = 0,
  isOnline = true,
  userInitials = 'TA',
  workspaceLabel,
  onSearchClick,
  onAIClick,
  onNotificationsClick,
  onSettingsClick,
  onLogoClick,
  onSwitchDatabase,
}) => (
  <header className="app-header">
    {/* Logo — cliquable pour retour dashboard */}
    <button
      className="app-header__brand"
      onClick={onLogoClick}
      type="button"
      title="Retour au tableau de bord"
      aria-label="Retour au tableau de bord"
    >
      <span className="app-header__logo">🎓</span>
      <span className="app-header__title">Teacher Assistant</span>
      {workspaceLabel && (
        <span className="app-header__workspace-label">— {workspaceLabel}</span>
      )}
    </button>

    {/* Recherche */}
    <button className="app-header__search" onClick={onSearchClick} type="button">
      <span className="app-header__search-icon">🔍</span>
      <span className="app-header__search-placeholder">Rechercher...</span>
    </button>

    {/* Actions droite */}
    <div className="app-header__actions">
      {/* Changer de base */}
      {onSwitchDatabase && (
        <button className="app-header__action" onClick={onSwitchDatabase} type="button" title="Changer de base">
          <span>📁</span>
        </button>
      )}

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
