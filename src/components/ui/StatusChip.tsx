type TicketStatus = "pending" | "approved" | "rejected" | "invoiced";
type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
type Status = TicketStatus | InvoiceStatus;

const LABELS: Record<Status, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    invoiced: "Invoiced",
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
};

export default function StatusChip({
    status,
    size = "default",
}: {
    status: Status | string;
    size?: "default" | "sm";
}) {
    const key = String(status).toLowerCase() as Status;
    const label = LABELS[key] ?? String(status);
    const sizeClass = size === "sm" ? " chip-sm" : "";
    return <span className={`chip chip-status-${key}${sizeClass}`}>{label}</span>;
}
