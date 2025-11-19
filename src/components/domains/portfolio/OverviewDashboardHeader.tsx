/**
 * Overview Dashboard Header Component
 * Displays Company Overview, Sector Allocation, and Top Performers
 */
import React from 'react';

export function OverviewDashboardHeader() {
  // Mock data - in production, this would come from API or context
  const companyOverview = {
    name: 'Growth Portfolio',
    symbol: 'GRWTH',
    price: 1250000,
    marketCap: 1250000000,
    weekHigh52: 1300000,
    weekLow52: 950000,
    description: 'A diversified growth portfolio focused on technology, healthcare, and financial sectors with strong long-term performance.',
  };

  const sectorAllocation = [
    { sector: 'Technology', weight: 50 },
    { sector: 'Healthcare', weight: 20 },
    { sector: 'Financial', weight: 15 },
    { sector: 'Consumer', weight: 10 },
    { sector: 'Utilities', weight: 5 },
  ];

  const topPerformers = [
    { symbol: 'AAPL', name: 'Apple Inc.', change: 3.2 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', change: 2.8 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', change: 2.1 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', change: 1.9 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', change: 1.7 },
  ];

  return (
    <div className="overview-grid" style={{ marginBottom: '2rem' }}>
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
          {sectorAllocation.map((sector) => (
            <div key={sector.sector} className="allocation-bar">
              <span className="sector-name">{sector.sector}</span>
              <div className="bar-container">
                <div className="bar" style={{ width: `${sector.weight}%` }} />
                <span className="weight">{sector.weight}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-item top-performers">
        <h3>Top Performers</h3>
        <div className="performers-list">
          {topPerformers.map((stock) => (
            <div key={stock.symbol} className="performer-item">
              <span className="symbol">{stock.symbol}</span>
              <span className="name">{stock.name}</span>
              <span className={`change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                {stock.change >= 0 ? '+' : ''}
                {stock.change}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

