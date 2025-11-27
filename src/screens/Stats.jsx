import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import api from "../api/api";
import Loader from "../components/Loader";
import ErrorToast from "../components/ErrorToast";
import useTelegram from "../hooks/useTelegram";

export default function Stats() {
  const ranges = ["24h", "3d", "7d", "1m", "3m", "all"];
  const [activeRange, setActiveRange] = useState("7d");

  const { isTelegram } = useTelegram();

  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10); // show more trades incrementally

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const devParams =
    !isTelegram && import.meta.env.VITE_DEV_CHAT_ID
      ? { chatId: import.meta.env.VITE_DEV_CHAT_ID }
      : undefined;

  // Load stats from API
  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/api/stats", {
        params: {
          timeframe: activeRange,
          ...devParams,
        },
      });

      const data = res.data ?? res;

      if (!data.ok) throw new Error(data.error);

      setStats(data.summary);
      setTrades(data.trades || []);
      setVisibleCount(10);
    } catch (err) {
      setError(err.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [activeRange]);

  if (loading || !stats) {
    return (
      <div className="screen-container">
        <div className="mobile-wrapper">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div className="mobile-wrapper">
        {error && <ErrorToast message={error} />}

        {/* HEADER */}
        <h2 className="screen-title">Bot Performance</h2>

        {/* TIME RANGE TABS */}
        <div className="range-tabs">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={`range-btn ${activeRange === r ? "active" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* RETURN CARD */}
        <div className="stats-card return-card">
          <div>
            <p className="label">Total Return ({activeRange})</p>
            <p className="return-value">
              {stats.sumShownReturnPct > 0 ? "+" : ""}
              {stats.sumShownReturnPct.toFixed(2)}%
            </p>
            <p className="sub-label">
              Portfolio impact:{" "}
              {stats.sumPortfolioImpactPct > 0 ? "+" : ""}
              {stats.sumPortfolioImpactPct.toFixed(2)}%
            </p>
          </div>

          {/* CIRCLE CHART */}
          <div className="circle-chart">
            <svg width="70" height="70">
              <circle
                cx="35"
                cy="35"
                r="30"
                stroke="#1f2937"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="35"
                cy="35"
                r="30"
                stroke="#22c55e"
                strokeWidth="6"
                fill="none"
                strokeDasharray="188"
                strokeDashoffset={188 - (stats.winRatePct / 100) * 188}
                strokeLinecap="round"
                transform="rotate(-90 35 35)"
              />
            </svg>
            <span className="circle-text">{stats.winRatePct.toFixed(1)}%</span>
          </div>
        </div>

        {/* GRID STATS */}
        <div className="stats-grid">
          <div className="stats-card small">
            <div className="icon blue"></div>
            <p className="value">{stats.totalTrades}</p>
            <p className="label">Total Trades</p>
          </div>

          <div className="stats-card small">
            <div className="icon green"></div>
            <p className="value">{stats.winRatePct.toFixed(1)}%</p>
            <p className="label">Win Rate</p>
          </div>

          <div className="stats-card small">
            <div className="icon green"></div>
            <p className="value">
              +{stats.bestShownPct.toFixed(2)}%
            </p>
            <p className="label">Best Trade</p>
          </div>

          <div className="stats-card small">
            <div className="icon red"></div>
            <p className="value">
              {stats.worstShownPct.toFixed(2)}%
            </p>
            <p className="label">Worst Trade</p>
          </div>
        </div>

        {/* ALL TRADES */}
        <h3 className="section-title">All Trades</h3>

        <div className="all-trades-card">
          {trades.slice(0, visibleCount).map((t, i) => (
            <div className="trade-row" key={i}>
              <div className="trade-icon-wrapper">
                <div
                  className={`trade-icon ${
                    t.shownReturnPct >= 0 ? "up" : "down"
                  }`}
                ></div>
              </div>

              <div className="trade-info">
                <p className="pair">{t.pair}</p>
                <p className="tiny-text">
                  {new Date(t.date).toLocaleDateString()} •{" "}
                  {t.direction.toUpperCase()} {t.leverage}
                </p>
              </div>

              <p
                className={`change ${
                  t.shownReturnPct >= 0 ? "green-text" : "red-text"
                }`}
              >
                {t.shownReturnPct > 0 ? "+" : ""}
                {t.shownReturnPct.toFixed(2)}%
              </p>
            </div>
          ))}

          {visibleCount < trades.length && (
            <button
              className="load-more"
              onClick={() => setVisibleCount((v) => v + 10)}
            >
              Load More
            </button>
          )}
        </div>

        <NavBar active="stats" />
      </div>
    </div>
  );
}
