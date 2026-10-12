import Container from "../components/layout/Container";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-6">
      <EmptyState
        title="Page not found"
        titleAs="h1"
        description="The page you are looking for does not exist."
        action={<Button href="/">Back home</Button>}
      />
    </Container>
  );
}
