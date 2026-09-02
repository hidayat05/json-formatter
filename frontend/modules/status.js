export function showStatus(message, isError = false) {
  if (typeof document === "undefined") return;

  const statusMessage = document.querySelector("#statusMessage");
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.className = `status-message ${isError ? "error" : "success"}`;
  setTimeout(() => {
    statusMessage.className = "status-message hidden";
  }, 3000);
}
