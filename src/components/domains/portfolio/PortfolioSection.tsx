/**
 * Portfolio Section Component
 * Renders portfolio-specific sections based on type
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import ShowReasoning from '../../ShowReasoning';

export interface PortfolioSectionProps {
  type: 'briefing' | 'risk' | 'actions' | 'performance' | 'thesis' | 'bias';
  data?: any;
  logs?: any[];
  onAction?: (action: string, payload?: any) => void;
  showReasoningProps?: any;
}

export function PortfolioSection({
  type,
  data,
  logs = [],
  onAction,
  showReasoningProps,
}: PortfolioSectionProps) {
  const sectionConfig = {
    briefing: {
      title: 'Morning Portfolio Briefing',
      sectionId: 'briefing',
    },
    risk: {
      title: 'Risk Alerts',
      sectionId: 'risk',
    },
    actions: {
      title: "Today's Actions",
      sectionId: 'actions',
    },
    performance: {
      title: 'Performance Metrics',
      sectionId: 'performance',
    },
    thesis: {
      title: 'Thesis Decay',
      sectionId: 'thesis',
    },
    bias: {
      title: 'Bias Sentinel',
      sectionId: 'bias',
    },
  };

  const config = sectionConfig[type];
  const showReasoningCommonProps = showReasoningProps || {
    onCopy: () => {},
    onExport: () => {},
  };

  const handleReviewClick = () => {
    onAction?.('review', { section: config.sectionId });
  };

  const handleOptimizeClick = () => {
    onAction?.('optimize', { section: config.sectionId });
  };

  const handleActionButtonClick = (e: React.MouseEvent, actionType: string) => {
    e.stopPropagation();
    onAction?.(actionType, { section: config.sectionId });
  };

  const renderContent = () => {
    switch (type) {
      case 'briefing':
        return (
          <div className="thinking-message section-context">
            <p>Portfolio is currently tracking 2.3% above benchmark YTD. Key positions AAPL and MSFT showing strong momentum.</p>
          </div>
        );

      case 'risk':
        return (
          <div className="thinking-insights section-context">
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
        );

      case 'actions':
        return (
          <div className="thinking-recommendations section-context">
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
        );

      case 'performance':
        return (
          <div className="thinking-performance section-context">
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
        );

      case 'thesis':
        return <ThesisDecaySection logs={logs} showReasoningProps={showReasoningCommonProps} />;

      case 'bias':
        const biasMetrics = [
          {
            key: 'turnoverRate',
            title: 'Turnover Rate %',
            value: 32,
            unit: '%',
            guideline: '< 40%',
            status: 'ok',
            maxValue: 100,
            showMeter: true
          },
          {
            key: 'winHoldLossHold',
            title: 'Winning Trade Hold Time ÷ Losing Trade Hold Time',
            value: 1.05,
            unit: '',
            guideline: 'Ratio >1.2',
            status: 'warn',
            maxValue: 2.0,
            showMeter: true
          },
          {
            key: 'addToLoser',
            title: 'Add-to-Loser %',
            value: 4.1,
            unit: '%',
            guideline: '< 5%',
            status: 'ok',
            maxValue: 20,
            showMeter: true
          },
          {
            key: 'reentryAfterStop',
            title: 'Re-entry AFTER Stop-Loss %',
            value: 8.5,
            unit: '%',
            guideline: '< 10%',
            status: 'ok',
            maxValue: 30,
            showMeter: true
          },
          {
            key: 'alertRate',
            title: 'Bias Alert Trigger Rate',
            value: 0.7,
            unit: ' /100 positions',
            guideline: '< 1.0 alerts',
            status: 'ok',
            maxValue: 3.0,
            showMeter: true
          },
          {
            key: 'overrideRate',
            title: 'PM Override Rate',
            value: 46,
            unit: '%',
            guideline: '30–70% sweet-spot',
            status: 'ok',
            minValue: 0,
            maxValue: 100,
            showRangeMeter: true
          }
        ];

        return (
          <div className="thinking-insights section-context">
            <div className="bias-sentinel">
              <div className="bias-header">
                <h2>Bias Sentinel</h2>
                <p className="bias-sub">Behavioral bias detection metrics</p>
              </div>
              <div className="bias-grid">
                {biasMetrics.map((metric) => (
                  <div key={metric.key} className="bias-card">
                    <div className="metric-title">
                      <span>{metric.title}</span>
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
            </div>
          </div>
        );

      default:
        return (
          <div className="section-content">
            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
          </div>
        );
    }
  };

  return (
    <div className={`portfolio-section portfolio-section-${type}`}>
      <div className="section-header">
        <h4>{config.title}</h4>
        {logs && logs.length > 0 && (
          <ShowReasoning
            section={config.sectionId}
            title={config.title}
            logs={logs}
            {...showReasoningCommonProps}
          />
        )}
      </div>
      {renderContent()}
    </div>
  );
}

// Thesis Decay Section Component
interface ThesisDecaySectionProps {
  logs?: any[];
  showReasoningProps?: any;
}

function ThesisDecaySection({ logs = [], showReasoningProps }: ThesisDecaySectionProps) {
  // Filter logs by section for each ShowReasoning component
  const thesisAtInceptionLogs = logs.filter((log: any) => 
    log.id?.startsWith('ti') || log.title?.toLowerCase().includes('thesis at inception')
  );
  const alphaDecayLogs = logs.filter((log: any) => 
    log.id?.startsWith('ad') || log.title?.toLowerCase().includes('alpha decay')
  );
  const sentimentDriftLogs = logs.filter((log: any) => 
    log.id?.startsWith('sd') || log.title?.toLowerCase().includes('sentiment drift')
  );
  const [isThesisPanelExpanded, setIsThesisPanelExpanded] = useState(true);
  const [selectedAlphaDecayRow, setSelectedAlphaDecayRow] = useState<string | null>(null);
  const [sentimentTooltip, setSentimentTooltip] = useState<any>(null);
  const [sentimentDriftTooltip, setSentimentDriftTooltip] = useState<any>(null);

  const thesisData = {
    inceptionDate: new Date('2023-01-15'),
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
        externalSentimentToday: [0.68, 0.30, 0.20],
      },
      {
        sector: 'Healthcare',
        weight: 20,
        alpha: 1.8,
        sharpeRatio: 1.6,
        targetAlpha: 2.0,
        targetSharpe: 1.8,
        presentAlpha: 1.8,
        sentiment: 'Neutral',
        baselineVector: [0.55, 0.30, 0.15],
        todayVector: [0.56, 0.29, 0.16],
        internalSentimentBaseline: [0.58, 0.28, 0.14],
        internalSentimentToday: [0.59, 0.27, 0.15],
        externalSentimentBaseline: [0.52, 0.32, 0.16],
        externalSentimentToday: [0.53, 0.31, 0.17],
      },
      {
        sector: 'Financial',
        weight: 15,
        alpha: 1.2,
        sharpeRatio: 1.4,
        targetAlpha: 1.5,
        targetSharpe: 1.6,
        presentAlpha: 1.3,
        sentiment: 'Bullish',
        baselineVector: [0.65, 0.20, 0.18],
        todayVector: [0.60, 0.25, 0.20],
        internalSentimentBaseline: [0.68, 0.18, 0.16],
        internalSentimentToday: [0.62, 0.23, 0.19],
        externalSentimentBaseline: [0.62, 0.22, 0.20],
        externalSentimentToday: [0.58, 0.27, 0.21],
      },
    ],
  };

  const getSectorColor = (index: number): string => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[index % colors.length];
  };

  const calculateDuration = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    return `${years} years ${months % 12} months`;
  };

  const computeCosineSimilarity = (vec1: number[], vec2: number[]): number => {
    if (vec1.length !== vec2.length) return 0;
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  };

  const handleSentimentClick = (e: React.MouseEvent, sector: string, baselineVector: number[]) => {
    const clickX = e.clientX;
    const clickY = e.clientY;
    const windowHeight = window.innerHeight;
    const spaceAbove = clickY;
    const spaceBelow = windowHeight - clickY;
    const positionAbove = spaceAbove > spaceBelow && spaceAbove > 150;

    setSentimentTooltip({
      sector,
      baselineVector,
      x: clickX,
      y: clickY,
      positionAbove,
    });
  };

  const handleSentimentDriftClick = (
    e: React.MouseEvent,
    sector: string,
    type: 'internal' | 'external',
    baselineVector: number[],
    todayVector: number[]
  ) => {
    const clickX = e.clientX;
    const clickY = e.clientY;
    const windowHeight = window.innerHeight;
    const spaceAbove = clickY;
    const spaceBelow = windowHeight - clickY;
    const positionAbove = spaceAbove > spaceBelow && spaceAbove > 200;

    setSentimentDriftTooltip({
      sector,
      type,
      baselineVector,
      todayVector,
      x: clickX,
      y: clickY,
      positionAbove,
    });
  };

  return (
    <div className="thesis-drift-section">
      {/* Thesis at Inception */}
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
                {showReasoningProps && (
                  <ShowReasoning
                    section="thesisAtInception"
                    title="Thesis at Inception"
                    logs={thesisAtInceptionLogs}
                    {...showReasoningProps}
                  />
                )}
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
                        <div
                          className="sector-indicator"
                          style={{ backgroundColor: getSectorColor(index) }}
                        />
                        {item.sector}
                      </td>
                      <td>
                        <div className="allocation-cell">
                          <div className="allocation-bar-container">
                            <div
                              className="allocation-bar-fill"
                              style={{
                                width: `${item.weight}%`,
                                backgroundColor: getSectorColor(index),
                              }}
                            />
                          </div>
                          <span className="allocation-percent">{item.weight}%</span>
                        </div>
                      </td>
                      <td className={item.alpha >= item.targetAlpha ? 'positive' : 'negative'}>
                        {item.alpha > 0 ? '+' : ''}
                        {item.alpha.toFixed(2)}%
                      </td>
                      <td>{item.sharpeRatio.toFixed(2)}</td>
                      <td className="target-value">{item.targetAlpha.toFixed(2)}%</td>
                      <td className="target-value">{item.targetSharpe.toFixed(2)}</td>
                      <td
                        className="sentiment-cell"
                        style={{
                          cursor: 'pointer',
                          color:
                            item.sentiment === 'Bullish'
                              ? '#4caf50'
                              : item.sentiment === 'Bearish'
                              ? '#f44336'
                              : '#ff9800',
                        }}
                        onClick={(e) => handleSentimentClick(e, item.sector, item.baselineVector)}
                      >
                        {item.sentiment}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Alpha Decay Section */}
      <div className="alpha-decay-section">
        <div className="section-header">
          <h2 className="alpha-decay-heading">Alpha Decay: Inception vs Present</h2>
          {showReasoningProps && (
            <ShowReasoning
              section="alphaDecay"
              title="Alpha Decay"
              logs={alphaDecayLogs}
              {...showReasoningProps}
            />
          )}
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
                          setSelectedAlphaDecayRow(
                            selectedAlphaDecayRow === item.sector ? null : item.sector
                          );
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="sector-name-cell">
                          <div
                            className="sector-indicator"
                            style={{ backgroundColor: getSectorColor(index) }}
                          />
                          {item.sector}
                        </td>
                        <td className="alpha-value">
                          {item.alpha > 0 ? '+' : ''}
                          {item.alpha.toFixed(2)}%
                        </td>
                        <td className={item.presentAlpha >= item.alpha ? 'positive' : 'negative'}>
                          {item.presentAlpha > 0 ? '+' : ''}
                          {item.presentAlpha.toFixed(2)}%
                        </td>
                        <td className={decay >= 0 ? 'positive' : 'negative'}>
                          {decay >= 0 ? '+' : ''}
                          {decay.toFixed(2)}%
                        </td>
                        <td className={decay >= 0 ? 'positive' : 'negative'}>
                          {decay >= 0 ? '+' : ''}
                          {decayPercent}%
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
                    const selectedSector = thesisData.sectors.find(
                      (s) => s.sector === selectedAlphaDecayRow
                    );
                    if (!selectedSector) return null;

                    const sectorIndex = thesisData.sectors.findIndex(
                      (s) => s.sector === selectedAlphaDecayRow
                    );
                    const maxAlpha = 3.0;
                    const inceptionAlpha = selectedSector.alpha;
                    const presentAlpha = selectedSector.presentAlpha;

                    const points = [
                      { x: 40, y: 180 - (inceptionAlpha / maxAlpha) * 140 },
                      { x: 160, y: 180 - (presentAlpha / maxAlpha) * 140 },
                    ];

                    const pathData = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

                    return (
                      <svg viewBox="0 0 200 200" className="decay-graph-svg">
                        <line x1="30" y1="20" x2="30" y2="180" stroke="#dfe6e9" strokeWidth="2" />
                        <line x1="30" y1="180" x2="180" y2="180" stroke="#dfe6e9" strokeWidth="2" />
                        {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((val, i) => {
                          const y = 180 - (val / 3.0) * 160;
                          return (
                            <g key={i}>
                              <line
                                x1="30"
                                y1={y}
                                x2="180"
                                y2={y}
                                stroke="#f1f3f5"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                              />
                              <text
                                x="25"
                                y={y}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fontSize="10"
                                fill="#636e72"
                              >
                                {val.toFixed(1)}
                              </text>
                            </g>
                          );
                        })}
                        <path
                          d={pathData}
                          stroke={getSectorColor(sectorIndex)}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray="5,5"
                        />
                        <circle
                          cx={points[0].x}
                          cy={points[0].y}
                          r="5"
                          fill={getSectorColor(sectorIndex)}
                        />
                        <circle
                          cx={points[1].x}
                          cy={points[1].y}
                          r="5"
                          fill={getSectorColor(sectorIndex)}
                          opacity="0.7"
                        />
                        <text
                          x={points[0].x}
                          y={points[0].y - 12}
                          textAnchor="middle"
                          dominantBaseline="text-after-edge"
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
                          dominantBaseline="text-after-edge"
                          fontSize="9"
                          fill={getSectorColor(sectorIndex)}
                          fontWeight="600"
                          opacity="0.7"
                        >
                          Present: {presentAlpha.toFixed(2)}%
                        </text>
                        <text
                          x={points[0].x}
                          y="195"
                          textAnchor="middle"
                          dominantBaseline="text-before-edge"
                          fontSize="9"
                          fill="#636e72"
                        >
                          Inception
                        </text>
                        <text
                          x={points[1].x}
                          y="195"
                          textAnchor="middle"
                          dominantBaseline="text-before-edge"
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

      {/* Sentiment Drift Section */}
      <div className="sentiment-drift-section">
        <div className="section-header">
          <h4>Sentiment Drift Since Inception</h4>
          {showReasoningProps && (
            <ShowReasoning
              section="sentimentDrift"
              title="Sentiment Drift"
              logs={sentimentDriftLogs}
              {...showReasoningProps}
            />
          )}
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
                    const internalBaseline = item.internalSentimentBaseline || [0, 0, 0];
                    const internalToday = item.internalSentimentToday || [0, 0, 0];
                    const externalBaseline = item.externalSentimentBaseline || [0, 0, 0];
                    const externalToday = item.externalSentimentToday || [0, 0, 0];

                    const internalCos = computeCosineSimilarity(internalBaseline, internalToday);
                    const externalCos = computeCosineSimilarity(externalBaseline, externalToday);

                    const internalDrift = 1 - internalCos;
                    const externalDrift = 1 - externalCos;
                    const variance = Math.abs(internalDrift - externalDrift);

                    const internalDriftPct = (internalDrift * 100).toFixed(1);
                    const externalDriftPct = (externalDrift * 100).toFixed(1);
                    const variancePct = (variance * 100).toFixed(2);
                    const varianceStatus = variance < 0.05 ? 'low' : variance < 0.15 ? 'med' : 'high';

                    return (
                      <tr key={`drift-${item.sector}`}>
                        <td className="sector-name-cell">
                          <div
                            className="sector-indicator"
                            style={{ backgroundColor: getSectorColor(index) }}
                          />
                          {item.sector}
                        </td>
                        <td>
                          <div
                            className="sentiment-drift-cell clickable-sentiment-drift"
                            onClick={(e) =>
                              handleSentimentDriftClick(
                                e,
                                item.sector,
                                'internal',
                                internalBaseline,
                                internalToday
                              )
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            <div
                              className={`cos-score ${
                                internalCos >= 0.9 ? 'high' : internalCos >= 0.75 ? 'med' : 'low'
                              }`}
                            >
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
                            onClick={(e) =>
                              handleSentimentDriftClick(
                                e,
                                item.sector,
                                'external',
                                externalBaseline,
                                externalToday
                              )
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            <div
                              className={`cos-score ${
                                externalCos >= 0.9 ? 'high' : externalCos >= 0.75 ? 'med' : 'low'
                              }`}
                            >
                              {(externalCos * 100).toFixed(1)}%
                            </div>
                            <div className="drift-indicator">
                              <span className="drift-value">{externalDriftPct}%</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="variance-cell">
                            <span className="variance-value">{variancePct}%</span>
                            <div className="variance-bar">
                              <div
                                className="variance-bar-fill"
                                style={{
                                  width: `${Math.min(100, (variance / 0.3) * 100)}%`,
                                  backgroundColor:
                                    varianceStatus === 'low'
                                      ? '#27ae60'
                                      : varianceStatus === 'med'
                                      ? '#f39c12'
                                      : '#e74c3c',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`variance-status variance-status-${varianceStatus}`}
                          >
                            {varianceStatus.toUpperCase()}
                          </span>
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

      {/* Tooltips */}
      {sentimentTooltip &&
        ReactDOM.createPortal(
          <div
            className="sentiment-tooltip"
            style={{
              position: 'fixed',
              left: `${sentimentTooltip.x}px`,
              top: `${sentimentTooltip.y}px`,
              transform: sentimentTooltip.positionAbove
                ? 'translate(-50%, calc(-100% - 10px))'
                : 'translate(-50%, 10px)',
              zIndex: 10000,
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
                  <div className="baseline-item">
                    <span className="baseline-key">Accuracy</span>
                    <span className="baseline-value">
                      {(sentimentTooltip.baselineVector?.[0] ?? 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="baseline-item">
                    <span className="baseline-key">Precision</span>
                    <span className="baseline-value">
                      {(sentimentTooltip.baselineVector?.[1] ?? 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="baseline-item">
                    <span className="baseline-key">Recall</span>
                    <span className="baseline-value">
                      {(sentimentTooltip.baselineVector?.[2] ?? 0).toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {sentimentDriftTooltip &&
        ReactDOM.createPortal(
          <div
            className="sentiment-drift-tooltip"
            style={{
              position: 'fixed',
              left: `${sentimentDriftTooltip.x}px`,
              top: `${sentimentDriftTooltip.y}px`,
              transform: sentimentDriftTooltip.positionAbove
                ? 'translate(-50%, calc(-100% - 10px))'
                : 'translate(-50%, 10px)',
              zIndex: 10000,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSentimentDriftTooltip(null);
            }}
          >
            <div className="tooltip-content">
              <div className="tooltip-sector">
                {sentimentDriftTooltip.sector} -{' '}
                {sentimentDriftTooltip.type === 'internal' ? 'Internal' : 'External'}
              </div>
              <div className="tooltip-baseline">
                <div className="baseline-label">Baseline:</div>
                <div className="baseline-vector">
                  <span className="baseline-value">
                    [
                    {sentimentDriftTooltip.baselineVector
                      .map((v: number) => v.toFixed(3))
                      .join(', ')}
                    ]
                  </span>
                </div>
              </div>
              <div className="tooltip-baseline">
                <div className="baseline-label">Today:</div>
                <div className="baseline-vector">
                  <span className="baseline-value">
                    [
                    {sentimentDriftTooltip.todayVector
                      .map((v: number) => v.toFixed(3))
                      .join(', ')}
                    ]
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

