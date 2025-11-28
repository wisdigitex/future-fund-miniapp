import { useState, useEffect } from "react";
import api from "../api/api";
import ErrorToast from "../components/ErrorToast";
import Loader from "../components/Loader";
import useTelegram from "../hooks/useTelegram";

export default function More() {
  const { isTelegram, tg } = useTelegram();

  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  /** ------------------------------
   * CHAT ID HANDLING (Preview Mode)
   * ------------------------------ */
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

  /** ------------------------------
   * LOAD REFERRAL INFO
   * ------------------------------ */
  useEffect(() => {
    async function loadReferral() {
      try {
        setLoading(true);
        const res = await api.get("/api/user/referral", { params: devParams });

        const data = res.data ?? res;
        if (!data.ok) throw new Error(data.error);

        setReferral(data);
      } catch (err) {
        setError(err.message || "Failed to load referral info");
      } finally {
        setLoading(false);
      }
    }

    loadReferral();
  }, []);

  /** COPY REFERRAL CODE */
  const handleCopy = () => {
    if (!referral) return;
    navigator.clipboard.writeText(referral.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  /** SHARE INVITE LINK */
  const handleShare = () => {
    if (!referral) return;

    const text = `Join Future Fund using my referral code: ${referral.code}\n${referral.inviteLink}`;

    if (isTelegram && tg?.shareURL) {
      tg.shareURL(referral.inviteLink, text);
    } else {
      navigator.clipboard.writeText(referral.inviteLink);
      setCopied(true);
    }
  };

  /** SUPPORT BUTTON — FIXED */
  const handleSupport = () => {
    const url = "https://t.me/FutureFundSupport";

    if (isTelegram && tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  /** ------------------------------
   * RENDER STATES
   * ------------------------------ */
  if (loading) {
    return (
      <div className="screen-container">
        <div className="mobile-wrapper">
          <Loader />
        </div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="screen-container">
        <div className="mobile-wrapper">
          {error && <ErrorToast message={error} />}
        </div>
      </div>
    );
  }

  const { code, stats } = referral;

  return (
    <div className="screen-container">
      <div className="mobile-wrapper">
        {error && <ErrorToast message={error} />}

        {/* TITLE */}
        <h2 className="screen-title">More</h2>

        {/* REFERRAL CARD – MATCHES BUYER UI */}
        <div className="card referral-card ui-referral">
          <div className="referral-header ui-referral-header">
            <div className="icon purple-bg">🎁</div>
            <div>
              <h3 className="referral-title">Referral Program</h3>
              <p className="referral-subtitle">
                Earn {referral.rates.l1Percent}% L1 • {referral.rates.l2Percent}% L2 on deposits
              </p>
            </div>
          </div>

          {/* CODE BOX */}
          <div className="referral-code-box ui-ref-code-box">
            <span className="ref-code">{code}</span>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? "✓" : "📋"}
            </button>
          </div>

          {/* STATS GRID */}
          <div className="referral-stats-row ui-stats-grid">
            <div className="stats-box">
              <span className="stats-value">{stats.l1Count}</span>
              <span className="stats-label">L1 Users</span>
            </div>

            <div className="stats-box">
              <span className="stats-value">{stats.l2Count}</span>
              <span className="stats-label">L2 Users</span>
            </div>

            <div className="stats-box">
              <span className="stats-value purple">${stats.totalRewards.toFixed(2)}</span>
              <span className="stats-label">Earned</span>
            </div>
          </div>

          {/* SHARE BUTTON */}
          <button className="share-btn ui-share-btn" onClick={handleShare}>
            🔗 Share Invite Link
          </button>
        </div>

        {/* HELP CARD */}
        <div className="card help-card ui-help-card">
          <div className="help-left ui-help-left">
            <div className="icon blue-bg">❓</div>
            <div>
              <h3 className="help-title">Need Help?</h3>
              <p className="help-subtitle">Contact our support team</p>
            </div>
          </div>

          <button className="help-btn ui-help-button" onClick={handleSupport}>
            Contact
          </button>
        </div>

        {/* VIP PROGRAM CARD */}
        <div className="card vip-card ui-vip-card">
          <div className="icon gold-bg">✨</div>

          <div className="ui-vip-text">
            <h3 className="vip-title">VIP Program</h3>
            <p className="vip-subtitle">Exclusive benefits • Lower fees</p>
          </div>

          <div className="coming-soon ui-coming-soon">Coming Soon</div>
        </div>
      </div>
    </div>
  );
}
