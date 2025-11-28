import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";   // ✅ ADDED
import NavBar from "../components/NavBar";
import api from "../api/api";
import Loader from "../components/Loader";
import ErrorToast from "../components/ErrorToast";
import useTelegram from "../hooks/useTelegram";

export default function Deposit() {
  const navigate = useNavigate();                 // ✅ ADDED

  const [step, setStep] = useState(1);

  const [amount, setAmount] = useState(100);
  const [network, setNetwork] = useState(null);

  const [currencies, setCurrencies] = useState([]);
  const [deposit, setDeposit] = useState(null);

  const [countdown, setCountdown] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isTelegram } = useTelegram();

  // Dev fallback
  const urlChatId = new URLSearchParams(window.location.search).get("chatId");

  const devParams = urlChatId
    ? { chatId: urlChatId }
    : (!isTelegram && import.meta.env.VITE_DEV_CHAT_ID
        ? { chatId: import.meta.env.VITE_DEV_CHAT_ID }
        : undefined);

  /** -----------------------------
   * LOAD SUPPORTED CURRENCIES
   * ----------------------------- */
  useEffect(() => {
    async function loadCurrencies() {
      try {
        setLoading(true);
        const res = await api.get("/api/config/currencies");
        const data = res.data ?? res;

        if (!data.ok) throw new Error(data.error);

        setCurrencies(data.deposit);
        if (data.deposit.length > 0) {
          setNetwork(data.deposit[0].code);
        }
      } catch (err) {
        setError(err.message || "Failed to load currencies");
      } finally {
        setLoading(false);
      }
    }
    loadCurrencies();
  }, []);

  /** -----------------------------
   * CREATE DEPOSIT REQUEST
   * ----------------------------- */
  async function handleContinue() {
    try {
      if (amount < 20) {
        setError("Minimum deposit is $20");
        return;
      }

      setLoading(true);
      setError(null);

      const res = await api.post(
        "/api/deposit/create",
        { amountUsd: Number(amount), currency: network },
        { params: devParams }
      );

      const data = res.data ?? res;
      if (!data.ok) throw new Error(data.error);

      setDeposit(data);
      setStep(2);

      // Setup countdown
      startCountdown(data.expiresAt);
    } catch (err) {
      setError(err.message || "Failed to create deposit");
    } finally {
      setLoading(false);
    }
  }

  /** -----------------------------
   * COUNTDOWN TIMER
   * ----------------------------- */
  function startCountdown(expiresAt) {
    const end = new Date(expiresAt).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown("Expired");
        return;
      }

      const m = Math.floor(diff / 1000 / 60);
      const s = Math.floor((diff / 1000) % 60);

      setCountdown(`${m}m ${s}s`);
    };

    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }

  /** -----------------------------
   * AUTO REFRESH DEPOSIT STATUS
   * ----------------------------- */
  useEffect(() => {
    if (!deposit) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/deposit/status/${deposit.paymentId}`, {
          params: devParams,
        });
        const data = res.data ?? res;

        if (!data.ok) return;

        if (data.status === "finished") {
          alert("Deposit confirmed!");
          setStep(1);
          setDeposit(null);
        }

        if (["expired", "refunded", "failed"].includes(data.status)) {
          setError(`Deposit ${data.status}. Please create a new one.`);
          setStep(1);
          setDeposit(null);
        }
      } catch (err) {
        console.log("Status check failed:", err.message);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [deposit]);

  /** -----------------------------
   * COPY HELPER
   * ----------------------------- */
  function copy(text) {
    navigator.clipboard.writeText(text);
  }

  /** -----------------------------
   * RENDER
   * ----------------------------- */
  if (loading && step === 1 && currencies.length === 0) {
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

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h2 className="screen-title">Deposit Funds</h2>

            {/* Amount input */}
            <p className="input-label">Amount (USD)</p>
            <div className="input-box">
              <span className="dollar">$</span>
              <input
                type="number"
                className="amount-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <p className="min-text">Minimum: $20</p>

            {/* Quick buttons */}
            <div className="quick-select">
              {[50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  className={`quick-btn ${amount == v ? "active" : ""}`}
                  onClick={() => setAmount(v)}
                >
                  ${v}
                </button>
              ))}
            </div>

            {/* Networks */}
            <p className="input-label" style={{ marginTop: "20px" }}>
              Select Network
            </p>

            <div className="network-list">
              {currencies.map((item) => (
                <div
                  key={item.code}
                  className={`network-card ${network === item.code ? "selected" : ""}`}
                  onClick={() => setNetwork(item.code)}
                >
                  <div className="network-left">
                    <div className="network-icon"></div>
                    <div>
                      <p className="net-label">{item.label.split(" ")[0]}</p>
                      <p className="net-sub">{item.label}</p>
                    </div>
                  </div>

                  {item.code.includes("trc") && (
                    <span className="popular-tag">Popular</span>
                  )}
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="button-row">
              
              {/* ✅ FIXED — Cancel now returns to Dashboard */}
              <button
                className="btn-cancel"
                onClick={() => navigate("/")}
              >
                Cancel
              </button>

              <button className="btn-continue" onClick={handleContinue}>
                Continue
              </button>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && deposit && (
          <>
            <h2 className="screen-title">Complete Payment</h2>
            <p className="sub-info">Send exactly the amount below</p>

            {/* Amount */}
            <div className="amount-box">
              <div>
                <p className="label">Send Exactly</p>
                <p className="exact">{deposit.payAmount}</p>
              </div>
              <p className="token">{deposit.payCurrency.toUpperCase()}</p>
            </div>

            <button className="copy-btn" onClick={() => copy(deposit.payAmount)}>
              Copy Amount
            </button>

            {/* QR */}
            <div className="qr-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${deposit.address}`}
                alt="QR Code"
              />
            </div>

            {/* Address */}
            <div className="address-box">
              <p className="label">Payment Address</p>
              <p className="address">{deposit.address}</p>
            </div>

            <button className="copy-btn" onClick={() => copy(deposit.address)}>
              Copy Address
            </button>

            {/* Countdown */}
            <div className="expire-box">
              {countdown ? (
                <p>⏳ Expires in <strong>{countdown}</strong></p>
              ) : (
                <p>Loading expiration...</p>
              )}
            </div>

            <button
              className="btn-close"
              onClick={() => {
                setStep(1);
                setDeposit(null);
              }}
            >
              Close
            </button>
          </>
        )}

        <NavBar active="more" />
      </div>
    </div>
  );
}
