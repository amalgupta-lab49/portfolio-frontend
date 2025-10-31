import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [portfolios, setPortfolios] = useState([
    {
      id: 'portfolio-1',
      name: 'Growth Portfolio',
      totalValue: 1000000,
      dailyChange: 25000,
      dailyChangePercent: 2.5,
      holdings: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          shares: 1000,
          value: 250000,
          change: 5000,
          changePercent: 2.0,
          weight: 25,
          sector: 'Technology'
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          shares: 500,
          value: 250000,
          change: 7500,
          changePercent: 3.0,
          weight: 25,
          sector: 'Technology'
        }
      ],
      riskMetrics: {
        beta: 1.2,
        sharpeRatio: 1.8,
        volatility: 15.5,
        maxDrawdown: 12.3
      },
      sectorAllocation: [
        { sector: 'Technology', weight: 50 },
        { sector: 'Financial', weight: 20 },
        { sector: 'Healthcare', weight: 15 },
        { sector: 'Consumer', weight: 15 }
      ]
    },
    {
      id: 'portfolio-2',
      name: 'Income Portfolio',
      totalValue: 750000,
      dailyChange: 15000,
      dailyChangePercent: 2.0,
      holdings: [
        {
          symbol: 'JPM',
          name: 'JPMorgan Chase',
          shares: 1000,
          value: 200000,
          change: 3000,
          changePercent: 1.5,
          weight: 20,
          sector: 'Financial'
        }
      ],
      riskMetrics: {
        beta: 0.8,
        sharpeRatio: 1.5,
        volatility: 12.0,
        maxDrawdown: 8.5
      },
      sectorAllocation: [
        { sector: 'Financial', weight: 40 },
        { sector: 'Utilities', weight: 30 },
        { sector: 'Consumer', weight: 20 },
        { sector: 'Healthcare', weight: 10 }
      ]
    }
  ]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('portfolio-1');
  const [marketData, setMarketData] = useState({
    topGainers: [],
    topLosers: [],
    marketSentiment: null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [companyOverview, setCompanyOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [agentActiveTab, setAgentActiveTab] = useState('thesis');
  const [showThinkingPopover, setShowThinkingPopover] = useState(false);
  const [agentThoughtLog, setAgentThoughtLog] = useState([
    {
      id: 't1',
      time: '09:40 AM',
      title: 'Morning Briefing Generation',
      kind: 'bullets',
      prompt: `System: You are an AI portfolio manager.\nUser: Generate a concise morning briefing for the portfolio focusing on YTD performance vs benchmark and top 2 drivers. Include 1 actionable insight.\nContext: { ytdReturn: 12.3, benchmark: 10.0, drivers: ["AAPL", "MSFT"], risk: { techWeight: 37.2, threshold: 35 } }`,
      bullets: [
        'Portfolio is tracking 2.3% above benchmark YTD',
        'Drivers: AAPL, MSFT momentum',
        'Action: Trim Tech by 2-3% to reduce concentration (37.2% vs 35% target)'
      ],
      output: `Portfolio is tracking 2.3% above benchmark YTD. Primary drivers are AAPL and MSFT momentum. Insight: Consider trimming Technology exposure by 2-3% to reduce concentration risk as weight is 37.2% vs 35% target.`
    },
    {
      id: 't2',
      time: '09:45 AM',
      title: 'Generate Rebalancing Snippet',
      kind: 'code',
      prompt: `Create a pseudo order plan to trim Tech by ~3% and reallocate to low beta holdings. Format as JSON.`,
      code: {
        language: 'json',
        content: `{
  "trim": [{"sector": "Technology", "percent": 3.0}],
  "add": [
    {"ticker": "XLU", "percent": 1.5},
    {"ticker": "SHY", "percent": 1.5}
  ]
}`
      },
      output: 'Proposed trim/add plan in code block'
    },
    {
      id: 't3',
      time: '09:47 AM',
      title: 'Volatility Alert Reasoning',
      kind: 'text',
      prompt: `Evaluate current portfolio volatility vs target and propose 1 mitigation using 30D realized volatility and beta`,
      output: `Volatility (18.5%) exceeds target (15%). Suggest: increase allocation to lower beta names by 2-4% and introduce short-duration T-Bills to dampen variance.`
    },
    {
      id: 't4',
      time: '09:50 AM',
      title: 'Risk Toolkit: Volatility Check',
      kind: 'tool',
      prompt: `Run risk toolkit check for realized volatility vs target`,
      tool: {
        name: 'risk.volatilityCheck',
        inputs: { realizedVol: 18.5, targetVol: 15.0, beta: 1.2 },
        result: 'Volatility exceeds target by 3.5 percentage points'
      },
      output: 'Toolkit confirms breach; mitigation required'
    }
  ]);

  const [editingThoughtId, setEditingThoughtId] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editToolInputs, setEditToolInputs] = useState({});

  const beginEdit = (entry) => {
    setEditingThoughtId(entry.id);
    setEditPrompt(entry.prompt || '');
    setEditToolInputs(entry.tool?.inputs ? { ...entry.tool.inputs } : {});
  };

  const cancelEdit = () => {
    setEditingThoughtId(null);
    setEditPrompt('');
    setEditToolInputs({});
  };

  const saveEdit = (entry) => {
    setAgentThoughtLog(prev => prev.map(e => {
      if (e.id !== entry.id) return e;
      if (e.kind === 'tool') {
        return { ...e, prompt: editPrompt, tool: { ...e.tool, inputs: { ...editToolInputs } } };
      }
      return { ...e, prompt: editPrompt };
    }));
    setEditingThoughtId(null);
  };

  const rerunThinking = (entry) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAgentThoughtLog(prev => prev.map(e => {
      if (e.id !== entry.id) return e;
      return {
        ...e,
        time: timestamp,
        output: `[Re-run ${timestamp}] ` + (e.kind === 'tool' ? 'Toolkit executed with inputs ' + JSON.stringify(editingThoughtId === e.id ? editToolInputs : e.tool?.inputs || {}) : 'Updated analysis based on new prompt')
      };
    }));
  };

  const [agentActions, setAgentActions] = useState([
    {
      id: 1,
      type: 'info',
      time: '09:45 AM',
      title: 'Portfolio Analysis Complete',
      description: 'Initial portfolio analysis completed. Identified 3 opportunities for optimization.',
      meta: ['Analysis', 'Portfolio']
    },
    {
      id: 2,
      type: 'alert',
      time: '09:47 AM',
      title: 'Price Movement Alert',
      description: 'AAPL dropped 2.3% in the last 15 minutes. Monitoring for potential rebalancing opportunity.',
      meta: ['AAPL', 'Price Alert']
    },
    {
      id: 3,
      type: 'success',
      time: '09:50 AM',
      title: 'Strategy Meeting Scheduled',
      description: 'Based on market conditions and portfolio performance, scheduled a strategy review meeting for tomorrow at 10:00 AM.',
      meta: ['Meeting', 'Strategy']
    },
    {
      id: 4,
      type: 'warning',
      time: '09:52 AM',
      title: 'Sector Exposure Warning',
      description: 'Technology sector exposure exceeds target allocation by 5%. Preparing rebalancing recommendations.',
      meta: ['Sector', 'Risk']
    }
  ]);

  // Ensure selectedPortfolio has default values for all arrays
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId) || {
    id: 'default',
    name: 'Default Portfolio',
    totalValue: 0,
    dailyChange: 0,
    dailyChangePercent: 0,
    holdings: [],
    riskMetrics: {
      beta: 0,
      sharpeRatio: 0,
      volatility: 0,
      maxDrawdown: 0
    },
    sectorAllocation: [],
    topPerformers: [],
    watchlist: []
  };

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        let companyOverviewData = null;
        let gainersLosersData = { gainers: [], losers: [] };
        let sentimentData = null;

        // Fetch company overview with error handling
        try {
          const response = await axios.get('/eq/getCompanyOverview', {
            params: {
              symbol: 'AAPL'
            }
          });
          companyOverviewData = response.data;
          setCompanyOverview(companyOverviewData);
        } catch (overviewError) {
          console.warn('Company overview fetch failed:', overviewError);
          // Continue with mock data
        }

        // Fetch market data with error handling
        try {
          const [gainersLosersResponse, sentimentResponse] = await Promise.all([
            axios.get('/eq/getTopGainersAndLosers'),
            axios.get('/eq/getMarketSentiment', {
              params: {
                ticker: 'AAPL'
              }
            })
          ]);
          gainersLosersData = gainersLosersResponse.data;
          sentimentData = sentimentResponse.data;
        } catch (marketError) {
          console.warn('Market data fetch failed, using mock data:', marketError);
          // Mock data for market movers
          gainersLosersData = {
            gainers: [
              { symbol: 'AAPL', name: 'Apple Inc.', change: 2.5 },
              { symbol: 'MSFT', name: 'Microsoft', change: 2.1 },
              { symbol: 'GOOGL', name: 'Alphabet', change: 1.8 }
            ],
            losers: [
              { symbol: 'TSLA', name: 'Tesla', change: -2.3 },
              { symbol: 'META', name: 'Meta', change: -1.9 },
              { symbol: 'NFLX', name: 'Netflix', change: -1.5 }
            ]
          };
          // Mock data for market sentiment
          sentimentData = {
            symbol: 'AAPL',
            sentiment: 'Bullish',
            description: 'Strong technical indicators and positive earnings outlook suggest continued upward momentum.',
            strength: 'High',
            confidence: 85
          };
        }

        // Update market data state with default empty arrays
        setMarketData({
          topGainers: gainersLosersData.gainers || [],
          topLosers: gainersLosersData.losers || [],
          marketSentiment: sentimentData
        });

        // Set portfolio data with mock data and ensure all arrays are initialized
        setPortfolios([
          {
            id: 'portfolio-1',
            name: 'Growth Portfolio',
            totalValue: 1000000,
            dailyChange: 25000,
            dailyChangePercent: 2.5,
            holdings: [
              {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                shares: 1000,
                value: 250000,
                change: 5000,
                changePercent: 2.0,
                weight: 25,
                sector: 'Technology'
              },
              {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                shares: 500,
                value: 250000,
                change: 7500,
                changePercent: 3.0,
                weight: 25,
                sector: 'Technology'
              }
            ],
            riskMetrics: {
              beta: 1.2,
              sharpeRatio: 1.8,
              volatility: 15.5,
              maxDrawdown: 12.3
            },
            sectorAllocation: [
              { sector: 'Technology', weight: 50 },
              { sector: 'Financial', weight: 20 },
              { sector: 'Healthcare', weight: 15 },
              { sector: 'Consumer', weight: 15 }
            ],
            topPerformers: [
              { symbol: 'MSFT', name: 'Microsoft', change: 3.0 },
              { symbol: 'AAPL', name: 'Apple', change: 2.0 },
              { symbol: 'JPM', name: 'JPMorgan', change: 1.5 }
            ],
            watchlist: [
              { symbol: 'GOOGL', name: 'Alphabet', price: 2800, change: 1.2 },
              { symbol: 'AMZN', name: 'Amazon', price: 3500, change: -0.5 },
              { symbol: 'TSLA', name: 'Tesla', price: 900, change: 2.5 }
            ]
          },
          {
            id: 'portfolio-2',
            name: 'Income Portfolio',
            totalValue: 750000,
            dailyChange: 15000,
            dailyChangePercent: 2.0,
            holdings: [
              {
                symbol: 'JPM',
                name: 'JPMorgan Chase',
                shares: 1000,
                value: 200000,
                change: 3000,
                changePercent: 1.5,
                weight: 20,
                sector: 'Financial'
              }
            ],
            riskMetrics: {
              beta: 0.8,
              sharpeRatio: 1.5,
              volatility: 12.0,
              maxDrawdown: 8.5
            },
            sectorAllocation: [
              { sector: 'Financial', weight: 40 },
              { sector: 'Utilities', weight: 30 },
              { sector: 'Consumer', weight: 20 },
              { sector: 'Healthcare', weight: 10 }
            ],
            topPerformers: [],
            watchlist: []
          }
        ]);
      } catch (err) {
        console.error('Error in data fetching:', err);
        setError('Unable to load data. Using mock data for demonstration.');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  // Function to search stocks with improved error handling
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const results = await searchStocks(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching stocks:', err);
      setError('Search failed. Please try again later.');
      setSearchResults([]);
    }
  };

  const searchStocks = async (symbol) => {
    try {
      const response = await axios.get('/eq/searchStocksByName', {
        params: {
          symbol: symbol
        }
      });
      return response.data;
    } catch (err) {
      console.error('Error searching stocks:', err);
      // Return mock data for demonstration
      return [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' }
      ];
    }
  };

  if (loading) return <div className="dashboard-loading">Loading portfolio data...</div>;
  if (error) return <div className="dashboard-error">Error: {error}</div>;

  return (
    <div className={`dashboard ${isAgentMode ? 'agent-mode' : ''}`}>
      <div className="dashboard-header">
        <div className="header-top">
          <h1>Portfolio Dashboard</h1>
          <div className="header-controls">
            <div className="portfolio-selector">
              <select 
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="portfolio-select"
              >
                {portfolios.map(portfolio => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks by symbol..."
                  className="search-input"
                />
                <button type="submit" className="search-button">Search</button>
              </form>
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((stock) => (
                    <div key={stock.symbol} className="search-result-item">
                      <span className="symbol">{stock.symbol}</span>
                      <span className="name">{stock.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="agent-toggle">
              <div className="toggle-container">
                <input
                  type="checkbox"
                  id="agent-mode"
                  checked={isAgentMode}
                  onChange={() => setIsAgentMode(!isAgentMode)}
                  className="toggle-input"
                />
                <label htmlFor="agent-mode" className="toggle-label">
                  <span className="toggle-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                      <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="currentColor"/>
                      <path d="M12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z" fill="currentColor"/>
                    </svg>
                  </span>
                  <span className="toggle-text">Agent Mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="portfolio-summary">
          <div className="summary-item">
            <span className="label">Total Value</span>
            <span className="value">${selectedPortfolio.totalValue.toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <span className="label">Daily Change</span>
            <span className={`value ${selectedPortfolio.dailyChange >= 0 ? 'positive' : 'negative'}`}>
              {selectedPortfolio.dailyChange >= 0 ? '+' : ''}${selectedPortfolio.dailyChange.toLocaleString()}
              ({selectedPortfolio.dailyChangePercent.toFixed(2)}%)
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Portfolio Beta</span>
            <span className="value">{selectedPortfolio.riskMetrics.beta.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Sharpe Ratio</span>
            <span className="value">{selectedPortfolio.riskMetrics.sharpeRatio.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!isAgentMode && (
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'holdings' ? 'active' : ''}`}
            onClick={() => setActiveTab('holdings')}
          >
            Holdings
          </button>
          <button 
            className={`tab-button ${activeTab === 'risk' ? 'active' : ''}`}
            onClick={() => setActiveTab('risk')}
          >
            Risk Analysis
          </button>
          <button 
            className={`tab-button ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            Watchlist
          </button>
          <button 
            className={`tab-button ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => setActiveTab('market')}
          >
            Market Data
          </button>
        </div>
      )}

      <div className="dashboard-content">
        {isAgentMode ? (
          <>
            <div className="dashboard-tabs agent-tabs">
              <button 
                className={`tab-button ${agentActiveTab === 'thesis' ? 'active' : ''}`}
                onClick={() => setAgentActiveTab('thesis')}
              >
                Thesis Drift
              </button>
              <button 
                className={`tab-button ${agentActiveTab === 'dummy1' ? 'active' : ''}`}
                onClick={() => setAgentActiveTab('dummy1')}
              >
                Dummy 1
              </button>
              <button 
                className={`tab-button ${agentActiveTab === 'dummy2' ? 'active' : ''}`}
                onClick={() => setAgentActiveTab('dummy2')}
              >
                Dummy 2
              </button>
            </div>

            {agentActiveTab === 'thesis' && (
              <div className="agent-tiled-view">
                <div className="agent-thinking-box">
                  <div className="thinking-header">
                    <h3>AI Portfolio Manager</h3>
                    <div className="status-indicator">
                      <div className="status-dot"></div>
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="thinking-controls">
                    <button 
                      className="thinking-icon-button"
                      title="Show Thinking"
                      aria-label="Show Thinking"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowThinkingPopover(!showThinkingPopover);
                      }}
                    >
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                      </svg>
                    </button>
                    {showThinkingPopover && (
                      <div className="thinking-popover" onClick={(e) => e.stopPropagation()}>
                        <div className="thinking-popover-header">
                          <span>Agent Thoughts (Mocks)</span>
                          <button className="popover-close" onClick={() => setShowThinkingPopover(false)}>✕</button>
                        </div>
                        <div className="thinking-actions">
                          <button 
                            className="analysis-action-button secondary"
                            onClick={() => {
                              if (navigator?.clipboard) {
                                navigator.clipboard.writeText(agentThoughtLog.map(x => x.prompt).join('\n\n---\n\n'));
                              }
                            }}
                          >Copy Prompts</button>
                          <button 
                            className="analysis-action-button secondary"
                            onClick={() => {
                              if (navigator?.clipboard) {
                                navigator.clipboard.writeText(agentThoughtLog.map(x => x.output).join('\n\n---\n\n'));
                              }
                            }}
                          >Copy Outputs</button>
                          <button 
                            className="analysis-action-button secondary"
                            onClick={() => {
                              if (navigator?.clipboard) {
                                const both = agentThoughtLog.map(x => `Title: ${x.title}\nTime: ${x.time}\n\nPrompt:\n${x.prompt}\n\nOutput:\n${x.output}`).join('\n\n================\n\n');
                                navigator.clipboard.writeText(both);
                              }
                            }}
                          >Copy All</button>
                        </div>
                        <div className="thinking-panel">
                          <div className="thinking-log">
                            {agentThoughtLog.map(entry => (
                              <div key={entry.id} className="thinking-item">
                                <div className="thinking-item-header">
                                  <div className="thinking-item-meta">
                                    <span className="thinking-time">{entry.time}</span>
                                    <span className="thinking-title">{entry.title}</span>
                                    <span className={`thinking-kind pill kind-${entry.kind}`}>{entry.kind}</span>
                                  </div>
                                  <div className="thinking-item-actions">
                                    {editingThoughtId === entry.id ? (
                                      <>
                                        <button className="tiny-button" onClick={() => saveEdit(entry)}>Save</button>
                                        <button className="tiny-button ghost" onClick={cancelEdit}>Cancel</button>
                                      </>
                                    ) : (
                                      <>
                                        <button className="tiny-button" onClick={() => beginEdit(entry)}>Edit</button>
                                        <button className="tiny-button" onClick={() => rerunThinking(entry)}>Re-run</button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="thinking-blocks">
                                  <div className="thinking-block">
                                    <div className="thinking-block-label">Prompt</div>
                                    {editingThoughtId === entry.id ? (
                                      <textarea className="thinking-input" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                                    ) : (
                                      <pre className="thinking-code"><code>{entry.prompt}</code></pre>
                                    )}
                                  </div>

                                  {entry.kind === 'tool' && (
                                    <div className="thinking-block">
                                      <div className="thinking-block-label">Tool Inputs ({entry.tool?.name})</div>
                                      {editingThoughtId === entry.id ? (
                                        <div className="tool-inputs">
                                          {Object.keys(editToolInputs).map((key) => (
                                            <label key={key} className="tool-input-row">
                                              <span>{key}</span>
                                              <input
                                                className="tool-input"
                                                type="text"
                                                value={String(editToolInputs[key])}
                                                onChange={(e) => setEditToolInputs({ ...editToolInputs, [key]: e.target.value })}
                                              />
                                            </label>
                                          ))}
                                        </div>
                                      ) : (
                                        <pre className="thinking-code"><code>{JSON.stringify(entry.tool?.inputs || {}, null, 2)}</code></pre>
                                      )}
                                    </div>
                                  )}

                                  {entry.kind === 'bullets' && (
                                    <div className="thinking-block">
                                      <div className="thinking-block-label">Key Points</div>
                                      <ul className="thinking-list">
                                        {(entry.bullets || []).map((b, idx) => (
                                          <li key={idx}>{b}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {entry.kind === 'code' && (
                                    <div className="thinking-block">
                                      <div className="thinking-block-label">Code ({entry.code?.language || 'text'})</div>
                                      <pre className="thinking-code"><code>{entry.code?.content || ''}</code></pre>
                                    </div>
                                  )}

                                  <div className="thinking-block">
                                    <div className="thinking-block-label">Output</div>
                                    <pre className="thinking-code"><code>{entry.output}</code></pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="thinking-content">
                    <div className="agent-main-sections">
                      <div className="thinking-message">
                        <h4>Morning Portfolio Briefing</h4>
                        <p>Portfolio is currently tracking 2.3% above benchmark YTD. Key positions AAPL and MSFT showing strong momentum.</p>
                      </div>
                      
                      <div className="thinking-insights">
                        <h4>Risk Alerts</h4>
                        <table className="analysis-table">
                          <tbody>
                            <tr>
                              <td>
                                <p className="analysis-item">Technology sector exposure at 37.2% (threshold: 35%)</p>
                              </td>
                              <td className="action-button-cell">
                                <button className="analysis-action-button">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Review
                                </button>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <p className="analysis-item">Portfolio volatility above target (18.5% vs 15%)</p>
                              </td>
                              <td className="action-button-cell">
                                <button className="analysis-action-button">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  Optimize
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="thinking-recommendations">
                        <h4>Today's Actions</h4>
                        <table className="analysis-table">
                          <tbody>
                            <tr>
                              <td>
                                <p className="analysis-item">Rebalance technology exposure</p>
                              </td>
                              <td className="action-button-cell">
                                <button className="analysis-action-button">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Execute
                                </button>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <p className="analysis-item">Review earnings calendar for next week</p>
                              </td>
                              <td className="action-button-cell">
                                <button className="analysis-action-button">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Schedule
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="thinking-performance">
                        <h4>Performance Metrics</h4>
                        <div className="metrics-grid">
                          <div className="metric-item">
                            <span className="metric-label">YTD Return</span>
                            <span className="metric-value positive">+12.3%</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Sharpe Ratio</span>
                            <span className="metric-value">1.8</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Beta</span>
                            <span className="metric-value">1.2</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Tracking Error</span>
                            <span className="metric-value">2.1%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="agent-action-log">
                      <h4>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Actions
                      </h4>
                      <div className="action-log-list">
                        {agentActions.map(action => (
                          <div key={action.id} className={`action-log-item ${action.type}`}>
                            <div className="action-log-time">{action.time}</div>
                            <div className="action-log-content">
                              <div className="action-log-title">{action.title}</div>
                              <div className="action-log-description">{action.description}</div>
                              <div className="action-log-meta">
                                {action.meta.map((tag, index) => (
                                  <span key={index}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {agentActiveTab === 'dummy1' && (
              <div className="agent-placeholder">
                <p>Dummy 1</p>
              </div>
            )}

            {agentActiveTab === 'dummy2' && (
              <div className="agent-placeholder">
                <p>Dummy 2</p>
              </div>
            )}
          </>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="overview-grid">
                {companyOverview && (
                  <div className="grid-item company-overview">
                    <h3>Company Overview</h3>
                    <div className="company-details">
                      <div className="company-header">
                        <span className="company-name">{companyOverview.name}</span>
                        <span className="company-symbol">{companyOverview.symbol}</span>
                      </div>
                      <div className="company-metrics">
                        <div className="metric">
                          <span className="label">Price</span>
                          <span className="value">${companyOverview.price?.toLocaleString()}</span>
                        </div>
                        <div className="metric">
                          <span className="label">Market Cap</span>
                          <span className="value">${companyOverview.marketCap?.toLocaleString()}</span>
                        </div>
                        <div className="metric">
                          <span className="label">52W High</span>
                          <span className="value">${companyOverview.weekHigh52?.toLocaleString()}</span>
                        </div>
                        <div className="metric">
                          <span className="label">52W Low</span>
                          <span className="value">${companyOverview.weekLow52?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="company-description">
                        <p>{companyOverview.description}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid-item sector-allocation">
                  <h3>Sector Allocation</h3>
                  <div className="allocation-chart">
                    {selectedPortfolio.sectorAllocation.map((sector) => (
                      <div key={sector.sector} className="allocation-bar">
                        <span className="sector-name">{sector.sector}</span>
                        <div className="bar-container">
                          <div 
                            className="bar" 
                            style={{ width: `${sector.weight}%` }}
                          />
                          <span className="weight">{sector.weight}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid-item top-performers">
                  <h3>Top Performers</h3>
                  <div className="performers-list">
                    {selectedPortfolio.topPerformers.map((stock) => (
                      <div key={stock.symbol} className="performer-item">
                        <span className="symbol">{stock.symbol}</span>
                        <span className="name">{stock.name}</span>
                        <span className={`change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'holdings' && (
              <div className="holdings-table">
                <h2>Holdings</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Name</th>
                      <th>Shares</th>
                      <th>Value</th>
                      <th>Weight</th>
                      <th>Change</th>
                      <th>Change %</th>
                      <th>Sector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPortfolio.holdings.map((holding) => (
                      <tr key={holding.symbol}>
                        <td>{holding.symbol}</td>
                        <td>{holding.name}</td>
                        <td>{holding.shares.toLocaleString()}</td>
                        <td>${holding.value.toLocaleString()}</td>
                        <td>{holding.weight}%</td>
                        <td className={holding.change >= 0 ? 'positive' : 'negative'}>
                          {holding.change >= 0 ? '+' : ''}${holding.change.toLocaleString()}
                        </td>
                        <td className={holding.changePercent >= 0 ? 'positive' : 'negative'}>
                          {holding.changePercent >= 0 ? '+' : ''}{holding.changePercent.toFixed(2)}%
                        </td>
                        <td>{holding.sector}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'risk' && (
              <div className="risk-metrics">
                <h2>Risk Metrics</h2>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <span className="metric-label">Portfolio Beta</span>
                    <span className="metric-value">{selectedPortfolio.riskMetrics.beta.toFixed(2)}</span>
                    <span className="metric-description">Measures portfolio volatility relative to market</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Sharpe Ratio</span>
                    <span className="metric-value">{selectedPortfolio.riskMetrics.sharpeRatio.toFixed(2)}</span>
                    <span className="metric-description">Risk-adjusted return measure</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Volatility</span>
                    <span className="metric-value">{selectedPortfolio.riskMetrics.volatility.toFixed(1)}%</span>
                    <span className="metric-description">Annualized standard deviation</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Max Drawdown</span>
                    <span className="metric-value">{selectedPortfolio.riskMetrics.maxDrawdown.toFixed(1)}%</span>
                    <span className="metric-description">Largest peak-to-trough decline</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'watchlist' && (
              <div className="watchlist">
                <h2>Watchlist</h2>
                <div className="watchlist-grid">
                  {selectedPortfolio.watchlist.map((stock) => (
                    <div key={stock.symbol} className="watchlist-card">
                      <div className="stock-header">
                        <span className="symbol">{stock.symbol}</span>
                        <span className="name">{stock.name}</span>
                      </div>
                      <div className="stock-price">${stock.price.toLocaleString()}</div>
                      <div className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'market' && (
              <div className="market-data">
                <div className="market-section">
                  <h2>Market Movers</h2>
                  <div className="market-movers-grid">
                    <div className="movers-section">
                      <h3>Top Gainers</h3>
                      <div className="movers-list">
                        {marketData.topGainers && marketData.topGainers.map((stock) => (
                          <div key={stock.symbol} className="mover-item">
                            <span className="symbol">{stock.symbol}</span>
                            <span className="name">{stock.name}</span>
                            <span className="change positive">+{stock.change}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="movers-section">
                      <h3>Top Losers</h3>
                      <div className="movers-list">
                        {marketData.topLosers && marketData.topLosers.map((stock) => (
                          <div key={stock.symbol} className="mover-item">
                            <span className="symbol">{stock.symbol}</span>
                            <span className="name">{stock.name}</span>
                            <span className="change negative">{stock.change}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {marketData.marketSentiment && marketData.marketSentiment.sentiment && (
                  <div className="market-section">
                    <h2>Market Sentiment</h2>
                    <div className="sentiment-card">
                      <div className="sentiment-header">
                        <span className="symbol">{marketData.marketSentiment.symbol}</span>
                        <span className={`sentiment ${marketData.marketSentiment.sentiment.toLowerCase()}`}>
                          {marketData.marketSentiment.sentiment}
                        </span>
                      </div>
                      <div className="sentiment-details">
                        <p>{marketData.marketSentiment.description}</p>
                        <div className="sentiment-metrics">
                          <div className="metric">
                            <span className="label">Strength</span>
                            <span className="value">{marketData.marketSentiment.strength}</span>
                          </div>
                          <div className="metric">
                            <span className="label">Confidence</span>
                            <span className="value">{marketData.marketSentiment.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard; 