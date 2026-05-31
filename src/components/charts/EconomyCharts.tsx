import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function TreasuryBalanceChart({ data }: { data: any[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c2a461" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#c2a461" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="day" stroke="#3a352a" tick={{fill: '#8a8470', fontSize: 10}} />
          <YAxis stroke="#3a352a" tick={{fill: '#8a8470', fontSize: 10}} />
          <Tooltip 
             contentStyle={{ backgroundColor: '#141310', borderColor: '#3a352a', fontFamily: 'Inter' }}
             itemStyle={{ color: '#c2a461' }}
          />
          <Area type="monotone" dataKey="balance" stroke="#c2a461" fillOpacity={1} fill="url(#goldGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
