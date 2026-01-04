import { useEffect, useState } from 'react';
import styles from './SentOtps.module.css';

interface OtpRecord {
  id: string;
  phoneNumber: string;
  serviceName: string;
  status: string;
  date: string;
  time: string;
  verifiedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function SentOtps() {
  const [otps, setOtps] = useState<OtpRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchOtps = async () => {
    setLoading(true);
    const token = localStorage.getItem('yalavoch_token');
    
    const params = new URLSearchParams();
    if (phoneNumber) params.append('phoneNumber', phoneNumber);
    if (serviceName) params.append('serviceName', serviceName);
    if (status) params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('page', String(page));
    params.append('limit', '20');

    try {
      const res = await fetch(`/dashboard/sent-otps?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setOtps(data.otps);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch OTPs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOtps();
  }, [page]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOtps();
  };

  const handleClearFilters = () => {
    setPhoneNumber('');
    setServiceName('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchOtps();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; color: string } } = {
      verified: { label: 'Successful', color: 'success' },
      pending: { label: 'Pending', color: 'warning' },
      code_sent: { label: 'Code Sent', color: 'info' },
      expired: { label: 'Timeout', color: 'error' },
      incorrect: { label: 'Incorrect', color: 'error' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <span className={`${styles.badge} ${styles[config.color]}`}>{config.label}</span>;
  };

  return (
    <div className={styles.page}>
      {/* Filters */}
      <form onSubmit={handleFilter} className={styles.filters}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>Phone Number</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+998..."
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Service Name</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Service name"
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="verified">Successful</option>
              <option value="pending">Pending</option>
              <option value="code_sent">Code Sent</option>
              <option value="expired">Timeout</option>
              <option value="incorrect">Incorrect</option>
            </select>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className={styles.filterActions}>
            <button type="submit" className={styles.btnPrimary}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Filter
            </button>
            <button type="button" className={styles.btnSecondary} onClick={handleClearFilters}>
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading...</p>
          </div>
        ) : otps.length === 0 ? (
          <div className={styles.empty}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p>No OTP records found</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Phone Number</th>
                    <th>Service Name</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {otps.map((otp) => (
                    <tr key={otp.id}>
                      <td className={styles.phone}>{otp.phoneNumber}</td>
                      <td>{otp.serviceName}</td>
                      <td>{otp.date}</td>
                      <td>{otp.time}</td>
                      <td>{getStatusBadge(otp.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>

                <span className={styles.pageInfo}>
                  Page {pagination.page} of {pagination.pages}
                </span>

                <button
                  className={styles.pageBtn}
                  disabled={page === pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

