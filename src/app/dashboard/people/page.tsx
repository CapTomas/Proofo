"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Search,
  Plus,
  Users,
  User,
  Mail,
  MoreHorizontal,
  Edit3,
  Trash2,
  FileText,
  Calendar,
  UserPlus,
  X,
} from "lucide-react";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";

interface Contact {
  id: string;
  name: string;
  email?: string;
  dealsCount: number;
  lastDealDate?: string;
  role: "recipient" | "creator" | "both";
}

// Demo contacts
const demoContacts: Contact[] = [
  {
    id: "contact-1",
    name: "John Doe",
    email: "john@example.com",
    dealsCount: 3,
    lastDealDate: "2024-01-15T10:30:00Z",
    role: "recipient",
  },
  {
    id: "contact-2",
    name: "Jane Smith",
    email: "jane@example.com",
    dealsCount: 2,
    lastDealDate: "2024-01-20T14:00:00Z",
    role: "recipient",
  },
  {
    id: "contact-3",
    name: "Alice Johnson",
    email: "alice@example.com",
    dealsCount: 1,
    lastDealDate: "2024-01-25T09:00:00Z",
    role: "creator",
  },
];

export default function PeoplePage() {
  const { deals: storeDeals, user } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "" });
  const [customContacts, setCustomContacts] = useState<Contact[]>([]);

  // Extract contacts from deals
  const dealContacts = useMemo(() => {
    const contactMap = new Map<string, Contact>();

    storeDeals.forEach((deal) => {
      // Add recipients
      if (deal.recipientName && deal.recipientName !== user?.name) {
        const key = deal.recipientEmail || deal.recipientName;
        const existing = contactMap.get(key);
        if (existing) {
          existing.dealsCount++;
          if (!existing.lastDealDate || new Date(deal.createdAt) > new Date(existing.lastDealDate)) {
            existing.lastDealDate = deal.createdAt;
          }
        } else {
          contactMap.set(key, {
            id: `contact-${key}`,
            name: deal.recipientName,
            email: deal.recipientEmail,
            dealsCount: 1,
            lastDealDate: deal.createdAt,
            role: "recipient",
          });
        }
      }

      // Add creators (for received deals)
      if (deal.creatorName && deal.creatorId !== user?.id) {
        const key = deal.creatorName;
        const existing = contactMap.get(key);
        if (existing) {
          existing.dealsCount++;
          if (existing.role === "recipient") existing.role = "both";
          if (!existing.lastDealDate || new Date(deal.createdAt) > new Date(existing.lastDealDate)) {
            existing.lastDealDate = deal.createdAt;
          }
        } else {
          contactMap.set(key, {
            id: `contact-${key}`,
            name: deal.creatorName,
            dealsCount: 1,
            lastDealDate: deal.createdAt,
            role: "creator",
          });
        }
      }
    });

    return Array.from(contactMap.values());
  }, [storeDeals, user?.name, user?.id]);

  // Combine deal contacts with custom contacts and demo
  const allContacts = useMemo(() => {
    const combined = [...customContacts, ...dealContacts];
    if (combined.length === 0) {
      return demoContacts;
    }
    return combined;
  }, [dealContacts, customContacts]);

  const filteredContacts = useMemo(() => {
    return allContacts.filter((contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allContacts, searchQuery]);

  const isUsingDemoData = allContacts === demoContacts;

  const handleAddContact = () => {
    if (!newContact.name.trim()) return;
    
    const contact: Contact = {
      id: `custom-${Date.now()}`,
      name: newContact.name.trim(),
      email: newContact.email.trim() || undefined,
      dealsCount: 0,
      role: "recipient",
    };
    
    setCustomContacts([...customContacts, contact]);
    setNewContact({ name: "", email: "" });
    setShowAddModal(false);
  };

  const handleRemoveContact = (id: string) => {
    setCustomContacts(customContacts.filter(c => c.id !== id));
  };

  return (
    <DashboardLayout title="People">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">People</h2>
            <p className="text-sm text-muted-foreground">
              Contacts you&apos;ve made deals with
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Contact
          </Button>
        </div>

        {/* Demo Banner */}
        {isUsingDemoData && (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium">Demo Mode</span>
                  <span className="text-muted-foreground"> — people from your deals will automatically appear here.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{allContacts.length}</p>
              <p className="text-xs text-muted-foreground">Total Contacts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">
                {allContacts.filter(c => c.role === "recipient" || c.role === "both").length}
              </p>
              <p className="text-xs text-muted-foreground">Recipients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">
                {allContacts.reduce((sum, c) => sum + c.dealsCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Deals</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contacts List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">All Contacts</CardTitle>
            <CardDescription>Click on a contact to create a new deal with them</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredContacts.length === 0 ? (
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
                        : "Add contacts or create deals to see them here"}
                    </p>
                    <Button size="sm" onClick={() => setShowAddModal(true)}>
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Add Contact
                    </Button>
                  </motion.div>
                ) : (
                  filteredContacts.map((contact, index) => (
                    <motion.div
                      key={contact.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <div className="group relative p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                            {contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-medium text-sm truncate">{contact.name}</h3>
                              <Badge variant="outline" className="text-xs h-5">
                                {contact.role === "both" ? "Recipient & Creator" : contact.role === "creator" ? "Creator" : "Recipient"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {contact.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {contact.email}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {contact.dealsCount} deal{contact.dealsCount !== 1 ? "s" : ""}
                              </span>
                              {contact.lastDealDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {timeAgo(contact.lastDealDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                const params = new URLSearchParams();
                                params.set("recipient", contact.name);
                                if (contact.email) params.set("email", contact.email);
                                window.location.href = `/deal/new?${params.toString()}`;
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              New Deal
                            </Button>
                            <div className="relative group/menu">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                              <div className="hidden group-hover/menu:block absolute right-0 top-full mt-1 w-32 p-1 bg-popover border rounded-lg shadow-lg z-10">
                                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                                  <Edit3 className="h-3 w-3" />
                                  Edit
                                </Button>
                                {contact.id.startsWith("custom-") && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveContact(contact.id)}
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
                  ))
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Add Contact Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Add Contact</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowAddModal(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      Add a contact to quickly create deals with them later
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowAddModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleAddContact}
                        disabled={!newContact.name.trim()}
                      >
                        Add Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
