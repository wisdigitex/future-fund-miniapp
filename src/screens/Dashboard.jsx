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

export default function Dashboard() {
  const navigate = useNavigate();
  const { isTelegram } = useTelegram();

  const [portfolio, setPortfolio] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [dailyPnlSeries, setDailyPnlSeries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [timeframe, setTimeframe] = useState("7d");
  const [autoTradingOn, setAutoTradingOn] = useState(false);

  /** -----------------------------
   * CHAT ID HANDLING (Preview Mode)
   * ----------------------------- */
  const urlChatId = new URLSearchParams(window.location.search).get("chatId");
  const storedPreviewId = sessionStorage.getItem("preview_chatId");

  if (urlChatId) sessionStorage.setItem("preview_chatId", urlChatId);

  const devParams = urlChatId
    ? { chatId: urlChatId }
    : storedPreviewId
    ? { chatId: storedPreviewId }
    : (!isTelegram && import.meta.env.VITE_DEV_CHAT_ID
        ? { chatId: import.meta.env.VITE_DEV_CHAT_ID }
        : undefined);

  /** -----------------------------
   * LOAD USER PORTFOLIO
   * ----------------------------- */
  useEffect(() => {
    let active = true;

    async function loadPortfolio() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get("/api/user/portfolio", { params: devParams });
        const data = res.data ?? res;

        if (!active) return;
        if (!data.ok) throw new Error(data.error);

        setPortfolio(data);
        setAutoTradingOn(data.tradingStatus === "active");
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPortfolio();
    return () => (active = false);
  }, [isTelegram]);

  /** -----------------------------
   * LOAD REAL PORTFOLIO HISTORY
   * FROM NEW ENDPOINT
   * ----------------------------- */
  useEffect(() => {
    async function loadPortfolioHistory() {
      try {
        const res = await api.get("/api/user/portfolio-history", {
          params: { timeframe, ...devParams },
        });

        const data = res.data ?? res;
        if (!data.ok) throw new Error(data.error);

        const series = data.dataPoints.map((p) => ({
          label: new Date(p.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          value: Number(p.balance),
        }));

        setPortfolioHistory(series.length ? series : [{ label: "No Data", value: 0 }]);
      } catch (err) {
        console.log("Portfolio history error:", err.message);
      }
    }

    loadPortfolioHistory();
  }, [timeframe]);

  /** -----------------------------
   * LOAD RECENT TRADES + DAILY PNL
   * ----------------------------- */
  useEffect(() => {
    async function loadTrades() {
      try {
        const res = await api.get("/api/stats", {
          params: { timeframe: "7d", ...devParams },
        });

        const data = res.data ?? res;
        if (!data.ok) throw new Error(data.error);

        const trades = data.trades || [];

        // RECENT TRADES (3d)
        const threeDaysAgo = Date.now() - 3 * 86400000;
        const recent = trades
          .filter((t) => new Date(t.date).getTime() >= threeDaysAgo)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 3);

        setRecentTrades(recent);

        // DAILY PNL (last 7 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const last7 = [];
        const dayMap = new Map();

        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const label = d.toLocaleDateString(undefined, { weekday: "short" });

          last7.push({ key, label });
          dayMap.set(key, 0);
        }

        trades.forEach((t) => {
          const d = new Date(t.date);
          d.setHours(0, 0, 0, 0);

          const key = d.toISOString().slice(0, 10);
          if (!dayMap.has(key)) return;

          const impact = Number(t.portfolioImpactPct ?? 0);
          dayMap.set(key, dayMap.get(key) + impact);
        });

        setDailyPnlSeries(
          last7.map((d) => ({
            day: d.label,
            value: Number((dayMap.get(d.key) || 0).toFixed(2)),
          }))
        );
      } catch (err) {
        console.log("Trades error:", err.message);
      }
    }

    loadTrades();
  }, []);

  /** -----------------------------
   * NAVIGATION WITH PERSISTENT chatId
   * ----------------------------- */
  const chatId = urlChatId || storedPreviewId;

  function go(path) {
    if (chatId) navigate(`${path}?chatId=${chatId}`);
    else navigate(path);
  }

  const handleDeposit = () => go("/deposit");
  const handleWithdraw = () => go("/withdraw");

  const handleRefresh = async () => {
    if (!portfolio) return;

    try {
      setLoading(true);

      const res = await api.get("/api/user/portfolio", { params: devParams });
      const data = res.data ?? res;

      if (!data.ok) throw new Error(data.error);
      setPortfolio(data);
      setAutoTradingOn(data.tradingStatus === "active");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoTrading = async () => {
    const next = !autoTradingOn;
    setAutoTradingOn(next);

    try {
      const res = await api.post("/api/user/trading/toggle", { active: next });
      if (!res.data.ok) throw new Error(res.data.error);
    } catch (err) {
      setAutoTradingOn((prev) => !prev);
      setError(err.message);
    }
  };

  /** -----------------------------
   * RENDER
   * ----------------------------- */
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
        <div className="phone-shell">{error && <ErrorToast message={error} />}</div>
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

  const winRate = 71.4;
  const winRateChange = 2.3;

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

        {/* REAL PORTFOLIO GROWTH CHART */}
        <section className="card-glass portfolio-card">
          <div className="section-header">
            <span className="section-title">Portfolio Growth</span>
            <div className="timeframe-tabs">
              {["7d", "1m", "3m", "all"].map((tf) => (
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
              <AreaChart data={portfolioHistory}>
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
            {portfolioHistory.map((d) => (
              <span key={d.label}>{d.label}</span>
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
              <BarChart data={dailyPnlSeries}>
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
            <button
              className="recent-viewall"
              type="button"
              onClick={() => go("/stats")}
            >
              View All →
            </button>
          </div>

          <div className="recent-list">
            {recentTrades.length === 0 && (
              <p className="empty-text">No recent trades in the last 3 days.</p>
            )}

            {recentTrades.map((t) => {
              const positive = (t.shownReturnPct ?? 0) >= 0;

              return (
                <div key={t.id} className="recent-item">
                  <div className="recent-left">
                    <div className={`recent-icon ${positive ? "green" : "red"}`}>
                      {positive ? "↗" : "↘"}
                    </div>
                    <div>
                      <p className="recent-pair">{t.pair}</p>
                      <p className="recent-side">
                        {t.direction?.toUpperCase()} x{t.leverage} •{" "}
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <p className={`recent-pnl ${positive ? "green" : "red"}`}>
                    {positive ? "+" : ""}
                    {(t.shownReturnPct ?? 0).toFixed(2)}%
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
