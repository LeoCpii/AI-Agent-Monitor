import { Container, Stack } from '@iziui/react';
import { useMonitorDashboard } from '@/hooks/useMonitorDashboard';

import DashboardHeader from './components/DashboardHeader';
import HardwareHistory from './components/HardwareHistory';
import InfrastructureOverview from './components/InfrastructureOverview';
import ModelPerformance from './components/ModelPerformance';
import RecentActivity from './components/RecentActivity';
import TokenUsage from './components/TokenUsage';
import ToolActivity from './components/ToolActivity';
import styles from './Dashboard.module.scss';

export default function Dashboard() {
  const dashboard = useMonitorDashboard();

  return (
    <Container
      className={styles.page}
      lg={1440}
      md={1200}
      sm="100%"
      tag="main"
    >
      <Stack gap={32}>
        <DashboardHeader
          health={dashboard.health}
          isRefreshing={dashboard.isRefreshing}
          lastUpdated={dashboard.lastUpdated}
          onRefresh={dashboard.refresh}
          telemetry={dashboard.telemetry}
        />
        <InfrastructureOverview telemetry={dashboard.telemetry} />
        <HardwareHistory history={dashboard.hardwareHistory} />
        <ModelPerformance performance={dashboard.modelPerformance} />
        <TokenUsage metrics={dashboard.modelMetrics} />
        <ToolActivity stats={dashboard.toolStats} />
        <RecentActivity
          requests={dashboard.recentRequests}
          toolCalls={dashboard.toolCalls}
        />
      </Stack>
    </Container>
  );
}
