import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './Dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Stats {
  total: number;
  today: number;
  thisMonth: number;
  lastMonth: number;
  verified: number;
  expired: number;
  incorrect: number;
  verificationRate: string;
}

interface ChartData {
  labels: string[];
  thisMonth: number[];
  lastMonth: number[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('yalavoch_token');
      
      try {
        const [statsRes, chartRes] = await Promise.all([
          fetch('/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch('/dashboard/chart', {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        const statsData = await statsRes.json();
        const chartDataRes = await chartRes.json();

        if (statsData.success) {
          setStats(statsData.stats);
        }

        if (chartDataRes.success) {
          setChartData(chartDataRes.chart);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Instrument Sans',
          },
        },
      },
      tooltip: {
        backgroundColor: '#0f1520',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#1a2435',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          family: 'Instrument Sans',
          weight: 600,
        },
        bodyFont: {
          family: 'Instrument Sans',
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Instrument Sans',
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Instrument Sans',
          },
        },
      },
    },
  };

  const chart = chartData ? {
    labels: chartData.labels,
    datasets: [
      {
        label: 'This Month',
        data: chartData.thisMonth,
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#00d4aa',
      },
      {
        label: 'Last Month',
        data: chartData.lastMonth,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1',
      },
    ],
  } : null;

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00d4aa' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total OTPs Sent</span>
            <span className={styles.statValue}>{stats?.total?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Today</span>
            <span className={styles.statValue}>{stats?.today?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Verified</span>
            <span className={styles.statValue}>{stats?.verified?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Verification Rate</span>
            <span className={styles.statValue}>{stats?.verificationRate || '0%'}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h2>OTP Activity</h2>
          <p>Daily OTPs sent comparison</p>
        </div>
        <div className={styles.chartWrapper}>
          {chart && <Line data={chart} options={chartOptions} />}
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <div className={styles.quickCard}>
          <h3>This Month</h3>
          <div className={styles.quickValue}>{stats?.thisMonth?.toLocaleString() || 0}</div>
          <div className={styles.quickCompare}>
            {stats && stats.thisMonth > stats.lastMonth ? (
              <span className={styles.up}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                {stats.lastMonth > 0 
                  ? `+${((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)}%` 
                  : '+100%'}
              </span>
            ) : (
              <span className={styles.down}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {stats?.lastMonth && stats?.lastMonth > 0 
                  ? `-${((stats.lastMonth - (stats?.thisMonth || 0)) / stats.lastMonth * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            )}
            vs last month
          </div>
        </div>

        <div className={styles.quickCard}>
          <h3>Expired</h3>
          <div className={styles.quickValue} style={{ color: 'var(--color-error)' }}>
            {stats?.expired?.toLocaleString() || 0}
          </div>
          <p>OTPs that timed out</p>
        </div>

        <div className={styles.quickCard}>
          <h3>Failed</h3>
          <div className={styles.quickValue} style={{ color: 'var(--color-warning)' }}>
            {stats?.incorrect?.toLocaleString() || 0}
          </div>
          <p>Incorrect codes entered</p>
        </div>
      </div>
    </div>
  );
}

