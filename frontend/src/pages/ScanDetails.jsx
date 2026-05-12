import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import {
  Bug,
  ScanSearch,
  Server,
  ShieldAlert,
} from 'lucide-react';

import JsonViewer from '../components/JsonViewer';
import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SeverityBadge from '../components/SeverityBadge';
import SeverityPieChart from '../components/SeverityPieChart';
import StatCard from '../components/StatCard';
import api, { getApiErrorMessage } from '../services/api';
import { recordsToSeverityChartData } from '../utils/charts';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : '-';

const formatAge = (value) => {
  const age = Number(value);
  return Number.isFinite(age) ? `${age}d` : '-';
};

const ScanDetails = () => {
  const [vulnerabilities, setVulnerabilities] =
    useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    severity: 'all',
    host: '',
    search: '',
    sortBy: 'severity',
    sortOrder: 'desc',
  });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchVulnerabilities = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          source: 'nessus',
          page,
          limit: 25,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        Object.entries(filters).forEach(
          ([key, value]) => {
            if (value && value !== 'all') {
              params.set(key, value);
            }
          }
        );

        const response = await api.get(
          `/vulnerabilities?${params.toString()}`
        );
        const payload = response.data;
        const rows = payload.data || payload;

        setVulnerabilities(rows);
        setSelected((current) =>
          rows.find(
            (item) => item._id === current?._id
          ) ||
          rows[0] ||
          null
        );
        setMeta({
          page: payload.page || page,
          pages: payload.pages || 1,
          total:
            payload.total || rows.length,
        });
      } catch (requestError) {
        toast.error(
          getApiErrorMessage(
            requestError,
            'Failed to load Nessus scan details.'
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchVulnerabilities(1);
  }, [fetchVulnerabilities]);

  const hosts = useMemo(
    () =>
      Array.from(
        new Set(
          vulnerabilities
            .map((item) => item.host)
            .filter(Boolean)
        )
      ),
    [vulnerabilities]
  );

  const chartData = useMemo(
    () =>
      recordsToSeverityChartData(vulnerabilities),
    [vulnerabilities]
  );

  const criticalCount = vulnerabilities.filter(
    (item) =>
      item.severity?.toLowerCase() === 'critical'
  ).length;

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <main className="page wide-page soc-detail-page scan-details-page">
      <PageHeader
        eyebrow="Exposure Telemetry"
        title="Scan Details"
        description="Inspect Nessus-driven findings, pivot across hosts, and review remediation guidance without altering scan integration logic."
        meta={
          <div className="page-meta-badges">
            <span className="page-meta-pill">
              {meta.total} findings
            </span>
            <span className="page-meta-pill">
              {hosts.length} hosts
            </span>
          </div>
        }
      />

      <section className="stats-grid stats-grid--compact">
        <StatCard
          label="Visible findings"
          value={vulnerabilities.length}
          helper="Current scan view"
          icon={ScanSearch}
          accent="cyan"
        />
        <StatCard
          label="Impacted hosts"
          value={hosts.length}
          helper="Unique affected assets"
          icon={Server}
          accent="blue"
        />
        <StatCard
          label="Critical findings"
          value={criticalCount}
          helper="Requires immediate remediation"
          icon={ShieldAlert}
          accent="teal"
        />
        <StatCard
          label="Selected record"
          value={selected ? 1 : 0}
          helper="Detail panel synced"
          icon={Bug}
          accent="cyan"
        />
      </section>

      <section className="panel dense-filters soc-filter-bar">
        <div className="soc-filter-control soc-filter-control--search">
          <input
            type="search"
            placeholder="Search plugin, CVE, host..."
            value={filters.search}
            aria-label="Search findings"
            onChange={(event) =>
              updateFilter('search', event.target.value)
            }
          />
        </div>
        <div className="soc-filter-control">
          <select
            value={filters.severity}
            aria-label="Filter by severity"
            onChange={(event) =>
              updateFilter(
                'severity',
                event.target.value
              )
            }
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="soc-filter-control">
          <input
            type="search"
            placeholder="Host IP"
            value={filters.host}
            aria-label="Filter by host"
            onChange={(event) =>
              updateFilter('host', event.target.value)
            }
          />
        </div>
      </section>

      {loading && (
        <Loader label="Loading Nessus findings..." />
      )}

      {!loading && (
        <section className="split-layout">
          <div className="panel table-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">
                  Scan findings
                </span>
                <h2>Findings Stream</h2>
                <p>
                  Select any row to inspect the
                  detailed Nessus payload.
                </p>
              </div>
            </div>

            <div className="table-wrap dense-table soc-table-wrap">
              <table className="data-table soc-data-table scan-table">
                <colgroup>
                  <col className="scan-table__finding" />
                  <col className="scan-table__severity" />
                  <col className="scan-table__system" />
                  <col className="scan-table__port" />
                  <col className="scan-table__cve" />
                  <col className="scan-table__priority" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Finding</th>
                    <th>Severity</th>
                    <th>System</th>
                    <th>Port</th>
                    <th>CVE</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {vulnerabilities.map(
                    (vulnerability) => (
                      <tr
                        key={vulnerability._id}
                        className={
                          selected?._id ===
                          vulnerability._id
                            ? 'selected-row'
                            : ''
                        }
                        onClick={() =>
                          setSelected(vulnerability)
                        }
                      >
                        <td>
                          <div className="cell-stack cell-stack--wide">
                            <strong>
                              {vulnerability.title || '-'}
                            </strong>
                            <span>
                              {vulnerability.pluginId
                                ? `Plugin ${vulnerability.pluginId}`
                                : vulnerability.scanName ||
                                  vulnerability.scanId ||
                                  'Nessus finding'}
                            </span>
                          </div>
                        </td>
                        <td className="cell-severity">
                          <SeverityBadge
                            value={vulnerability.severity}
                          />
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>
                              {vulnerability.host || '-'}
                            </strong>
                            <span>
                              {vulnerability.protocol || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="cell-nowrap">
                          {vulnerability.port || '-'}
                        </td>
                        <td>
                          <span className="cell-list">
                            {vulnerability.cve?.join(', ') ||
                              '-'}
                          </span>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>
                              {vulnerability.status || 'open'}
                            </strong>
                            <span>
                              Age{' '}
                              {formatAge(
                                vulnerability.ageInDays
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {!vulnerabilities.length && (
              <div className="empty-state">
                No scan findings found.
              </div>
            )}

            <Pagination
              page={meta.page}
              pages={meta.pages}
              total={meta.total}
              onPageChange={fetchVulnerabilities}
            />
          </div>

          <aside className="details-panel">
            <SeverityPieChart
              title="Severity Distribution"
              data={chartData}
            />

            <section className="panel finding-detail-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">
                    Detail view
                  </span>
                  <h2>Selected Finding</h2>
                  <p>
                    Review the remediation and
                    raw source payload for the
                    selected record.
                  </p>
                </div>
              </div>

              {selected ? (
                <div className="finding-detail">
                  <h3>{selected.title}</h3>
                  <div className="finding-summary-grid">
                    <div className="metric-row">
                      <span>Severity</span>
                      <strong>
                        <SeverityBadge value={selected.severity} />
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>Host</span>
                      <strong>
                        {selected.host || '-'}
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>Port</span>
                      <strong>
                        {selected.port || '-'}
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>Protocol</span>
                      <strong>
                        {selected.protocol || '-'}
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>Scan</span>
                      <strong>
                        {selected.scanName ||
                          selected.scanId ||
                          '-'}
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>Status</span>
                      <strong>
                        {selected.status || 'open'}
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>First seen</span>
                      <strong>
                        {formatDate(
                          selected.firstSeenAt ||
                            selected.createdAt
                        )}
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>Last seen</span>
                      <strong>
                        {formatDate(selected.lastSeenAt)}
                      </strong>
                    </div>
                  </div>
                  <h3>Technical Description</h3>
                  <p>
                    {selected.description ||
                      'No description available.'}
                  </p>
                  <h3>Recommended Remediation</h3>
                  <p>
                    {selected.solution ||
                      'No remediation guidance available.'}
                  </p>
                  <JsonViewer
                    data={selected.raw || selected}
                  />
                </div>
              ) : (
                <p className="message">
                  Select a vulnerability to
                  inspect it.
                </p>
              )}
            </section>
          </aside>
        </section>
      )}
    </main>
  );
};

export default ScanDetails;
