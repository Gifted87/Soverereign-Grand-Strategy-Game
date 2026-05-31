import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function ForceComparisonBar({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="name" stroke="#3a352a" tick={{fill: '#8a8470', fontSize: 12}} />
          <YAxis stroke="#3a352a" tick={{fill: '#8a8470', fontSize: 12}} />
          <Tooltip 
             contentStyle={{ backgroundColor: '#141310', borderColor: '#3a352a', fontFamily: 'Inter' }}
             itemStyle={{ color: '#e8e2d2' }}
             cursor={{fill: 'rgba(194, 164, 97, 0.05)'}}
          />
          <Legend wrapperStyle={{fontSize: '12px', color: '#8a8470'}} />
          <Bar dataKey="player" name="Your Forces" fill="#c2a461" />
          <Bar dataKey="enemy" name="Enemy Forces" fill="#8a2a2a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
