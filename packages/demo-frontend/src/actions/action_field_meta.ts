import type { TDomainActionId } from "@nice-error/nice-action";
import type { act_domain_demo } from "demo-shared";

export type TFieldType = "string" | "number";

export interface IFieldMeta {
  key: string;
  label: string;
  type: TFieldType;
  defaultValue: string | number;
}

export interface IActionMeta {
  id: TDomainActionId<typeof act_domain_demo>;
  label: string;
  description: string;
  fields: IFieldMeta[];
}

export const ACTION_META: IActionMeta[] = [
  {
    id: "greet",
    label: "Greet",
    description: "Returns a greeting message for the given name.",
    fields: [{ key: "name", label: "Name", type: "string", defaultValue: "World" }],
  },
  {
    id: "add_numbers",
    label: "Add Numbers",
    description: "Adds two numbers and returns the sum.",
    fields: [
      { key: "a", label: "A", type: "number", defaultValue: 10 },
      { key: "b", label: "B", type: "number", defaultValue: 32 },
    ],
  },
  {
    id: "get_user",
    label: "Get User",
    description:
      'Looks up a user by ID. Try "user1", "user2", "user3" or any other value to trigger an error.',
    fields: [{ key: "userId", label: "User ID", type: "string", defaultValue: "user1" }],
  },
  {
    id: "divide",
    label: "Divide",
    description:
      "Divides dividend by divisor. Set divisor to 0 to trigger a division_by_zero error.",
    fields: [
      { key: "dividend", label: "Dividend", type: "number", defaultValue: 10 },
      { key: "divisor", label: "Divisor", type: "number", defaultValue: 3 },
    ],
  },
  {
    id: "add_message",
    label: "Add Message",
    description: "Adds a message to the message list.",
    fields: [{ key: "message", label: "Message", type: "string", defaultValue: "Hi friends!" }],
  },
];
