import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Loader from "../components/Loader";
import ErrorToast from "../components/ErrorToast";
import useTelegram from "../hooks/useTelegram";

export default function Withdraw() {
  const navigate = useNavigate();
  const { isTelegram } = useTelegram();

  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("");
  const [address, setAddress] = useState("");

  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawFeePercent, setWithdrawFeePercent] = useState(10);
  const [networks, setNetworks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Dev mode fallback
  const devParams =
    !isTelegram && import.meta.env.VITE_DEV_CHAT_ID
      ? { chatId: import.meta.env.VITE_DEV_CHAT_ID }
      : undefined;

  /** ----------------------------------
   * LOAD PORTFOLIO + CURRENCY CONFIG
   * ---------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // Load portfolio (for available balance)
        const res1 = await api.get("/api/user/portfolio", { params: devParams });
        const p = res1.data ?? res1;
        if (!p.ok) throw new Error(p.error);
        setAvailableBalance(p.balance);

        // Load currencies
        const res2 = await api.get("/api/config/currencies");
        const cfg = res2.data ?? res2;
        if (!cfg.ok) throw new Error(cfg.error);

        setNetworks(cfg.withdraw);
        setWithdrawFeePercent(cfg.withdrawFeePercent);

        // auto-select first network
        if (cfg.withdraw.length > 0) {
          setNetwork(cfg.withdraw[0].code); // backend uses: usdttrc20, usdterc20, etc.
        }
      } catch (err) {
        setError(err.message || "Failed to load withdrawal settings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /** ----------------------------------
   * SUBMIT WITHDRAWAL
   * ---------------------------------- */
  async function handleSubmit(e) {
    e.preventDefault();

    if (!amount || amount < 1) return setError("Enter a valid amount");
    if (amount > availableBalance)
      return setError("Amount exceeds available balance");
    if (!address) return setError("Enter a wallet address");

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      const res = await api.post(
        "/api/withdraw/create",
        {
          amount: Number(amount),
          network,
          address,
        },
        { params: devParams }
      );

      const data = res.data ?? res;

      if (!data.ok) throw new Error(data.error);

      setSuccessMsg(`Withdrawal created! Status: ${data.status}`);
      setAmount("");
      setAddress("");
    } catch (err) {
      setError(err.message || "Failed to create withdrawal");
    } finally {
      setSubmitting(false);
    }
  }

  /** ----------------------------------
   * COMPUTE NET AMOUNT
   * ---------------------------------- */
  const receive =
    amount && withdrawFeePercent
      ? (amount * (1 - withdrawFeePercent / 100)).toFixed(2)
      : "0.00";

  /** ----------------------------------
   * RENDER
   * ---------------------------------- */
  if (loading) {
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
        {successMsg && <ErrorToast message={successMsg} type="success" />}

        {/* Top notch */}
        <div className="top-notch" />

        <h2 className="screen-title">Withdraw Funds</h2>

        <p className="withdraw-available">
          Available: <span>${availableBalance.toFixed(2)}</span>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Amount */}
          <label className="input-label">Amount (USD)</label>
          <div className="input-box">
            <input
              type="number"
              className="amount-input"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              min={0}
              max={availableBalance}
            />
          </div>

          <div className="withdraw-fee-row">
            <span>Fee: {withdrawFeePercent}%</span>
            <span className="receive-text">You receive: ~${receive}</span>
          </div>

          {/* Network */}
          <label className="input-label">Network</label>
          <div className="select-box">
            <select
              className="select-input"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              {networks.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                </option>
              ))}
            </select>
            <span className="select-arrow">⌵</span>
          </div>

          {/* Wallet Address */}
          <label className="input-label">Your Wallet Address</label>
          <div className="input-box">
            <input
              type="text"
              className="amount-input"
              placeholder="Enter your wallet address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="button-row withdraw-buttons">
            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
              Cancel
            </button>

            <button
              type="submit"
              className="btn-withdraw-primary"
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Request Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
