// ============================================================================
// AIUsagePage — Tableau de bord consommation & coûts IA
// Données depuis ai_generations (tokens_input / tokens_output / model)
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { Card, Badge } from '../../components/ui';
import { aiUsageService, estimateCost, MODEL_PRICING } from '../../services';
import type { UsageByModel, UsageByCategory, UsageByMonth, RecentGenUsage } from '../../services';
import './AIUsagePage.css';

const CATEGORY_LABELS: Record<string, string> = {
  contenus: 'Contenus', evaluations: 'Évaluations',
  planification: 'Planification', correction: 'Correction', systeme: 'Système',
};

const CATEGORY_COLORS: Record<string, string> = {
  contenus: 'var(--color-primary)', evaluations: 'var(--color-accent)',
  planification: 'var(--color-success)', correction: 'var(--color-warn)', systeme: 'var(--color-text-muted)',
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function fmtCost(usd: number): string {
  if (usd < 0.001) return '< $0.001';
  if (usd < 1) return '$' + usd.toFixed(4);
  return '$' + usd.toFixed(2);
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const idx = parseInt(m ?? '1') - 1;
  return (months[idx] ?? m ?? '') + ' ' + (y ?? '');
}

export const AIUsagePage: React.FC = () => {
  const [byModel, setByModel] = useState<UsageByModel[]>([]);
  const [byCategory, setByCategory] = useState<UsageByCategory[]>([]);
  const [byMonth, setByMonth] = useState<UsageByMonth[]>([]);
  const [recent, setRecent] = useState<RecentGenUsage[]>([]);
  const [thisMonth, setThisMonth] = useState({ tokens_input: 0, tokens_output: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      aiUsageService.byModel(),
      aiUsageService.byCategory(),
      aiUsageService.byMonth(6),
      aiUsageService.recent(20),
      aiUsageService.totalsThisMonth(),
    ]).then(([bm, bc, bmth, rec, tm]) => {
      setByModel(bm);
      setByCategory(bc);
      setByMonth(bmth.slice().reverse()); // chronologique
      setRecent(rec);
      setThisMonth(tm);
      // Auto-select most used model
      if (bm.length > 0 && !selectedModel) setSelectedModel(bm[0]?.model ?? '');
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KPIs
  const thisMonthCost = useMemo(() => {
    if (!selectedModel) return 0;
    return estimateCost(thisMonth.tokens_input, thisMonth.tokens_output, selectedModel);
  }, [thisMonth, selectedModel]);

  const totalTokens = useMemo(() =>
    byModel.reduce((s, m) => s + m.tokens_input + m.tokens_output, 0),
  [byModel]);

  const totalCost = useMemo(() =>
    byModel.reduce((s, m) => s + estimateCost(m.tokens_input, m.tokens_output, m.model), 0),
  [byModel]);

  const totalCount = useMemo(() => byModel.reduce((s, m) => s + m.count, 0), [byModel]);

  // Bar chart max for categories
  const maxCatTokens = useMemo(() =>
    Math.max(...byCategory.map(c => c.tokens_input + c.tokens_output), 1),
  [byCategory]);

  // Bar chart max for months
  const maxMonthTokens = useMemo(() =>
    Math.max(...byMonth.map(m => m.tokens_input + m.tokens_output), 1),
  [byMonth]);

  if (loading) {
    return (
      <div className="ai-usage__loading">
        <div className="ai-usage__spinner" />
        <span>Calcul des statistiques...</span>
      </div>
    );
  }

  const hasData = totalCount > 0;

  return (
    <div className="ai-usage">
      <div className="ai-usage__header">
        <h1 className="ai-usage__title">Consommation & coûts IA</h1>
        <div className="ai-usage__model-selector">
          <label className="ai-usage__model-label">Tarif basé sur :</label>
          <select
            className="ai-usage__model-select"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          >
            <option value="">— Modèle inconnu —</option>
            {Object.entries(MODEL_PRICING).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!hasData ? (
        <div className="ai-usage__empty">
          <span className="ai-usage__empty-icon">📊</span>
          <p>Aucune génération complétée pour le moment.</p>
          <p className="ai-usage__empty-hint">Les statistiques apparaîtront après vos premières générations IA.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="ai-usage__kpis">
            <Card className="ai-usage__kpi">
              <span className="ai-usage__kpi-value">{fmtCost(thisMonthCost)}</span>
              <span className="ai-usage__kpi-label">Coût estimé ce mois</span>
              <span className="ai-usage__kpi-sub">{thisMonth.count} génération{thisMonth.count > 1 ? 's' : ''}</span>
            </Card>
            <Card className="ai-usage__kpi">
              <span className="ai-usage__kpi-value">{fmtCost(totalCost)}</span>
              <span className="ai-usage__kpi-label">Coût total estimé</span>
              <span className="ai-usage__kpi-sub">{totalCount} générations</span>
            </Card>
            <Card className="ai-usage__kpi">
              <span className="ai-usage__kpi-value">{fmtTokens(totalTokens)}</span>
              <span className="ai-usage__kpi-label">Tokens consommés</span>
              <span className="ai-usage__kpi-sub">entrée + sortie</span>
            </Card>
            <Card className="ai-usage__kpi">
              <span className="ai-usage__kpi-value">
                {totalCount > 0 ? fmtCost(totalCost / totalCount) : '—'}
              </span>
              <span className="ai-usage__kpi-label">Coût moyen / génération</span>
              <span className="ai-usage__kpi-sub">{byModel.length} modèle{byModel.length > 1 ? 's' : ''} utilisé{byModel.length > 1 ? 's' : ''}</span>
            </Card>
          </div>

          <div className="ai-usage__row">
            {/* Par modèle */}
            {byModel.length > 0 && (
              <Card className="ai-usage__card">
                <h2 className="ai-usage__card-title">Par modèle</h2>
                <div className="ai-usage__model-list">
                  {byModel.map(m => {
                    const cost = estimateCost(m.tokens_input, m.tokens_output, m.model);
                    const pricing = MODEL_PRICING[m.model];
                    return (
                      <div key={m.model} className="ai-usage__model-row">
                        <div className="ai-usage__model-name">
                          {pricing?.label ?? m.model}
                          <Badge variant="info" className="ai-usage__model-count">{m.count}×</Badge>
                        </div>
                        <div className="ai-usage__model-stats">
                          <span className="ai-usage__model-tokens">
                            ↑{fmtTokens(m.tokens_input)} / ↓{fmtTokens(m.tokens_output)}
                          </span>
                          <span className="ai-usage__model-cost">{fmtCost(cost)}</span>
                        </div>
                        {!pricing && (
                          <span className="ai-usage__model-unknown">Tarif inconnu pour ce modèle</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Par catégorie */}
            {byCategory.length > 0 && (
              <Card className="ai-usage__card">
                <h2 className="ai-usage__card-title">Par catégorie</h2>
                <div className="ai-usage__cat-list">
                  {byCategory.map(c => {
                    const total = c.tokens_input + c.tokens_output;
                    const pct = Math.round((total / maxCatTokens) * 100);
                    const color = CATEGORY_COLORS[c.category] ?? 'var(--color-primary)';
                    return (
                      <div key={c.category} className="ai-usage__cat-row">
                        <div className="ai-usage__cat-header">
                          <span className="ai-usage__cat-label">
                            {CATEGORY_LABELS[c.category] ?? c.category}
                          </span>
                          <span className="ai-usage__cat-meta">
                            {c.count} génér. · {fmtTokens(total)} tok
                          </span>
                        </div>
                        <div className="ai-usage__bar-bg">
                          <div
                            className="ai-usage__bar-fill"
                            style={{ width: pct + '%', background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Évolution mensuelle */}
          {byMonth.length > 0 && (
            <Card className="ai-usage__card ai-usage__card--full">
              <h2 className="ai-usage__card-title">Évolution mensuelle (tokens)</h2>
              <div className="ai-usage__month-chart">
                {byMonth.map(m => {
                  const total = m.tokens_input + m.tokens_output;
                  const pct = Math.round((total / maxMonthTokens) * 100);
                  const cost = estimateCost(m.tokens_input, m.tokens_output, selectedModel);
                  return (
                    <div key={m.month} className="ai-usage__month-col">
                      <span className="ai-usage__month-cost">{fmtCost(cost)}</span>
                      <div className="ai-usage__month-bar-wrap">
                        <div
                          className="ai-usage__month-bar"
                          style={{ height: Math.max(pct, 4) + '%' }}
                          title={fmtTokens(total) + ' tokens · ' + m.count + ' génér.'}
                        />
                      </div>
                      <span className="ai-usage__month-label">{fmtMonth(m.month)}</span>
                      <span className="ai-usage__month-count">{m.count}×</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Historique récent */}
          {recent.length > 0 && (
            <Card className="ai-usage__card ai-usage__card--full">
              <h2 className="ai-usage__card-title">Générations récentes</h2>
              <div className="ai-usage__recent-table">
                <div className="ai-usage__recent-head">
                  <span>Tâche</span>
                  <span>Catégorie</span>
                  <span>Modèle</span>
                  <span>Tokens (↑/↓)</span>
                  <span>Coût estimé</span>
                  <span>Date</span>
                </div>
                {recent.map(r => {
                  const cost = estimateCost(r.tokens_input, r.tokens_output, r.model);
                  return (
                    <div key={r.id} className="ai-usage__recent-row">
                      <span className="ai-usage__recent-task">
                        <span>{r.task_icon}</span> {r.task_label}
                      </span>
                      <span>
                        <Badge variant="info">{CATEGORY_LABELS[r.category] ?? r.category}</Badge>
                      </span>
                      <span className="ai-usage__recent-model">
                        {MODEL_PRICING[r.model]?.label ?? (r.model || '—')}
                      </span>
                      <span className="ai-usage__recent-tokens">
                        {fmtTokens(r.tokens_input)} / {fmtTokens(r.tokens_output)}
                      </span>
                      <span className="ai-usage__recent-cost">{cost > 0 ? fmtCost(cost) : '—'}</span>
                      <span className="ai-usage__recent-date">
                        {new Date(r.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
