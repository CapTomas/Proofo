"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  Plus,
  Mail,
  FileCheck,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { DashboardLayout } from "@/components/dashboard-layout";

interface Person {
  id: string;
  name: string;
  email?: string;
  dealCount: number;
  lastDealDate?: string;
  role: "recipient" | "creator" | "both";
}

// Get people from deals
function extractPeopleFromDeals(deals: { recipientName?: string; recipientEmail?: string; creatorName: string; createdAt: string }[]): Person[] {
  const peopleMap = new Map<string, Person>();

  deals.forEach((deal) => {
    if (deal.recipientName) {
      const key = deal.recipientEmail || deal.recipientName.toLowerCase();
      const existing = peopleMap.get(key);
      if (existing) {
        existing.dealCount++;
        if (deal.createdAt > (existing.lastDealDate || "")) {
          existing.lastDealDate = deal.createdAt;
        }
      } else {
        peopleMap.set(key, {
          id: key,
          name: deal.recipientName,
          email: deal.recipientEmail,
          dealCount: 1,
          lastDealDate: deal.createdAt,
          role: "recipient",
        });
      }
    }
  });

  return Array.from(peopleMap.values()).sort((a, b) => b.dealCount - a.dealCount);
}

// Demo people data
const demoPeople: Person[] = [
  { id: "1", name: "John Doe", email: "john@example.com", dealCount: 3, lastDealDate: "2024-01-20", role: "recipient" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", dealCount: 2, lastDealDate: "2024-01-18", role: "recipient" },
  { id: "3", name: "Mike Chen", dealCount: 1, lastDealDate: "2024-01-15", role: "recipient" },
  { id: "4", name: "Sarah Johnson", email: "sarah@work.com", dealCount: 1, lastDealDate: "2024-01-10", role: "creator" },
];

export default function PeoplePage() {
  const { deals } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [customPeople, setCustomPeople] = useState<Person[]>([]);

  // Extract people from deals or use demo data
  const peopleFromDeals = useMemo(() => {
    if (deals.length > 0) {
      return extractPeopleFromDeals(deals);
    }
    return demoPeople;
  }, [deals]);

  // Combine people from deals and custom added people
  const allPeople = useMemo(() => {
    const combined = [...peopleFromDeals];
    customPeople.forEach((person) => {
      if (!combined.find((p) => p.email === person.email || p.name === person.name)) {
        combined.push(person);
      }
    });
    return combined;
  }, [peopleFromDeals, customPeople]);

  const filteredPeople = useMemo(() => {
    return allPeople.filter((person) => {
      const matchesSearch =
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.email?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allPeople, searchQuery]);

  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;

    const newPerson: Person = {
      id: `custom-${Date.now()}`,
      name: newPersonName.trim(),
      email: newPersonEmail.trim() || undefined,
      dealCount: 0,
      role: "recipient",
    };

    setCustomPeople([...customPeople, newPerson]);
    setNewPersonName("");
    setNewPersonEmail("");
    setShowAddDialog(false);
  };

  const handleRemovePerson = (id: string) => {
    setCustomPeople(customPeople.filter((p) => p.id !== id));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout title="People">
      <div className="space-y-6">
        {/* Info Banner */}
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Your Contacts</span>
                <span className="text-muted-foreground"> — people you&apos;ve made deals with. Add contacts to quickly select them when creating new deals.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Card className="flex-1 sm:flex-none">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">{allPeople.length}</p>
                <p className="text-xs text-muted-foreground">Total Contacts</p>
              </CardContent>
            </Card>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Add a contact to quickly select them when creating new deals.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPersonEmail}
                    onChange={(e) => setNewPersonEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPerson} disabled={!newPersonName.trim()}>
                  Add Contact
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* People List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-medium">Contacts</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-full sm:w-64 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredPeople.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No contacts found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery
                        ? "Try adjusting your search"
                        : "Add contacts or create deals to build your contact list"}
                    </p>
                    <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Your First Contact
                    </Button>
                  </motion.div>
                ) : (
                  filteredPeople.map((person, index) => {
                    const isCustom = person.id.startsWith("custom-");
                    return (
                      <motion.div
                        key={person.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                        <div className="group relative p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                              {getInitials(person.name)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm truncate">{person.name}</h3>
                                {person.role === "creator" && (
                                  <Badge variant="outline" className="text-xs">Creator</Badge>
                                )}
                                {person.role === "both" && (
                                  <Badge variant="outline" className="text-xs">Both</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {person.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3" />
                                    {person.email}
                                  </span>
                                )}
                                {person.dealCount > 0 && (
                                  <span className="flex items-center gap-1">
                                    <FileCheck className="h-3 w-3" />
                                    {person.dealCount} deal{person.dealCount !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link href={`/deal/new`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                  New Deal
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </Link>
                              <div className="relative group/menu">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                                <div className="hidden group-hover/menu:block absolute right-0 top-full mt-1 w-32 p-1 bg-popover border rounded-lg shadow-lg z-10">
                                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                                    <Edit className="h-3 w-3" />
                                    Edit
                                  </Button>
                                  {isCustom && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive"
                                      onClick={() => handleRemovePerson(person.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
