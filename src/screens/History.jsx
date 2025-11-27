import { useState, useEffect } from "react";
import api from "../api/api";
import ErrorToast from "../components/ErrorToast";
import Loader from "../components/Loader";
import useTelegram from "../hooks/useTelegram";

// API filters mapping
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

  // Fetch history
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

  // When filter changes: reset + reload
  useEffect(() => {
    loadHistory(true);
  }, [selected]);

  // Load more (pagination)
  const handleLoadMore = () => {
    setOffset((o) => o + 20);
    loadHistory(false);
  };

  return (
    <div className="screen">
      <div className="phone-shell">
        <div className="phone-handle" />

        {error && <ErrorToast message={error} />}

        {/* Title */}
        <h2 className="history-title">Transaction History</h2>

        {/* Filter Tabs */}
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

        {/* Sliding underline */}
        <div className="tabs-underline">
          <div
            className="underline-active"
            style={{
              transform: `translateX(${filters.indexOf(selected) * 100}%)`,
            }}
          />
        </div>

        {/* If first load → show loader */}
        {loading ? (
          <Loader />
        ) : (
          <div className="history-list">
            {transactions.map((t, idx) => {
              const isTrade = t.type === "trade";

              // Extract safe values
              const pair = t.pair || "Trade";
              const direction = t.direction ? t.direction.toUpperCase() : "";
              const leverage = t.leverage ? ` x${t.leverage}` : "";

              return (
                <div key={t.id || idx} className="history-item card-soft">
                  <div className="history-left">
                    <div
                      className={`history-icon ${t.sign === "+" ? "green" : "red"}`}
                    >
                      {t.sign === "+" ? "↗" : "↘"}
                    </div>

                    <div>
                      {/* TRADE TITLE */}
                      <p className="history-type">
                        {isTrade ? pair : t.type}
                      </p>

                      {/* TRADE DETAILS OR NORMAL SUBTEXT */}
                      <p className="history-sub">
                        {isTrade
                          ? `${direction}${leverage}`
                          : t.title}
                      </p>
                    </div>
                  </div>

                  <div className="history-right">
                    <p
                      className={`history-amount ${
                        t.sign === "+" ? "green" : "red"
                      }`}
                    >
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
