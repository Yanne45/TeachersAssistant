import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { backupService2, downloadBlob, preferenceService } from '../../services';
import { useApp, useRouter } from '../../stores';
import { AITemplateEditorPage } from './AITemplateEditorPage';
import { AnneeSettings, MatieresSettings, ExportPDFSettings, CapacitesSettings, PeriodesNotationSettings } from './SettingsSubPages';
import './ParametresPage.css';

type SubPage = 'hub' | 'ia-templates' | 'interface' | 'annee' | 'matieres' | 'calendrier' | 'export-pdf' | 'capacites' | 'periodes-notation';

type ThemeValue = 'light' | 'dark';
type UIDensity = 'compact' | 'standard' | 'comfortable';

const SETTINGS_CARDS = [
  {
    icon: '📘', key: 'annee', title: 'Année scolaire', description: '2025-2026 (active)',
    details: ['Début : 1er septembre 2025', 'Fin : 4 juillet 2026', 'Nouvelle année depuis existante'],
    navigateTo: 'annee' as SubPage,
  },
  {
    icon: '📚', key: 'matieres', title: 'Matières & volumes', description: '3 matières configurées',
    details: ['HG : 3h/sem.', 'HGGSP : 6h/sem.', 'Geo : 3h/sem.'],
    navigateTo: 'matieres' as SubPage,
  },
  {
    icon: '🗓️', key: 'calendrier', title: 'Calendrier scolaire', description: 'Zone C - 30 sem. travaillées',
    details: ['5 périodes de vacances', '11 jours fériés'],
    navigateTo: 'calendrier' as SubPage,
  },
  {
    icon: '🤖', key: 'ia', title: 'IA & génération', description: 'GPT-4o configuré',
    details: ['17 tâches IA configurées', 'Templates personnalisables', 'Paramètres globaux'],
    navigateTo: 'ia-templates' as SubPage,
  },
  {
    icon: '📄', key: 'export', title: 'Export PDF', description: 'Identité configurée',
    details: ['Lycée Victor Hugo', 'M. Durand - HGGSP'],
    navigateTo: 'export-pdf' as SubPage,
  },
  {
    icon: '💾', key: 'backup', title: 'Sauvegardes', description: "Dernière : aujourd'hui 08:00",
    details: ['Auto : quotidienne', 'Emplacement : Documents/TA-Backup'],
  },
  {
    icon: '🎨', key: 'interface', title: 'Interface', description: 'Thème clair - Standard',
    details: ['Taille : Standard (16px)', 'Thème : Clair / Sombre'],
    navigateTo: 'interface' as SubPage,
  },
  {
    icon: '🎯', key: 'capacites', title: 'Capacités', description: '24 capacités définies',
    details: ['12 spécifiques exercice', '12 générales'],
    navigateTo: 'capacites' as SubPage,
  },
  {
    icon: '📊', key: 'periodes-notation', title: 'Périodes de notation', description: 'Trimestres, semestres ou personnalisé',
    details: ['Périodes librement définies', 'Bulletins par période', 'Exportables en PDF'],
    navigateTo: 'periodes-notation' as SubPage,
  },
];

export const ParametresPage: React.FC = () => {
  const { addToast, theme, setTheme } = useApp();
  const { navigate } = useRouter();
  const [subPage, setSubPage] = useState<SubPage>('hub');
  const [uiDensity, setUiDensity] = useState<UIDensity>(
    () => (document.documentElement.getAttribute('data-ui') as UIDensity) || 'standard'
  );

  const handleExportZip = async () => {
    try {
      const blob = await backupService2.exportZip();
      downloadBlob(blob, 'teacher-assistant-backup-' + new Date().toISOString().slice(0, 10) + '.zip');
      addToast('success', 'Sauvegarde exportée');
    } catch (e) {
      addToast('error', "Erreur lors de l'export");
      console.error(e);
    }
  };

  const handleImportZip = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const result = await backupService2.importZip(file);
        addToast('success', 'Restauration : ' + result.tables + ' tables, ' + result.rows + ' lignes');
      } catch (err) {
        addToast('error', 'Erreur lors de la restauration');
        console.error(err);
      }
    };
    input.click();
  };

  if (subPage === 'ia-templates') {
    return (
      <div className="parametres-page">
        <SubPageBreadcrumb label="IA & génération" onBack={() => setSubPage('hub')} />
        <AITemplateEditorPage />
      </div>
    );
  }

  const SUB_PAGE_MAP: Record<string, { label: string; component: React.ReactNode }> = {
    annee: { label: 'Année scolaire', component: <AnneeSettings /> },
    matieres: { label: 'Matières & volumes', component: <MatieresSettings /> },
    calendrier: {
      label: 'Calendrier scolaire',
      component: (
        <CalendrierRedirect
          onBack={() => setSubPage('hub')}
          onGo={() => {
            navigate({ tab: 'planning', page: 'calendrier' });
            setSubPage('hub');
          }}
        />
      ),
    },
    'export-pdf': { label: 'Export PDF', component: <ExportPDFSettings /> },
    capacites: { label: 'Capacités', component: <CapacitesSettings /> },
    'periodes-notation': { label: 'Périodes de notation', component: <PeriodesNotationSettings /> },
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

  if (subPage === 'interface') {
    const handleThemeChange = (t: ThemeValue) => {
      setTheme(t);
      addToast('success', `Thème ${t === 'dark' ? 'sombre' : 'clair'} activé`);
    };

    const handleDensityChange = (d: UIDensity) => {
      setUiDensity(d);
      document.documentElement.setAttribute('data-ui', d);
      preferenceService.set('ui_density', d);
      addToast('success', `Densité : ${d}`);
    };

    return (
      <div className="parametres-page">
        <SubPageBreadcrumb label="Interface" onBack={() => setSubPage('hub')} />

        <div className="interface-settings">
          <Card className="interface-settings__card">
            <h3 className="interface-settings__section-title">Thème</h3>
            <p className="interface-settings__section-desc">Choisissez entre le mode clair et le mode sombre.</p>
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

          <Card className="interface-settings__card">
            <h3 className="interface-settings__section-title">Densité de l'interface</h3>
            <p className="interface-settings__section-desc">Ajuste la taille du texte et l'espacement général.</p>
            <div className="interface-settings__toggle-group">
              {[
                { value: 'compact' as UIDensity, label: 'Compact', desc: '15px' },
                { value: 'standard' as UIDensity, label: 'Standard', desc: '16px' },
                { value: 'comfortable' as UIDensity, label: 'Confort', desc: '17px' },
              ].map((opt) => (
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

  return (
    <div className="parametres-page">
      <h1 className="parametres-page__title">Paramètres</h1>

      <div className="parametres-page__grid">
        {SETTINGS_CARDS.map((card) => (
          <Card
            key={card.key}
            onClick={() => {
              if (card.navigateTo) setSubPage(card.navigateTo);
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
        <button className="parametres-page__action-btn" onClick={handleExportZip}>📦 Exporter sauvegarde ZIP</button>
        <button className="parametres-page__action-btn" onClick={handleImportZip}>📥 Restaurer depuis ZIP</button>
      </div>
    </div>
  );
};

const SubPageBreadcrumb: React.FC<{ label: string; onBack: () => void }> = ({ label, onBack }) => (
  <div className="parametres-page__breadcrumb">
    <button className="parametres-page__back" onClick={onBack}>← Paramètres</button>
    <span className="parametres-page__breadcrumb-sep">/</span>
    <span className="parametres-page__breadcrumb-current">{label}</span>
  </div>
);

const CalendrierRedirect: React.FC<{ onBack: () => void; onGo: () => void }> = ({ onBack, onGo }) => {
  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Calendrier scolaire</h3>
        <p className="settings-sub__desc">
          Le calendrier scolaire se configure directement dans l'onglet Planning {'>'} Calendrier scolaire.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" size="S" onClick={onGo}>Aller au calendrier</Button>
          <Button variant="secondary" size="S" onClick={onBack}>Retour</Button>
        </div>
      </Card>
    </div>
  );
};
