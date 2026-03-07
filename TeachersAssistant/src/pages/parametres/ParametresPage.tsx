// ============================================================================
// ParametresPage — Hub parametres avec sous-navigation interne
// ============================================================================

import React, { useState } from 'react';
import { Card } from '../../components/ui';
import { useApp } from '../../stores';
import { AITemplateEditorPage } from './AITemplateEditorPage';
import { AnneeSettings, MatieresSettings, ExportPDFSettings, CapacitesSettings } from './SettingsSubPages';
import './ParametresPage.css';

type SubPage = 'hub' | 'ia-templates' | 'interface' | 'annee' | 'matieres' | 'calendrier' | 'export-pdf' | 'capacites';

type ThemeValue = 'light' | 'dark';
type UIDensity = 'compact' | 'standard' | 'comfortable';

const SETTINGS_CARDS = [
  {
    icon: '📅', key: 'annee', title: 'Annee scolaire', description: '2025-2026 (active)',
    details: ['Debut : 1er septembre 2025', 'Fin : 4 juillet 2026', 'Nouvelle annee depuis existante'],
    navigateTo: 'annee' as SubPage,
  },
  {
    icon: '📚', key: 'matieres', title: 'Matieres & volumes', description: '3 matieres configurees',
    details: ['HG : 3h/sem.', 'HGGSP : 6h/sem.', 'Geo : 3h/sem.'],
    navigateTo: 'matieres' as SubPage,
  },
  {
    icon: '🗓', key: 'calendrier', title: 'Calendrier scolaire', description: 'Zone C - 30 sem. travaillees',
    details: ['5 periodes de vacances', '11 jours feries'],
    navigateTo: 'calendrier' as SubPage,
  },
  {
    icon: '🤖', key: 'ia', title: 'IA & generation', description: 'GPT-4o configure',
    details: ['17 taches IA configurees', 'Templates personnalisables', 'Parametres globaux'],
    navigateTo: 'ia-templates' as SubPage,
  },
  {
    icon: '🖨', key: 'export', title: 'Export PDF', description: 'Identite configuree',
    details: ['Lycee Victor Hugo', 'M. Durand - HGGSP'],
    navigateTo: 'export-pdf' as SubPage,
  },
  {
    icon: '💾', key: 'backup', title: 'Sauvegardes', description: "Derniere : aujourd'hui 08:00",
    details: ['Auto : quotidienne', 'Emplacement : Documents/TA-Backup'],
    // No sub-page — actions handled in hub
  },
  {
    icon: '🎨', key: 'interface', title: 'Interface', description: 'Theme clair - Standard',
    details: ['Taille : Standard (16px)', 'Theme : Clair / Sombre'],
    navigateTo: 'interface' as SubPage,
  },
  {
    icon: '🎯', key: 'capacites', title: 'Capacites', description: '24 capacites definies',
    details: ['12 specifiques exercice', '12 generales'],
    navigateTo: 'capacites' as SubPage,
  },
];

export const ParametresPage: React.FC = () => {
  const { addToast, theme, setTheme } = useApp();
  const [subPage, setSubPage] = useState<SubPage>('hub');
  const [uiDensity, setUiDensity] = useState<UIDensity>(
    () => (document.documentElement.getAttribute('data-ui') as UIDensity) || 'standard'
  );

  const handleExportZip = async () => {
    try {
      const { backupService2, downloadBlob } = await import('../../services');
      const blob = await backupService2.exportZip();
      downloadBlob(blob, 'teacher-assistant-backup-' + new Date().toISOString().slice(0, 10) + '.zip');
      addToast('success', 'Sauvegarde exportee');
    } catch (e) { addToast('error', "Erreur lors de l'export"); console.error(e); }
  };

  const handleImportZip = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const { backupService2 } = await import('../../services');
        const result = await backupService2.importZip(file);
        addToast('success', 'Restauration : ' + result.tables + ' tables, ' + result.rows + ' lignes');
      } catch (err) { addToast('error', 'Erreur lors de la restauration'); console.error(err); }
    };
    input.click();
  };

  // --- Sub-page: AI Template Editor ---
  if (subPage === 'ia-templates') {
    return (
      <div className="parametres-page">
        <SubPageBreadcrumb label="IA & generation" onBack={() => setSubPage('hub')} />
        <AITemplateEditorPage />
      </div>
    );
  }

  // --- Sub-pages using SettingsSubPages components ---
  const SUB_PAGE_MAP: Record<string, { label: string; component: React.ReactNode }> = {
    'annee': { label: 'Année scolaire', component: <AnneeSettings /> },
    'matieres': { label: 'Matières & volumes', component: <MatieresSettings /> },
    'calendrier': { label: 'Calendrier scolaire', component: <CalendrierRedirect onBack={() => setSubPage('hub')} /> },
    'export-pdf': { label: 'Export PDF', component: <ExportPDFSettings /> },
    'capacites': { label: 'Capacités', component: <CapacitesSettings /> },
  };

  const subPageInfo = SUB_PAGE_MAP[subPage];
  if (subPageInfo) {
    return (
      <div className="parametres-page">
        <SubPageBreadcrumb label={subPageInfo.label} onBack={() => setSubPage('hub')} />
        {subPageInfo.component}
      </div>
    );
  }

  // --- Sub-page: Interface (theme + density) ---
  if (subPage === 'interface') {
    const handleThemeChange = (t: ThemeValue) => {
      setTheme(t);
      addToast('success', `Theme ${t === 'dark' ? 'sombre' : 'clair'} active`);
    };

    const handleDensityChange = (d: UIDensity) => {
      setUiDensity(d);
      document.documentElement.setAttribute('data-ui', d);
      import('../../services').then(({ preferenceService }) => {
        preferenceService.set('ui_density', d);
      });
      addToast('success', `Densite : ${d}`);
    };

    return (
      <div className="parametres-page">
        <SubPageBreadcrumb label="Interface" onBack={() => setSubPage('hub')} />

        <div className="interface-settings">
          {/* Theme */}
          <Card className="interface-settings__card">
            <h3 className="interface-settings__section-title">Theme</h3>
            <p className="interface-settings__section-desc">
              Choisissez entre le mode clair et le mode sombre.
            </p>
            <div className="interface-settings__toggle-group">
              <button
                className={`interface-settings__toggle-btn ${theme === 'light' ? 'interface-settings__toggle-btn--active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <span className="interface-settings__toggle-icon">☀️</span>
                <span>Clair</span>
              </button>
              <button
                className={`interface-settings__toggle-btn ${theme === 'dark' ? 'interface-settings__toggle-btn--active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <span className="interface-settings__toggle-icon">🌙</span>
                <span>Sombre</span>
              </button>
            </div>
          </Card>

          {/* UI Density */}
          <Card className="interface-settings__card">
            <h3 className="interface-settings__section-title">Densite de l'interface</h3>
            <p className="interface-settings__section-desc">
              Ajuste la taille du texte et l'espacement general.
            </p>
            <div className="interface-settings__toggle-group">
              {([
                { value: 'compact' as UIDensity, label: 'Compact', desc: '15px' },
                { value: 'standard' as UIDensity, label: 'Standard', desc: '16px' },
                { value: 'comfortable' as UIDensity, label: 'Confort', desc: '17px' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  className={`interface-settings__toggle-btn ${uiDensity === opt.value ? 'interface-settings__toggle-btn--active' : ''}`}
                  onClick={() => handleDensityChange(opt.value)}
                >
                  <span>{opt.label}</span>
                  <span className="interface-settings__toggle-detail">{opt.desc}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- Hub ---
  return (
    <div className="parametres-page">
      <h1 className="parametres-page__title">Parametres</h1>

      <div className="parametres-page__grid">
        {SETTINGS_CARDS.map((card) => (
          <Card
            key={card.key}
            onClick={() => {
              if (card.navigateTo) setSubPage(card.navigateTo);
              else console.log('Navigate to:', card.title);
            }}
            className="param-card"
          >
            <div className="param-card__header">
              <span className="param-card__icon">{card.icon}</span>
              <div className="param-card__text">
                <span className="param-card__title">{card.title}</span>
                <span className="param-card__desc">{card.description}</span>
              </div>
            </div>
            <ul className="param-card__details">
              {card.details.map((d, j) => (
                <li key={j}>{d}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="parametres-page__actions">
        <button className="parametres-page__action-btn" onClick={handleExportZip}>
          💾 Exporter sauvegarde ZIP
        </button>
        <button className="parametres-page__action-btn" onClick={handleImportZip}>
          📥 Restaurer depuis ZIP
        </button>
      </div>
    </div>
  );
};

// --- Helper components ---

const SubPageBreadcrumb: React.FC<{ label: string; onBack: () => void }> = ({ label, onBack }) => (
  <div className="parametres-page__breadcrumb">
    <button className="parametres-page__back" onClick={onBack}>← Parametres</button>
    <span className="parametres-page__breadcrumb-sep">/</span>
    <span className="parametres-page__breadcrumb-current">{label}</span>
  </div>
);

/** Calendrier redirects to the Planning tab's calendar page */
const CalendrierRedirect: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Calendrier scolaire</h3>
        <p className="settings-sub__desc">
          Le calendrier scolaire se configure directement dans l'onglet Planning → Calendrier scolaire.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" size="S" onClick={() => {
            // Navigate to Planning tab
            import('../../stores').then(({ useRouter }) => {
              // Best effort — if router not available, just go back
              onBack();
            });
          }}>
            Aller au calendrier
          </Button>
          <Button variant="secondary" size="S" onClick={onBack}>Retour</Button>
        </div>
      </Card>
    </div>
  );
};
