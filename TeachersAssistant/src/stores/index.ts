// ============================================================================
// Teacher Assistant — Stores barrel export
// ============================================================================

export { AppProvider, useApp } from './AppContext';
export type { TabId } from './AppContext';

export { WorkspaceProvider, useWorkspace } from './WorkspaceContext';

export { DataProvider, useData } from './DataProvider';
export type { DashboardIndicators, WeekSlot, CoverageItem, AlertItem } from './DataProvider';
export type { WeeklyPrepData, PrepTask } from '../services/dashboardService';

export { RouterProvider, useRouter, DEFAULT_PAGES } from './RouterContext';
export type { Route } from './RouterContext';
