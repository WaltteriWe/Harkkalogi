import Link from "next/link";

export default function ReportButton() {
  return (
    <Link href="/reporting" className="btn-primary">
      Write final report
    </Link>
  );
}
