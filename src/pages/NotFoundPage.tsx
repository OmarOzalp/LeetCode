import { Link } from "react-router";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState icon={<Compass className="size-8" />} title="Page not found" action={<Link to="/"><Button>Back to Blind 75</Button></Link>}>
        That page doesn't exist.
      </EmptyState>
    </div>
  );
}
