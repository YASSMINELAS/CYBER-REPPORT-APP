// SeverityPieChart.jsx

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#b30909',
  high: '#f9f946',
  medium: '#ff6607',
  low: '#0a8e41',
};

const SeverityPieChart = ({ title, data }) => {
  return (
    <article className="panel chart-card">
      <div className="chart-card__header">
        <div>
          <span className="chart-kicker">
            Severity Lens
          </span>

          <h2>{title}</h2>
        </div>
      </div>

      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={76}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    SEVERITY_COLORS[
                      entry.name.toLowerCase()
                    ]
                  }
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value, name, item) => [
                value,
                `${name} - ${item.payload.range}`,
              ]}
              contentStyle={{
                background: 'rgba(8, 17, 32, 0.92)',
                border:
                  '1px solid rgba(56, 189, 248, 0.18)',
                borderRadius: '16px',
                color: '#dbeafe',
              }}
            />

            <Legend
              verticalAlign="bottom"
              wrapperStyle={{
                paddingTop: 18,
                color: '#9fb2cc',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export { SEVERITY_COLORS };

export default SeverityPieChart;