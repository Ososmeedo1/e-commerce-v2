"use client";

import Container from "../../../components/layout/Container";
import ErrorState from "../../../components/ui/ErrorState";

export default function Error({ reset }) {
  return (
    <Container className="py-6">
      <ErrorState onRetry={() => reset()} />
    </Container>
  );
}
