// ============================================================================
// Teacher Assistant — WelcomePage (écran d'accueil multi-bases)
// ============================================================================

import React from 'react';
import { useWorkspace } from '../stores/WorkspaceContext';
import './WelcomePage.css';

export const WelcomePage: React.FC = () => {
  const { recents, openFile, openPicker, createNew, removeRecent, error, status } = useWorkspace();

  return (
    <div className="welcome">
      <div className="welcome__container">
        {/* Logo */}
        <div className="welcome__header">
          <span className="welcome__logo">🎓</span>
          <h1 className="welcome__title">Teacher Assistant</h1>
          <p className="welcome__subtitle">Pilotage pédagogique pour le secondaire</p>
        </div>

        {/* Erreur éventuelle */}
        {error && (
          <div className="welcome__error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="welcome__loading">
            <div className="welcome__spinner" />
            <span>Ouverture en cours…</span>
          </div>
        )}

        {/* Actions principales */}
        {status !== 'loading' && (
          <>
            <div className="welcome__actions">
              <button className="welcome__btn welcome__btn--primary" onClick={createNew}>
                <span className="welcome__btn-icon">✨</span>
                <div className="welcome__btn-text">
                  <span className="welcome__btn-label">Créer une nouvelle base</span>
                  <span className="welcome__btn-desc">Démarrer un nouvel espace de travail</span>
                </div>
              </button>

              <button className="welcome__btn welcome__btn--secondary" onClick={openPicker}>
                <span className="welcome__btn-icon">📂</span>
                <div className="welcome__btn-text">
                  <span className="welcome__btn-label">Ouvrir un fichier</span>
                  <span className="welcome__btn-desc">Sélectionner un fichier .ta existant</span>
                </div>
              </button>
            </div>

            {/* Accès rapide — 3 dernières bases */}
            {recents.length > 0 && (
              <div className="welcome__quick-access">
                <h2 className="welcome__quick-title">Accès rapide</h2>
                <div className="welcome__quick-list">
                  {recents.slice(0, 3).map(entry => (
                    <button
                      key={entry.path}
                      className="welcome__quick-item"
                      onClick={() => openFile(entry.path, entry.label)}
                    >
                      <span className="welcome__quick-icon">📄</span>
                      <span className="welcome__quick-label">{entry.label}</span>
                      <span className="welcome__quick-date">
                        {new Date(entry.lastOpenedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Liste complète des récents */}
            {recents.length > 3 && (
              <div className="welcome__recents">
                <h2 className="welcome__recents-title">Autres bases récentes</h2>
                <div className="welcome__recents-list">
                  {recents.slice(3).map(entry => (
                    <div
                      key={entry.path}
                      className="welcome__recent-item"
                      onClick={() => openFile(entry.path, entry.label)}
                    >
                      <span className="welcome__recent-icon">📄</span>
                      <div className="welcome__recent-info">
                        <span className="welcome__recent-label">{entry.label}</span>
                        <span className="welcome__recent-path">{entry.path}</span>
                        <span className="welcome__recent-date">
                          Ouvert le {new Date(entry.lastOpenedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </span>
                      </div>
                      <button
                        className="welcome__recent-remove"
                        title="Retirer des récents"
                        onClick={(e) => { e.stopPropagation(); removeRecent(entry.path); }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aucun récent */}
            {recents.length === 0 && (
              <div className="welcome__empty">
                <p>Aucune base récente. Créez-en une ou ouvrez un fichier existant.</p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="welcome__footer">
          <span>Teacher Assistant v0.1.0</span>
          <span>·</span>
          <span>Fichiers .ta (SQLite)</span>
        </div>
      </div>
    </div>
  );
};
