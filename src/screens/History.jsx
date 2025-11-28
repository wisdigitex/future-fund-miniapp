import { useState, useEffect } from "react";
import api from "../api/api";
import ErrorToast from "../components/ErrorToast";
import Loader from "../components/Loader";
import useTelegram from "../hooks/useTelegram";

// API filter mapping
const filterMap = {
  All: "all",
  Trade: "trade",
  Deposit: "deposit",
  Withdraw: "withdrawal",
  Referral: "referral",
};

const filters = ["All", "Trade", "Deposit", "Withdraw", "Referral"];

export default function History() {
  const { isTelegram } = useTelegram();

  const [selected, setSelected] = useState("All");
  const [transactions, setTransactions] = useState([]);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const devParams =
    !isTelegram && import.meta.env.VITE_DEV_CHAT_ID
      ? { chatId: import.meta.env.VITE_DEV_CHAT_ID }
      : undefined;

  /** -----------------------------
   * LOAD HISTORY
   * ----------------------------- */
  async function loadHistory(reset = false) {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const res = await api.get("/api/user/history", {
        params: {
          type: filterMap[selected],
          limit: 20,
          offset: reset ? 0 : offset,
          ...devParams,
        },
      });

      const data = res.data ?? res;

      if (!data.ok) throw new Error(data.error);

      if (reset) {
        setTransactions(data.items);
      } else {
        setTransactions((prev) => [...prev, ...data.items]);
      }
    } catch (err) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Reload when filter changes
  useEffect(() => {
    loadHistory(true);
  }, [selected]);

  // Pagination
  const handleLoadMore = () => {
    setOffset((prev) => prev + 20);
    loadHistory(false);
  };

  /** -----------------------------
   * Helpers for UI text
   * ----------------------------- */

  function getSubText(t) {
    switch (t.type) {
      case "trade":
        return `${t.pair} • ${t.direction.toUpperCase()} x${t.leverage}`;

      case "referral":
        return `Level ${t.level} • ${t.fromUsername || "User"} • ${t.fromChatId}`;

      default:
        return t.title;
    }
  }

  /** -----------------------------
   * RENDER
   * ----------------------------- */
  return (
    <div className="screen">
      <div className="phone-shell">
        <div className="phone-handle" />

        {error && <ErrorToast message={error} />}

        <h2 className="history-title">Transaction History</h2>

        {/* Tabs */}
        <div className="history-tabs">
          {filters.map((f) => (
            <button
              key={f}
              className={selected === f ? "history-tab active" : "history-tab"}
              onClick={() => setSelected(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Underline */}
        <div className="tabs-underline">
          <div
            className="underline-active"
            style={{
              transform: `translateX(${filters.indexOf(selected) * 100}%)`,
            }}
          />
        </div>

        {/* First load → show loader */}
        {loading ? (
          <Loader />
        ) : (
          <div className="history-list">
            {transactions.map((t, idx) => {
              const positive = t.sign === "+";

              return (
                <div key={t.id || idx} className="history-item card-soft">
                  <div className="history-left">
                    <div className={`history-icon ${positive ? "green" : "red"}`}>
                      {positive ? "↗" : "↘"}
                    </div>

                    <div>
                      {/* Title (Trade / Deposit / Withdraw / Referral) */}
                      <p className="history-type">{t.type}</p>

                      {/* Dynamic details */}
                      <p className="history-sub">{getSubText(t)}</p>
                    </div>
                  </div>

                  <div className="history-right">
                    <p className={`history-amount ${positive ? "green" : "red"}`}>
                      {t.rawChange}
                    </p>
                    <p className="history-date">
                      {new Date(t.date).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {!loading && transactions.length >= 20 && (
          <button className="load-more-btn" onClick={handleLoadMore}>
            {loadingMore ? "Loading..." : "Load More Transactions"}
          </button>
        )}
      </div>
    </div>
  );
}
