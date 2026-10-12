export default function Container({ className = "", children, ...rest }) {
  return (
    <div
      className={["mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
