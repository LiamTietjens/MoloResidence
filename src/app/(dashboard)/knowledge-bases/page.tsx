import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    property?: string;
    kind?: string;
  }>;
}

const KIND_COLORS: Record<string, string> = {
  general: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  property: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  exception: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export default async function KnowledgeBasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { q, property, kind } = params;

  // Fetch properties for filter dropdown
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");

  // Build query for knowledge bases
  let query = supabase
    .from("knowledge_bases")
    .select("*, properties(name), knowledge_base_rooms(room_number)")
    .order("updated_at", { ascending: false });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  if (property && property !== "all") {
    query = query.eq("property_id", property);
  }

  if (kind && kind !== "all") {
    query = query.eq("kind", kind);
  }

  const { data: knowledgeBases } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Bases</h1>
        <Button render={<Link href="/knowledge-bases/new" />}>
          <PlusIcon data-icon="inline-start" />
          New KB
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex flex-wrap items-center gap-3" action="/knowledge-bases" method="GET">
          <Input
            name="q"
            placeholder="Search by name..."
            defaultValue={q || ""}
            className="w-64"
          />
          <Select name="property" defaultValue={property || "all"}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="kind" defaultValue={kind || "all"}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Kinds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Kinds</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="property">Property</SelectItem>
              <SelectItem value="exception">Exception</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Rooms</TableHead>
            <TableHead>Content Length</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {knowledgeBases && knowledgeBases.length > 0 ? (
            knowledgeBases.map((kb) => {
              const rooms = kb.knowledge_base_rooms || [];
              const displayRooms = rooms.slice(0, 3);
              const extraCount = rooms.length - 3;

              return (
                <TableRow key={kb.id}>
                  <TableCell>
                    <Link
                      href={`/knowledge-bases/${kb.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {kb.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={KIND_COLORS[kb.kind] || ""}
                      variant="secondary"
                    >
                      {kb.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {kb.properties?.name || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {displayRooms.map((r: { room_number: string }) => (
                        <Badge key={r.room_number} variant="outline">
                          {r.room_number}
                        </Badge>
                      ))}
                      {extraCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          +{extraCount} more
                        </span>
                      )}
                      {rooms.length === 0 && (
                        <span className="text-muted-foreground">{"\u2014"}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {kb.content ? `${kb.content.length.toLocaleString()} chars` : "0 chars"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {kb.updated_at
                      ? formatDistanceToNow(new Date(kb.updated_at), { addSuffix: true })
                      : "\u2014"}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No knowledge bases found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
