export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";
export const TransactionType = { EXPENSE: "EXPENSE", INCOME: "INCOME", TRANSFER: "TRANSFER" } as const;

export type SplitMethod = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
export const SplitMethod = { EQUAL: "EQUAL", EXACT: "EXACT", PERCENTAGE: "PERCENTAGE", SHARES: "SHARES" } as const;

export interface SplitAmount {
    userId: string;
    amountPaise: number;
}

export interface Transaction {
    id: string;
    amountPaise: number;
    category: string;
    dateMillis: number;
    paidBy: string;
    createdBy: string;
    personal: boolean;
    splitMethod: SplitMethod | string;
    splits: SplitAmount[];
    notes: string;
    type: TransactionType | string;
    paymentMethod: string;
    isDeleted: boolean;
}

export interface User {
    id: string;
    name: string;
    email: string;
    householdId: string | null;
    connectedAt: number | null;
    createdAt: number;
}

export interface Household {
    id: string;
    code: string;
    members: string[];
    createdAt: number;
}

export interface Settlement {
    id: string;
    amountPaise: number;
    paidBy: string;
    receivedBy: string;
    dateMillis: number;
    paymentMethod: string;
    notes: string;
    createdBy: string;
    createdAt: number;
}
