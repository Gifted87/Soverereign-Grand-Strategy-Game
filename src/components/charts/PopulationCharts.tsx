import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  serfs: '#854d0e', // amber-800
  merchants: '#3a352a', // stone
  clergy: '#581c87', // purple-900
  nobles: '#c2a461', // gold
};

export function DemographicsPieChart({ data }: { data: { name: string, value: number }[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || '#000'} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ backgroundColor: '#141310', borderColor: '#3a352a', fontFamily: 'Inter', fontSize: '12px' }}
             itemStyle={{ color: '#e8e2d2' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
