/**
 * Graphique barres des severites.
 *
 * Role architectural:
 * - Compare les volumes par severite.
 * - Reutilise les couleurs du pie chart pour garder une lecture uniforme.
 */
// Composants Recharts pour bar chart.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
// Palette partagee avec SeverityPieChart.
import { SEVERITY_COLORS } from './SeverityPieChart';

// Props: title du graphique et data preparee.
const SeverityBarChart = ({ title, data }) => {
  return (
    <article className="panel chart-card">
      <h2>{title}</h2>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value, name, item) => [value, item.payload.range]} />
            <Legend />
            <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export default SeverityBarChart;
