"use client";

import { MinusIcon, PlusIcon } from "@/components/Icons";

interface QtyStepperProps {
  qty: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}

export default function QtyStepper({ qty, onChange, min = 1, max = 10 }: QtyStepperProps) {
  return (
    <div className="qty-stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, qty - 1))}
        aria-label="Decrease quantity"
      >
        <MinusIcon />
      </button>
      <span className="qty-stepper__value">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, qty + 1))}
        aria-label="Increase quantity"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
