// ============================================================================
// Teacher Assistant — App.tsx
// Point d'entrée : Workspace → Router → Layout → Pages
// ============================================================================

import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import {
  AppProvider, useApp,
  WorkspaceProvider, useWorkspace,
  DataProvider,
  RouterProvider, useRouter, DEFAULT_PAGES,
} from './stores';
import type { TabId } from './stores';
import { AppHeader } from './components/layout/AppHeader';
import { AppLayout } from './components/layout/AppLayout';
import { AppSidebar } from './components/layout/AppSidebar';
import { Tabs, CommandPalette } from './components/ui';
import { ToastContainer } from './components/ui/Toast';
import { APP_TABS } from './constants/navigation';
import { WelcomePage } from './pages/WelcomePage';

// ── Page imports (static — pages légères ou très fréquentes) ──

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProgrammeOfficielPage } from './pages/programme/ProgrammeOfficielPage';
import { ProgressionAnnuellePage } from './pages/programme/ProgressionAnnuellePage';
import { TimelinePedagogiquePage } from './pages/programme/TimelinePedagogiquePage';
import { EmploiDuTempsPage } from './pages/planning/EmploiDuTempsPage';
import { CalendrierScolairePage } from './pages/planning/CalendrierScolairePage';
import { SequenceDetailPage } from './pages/preparation/SequenceDetailPage';
import { BibliothequePage } from './pages/preparation/BibliothequePage';
import { AIUsagePage } from './pages/preparation/AIUsagePage';
import { WorkflowGuidePage } from './pages/preparation/WorkflowGuidePage';
import { CahierDeTextesPage } from './pages/cahier/CahierDeTextesPage';
import { BilanDevoirPage } from './pages/evaluation/BilanDevoirPage';
import { RubricBankPage } from './pages/evaluation/RubricBankPage';
import { FeedbackVocalStudioPage } from './pages/evaluation/FeedbackVocalStudioPage';
import { ListeDevoirsPage } from './pages/evaluation/ListeDevoirsPage';
import { ListeElevesPage } from './pages/evaluation/ListeElevesPage';
import { ClassesPage } from './pages/classes/ClassesPage';

// ── Pages lazy-loaded (lourdes, accès secondaire) ──

const GenerateurIAPage = lazy(() => import('./pages/preparation/GenerateurIAPage').then(m => ({ default: m.GenerateurIAPage })));
const CorrectionSeriePage = lazy(() => import('./pages/evaluation/CorrectionSeriePage').then(m => ({ default: m.CorrectionSeriePage })));
const FicheElevePage = lazy(() => import('./pages/evaluation/FicheElevePage').then(m => ({ default: m.FicheElevePage })));
const BulletinsPage = lazy(() => import('./pages/evaluation/BulletinsPage').then(m => ({ default: m.BulletinsPage })));
const RechercheGlobalePage = lazy(() => import('./pages/search/RechercheGlobalePage').then(m => ({ default: m.RechercheGlobalePage })));
const ParametresPage = lazy(() => import('./pages/parametres/ParametresPage').then(m => ({ default: m.ParametresPage })));

const LazyFallback = () => <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>Chargement…</div>;

// ── Page resolver ──

function PageResolver() {
  const { route } = useRouter();

  // Dashboard — pas de sous-pages
  if (route.tab === 'dashboard') return <DashboardPage />;

  // Programme
  if (route.tab === 'programme') {
    switch (route.page) {
      case 'officiel':     return <ProgrammeOfficielPage />;
      case 'progression':  return <ProgressionAnnuellePage />;
      case 'timeline':     return <TimelinePedagogiquePage />;
      default:             return <ProgrammeOfficielPage />;
    }
  }

  // Préparation
  if (route.tab === 'preparation') {
    switch (route.page) {
      case 'sequences':
      case 'templates':     return <SequenceDetailPage />;
      case 'bibliotheque':  return <BibliothequePage />;
      case 'importer':      return <BibliothequePage />;
      case 'ia-generer':    return <GenerateurIAPage />;
      case 'ia-historique': return <GenerateurIAPage />;
      case 'ia-queue':      return <GenerateurIAPage />;
      case 'ia-couts':      return <AIUsagePage />;
      case 'workflow':      return <WorkflowGuidePage />;
      default:              return <SequenceDetailPage />;
    }
  }

  // Planning
  if (route.tab === 'planning') {
    switch (route.page) {
      case 'edt':
      case 'edt-import':   return <EmploiDuTempsPage />;
      case 'calendrier':   return <CalendrierScolairePage />;
      default:             return <EmploiDuTempsPage />;
    }
  }

  // Cahier de textes
  if (route.tab === 'cahier') {
    return <CahierDeTextesPage />;
  }

  // Classes
  if (route.tab === 'classes') {
    return <ClassesPage />;
  }

  // Évaluation
  if (route.tab === 'evaluation') {
    switch (route.page) {
      case 'devoirs':           return <ListeDevoirsPage />;
      case 'correction-serie':  return <CorrectionSeriePage />;
      case 'bilan':             return <BilanDevoirPage />;
      case 'rubrics':           return <RubricBankPage />;
      case 'feedback-vocal':    return <FeedbackVocalStudioPage />;
      case 'eleves':            return <ListeElevesPage />;
      case 'fiche-eleve':       return <FicheElevePage />;
      case 'bulletins':         return <BulletinsPage />;
      default:                  return <ListeDevoirsPage />;
    }
  }

  // Bibliothèque (propre tab)
  if (route.tab === 'bibliotheque') {
    return <BibliothequePage />;
  }

  // Paramètres
  if (route.tab === 'parametres') {
    return <ParametresPage />;
  }

  return <DashboardPage />;
}

// ── AppMain : layout complet ──

function computeInitials(name?: string | null): string | undefined {
  if (!name) return undefined;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && first && last) {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }
  if (parts.length === 1 && first && first.length >= 2) {
    return first.substring(0, 2).toUpperCase();
  }
  return undefined;
}

function AppMain() {
  const { activeTab, setActiveTab, toasts, dismissToast, unreadCount, isOnline } = useApp();
  const { closeCurrent, currentLabel } = useWorkspace();
  const { route, navigate } = useRouter();
  const [userInitials, setUserInitials] = useState<string | undefined>();

  useEffect(() => {
    import('./services').then(({ exportSettingsService }) =>
      exportSettingsService.get().then((s: any) => {
        const initials = computeInitials(s?.teacher_name);
        if (initials) setUserInitials(initials);
      })
    ).catch(() => {});
  }, []);

  // Sync tab change → router
  const handleTabChange = (tabId: string) => {
    const tab = tabId as TabId;
    setActiveTab(tab);
    navigate({ tab, page: DEFAULT_PAGES[tab] });
  };

  // Sync router tab → activeTab (only when router navigates directly)
  useEffect(() => {
    if (route.tab !== activeTab) {
      setActiveTab(route.tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.tab]);

  // Command palette (Ctrl+K)
  const [showPalette, setShowPalette] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePaletteNavigate = useCallback((tab: TabId, page: string, filter?: string, entityId?: number | string) => {
    setActiveTab(tab);
    navigate({ tab, page, filter, entityId });
    setShowSearch(false);
    setShowSettings(false);
  }, [setActiveTab, navigate]);

  const searchEntities = useCallback(async (query: string) => {
    const { searchService } = await import('./services');
    return searchService.search(query, 10);
  }, []);

  // Paramètres & recherche (pages spéciales hors tabs)
  const [showSettings, setShowSettings] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);

  const hasSidebar = activeTab !== 'dashboard' && !showSettings;

  return (
    <AppLayout
      header={
        <AppHeader
          notificationCount={unreadCount}
          isOnline={isOnline}
          userInitials={userInitials}
          onSearchClick={() => {
            setShowSearch(true); setShowSettings(false);
          }}
          onNotificationsClick={() => {}}
          onSettingsClick={() => {
            navigate({ tab: 'parametres', page: DEFAULT_PAGES['parametres'] });
            setActiveTab('parametres');
            setShowSearch(false); setShowSettings(false);
          }}
          onAIClick={() => {
            navigate({ tab: 'preparation', page: 'ia-generer' });
            setActiveTab('preparation');
            setShowSearch(false); setShowSettings(false);
          }}
          onLogoClick={() => {
            navigate({ tab: 'dashboard', page: 'default' });
            setActiveTab('dashboard');
            setShowSearch(false); setShowSettings(false);
          }}
          onSwitchDatabase={() => {
            if (window.confirm('Fermer la base actuelle et revenir à l\'accueil ?')) {
              closeCurrent();
            }
          }}
          workspaceLabel={currentLabel ?? undefined}
        />
      }
      tabs={
        <Tabs
          tabs={APP_TABS}
          activeTab={activeTab}
          onTabChange={(t) => { handleTabChange(t); setShowSearch(false); setShowSettings(false); }}
        />
      }
      sidebar={hasSidebar ? <AppSidebar tab={activeTab} /> : undefined}
      flush={showSettings}
    >
      <Suspense fallback={<LazyFallback />}>
        {showSettings ? (
          <ParametresPage />
        ) : showSearch ? (
          <RechercheGlobalePage
            initialQuery=""
            onClose={() => setShowSearch(false)}
          />
        ) : (
          <PageResolver />
        )}
      </Suspense>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        onNavigate={handlePaletteNavigate}
        searchEntities={searchEntities}
      />
    </AppLayout>
  );
}

// ── AppRouter : Welcome ou App selon workspace ──

function AppRouter() {
  const { status } = useWorkspace();

  if (status === 'loading' || status === 'welcome' || status === 'error') {
    return <WelcomePage />;
  }

  return (
    <AppProvider>
      <RouterProvider>
        <DataProvider>
          <AppMain />
        </DataProvider>
      </RouterProvider>
    </AppProvider>
  );
}

// ── Point d'entrée ──

export function App() {
  return (
    <WorkspaceProvider>
      <AppRouter />
    </WorkspaceProvider>
  );
}
