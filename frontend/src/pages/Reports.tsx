import { useEffect, useState } from 'react';
import styles from './Reports.module.css';

interface Report {
  month: string;
  monthKey: string;
  total: number;
  verified: number;
  expired: number;
  verificationRate: string;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem('yalavoch_token');
      
      try {
        const res = await fetch('/dashboard/reports', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setReports(data.reports);
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const exportToCsv = () => {
    const headers = ['Month', 'Total OTPs', 'Verified', 'Expired', 'Verification Rate'];
    const rows = reports.map(r => [
      r.month,
      r.total,
      r.verified,
      r.expired,
      r.verificationRate + '%',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yalavoch-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2>Monthly Reports</h2>
          <p>View your OTP usage summaries by month</p>
        </div>
        <button className={styles.exportBtn} onClick={exportToCsv}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Reports Grid */}
      <div className={styles.reportsGrid}>
        {reports.map((report) => (
          <div key={report.monthKey} className={styles.reportCard}>
            <div className={styles.reportHeader}>
              <h3>{report.month}</h3>
              <span className={styles.rate}>{report.verificationRate}% verified</span>
            </div>
            
            <div className={styles.reportStats}>
              <div className={styles.mainStat}>
                <span className={styles.statValue}>{report.total.toLocaleString()}</span>
                <span className={styles.statLabel}>Total OTPs</span>
              </div>
              
              <div className={styles.subStats}>
                <div className={styles.subStat}>
                  <span className={styles.subValue} style={{ color: 'var(--color-success)' }}>
                    {report.verified.toLocaleString()}
                  </span>
                  <span className={styles.subLabel}>Verified</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subValue} style={{ color: 'var(--color-error)' }}>
                    {report.expired.toLocaleString()}
                  </span>
                  <span className={styles.subLabel}>Expired</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${report.verificationRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p>No reports available yet</p>
          <span>Start sending OTPs to see your monthly reports here</span>
        </div>
      )}
    </div>
  );
}

