// src/screens/Dashboard.jsx
import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as AreaTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as BarTooltip,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Loader from "../components/Loader";
import ErrorToast from "../components/ErrorToast";
import useTelegram from "../hooks/useTelegram";

// Static charts (spec – real API doesn’t send chart arrays)
const portfolioDataMap = {
  "7d": [
    { label: "Nov 1", value: 520 },
    { label: "Nov 5", value: 545 },
    { label: "Nov 10", value: 560 },
    { label: "Nov 15", value: 590 },
    { label: "Nov 20", value: 610 },
    { label: "Nov 22 Today", value: 634.8 },
  ],
  "1m": [
    { label: "Oct 1", value: 450 },
    { label: "Oct 10", value: 470 },
    { label: "Oct 20", value: 520 },
    { label: "Nov 1", value: 550 },
    { label: "Nov 10", value: 560 },
    { label: "Nov 22 Today", value: 634.8 },
  ],
  "3m": [
    { label: "Sep", value: 380 },
    { label: "Oct", value: 450 },
    { label: "Nov", value: 634.8 },
  ],
};

const dailyPnl = [
  { day: "Mon", value: 12.5 },
  { day: "Tue", value: -3.2 },
  { day: "Wed", value: 5.1 },
  { day: "Thu", value: -1.8 },
  { day: "Fri", value: 8.3 },
  { day: "Sat", value: 4.4 },
  { day: "Sun", value: -2.1 },
];

const recentTradesStatic = [
  {
    pair: "BTCUSDT",
    side: "LONG x10",
    time: "2h ago",
    pnl: "+3.40%",
    positive: true,
  },
  {
    pair: "ETHUSDT",
    side: "SHORT x10",
    time: "5h ago",
    pnl: "-1.20%",
    positive: false,
  },
  {
    pair: "SOLUSDT",
    side: "LONG x10",
    time: "8h ago",
    pnl: "+5.80%",
    positive: true,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { isTelegram } = useTelegram();

  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [timeframe, setTimeframe] = useState("7d");
  const [autoTradingOn, setAutoTradingOn] = useState(false);

  const currentPortfolioData = portfolioDataMap[timeframe] || [];
  const showAxisLabels =
    timeframe === "7d"
      ? ["Nov 1", "Nov 5", "Nov 10", "Nov 15", "Nov 20", "Nov 22 Today"]
      : timeframe === "1m"
      ? ["Oct 1", "Oct 10", "Oct 20", "Nov 1", "Nov 10", "Nov 22 Today"]
      : ["Sep", "Oct", "Nov"];

  // Fetch portfolio
  useEffect(() => {
    let active = true;

    async function loadPortfolio() {
      try {
        setLoading(true);
        setError(null);

        // Dev fallback with chatId if you set VITE_DEV_CHAT_ID in .env
        const devParams =
          !isTelegram && import.meta.env.VITE_DEV_CHAT_ID
            ? { chatId: import.meta.env.VITE_DEV_CHAT_ID }
            : undefined;

        const res = await api.get("/api/user/portfolio", {
          params: devParams,
        });
        const data = res.data ?? res;

        if (!active) return;

        if (!data.ok) {
          throw new Error(data.error || "Failed to load portfolio");
        }

        setPortfolio(data);
        setAutoTradingOn(data.tradingStatus === "active");
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load portfolio");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPortfolio();
    return () => {
      active = false;
    };
  }, [isTelegram]);

  const handleDeposit = () => navigate("/deposit");
  const handleWithdraw = () => navigate("/withdraw");

  const handleRefresh = async () => {
    if (!portfolio) return;
    try {
      setLoading(true);
      setError(null);

      const devParams =
        !isTelegram && import.meta.env.VITE_DEV_CHAT_ID
          ? { chatId: import.meta.env.VITE_DEV_CHAT_ID }
          : undefined;

      const res = await api.get("/api/user/portfolio", { params: devParams });
      const data = res.data ?? res;

      if (!data.ok) {
        throw new Error(data.error || "Failed to refresh portfolio");
      }

      setPortfolio(data);
      setAutoTradingOn(data.tradingStatus === "active");
    } catch (err) {
      setError(err.message || "Failed to refresh portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoTrading = async () => {
    const next = !autoTradingOn;
    setAutoTradingOn(next);

    try {
      const res = await api.post("/api/user/trading/toggle", { active: next });
      const data = res.data ?? res;
      if (!data.ok) {
        throw new Error(data.error || "Failed to update trading status");
      }
    } catch (err) {
      setAutoTradingOn((prev) => !prev);
      setError(err.message || "Failed to update trading status");
    }
  };

  if (loading && !portfolio) {
    return (
      <div className="screen">
        <div className="phone-shell">
          <Loader />
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="screen">
        <div className="phone-shell">
          {error && <ErrorToast message={error} />}
        </div>
      </div>
    );
  }

  const balance = portfolio.balance ?? 0;
  const todayAmount = portfolio.todayPnl?.amount ?? 0;
  const todayPercent = portfolio.todayPnl?.percent ?? 0;
  const allTimeAmount = portfolio.estimatedNetProfit ?? 0;
  const allTimePercent = portfolio.estimatedNetProfitPct ?? 0;

  const totalDeposits = portfolio.totalDeposits ?? 0;
  const totalWithdrawals = portfolio.totalWithdrawals ?? 0;
  const referralEarned = portfolio.totalReferralRewards ?? 0;

  const winRate = 71.4; // from spec (stats endpoint), not this API
  const winRateChange = 2.3;

  const recentTrades = recentTradesStatic;

  return (
    <div className="screen">
      {error && <ErrorToast message={error} />}

      <div className="phone-shell">
        <div className="phone-handle" />

        {/* BALANCE CARD */}
        <section className="balance-card card-glass">
          <div className="balance-card-header">
            <span className="pill-tab pill-tab-active">Total Balance</span>
          </div>

          <div className="balance-main">
            <div>
              <p className="balance-amount">${balance.toFixed(2)}</p>

              <div className="balance-sub-row">
                {/* Today */}
                <div className="balance-sub-item">
                  <div className="icon-circle red">
                    <span>↓</span>
                  </div>
                  <div className="balance-sub-text">
                    <span className="label">Today</span>
                    <span className="value red">
                      {todayAmount < 0 ? "-" : "+"}
                      {Math.abs(todayAmount).toFixed(2)} (
                      {todayPercent < 0 ? "-" : "+"}
                      {Math.abs(todayPercent).toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {/* All Time */}
                <div className="balance-sub-item">
                  <div className="icon-circle green">
                    <span>↑</span>
                  </div>
                  <div className="balance-sub-text">
                    <span className="label">All Time</span>
                    <span className="value green">
                      {allTimeAmount < 0 ? "-" : "+"}
                      {Math.abs(allTimeAmount).toFixed(2)} (
                      {allTimePercent < 0 ? "-" : "+"}
                      {Math.abs(allTimePercent).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="blur-orb" />
          </div>
        </section>

        {/* ACTION BUTTONS */}
        <section className="actions-row">
          <button className="action-btn green" onClick={handleDeposit}>
            <span className="icon-circle solid">＋</span>
            <span>Deposit</span>
          </button>
          <button className="action-btn blue" onClick={handleWithdraw}>
            <span className="icon-circle solid">⬇</span>
            <span>Withdraw</span>
          </button>
          <button className="action-btn dark" onClick={handleRefresh}>
            <span className="icon-circle solid">⟳</span>
            <span>Refresh</span>
          </button>
        </section>

        {/* PORTFOLIO GROWTH */}
        <section className="card-glass portfolio-card">
          <div className="section-header">
            <span className="section-title">Portfolio Growth</span>
            <div className="timeframe-tabs">
              {["7d", "1m", "3m"].map((tf) => (
                <button
                  key={tf}
                  className={timeframe === tf ? "chip chip-active" : "chip"}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentPortfolioData}>
                <defs>
                  <linearGradient id="pfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <AreaTooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid rgba(148,163,184,0.5)",
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                  labelFormatter={(v) => v}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#pfGradient)"
                  dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-axis-footer">
            {showAxisLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>

        {/* STATS GRID */}
        <section className="stats-grid">
          <div className="card-soft stats-item">
            <div className="stats-icon purple">↑</div>
            <div className="stats-content">
              <p className="stats-label">Total Deposits</p>
              <p className="stats-value">${totalDeposits.toFixed(2)}</p>
            </div>
          </div>
          <div className="card-soft stats-item">
            <div className="stats-icon orange">↓</div>
            <div className="stats-content">
              <p className="stats-label">Total Withdrawals</p>
              <p className="stats-value">${totalWithdrawals.toFixed(2)}</p>
            </div>
          </div>
          <div className="card-soft stats-item">
            <div className="stats-icon pink">🎁</div>
            <div className="stats-content">
              <p className="stats-label">Referral Earned</p>
              <p className="stats-value">${referralEarned.toFixed(2)}</p>
            </div>
          </div>
          <div className="card-soft stats-item">
            <div className="stats-content">
              <p className="stats-label">Win Rate</p>
              <p className="stats-value">{winRate.toFixed(1)}%</p>
            </div>
            <span className="badge green-badge">
              +{winRateChange.toFixed(1)}%
            </span>
          </div>
        </section>

        {/* DAILY PNL */}
        <section className="card-soft pnl-card">
          <div className="section-header">
            <span className="section-title">Daily PnL (Last 7 days)</span>
          </div>
          <div className="pnl-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnl}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <BarTooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid rgba(148,163,184,0.5)",
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value.toFixed(2)}%`, "PnL"]}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  minPointSize={3}
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const positive = payload.value >= 0;
                    return (
                      <rect
                        x={x}
                        y={positive ? y : y + height}
                        width={width}
                        height={Math.max(4, Math.abs(height))}
                        fill={positive ? "#22c55e" : "#ef4444"}
                        rx={6}
                        ry={6}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* AUTO TRADING */}
        <section className="card-soft auto-card">
          <div className="auto-card-left">
            <div className="auto-icon">⚡</div>
            <div>
              <p className="auto-title">Auto Trading</p>
              <p className="auto-sub">Your balance follows bot trades</p>
            </div>
          </div>

          <button
            type="button"
            className={autoTradingOn ? "switch on" : "switch"}
            onClick={handleToggleAutoTrading}
          >
            <div className="switch-thumb" />
          </button>
        </section>

        {/* RECENT TRADES */}
        <section className="card-soft recent-card">
          <div className="recent-header">
            <span className="section-title">Recent Trades</span>
            <button className="recent-viewall" type="button">
              View All →
            </button>
          </div>

          <div className="recent-list">
            {recentTrades.map((t) => (
              <div key={t.pair + t.time} className="recent-item">
                <div className="recent-left">
                  <div className={`recent-icon ${t.positive ? "green" : "red"}`}>
                    {t.positive ? "↗" : "↘"}
                  </div>
                  <div>
                    <p className="recent-pair">{t.pair}</p>
                    <p className="recent-side">
                      {t.side} • {t.time}
                    </p>
                  </div>
                </div>
                <p className={`recent-pnl ${t.positive ? "green" : "red"}`}>
                  {t.pnl}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
