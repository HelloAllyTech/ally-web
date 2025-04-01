export const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60) % 60;
  const seconds = time % 60;
  const hours = Math.floor(time / 3600);
  return `
  ${hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}
  ${minutes.toString().padStart(2, "0")}:
  ${seconds.toString().padStart(2, "0")}
  `;
};
