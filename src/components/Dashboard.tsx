/**
 * Generic Dashboard Component
 * Domain-agnostic dashboard that uses domain configuration
 */
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useDomain } from '../hooks/useDomain';
import { usePersonaTabs } from '../hooks/usePersonaTabs';
import { usePersona } from '../contexts/PersonaContext';
import { TabNavigation } from './common/TabNavigation';
import { SectionRenderer } from './common/SectionRenderer';
import { UserProfile } from './common/UserProfile';
import DecisionTrace from './DecisionTrace';
import ShowReasoning from './ShowReasoning';

export interface DashboardProps {
  showChatbot?: boolean;
  renderChatbot?: () => React.ReactNode;
  auditTraceRequest?: any;
  onAuditTraceConsumed?: () => void;
  onShowChatbot?: (show: boolean) => void;
  onSetChatInput?: (input: string) => void;
  onSetChatMessages?: (messages: any[]) => void;
}

export function Dashboard({
  showChatbot,
  renderChatbot,
  auditTraceRequest,
  onAuditTraceConsumed,
  onShowChatbot,
  onSetChatInput,
  onSetChatMessages,
}: DashboardProps) {
  const { config: domainConfig, isLoading, error } = useDomain();
  const personaTabs = usePersonaTabs();
  const { hasCapability } = usePersona();

  // All hooks must be called unconditionally before any early returns
  const sections = useMemo(() => domainConfig?.ui.sections || [], [domainConfig?.ui.sections]);
  // Use persona-based tabs instead of domain config tabs
  const tabs = useMemo(() => 
    personaTabs.length > 0 ? personaTabs : (domainConfig?.ui.tabs || []),
    [personaTabs, domainConfig?.ui.tabs]
  );
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [showThinkingPopover, setShowThinkingPopover] = useState<string | null>(null);
  const [showHoldingsPopup, setShowHoldingsPopup] = useState(false);
  const [showOptimizationPopup, setShowOptimizationPopup] = useState(false);
  const [actionsPopover, setActionsPopover] = useState<{ type: 'execute' | 'schedule' } | null>(null);
  const [expandedHoldingId, setExpandedHoldingId] = useState<number | null>(null);
  const [redFlagTooltip, setRedFlagTooltip] = useState<{ holdingId: number; flagIndex: number; x: number; y: number } | null>(null);
  const [internalAuditTraceRequest, setInternalAuditTraceRequest] = useState<any>(null);
  const [internalShowChatbot, setInternalShowChatbot] = useState(false);
  const [internalChatInput, setInternalChatInput] = useState('');
  const [internalChatMessages, setInternalChatMessages] = useState<any[]>([]);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  
  // Mock section thought logs - in production, this would come from API or context
  const [sectionThoughtLogs] = useState<Record<string, any[]>>({
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
        title: 'Risk Analysis',
        kind: 'analysis',
        prompt: 'Analyze portfolio risk metrics and identify any threshold breaches.',
        output: 'Technology sector exposure at 37.2% exceeds threshold of 35%. Portfolio beta elevated at 1.2 vs target of 1.0.'
      }
    ],
    actions: [
      {
        id: 'a1',
        time: '09:50 AM',
        title: 'Action Recommendations',
        kind: 'actions',
        prompt: 'Generate actionable recommendations based on risk analysis.',
        output: 'Rebalance technology exposure to reduce concentration risk. Review AAPL position sizing.'
      }
    ],
    performance: [
      {
        id: 'p1',
        time: '09:45 AM',
        title: 'Performance Metrics Calculation',
        kind: 'metrics',
        prompt: 'Calculate and display key performance metrics.',
        output: 'YTD Return: +12.3%, Sharpe Ratio: 1.8, Beta: 1.2, Tracking Error: 2.1%'
      }
    ],
    thesis: [
      {
        id: 't1',
        time: '10:00 AM',
        title: 'Thesis Decay Analysis',
        kind: 'analysis',
        prompt: 'Analyze thesis decay metrics for portfolio sectors.',
        output: 'Technology sector showing alpha decay from 2.5% to 2.1%. Healthcare sector maintaining stable alpha at 1.8%.'
      }
    ],
    bias: [
      {
        id: 'bi1',
        time: '10:15 AM',
        title: 'Bias Sentinel Analysis',
        kind: 'analysis',
        prompt: 'Analyze behavioral bias metrics for portfolio management.',
        output: 'Turnover rate at 32% (OK). Win-to-loss hold ratio at 1.05 (WARN - below 1.2 threshold). Add-to-loser rate at 4.1% (OK).'
      }
    ],
    thesisAtInception: [
      {
        id: 'ti1',
        time: '10:00 AM',
        title: 'Thesis at Inception Analysis',
        kind: 'analysis',
        prompt: 'Analyze initial thesis parameters for portfolio sectors at inception.',
        output: 'Thesis at inception established with Technology (35% allocation, 2.5% alpha), Healthcare (20%, 1.8% alpha), and Financial (15%, 1.2% alpha) sectors.'
      }
    ],
    alphaDecay: [
      {
        id: 'ad1',
        time: '10:05 AM',
        title: 'Alpha Decay Calculation',
        kind: 'analysis',
        prompt: 'Calculate alpha decay from inception to present for each sector.',
        output: 'Technology sector showing 0.4% alpha decay (2.5% to 2.1%). Healthcare maintaining stable alpha at 1.8%. Financial showing 0.1% improvement (1.2% to 1.3%).'
      }
    ],
    sentimentDrift: [
      {
        id: 'sd1',
        time: '10:10 AM',
        title: 'Sentiment Drift Analysis',
        kind: 'analysis',
        prompt: 'Analyze sentiment drift for internal and external sources since inception.',
        output: 'Technology: Internal drift 7.7%, External drift 5.6%, Variance 2.1% (LOW). Healthcare: Internal drift 1.7%, External drift 1.9%, Variance 0.2% (LOW). Financial: Internal drift 8.8%, External drift 6.5%, Variance 2.3% (LOW).'
      }
    ],
    aiActions: [
      {
        id: 'ai1',
        time: '09:45 AM',
        title: 'Portfolio Analysis Complete',
        kind: 'info',
        prompt: 'Initial portfolio analysis completed.',
        output: 'Initial portfolio analysis completed. Identified 3 opportunities for optimization.'
      }
    ],
    userActions: [
      {
        id: 'u1',
        time: '09:48 AM',
        title: 'Manual Trade Executed',
        kind: 'success',
        prompt: 'User executed trade.',
        output: 'Executed buy order for 100 shares of MSFT at $380.50. Reason: Strong earnings guidance.'
      }
    ],
  });

  // Mock agent actions data
  const [agentActions] = useState([
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

  const handleShowReasoning = (section: string) => {
    setShowThinkingPopover(showThinkingPopover === section ? null : section);
  };

  const handleCloseReasoning = (section: string) => {
    setShowThinkingPopover(null);
  };

  const handleReviewClick = () => {
    setShowHoldingsPopup(true);
    setRedFlagTooltip(null);
  };

  const handleOptimizeClick = () => {
    setShowOptimizationPopup(true);
  };

  const handleActionButtonClick = (e: React.MouseEvent, type: 'execute' | 'schedule') => {
    e.stopPropagation();
    if (actionsPopover && actionsPopover.type === type) {
      setActionsPopover(null);
      return;
    }
    setActionsPopover({ type });
  };

  const toggleHoldingExpansion = (holdingId: number) => {
    setExpandedHoldingId(expandedHoldingId === holdingId ? null : holdingId);
  };

  const handleRedFlagClick = (e: React.MouseEvent, holdingId: number, flagIndex: number) => {
    e.stopPropagation();
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

  // Format value with K/M/B shorthand
  const formatValue = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Mock holdings data for Technology sector
  const technologyHoldings = [
    {
      id: 1,
      ticker: 'AAPL',
      cusip: '037833100',
      totalValue: 125000000,
      redFlags: [],
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
      totalValue: 98000000,
      redFlags: [],
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
      totalValue: 75000000,
      redFlags: ['P/E ratio 35% above sector median'],
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
      totalValue: 62000000,
      redFlags: [],
      mfBreakdown: [
        { mfName: 'AI & Semiconductors Fund', value: 35000000 },
        { mfName: 'Tech Growth Fund A', value: 27000000 }
      ]
    },
    {
      id: 5,
      ticker: 'META',
      cusip: '30303M102',
      totalValue: 48000000,
      redFlags: ['SEC investigation pending', 'EBITDA margin declined 15% YoY'],
      mfBreakdown: [
        { mfName: 'Digital Assets Fund', value: 20000000 },
        { mfName: 'Innovation Equity Fund', value: 18000000 },
        { mfName: 'Sector Select Fund', value: 10000000 }
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

  const handleAskAgentFromReasoning = (content: string) => {
    if (!content) return;
    setShowThinkingPopover(null);
    if (onSetChatInput) {
      onSetChatInput(content);
    } else {
      setInternalChatInput(content);
    }
    if (onShowChatbot) {
      onShowChatbot(true);
    } else {
      setInternalShowChatbot(true);
    }
    if (onSetChatMessages) {
      onSetChatMessages([]);
    } else {
      setInternalChatMessages([]);
    }
  };

  const abbreviateLabel = (label: string): string => {
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
  };

  const handleAuditTrace = (entry: any, section: string, displayName?: string) => {
    const fallbackLabel = displayName || entry?.title || section || 'Trace';
    const sanitizedLabel = abbreviateLabel(fallbackLabel);
    const fullSectionName = displayName && displayName.trim().length ? displayName : fallbackLabel;
    
    setShowThinkingPopover(null);
    setInternalAuditTraceRequest({
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
    
    // Switch to Decision Trace tab
    const decisionTab = tabs.find(tab => tab.special === 'decisionTrace');
    if (decisionTab) {
      setActiveTabId(decisionTab.id);
    }
  };

  // Use internal audit trace request if no external one is provided
  const effectiveAuditTraceRequest = auditTraceRequest || internalAuditTraceRequest;

  // Use internal chatbot state if props aren't provided
  // For now, we'll use internal state since props might not be provided
  const effectiveShowChatbot = internalShowChatbot;
  const effectiveChatInput = internalChatInput;
  const effectiveChatMessages = internalChatMessages;

  const handleCloseChatbot = () => {
    setInternalShowChatbot(false);
    setIsChatExpanded(false);
  };

  const handleSendMessage = () => {
    const currentInput = effectiveChatInput || '';
    if (currentInput.trim()) {
      const newMessage = { role: 'user', content: currentInput };
      setInternalChatMessages([...internalChatMessages, newMessage]);
      // Simulate agent response
      setTimeout(() => {
        const agentResponse = { 
          role: 'assistant', 
          content: 'I understand your question about this analysis. Let me help you explore this further...' 
        };
        setInternalChatMessages(prev => [...prev, agentResponse]);
      }, 1000);
      setInternalChatInput('');
    }
  };

  const handleChatInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderChatbotInternal = () => {
    if (!effectiveShowChatbot) return null;
    
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
          {effectiveChatMessages.length === 0 ? (
            <div className="chatbot-welcome">
              <p>Ask me anything about this analysis...</p>
            </div>
          ) : (
            effectiveChatMessages.map((msg: any, index: number) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
              </div>
            ))
          )}
        </div>
        <div className={`chatbot-input-container ${isChatExpanded ? 'expanded' : ''}`}>
          <textarea
            className="chatbot-input"
            value={effectiveChatInput || ''}
            onChange={(e) => {
              setInternalChatInput(e.target.value);
            }}
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

  // Use provided renderChatbot or internal one
  const effectiveRenderChatbot = renderChatbot || renderChatbotInternal;

  const showReasoningCommonProps = {
    currentSection: showThinkingPopover,
    onOpen: handleShowReasoning,
    onClose: handleCloseReasoning,
    onAskAgent: handleAskAgentFromReasoning,
    onAuditTrace: handleAuditTrace,
  };

  // Update activeTabId when tabs load
  React.useEffect(() => {
    if (tabs.length > 0 && !activeTabId) {
      const defaultTab = tabs.find((tab) => tab.default) || tabs[0];
      if (defaultTab) {
        setActiveTabId(defaultTab.id);
      }
    }
  }, [tabs, activeTabId]);

  const activeTab = useMemo(() => {
    if (!tabs.length || !activeTabId) return undefined;
    return tabs.find((tab) => tab.id === activeTabId);
  }, [activeTabId, tabs]);

  const visibleSections = useMemo(() => {
    if (!activeTabId || !activeTab) {
      return []; // Don't show any sections if no tab is selected
    }
    return sections.filter((section) => activeTab.sections.includes(section.id));
  }, [sections, activeTab, activeTabId]);

  // Debug logging - must be before early returns
  React.useEffect(() => {
    console.log('Dashboard render:', {
      tabs: tabs,
      activeTabId,
      activeTab,
      visibleSections: visibleSections.map(s => s.id),
      sectionsCount: sections.length
    });
  }, [tabs, activeTabId, activeTab, visibleSections, sections.length]);

  // Show loading state while domain is being loaded
  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <p>Loading domain configuration...</p>
        </div>
      </div>
    );
  }

  // Show error state if domain failed to load
  if (error || !domainConfig) {
    return (
      <div className="dashboard">
        <div className="dashboard-error">
          <p>Failed to load domain configuration.</p>
          {error && (
            <>
              <p className="error-details">{error.message}</p>
              <p className="error-hint">Check browser console for details.</p>
            </>
          )}
          {!error && <p className="error-hint">Domain configuration is null. Check DomainProvider setup.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-title">
            <h1>{domainConfig.metadata.name}</h1>
            {domainConfig.metadata.description && (
              <p className="dashboard-description">{domainConfig.metadata.description}</p>
            )}
          </div>
          <UserProfile userName="John Doe" />
        </div>
      </div>

      {tabs && tabs.length > 0 ? (
        <>
          <TabNavigation
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
          />
          {/* Show DecisionTrace for Decision Trace tab - only if user has capability */}
          {activeTab?.special === 'decisionTrace' && hasCapability('canViewAuditLogs') ? (
            <DecisionTrace
              showChatbot={effectiveShowChatbot}
              renderChatbot={effectiveRenderChatbot}
              auditTraceRequest={effectiveAuditTraceRequest}
              onAuditTraceConsumed={() => {
                setInternalAuditTraceRequest(null);
                if (onAuditTraceConsumed) {
                  onAuditTraceConsumed();
                }
              }}
            />
          ) : (
            <div className="dashboard-content" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
              {activeTabId === 'overview' && visibleSections.length > 0 ? (
                <div className={`agent-tab-content ${effectiveShowChatbot ? 'with-chatbot' : ''}`}>
                  <div className="agent-tab-main">
                    <div className="agent-tiled-view">
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
                            {visibleSections.map((section) => {
                              const sectionLogs = sectionThoughtLogs[section.id] || [];
                              return (
                                <SectionRenderer
                                  key={section.id}
                                  section={section}
                                  data={sectionLogs}
                                  showReasoningProps={showReasoningCommonProps}
                                  onAction={(action, payload) => {
                                    if (action === 'review') {
                                      handleReviewClick();
                                    } else if (action === 'optimize') {
                                      handleOptimizeClick();
                                    } else if (action === 'execute' || action === 'schedule') {
                                      // Create a synthetic event for handleActionButtonClick
                                      const syntheticEvent = {
                                        stopPropagation: () => {},
                                      } as React.MouseEvent;
                                      handleActionButtonClick(syntheticEvent, action as 'execute' | 'schedule');
                                    }
                                  }}
                                />
                              );
                            })}
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
                                {sectionThoughtLogs.aiActions && sectionThoughtLogs.aiActions.length > 0 && (
                                  <ShowReasoning
                                    section="aiActions"
                                    title="Recent AI Actions"
                                    logs={sectionThoughtLogs.aiActions}
                                    {...showReasoningCommonProps}
                                  />
                                )}
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
                                {sectionThoughtLogs.userActions && sectionThoughtLogs.userActions.length > 0 && (
                                  <ShowReasoning
                                    section="userActions"
                                    title="Recent User Actions"
                                    logs={sectionThoughtLogs.userActions}
                                    {...showReasoningCommonProps}
                                  />
                                )}
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
                  {effectiveRenderChatbot()}
                </div>
              ) : visibleSections.length > 0 ? (
                visibleSections.map((section) => {
                  // For thesis section, pass all thesis-related logs
                  const sectionLogs = section.id === 'thesis' 
                    ? [
                        ...(sectionThoughtLogs.thesisAtInception || []),
                        ...(sectionThoughtLogs.alphaDecay || []),
                        ...(sectionThoughtLogs.sentimentDrift || []),
                        ...(sectionThoughtLogs.thesis || []),
                      ]
                    : sectionThoughtLogs[section.id] || [];
                  
                  return (
                    <SectionRenderer
                      key={section.id}
                      section={section}
                      data={sectionLogs}
                      showReasoningProps={showReasoningCommonProps}
                      onAction={(action, payload) => {
                        if (action === 'review') {
                          handleReviewClick();
                        } else if (action === 'optimize') {
                          handleOptimizeClick();
                        } else if (action === 'execute' || action === 'schedule') {
                          // Create a synthetic event for handleActionButtonClick
                          const syntheticEvent = {
                            stopPropagation: () => {},
                          } as React.MouseEvent;
                          handleActionButtonClick(syntheticEvent, action as 'execute' | 'schedule');
                        }
                      }}
                    />
                  );
                })
              ) : activeTabId ? (
                <div className="dashboard-empty">
                  <p>No sections available for this tab.</p>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div className="dashboard-content">
          <p>No tabs configured for this domain.</p>
        </div>
      )}

      {/* Popups */}
      {showHoldingsPopup && ReactDOM.createPortal(
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
                          <td colSpan={3} className="mf-breakdown-cell">
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
        </div>,
        document.body
      )}

      {showOptimizationPopup && ReactDOM.createPortal(
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
        </div>,
        document.body
      )}

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
    </div>
  );
}

export default Dashboard;

