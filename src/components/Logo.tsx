import logo from "@/assets/breatherise-logo.png";
import { Link } from "react-router-dom";

export function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <Link to="/" className="inline-flex items-center" aria-label="BreatheRise home">
      <img src={logo} alt="BreatheRise" className={className} />
    </Link>
  );
}
