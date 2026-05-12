// SeverityBarChart.jsx

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';

import { SEVERITY_COLORS } from './SeverityPieChart';

const SeverityBarChart = ({ title, data }) => {
  return (
    <article className="panel chart-card">
      <div className="chart-card__header">
        <div>
          <span className="chart-kicker">
            Volume View
          </span>

          <h2>{title}</h2>
        </div>
      </div>

      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(148, 163, 184, 0.18)"
            />

            <XAxis
              dataKey="name"
              tick={{
                fill: '#9fb2cc',
                fontSize: 12,
              }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              allowDecimals={false}
              tick={{
                fill: '#9fb2cc',
                fontSize: 12,
              }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={(value, name, item) => [
                value,
                item.payload.range,
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

            <Bar
              dataKey="value"
              radius={[10, 10, 0, 0]}
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
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export default SeverityBarChart;