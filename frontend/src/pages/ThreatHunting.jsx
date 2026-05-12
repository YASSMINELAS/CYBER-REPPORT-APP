import {
  Fragment,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  Radar,
  Server,
  ShieldAlert,
  Target,
} from 'lucide-react';

import JsonViewer from '../components/JsonViewer';
import Loader from '../components/Loader';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SeverityBadge from '../components/SeverityBadge';
import StatCard from '../components/StatCard';
import api, { getApiErrorMessage } from '../services/api';

const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : '-';

const ThreatHunting = () => {
  const [searchParams] = useSearchParams();
  const [alerts, setAlerts] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    severity: 'all',
    agent: '',
    from: '',
    to: '',
    search: searchParams.get('search') || '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const [expandedId, setExpandedId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          source: 'wazuh',
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
          `/incidents?${params.toString()}`
        );
        const payload = response.data;
        const rows = payload.data || payload;

        setAlerts(rows);
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
            'Failed to load Wazuh alerts.'
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchAlerts(1);
  }, [fetchAlerts]);

  useEffect(() => {
    const querySearch =
      searchParams.get('search') || '';
    setFilters((current) =>
      current.search === querySearch
        ? current
        : { ...current, search: querySearch }
    );
  }, [searchParams]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const criticalCount = alerts.filter(
    (alert) =>
      alert.severity?.toLowerCase() === 'critical'
  ).length;
  const uniqueAgents = new Set(
    alerts
      .map((alert) => alert.agentName || alert.agentIP)
      .filter(Boolean)
  ).size;

  return (
    <main className="page wide-page soc-detail-page threat-hunting-page">
      <PageHeader
        eyebrow="Telemetry Investigation"
        title="Threat Hunting"
        description="Explore Wazuh-driven alerts with live filtering, analyst-friendly detail expansion, and raw payload visibility."
        meta={
          <div className="page-meta-badges">
            <span className="page-meta-pill">
              {meta.total} alerts
            </span>
            <span className="page-meta-pill">
              {expandedId ? '1 row expanded' : 'Raw JSON on demand'}
            </span>
          </div>
        }
      />

      <section className="stats-grid stats-grid--compact">
        <StatCard
          label="Visible alerts"
          value={alerts.length}
          helper="Current search window"
          icon={Radar}
          accent="cyan"
        />
        <StatCard
          label="Critical alerts"
          value={criticalCount}
          helper="Requires immediate triage"
          icon={Target}
          accent="blue"
        />
        <StatCard
          label="Impacted agents"
          value={uniqueAgents}
          helper="Unique monitored assets"
          icon={Server}
          accent="teal"
        />
        <StatCard
          label="Expanded payload"
          value={expandedId ? 1 : 0}
          helper="JSON inspection active"
          icon={ShieldAlert}
          accent="cyan"
        />
      </section>

      <section className="panel dense-filters soc-filter-bar">
        <div className="soc-filter-control soc-filter-control--search">
          <input
            type="search"
            placeholder="Search rule, agent, IP..."
            value={filters.search}
            aria-label="Search alerts"
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
            placeholder="Agent name or IP"
            value={filters.agent}
            aria-label="Filter by agent"
            onChange={(event) =>
              updateFilter('agent', event.target.value)
            }
          />
        </div>
        <div className="soc-filter-control">
          <input
            type="datetime-local"
            value={filters.from}
            aria-label="Filter from date"
            onChange={(event) =>
              updateFilter('from', event.target.value)
            }
          />
        </div>
        <div className="soc-filter-control">
          <input
            type="datetime-local"
            value={filters.to}
            aria-label="Filter to date"
            onChange={(event) =>
              updateFilter('to', event.target.value)
            }
          />
        </div>
      </section>

      {loading && (
        <Loader label="Loading Wazuh alerts..." />
      )}

      {!loading && (
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                Analyst stream
              </span>
              <h2>Alert Activity</h2>
              <p>
                Click a row to expand the raw
                payload for investigation.
              </p>
            </div>
          </div>

          <div className="table-wrap dense-table soc-table-wrap">
            <table className="data-table soc-data-table threat-table">
              <colgroup>
                <col className="threat-table__time" />
                <col className="threat-table__agent" />
                <col className="threat-table__event" />
                <col className="threat-table__rule" />
                <col className="threat-table__severity" />
              </colgroup>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Agent</th>
                  <th>Description</th>
                  <th>Rule ID</th>
                  <th>Criticality</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <Fragment key={alert._id}>
                    <tr
                      className="expandable-row"
                      onClick={() =>
                        setExpandedId(
                          expandedId === alert._id
                            ? ''
                            : alert._id
                        )
                      }
                    >
                      <td className="cell-nowrap">
                        {formatDate(
                          alert.timestamp ||
                            alert.createdAt
                        )}
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>
                            {alert.agentName || '-'}
                          </strong>
                          <span>{alert.agentIP || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack cell-stack--wide">
                          <strong>{alert.title || '-'}</strong>
                          <span>
                            {alert.description ||
                              alert.mitreTechnique?.join(', ') ||
                              'No additional event description'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>
                            {alert.ruleId ||
                              alert.externalId ||
                              '-'}
                          </strong>
                          <span>
                            Level {alert.ruleLevel ?? '-'}
                          </span>
                        </div>
                      </td>
                      <td className="cell-severity">
                        <SeverityBadge value={alert.severity} />
                      </td>
                    </tr>
                    {expandedId === alert._id && (
                      <tr className="expanded-row">
                        <td colSpan="5">
                          <JsonViewer
                            data={alert.raw || alert}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {!alerts.length && (
            <div className="empty-state">
              No alerts found.
            </div>
          )}

          <Pagination
            page={meta.page}
            pages={meta.pages}
            total={meta.total}
            onPageChange={fetchAlerts}
          />
        </section>
      )}
    </main>
  );
};

export default ThreatHunting;
