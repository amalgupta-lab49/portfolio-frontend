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
  const [thesisData, setThesisData] = useState({
    inceptionDate: new Date('2023-01-15'), // Example inception date
    sectors: [
      { sector: 'Technology', weight: 35, alpha: 2.5, sharpeRatio: 1.8, targetAlpha: 3.0, targetSharpe: 2.0, presentAlpha: 2.1 },
      { sector: 'Financial', weight: 25, alpha: 1.8, sharpeRatio: 1.6, targetAlpha: 2.2, targetSharpe: 1.8, presentAlpha: 1.5 },
      { sector: 'Healthcare', weight: 20, alpha: 1.5, sharpeRatio: 1.4, targetAlpha: 1.8, targetSharpe: 1.6, presentAlpha: 1.2 },
      { sector: 'Consumer', weight: 15, alpha: 1.2, sharpeRatio: 1.3, targetAlpha: 1.5, targetSharpe: 1.5, presentAlpha: 0.9 },
      { sector: 'Utilities', weight: 5, alpha: 0.5, sharpeRatio: 1.1, targetAlpha: 0.8, targetSharpe: 1.2, presentAlpha: 0.4 }
    ]
  });
  const [pieTooltip, setPieTooltip] = useState(null); // { sector: string, percentage: number, x: number, y: number }
  const [selectedAlphaDecayRow, setSelectedAlphaDecayRow] = useState(null); // sector name or null
  const [isThesisPanelExpanded, setIsThesisPanelExpanded] = useState(true); // Collapsible panel state
  const [isPortfolioPanelExpanded, setIsPortfolioPanelExpanded] = useState(true); // Portfolio panel collapse state
  const [showThinkingPopover, setShowThinkingPopover] = useState(null); // null or section name
  const [contextMenu, setContextMenu] = useState(null); // { section: string, x: number, y: number } or null
  const [copyNotification, setCopyNotification] = useState(null); // { x: number, y: number } or null
  const [sectionThoughtLogs, setSectionThoughtLogs] = useState({
    briefing: [
      {
        id: 'b1',
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
      }
    ],
    risk: [
      {
        id: 'r1',
        time: '09:47 AM',
        title: 'Volatility Alert Reasoning',
        kind: 'text',
        prompt: `Evaluate current portfolio volatility vs target and propose 1 mitigation using 30D realized volatility and beta`,
        output: `Volatility (18.5%) exceeds target (15%). Suggest: increase allocation to lower beta names by 2-4% and introduce short-duration T-Bills to dampen variance.`
      },
      {
        id: 'r2',
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
    ],
    actions: [
      {
        id: 'a1',
        time: '09:45 AM',
        title: 'Rebalance Technology Exposure - Analysis',
        kind: 'text',
        prompt: `Analyze current technology sector exposure and determine rebalancing requirements. Consider target allocation thresholds.`,
        output: 'Technology exposure at 37.2% exceeds target of 35%. Rebalancing recommendation: Reduce exposure by 2-3% and reallocate to lower beta sectors.'
      },
      {
        id: 'a2',
        time: '09:46 AM',
        title: 'Earnings Calendar Review - Schedule Action',
        kind: 'tool',
        prompt: `Generate earnings calendar review task for next week and schedule appropriate action items.`,
        tool: {
          name: 'calendar.scheduleReview',
          inputs: { timeHorizon: 'next_week', focus: 'earnings_releases' },
          result: 'Calendar review scheduled for tomorrow at 10:00 AM'
        },
        output: 'Earnings calendar review scheduled for next week. Key events identified: AAPL (Wed), MSFT (Thu).'
      }
    ],
    performance: [
      {
        id: 'p1',
        time: '09:42 AM',
        title: 'YTD Return Calculation',
        kind: 'tool',
        prompt: `Calculate Year-to-Date return from portfolio start date to current date.`,
        tool: {
          name: 'portfolio.calculateYTD',
          inputs: { startDate: '2024-01-01', endDate: '2024-12-20', benchmark: 'SP500' },
          result: 'YTD Return: 12.3% (vs benchmark 10.0%)'
        },
        output: 'YTD Return calculated: +12.3%'
      },
      {
        id: 'p2',
        time: '09:43 AM',
        title: 'Sharpe Ratio Analysis',
        kind: 'tool',
        prompt: `Calculate Sharpe ratio using risk-free rate and portfolio volatility.`,
        tool: {
          name: 'portfolio.calculateSharpe',
          inputs: { riskFreeRate: 4.5, portfolioReturn: 12.3, volatility: 15.5 },
          result: 'Sharpe Ratio: 1.8'
        },
        output: 'Sharpe Ratio calculated: 1.8 (excellent risk-adjusted return)'
      },
      {
        id: 'p3',
        time: '09:43 AM',
        title: 'Portfolio Beta Calculation',
        kind: 'tool',
        prompt: `Calculate portfolio beta relative to market benchmark.`,
        tool: {
          name: 'portfolio.calculateBeta',
          inputs: { benchmark: 'SP500', lookback: '252' },
          result: 'Portfolio Beta: 1.2'
        },
        output: 'Portfolio Beta: 1.2 (20% more volatile than market)'
      },
      {
        id: 'p4',
        time: '09:44 AM',
        title: 'Tracking Error Measurement',
        kind: 'tool',
        prompt: `Measure tracking error between portfolio returns and benchmark returns.`,
        tool: {
          name: 'portfolio.calculateTrackingError',
          inputs: { benchmark: 'SP500', period: 'YTD' },
          result: 'Tracking Error: 2.1%'
        },
        output: 'Tracking Error: 2.1% (low deviation from benchmark)'
      }
    ],
    recent: [
      {
        id: 're1',
        time: '09:45 AM',
        title: 'Portfolio Analysis Complete',
        kind: 'text',
        prompt: `Complete initial portfolio analysis and log findings`,
        output: 'Initial portfolio analysis completed. Identified 3 opportunities for optimization.'
      },
      {
        id: 're2',
        time: '09:47 AM',
        title: 'Price Movement Alert - AAPL',
        kind: 'tool',
        prompt: `Monitor AAPL price movement and trigger alert if significant drop detected`,
        tool: {
          name: 'market.priceAlert',
          inputs: { symbol: 'AAPL', threshold: -2.0, timeframe: '15min' },
          result: 'AAPL dropped 2.3% in last 15 minutes'
        },
        output: 'AAPL dropped 2.3% in the last 15 minutes. Monitoring for potential rebalancing opportunity.'
      },
      {
        id: 're3',
        time: '09:50 AM',
        title: 'Strategy Meeting Scheduling',
        kind: 'tool',
        prompt: `Schedule strategy review meeting based on market conditions and portfolio performance`,
        tool: {
          name: 'calendar.scheduleMeeting',
          inputs: { type: 'strategy_review', urgency: 'high', preferredTime: 'morning' },
          result: 'Meeting scheduled for tomorrow at 10:00 AM'
        },
        output: 'Strategy review meeting scheduled for tomorrow at 10:00 AM based on market conditions.'
      },
      {
        id: 're4',
        time: '09:52 AM',
        title: 'Sector Exposure Warning',
        kind: 'text',
        prompt: `Analyze sector allocation and generate warning if any sector exceeds target allocation`,
        output: 'Technology sector exposure exceeds target allocation by 5%. Preparing rebalancing recommendations.'
      }
    ]
  });

  const [editingThoughtId, setEditingThoughtId] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editToolInputs, setEditToolInputs] = useState({});
  const [thinkingEntry, setThinkingEntry] = useState(null); // { section: string, entryId: string }
  const [thinkingText, setThinkingText] = useState(''); // Current text being displayed

  const beginEdit = (entry, section) => {
    setEditingThoughtId(entry.id);
    setEditPrompt(entry.prompt || '');
    setEditToolInputs(entry.tool?.inputs ? { ...entry.tool.inputs } : {});
  };

  const cancelEdit = () => {
    setEditingThoughtId(null);
    setEditPrompt('');
    setEditToolInputs({});
  };

  const saveEdit = (entry, section) => {
    setSectionThoughtLogs(prev => ({
      ...prev,
      [section]: prev[section].map(e => {
        if (e.id !== entry.id) return e;
        if (e.kind === 'tool') {
          return { ...e, prompt: editPrompt, tool: { ...e.tool, inputs: { ...editToolInputs } } };
        }
        return { ...e, prompt: editPrompt };
      })
    }));
    setEditingThoughtId(null);
  };

  const getMockReasoningText = (entry) => {
    if (entry.kind === 'tool') {
      return [
        "Analyzing tool requirements...",
        "Preparing tool inputs...",
        "Executing tool: " + (entry.tool?.name || 'unknown'),
        "Processing results...",
        "Validating output format...",
        "Tool execution completed successfully."
      ];
    } else if (entry.kind === 'bullets') {
      return [
        "Processing portfolio data...",
        "Identifying key performance indicators...",
        "Analyzing benchmark comparison...",
        "Extracting actionable insights...",
        "Formatting key points...",
        "Briefing generation complete."
      ];
    } else if (entry.kind === 'code') {
      return [
        "Parsing request parameters...",
        "Generating code structure...",
        "Applying business logic...",
        "Formatting output...",
        "Validating syntax...",
        "Code generation complete."
      ];
    } else {
      return [
        "Processing input...",
        "Analyzing context...",
        "Applying portfolio management rules...",
        "Evaluating market conditions...",
        "Generating response...",
        "Analysis complete."
      ];
    }
  };

  const rerunThinking = (entry, section) => {
    // If currently editing this entry, save the prompt first
    if (editingThoughtId === entry.id && editPrompt) {
      const updatedEntry = {
        ...entry,
        prompt: editPrompt,
        ...(entry.kind === 'tool' && editToolInputs ? { tool: { ...entry.tool, inputs: { ...editToolInputs } } } : {})
      };
      setSectionThoughtLogs(prev => ({
        ...prev,
        [section]: prev[section].map(e => e.id === entry.id ? updatedEntry : e)
      }));
      entry = updatedEntry;
    }
    
    // Start thinking animation
    setThinkingEntry({ section, entryId: entry.id });
    setThinkingText('');
    
    const mockLines = getMockReasoningText(entry);
    let lineIndex = 0;
    let charIndex = 0;
    
    const animate = () => {
      if (lineIndex >= mockLines.length) {
        // Animation complete, update output
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSectionThoughtLogs(prev => ({
          ...prev,
          [section]: prev[section].map(e => {
            if (e.id !== entry.id) return e;
            const finalInputs = (editingThoughtId === entry.id && e.kind === 'tool') ? editToolInputs : e.tool?.inputs || {};
            return {
              ...e,
              time: timestamp,
              output: `[Re-run ${timestamp}] ` + (e.kind === 'tool' ? 'Toolkit executed with inputs ' + JSON.stringify(finalInputs) : 'Updated analysis based on new prompt')
            };
          })
        }));
        setThinkingEntry(null);
        setThinkingText('');
        setEditingThoughtId(null); // Clear editing state after re-run
        return;
      }
      
      const currentLine = mockLines[lineIndex];
      
      if (charIndex < currentLine.length) {
        setThinkingText(prev => prev + currentLine[charIndex]);
        charIndex++;
        setTimeout(animate, 30); // Typing speed
      } else {
        // Line complete, add newline and start next line after a pause
        setThinkingText(prev => prev + '\n');
        lineIndex++;
        charIndex = 0;
        setTimeout(animate, 300); // Pause between lines
      }
    };
    
    animate();
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Auto-hide copy notification after 1 second
  useEffect(() => {
    if (copyNotification) {
      const timer = setTimeout(() => {
        setCopyNotification(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [copyNotification]);

  // Auto-scroll thinking animation as text appears
  useEffect(() => {
    if (thinkingText && thinkingEntry) {
      const animationElement = document.querySelector(`.thinking-animation`);
      if (animationElement) {
        animationElement.scrollTop = animationElement.scrollHeight;
      }
    }
  }, [thinkingText, thinkingEntry]);

  const handleSectionContextMenu = (e, section) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      section,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleShowReasoning = (section) => {
    setShowThinkingPopover(section);
    setContextMenu(null);
  };

  const renderThinkingPopover = (section, title) => {
    if (showThinkingPopover !== section) return null;
    const logs = sectionThoughtLogs[section] || [];
    const hasToolInputs = logs.some(x => x.kind === 'tool' && x.tool?.inputs);

    const showCopyNotification = (e) => {
      setCopyNotification({
        x: e.clientX,
        y: e.clientY
      });
    };

    const copyPrompts = (e) => {
      if (!navigator?.clipboard) return;
      const formatted = logs.map((x, index) => {
        return `=== Entry ${index + 1}: ${x.title} ===\nTime: ${x.time}\n\nPROMPT:\n${x.prompt}`;
      }).join('\n\n\n');
      navigator.clipboard.writeText(formatted);
      showCopyNotification(e);
    };

    const copyOutputs = (e) => {
      if (!navigator?.clipboard) return;
      const formatted = logs.map((x, index) => {
        return `=== Entry ${index + 1}: ${x.title} ===\nTime: ${x.time}\n\nOUTPUT:\n${x.output}`;
      }).join('\n\n\n');
      navigator.clipboard.writeText(formatted);
      showCopyNotification(e);
    };

    const copyAll = (e) => {
      if (!navigator?.clipboard) return;
      const formatted = logs.map((x, index) => {
        let entry = `=== Entry ${index + 1}: ${x.title} ===\nTime: ${x.time}\n\nPROMPT:\n${x.prompt}`;
        
        if (x.kind === 'tool' && x.tool?.inputs) {
          entry += `\n\nTOOL INPUTS:\n${JSON.stringify(x.tool.inputs, null, 2)}`;
        }
        
        if (x.kind === 'bullets' && x.bullets) {
          entry += `\n\nKEY POINTS:\n${x.bullets.map(b => `- ${b}`).join('\n')}`;
        }
        
        if (x.kind === 'code' && x.code?.content) {
          entry += `\n\nCODE (${x.code.language}):\n${x.code.content}`;
        }
        
        entry += `\n\nOUTPUT:\n${x.output}`;
        return entry;
      }).join('\n\n\n');
      navigator.clipboard.writeText(formatted);
      showCopyNotification(e);
    };

    const copyToolInputs = (e) => {
      if (!navigator?.clipboard) return;
      const toolEntries = logs.filter(x => x.kind === 'tool' && x.tool?.inputs);
      const formatted = toolEntries.map((x, index) => {
        return `=== Entry ${index + 1}: ${x.title} ===\nTime: ${x.time}\nTool: ${x.tool.name}\n\nTOOL INPUTS:\n${JSON.stringify(x.tool.inputs, null, 2)}`;
      }).join('\n\n\n');
      navigator.clipboard.writeText(formatted);
      showCopyNotification(e);
    };

    return (
      <div className="thinking-popover-centered" onClick={(e) => e.stopPropagation()}>
        <div className="thinking-popover-overlay" onClick={() => setShowThinkingPopover(null)}></div>
        <div className="thinking-popover-content">
        <div className="thinking-popover-header">
          <span>{title} - Agent Thoughts</span>
          <button className="popover-close" onClick={() => setShowThinkingPopover(null)}>✕</button>
        </div>
        <div className="thinking-actions">
          <button 
            className="analysis-action-button secondary"
            onClick={copyPrompts}
          >Copy Prompts</button>
          <button 
            className="analysis-action-button secondary"
            onClick={copyOutputs}
          >Copy Outputs</button>
          {hasToolInputs && (
            <button 
              className="analysis-action-button secondary"
              onClick={copyToolInputs}
            >Copy Tool Inputs</button>
          )}
          <button 
            className="analysis-action-button secondary"
            onClick={copyAll}
          >Copy All</button>
        </div>
        <div className="thinking-panel">
          <div className="thinking-log">
            {logs.map(entry => (
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
                        <button className="tiny-button" onClick={() => saveEdit(entry, section)}>Save</button>
                        <button className="tiny-button ghost" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="tiny-button" onClick={() => beginEdit(entry, section)}>Edit</button>
                        <button className="tiny-button" onClick={() => rerunThinking(entry, section)}>Re-run</button>
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
                    {thinkingEntry && thinkingEntry.section === section && thinkingEntry.entryId === entry.id ? (
                      <div className="thinking-animation">
                        <pre className="thinking-code thinking-realtime">
                          <code>{thinkingText}</code>
                          <span className="thinking-cursor">▊</span>
                        </pre>
                      </div>
                    ) : (
                      <pre className="thinking-code"><code>{entry.output}</code></pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    return (
      <div 
        className="context-menu"
        style={{
          position: 'fixed',
          left: `${contextMenu.x}px`,
          top: `${contextMenu.y}px`,
          zIndex: 1001
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="context-menu-item"
          onClick={() => handleShowReasoning(contextMenu.section)}
        >
          Show Reasoning
        </button>
      </div>
    );
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

  const getSectorColor = (index) => {
    const colors = [
      '#6c5ce7', // Purple
      '#00b894', // Green
      '#0984e3', // Blue
      '#fdcb6e', // Yellow
      '#e17055', // Orange
      '#74b9ff', // Light Blue
      '#a29bfe', // Light Purple
      '#fd79a8'  // Pink
    ];
    return colors[index % colors.length];
  };

  const calculateDuration = (inceptionDate) => {
    const now = new Date();
    const start = new Date(inceptionDate);
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    
    return parts.join(', ');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pieTooltip && !e.target.closest('.thesis-pie-chart')) {
        setPieTooltip(null);
      }
    };

    if (pieTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [pieTooltip]);

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
        {isAgentMode ? (
          <div className={`collapsible-panel portfolio-panel ${!isPortfolioPanelExpanded ? 'collapsed' : ''}`}>
            <div 
              className="panel-header"
              onClick={() => setIsPortfolioPanelExpanded(!isPortfolioPanelExpanded)}
            >
              <h2 className="panel-title">Portfolio Dashboard</h2>
              <svg 
                className={`panel-arrow ${isPortfolioPanelExpanded ? 'expanded' : ''}`}
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none"
              >
                <path 
                  d="M4 6L8 10L12 6" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={`panel-content portfolio-panel-content ${isPortfolioPanelExpanded ? 'expanded' : ''}`}>
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
          </div>
        ) : (
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
        )}
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
                Overview
              </button>
              <button 
                className={`tab-button ${agentActiveTab === 'dummy1' ? 'active' : ''}`}
                onClick={() => setAgentActiveTab('dummy1')}
              >
                Thesis Drift
              </button>
              <button 
                className={`tab-button ${agentActiveTab === 'dummy2' ? 'active' : ''}`}
                onClick={() => setAgentActiveTab('dummy2')}
              >
                Bias Sentinel
              </button>
            </div>

            {agentActiveTab === 'thesis' && (
              <div className="agent-tiled-view">
                {renderContextMenu()}
                {copyNotification && (
                  <div 
                    className="copy-notification"
                    style={{
                      position: 'fixed',
                      left: `${copyNotification.x + 10}px`,
                      top: `${copyNotification.y - 10}px`,
                      zIndex: 10000
                    }}
                  >
                    ✓ Copied to clipboard
                  </div>
                )}
                {showThinkingPopover === 'briefing' && renderThinkingPopover('briefing', 'Morning Portfolio Briefing')}
                {showThinkingPopover === 'risk' && renderThinkingPopover('risk', 'Risk Alerts')}
                {showThinkingPopover === 'actions' && renderThinkingPopover('actions', 'Today\'s Actions')}
                {showThinkingPopover === 'performance' && renderThinkingPopover('performance', 'Performance Metrics')}
                {showThinkingPopover === 'recent' && renderThinkingPopover('recent', 'Recent Actions')}
                <div className="agent-thinking-box">
                  <div className="thinking-header">
                    <h3>AI Portfolio Manager</h3>
                    <div className="status-indicator">
                      <div className="status-dot"></div>
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="thinking-content">
                    <div className="agent-main-sections">
                      <div 
                        className="thinking-message section-context"
                        onContextMenu={(e) => handleSectionContextMenu(e, 'briefing')}
                      >
                        <h4>Morning Portfolio Briefing</h4>
                        <p>Portfolio is currently tracking 2.3% above benchmark YTD. Key positions AAPL and MSFT showing strong momentum.</p>
                      </div>
                      
                      <div 
                        className="thinking-insights section-context"
                        onContextMenu={(e) => handleSectionContextMenu(e, 'risk')}
                      >
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

                      <div 
                        className="thinking-recommendations section-context"
                        onContextMenu={(e) => handleSectionContextMenu(e, 'actions')}
                      >
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

                      <div 
                        className="thinking-performance section-context"
                        onContextMenu={(e) => handleSectionContextMenu(e, 'performance')}
                      >
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

                    <div 
                      className="agent-action-log section-context"
                      onContextMenu={(e) => handleSectionContextMenu(e, 'recent')}
                    >
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
              <div className="thesis-drift-section">
                <div className={`collapsible-panel ${!isThesisPanelExpanded ? 'collapsed' : ''}`}>
                  <div 
                    className="panel-header"
                    onClick={() => setIsThesisPanelExpanded(!isThesisPanelExpanded)}
                  >
                    <h2 className="panel-title">Thesis at Inception</h2>
                    <svg 
                      className={`panel-arrow ${isThesisPanelExpanded ? 'expanded' : ''}`}
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none"
                    >
                      <path 
                        d="M4 6L8 10L12 6" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className={`panel-content ${isThesisPanelExpanded ? 'expanded' : ''}`}>
                    <div className="thesis-table-container">
                    <div className="thesis-table-wrapper">
                      <h2 className="thesis-section-heading">Thesis at Inception</h2>
                      <table className="thesis-table">
                        <thead>
                          <tr>
                            <th>Sector</th>
                            <th>Allocation %</th>
                            <th>Sector Alpha</th>
                            <th>Sector Sharpe Ratio</th>
                            <th>Target Alpha</th>
                            <th>Target Sharpe Ratio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {thesisData.sectors.map((item, index) => (
                            <tr key={item.sector}>
                              <td className="sector-name-cell">
                                <div className="sector-indicator" style={{ backgroundColor: getSectorColor(index) }}></div>
                                {item.sector}
                              </td>
                              <td>
                                <div className="allocation-cell">
                                  <div className="allocation-bar-container">
                                    <div 
                                      className="allocation-bar-fill"
                                      style={{ 
                                        width: `${item.weight}%`,
                                        backgroundColor: getSectorColor(index)
                                      }}
                                    />
                                  </div>
                                  <span className="allocation-percent">{item.weight}%</span>
                                </div>
                              </td>
                              <td className={item.alpha >= item.targetAlpha ? 'positive' : 'negative'}>
                                {item.alpha > 0 ? '+' : ''}{item.alpha.toFixed(2)}%
                              </td>
                              <td>{item.sharpeRatio.toFixed(2)}</td>
                              <td className="target-value">{item.targetAlpha.toFixed(2)}%</td>
                              <td className="target-value">{item.targetSharpe.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="thesis-pie-chart-wrapper">
                      <h2 className="thesis-section-heading">Sector Allocation</h2>
                      <div className="thesis-pie-chart" onClick={(e) => {
                        if (e.target.tagName !== 'path' && e.target.tagName !== 'text') {
                          setPieTooltip(null);
                        }
                      }}>
                        <div className="pie-chart-container">
                          <div className="pie-chart-visualization">
                            <svg viewBox="0 0 200 200" className="pie-svg">
                              {thesisData.sectors.reduce((acc, item, index) => {
                                const total = thesisData.sectors.reduce((sum, s) => sum + s.weight, 0);
                                const percentage = (item.weight / total) * 100;
                                const startAngle = acc.currentAngle;
                                const angle = (percentage / 100) * 360;
                                const endAngle = startAngle + angle;
                                
                                const x1 = 100 + 95 * Math.cos((startAngle - 90) * Math.PI / 180);
                                const y1 = 100 + 95 * Math.sin((startAngle - 90) * Math.PI / 180);
                                const x2 = 100 + 95 * Math.cos((endAngle - 90) * Math.PI / 180);
                                const y2 = 100 + 95 * Math.sin((endAngle - 90) * Math.PI / 180);
                                const largeArc = angle > 180 ? 1 : 0;
                                
                                const midAngle = (startAngle + endAngle) / 2;
                                const labelX = 100 + 75 * Math.cos((midAngle - 90) * Math.PI / 180);
                                const labelY = 100 + 75 * Math.sin((midAngle - 90) * Math.PI / 180);
                                
                                const pathData = `M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                
                                acc.segments.push(
                                  <g 
                                    key={item.sector} 
                                    className="pie-segment-group"
                                  >
                                    <path
                                      d={pathData}
                                      fill={getSectorColor(index)}
                                      stroke="#fff"
                                      strokeWidth="3"
                                      className="pie-segment-path"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPieTooltip({
                                          sector: item.sector,
                                          percentage: item.weight,
                                          x: e.clientX,
                                          y: e.clientY
                                        });
                                      }}
                                    />
                                    <text
                                      x={labelX}
                                      y={labelY}
                                      className="pie-label"
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                    >
                                      {item.sector}
                                    </text>
                                  </g>
                                );
                                
                                acc.currentAngle = endAngle;
                                return acc;
                              }, { segments: [], currentAngle: 0 }).segments}
                            </svg>
                          </div>
                        </div>
                        {pieTooltip && (
                          <div 
                            className="pie-tooltip"
                            style={{
                              left: `${pieTooltip.x}px`,
                              top: `${pieTooltip.y}px`,
                              transform: 'translate(-50%, -100%)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="tooltip-content">
                              <div className="tooltip-sector">{pieTooltip.sector}</div>
                              <div className="tooltip-percentage">{pieTooltip.percentage}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="alpha-decay-section">
                <h2 className="alpha-decay-heading">Alpha Decay: Inception vs Present</h2>
                <div className="alpha-decay-container">
                  <div className="alpha-decay-table-wrapper">
                    <div className="alpha-decay-content">
                      <table className="alpha-decay-table">
                        <thead>
                          <tr>
                            <th>Sector</th>
                            <th>Alpha at Inception</th>
                            <th>Present Alpha</th>
                            <th>Decay</th>
                            <th>Decay %</th>
                            <th>Inception to Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {thesisData.sectors.map((item, index) => {
                            const decay = item.presentAlpha - item.alpha;
                            const decayPercent = ((decay / item.alpha) * 100).toFixed(1);
                            return (
                              <tr 
                                key={item.sector}
                                className={selectedAlphaDecayRow === item.sector ? 'selected-row' : ''}
                                onClick={() => {
                                  setSelectedAlphaDecayRow(selectedAlphaDecayRow === item.sector ? null : item.sector);
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <td className="sector-name-cell">
                                  <div className="sector-indicator" style={{ backgroundColor: getSectorColor(index) }}></div>
                                  {item.sector}
                                </td>
                                <td className="alpha-value">{item.alpha > 0 ? '+' : ''}{item.alpha.toFixed(2)}%</td>
                                <td className={item.presentAlpha >= item.alpha ? 'positive' : 'negative'}>
                                  {item.presentAlpha > 0 ? '+' : ''}{item.presentAlpha.toFixed(2)}%
                                </td>
                                <td className={decay >= 0 ? 'positive' : 'negative'}>
                                  {decay >= 0 ? '+' : ''}{decay.toFixed(2)}%
                                </td>
                                <td className={decay >= 0 ? 'positive' : 'negative'}>
                                  {decay >= 0 ? '+' : ''}{decayPercent}%
                                </td>
                                <td className="duration-cell">
                                  {calculateDuration(thesisData.inceptionDate)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {selectedAlphaDecayRow && (
                    <div className="alpha-decay-graph-wrapper">
                      <div className="alpha-decay-graph">
                        <div className="decay-graph-container">
                          {(() => {
                            const selectedSector = thesisData.sectors.find(s => s.sector === selectedAlphaDecayRow);
                            if (!selectedSector) return null;
                            
                            const sectorIndex = thesisData.sectors.findIndex(s => s.sector === selectedAlphaDecayRow);
                            const maxAlpha = 3.0;
                            const inceptionAlpha = selectedSector.alpha;
                            const presentAlpha = selectedSector.presentAlpha;
                            
                            // Create data points for the line (inception to present)
                            const points = [
                              { x: 40, y: 180 - (inceptionAlpha / maxAlpha) * 140 }, // Inception
                              { x: 160, y: 180 - (presentAlpha / maxAlpha) * 140 }  // Present
                            ];
                            
                            const pathData = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
                            
                            return (
                              <svg viewBox="0 0 200 200" className="decay-graph-svg">
                                {/* Y-axis */}
                                <line x1="30" y1="20" x2="30" y2="180" stroke="#dfe6e9" strokeWidth="2" />
                                {/* X-axis */}
                                <line x1="30" y1="180" x2="180" y2="180" stroke="#dfe6e9" strokeWidth="2" />
                                {/* Grid lines */}
                                {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((val, i) => {
                                  const y = 180 - (val / 3.0) * 160;
                                  return (
                                    <g key={i}>
                                      <line x1="30" y1={y} x2="180" y2={y} stroke="#f1f3f5" strokeWidth="1" strokeDasharray="2,2" />
                                      <text x="25" y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#636e72">
                                        {val.toFixed(1)}
                                      </text>
                                    </g>
                                  );
                                })}
                                {/* Line from inception to present */}
                                <path
                                  d={pathData}
                                  stroke={getSectorColor(sectorIndex)}
                                  strokeWidth="4"
                                  fill="none"
                                  strokeDasharray="5,5"
                                />
                                {/* Inception point */}
                                <circle
                                  cx={points[0].x}
                                  cy={points[0].y}
                                  r="5"
                                  fill={getSectorColor(sectorIndex)}
                                />
                                {/* Present point */}
                                <circle
                                  cx={points[1].x}
                                  cy={points[1].y}
                                  r="5"
                                  fill={getSectorColor(sectorIndex)}
                                  opacity="0.7"
                                />
                                {/* Labels */}
                                <text
                                  x={points[0].x}
                                  y={points[0].y - 12}
                                  textAnchor="middle"
                                  dominantBaseline="bottom"
                                  fontSize="9"
                                  fill={getSectorColor(sectorIndex)}
                                  fontWeight="600"
                                >
                                  Inception: {inceptionAlpha.toFixed(2)}%
                                </text>
                                <text
                                  x={points[1].x}
                                  y={points[1].y - 12}
                                  textAnchor="middle"
                                  dominantBaseline="bottom"
                                  fontSize="9"
                                  fill={getSectorColor(sectorIndex)}
                                  fontWeight="600"
                                  opacity="0.7"
                                >
                                  Present: {presentAlpha.toFixed(2)}%
                                </text>
                                {/* X-axis labels */}
                                <text
                                  x={points[0].x}
                                  y="195"
                                  textAnchor="middle"
                                  dominantBaseline="top"
                                  fontSize="9"
                                  fill="#636e72"
                                >
                                  Inception
                                </text>
                                <text
                                  x={points[1].x}
                                  y="195"
                                  textAnchor="middle"
                                  dominantBaseline="top"
                                  fontSize="9"
                                  fill="#636e72"
                                >
                                  Present
                                </text>
                              </svg>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {agentActiveTab === 'dummy2' && (
              <div className="agent-placeholder">
                <p>Bias Sentinel</p>
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