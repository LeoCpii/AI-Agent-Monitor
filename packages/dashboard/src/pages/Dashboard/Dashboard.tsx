import { startTransition, useContext, useEffect, useState } from 'react';

import { Alert, Container, Stack, Typography } from '@iziui/react';

import { MonitorContext } from '../../context/MonitorProvider';
import { useMonitorDashboard } from '../../hooks/useMonitorDashboard';
import {
  AgentModelComparison,
  DashboardFilters,
  RecentRequests,
  SummaryCards,
  TrendCharts,
} from './components';
import styles from './Dashboard.module.scss';

export default function Dashboard() {
  const monitor = useContext(MonitorContext);

  if (!monitor) {
    throw new Error('Dashboard must render inside MonitorProvider');
  }

  const dashboard = useMonitorDashboard(monitor.filters);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const agentModels = dashboard.modelMetrics.data?.agentModels ?? [];

  useEffect(() => {
    if (dashboard.modelMetrics.data || dashboard.hardwareHistory.data || dashboard.recentRequests.data) {
      setLastUpdated(new Date());
    }
  }, [dashboard.hardwareHistory.data, dashboard.modelMetrics.data, dashboard.recentRequests.data]);

  return (
    <Container className={styles.dashboard} tag="main">
      <Stack gap={24}>
        <header className={styles.header}>
          <Stack gap={4}>
            <Typography variant="h1">AI Monitor</Typography>
            <Typography color="text.secondary" variant="body1">
              Local and remote inference activity with machine health.
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting for data'}
          </Typography>
        </header>

        <DashboardFilters
          agentModels={agentModels}
          filters={monitor.filters}
          onFilterChange={filters => startTransition(() => monitor.updateFilters(filters))}
          onPeriodChange={period => startTransition(() => monitor.setPeriod(period))}
        />

        {(dashboard.modelMetrics.isStale || dashboard.hardwareHistory.isStale || dashboard.recentRequests.isStale) && (
          <Alert color="warning">Some dashboard data is stale after a failed refresh.</Alert>
        )}

        <section aria-labelledby="summary-heading">
          <Typography id="summary-heading" variant="h2">At a glance</Typography>
          <SummaryCards
            hardwareHistory={dashboard.hardwareHistory}
            modelMetrics={dashboard.modelMetrics}
          />
        </section>

        <section aria-label="Trend charts">
          <TrendCharts
            hardwareHistory={dashboard.hardwareHistory}
            modelMetrics={dashboard.modelMetrics}
          />
        </section>

        <section aria-label="Agent and model comparison">
          <AgentModelComparison agentModels={agentModels} />
        </section>

        <section aria-labelledby="recent-requests-heading">
          <Typography id="recent-requests-heading" variant="h2">Recent requests</Typography>
          <RecentRequests resource={dashboard.recentRequests} />
        </section>
      </Stack>
    </Container>
  );
}
