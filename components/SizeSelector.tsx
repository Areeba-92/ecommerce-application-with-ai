"use client";

interface SizeSelectorProps {
  sizes: string[];
  selected: string | null;
  onSelect: (size: string) => void;
}

export default function SizeSelector({ sizes, selected, onSelect }: SizeSelectorProps) {
  return (
    <div className="size-selector">
      <span className="size-selector__label">Size</span>
      <div className="size-selector__options">
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            className={`size-option ${selected === size ? "is-selected" : ""}`}
            onClick={() => onSelect(size)}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}
