/**
 * Graphique camembert des severites.
 *
 * Role architectural:
 * - Visualise la distribution critical/high/medium/low.
 * - Recoit des donnees deja preparees par utils/charts.js.
 */
// Composants Recharts necessaires au pie chart.
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// Couleurs coherentes avec les badges de severite.
const SEVERITY_COLORS = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#2563eb',
  Low: '#16a34a',
};

// Props: title pour le panneau, data pour Recharts.
const SeverityPieChart = ({ title, data }) => {
  return (
    <article className="panel chart-card">
      <h2>{title}</h2>
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
                <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, item) => [value, `${name} - ${item.payload.range}`]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export { SEVERITY_COLORS };
export default SeverityPieChart;
