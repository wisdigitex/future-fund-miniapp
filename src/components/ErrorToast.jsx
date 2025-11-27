// src/components/ErrorToast.jsx
export default function ErrorToast({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="toast toast-error">
      <span>{message}</span>
      {onClose && (
        <button className="toast-close" onClick={onClose} type="button">
          ✕
        </button>
      )}
    </div>
  );
}
