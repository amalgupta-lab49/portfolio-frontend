import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
      { sector: 'Technology', weight: 35, alpha: 2.5, sharpeRatio: 1.8, targetAlpha: 3.0, targetSharpe: 2.0, presentAlpha: 2.1, sentiment: 'Bullish', baselineVector: [0.75, 0.25, 0.15], todayVector: [0.70, 0.28, 0.18] },
      { sector: 'Financial', weight: 25, alpha: 1.8, sharpeRatio: 1.6, targetAlpha: 2.2, targetSharpe: 1.8, presentAlpha: 1.5, sentiment: 'Bullish', baselineVector: [0.65, 0.20, 0.18], todayVector: [0.60, 0.25, 0.20] },
      { sector: 'Healthcare', weight: 20, alpha: 1.5, sharpeRatio: 1.4, targetAlpha: 1.8, targetSharpe: 1.6, presentAlpha: 1.2, sentiment: 'Hold', baselineVector: [0.55, 0.30, 0.15], todayVector: [0.56, 0.29, 0.16] },
      { sector: 'Consumer', weight: 15, alpha: 1.2, sharpeRatio: 1.3, targetAlpha: 1.5, targetSharpe: 1.5, presentAlpha: 0.9, sentiment: 'Bearish', baselineVector: [0.40, 0.45, 0.20], todayVector: [0.38, 0.47, 0.22] },
      { sector: 'Utilities', weight: 5, alpha: 0.5, sharpeRatio: 1.1, targetAlpha: 0.8, targetSharpe: 1.2, presentAlpha: 0.4, sentiment: 'Hold', baselineVector: [0.50, 0.35, 0.15], todayVector: [0.52, 0.33, 0.15] }
    ]
  });
  const [sentimentTooltip, setSentimentTooltip] = useState(null); // { sector: string, baselineVector: array, x: number, y: number }
  const [selectedAlphaDecayRow, setSelectedAlphaDecayRow] = useState(null); // sector name or null
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
        title: 'Sentiment Drift Analysis',
        kind: 'text',
        prompt: `Analyze sentiment drift by comparing inception sentiment vectors (v₀) with today's sentiment vectors (vₜ) using cosine similarity. Identify sectors with significant sentiment changes.`,
        output: 'Sentiment drift analysis reveals Technology sector maintains high similarity (0.97), while Consumer sector shows moderate drift (0.92). Cosine similarity metrics indicate overall sentiment stability.'
      },
      {
        id: 'sd2',
        time: '10:26 AM',
        title: 'Cosine Similarity Calculation',
        kind: 'tool',
        prompt: `Calculate cosine similarity between inception and present sentiment vectors for each sector`,
        tool: {
          name: 'math.cosineSimilarity',
          inputs: { 
            v0: [0.75, 0.25, 0.15], 
            vt: [0.70, 0.28, 0.18],
            sector: 'Technology'
          },
          result: 'Cosine similarity: 0.97 (97% similarity)'
        },
        output: 'Technology sector sentiment maintains 97% similarity between inception and present, indicating minimal drift.'
      },
      {
        id: 'sd3',
        time: '10:27 AM',
        title: 'Drift Metric Interpretation',
        kind: 'bullets',
        prompt: `Interpret drift metrics and provide insights on what cosine similarity values mean for portfolio management`,
        bullets: [
          'Cosine similarity > 0.95: Minimal drift, sentiment consistent',
          'Cosine similarity 0.85-0.95: Moderate drift, monitor closely',
          'Cosine similarity < 0.85: Significant drift, review thesis',
          'Drift = 1 - cosine similarity, represents magnitude of change'
        ],
        output: 'Drift metrics indicate sentiment stability across most sectors. Consumer sector shows highest drift at 8% but remains within acceptable range.'
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

  // Auto-scroll chat messages to bottom
  useEffect(() => {
    if (chatMessages.length > 0) {
      const messagesElement = document.querySelector('.chatbot-messages');
      if (messagesElement) {
        messagesElement.scrollTop = messagesElement.scrollHeight;
      }
    }
  }, [chatMessages]);

  // Close chatbot when agent mode is turned off
  useEffect(() => {
    if (!isAgentMode && showChatbot) {
      setShowChatbot(false);
    }
  }, [isAgentMode, showChatbot]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { role: 'user', content: chatInput }]);
      // Simulate agent response
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'I understand your question about this analysis. Let me help you explore this further...' 
        }]);
      }, 1000);
      setChatInput('');
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
  };

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

    const handleAskAgent = () => {
      // Format all content similar to copyAll
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
      
      // Close all popovers
      setShowThinkingPopover(null);
      setContextMenu(null);
      setBiasPopover(null);
      setBiasInfoPopover(null);
      
      // Set chat input with formatted content
      setChatInput(formatted);
      
      // Show chatbot
      setShowChatbot(true);
      setChatMessages([]);
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
          <button 
            className="analysis-action-button ask-agent-button"
            onClick={handleAskAgent}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="12" y1="7" x2="12" y2="13"></line>
            </svg>
            Ask Agent
          </button>
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
            chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
              </div>
            ))
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
                {showThinkingPopover === 'thesisAtInception' && renderThinkingPopover('thesisAtInception', 'Thesis at Inception')}
                {showThinkingPopover === 'alphaDecay' && renderThinkingPopover('alphaDecay', 'Alpha Decay Analysis')}
                {showThinkingPopover === 'sentimentDrift' && renderThinkingPopover('sentimentDrift', 'Sentiment Drift Analysis')}
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
                    <div 
                      className="thesis-table-wrapper section-context"
                      onContextMenu={(e) => handleSectionContextMenu(e, 'thesisAtInception')}
                    >
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
                                style={{
                                  cursor: 'pointer',
                                  color: item.sentiment === 'Bullish' ? '#4caf50' : item.sentiment === 'Bearish' ? '#f44336' : '#ff9800'
                                }}
                                onClick={(e) => {
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
                                  
                                  setSentimentTooltip({
                                    sector: item.sector,
                                    baselineVector: item.baselineVector,
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
                                <div className="baseline-vector">
                                  <div className="baseline-item"><span className="baseline-key">Accuracy</span><span className="baseline-value">{(sentimentTooltip.baselineVector?.[0] ?? 0).toFixed(3)}</span></div>
                                  <div className="baseline-item"><span className="baseline-key">Precision</span><span className="baseline-value">{(sentimentTooltip.baselineVector?.[1] ?? 0).toFixed(3)}</span></div>
                                  <div className="baseline-item"><span className="baseline-key">Recall</span><span className="baseline-value">{(sentimentTooltip.baselineVector?.[2] ?? 0).toFixed(3)}</span></div>
                                </div>
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
                <h2 className="alpha-decay-heading">Alpha Decay: Inception vs Present</h2>
                <div className="alpha-decay-container">
                  <div 
                    className="alpha-decay-table-wrapper section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'alphaDecay')}
                  >
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
                    <div 
                      className="alpha-decay-graph-wrapper section-context"
                      onContextMenu={(e) => handleSectionContextMenu(e, 'alphaDecay')}
                    >
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
                <h2 className="alpha-decay-heading">Sentiment Drift Since Inception</h2>
                <div className="alpha-decay-container">
                  <div 
                    className="alpha-decay-table-wrapper section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'sentimentDrift')}
                  >
                    <div className="alpha-decay-content">
                      <table className="alpha-decay-table sentiment-drift-table">
                        <thead>
                          <tr>
                            <th>Sector</th>
                            <th>Inception v₀</th>
                            <th>Today vₜ</th>
                            <th>Cosine Similarity</th>
                            <th>Drift</th>
                          </tr>
                        </thead>
                        <tbody>
                          {thesisData.sectors.map((item, index) => {
                            const v0 = item.baselineVector || [0,0,0];
                            const vt = item.todayVector || [0,0,0];
                            const cos = computeCosineSimilarity(v0, vt);
                            const drift = 1 - cos; // 0 = no drift, 1 = orthogonal
                            const cosPct = (cos * 100).toFixed(1);
                            const driftPct = (drift * 100).toFixed(1);
                            return (
                              <tr key={`drift-${item.sector}`}>
                                <td className="sector-name-cell">
                                  <div className="sector-indicator" style={{ backgroundColor: getSectorColor(index) }}></div>
                                  {item.sector}
                                </td>
                                <td>
                                  <div className="vector-mini">
                                    <span className="mini-key">Acc</span><span className="mini-val">{(v0[0] ?? 0).toFixed(2)}</span>
                                    <span className="mini-key">Prec</span><span className="mini-val">{(v0[1] ?? 0).toFixed(2)}</span>
                                    <span className="mini-key">Rec</span><span className="mini-val">{(v0[2] ?? 0).toFixed(2)}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="vector-mini">
                                    <span className="mini-key">Acc</span><span className="mini-val">{(vt[0] ?? 0).toFixed(2)}</span>
                                    <span className="mini-key">Prec</span><span className="mini-val">{(vt[1] ?? 0).toFixed(2)}</span>
                                    <span className="mini-key">Rec</span><span className="mini-val">{(vt[2] ?? 0).toFixed(2)}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className={`cos-score ${cos >= 0.9 ? 'high' : cos >= 0.75 ? 'med' : 'low'}`}>{cosPct}%</div>
                                </td>
                                <td>
                                  <div className="drift-bar">
                                    <div className="drift-bar-fill" style={{ width: `${Math.min(100, Math.max(0, drift * 100))}%` }}></div>
                                    <span className="drift-label">{driftPct}%</span>
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
                {showThinkingPopover === 'turnoverRate' && renderThinkingPopover('turnoverRate', 'Turnover Rate Analysis')}
                {showThinkingPopover === 'winHoldLossHold' && renderThinkingPopover('winHoldLossHold', 'Winning Hold ÷ Losing Hold Analysis')}
                {showThinkingPopover === 'addToLoser' && renderThinkingPopover('addToLoser', 'Add-to-Loser Analysis')}
                {showThinkingPopover === 'reentryAfterStop' && renderThinkingPopover('reentryAfterStop', 'Re-entry After Stop-Loss Analysis')}
                {showThinkingPopover === 'alertRate' && renderThinkingPopover('alertRate', 'Bias Alert Trigger Rate Analysis')}
                {showThinkingPopover === 'overrideRate' && renderThinkingPopover('overrideRate', 'PM Override Rate Analysis')}
                <div className="bias-header">
                  <h2>Bias Sentinel</h2>
                  <p className="bias-sub">Live monitors of behavioral patterns against best-practice guardrails</p>
                </div>

                <div className="bias-grid">
                  <div 
                    className="bias-card section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'turnoverRate')}
                  >
                    <div className="metric-title">
                      Turnover Rate %
                      <button
                        type="button"
                        className="info-icon"
                        onClick={(e) => handleInfoIconClick(e, 'turnoverRate')}
                        aria-label="Show definition"
                      >
                        i
                      </button>
                    </div>
                    <div className="metric-row">
                      <span className={`status-chip ${biasStatus.turnoverRate(biasMetrics.turnoverRatePct)}`}>{biasMetrics.turnoverRatePct}%</span>
                      <span className="metric-guideline">Target: &lt; 40% (long-term portfolios)</span>
                    </div>
                    <div className="meter"><div className={`meter-fill ${biasStatus.turnoverRate(biasMetrics.turnoverRatePct)}`} style={{ width: `${Math.min(100, biasMetrics.turnoverRatePct)}%` }} /></div>
                  </div>

                  <div 
                    className="bias-card section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'winHoldLossHold')}
                  >
                    <div className="metric-title">
                      Winning Hold ÷ Losing Hold
                      <button
                        type="button"
                        className="info-icon"
                        onClick={(e) => handleInfoIconClick(e, 'winHoldLossHold')}
                        aria-label="Show definition"
                      >
                        i
                      </button>
                    </div>
                    <div className="metric-row">
                      <span className={`status-chip ${biasStatus.winHoldLossHold(biasMetrics.winHoldToLossHold)}`}>{biasMetrics.winHoldToLossHold.toFixed(2)}x</span>
                      <span className="metric-guideline">Target: &gt; 1.20x</span>
                    </div>
                    <div className="meter"><div className={`meter-fill ${biasStatus.winHoldLossHold(biasMetrics.winHoldToLossHold)}`} style={{ width: `${Math.min(100, (biasMetrics.winHoldToLossHold / 2.0) * 100)}%` }} /></div>
                  </div>

                  <div 
                    className="bias-card section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'addToLoser')}
                  >
                    <div className="metric-title">
                      Add-to-Loser %
                      <button
                        type="button"
                        className="info-icon"
                        onClick={(e) => handleInfoIconClick(e, 'addToLoser')}
                        aria-label="Show definition"
                      >
                        i
                      </button>
                    </div>
                    <div className="metric-row">
                      <span className={`status-chip ${biasStatus.addToLoser(biasMetrics.addToLoserPct)}`}>{biasMetrics.addToLoserPct.toFixed(1)}%</span>
                      <span className="metric-guideline">Target: &lt; 5% of all adds</span>
                    </div>
                    <div className="meter"><div className={`meter-fill ${biasStatus.addToLoser(biasMetrics.addToLoserPct)}`} style={{ width: `${Math.min(100, biasMetrics.addToLoserPct)}%` }} /></div>
                  </div>

                  <div 
                    className="bias-card section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'reentryAfterStop')}
                  >
                    <div className="metric-title">
                      Re-entry AFTER Stop-Loss %
                      <button
                        type="button"
                        className="info-icon"
                        onClick={(e) => handleInfoIconClick(e, 'reentryAfterStop')}
                        aria-label="Show definition"
                      >
                        i
                      </button>
                      <button
                        type="button"
                        className="tip-badge alert-badge"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const vw = window.innerWidth;
                          const vh = window.innerHeight;
                          const margin = 12;
                          let x = rect.left + rect.width / 2;
                          x = Math.max(margin, Math.min(vw - margin, x));
                          // Prefer above if there's space, else below
                          const spaceAbove = rect.top;
                          const spaceBelow = vh - rect.bottom;
                          const positionAbove = spaceAbove >= 160 || spaceAbove > spaceBelow;
                          const y = positionAbove ? rect.top : rect.bottom;
                          setBiasPopover({ x, y, positionAbove });
                        }}
                        aria-label="Show re-entry insight"
                      >
                        1
                      </button>
                    </div>
                    <div className="metric-row">
                      <span className={`status-chip ${biasStatus.reentryAfterStop(biasMetrics.reentryAfterStopPct)}`}>{biasMetrics.reentryAfterStopPct.toFixed(1)}%</span>
                      <span className="metric-guideline">Target: &lt; 10%</span>
                    </div>
                    <div className="meter"><div className={`meter-fill ${biasStatus.reentryAfterStop(biasMetrics.reentryAfterStopPct)}`} style={{ width: `${Math.min(100, biasMetrics.reentryAfterStopPct)}%` }} /></div>
                  </div>

                  <div 
                    className="bias-card section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'alertRate')}
                  >
                    <div className="metric-title">
                      Bias Alert Trigger Rate
                      <button
                        type="button"
                        className="info-icon"
                        onClick={(e) => handleInfoIconClick(e, 'alertRate')}
                        aria-label="Show definition"
                      >
                        i
                      </button>
                    </div>
                    <div className="metric-row">
                      <span className={`status-chip ${biasStatus.alertRate(biasMetrics.biasAlertRatePer100)}`}>{biasMetrics.biasAlertRatePer100.toFixed(2)} /100 pos</span>
                      <span className="metric-guideline">Target: &lt; 1.0 /100 pos /mo</span>
                    </div>
                    <div className="meter"><div className={`meter-fill ${biasStatus.alertRate(biasMetrics.biasAlertRatePer100)}`} style={{ width: `${Math.min(100, (biasMetrics.biasAlertRatePer100 / 2.0) * 100)}%` }} /></div>
                  </div>

                  <div 
                    className="bias-card section-context"
                    onContextMenu={(e) => handleSectionContextMenu(e, 'overrideRate')}
                  >
                    <div className="metric-title">
                      PM Override Rate
                      <button
                        type="button"
                        className="info-icon"
                        onClick={(e) => handleInfoIconClick(e, 'overrideRate')}
                        aria-label="Show definition"
                      >
                        i
                      </button>
                    </div>
                    <div className="metric-row">
                      <span className={`status-chip ${biasStatus.overrideRate(biasMetrics.overrideRatePct)}`}>{biasMetrics.overrideRatePct}%</span>
                      <span className="metric-guideline">Sweet-spot: 30–70%</span>
                    </div>
                    <div className="range-meter">
                      <div className="range-band bad" style={{ width: '15%' }} />
                      <div className="range-band warn" style={{ width: '15%' }} />
                      <div className="range-band ok" style={{ width: '40%' }} />
                      <div className="range-band warn" style={{ width: '15%' }} />
                      <div className="range-band bad" style={{ width: '15%' }} />
                      <div className="needle" style={{ left: `${biasMetrics.overrideRatePct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bias-footnote">Guidelines are indicative; investigate trend and context before action.</div>
              {biasPopover && ReactDOM.createPortal(
                (
                  <div
                    className="bias-popover"
                    style={{
                      position: 'fixed',
                      left: `${biasPopover.x}px`,
                      top: `${biasPopover.y}px`,
                      transform: biasPopover.positionAbove 
                        ? 'translate(-50%, calc(-100% - 12px))' 
                        : 'translate(-50%, 12px)',
                      zIndex: 10000
                    }}
                  >
                    <div className="tooltip-content">
                      <div className="tooltip-sector">Re-entry insight</div>
                      <div className="tooltip-baseline">
                        <div className="baseline-vector tooltip-message">
                          You've re-entered AAPL within 12 days of a stop-loss exit – pattern resembles past revenge trades (−3.7 % avg).
                        </div>
                      </div>
                    </div>
                  </div>
                ),
                document.body
              )}
              {biasInfoPopover && ReactDOM.createPortal(
                (
                  <div
                    className="bias-info-popover"
                    style={{
                      position: 'fixed',
                      left: `${biasInfoPopover.x}px`,
                      top: `${biasInfoPopover.y}px`,
                      transform: biasInfoPopover.positionAbove 
                        ? 'translate(-50%, calc(-100% - 12px))' 
                        : 'translate(-50%, 12px)',
                      zIndex: 10000
                    }}
                  >
                    <div className="tooltip-content">
                      <div className="tooltip-sector">Definition</div>
                      <div className="tooltip-baseline">
                        <div className="baseline-vector tooltip-message">
                          {biasDefinitions[biasInfoPopover.metric]}
                        </div>
                      </div>
                    </div>
                  </div>
                ),
                document.body
              )}
              </div>
              </div>
              {renderChatbot()}
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
    </div>
  );
}

export default Dashboard; 