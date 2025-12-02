import { DealTemplate } from "@/types";

export const dealTemplates: DealTemplate[] = [
  {
    id: "lend-item",
    name: "Lend Item",
    description: "Record when you lend something to someone",
    icon: "📦",
    fields: [
      {
        id: "item",
        label: "Item Being Lent",
        type: "text",
        placeholder: "e.g., Camera, Book, Tools",
        required: true,
      },
      {
        id: "value",
        label: "Estimated Value",
        type: "currency",
        placeholder: "0.00",
        required: false,
      },
      {
        id: "returnDate",
        label: "Expected Return Date",
        type: "date",
        required: false,
      },
      {
        id: "condition",
        label: "Condition Notes",
        type: "textarea",
        placeholder: "Describe the current condition of the item",
        required: false,
      },
    ],
  },
  {
    id: "simple-agreement",
    name: "Simple Agreement",
    description: "A basic agreement between two parties",
    icon: "🤝",
    fields: [
      {
        id: "terms",
        label: "Agreement Terms",
        type: "textarea",
        placeholder: "Describe what both parties are agreeing to",
        required: true,
      },
      {
        id: "deadline",
        label: "Deadline (if any)",
        type: "date",
        required: false,
      },
    ],
  },
  {
    id: "payment-promise",
    name: "Payment Promise",
    description: "Record a promise to pay",
    icon: "💰",
    fields: [
      {
        id: "amount",
        label: "Amount Owed",
        type: "currency",
        placeholder: "0.00",
        required: true,
      },
      {
        id: "reason",
        label: "Reason for Payment",
        type: "text",
        placeholder: "e.g., Lunch, Tickets, Shared expense",
        required: true,
      },
      {
        id: "dueDate",
        label: "Due Date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    id: "service-exchange",
    name: "Service Exchange",
    description: "Trade services with someone",
    icon: "🔄",
    fields: [
      {
        id: "myService",
        label: "Service I Will Provide",
        type: "textarea",
        placeholder: "Describe what you will do",
        required: true,
      },
      {
        id: "theirService",
        label: "Service They Will Provide",
        type: "textarea",
        placeholder: "Describe what they will do",
        required: true,
      },
      {
        id: "completionDate",
        label: "Completion Date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    id: "custom",
    name: "Custom Deal",
    description: "Create a custom agreement with your own terms",
    icon: "✏️",
    fields: [
      {
        id: "details",
        label: "Deal Details",
        type: "textarea",
        placeholder: "Describe the full details of your agreement",
        required: true,
      },
    ],
  },
];
