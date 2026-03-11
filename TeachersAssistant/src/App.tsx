// ============================================================================
// Teacher Assistant — App.tsx
// Point d'entrée : Workspace → Router → Layout → Pages
// ============================================================================

import React, { useEffect } from 'react';
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
import { Tabs } from './components/ui';
import { ToastContainer } from './components/ui/Toast';
import { APP_TABS } from './constants/navigation';
import { WelcomePage } from './pages/WelcomePage';

// ── Page imports ──

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProgrammeOfficielPage } from './pages/programme/ProgrammeOfficielPage';
import { ProgressionAnnuellePage } from './pages/programme/ProgressionAnnuellePage';
import { EmploiDuTempsPage } from './pages/planning/EmploiDuTempsPage';
import { CalendrierScolairePage } from './pages/planning/CalendrierScolairePage';
import { SequenceDetailPage } from './pages/preparation/SequenceDetailPage';
import { BibliothequePage } from './pages/preparation/BibliothequePage';
import { GenerateurIAPage } from './pages/preparation/GenerateurIAPage';
import { CahierDeTextesPage } from './pages/cahier/CahierDeTextesPage';
import { CorrectionSeriePage } from './pages/evaluation/CorrectionSeriePage';
import { BilanDevoirPage } from './pages/evaluation/BilanDevoirPage';
import { FicheElevePage } from './pages/evaluation/FicheElevePage';
import { ListeDevoirsPage } from './pages/evaluation/ListeDevoirsPage';
import { ListeElevesPage } from './pages/evaluation/ListeElevesPage';
import { BulletinsPage } from './pages/evaluation/BulletinsPage';
import { ClassesPage } from './pages/classes/ClassesPage';
import { RechercheGlobalePage } from './pages/search/RechercheGlobalePage';
import { ParametresPage } from './pages/parametres/ParametresPage';

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
      case 'eleves':            return <ListeElevesPage />;
      case 'fiche-eleve':       return <FicheElevePage />;
      case 'bulletins':         return <BulletinsPage />;
      default:                  return <ListeDevoirsPage />;
    }
  }

  return <DashboardPage />;
}

// ── AppMain : layout complet ──

function AppMain() {
  const { activeTab, setActiveTab, toasts, dismissToast, unreadCount, isOnline } = useApp();
  const { closeCurrent, currentLabel } = useWorkspace();
  const { route, navigate } = useRouter();

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

  // Paramètres & recherche (pages spéciales hors tabs)
  const [showSettings, setShowSettings] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);

  const hasSidebar = activeTab !== 'dashboard';

  return (
    <AppLayout
      header={
        <AppHeader
          notificationCount={unreadCount}
          isOnline={isOnline}
          userInitials="YD"
          onSearchClick={() => {
            setShowSearch(true); setShowSettings(false);
          }}
          onNotificationsClick={() => {}}
          onSettingsClick={() => { setShowSettings(prev => !prev); setShowSearch(false); }}
          onAIClick={() => {
            navigate({ tab: 'preparation', page: 'ia-generer' });
            setActiveTab('preparation');
            setShowSearch(false); setShowSettings(false);
          }}
          onLogoClick={closeCurrent}
          onSwitchDatabase={closeCurrent}
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
    >
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
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
