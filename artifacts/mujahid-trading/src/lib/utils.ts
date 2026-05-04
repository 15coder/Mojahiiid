import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatOld(amount: number): string {
  return new Intl.NumberFormat("ar-SY").format(Math.round(amount)) + " ل.س.ق";
}

export function formatNew(amount: number): string {
  return new Intl.NumberFormat("ar-SY").format(Math.round(amount)) + " ل.س.ج";
}

export function formatUsd(amount: number): string {
  return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

export function arabicDate(date: Date): string {
  return date.toLocaleDateString("ar-SY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

