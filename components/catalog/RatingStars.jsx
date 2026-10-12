function Star({ filled }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={filled ? "text-warning" : "text-border"}
      fill="currentColor"
    >
      <path d="M12 2.5 14.9 8.6 21.5 9.5 16.7 14.2 17.8 20.8 12 17.6 6.2 20.8 7.3 14.2 2.5 9.5 9.1 8.6Z" />
    </svg>
  );
}

export default function RatingStars({ rating = 0, count }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span
      role="img"
      aria-label={`Rating ${rating} out of 5`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= filled} />
      ))}
      {count !== undefined && count !== null && (
        <span className="ml-1 text-xs text-text-subdued">({count})</span>
      )}
    </span>
  );
}
