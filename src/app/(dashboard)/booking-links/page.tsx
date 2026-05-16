import { format } from "date-fns";
import { Link as LinkIcon, CheckCircle2, XCircle, MousePointerClick } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function maskPhone(phone: string | null) {
  if (!phone) return "-";
  if (phone.length <= 6) return phone;
  return phone.slice(0, 4) + "***" + phone.slice(-3);
}

export default async function BookingLinksPage() {
  const { data: links } = await supabase
    .from("booking_links")
    .select("id, sent_at, phone, guest_name, property_name, booking_option, check_in, check_out, clicked_at, converted")
    .order("sent_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Booking Links
        </h1>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sent</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Option</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-center">Clicked</TableHead>
            <TableHead className="text-center">Converted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links?.map((link) => (
            <TableRow key={link.id}>
              <TableCell>
                {link.sent_at
                  ? format(new Date(link.sent_at), "MMM d, yyyy HH:mm")
                  : "-"}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {maskPhone(link.phone)}
              </TableCell>
              <TableCell>{link.guest_name || "-"}</TableCell>
              <TableCell>{link.property_name || "-"}</TableCell>
              <TableCell>{link.booking_option || "-"}</TableCell>
              <TableCell className="text-xs">
                {link.check_in && link.check_out
                  ? `${format(new Date(link.check_in), "MMM d")} - ${format(
                      new Date(link.check_out),
                      "MMM d"
                    )}`
                  : "-"}
              </TableCell>
              <TableCell className="text-center">
                {link.clicked_at ? (
                  <MousePointerClick className="inline size-4 text-blue-600" />
                ) : (
                  <XCircle className="inline size-4 text-muted-foreground/40" />
                )}
              </TableCell>
              <TableCell className="text-center">
                {link.converted ? (
                  <CheckCircle2 className="inline size-4 text-green-600" />
                ) : (
                  <XCircle className="inline size-4 text-muted-foreground/40" />
                )}
              </TableCell>
            </TableRow>
          ))}
          {(!links || links.length === 0) && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2 py-8">
                  <LinkIcon className="size-8 text-muted-foreground/50" />
                  <p>No booking links sent yet</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
