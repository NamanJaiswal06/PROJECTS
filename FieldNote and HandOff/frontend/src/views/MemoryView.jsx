import React, { useState } from 'react';
import { Database, Search, Sparkles, Star } from 'lucide-react';
import { searchMemory } from '../services/api';

export default function MemoryView() {
  const [query, setQuery] = useState('');
  const [unitId, setUnitId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const suggestions = [
    'compressor vibration on startup',
    'belt squealing at high load',
    'thermal cutout tripping',
    'oil level low rear seal',
    'grinding noise belt housing',
  ];

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchMemory(query, unitId || null, 8);
      if (data.success) {
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (s) => {
    setQuery(s);
    setTimeout(() => handleSearch(), 100);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="optima-card" style={{ marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--header-gold-soft)', padding: '8px 20px', borderRadius: '20px', marginBottom: '12px' }}>
            <Database size={18} color="var(--header-gold-dark)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--header-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Qdrant Vector Memory RAG
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--clr-text-main)' }}>
            Semantic Field Memory Search
          </h2>
          <p style={{ color: 'var(--clr-text-muted)', marginTop: '8px' }}>
            Search across all historical incident logs, observations, and handoffs using AI-powered semantic matching powered by Gemini Embeddings &amp; Qdrant.
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder='Try: "compressor vibration on startup" or "oil seal weeping"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ margin: 0, paddingLeft: '44px', fontSize: '1rem' }}
            />
          </div>

          <select
            className="input-field"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            style={{ margin: 0, width: '180px' }}
          >
            <option value="">All Units</option>
            <option value="UNIT-27">UNIT-27</option>
            <option value="UNIT-14">UNIT-14</option>
            <option value="UNIT-31">UNIT-31</option>
          </select>

          <button type="submit" className="btn-primary-gold" style={{ width: 'auto', padding: '0 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} /> Search Memory
          </button>
        </form>

        {/* Suggestion chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--clr-text-muted)', lineHeight: '28px' }}>Try:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestionClick(s)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                background: '#F8FAF9',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '4px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'var(--clr-text-main)',
              }}
              onMouseEnter={(e) => { e.target.style.borderColor = 'var(--header-gold)'; e.target.style.background = 'var(--header-gold-soft)'; }}
              onMouseLeave={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAF9'; }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results section */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--header-gold-dark)', fontWeight: 700 }}>
          <Sparkles size={32} style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
          <div>Searching Qdrant vector memory with Gemini embeddings...</div>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="optima-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-text-muted)' }}>
          <Database size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>No similar cases found in memory.</div>
          <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try a different query or broaden the equipment filter.</div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800 }}>
              {results.length} Semantic Matches Found
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Query: "{query}"
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {results.map((hit, idx) => {
              const score = hit.score || 0;
              const pct = Math.round(score * 100);
              const payload = hit.payload || {};

              return (
                <div
                  key={idx}
                  className="optima-card"
                  style={{ padding: '20px', borderLeft: `4px solid ${pct > 85 ? '#10B981' : pct > 70 ? '#F59E0B' : '#94A3B8'}` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: 'var(--header-gold-dark)',
                        background: 'var(--header-gold-soft)',
                        padding: '4px 10px',
                        borderRadius: '10px',
                      }}>
                        {payload.equipmentId || 'UNIT-??'}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>
                        {payload.type || 'incident'}
                      </span>
                    </div>

                    {/* Cosine Similarity Score badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={14} color={pct > 85 ? '#10B981' : '#F59E0B'} fill={pct > 85 ? '#10B981' : '#F59E0B'} />
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: pct > 85 ? '#10B981' : pct > 70 ? '#D97706' : '#64748B',
                      }}>
                        {pct}% match
                      </span>
                    </div>
                  </div>

                  {/* Similarity bar */}
                  <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '4px', marginBottom: '12px' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: pct > 85 ? '#10B981' : pct > 70 ? '#F59E0B' : '#94A3B8',
                      borderRadius: '4px',
                      transition: 'width 1s ease',
                    }} />
                  </div>

                  <h4 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '6px', color: 'var(--clr-text-main)' }}>
                    {payload.symptom || 'Field observation recorded'}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                      <strong style={{ color: 'var(--clr-text-main)' }}>Finding:</strong> {payload.finding || '—'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                      <strong style={{ color: 'var(--clr-text-main)' }}>Action:</strong> {payload.action || '—'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {payload.status && (
                      <span className={`eq-status-badge ${payload.status === 'resolved' ? 'operational' : 'degraded'}`}>
                        {payload.status}
                      </span>
                    )}
                    {payload.priority && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: payload.priority === 'high' ? '#FCE8E6' : '#FEF7E0', color: payload.priority === 'high' ? '#C5221F' : '#B06000' }}>
                        {payload.priority?.toUpperCase()} priority
                      </span>
                    )}
                    {payload.timestamp && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', padding: '4px 0', marginLeft: 'auto' }}>
                        {new Date(payload.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
