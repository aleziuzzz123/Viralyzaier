import React, { useState, useCallback } from 'react';
import { TrendData, InterestPoint, RelatedQuery } from '../types.ts';
import { fetchTrends } from '../services/googleTrendsService.ts';
import { SearchIcon, BreakoutIcon, TopTopicsIcon, SparklesIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';

interface TrendExplorerProps {
  onTrendSelect: (trend: string) => void;
}

interface TrendChartProps {
  data: InterestPoint[];
  t: (key: string) => string;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, t }) => {
  if (!data || data.length < 2) return <div className="h-48 flex items-center justify-center text-gray-500">{t('trend_explorer.not_enough_data')}</div>;
  
  const width = 500;
  const height = 150;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getX = (index: number) => padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
  const getY = (value: number) => height - padding.bottom - (value / maxValue) * (height - padding.top - padding.bottom);
  
  const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ animation: 'fade-in 1s ease-out' }}>
        {/* Y-axis labels */}
        <text x={padding.left - 8} y={getY(maxValue)} textAnchor="end" alignmentBaseline="middle" fill="#9ca3af" fontSize="10">{maxValue}</text>
        <text x={padding.left - 8} y={getY(0)} textAnchor="end" alignmentBaseline="middle" fill="#9ca3af" fontSize="10">0</text>
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#4b5563" strokeWidth="1" />
        
        {/* X-axis labels */}
        {data.filter((_, i) => i % (Math.floor(data.length / 5)) === 0).map((d, i, arr) => (
          <text key={d.time} x={getX(i * Math.floor(data.length / 5))} y={height - padding.bottom + 15} textAnchor="middle" fill="#9ca3af" fontSize="10">{d.time}</text>
        ))}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#4b5563" strokeWidth="1" />
        
        {/* Line path */}
        <path d={pathData} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 1000, animation: 'stroke-draw 1.5s ease-out forwards' }} />
         <style>{`
          @keyframes stroke-draw {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
          }
           @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </svg>
    </div>
  );
};

interface QueryListProps {
  title: string;
  queries: RelatedQuery[];
  icon: React.ReactNode;
  onSelect: (query: string) => void;
  t: (key: string) => string;
}

const QueryList: React.FC<QueryListProps> = ({ title, queries, icon, onSelect, t }) => (
  <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700 h-full">
    <h3 className="flex items-center text-xl font-bold text-white mb-4">
      {icon}
      {title}
    </h3>
    <ul className="space-y-3">
      {queries.map((q, i) => (
        <li key={i} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-900/50">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-sm font-medium truncate">{q.query}</p>
            <span className={`text-xs font-bold ${q.value.startsWith('+') || q.value === 'Breakout' ? 'text-green-400' : 'text-indigo-400'}`}>
                {q.value}
            </span>
          </div>
          <button 
            onClick={() => onSelect(q.query)}
            className="ml-4 flex-shrink-0 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500"
          >
            {t('trend_explorer.use_as_topic')}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

const TrendExplorer: React.FC<TrendExplorerProps> = ({ onTrendSelect }) => {
  const { t } = useAppContext();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  
  const handleSearch = useCallback(async () => {
    if (!query) {
      setError(t('trend_explorer.error_enter_topic'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setTrendData(null);
    try {
      const data = await fetchTrends(query);
      setTrendData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch trend data.');
    } finally {
      setIsLoading(false);
    }
  }, [query, t]);

  return (
    <div className="w-full flex flex-col items-center animate-fade-in-up">
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center bg-gray-800 rounded-full shadow-lg border border-gray-700 p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('trend_explorer.placeholder')}
            className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none px-4"
            disabled={isLoading}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full p-3 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-wait"
          >
            <SearchIcon className="w-6 h-6" />
          </button>
        </div>
        {error && <p className="text-red-400 text-center mt-3">{error}</p>}
      </div>

      {isLoading && (
         <div className="flex flex-col items-center justify-center space-y-4 text-center mt-8">
             <SparklesIcon className="w-12 h-12 text-indigo-400 animate-pulse"/>
             <p className="text-lg text-gray-200 font-semibold">{t('trend_explorer.loading')}</p>
         </div>
      )}
      
      {trendData && (
        <div className="w-full max-w-6xl space-y-6 animate-fade-in-up">
          <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700">
             <h3 className="text-xl font-bold text-white mb-2">{t('trend_explorer.interest_over_time', { query })}</h3>
             <TrendChart data={trendData.interestOverTime} t={t} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QueryList 
                title={t('trend_explorer.breakout_queries')}
                queries={trendData.breakoutQueries}
                icon={<BreakoutIcon className="w-6 h-6 mr-3 text-green-400" />}
                onSelect={onTrendSelect}
                t={t}
            />
            <QueryList 
                title={t('trend_explorer.top_queries')}
                queries={trendData.topQueries}
                icon={<TopTopicsIcon className="w-6 h-6 mr-3 text-indigo-400" />}
                onSelect={onTrendSelect}
                t={t}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendExplorer;