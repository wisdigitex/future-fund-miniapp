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

  /** Persistent Chat ID */
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

  /** Load history */
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

  useEffect(() => {
    loadHistory(true);
  }, [selected]);

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

        {/* Underline */}
        <div className="tabs-underline">
          <div
            className="underline-active"
            style={{
              transform: `translateX(${filters.indexOf(selected) * 100}%)`,
            }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <Loader />
        ) : (
          <div className="history-list">
            {transactions.map((t, idx) => {
              const isTrade = t.type === "trade";
              const isReferral = t.type === "referral";
              const positive = t.sign === "+";

              /** TRADE FIELDS */
              const pair = t.pair || "TRADE";
              const direction = t.direction?.toUpperCase() || "";
              const leverage = t.leverage ? ` x${t.leverage}` : "";

              /** REFERRAL FIELDS */
              const level = t.level || ""; // L1 / L2
              const username = t.fromUsername || "Unknown user";
              const fromId = t.fromChatId ? `(${t.fromChatId})` : "";

              return (
                <div key={t.id || idx} className="history-item card-soft">
                  {/* LEFT SIDE */}
                  <div className="history-left">
                    <div className={`history-icon ${positive ? "green" : "red"}`}>
                      {positive ? "↗" : "↘"}
                    </div>

                    <div>
                      {/* MAIN TITLE */}
                      <p className="history-type">
                        {isTrade
                          ? pair
                          : isReferral
                          ? "Referral Reward"
                          : t.type}
                      </p>

                      {/* SUBTEXT */}
                      {isReferral ? (
                        <p className="history-sub">
                          {level ? `${level} • ` : ""}
                          {username} {fromId}
                        </p>
                      ) : (
                        <p className="history-sub">
                          {isTrade ? `${direction}${leverage}` : t.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* RIGHT SIDE */}
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
