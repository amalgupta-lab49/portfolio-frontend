import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import ShowReasoning from './ShowReasoning';
import DecisionTrace from './DecisionTrace';
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
  const [auditTraceRequest, setAuditTraceRequest] = useState(null);
  const [thesisData, setThesisData] = useState({
    inceptionDate: new Date('2023-01-15'), // Example inception date
    sectors: [
      { 
        sector: 'Technology', 
        weight: 35, 
        alpha: 2.5, 
        sharpeRatio: 1.8, 
        targetAlpha: 3.0, 
        targetSharpe: 2.0, 
        presentAlpha: 2.1, 
        sentiment: 'Bullish', 
        baselineVector: [0.75, 0.25, 0.15], 
        todayVector: [0.70, 0.28, 0.18],
        internalSentimentBaseline: [0.78, 0.22, 0.12],
        internalSentimentToday: [0.72, 0.26, 0.16],
        externalSentimentBaseline: [0.72, 0.28, 0.18],
        externalSentimentToday: [0.68, 0.30, 0.20]
      },
      { 
        sector: 'Financial', 
        weight: 25, 
        alpha: 1.8, 
        sharpeRatio: 1.6, 
        targetAlpha: 2.2, 
        targetSharpe: 1.8, 
        presentAlpha: 1.5, 
        sentiment: 'Bullish', 
        baselineVector: [0.65, 0.20, 0.18], 
        todayVector: [0.60, 0.25, 0.20],
        internalSentimentBaseline: [0.68, 0.18, 0.16],
        internalSentimentToday: [0.62, 0.23, 0.19],
        externalSentimentBaseline: [0.62, 0.22, 0.20],
        externalSentimentToday: [0.58, 0.27, 0.21]
      },
      { 
        sector: 'Healthcare', 
        weight: 20, 
        alpha: 1.5, 
        sharpeRatio: 1.4, 
        targetAlpha: 1.8, 
        targetSharpe: 1.6, 
        presentAlpha: 1.2, 
        sentiment: 'Hold', 
        baselineVector: [0.55, 0.30, 0.15], 
        todayVector: [0.56, 0.29, 0.16],
        internalSentimentBaseline: [0.58, 0.28, 0.14],
        internalSentimentToday: [0.59, 0.27, 0.15],
        externalSentimentBaseline: [0.52, 0.32, 0.16],
        externalSentimentToday: [0.53, 0.31, 0.17]
      },
      { 
        sector: 'Consumer', 
        weight: 15, 
        alpha: 1.2, 
        sharpeRatio: 1.3, 
        targetAlpha: 1.5, 
        targetSharpe: 1.5, 
        presentAlpha: 0.9, 
        sentiment: 'Bearish', 
        baselineVector: [0.40, 0.45, 0.20], 
        todayVector: [0.38, 0.47, 0.22],
        internalSentimentBaseline: [0.42, 0.43, 0.19],
        internalSentimentToday: [0.40, 0.45, 0.21],
        externalSentimentBaseline: [0.38, 0.47, 0.21],
        externalSentimentToday: [0.36, 0.49, 0.23]
      },
      { 
        sector: 'Utilities', 
        weight: 5, 
        alpha: 0.5, 
        sharpeRatio: 1.1, 
        targetAlpha: 0.8, 
        targetSharpe: 1.2, 
        presentAlpha: 0.4, 
        sentiment: 'Hold', 
        baselineVector: [0.50, 0.35, 0.15], 
        todayVector: [0.52, 0.33, 0.15],
        internalSentimentBaseline: [0.52, 0.33, 0.14],
        internalSentimentToday: [0.54, 0.31, 0.14],
        externalSentimentBaseline: [0.48, 0.37, 0.16],
        externalSentimentToday: [0.50, 0.35, 0.16]
      }
    ]
  });
  const [sentimentTooltip, setSentimentTooltip] = useState(null); // { sector: string, baselineVector: array, x: number, y: number }
  const [sentimentDriftTooltip, setSentimentDriftTooltip] = useState(null); // { sector: string, type: 'internal' | 'external', baselineVector: array, todayVector: array, loading: boolean, x: number, y: number, positionAbove: boolean }
  const [selectedAlphaDecayRow, setSelectedAlphaDecayRow] = useState(null); // sector name or null
  const [sectorSentimentData, setSectorSentimentData] = useState({}); // { [sector]: { baselineVector: array, loading: boolean, error: string } }
  const [isThesisPanelExpanded, setIsThesisPanelExpanded] = useState(true); // Collapsible panel state
  const [isPortfolioPanelExpanded, setIsPortfolioPanelExpanded] = useState(true); // Portfolio panel collapse state
  const [showThinkingPopover, setShowThinkingPopover] = useState(null); // null or section name
  const [contextMenu, setContextMenu] = useState(null); // { section: string, x: number, y: number } or null
  const [copyNotification, setCopyNotification] = useState(null); // { x: number, y: number } or null
  const [biasPopover, setBiasPopover] = useState(null); // { x: number, y: number } or null
  const [biasInfoPopover, setBiasInfoPopover] = useState(null); // { metric: string, x: number, y: number, positionAbove: boolean } or null
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [wsConnection, setWsConnection] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const streamingIntervalRef = useRef(null); // Ref for streaming interval
  const streamingWordsRef = useRef([]); // Ref for words to stream
  const streamingMessageIndexRef = useRef(null); // Ref for message index being streamed
  const [isStreaming, setIsStreaming] = useState(false); // Track if streaming is active
  const [isPaused, setIsPaused] = useState(false); // Track if streaming is paused
  const userScrolledUpRef = useRef(false); // Track if user has scrolled up
  const currentCharIndexRef = useRef(0); // Track current character index for resume
  const isProgrammaticScrollRef = useRef(false); // Track if scroll is programmatic
  const [showHoldingsPopup, setShowHoldingsPopup] = useState(false);
  const [expandedHoldingId, setExpandedHoldingId] = useState(null);
  const [redFlagTooltip, setRedFlagTooltip] = useState(null); // { holdingId: number, flagIndex: number, x: number, y: number }
  const [showOptimizationPopup, setShowOptimizationPopup] = useState(false);
  const [actionsPopover, setActionsPopover] = useState(null); // { type: 'execute' | 'schedule' }

  // Bias Sentinel definitions
  const biasDefinitions = {
    turnoverRate: 'Annualised total trades ÷ portfolio value. High turnover often links to overtrading bias. (< 40% for long-term visible portfolios (house-benchmark))',
    winHoldLossHold: 'Ratio of average hold period of winners to losers. A lower ratio → disposition effect. Ratio >1.2 (i.e., winners held 20% longer)',
    addToLoser: '% of times PM increases size of a losing position without fresh thesis support. < 5% of total adds',
    reentryAfterStop: 'Ratio of trades where PM re-enters position within e.g. 30 days of hitting stop. < 10%',
    alertRate: 'Number of bias-alerts per 100 positions per month. < 1.0 alerts /100 positions',
    overrideRate: '% of alerts overridden by PM (i.e., they continue). Pattern: very high override → PM ignoring tool; very low override → false-positives. 30–70% sweet-spot'
  };

  // Bias Sentinel mock metrics (could be computed from trade logs in real app)
  const [biasMetrics, setBiasMetrics] = useState({
    turnoverRatePct: 32, // Annualized trades as % of portfolio value
    winHoldToLossHold: 1.05, // winners hold time / losers hold time
    addToLoserPct: 4.1, // % adds that increased losing positions
    reentryAfterStopPct: 8.5, // % re-entries within 30 days post stop-loss
    biasAlertRatePer100: 0.7, // alerts per 100 positions / month
    overrideRatePct: 46 // % of alerts overridden by PM
  });

  const biasStatus = {
    turnoverRate: (v) => v < 40 ? 'ok' : v < 60 ? 'warn' : 'bad',
    winHoldLossHold: (v) => v >= 1.2 ? 'ok' : v >= 1.0 ? 'warn' : 'bad',
    addToLoser: (v) => v < 5 ? 'ok' : v < 10 ? 'warn' : 'bad',
    reentryAfterStop: (v) => v < 10 ? 'ok' : v < 20 ? 'warn' : 'bad',
    alertRate: (v) => v < 1.0 ? 'ok' : v < 2.0 ? 'warn' : 'bad',
    overrideRate: (v) => (v >= 30 && v <= 70) ? 'ok' : (v >= 20 && v <= 80) ? 'warn' : 'bad'
  };
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
        prompt: `Calculate Volatility and Exposure Risk per sector/Fund/Or Overall, and for any risks get Top-10-holdings with flags as a response. Evaluate current portfolio volatility vs target and propose 1 mitigation using 30D realized volatility and beta`,
        output: `Volatility and Exposure Risk Analysis: Overall portfolio volatility (18.5%) exceeds target (15%). Technology sector shows highest exposure risk at 37.2% (threshold: 35%). Top-10 holdings with flags: GOOGL (P/E ratio 35% above sector median), META (SEC investigation pending, EBITDA margin declined 15% YoY), TSLA (Short interest increased 40% in past month, Free cash flow negative for 2 consecutive quarters, Management guidance lowered for Q4), AMD (EBITDA margin declined 12% YoY). Mitigation: increase allocation to lower beta names by 2-4% and introduce short-duration T-Bills to dampen variance.`
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
    aiActions: [
      {
        id: 'ai1',
        time: '09:45 AM',
        title: 'Portfolio Analysis Complete',
        kind: 'text',
        prompt: `Complete initial portfolio analysis and log findings`,
        output: 'Initial portfolio analysis completed. Identified 3 opportunities for optimization.'
      },
      {
        id: 'ai2',
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
        id: 'ai3',
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
        id: 'ai4',
        time: '09:52 AM',
        title: 'Sector Exposure Warning',
        kind: 'text',
        prompt: `Analyze sector allocation and generate warning if any sector exceeds target allocation`,
        output: 'Technology sector exposure exceeds target allocation by 5%. Preparing rebalancing recommendations.'
      },
      {
        id: 'ai5',
        time: '10:10 AM',
        title: 'Risk Metrics Recalculation',
        kind: 'tool',
        prompt: `Recalculate portfolio risk metrics after user actions`,
        tool: {
          name: 'portfolio.recalculateRisk',
          inputs: { includeRecentTrades: true, includeAllocationChanges: true },
          result: 'Risk metrics updated: Beta 1.22, Volatility 18.7%, Sharpe 1.75'
        },
        output: 'Portfolio risk metrics recalculated based on recent trades and allocation changes. Beta increased slightly to 1.22.'
      }
    ],
    userActions: [
      {
        id: 'u1',
        time: '09:48 AM',
        title: 'Manual Trade Execution - MSFT',
        kind: 'text',
        prompt: `User executed manual buy order for MSFT. Record trade details and rationale.`,
        output: 'Manual trade executed: 100 shares of MSFT at $380.50. User rationale: Strong earnings guidance indicates upward momentum.'
      },
      {
        id: 'u2',
        time: '09:55 AM',
        title: 'Portfolio Target Adjustment',
        kind: 'text',
        prompt: `User updated Technology sector allocation target. Record change and reason.`,
        output: 'Portfolio target updated: Technology sector allocation target adjusted from 35% to 40%. User reason: Reflect positive market outlook for tech sector.'
      },
      {
        id: 'u3',
        time: '10:05 AM',
        title: 'Stop-Loss Modification - AAPL',
        kind: 'text',
        prompt: `User modified stop-loss for AAPL position. Record change details.`,
        output: 'Stop-loss modified: AAPL stop-loss updated from $165 to $170 per share. User rationale: Recent support level suggests upward price movement.'
      }
    ],
    thesisAtInception: [
      {
        id: 't1',
        time: '10:15 AM',
        title: 'Thesis at Inception Analysis',
        kind: 'text',
        prompt: `Analyze the original portfolio thesis at inception, including sector allocations, alpha targets, and sentiment vectors. Compare against current state to identify drift.`,
        output: 'Thesis at inception established allocation targets across 5 sectors with specific alpha and Sharpe ratio goals. Initial sentiment vectors (v₀) captured baseline expectations for each sector.'
      },
      {
        id: 't2',
        time: '10:16 AM',
        title: 'Sector Allocation Calculation',
        kind: 'tool',
        prompt: `Calculate sector allocation percentages from inception portfolio holdings`,
        tool: {
          name: 'portfolio.calculateSectorAllocation',
          inputs: { date: '2023-01-15', sectors: ['Technology', 'Financial', 'Healthcare', 'Consumer', 'Utilities'] },
          result: 'Allocation calculated: Tech 35%, Financial 25%, Healthcare 20%, Consumer 15%, Utilities 5%'
        },
        output: 'Sector allocation calculated for inception date. Technology sector had highest allocation at 35%.'
      },
      {
        id: 't3',
        time: '10:17 AM',
        title: 'Sentiment Baseline Vector Generation',
        kind: 'tool',
        prompt: `Generate baseline sentiment vectors (v₀) for each sector using inception date market sentiment data`,
        tool: {
          name: 'sentiment.generateBaseline',
          inputs: { date: '2023-01-15', sectors: ['Technology', 'Financial', 'Healthcare', 'Consumer', 'Utilities'] },
          result: 'Baseline vectors generated: Tech [0.75, 0.25, 0.15], Financial [0.65, 0.20, 0.18], Healthcare [0.55, 0.30, 0.15], Consumer [0.40, 0.45, 0.20], Utilities [0.50, 0.35, 0.15]'
        },
        output: 'Baseline sentiment vectors (v₀) established for all sectors, capturing Accuracy, Precision, and Recall metrics at inception.'
      }
    ],
    alphaDecay: [
      {
        id: 'ad1',
        time: '10:20 AM',
        title: 'Alpha Decay Calculation',
        kind: 'text',
        prompt: `Calculate alpha decay by comparing inception alpha values to present alpha values for each sector. Identify sectors with significant decay.`,
        output: 'Alpha decay analysis shows Technology sector maintaining highest alpha (2.1% present vs 2.5% inception), while Consumer sector shows largest decay (0.9% present vs 1.2% inception).'
      },
      {
        id: 'ad2',
        time: '10:21 AM',
        title: 'Time Duration Calculation',
        kind: 'tool',
        prompt: `Calculate time duration from inception date to present date`,
        tool: {
          name: 'utils.calculateDuration',
          inputs: { startDate: '2023-01-15', endDate: '2024-12-20' },
          result: 'Duration: 1 year, 11 months, 5 days'
        },
        output: 'Portfolio has been active for 1 year, 11 months, and 5 days since inception.'
      },
      {
        id: 'ad3',
        time: '10:22 AM',
        title: 'Alpha Decay Visualization',
        kind: 'code',
        prompt: `Generate line graph visualization showing alpha decay from inception to present for selected sector`,
        code: {
          language: 'python',
          content: `import matplotlib.pyplot as plt\nimport numpy as np\n\n# Alpha decay visualization\ninception_alpha = 2.5\npresent_alpha = 2.1\ndecay = present_alpha - inception_alpha\n\nplt.plot([0, 1], [inception_alpha, present_alpha], 'b--', linewidth=2)\nplt.scatter([0, 1], [inception_alpha, present_alpha], s=100)\nplt.xlabel('Time')\nplt.ylabel('Alpha (%)')\nplt.title('Alpha Decay: Inception vs Present')\nplt.grid(True)\nplt.show()`
        },
        output: 'Line graph generated showing alpha trajectory from inception to present, highlighting decay pattern.'
      }
    ],
    sentimentDrift: [
      {
        id: 'sd1',
        time: '10:25 AM',
        title: 'Sentiment Drift Analysis - Internal vs External',
        kind: 'text',
        prompt: `Calculate variance between internal and external sentiment drift. Analyze sentiment drift by comparing inception sentiment vectors (v₀) with today's sentiment vectors (vₜ) using cosine similarity for both internal (portfolio manager's view) and external (market consensus) sentiment. Calculate variance as the absolute difference between internal and external drift. Identify sectors with significant variance between internal and external sentiment changes.`,
        output: 'Sentiment drift analysis comparing internal vs external sentiment: Technology sector shows internal drift of 7.2% vs external drift of 5.8% (variance: 1.4% - Aligned). Financial sector shows internal drift of 8.1% vs external drift of 6.5% (variance: 1.6% - Aligned). Healthcare sector shows internal drift of 1.7% vs external drift of 1.9% (variance: 0.2% - Aligned). Consumer sector shows internal drift of 4.8% vs external drift of 5.2% (variance: 0.4% - Aligned). Utilities sector shows internal drift of 3.8% vs external drift of 4.1% (variance: 0.3% - Aligned). Overall, internal and external sentiment drifts are well-aligned across all sectors, indicating portfolio manager\'s view aligns with market consensus.'
      }
    ],
    turnoverRate: [
      {
        id: 'br1',
        time: '11:00 AM',
        title: 'Turnover Rate Analysis',
        kind: 'text',
        prompt: `Analyze portfolio turnover rate. Calculate annualized total trades divided by portfolio value. Identify if high turnover indicates overtrading bias.`,
        output: 'Turnover rate calculated at 32%, which is below the 40% threshold for long-term portfolios. This suggests disciplined trading without overtrading bias.'
      },
      {
        id: 'br2',
        time: '11:01 AM',
        title: 'Turnover Rate Calculation',
        kind: 'tool',
        prompt: `Calculate annualized turnover rate from trade history`,
        tool: {
          name: 'portfolio.calculateTurnover',
          inputs: { period: 'annualized', trades: 1240, portfolioValue: 1000000 },
          result: 'Turnover Rate: 32%'
        },
        output: 'Annualized turnover rate: 32% (1,240 trades × $100 avg / $1M portfolio value)'
      }
    ],
    winHoldLossHold: [
      {
        id: 'bw1',
        time: '11:05 AM',
        title: 'Winning vs Losing Hold Time Analysis',
        kind: 'text',
        prompt: `Calculate ratio of average hold period for winning trades versus losing trades. Lower ratios indicate disposition effect (holding losers too long, selling winners too early).`,
        output: 'Current ratio: 1.05x (winners held 5% longer than losers). This is below the 1.2x target, suggesting potential disposition effect bias.'
      },
      {
        id: 'bw2',
        time: '11:06 AM',
        title: 'Hold Time Ratio Calculation',
        kind: 'tool',
        prompt: `Calculate average hold times for winning and losing trades`,
        tool: {
          name: 'portfolio.calculateHoldTimeRatio',
          inputs: { winners: [45, 38, 52, 41], losers: [42, 40, 48, 38] },
          result: 'Winners avg: 44 days, Losers avg: 42 days, Ratio: 1.05x'
        },
        output: 'Average hold time: Winners 44 days, Losers 42 days. Ratio: 1.05x indicates need to let winners run longer.'
      }
    ],
    addToLoser: [
      {
        id: 'ba1',
        time: '11:10 AM',
        title: 'Add-to-Loser Pattern Analysis',
        kind: 'text',
        prompt: `Analyze percentage of times portfolio manager increases position size of losing positions without fresh thesis support. High percentage indicates averaging down bias.`,
        output: 'Add-to-loser rate: 4.1% of all adds. This is below the 5% threshold, indicating disciplined position sizing without averaging down bias.'
      },
      {
        id: 'ba2',
        time: '11:11 AM',
        title: 'Add-to-Loser Pattern Detection',
        kind: 'tool',
        prompt: `Identify and count add-to-loser trades from trade history`,
        tool: {
          name: 'bias.detectAddToLoser',
          inputs: { trades: 1240, addsToLosers: 51, totalAdds: 1240 },
          result: 'Add-to-loser rate: 4.1% (51 out of 1,240 adds)'
        },
        output: 'Analysis found 51 instances of adding to losing positions (4.1% of total adds), within acceptable range.'
      }
    ],
    reentryAfterStop: [
      {
        id: 'bre1',
        time: '11:15 AM',
        title: 'Re-entry After Stop-Loss Analysis',
        kind: 'text',
        prompt: `Analyze ratio of trades where PM re-enters a position within 30 days of hitting stop-loss. High rate indicates revenge trading bias.`,
        output: 'Re-entry rate: 8.5% of stop-loss exits. This is below the 10% threshold but should be monitored for revenge trading patterns.'
      },
      {
        id: 'bre2',
        time: '11:16 AM',
        title: 'Re-entry Pattern Detection',
        kind: 'tool',
        prompt: `Detect re-entries within 30 days of stop-loss exits`,
        tool: {
          name: 'bias.detectReentry',
          inputs: { stopLossExits: 120, reentriesWithin30Days: 10 },
          result: 'Re-entry rate: 8.3% (10 out of 120 stop-loss exits)'
        },
        output: 'Detected 10 re-entries within 30 days of stop-loss (8.3% rate). Pattern analysis suggests some emotional trading.'
      },
      {
        id: 'bre3',
        time: '11:17 AM',
        title: 'Revenge Trading Pattern Identification',
        kind: 'bullets',
        prompt: `Identify specific patterns that indicate revenge trading behavior`,
        bullets: [
          'Re-entry within 12 days of stop-loss exit',
          'Increased position size on re-entry',
          'No fundamental change in thesis',
          'Negative average return on revenge trades'
        ],
        output: 'Pattern analysis reveals potential revenge trading: AAPL re-entered within 12 days with 20% larger position, resulting in -3.7% avg return.'
      }
    ],
    alertRate: [
      {
        id: 'bal1',
        time: '11:20 AM',
        title: 'Bias Alert Trigger Rate Analysis',
        kind: 'text',
        prompt: `Calculate number of bias alerts per 100 positions per month. High rate indicates frequent bias triggers requiring attention.`,
        output: 'Alert rate: 0.7 per 100 positions/month. This is below the 1.0 threshold, indicating effective bias monitoring without excessive alerts.'
      },
      {
        id: 'bal2',
        time: '11:21 AM',
        title: 'Alert Rate Calculation',
        kind: 'tool',
        prompt: `Calculate bias alert trigger rate from alert history`,
        tool: {
          name: 'bias.calculateAlertRate',
          inputs: { alerts: 7, positions: 1000, months: 1 },
          result: 'Alert rate: 0.7 per 100 positions/month'
        },
        output: 'Calculated alert rate: 7 alerts across 1,000 positions over 1 month = 0.7 per 100 positions/month.'
      }
    ],
    overrideRate: [
      {
        id: 'bo1',
        time: '11:25 AM',
        title: 'PM Override Rate Analysis',
        kind: 'text',
        prompt: `Analyze percentage of bias alerts overridden by portfolio manager. Very high override suggests PM ignoring tool; very low suggests false positives.`,
        output: 'Override rate: 46%, within the 30-70% sweet-spot. This indicates balanced tool usage - PM considers alerts but maintains judgment.'
      },
      {
        id: 'bo2',
        time: '11:26 AM',
        title: 'Override Pattern Analysis',
        kind: 'tool',
        prompt: `Calculate override rate from alert and override history`,
        tool: {
          name: 'bias.calculateOverrideRate',
          inputs: { alerts: 100, overrides: 46 },
          result: 'Override rate: 46%'
        },
        output: 'Override rate: 46 out of 100 alerts overridden (46%). This falls within the optimal range, indicating effective tool integration.'
      },
      {
        id: 'bo3',
        time: '11:27 AM',
        title: 'Override Rate Interpretation',
        kind: 'bullets',
        prompt: `Interpret override rate patterns and their implications`,
        bullets: [
          '30-70% sweet-spot: Balanced tool usage',
          '>70%: PM may be ignoring tool recommendations',
          '<30%: Possible false positives or over-reliance',
          'Pattern analysis: Consistent override rate suggests stable decision-making'
        ],
        output: 'Current override rate of 46% indicates healthy balance between tool recommendations and PM judgment.'
      }
    ],
    holdings: [
      {
        id: 'h1',
        time: '10:30 AM',
        title: 'Technology Sector Holdings Analysis',
        kind: 'text',
        prompt: `Analyze Technology sector holdings, identify top 10 positions, and flag any red flags or risk indicators for each holding.`,
        output: 'Technology sector holdings analyzed. Top 10 positions identified with total values. Red flags detected for GOOGL (P/E ratio 35% above sector median), META (SEC investigation pending, EBITDA margin declined 15% YoY), TSLA (Short interest increased 40% in past month, Free cash flow negative for 2 consecutive quarters, Management guidance lowered for Q4), and AMD (EBITDA margin declined 12% YoY).'
      },
      {
        id: 'h2',
        time: '10:31 AM',
        title: 'Red Flag Detection - Valuation Check',
        kind: 'tool',
        prompt: `Check for overvaluation flags in Technology sector holdings`,
        tool: {
          name: 'risk.checkValuation',
          inputs: { sector: 'Technology', threshold: 'P/E > sector_median + 30%' },
          result: 'Valuation concern detected: GOOGL (P/E ratio 35% above sector median)'
        },
        output: 'Valuation check completed. P/E ratio concern raised for GOOGL, which is trading 35% above sector median.'
      },
      {
        id: 'h3',
        time: '10:32 AM',
        title: 'Regulatory Flag Check',
        kind: 'tool',
        prompt: `Check for regulatory flags including SEC investigations and compliance warnings`,
        tool: {
          name: 'risk.checkRegulatory',
          inputs: { sector: 'Technology', checkTypes: ['sec_investigations', 'compliance_warnings'] },
          result: 'Regulatory flags detected: META (SEC investigation pending)'
        },
        output: 'Regulatory check completed. SEC investigation pending flag raised for META.'
      },
      {
        id: 'h4',
        time: '10:33 AM',
        title: 'Financial Metrics Check - EBITDA Margins & Cash Flow',
        kind: 'tool',
        prompt: `Check EBITDA margins and free cash flow trends for Technology holdings`,
        tool: {
          name: 'risk.checkFinancialMetrics',
          inputs: { sector: 'Technology', metrics: ['ebitda_margin_yoy', 'free_cash_flow'] },
          result: 'Financial concerns detected: META (EBITDA margin declined 15% YoY), TSLA (Free cash flow negative for 2 consecutive quarters), AMD (EBITDA margin declined 12% YoY)'
        },
        output: 'Financial metrics analysis completed. EBITDA margin declines detected for META (15% YoY) and AMD (12% YoY). Free cash flow concern raised for TSLA (negative for 2 consecutive quarters).'
      },
      {
        id: 'h5',
        time: '10:34 AM',
        title: 'Market Sentiment & Guidance Check',
        kind: 'tool',
        prompt: `Check short interest trends and management guidance changes`,
        tool: {
          name: 'risk.checkMarketSentiment',
          inputs: { sector: 'Technology', metrics: ['short_interest', 'guidance_changes'] },
          result: 'Market sentiment concerns detected: TSLA (Short interest increased 40% in past month, Management guidance lowered for Q4)'
        },
        output: 'Market sentiment check completed. Short interest increased 40% for TSLA in past month. Management guidance lowered for Q4.'
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
        " Analyzing tool requirements...",
        " Preparing tool inputs...",
        " Executing tool: " + (entry.tool?.name || 'unknown'),
        " Processing results...",
        " Validating output format...",
        " Tool execution completed successfully."
      ];
    } else if (entry.kind === 'bullets') {
      return [
        " Processing portfolio data...",
        " Identifying key performance indicators...",
        " Analyzing benchmark comparison...",
        " Extracting actionable insights...",
        " Formatting key points...",
        " Briefing generation complete."
      ];
    } else if (entry.kind === 'code') {
      return [
        " Parsing request parameters...",
        " Generating code structure...",
        " Applying business logic...",
        " Formatting output...",
        " Validating syntax...",
        " Code generation complete."
      ];
    } else {
      return [
        " Processing input...",
        " Analyzing context...",
        " Applying portfolio management rules...",
        " Evaluating market conditions...",
        " Generating response...",
         "Analysis complete."
      ];
    }
  };

  const generateDynamicOutput = (entry, finalInputs) => {
    if (entry.kind === 'tool') {
      const toolName = entry.tool?.name || '';
      const inputs = finalInputs || entry.tool?.inputs || {};
      
      // Generate meaningful output based on tool type and inputs
      if (toolName.includes('volatility') || toolName.includes('Volatility')) {
        const realizedVol = inputs.realizedVol || inputs.realizedVolatility;
        const targetVol = inputs.targetVol || inputs.targetVolatility;
        const beta = inputs.beta;
        if (realizedVol && targetVol) {
          const diff = realizedVol - targetVol;
          const status = diff > 0 ? 'exceeds' : 'below';
          return `Volatility analysis: Realized volatility (${realizedVol}%) is ${Math.abs(diff).toFixed(1)}% ${status} target (${targetVol}%).${beta ? ` Portfolio beta: ${beta}.` : ''} ${diff > 0 ? 'Mitigation recommended.' : 'Within acceptable range.'}`;
        }
      } else if (toolName.includes('Sharpe') || toolName.includes('sharpe')) {
        const riskFreeRate = inputs.riskFreeRate;
        const portfolioReturn = inputs.portfolioReturn || inputs.return;
        const volatility = inputs.volatility || inputs.vol;
        if (riskFreeRate !== undefined && portfolioReturn !== undefined && volatility !== undefined) {
          const sharpe = ((portfolioReturn - riskFreeRate) / volatility).toFixed(2);
          const assessment = sharpe > 1.5 ? 'excellent' : sharpe > 1.0 ? 'good' : sharpe > 0.5 ? 'moderate' : 'poor';
          return `Sharpe Ratio calculated: ${sharpe} (${assessment} risk-adjusted return). Based on risk-free rate ${riskFreeRate}%, portfolio return ${portfolioReturn}%, and volatility ${volatility}%.`;
        }
      } else if (toolName.includes('YTD') || toolName.includes('ytd')) {
        const startDate = inputs.startDate;
        const endDate = inputs.endDate;
        const benchmark = inputs.benchmark;
        if (startDate && endDate) {
          return `YTD Return calculated from ${startDate} to ${endDate}.${benchmark ? ` Benchmark: ${benchmark}.` : ''}`;
        }
      } else if (toolName.includes('beta') || toolName.includes('Beta')) {
        const beta = inputs.beta || inputs.portfolioBeta;
        if (beta !== undefined) {
          const assessment = beta > 1.2 ? 'aggressive' : beta > 0.8 ? 'moderate' : 'defensive';
          return `Portfolio Beta calculated: ${beta.toFixed(2)} (${assessment} risk profile).`;
        }
      } else if (toolName.includes('schedule') || toolName.includes('Schedule') || toolName.includes('calendar')) {
        const timeHorizon = inputs.timeHorizon;
        const focus = inputs.focus;
        return `Calendar review scheduled${timeHorizon ? ` for ${timeHorizon}` : ''}.${focus ? ` Focus: ${focus.replace(/_/g, ' ')}.` : ''}`;
      }
      
      // Generic tool output with inputs
      const inputStr = Object.keys(inputs).map(k => `${k}: ${inputs[k]}`).join(', ');
      return `Tool executed successfully. Inputs: ${inputStr || 'none'}.`;
    } else if (entry.kind === 'bullets') {
      // Extract key values from prompt if possible
      const prompt = entry.prompt || '';
      if (prompt.includes('YTD') || prompt.includes('benchmark')) {
        return 'Portfolio briefing generated with updated metrics and actionable insights based on current portfolio performance.';
      }
      return 'Portfolio briefing generated with updated key points and recommendations.';
    } else if (entry.kind === 'text') {
      const prompt = entry.prompt || '';
      if (prompt.toLowerCase().includes('volatility')) {
        return 'Risk analysis updated: Volatility assessment revised based on current market conditions and portfolio composition.';
      } else if (prompt.toLowerCase().includes('exposure') || prompt.toLowerCase().includes('rebalance')) {
        return 'Rebalancing analysis updated: Sector exposure recommendations revised based on current allocations and target thresholds.';
      } else if (prompt.toLowerCase().includes('performance')) {
        return 'Performance analysis updated: Metrics recalculated based on latest portfolio data and market conditions.';
      }
      return 'Analysis updated based on revised inputs and current portfolio context.';
    } else {
      return 'Analysis complete with updated results.';
    }
  };

  const rerunThinking = (entry, section) => {
    // Capture current editing state
    const isEditing = editingThoughtId === entry.id;
    const currentEditPrompt = isEditing ? editPrompt : entry.prompt;
    const currentEditInputs = (isEditing && entry.kind === 'tool' && editToolInputs && Object.keys(editToolInputs).length > 0) 
      ? editToolInputs 
      : entry.tool?.inputs || {};
    
    // Create updated entry with current edits
    const updatedEntry = isEditing ? {
      ...entry,
      prompt: currentEditPrompt,
      ...(entry.kind === 'tool' ? { tool: { ...entry.tool, inputs: currentEditInputs } } : {})
    } : entry;
    
    // Start thinking animation
    setThinkingEntry({ section, entryId: entry.id });
    setThinkingText('');
    
    const mockLines = getMockReasoningText(updatedEntry);
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
            
            // Use the updated entry with edits
            const finalEntry = {
              ...updatedEntry,
              prompt: currentEditPrompt,
              ...(updatedEntry.kind === 'tool' ? { tool: { ...updatedEntry.tool, inputs: currentEditInputs } } : {})
            };
            
            const dynamicOutput = generateDynamicOutput(finalEntry, currentEditInputs);
            return {
              ...finalEntry,
              time: timestamp,
              output: `[Re-run ${timestamp}] ${dynamicOutput}`
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

  // Auto-scroll chat messages to bottom (only if user hasn't scrolled up)
  useEffect(() => {
    if (chatMessages.length > 0) {
      const messagesElement = document.querySelector('.chatbot-messages');
      if (messagesElement) {
        const scrollHeight = messagesElement.scrollHeight;
        const clientHeight = messagesElement.clientHeight;
        
        // Only attempt to scroll if content actually overflows
        if (scrollHeight > clientHeight) {
          // Check if user is near the bottom (within 150px) before auto-scrolling
          const distanceFromBottom = scrollHeight - messagesElement.scrollTop - clientHeight;
          const isNearBottom = distanceFromBottom < 150;
          // Only auto-scroll if user hasn't manually scrolled up AND is near bottom
          if (!userScrolledUpRef.current && isNearBottom) {
            // Use requestAnimationFrame to ensure smooth scrolling
            requestAnimationFrame(() => {
              isProgrammaticScrollRef.current = true;
              messagesElement.scrollTop = scrollHeight;
            });
          }
        } else {
          // Content fits in viewport, no need to scroll
          // Reset scroll state to allow future scrolling when content grows
          userScrolledUpRef.current = false;
        }
      }
    }
  }, [chatMessages]);

  // Track user scroll position
  useEffect(() => {
    if (!showChatbot) return;
    
    const messagesElement = document.querySelector('.chatbot-messages');
    if (!messagesElement) return;

    let scrollTimeout = null;
    const handleScroll = () => {
      // Don't update userScrolledUpRef if this is a programmatic scroll
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      
      // Debounce scroll handling to prevent flickering
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        const scrollHeight = messagesElement.scrollHeight;
        const clientHeight = messagesElement.clientHeight;
        
        // Only check scroll position if content actually overflows
        if (scrollHeight > clientHeight) {
          const distanceFromBottom = scrollHeight - messagesElement.scrollTop - clientHeight;
          const isAtBottom = distanceFromBottom < 150;
          
          if (isStreaming) {
            // During streaming: be more lenient with thresholds to allow manual scrolling
            // Only mark as scrolled up if user is far from bottom (>300px)
            if (distanceFromBottom > 300) {
              userScrolledUpRef.current = true;
            } else if (distanceFromBottom < 100) {
              // User scrolled back to bottom
              userScrolledUpRef.current = false;
            }
            // Between 100-300px: keep current state to prevent flickering
          } else {
            // When not streaming: normal behavior
            if (distanceFromBottom > 200) {
              userScrolledUpRef.current = true;
            } else if (isAtBottom) {
              userScrolledUpRef.current = false;
            }
          }
        } else {
          // Content fits in viewport, user can't scroll up
          userScrolledUpRef.current = false;
        }
      }, 100); // 100ms debounce for smoother handling
    };

    messagesElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      messagesElement.removeEventListener('scroll', handleScroll);
    };
  }, [showChatbot, isStreaming]);

  // Stop/pause streaming function
  const handleStopStreaming = () => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setIsStreaming(false);
    setIsPaused(true);
  };

  // Resume streaming function
  const handleResumeStreaming = () => {
    if (streamingMessageIndexRef.current === null || streamingWordsRef.current.length === 0) {
      return;
    }

    // Clear any existing interval
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }

    setIsStreaming(true);
    setIsPaused(false);

    // Resume streaming from where we left off
    let charIndex = currentCharIndexRef.current;
    streamingIntervalRef.current = setInterval(() => {
      if (charIndex < streamingWordsRef.current.length) {
        const currentText = streamingWordsRef.current.slice(0, charIndex + 1).join('');
        setChatMessages((prev) => {
          const msgIndex = streamingMessageIndexRef.current;
          if (msgIndex !== null && msgIndex < prev.length) {
            return prev.map((msg, idx) => {
              if (idx === msgIndex && msg.role === 'assistant' && !msg.type) {
                return { ...msg, content: currentText, isStreaming: true };
              }
              return msg;
            });
          }
          return prev;
        });
        
        // Removed auto-scroll during streaming to prevent text from sticking to bottom
        // User can manually scroll if they want to see the streaming text
        
        charIndex++;
        currentCharIndexRef.current = charIndex;
      } else {
        // Streaming complete
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        setIsStreaming(false);
        setIsPaused(false);
        // Remove isStreaming flag
        setChatMessages((prev) => {
          const msgIndex = streamingMessageIndexRef.current;
          if (msgIndex !== null && msgIndex < prev.length) {
            return prev.map((msg, idx) => {
              if (idx === msgIndex && msg.role === 'assistant' && !msg.type) {
                const { isStreaming, ...rest } = msg;
                return rest;
              }
              return msg;
            });
          }
          return prev;
        });
        streamingMessageIndexRef.current = null;
        streamingWordsRef.current = [];
        currentCharIndexRef.current = 0;
      }
    }, 25); // 25ms per letter
  };

  // Normalize assistant content into messages, with special handling for [PLAN] prefix
  const handleAssistantContent = (text) => {
    if (!text || typeof text !== 'string') {
      console.log('[handleAssistantContent] Invalid text:', text);
      return;
    }

    const trimmed = text.trim();
    console.log('[handleAssistantContent] Received text (first 200 chars):', trimmed.substring(0, 200));
    console.log('[handleAssistantContent] Full text length:', trimmed.length);
    console.log('[handleAssistantContent] Starts with [PLAN]:', trimmed.startsWith('[PLAN]'));

    // If no [PLAN] tag, treat as a normal assistant message
    if (!trimmed.startsWith('[PLAN]')) {
      console.log('[handleAssistantContent] No [PLAN] tag, treating as normal message');
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: text
        }
      ]);
      return;
    }

    // Strip the [PLAN] tag
    const withoutTag = trimmed.replace(/^\s*\[PLAN\]\s*/i, '');
    console.log('[handleAssistantContent] After removing [PLAN] tag (first 200 chars):', withoutTag.substring(0, 200));

    // Try to split plan vs answer for one-line formats like:
    // [PLAN] intent: ... | tools: ... | symbols: NFLX  The research analysis...
    let planText = '';
    let answerText = '';

    const doubleSpaceMatch = withoutTag.match(/^(.*?\S)(\s{2,})([\s\S]*)$/);
    console.log('[handleAssistantContent] Double space match:', !!doubleSpaceMatch);
    if (doubleSpaceMatch) {
      planText = (doubleSpaceMatch[1] || '').trim();
      answerText = (doubleSpaceMatch[3] || '').trim();
      console.log('[handleAssistantContent] Split on double space:');
      console.log('  Plan text:', planText);
      console.log('  Answer text (first 100 chars):', answerText.substring(0, 100));
    } else {
      // Fallback: split on first blank line if the backend uses newlines
      const segments = withoutTag.split(/\n\s*\n/);
      planText = (segments[0] || '').trim();
      answerText = segments.slice(1).join('\n\n').trim();
      console.log('[handleAssistantContent] Split on blank line:');
      console.log('  Segments count:', segments.length);
      console.log('  Plan text:', planText);
      console.log('  Answer text (first 100 chars):', answerText.substring(0, 100));
    }

    console.log('[handleAssistantContent] Final split:');
    console.log('  Plan text length:', planText.length);
    console.log('  Answer text length:', answerText.length);
    console.log('  Will create plan message:', !!planText);
    console.log('  Will create answer message:', !!answerText);

    setChatMessages((prev) => {
      const next = [...prev];

      if (planText) {
        console.log('[handleAssistantContent] Adding plan message');
        next.push({
          role: 'assistant',
          type: 'plan',
          content: planText
        });
      }

      if (answerText) {
        console.log('[handleAssistantContent] Adding answer message');
        next.push({
          role: 'assistant',
          content: answerText
        });
      }

      console.log('[handleAssistantContent] Total messages after adding:', next.length);
      return next;
    });
  };

  // Close chatbot when agent mode is turned off
  useEffect(() => {
    if (!isAgentMode && showChatbot) {
      setShowChatbot(false);
    }
  }, [isAgentMode, showChatbot]);

  // Cleanup streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    // Close existing connection if any
    setWsConnection(prev => {
      if (prev) {
        prev.close();
      }
      return null;
    });

    try {
      // Try direct connection first (bypass proxy for WebSocket)
      // If that fails, we can fall back to proxy
      const wsUrl = 'ws://localhost:8000/chat/ws';
      console.log('Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully to', wsUrl);
        setWsConnected(true);
        setWsConnection(ws);
        // Clear any previous error messages
        setChatMessages(prev => {
          const filtered = prev.filter(msg => 
            !msg.content.includes('Unable to connect') && 
            !msg.content.includes('Error connecting')
          );
          if (filtered.length === 0 || filtered[filtered.length - 1].role !== 'assistant') {
            return [...filtered, { 
              role: 'assistant', 
              content: 'Connected to AI Agent. How can I help you?' 
            }];
          }
          return filtered;
        });
      };

      ws.onmessage = (event) => {
        console.log('[WebSocket] Raw event.data type:', typeof event.data);
        console.log('[WebSocket] Raw event.data (first 500 chars):', event.data.substring(0, 500));
        
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Parsed JSON data:', data);

          // Handle the new response format with metadata.plan_summary
          if (data.type === 'message' && data.metadata && data.metadata.plan_summary) {
            const planSummary = data.metadata.plan_summary;
            
            // Format plan summary as: intent: X | tools: Y | symbols: Z
            const planParts = [];
            if (planSummary.intent) {
              planParts.push(`intent: ${planSummary.intent}`);
            }
            if (planSummary.tools && Array.isArray(planSummary.tools)) {
              planParts.push(`tools: ${planSummary.tools.join(', ')}`);
            }
            if (planSummary.symbols && Array.isArray(planSummary.symbols)) {
              planParts.push(`symbols: ${planSummary.symbols.join(', ')}`);
            }
            const planText = planParts.join(' | ');

            // Get the content
            const content = data.content || '';

            console.log('[WebSocket] Plan summary:', planText);
            console.log('[WebSocket] Content length:', content.length);

            // Add plan message if we have plan text
            if (planText) {
              setChatMessages((prev) => {
                // Check if plan message already exists (avoid duplicates)
                const hasPlan = prev.some(msg => msg.type === 'plan' && msg.content === planText);
                if (hasPlan) {
                  return prev;
                }
                return [...prev, {
                  role: 'assistant',
                  type: 'plan',
                  content: planText
                }];
              });
            }

            // Handle streaming content letter-by-letter
            if (content) {
              // Clear any existing streaming interval
              if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
                streamingIntervalRef.current = null;
              }

              // Split content into characters (preserving all characters including spaces, newlines, etc.)
              const characters = content.split('');
              streamingWordsRef.current = characters;
              setIsStreaming(true);
              userScrolledUpRef.current = false; // Reset scroll position when new streaming starts
              
              // Add empty answer message first
              setChatMessages((prev) => {
                // Check if answer message already exists
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.type && lastMsg.isStreaming) {
                  // Update existing streaming message
                  streamingMessageIndexRef.current = prev.length - 1;
                  return prev;
                }
                // Add new streaming message
                const newIndex = prev.length;
                streamingMessageIndexRef.current = newIndex;
                return [...prev, {
                  role: 'assistant',
                  content: '',
                  isStreaming: true
                }];
              });

              // Start streaming letters one by one
              currentCharIndexRef.current = 0;
              let charIndex = 0;
              streamingIntervalRef.current = setInterval(() => {
                if (charIndex < streamingWordsRef.current.length) {
                  const currentText = streamingWordsRef.current.slice(0, charIndex + 1).join('');
                  setChatMessages((prev) => {
                    const msgIndex = streamingMessageIndexRef.current;
                    if (msgIndex !== null && msgIndex < prev.length) {
                      return prev.map((msg, idx) => {
                        if (idx === msgIndex && msg.role === 'assistant' && !msg.type) {
                          return { ...msg, content: currentText, isStreaming: true };
                        }
                        return msg;
                      });
                    }
                    return prev;
                  });
                  
                  // Removed auto-scroll during streaming to prevent text from sticking to bottom
                  // User can manually scroll if they want to see the streaming text
                  
                  charIndex++;
                  currentCharIndexRef.current = charIndex;
                } else {
                  // Streaming complete
                  if (streamingIntervalRef.current) {
                    clearInterval(streamingIntervalRef.current);
                    streamingIntervalRef.current = null;
                  }
                  setIsStreaming(false);
                  setIsPaused(false);
                  // Remove isStreaming flag
                  setChatMessages((prev) => {
                    const msgIndex = streamingMessageIndexRef.current;
                    if (msgIndex !== null && msgIndex < prev.length) {
                      return prev.map((msg, idx) => {
                        if (idx === msgIndex && msg.role === 'assistant' && !msg.type) {
                          const { isStreaming, ...rest } = msg;
                          return rest;
                        }
                        return msg;
                      });
                    }
                    return prev;
                  });
                  streamingMessageIndexRef.current = null;
                  streamingWordsRef.current = [];
                  currentCharIndexRef.current = 0;
                }
              }, 25); // 25ms per letter (adjust for speed - faster than word-by-word)
            }
          } else {
            // Fallback: handle old format or plain text
            let rawContent = null;
            if (data.type === 'message' || data.message) {
              rawContent = data.message || data.content || data.text || JSON.stringify(data);
            } else if (typeof data.content === 'string') {
              rawContent = data.content;
            } else if (typeof data === 'string') {
              rawContent = data;
            } else {
              rawContent = JSON.stringify(data);
            }

            console.log('[WebSocket] Extracted rawContent (first 200 chars):', rawContent ? rawContent.substring(0, 200) : 'null');
            handleAssistantContent(rawContent);
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing JSON, treating as plain text:', err);
          console.log('[WebSocket] Using event.data as plain text (first 200 chars):', event.data.substring(0, 200));
          // If not JSON, treat as plain text
          handleAssistantContent(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket URL attempted:', wsUrl);
        setWsConnected(false);
        // Don't add error message here - let onclose handle it with more details
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        console.log('Close code:', event.code);
        console.log('Close reason:', event.reason || 'No reason provided');
        setWsConnected(false);
        setWsConnection(null);
        
        // Only show error message if it wasn't a normal closure
        if (event.code !== 1000) {
          let errorMessage = 'Unable to connect to chat server. ';
          if (event.code === 1006) {
            errorMessage += 'The connection was closed abnormally. Please check if the backend server is running on port 8000.';
          } else if (event.code === 1001) {
            errorMessage += 'The server is going away.';
          } else {
            errorMessage += `Connection closed with code ${event.code}. Please check if the backend server is running on port 8000.`;
          }
          
          setChatMessages(prev => {
            // Only add error message if it's not already the last message
            const lastMessage = prev[prev.length - 1];
            if (!lastMessage || lastMessage.content !== errorMessage) {
              return [...prev, { role: 'assistant', content: errorMessage }];
            }
            return prev;
          });
        }
      };

      setWsConnection(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
        content: 'Failed to connect to chat server. Please check your connection.'
      }]);
    }
  }, []);

  // Clean up WebSocket and streaming on unmount or when chatbot closes
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
    };
  }, [wsConnection]);

  // Initialize WebSocket when chatbot opens
  useEffect(() => {
    if (showChatbot && isAgentMode && !wsConnection) {
      initializeWebSocket();
    }
  }, [showChatbot, isAgentMode, wsConnection, initializeWebSocket]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const message = chatInput.trim();
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
      setChatInput('');

    // Send message via WebSocket if connected
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        // Send message as JSON
        wsConnection.send(JSON.stringify({
          type: 'message',
          content: message
        }));
        console.log('Sent message via WebSocket:', message);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Error sending message. Please try again.'
        }]);
      }
    } else {
      // If WebSocket is not connected, try to initialize it
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connecting to chat server... Please wait and try sending your message again.'
      }]);
      initializeWebSocket();
    }
  };

  const handleChatInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCloseChatbot = () => {
    setShowChatbot(false);
    setIsChatExpanded(false);
    // Clear streaming interval
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    streamingWordsRef.current = [];
    streamingMessageIndexRef.current = null;
    currentCharIndexRef.current = 0;
    setIsStreaming(false);
    setIsPaused(false);
    userScrolledUpRef.current = false;
    // Close WebSocket connection when closing chatbot
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
      setWsConnected(false);
    }
  };

  const handleShowReasoning = (section) => {
    setShowThinkingPopover(section);
    setContextMenu(null);
    setBiasPopover(null);
    setBiasInfoPopover(null);
  };

  const handleCloseReasoning = () => {
    setShowThinkingPopover(null);
  };

  const handleAskAgentFromReasoning = (content) => {
    if (!content) return;
    setShowThinkingPopover(null);
    setContextMenu(null);
    setBiasPopover(null);
    setBiasInfoPopover(null);
    setChatInput(''); // Don't pre-fill the input with content
    setShowChatbot(true);
    setChatMessages([]);
    // Initialize WebSocket connection when opening chatbot
    initializeWebSocket();
  };

  const handleReviewClick = () => {
    setShowHoldingsPopup(true);
    setRedFlagTooltip(null); // Reset tooltip when opening popup
  };

  const handleOptimizeClick = () => {
    setShowOptimizationPopup(true);
  };

  const handleActionButtonClick = (e, type) => {
    e.stopPropagation();

    if (actionsPopover && actionsPopover.type === type) {
      setActionsPopover(null);
      return;
    }

    setActionsPopover({ type });
  };

  const toggleHoldingExpansion = (holdingId) => {
    setExpandedHoldingId(expandedHoldingId === holdingId ? null : holdingId);
  };

  const handleRedFlagClick = (e, holdingId, flagIndex) => {
    e.stopPropagation();
    // Toggle tooltip if clicking the same flag
    if (redFlagTooltip && redFlagTooltip.holdingId === holdingId && redFlagTooltip.flagIndex === flagIndex) {
      setRedFlagTooltip(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setRedFlagTooltip({
      holdingId,
      flagIndex,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  // Close red flag tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (redFlagTooltip) {
        setRedFlagTooltip(null);
      }
    };
    if (redFlagTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [redFlagTooltip]);

  const handleSentimentDriftClick = async (e, sector, type, baselineVector, todayVector) => {
    e.stopPropagation();
    // Toggle tooltip if clicking the same cell
    if (sentimentDriftTooltip && sentimentDriftTooltip.sector === sector && sentimentDriftTooltip.type === type) {
      setSentimentDriftTooltip(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipHeight = 250; // Estimated tooltip height (increased for safety)
    const tooltipMargin = 20; // Margin from viewport edges
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const spaceBelow = windowHeight - rect.bottom - tooltipMargin;
    const spaceAbove = rect.top - tooltipMargin;
    
    // Position above if there's not enough space below (with margin) OR if there's more space above
    let positionAbove = spaceBelow < (tooltipHeight + tooltipMargin) || (spaceAbove > spaceBelow && spaceAbove > tooltipHeight);
    
    // Calculate y position, ensuring tooltip stays within viewport
    // Note: transform adds offset (10px below, or -100% - 10px above)
    const transformOffset = 12; // Offset added by transform when positioning below
    let tooltipY;
    
    // Check if positioning below would cause clipping, and force above if so
    if (!positionAbove) {
      const testBottomY = rect.bottom + transformOffset + tooltipHeight;
      if (testBottomY > windowHeight - tooltipMargin) {
        positionAbove = true;
      }
    }
    
    if (positionAbove) {
      // Position above: use top of cell, but ensure tooltip doesn't go above viewport
      // Transform will move it up by 100% + 10px, so we need to account for that
      tooltipY = Math.max(tooltipMargin + tooltipHeight + transformOffset, rect.top);
    } else {
      // Position below: use bottom of cell
      // Transform adds 10px offset
      tooltipY = rect.bottom;
    }
    
    // Clamp x position within viewport
    const tooltipWidth = 280;
    const halfTooltipWidth = tooltipWidth / 2;
    let tooltipX = rect.left + (rect.width / 2);
    if (tooltipX - halfTooltipWidth < tooltipMargin) {
      tooltipX = halfTooltipWidth + tooltipMargin;
    } else if (tooltipX + halfTooltipWidth > windowWidth - tooltipMargin) {
      tooltipX = windowWidth - halfTooltipWidth - tooltipMargin;
    }
    
    // Use hardcoded baseline (revert to original)
    const finalBaselineVector = baselineVector;
    
    // For Internal sentiment drift, fetch today (vₜ) vector from API if sector is supported
    let finalTodayVector = todayVector;
    const normalizedSector = sector.toLowerCase();
    const sectorsWithAPI = ['technology', 'consumer', 'financial', 'utilities'];
    
    if (type === 'internal' && sectorsWithAPI.includes(normalizedSector)) {
      console.log(`Fetching today vector for Internal sentiment drift - ${sector} sector`);
      
      // Check cache first
      const cached = sectorSentimentData[normalizedSector];
      if (cached && cached.baselineVector && !cached.loading) {
        console.log('Using cached today vector for Internal sentiment drift:', cached.baselineVector);
        // Use the API v0 data as today vector
        finalTodayVector = cached.baselineVector;
      } else {
        // Show loading state
    setSentimentDriftTooltip({
      sector,
      type,
          baselineVector: finalBaselineVector,
          todayVector: null, // Will show loading
          loading: true,
          x: tooltipX,
          y: tooltipY,
          positionAbove
        });
        
        // Fetch the data
        const fetchedVector = await fetchSectorSentimentData(sector);
        
        if (fetchedVector) {
          // Use the API v0 data as today vector
          finalTodayVector = fetchedVector;
          console.log('Fetched today vector for Internal sentiment drift:', fetchedVector);
        } else {
          // Fetch failed, use original today vector
          const stateForSector = sectorSentimentData[normalizedSector];
          if (stateForSector && stateForSector.baselineVector) {
            finalTodayVector = stateForSector.baselineVector;
          } else {
            // Use the provided todayVector as fallback
            finalTodayVector = todayVector;
            console.warn(`Failed to fetch today vector for ${sector}, using default`);
          }
        }
      }
    }
    
    setSentimentDriftTooltip({
      sector,
      type,
      baselineVector: finalBaselineVector,
      todayVector: finalTodayVector,
      loading: false,
      x: tooltipX,
      y: tooltipY,
      positionAbove
    });
  };

  // Close sentiment drift tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (sentimentDriftTooltip) {
        setSentimentDriftTooltip(null);
      }
    };
    if (sentimentDriftTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [sentimentDriftTooltip]);

  // Close actions popover when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (actionsPopover) {
        setActionsPopover(null);
      }
    };
    if (actionsPopover) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionsPopover]);

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

  const renderChatbot = () => {
    if (!showChatbot || !isAgentMode) return null;
    
    return (
      <div className="chatbot-panel">
        <div className="chatbot-header">
          <div className="chatbot-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>AI Agent</span>
            {wsConnected ? (
              <span className="chatbot-status connected" title="Connected">●</span>
            ) : (
              <span className="chatbot-status disconnected" title="Disconnected">○</span>
            )}
          </div>
          <button className="chatbot-close" onClick={handleCloseChatbot}>
            ✕
          </button>
        </div>
        <div className="chatbot-messages">
          {chatMessages.length === 0 ? (
            <div className="chatbot-welcome">
              <p>Ask me anything about this analysis...</p>
            </div>
          ) : (
            chatMessages.map((msg, index) => {
              console.log(`[renderChatbot] Rendering message ${index}:`, {
                role: msg.role,
                type: msg.type,
                contentLength: msg.content?.length,
                contentPreview: msg.content?.substring(0, 50)
              });
              return (
                <div
                  key={index}
                  className={`chat-message ${msg.role} ${
                    msg.type === 'plan' ? 'plan-message' : ''
                  }`}
                >
                  {msg.type === 'plan' && (
                    <div className="message-label">Plan</div>
                  )}
                <div 
                  className="message-content"
                  tabIndex={-1}
                  style={{ outline: 'none' }}
                >
                  {msg.content}
                </div>
              </div>
              );
            })
          )}
        </div>
        <div className={`chatbot-input-container ${isChatExpanded ? 'expanded' : ''}`}>
          <textarea
            className="chatbot-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatInputKeyDown}
            placeholder="Ask the agent..."
            rows={isChatExpanded ? 8 : 3}
          />
          <div className="chatbot-input-actions">
            {isStreaming && (
              <button
                className="chatbot-stop-btn"
                onClick={handleStopStreaming}
                title="Stop streaming"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Stop
              </button>
            )}
            {isPaused && !isStreaming && (
              <button
                className="chatbot-resume-btn"
                onClick={handleResumeStreaming}
                title="Resume streaming"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Resume
              </button>
            )}
            <button
              className="chatbot-expand-btn"
              onClick={() => setIsChatExpanded(!isChatExpanded)}
              aria-label={isChatExpanded ? 'Collapse' : 'Expand'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isChatExpanded ? (
                  <path d="M18 15l-6-6-6 6"/>
                ) : (
                  <path d="M6 9l6 6 6-6"/>
                )}
              </svg>
            </button>
            <button
              className="chatbot-send-btn"
              onClick={handleSendMessage}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHoldingsPopup = () => {
    if (!showHoldingsPopup) return null;

    return (
      <div className="holdings-popover-centered" onClick={(e) => e.stopPropagation()}>
        <div className="holdings-popover-overlay" onClick={() => {
          setShowHoldingsPopup(false);
          setRedFlagTooltip(null);
        }}></div>
        <div className="holdings-popover-content">
          <div className="holdings-popover-header">
            <h2>Technology Sector Holdings</h2>
            <button className="popover-close" onClick={() => {
              setShowHoldingsPopup(false);
              setRedFlagTooltip(null);
            }}>✕</button>
          </div>
          <div className="holdings-table-container">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Ticker / CUSIP</th>
                  <th>Total Value</th>
                  <th>Red Flags</th>
                </tr>
              </thead>
              <tbody>
                {technologyHoldings.map((holding) => (
                  <React.Fragment key={holding.id}>
                    <tr className="holdings-row">
                      <td className="ticker-cell">
                        <div className="ticker-info">
                          <span className="ticker-symbol">{holding.ticker}</span>
                          <span className="ticker-cusip">{holding.cusip}</span>
                        </div>
                      </td>
                      <td className="value-cell">
                        <button
                          className="value-button"
                          onClick={() => toggleHoldingExpansion(holding.id)}
                        >
                          {formatValue(holding.totalValue)}
                          <svg 
                            className={`expand-icon ${expandedHoldingId === holding.id ? 'expanded' : ''}`}
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                      </td>
                      <td className="flags-cell">
                        <div className="flags-container">
                          {holding.redFlags.length === 0 ? (
                            <span className="flag-icon green-flag" title="No red flags">
                              🟢
                            </span>
                          ) : (
                            holding.redFlags.map((flag, flagIndex) => (
                              <button
                                key={flagIndex}
                                className="flag-icon red-flag"
                                onClick={(e) => handleRedFlagClick(e, holding.id, flagIndex)}
                                title={flag}
                              >
                                🚩
                              </button>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedHoldingId === holding.id && (
                      <tr className="mf-breakdown-row">
                        <td colSpan="3" className="mf-breakdown-cell">
                          <div className="mf-breakdown-content">
                            <div className="mf-breakdown-header">Value per Mutual Fund</div>
                            <table className="mf-breakdown-table">
                              <thead>
                                <tr>
                                  <th>Mutual Fund</th>
                                  <th>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {holding.mfBreakdown.map((mf, index) => (
                                  <tr key={index}>
                                    <td>{mf.mfName}</td>
                                    <td>{formatValue(mf.value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {redFlagTooltip && (() => {
            const holding = technologyHoldings.find(h => h.id === redFlagTooltip.holdingId);
            const flagSource = holding?.redFlags[redFlagTooltip.flagIndex];
            if (!flagSource) return null;
            return ReactDOM.createPortal(
              <div
                className="red-flag-tooltip"
                style={{
                  position: 'fixed',
                  left: `${redFlagTooltip.x}px`,
                  top: `${redFlagTooltip.y}px`,
                  transform: 'translateX(-50%) translateY(-100%)',
                  zIndex: 10001
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="red-flag-tooltip-content">
                  <div className="red-flag-tooltip-header">Red Flag Source</div>
                  <div className="red-flag-tooltip-message">{flagSource}</div>
                </div>
                <div className="red-flag-tooltip-arrow"></div>
              </div>,
              document.body
            );
          })()}
        </div>
      </div>
    );
  };

  const renderOptimizationPopup = () => {
    if (!showOptimizationPopup) return null;

    return (
      <div className="holdings-popover-centered" onClick={(e) => e.stopPropagation()}>
        <div className="holdings-popover-overlay" onClick={() => setShowOptimizationPopup(false)}></div>
        <div className="holdings-popover-content optimization-popup-content">
          <div className="holdings-popover-header">
            <h2>Portfolio Optimization Suggestions</h2>
            <button className="popover-close" onClick={() => setShowOptimizationPopup(false)}>✕</button>
          </div>
          <div className="optimization-suggestions-container">
            {optimizationSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="optimization-suggestion-card">
                <div className="suggestion-header">
                  <div className="suggestion-title-row">
                    <h3 className="suggestion-title">{suggestion.title}</h3>
                    <span className={`priority-badge priority-${suggestion.priority.toLowerCase()}`}>
                      {suggestion.priority}
                    </span>
                  </div>
                  <div className="suggestion-category">{suggestion.category}</div>
                  <p className="suggestion-description">{suggestion.description}</p>
                </div>
                <div className="suggestion-actions">
                  <div className="actions-header">Recommended Actions:</div>
                  {suggestion.actions.map((action, index) => (
                    <div key={index} className="action-item">
                      <div className="action-content">
                        <div className="action-text">{action.action}</div>
                        <div className="action-impact">{action.impact}</div>
                        <div className="action-sectors">
                          <span className="sectors-label">Sectors:</span>
                          {action.sectors.map((sector, idx) => (
                            <span key={idx} className="sector-tag">{sector}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="suggestion-outcome">
                  <strong>Expected Outcome:</strong> {suggestion.expectedOutcome}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleReentryBadgeClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    let x = rect.left + rect.width / 2;
    x = Math.max(margin, Math.min(vw - margin, x));
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const positionAbove = spaceAbove >= 120 || spaceAbove > spaceBelow;
    const y = positionAbove ? rect.top : rect.bottom;
    setBiasPopover({ x, y, positionAbove });
  };

  const renderBiasSentinel = () => {
    const metrics = [
      {
        key: 'turnoverRate',
        title: 'Turnover Rate %',
        value: biasMetrics.turnoverRatePct,
        unit: '%',
        guideline: '< 40%',
        status: biasStatus.turnoverRate(biasMetrics.turnoverRatePct),
        maxValue: 100,
        showMeter: true
      },
      {
        key: 'winHoldLossHold',
        title: 'Winning Trade Hold Time ÷ Losing Trade Hold Time',
        value: biasMetrics.winHoldToLossHold,
        unit: '',
        guideline: 'Ratio >1.2',
        status: biasStatus.winHoldLossHold(biasMetrics.winHoldToLossHold),
        maxValue: 2.0,
        showMeter: true
      },
      {
        key: 'addToLoser',
        title: 'Add-to-Loser %',
        value: biasMetrics.addToLoserPct,
        unit: '%',
        guideline: '< 5%',
        status: biasStatus.addToLoser(biasMetrics.addToLoserPct),
        maxValue: 20,
        showMeter: true
      },
      {
        key: 'reentryAfterStop',
        title: 'Re-entry AFTER Stop-Loss %',
        value: biasMetrics.reentryAfterStopPct,
        unit: '%',
        guideline: '< 10%',
        status: biasStatus.reentryAfterStop(biasMetrics.reentryAfterStopPct),
        maxValue: 30,
        showMeter: true,
        showBadge: true
      },
      {
        key: 'alertRate',
        title: 'Bias Alert Trigger Rate',
        value: biasMetrics.biasAlertRatePer100,
        unit: ' /100 positions',
        guideline: '< 1.0 alerts',
        status: biasStatus.alertRate(biasMetrics.biasAlertRatePer100),
        maxValue: 3.0,
        showMeter: true
      },
      {
        key: 'overrideRate',
        title: 'PM Override Rate',
        value: biasMetrics.overrideRatePct,
        unit: '%',
        guideline: '30–70% sweet-spot',
        status: biasStatus.overrideRate(biasMetrics.overrideRatePct),
        minValue: 0,
        maxValue: 100,
        showRangeMeter: true
      }
    ];

    return (
      <>
        <div className="bias-header">
          <h2>Bias Sentinel</h2>
          <p className="bias-sub">Behavioral bias detection metrics</p>
        </div>
        <div className="bias-grid">
          {metrics.map((metric) => (
            <div key={metric.key} className="bias-card">
              <div className="metric-title">
                <span>{metric.title}</span>
                <ShowReasoning
                  section={metric.key}
                  title={metric.title}
                  logs={sectionThoughtLogs[metric.key]}
                  {...showReasoningCommonProps}
                />
                <button
                  className="info-icon"
                  onClick={(e) => handleInfoIconClick(e, metric.key)}
                  title="Info"
                >
                  i
                </button>
                {metric.showBadge && (
                  <button
                    className="tip-badge alert-badge"
                    onClick={handleReentryBadgeClick}
                    title="Alert"
                  >
                    1
                  </button>
                )}
              </div>
              <div className="metric-row">
                <span className="metric-value">
                  {metric.value.toFixed(metric.key === 'winHoldLossHold' ? 2 : 1)}{metric.unit}
                </span>
                <span className={`status-chip ${metric.status}`}>
                  {metric.status === 'ok' ? 'OK' : metric.status === 'warn' ? 'WARN' : 'ALERT'}
                </span>
              </div>
              <div className="metric-guideline">{metric.guideline}</div>
              {metric.showMeter && (
                <div className="meter">
                  <div
                    className={`meter-fill ${metric.status}`}
                    style={{
                      width: `${Math.min(100, (metric.value / metric.maxValue) * 100)}%`
                    }}
                  />
                </div>
              )}
              {metric.showRangeMeter && (
                <div className="range-meter">
                  <div className="range-band bad" style={{ width: '30%' }} />
                  <div className="range-band ok" style={{ width: '40%' }} />
                  <div className="range-band warn" style={{ width: '30%' }} />
                  <div
                    className="needle"
                    style={{
                      left: `${metric.value}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {biasPopover && ReactDOM.createPortal(
          <div
            className="bias-popover"
            style={{
              position: 'fixed',
              left: `${biasPopover.x}px`,
              top: `${biasPopover.y}px`,
              transform: `translateX(-50%) ${biasPopover.positionAbove ? 'translateY(-100%)' : ''}`,
              zIndex: 10000,
              marginTop: biasPopover.positionAbove ? '-8px' : '8px',
              marginBottom: biasPopover.positionAbove ? '8px' : '-8px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tooltip-content">
              <div className="tooltip-message">
                You've re-entered AAPL within 12 days of a stop-loss exit – pattern resembles past revenge trades (−3.7 % avg).
              </div>
            </div>
            <div className="tooltip-arrow" style={{
              [biasPopover.positionAbove ? 'bottom' : 'top']: '-6px',
              left: '50%',
              transform: 'translateX(-50%)'
            }} />
          </div>,
          document.body
        )}
        {biasInfoPopover && ReactDOM.createPortal(
          <div
            className="bias-info-popover"
            style={{
              position: 'fixed',
              left: `${biasInfoPopover.x}px`,
              top: `${biasInfoPopover.y}px`,
              transform: `translateX(-50%) ${biasInfoPopover.positionAbove ? 'translateY(-100%)' : ''}`,
              zIndex: 10000,
              marginTop: biasInfoPopover.positionAbove ? '-8px' : '8px',
              marginBottom: biasInfoPopover.positionAbove ? '8px' : '-8px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tooltip-content">
              <div className="tooltip-message">
                {biasDefinitions[biasInfoPopover.metric]}
              </div>
            </div>
            <div className="tooltip-arrow" style={{
              [biasInfoPopover.positionAbove ? 'bottom' : 'top']: '-6px',
              left: '50%',
              transform: 'translateX(-50%)'
            }} />
          </div>,
          document.body
        )}
      </>
    );
  };

  const [agentActions, setAgentActions] = useState([
    {
      id: 1,
      actor: 'AI',
      type: 'info',
      time: '09:45 AM',
      title: 'Portfolio Analysis Complete',
      description: 'Initial portfolio analysis completed. Identified 3 opportunities for optimization.',
      meta: ['Analysis', 'Portfolio']
    },
    {
      id: 2,
      actor: 'AI',
      type: 'alert',
      time: '09:47 AM',
      title: 'Price Movement Alert',
      description: 'AAPL dropped 2.3% in the last 15 minutes. Monitoring for potential rebalancing opportunity.',
      meta: ['AAPL', 'Price Alert']
    },
    {
      id: 3,
      actor: 'AI',
      type: 'success',
      time: '09:50 AM',
      title: 'Strategy Meeting Scheduled',
      description: 'Based on market conditions and portfolio performance, scheduled a strategy review meeting for tomorrow at 10:00 AM.',
      meta: ['Meeting', 'Strategy']
    },
    {
      id: 4,
      actor: 'AI',
      type: 'warning',
      time: '09:52 AM',
      title: 'Sector Exposure Warning',
      description: 'Technology sector exposure exceeds target allocation by 5%. Preparing rebalancing recommendations.',
      meta: ['Sector', 'Risk']
    },
    {
      id: 5,
      actor: 'User',
      type: 'success',
      time: '09:48 AM',
      title: 'Manual Trade Executed',
      description: 'Executed buy order for 100 shares of MSFT at $380.50. Reason: Strong earnings guidance.',
      meta: ['Trade', 'MSFT']
    },
    {
      id: 6,
      actor: 'User',
      type: 'info',
      time: '09:55 AM',
      title: 'Portfolio Target Updated',
      description: 'Adjusted Technology sector allocation target from 35% to 40% to reflect market outlook.',
      meta: ['Target', 'Allocation']
    },
    {
      id: 7,
      actor: 'User',
      type: 'warning',
      time: '10:05 AM',
      title: 'Stop Loss Modified',
      description: 'Updated stop-loss for AAPL position from $165 to $170 per share.',
      meta: ['Stop-Loss', 'AAPL']
    },
    {
      id: 8,
      actor: 'AI',
      type: 'info',
      time: '10:10 AM',
      title: 'Risk Recalculation',
      description: 'Portfolio risk metrics recalculated based on recent trades and allocation changes.',
      meta: ['Risk', 'Calculation']
    }
  ]);

  // Mock holdings data for Technology sector
  const technologyHoldings = [
    {
      id: 1,
      ticker: 'AAPL',
      cusip: '037833100',
      totalValue: 125000000, // $125M
      redFlags: [], // Green flag
      mfBreakdown: [
        { mfName: 'Tech Growth Fund A', value: 45000000 },
        { mfName: 'Innovation Equity Fund', value: 38000000 },
        { mfName: 'Sector Select Fund', value: 42000000 }
      ]
    },
    {
      id: 2,
      ticker: 'MSFT',
      cusip: '594918104',
      totalValue: 98000000, // $98M
      redFlags: [], // Green flag
      mfBreakdown: [
        { mfName: 'Tech Growth Fund A', value: 35000000 },
        { mfName: 'Blue Chip Equity Fund', value: 32000000 },
        { mfName: 'Sector Select Fund', value: 31000000 }
      ]
    },
    {
      id: 3,
      ticker: 'GOOGL',
      cusip: '02079K305',
      totalValue: 75000000, // $75M
      redFlags: ['P/E ratio 35% above sector median'], // 1 red flag
      mfBreakdown: [
        { mfName: 'Innovation Equity Fund', value: 28000000 },
        { mfName: 'Tech Growth Fund A', value: 25000000 },
        { mfName: 'Digital Assets Fund', value: 22000000 }
      ]
    },
    {
      id: 4,
      ticker: 'NVDA',
      cusip: '67066G104',
      totalValue: 62000000, // $62M
      redFlags: [], // Green flag
      mfBreakdown: [
        { mfName: 'AI & Semiconductors Fund', value: 35000000 },
        { mfName: 'Tech Growth Fund A', value: 27000000 }
      ]
    },
    {
      id: 5,
      ticker: 'META',
      cusip: '30303M102',
      totalValue: 48000000, // $48M
      redFlags: ['SEC investigation pending', 'EBITDA margin declined 15% YoY'], // 2 red flags
      mfBreakdown: [
        { mfName: 'Digital Assets Fund', value: 20000000 },
        { mfName: 'Innovation Equity Fund', value: 18000000 },
        { mfName: 'Sector Select Fund', value: 10000000 }
      ]
    },
    {
      id: 6,
      ticker: 'AMZN',
      cusip: '023135106',
      totalValue: 42000000, // $42M
      redFlags: [], // Green flag
      mfBreakdown: [
        { mfName: 'Blue Chip Equity Fund', value: 22000000 },
        { mfName: 'Tech Growth Fund A', value: 20000000 }
      ]
    },
    {
      id: 7,
      ticker: 'TSLA',
      cusip: '88160R101',
      totalValue: 35000000, // $35M
      redFlags: ['Short interest increased 40% in past month', 'Free cash flow negative for 2 consecutive quarters', 'Management guidance lowered for Q4'], // 3 red flags
      mfBreakdown: [
        { mfName: 'Innovation Equity Fund', value: 18000000 },
        { mfName: 'Clean Energy Fund', value: 17000000 }
      ]
    },
    {
      id: 8,
      ticker: 'INTC',
      cusip: '458140100',
      totalValue: 28000000, // $28M
      redFlags: [], // Green flag
      mfBreakdown: [
        { mfName: 'AI & Semiconductors Fund', value: 15000000 },
        { mfName: 'Sector Select Fund', value: 13000000 }
      ]
    },
    {
      id: 9,
      ticker: 'AMD',
      cusip: '007903107',
      totalValue: 22000000, // $22M
      redFlags: ['EBITDA margin declined 12% YoY'], // 1 red flag
      mfBreakdown: [
        { mfName: 'AI & Semiconductors Fund', value: 12000000 },
        { mfName: 'Tech Growth Fund A', value: 10000000 }
      ]
    },
    {
      id: 10,
      ticker: 'CRM',
      cusip: '79466L302',
      totalValue: 18500000, // $18.5M
      redFlags: [], // Green flag
      mfBreakdown: [
        { mfName: 'Sector Select Fund', value: 10000000 },
        { mfName: 'Blue Chip Equity Fund', value: 8500000 }
      ]
    }
  ];

  // Mock optimization suggestions data
  const optimizationSuggestions = [
    {
      id: 1,
      category: 'Volatility Reduction',
      priority: 'High',
      title: 'Reduce Portfolio Volatility',
      description: 'Current volatility (18.5%) exceeds target (15%) by 3.5 percentage points.',
      actions: [
        {
          action: 'Increase allocation to lower beta names by 2-4%',
          impact: 'Expected volatility reduction: -1.2%',
          sectors: ['Utilities', 'Consumer Staples']
        },
        {
          action: 'Introduce short-duration T-Bills (5-10% allocation)',
          impact: 'Expected volatility reduction: -0.8%',
          sectors: ['Fixed Income']
        },
        {
          action: 'Reduce Technology sector exposure by 2-3%',
          impact: 'Expected volatility reduction: -0.5%',
          sectors: ['Technology']
        }
      ],
      expectedOutcome: 'Portfolio volatility reduced to ~15.5% (within acceptable range)'
    },
    {
      id: 2,
      category: 'Sector Rebalancing',
      priority: 'Medium',
      title: 'Rebalance Technology Sector Exposure',
      description: 'Technology sector exposure at 37.2% exceeds threshold of 35%.',
      actions: [
        {
          action: 'Trim Technology positions by 2-3%',
          impact: 'Reduces concentration risk',
          sectors: ['Technology']
        },
        {
          action: 'Reallocate to Financial and Healthcare sectors',
          impact: 'Improves diversification',
          sectors: ['Financial', 'Healthcare']
        }
      ],
      expectedOutcome: 'Technology exposure reduced to ~35%, improved sector diversification'
    },
    {
      id: 3,
      category: 'Risk-Adjusted Returns',
      priority: 'Medium',
      title: 'Optimize Sharpe Ratio',
      description: 'Current Sharpe ratio (1.8) can be improved through better risk-adjusted positioning.',
      actions: [
        {
          action: 'Increase positions in high Sharpe ratio names',
          impact: 'Expected Sharpe improvement: +0.1-0.2',
          sectors: ['Technology', 'Financial']
        },
        {
          action: 'Reduce positions with low risk-adjusted returns',
          impact: 'Improves overall portfolio efficiency',
          sectors: ['Consumer']
        }
      ],
      expectedOutcome: 'Sharpe ratio improved to ~1.9-2.0'
    }
  ];


  const actionDetails = {
    execute: {
      title: 'Execute Technology Rebalance',
      subtitle: 'Action Plan for Reducing Technology Concentration',
      description: 'Trim overweight technology holdings and rotate capital into lower beta sectors to bring allocation within policy bands.',
      trades: [
        { ticker: 'AAPL', tradeType: 'Sell', sector: 'Technology', percentHoldings: '1.5%', value: '$18.4M' },
        { ticker: 'MSFT', tradeType: 'Sell', sector: 'Technology', percentHoldings: '1.0%', value: '$12.6M' },
        { ticker: 'NVDA', tradeType: 'Sell', sector: 'Technology', percentHoldings: '0.5%', value: '$9.8M' },
        { ticker: 'XLU ETF', tradeType: 'Buy', sector: 'Utilities', percentHoldings: '0.8%', value: '$9.0M' },
        { ticker: 'XLP ETF', tradeType: 'Buy', sector: 'Consumer Staples', percentHoldings: '0.7%', value: '$7.5M' },
        { ticker: 'UST-BILL', tradeType: 'Buy', sector: 'Fixed Income', percentHoldings: '0.5%', value: '$5.6M' }
      ],
      metrics: [
        { label: 'Current Technology Weight', value: '37.2%' },
        { label: 'Target Technology Weight', value: '35.0%' },
        { label: 'Projected Volatility Impact', value: '-0.9%' }
      ],
      footer: 'Expected completion time: 45 minutes. Execution window optimal between 10:15 - 11:00 AM ET.'
    },
    schedule: {
      title: 'Schedule Earnings Review Session',
      subtitle: 'Coordinate cross-functional review for upcoming earnings cycle',
      description: "Prepare coverage teams for next week's earnings releases with a focused agenda and supporting materials.",
      checklist: [
        'Invite PM team, sector analysts, and risk partners',
        'Attach latest earnings prep deck and consensus variance tracker',
        'Outline key focus tickers: AAPL (Tue), MSFT (Wed), NVDA (Thu)'
      ],
      metrics: [
        { label: 'Suggested Date & Time', value: 'Monday, 9:30 AM ET' },
        { label: 'Duration', value: '45 minutes' },
        { label: 'Meeting Mode', value: 'Hybrid (Room 14B + Teams)' }
      ],
      footer: 'Auto-reminder will be sent 24 hours prior. Include post-meeting follow-up checklist.'
    }
  };

  // Format value with K/M/B shorthand
  const formatValue = (value) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

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

  // Function to fetch and aggregate v0 baseline data for a sector
  const fetchSectorSentimentData = useCallback(async (sector) => {
    // Normalize sector name to lowercase for API call
    const normalizedSector = sector.toLowerCase();
    
    // Check if data is already cached using functional state update
    let shouldFetch = true;
    let cachedVector = null;
    
    setSectorSentimentData(prev => {
      const cached = prev[normalizedSector];
      if (cached && cached.baselineVector && !cached.loading) {
        cachedVector = cached.baselineVector;
        shouldFetch = false;
        return prev; // No state change needed
      }
      if (cached && cached.loading) {
        shouldFetch = false; // Already loading, don't start another request
        return prev;
      }
      // Set loading state for new fetch
      return {
        ...prev,
        [normalizedSector]: { loading: true, error: null }
      };
    });

    // Return cached data if available
    if (cachedVector) {
      return cachedVector;
    }

    // If already loading, return null (caller should handle this)
    if (!shouldFetch) {
      return null;
    }

    try {
      const apiUrl = '/sentiment/analyze';
      const params = { sector: normalizedSector };
      console.log('Making API call to:', apiUrl, 'with params:', params);
      
      const response = await axios.get(apiUrl, {
        params: params,
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API response received:', response.data);
      console.log('Response status:', response.status);
      console.log('Response structure check:', {
        hasData: !!response.data,
        hasSentimentMetrics: !!(response.data && response.data.sentiment_metrics),
        sector: response.data?.sector
      });

      if (response.data && response.data.sentiment_metrics) {
        const sentimentMetrics = response.data.sentiment_metrics;
        const symbols = Object.keys(sentimentMetrics);
        
        console.log(`Found ${symbols.length} symbols in sentiment_metrics:`, symbols);
        
        if (symbols.length === 0) {
          throw new Error('No sentiment metrics found for sector');
        }

        // Aggregate v0 arrays from all symbols
        let sumSentimentValue = 0;
        let sumPrecision = 0;
        let sumRecall = 0;
        let count = 0;

        symbols.forEach(symbol => {
          const metric = sentimentMetrics[symbol];
          console.log(`Processing symbol ${symbol}:`, metric);
          if (metric && metric.sentiment && Array.isArray(metric.sentiment.v0) && metric.sentiment.v0.length >= 3) {
            const v0 = metric.sentiment.v0;
            console.log(`  v0 array for ${symbol}:`, v0);
            sumSentimentValue += v0[0]; // sentiment_value
            sumPrecision += v0[1]; // precision
            sumRecall += v0[2]; // recall
            count++;
          } else {
            console.warn(`  Invalid v0 data for ${symbol}:`, metric?.sentiment?.v0);
          }
        });
        
        console.log(`Aggregation summary: count=${count}, sumSentimentValue=${sumSentimentValue}, sumPrecision=${sumPrecision}, sumRecall=${sumRecall}`);

        if (count === 0) {
          throw new Error('No valid v0 data found in sentiment metrics');
        }

        // Calculate averages
        const avgSentimentValue = sumSentimentValue / count;
        const avgPrecision = sumPrecision / count;
        const avgRecall = sumRecall / count;

        const baselineVector = [avgSentimentValue, avgPrecision, avgRecall];
        console.log('Calculated baselineVector:', baselineVector);

        // Cache the result
        setSectorSentimentData(prev => ({
          ...prev,
          [normalizedSector]: {
            baselineVector,
            loading: false,
            error: null
          }
        }));

        return baselineVector;
      } else {
        throw new Error('Invalid response structure from sentiment API');
      }
    } catch (err) {
      console.error('Error fetching sector sentiment data:', err);
      
      let errorMessage = 'Failed to fetch sentiment data';
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check if the backend server is running on port 8000.';
      } else if (err.response?.status === 504) {
        errorMessage = 'Gateway timeout. The backend server at localhost:8000 may not be running or is not responding.';
      } else if (err.response?.status) {
        errorMessage = `Server error (${err.response.status}): ${err.response?.data?.message || err.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.message,
        code: err.code
      });
      
      // Set error state
      setSectorSentimentData(prev => ({
        ...prev,
        [normalizedSector]: {
          ...prev[normalizedSector],
          loading: false,
          error: errorMessage
        }
      }));

      // Return null to indicate failure
      return null;
    }
  }, [sectorSentimentData]);

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

  const handleInfoIconClick = (e, metricKey) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    let x = rect.left + rect.width / 2;
    x = Math.max(margin, Math.min(vw - margin, x));
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const positionAbove = spaceAbove >= 180 || spaceAbove > spaceBelow;
    const y = positionAbove ? rect.top : rect.bottom;
    setBiasInfoPopover({ metric: metricKey, x, y, positionAbove });
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

  const computeCosineSimilarity = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dot += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
    let cos = dot / denom;
    if (Number.isNaN(cos)) cos = 0;
    if (cos > 1) cos = 1;
    if (cos < -1) cos = -1;
    return cos;
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const target = e.target;
      const hasClosest = target && typeof target.closest === 'function';
      const clickedTooltip = hasClosest && target.closest('.sentiment-tooltip');
      const clickedCell = hasClosest && target.closest('.sentiment-cell');
      if (sentimentTooltip && !clickedTooltip && !clickedCell) {
        setSentimentTooltip(null);
      }
    };

    if (sentimentTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [sentimentTooltip]);

  useEffect(() => {
    const onDocClick = (e) => {
      const target = e.target;
      const hasClosest = target && typeof target.closest === 'function';
      const clickedPopover = hasClosest && target.closest('.bias-popover');
      const clickedBadge = hasClosest && target.closest('.tip-badge');
      if (biasPopover && !clickedPopover && !clickedBadge) {
        setBiasPopover(null);
      }
    };
    if (biasPopover) {
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
    }
  }, [biasPopover]);

  useEffect(() => {
    const onDocClick = (e) => {
      const target = e.target;
      const hasClosest = target && typeof target.closest === 'function';
      const clickedPopover = hasClosest && target.closest('.bias-info-popover');
      const clickedInfoIcon = hasClosest && target.closest('.info-icon');
      if (biasInfoPopover && !clickedPopover && !clickedInfoIcon) {
        setBiasInfoPopover(null);
      }
    };
    if (biasInfoPopover) {
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
    }
  }, [biasInfoPopover]);

  const handleCopyNotification = useCallback(({ x, y }) => {
    setCopyNotification({ x, y });
  }, []);

  const abbreviateLabel = useCallback((label) => {
    if (!label) return 'Trace';

    const cleaned = label
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length <= 15) {
      return cleaned.replace(/\s+/g, '');
    }

    const initials = cleaned
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0].toUpperCase())
      .join('');

    return initials || 'Trace';
  }, []);

  const handleAuditTrace = useCallback(
    (entry, section, labelHint = '') => {
      const fallbackLabel = labelHint || entry?.title || section || 'Trace';
      const sanitizedLabel = abbreviateLabel(fallbackLabel);

      setAgentActiveTab('decision');
      setShowThinkingPopover(null);
      const fullSectionName = labelHint && labelHint.trim().length ? labelHint : fallbackLabel;
      setAuditTraceRequest({
        id: Date.now(),
        section,
        label: sanitizedLabel,
        displayName: fullSectionName,
        entry,
        entrySummary: {
          id: entry?.id,
          title: entry?.title,
          time: entry?.time,
          kind: entry?.kind
        }
      });
    },
    [abbreviateLabel]
  );

  const showReasoningCommonProps = useMemo(() => ({
    currentSection: showThinkingPopover,
    onOpen: handleShowReasoning,
    onClose: handleCloseReasoning,
    onCopyNotification: handleCopyNotification,
    onAskAgent: handleAskAgentFromReasoning,
    onAuditTrace: handleAuditTrace,
    editingThoughtId,
    editPrompt,
    setEditPrompt,
    editToolInputs,
    setEditToolInputs,
    beginEdit,
    cancelEdit,
    saveEdit,
    rerunThinking,
    thinkingEntry,
    thinkingText
  }), [
    showThinkingPopover,
    handleShowReasoning,
    handleCloseReasoning,
    handleCopyNotification,
    handleAskAgentFromReasoning,
    handleAuditTrace,
    editingThoughtId,
    editPrompt,
    editToolInputs,
    beginEdit,
    cancelEdit,
    saveEdit,
    rerunThinking,
    thinkingEntry,
    thinkingText
  ]);

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
          null
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

      <div className="dashboard-content-wrapper">
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
              <button 
                className={`tab-button ${agentActiveTab === 'decision' ? 'active' : ''}`}
                onClick={() => setAgentActiveTab('decision')}
              >
                Decision Trace
              </button>
            </div>

            {agentActiveTab === 'thesis' && (
              <div className={`agent-tab-content ${showChatbot ? 'with-chatbot' : ''}`}>
                <div className="agent-tab-main">
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
                {renderHoldingsPopup()}
                {renderOptimizationPopup()}
                {actionsPopover && ReactDOM.createPortal(
                  <div className="actions-popover-backdrop" onClick={() => setActionsPopover(null)}>
                    <div
                      className={`actions-popover-window ${actionsPopover.type === 'execute' ? 'execute' : ''}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="actions-popover-header">
                        <div className="actions-popover-title">
                          <h3>{actionDetails[actionsPopover.type].title}</h3>
                          <p>{actionDetails[actionsPopover.type].subtitle}</p>
                        </div>
                        <button
                          className="actions-popover-close"
                          onClick={() => setActionsPopover(null)}
                          aria-label="Close"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="actions-popover-body">
                        <p className="actions-description">{actionDetails[actionsPopover.type].description}</p>
                        {actionsPopover.type === 'execute' ? (
                          <div className="actions-trade-table-wrapper">
                            <table className="actions-trade-table">
                              <thead>
                                <tr>
                                  <th>Ticker</th>
                                  <th>Trade Type</th>
                                  <th>Sector</th>
                                  <th>% of Holdings</th>
                                  <th>Value</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {actionDetails.execute.trades.map((trade, idx) => (
                                  <tr key={idx}>
                                    <td>{trade.ticker}</td>
                                    <td className={`trade-type ${trade.tradeType.toLowerCase()}`}>{trade.tradeType}</td>
                                    <td>{trade.sector}</td>
                                    <td>{trade.percentHoldings}</td>
                                    <td>{trade.value}</td>
                                    <td>
                                      <button className="execute-trade-button">Execute Trade</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="actions-checklist">
                            <div className="actions-section-label">Checklist</div>
                            <ul>
                              {actionDetails[actionsPopover.type].checklist.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="actions-metrics">
                          {actionDetails[actionsPopover.type].metrics.map((metric, idx) => (
                            <div key={idx} className="action-metric">
                              <span className="metric-label">{metric.label}</span>
                              <span className="metric-value">{metric.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="actions-popover-footer">
                        {actionDetails[actionsPopover.type].footer}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
                <div className="agent-thinking-box">
                  <div className="thinking-header">
                    <h3>AI Portfolio Assistant</h3>
                    <div className="status-indicator">
                      <div className="status-dot"></div>
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="thinking-content">
                    <div className="agent-main-sections">
                      <div className="thinking-message section-context">
                        <div className="section-header">
                          <h4>Morning Portfolio Briefing</h4>
                          <ShowReasoning
                            section="briefing"
                            title="Morning Portfolio Briefing"
                            logs={sectionThoughtLogs.briefing}
                            {...showReasoningCommonProps}
                          />
                        </div>
                        <p>Portfolio is currently tracking 2.3% above benchmark YTD. Key positions AAPL and MSFT showing strong momentum.</p>
                      </div>
                      
                      <div className="thinking-insights section-context">
                        <div className="section-header">
                          <h4>Risk Alerts</h4>
                          <ShowReasoning
                            section="risk"
                            title="Risk Alerts"
                            logs={sectionThoughtLogs.risk}
                            {...showReasoningCommonProps}
                          />
                        </div>
                        <table className="analysis-table">
                          <tbody>
                            <tr>
                              <td>
                                <p className="analysis-item">Technology sector exposure at 37.2% (threshold: 35%)</p>
                              </td>
                              <td className="action-button-cell">
                                <button className="risk-action-button" onClick={handleReviewClick}>
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
                                <button className="risk-action-button" onClick={handleOptimizeClick}>
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

                      <div className="thinking-recommendations section-context">
                        <div className="section-header">
                          <h4>Today's Actions</h4>
                          <ShowReasoning
                            section="actions"
                            title="Today's Actions"
                            logs={sectionThoughtLogs.actions}
                            {...showReasoningCommonProps}
                          />
                        </div>
                        <table className="analysis-table">
                          <tbody>
                            <tr>
                              <td>
                                <p className="analysis-item">Rebalance technology exposure</p>
                              </td>
                              <td className="action-button-cell">
                                <button className="analysis-action-button" onClick={(e) => handleActionButtonClick(e, 'execute')}>
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
                                <button className="analysis-action-button" onClick={(e) => handleActionButtonClick(e, 'schedule')}>
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

                      <div className="thinking-performance section-context">
                        <div className="section-header">
                          <h4>Performance Metrics</h4>
                          <ShowReasoning
                            section="performance"
                            title="Performance Metrics"
                            logs={sectionThoughtLogs.performance}
                            {...showReasoningCommonProps}
                          />
                        </div>
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
                    
                    <div className="actions-column">
                      <div className="agent-action-log section-context">
                        <div className="section-header">
                          <h4>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Recent AI Actions
                          </h4>
                          <ShowReasoning
                            section="aiActions"
                            title="Recent AI Actions"
                            logs={sectionThoughtLogs.aiActions}
                            {...showReasoningCommonProps}
                          />
                        </div>
                        <div className="action-log-list">
                          {agentActions.filter(action => action.actor === 'AI').map(action => (
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

                      <div className="agent-action-log section-context">
                        <div className="section-header">
                          <h4>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Recent User Actions
                          </h4>
                          <ShowReasoning
                            section="userActions"
                            title="Recent User Actions"
                            logs={sectionThoughtLogs.userActions}
                            {...showReasoningCommonProps}
                          />
                        </div>
                        <div className="action-log-list">
                          {agentActions.filter(action => action.actor === 'User').map(action => (
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
                </div>
                </div>
                {renderChatbot()}
              </div>
            )}

            {agentActiveTab === 'dummy1' && (
              <div className={`agent-tab-content ${showChatbot ? 'with-chatbot' : ''}`}>
                <div className="agent-tab-main">
              <div className="thesis-drift-section">
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
                    <div className="thesis-table-wrapper section-context">
                      <div className="section-header">
                        <h2 className="thesis-section-heading">Thesis at Inception</h2>
                        <ShowReasoning
                          section="thesisAtInception"
                          title="Thesis at Inception"
                          logs={sectionThoughtLogs.thesisAtInception}
                          {...showReasoningCommonProps}
                        />
                      </div>
                      <table className="thesis-table">
                        <thead>
                          <tr>
                            <th>Sector</th>
                            <th>Allocation %</th>
                            <th>Sector Alpha</th>
                            <th>Sector Sharpe Ratio</th>
                            <th>Target Alpha</th>
                            <th>Target Sharpe Ratio</th>
                            <th>Sentiment</th>
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
                              <td 
                                className="sentiment-cell"
                                data-sector={item.sector}
                                data-testid={`sentiment-cell-${item.sector.toLowerCase()}`}
                                style={{
                                  cursor: 'pointer',
                                  color: item.sentiment === 'Bullish' ? '#4caf50' : item.sentiment === 'Bearish' ? '#f44336' : '#ff9800'
                                }}
                                onMouseEnter={() => {
                                  console.log(`Mouse entered sentiment cell for ${item.sector}`);
                                }}
                                onClick={async (e) => {
                                  // Very visible logging to ensure click is detected
                                  console.log('=== SENTIMENT CELL CLICKED ===');
                                  console.log('Event:', e);
                                  console.log('Item:', item);
                                  console.log('Sector:', item.sector);
                                  console.log('Normalized sector:', item.sector.toLowerCase());
                                  console.error('CLICK DETECTED - This should be visible!'); // Using error level for visibility
                                  
                                  // Alert for testing - remove after confirming click works
                                  // alert(`Clicked on ${item.sector} sector sentiment cell`);
                                  
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  const clickX = e.clientX;
                                  const clickY = e.clientY;
                                  const windowHeight = window.innerHeight;
                                  const windowWidth = window.innerWidth;
                                  const tooltipHeight = 120; // Approximate tooltip height
                                  const tooltipWidth = 250; // Approximate tooltip width
                                  const spaceAbove = clickY;
                                  const spaceBelow = windowHeight - clickY;
                                  
                                  // Position above if more space above and enough space, otherwise below
                                  const positionAbove = spaceAbove > spaceBelow && spaceAbove > tooltipHeight + 20;
                                  
                                  // Ensure tooltip doesn't go off-screen horizontally
                                  let tooltipX = clickX;
                                  const halfTooltipWidth = tooltipWidth / 2;
                                  if (clickX - halfTooltipWidth < 10) {
                                    tooltipX = halfTooltipWidth + 10;
                                  } else if (clickX + halfTooltipWidth > windowWidth - 10) {
                                    tooltipX = windowWidth - halfTooltipWidth - 10;
                                  }
                                  
                                  // Check if this is a sector that should fetch v0 data from API
                                  const normalizedSector = item.sector.toLowerCase();
                                  let baselineVector = item.baselineVector; // Default to hardcoded value
                                  
                                  // Sectors that should fetch data from API
                                  const sectorsWithAPI = ['technology', 'consumer', 'financial', 'utilities'];
                                  const shouldFetchFromAPI = sectorsWithAPI.includes(normalizedSector);
                                  
                                  console.log('Sentiment cell clicked:', { sector: item.sector, normalizedSector, shouldFetchFromAPI });
                                  
                                  if (shouldFetchFromAPI) {
                                    console.log(`${item.sector} sector detected, fetching v0 data from API...`);
                                    // Show tooltip immediately with loading state or cached data
                                    const cached = sectorSentimentData[normalizedSector];
                                    if (cached && cached.baselineVector && !cached.loading) {
                                      console.log('Using cached baselineVector:', cached.baselineVector);
                                      baselineVector = cached.baselineVector;
                                    } else {
                                      console.log('No cache or cache loading, fetching from API...');
                                      // Show loading state
                                      setSentimentTooltip({
                                        sector: item.sector,
                                        baselineVector: null, // Will show loading
                                        loading: true,
                                        x: tooltipX,
                                        y: e.clientY,
                                        positionAbove: positionAbove
                                      });
                                      
                                      // Fetch the data
                                      console.log('Calling fetchSectorSentimentData for sector:', item.sector);
                                      const fetchedVector = await fetchSectorSentimentData(item.sector);
                                      console.log('Fetched vector result:', fetchedVector);
                                      
                                      if (fetchedVector) {
                                        baselineVector = fetchedVector;
                                        setSentimentTooltip({
                                          sector: item.sector,
                                          baselineVector: fetchedVector,
                                          loading: false,
                                          x: tooltipX,
                                          y: e.clientY,
                                          positionAbove: positionAbove
                                        });
                                      } else {
                                        // Fetch failed or was already loading, check state via functional update
                                        setSectorSentimentData(currentState => {
                                          const stateForSector = currentState[normalizedSector];
                                          if (stateForSector && stateForSector.baselineVector) {
                                            // Data is now available, update tooltip
                                            setSentimentTooltip({
                                              sector: item.sector,
                                              baselineVector: stateForSector.baselineVector,
                                              loading: false,
                                              x: tooltipX,
                                              y: e.clientY,
                                              positionAbove: positionAbove
                                            });
                                          } else {
                                            // Still no data, show error with default
                                  setSentimentTooltip({
                                    sector: item.sector,
                                    baselineVector: item.baselineVector,
                                              loading: false,
                                              error: stateForSector?.error || 'Failed to fetch data',
                                              x: tooltipX,
                                              y: e.clientY,
                                              positionAbove: positionAbove
                                            });
                                          }
                                          return currentState; // No state change, just using for access
                                        });
                                      }
                                      return;
                                    }
                                  }
                                  
                                  // For non-Technology sectors or if data is already available, show immediately
                                  setSentimentTooltip({
                                    sector: item.sector,
                                    baselineVector: baselineVector,
                                    loading: false,
                                    x: tooltipX,
                                    y: e.clientY,
                                    positionAbove: positionAbove
                                  });
                                }}
                              >
                                {item.sentiment}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {sentimentTooltip && ReactDOM.createPortal(
                        (
                          <div 
                            className="sentiment-tooltip"
                            style={{
                              position: 'fixed',
                              left: `${sentimentTooltip.x}px`,
                              top: `${sentimentTooltip.y}px`,
                              transform: sentimentTooltip.positionAbove 
                                ? 'translate(-50%, calc(-100% - 10px))' 
                                : 'translate(-50%, 10px)',
                              zIndex: 10000
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSentimentTooltip(null);
                            }}
                          >
                            <div className="tooltip-content">
                              <div className="tooltip-sector">{sentimentTooltip.sector}</div>
                              <div className="tooltip-baseline">
                                <div className="baseline-label">Baseline (v₀):</div>
                                {sentimentTooltip.loading ? (
                                  <div className="baseline-loading">Loading...</div>
                                ) : sentimentTooltip.error ? (
                                  <div className="baseline-error">
                                    <div>{sentimentTooltip.error}</div>
                                    {sentimentTooltip.baselineVector && (
                                      <div className="baseline-fallback" style={{ marginTop: '8px', fontSize: '0.85em', opacity: 0.7 }}>
                                        Using default values
                                      </div>
                                    )}
                                  </div>
                                ) : sentimentTooltip.baselineVector ? (
                                <div className="baseline-vector">
                                    <div className="baseline-item"><span className="baseline-key">Sentiment Value</span><span className="baseline-value">{(sentimentTooltip.baselineVector[0] ?? 0).toFixed(3)}</span></div>
                                    <div className="baseline-item"><span className="baseline-key">Precision</span><span className="baseline-value">{(sentimentTooltip.baselineVector[1] ?? 0).toFixed(3)}</span></div>
                                    <div className="baseline-item"><span className="baseline-key">Recall</span><span className="baseline-value">{(sentimentTooltip.baselineVector[2] ?? 0).toFixed(3)}</span></div>
                                </div>
                                ) : (
                                  <div className="baseline-error">No data available</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ),
                        document.body
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="alpha-decay-section">
                <div className="section-header">
                  <h2 className="alpha-decay-heading">Alpha Decay: Inception vs Present</h2>
                  <ShowReasoning
                    section="alphaDecay"
                    title="Alpha Decay"
                    logs={sectionThoughtLogs.alphaDecay}
                    {...showReasoningCommonProps}
                  />
                </div>
                <div className="alpha-decay-container">
                  <div className="alpha-decay-table-wrapper section-context">
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
                    <div className="alpha-decay-graph-wrapper section-context">
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

              <div className="sentiment-drift-section">
                <div className="section-header">
                  <h4>Sentiment Drift Since Inception</h4>
                  <ShowReasoning
                    section="sentimentDrift"
                    title="Sentiment Drift"
                    logs={sectionThoughtLogs.sentimentDrift}
                    {...showReasoningCommonProps}
                  />
                </div>
                <div className="alpha-decay-container">
                  <div className="alpha-decay-table-wrapper section-context">
                    <div className="alpha-decay-content">
                      <table className="alpha-decay-table sentiment-drift-table">
                        <thead>
                          <tr>
                            <th>Sector</th>
                            <th>Internal Sentiment Drift</th>
                            <th>External Sentiment Drift</th>
                            <th>Variance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {thesisData.sectors.map((item, index) => {
                            const internalBaseline = item.internalSentimentBaseline || [0,0,0];
                            // Use API-fetched today vector if available for supported sectors
                            const normalizedSector = item.sector.toLowerCase();
                            const sectorsWithAPI = ['technology', 'consumer', 'financial', 'utilities'];
                            const cachedAPIData = sectorSentimentData[normalizedSector];
                            const internalToday = (sectorsWithAPI.includes(normalizedSector) && cachedAPIData && cachedAPIData.baselineVector && !cachedAPIData.loading)
                              ? cachedAPIData.baselineVector  // Use API v0 data as today vector
                              : (item.internalSentimentToday || [0,0,0]);  // Fallback to hardcoded
                            const externalBaseline = item.externalSentimentBaseline || [0,0,0];
                            const externalToday = item.externalSentimentToday || [0,0,0];
                            
                            const internalCos = computeCosineSimilarity(internalBaseline, internalToday);
                            const externalCos = computeCosineSimilarity(externalBaseline, externalToday);
                            
                            const internalDrift = 1 - internalCos;
                            const externalDrift = 1 - externalCos;
                            
                            // Variance is the absolute difference between internal and external drift
                            const variance = Math.abs(internalDrift - externalDrift);
                            
                            const internalDriftPct = (internalDrift * 100).toFixed(1);
                            const externalDriftPct = (externalDrift * 100).toFixed(1);
                            const variancePct = (variance * 100).toFixed(2);
                            
                            // Determine status based on variance magnitude
                            const varianceStatus = variance < 0.05 ? 'low' : variance < 0.15 ? 'med' : 'high';
                            
                            return (
                              <tr key={`drift-${item.sector}`}>
                                <td className="sector-name-cell">
                                  <div className="sector-indicator" style={{ backgroundColor: getSectorColor(index) }}></div>
                                  {item.sector}
                                </td>
                                <td>
                                  <div 
                                    className="sentiment-drift-cell clickable-sentiment-drift"
                                    onClick={(e) => {
                                      // Use API-fetched today vector if available
                                      const apiTodayVector = (sectorsWithAPI.includes(normalizedSector) && cachedAPIData && cachedAPIData.baselineVector && !cachedAPIData.loading)
                                        ? cachedAPIData.baselineVector
                                        : internalToday;
                                      handleSentimentDriftClick(e, item.sector, 'internal', internalBaseline, apiTodayVector);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className={`cos-score ${internalCos >= 0.9 ? 'high' : internalCos >= 0.75 ? 'med' : 'low'}`}>
                                      {(internalCos * 100).toFixed(1)}%
                                    </div>
                                    <div className="drift-indicator">
                                      <span className="drift-value">{internalDriftPct}%</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div 
                                    className="sentiment-drift-cell clickable-sentiment-drift"
                                    onClick={(e) => handleSentimentDriftClick(e, item.sector, 'external', externalBaseline, externalToday)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className={`cos-score ${externalCos >= 0.9 ? 'high' : externalCos >= 0.75 ? 'med' : 'low'}`}>
                                      {(externalCos * 100).toFixed(1)}%
                                    </div>
                                    <div className="drift-indicator">
                                      <span className="drift-value">{externalDriftPct}%</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className={`variance-cell variance-${varianceStatus}`}>
                                    <div className="variance-value">{variancePct}%</div>
                                    <div className="variance-bar">
                                      <div 
                                        className="variance-bar-fill" 
                                        style={{ 
                                          width: `${Math.min(100, Math.max(0, variance * 500))}%`,
                                          backgroundColor: varianceStatus === 'high' ? '#e74c3c' : varianceStatus === 'med' ? '#f39c12' : '#27ae60'
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className={`variance-status variance-status-${varianceStatus}`}>
                                    {varianceStatus === 'high' ? 'High Variance' : varianceStatus === 'med' ? 'Moderate' : 'Aligned'}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {sentimentDriftTooltip && ReactDOM.createPortal(
                  <div 
                    className="sentiment-drift-tooltip"
                    style={{
                      position: 'fixed',
                      left: `${sentimentDriftTooltip.x}px`,
                      top: `${sentimentDriftTooltip.y}px`,
                      transform: sentimentDriftTooltip.positionAbove 
                        ? 'translate(-50%, calc(-100% - 10px))' 
                        : 'translate(-50%, 10px)',
                      zIndex: 10000
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="tooltip-content">
                      <div className="tooltip-header">
                        {sentimentDriftTooltip.type === 'internal' ? 'Internal' : 'External'} Sentiment Vectors - {sentimentDriftTooltip.sector}
                      </div>
                      <div className="tooltip-baseline">
                        <div className="baseline-label">Baseline (v₀)</div>
                        {sentimentDriftTooltip.baselineVector ? (
                        <div className="baseline-vector">
                          <div className="baseline-item">
                              <span className="baseline-key">Sentiment Value:</span>
                            <span className="baseline-value">{(sentimentDriftTooltip.baselineVector[0] ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="baseline-item">
                            <span className="baseline-key">Precision:</span>
                            <span className="baseline-value">{(sentimentDriftTooltip.baselineVector[1] ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="baseline-item">
                            <span className="baseline-key">Recall:</span>
                            <span className="baseline-value">{(sentimentDriftTooltip.baselineVector[2] ?? 0).toFixed(2)}</span>
                          </div>
                        </div>
                        ) : (
                          <div className="baseline-error">No data available</div>
                        )}
                      </div>
                      <div className="tooltip-baseline" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                        <div className="baseline-label">Today (vₜ)</div>
                        {sentimentDriftTooltip.loading ? (
                          <div className="baseline-loading">Loading...</div>
                        ) : sentimentDriftTooltip.todayVector ? (
                        <div className="baseline-vector">
                          <div className="baseline-item">
                              <span className="baseline-key">Sentiment Value:</span>
                            <span className="baseline-value">{(sentimentDriftTooltip.todayVector[0] ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="baseline-item">
                            <span className="baseline-key">Precision:</span>
                            <span className="baseline-value">{(sentimentDriftTooltip.todayVector[1] ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="baseline-item">
                            <span className="baseline-key">Recall:</span>
                            <span className="baseline-value">{(sentimentDriftTooltip.todayVector[2] ?? 0).toFixed(2)}</span>
                          </div>
                        </div>
                        ) : (
                          <div className="baseline-error">No data available</div>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const arrowStyle = {
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent'
                      };
                      if (sentimentDriftTooltip.positionAbove) {
                        arrowStyle.bottom = '-6px';
                        arrowStyle.borderBottom = '6px solid var(--secondary-bg)';
                      } else {
                        arrowStyle.top = '-6px';
                        arrowStyle.borderTop = '6px solid var(--secondary-bg)';
                      }
                      
                      const arrowBorderStyle = {
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '7px solid transparent',
                        borderRight: '7px solid transparent'
                      };
                      if (sentimentDriftTooltip.positionAbove) {
                        arrowBorderStyle.bottom = '1px';
                        arrowBorderStyle.borderBottom = '7px solid var(--border-color)';
                      } else {
                        arrowBorderStyle.top = '1px';
                        arrowBorderStyle.borderTop = '7px solid var(--border-color)';
                      }
                      
                      return (
                        <div className="tooltip-arrow" style={arrowStyle}>
                          <div style={arrowBorderStyle}></div>
                        </div>
                      );
                    })()}
                  </div>,
                  document.body
                )}
              </div>
            </div>
            </div>
            {renderChatbot()}
          </div>
            )}

            {agentActiveTab === 'dummy2' && (
              <div className={`agent-tab-content ${showChatbot ? 'with-chatbot' : ''}`}>
                <div className="agent-tab-main">
              <div className="bias-sentinel">
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
                {renderBiasSentinel()}
              </div>
              </div>
              {renderChatbot()}
            </div>
            )}

            {agentActiveTab === 'decision' && (
              <DecisionTrace
                showChatbot={showChatbot}
                renderChatbot={renderChatbot}
                auditTraceRequest={auditTraceRequest}
                onAuditTraceConsumed={() => setAuditTraceRequest(null)}
              />
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
    </div>
  );
}

export default Dashboard; 