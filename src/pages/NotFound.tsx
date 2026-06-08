import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="text-8xl font-bold text-gradient-brand">404</div>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you're looking for took a deeper breath and drifted away.
      </p>
      <Button asChild className="mt-8 bg-gradient-brand text-primary-foreground">
        <Link to="/">Take me home</Link>
      </Button>
    </div>
  );
}
