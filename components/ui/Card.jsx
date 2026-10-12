export default function Card({
  as: As = "div",
  padded = true,
  className = "",
  children,
  ...rest
}) {
  return (
    <As
      className={[
        "rounded-md border border-border bg-surface shadow-sm",
        padded ? "p-4 sm:p-6" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </As>
  );
}

export function CardHeader({ className = "", children, ...rest }) {
  return (
    <div className={["mb-3", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...rest }) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...rest }) {
  return (
    <div
      className={["mt-4 border-t border-border pt-3", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
