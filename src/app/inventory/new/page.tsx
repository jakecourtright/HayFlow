import { redirect } from "next/navigation";

export default function NewInventoryRedirect() {
    redirect("/locations/new");
}
