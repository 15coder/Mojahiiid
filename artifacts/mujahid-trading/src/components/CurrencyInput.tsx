import { useApp } from "@/context/AppContext";

interface CurrencyInputProps {
  labelOld?: string;
  labelNew?: string;
  labelUsd?: string;
  valueOld: number;
  valueNew: number;
  valueUsd: number;
  onChangeOld: (v: number) => void;
  onChangeNew: (v: number) => void;
  onChangeUsd: (v: number) => void;
  disabled?: boolean;
}

export default function CurrencyInput({
  labelOld = "السعر بالليرة القديمة (ل.س.ق)",
  labelNew = "السعر بالليرة الجديدة (ل.س.ج)",
  labelUsd = "السعر بالدولار ($)",
  valueOld,
  valueNew,
  valueUsd,
  onChangeOld,
  onChangeNew,
  onChangeUsd,
  disabled = false,
}: CurrencyInputProps) {
  const { convertFromOld, convertFromNew, convertFromUsd } = useApp();

  const handleOldChange = (val: string) => {
    const n = parseFloat(val) || 0;
    onChangeOld(n);
    const conv = convertFromOld(n);
    onChangeNew(conv.new);
    onChangeUsd(conv.usd);
  };

  const handleNewChange = (val: string) => {
    const n = parseFloat(val) || 0;
    onChangeNew(n);
    const conv = convertFromNew(n);
    onChangeOld(conv.old);
    onChangeUsd(conv.usd);
  };

  const handleUsdChange = (val: string) => {
    const n = parseFloat(val) || 0;
    onChangeUsd(n);
    const conv = convertFromUsd(n);
    onChangeOld(conv.old);
    onChangeNew(conv.new);
  };

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white text-right disabled:bg-muted disabled:text-muted-foreground";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">{labelOld}</label>
        <input
          type="number"
          min={0}
          value={valueOld || ""}
          onChange={(e) => handleOldChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">{labelNew}</label>
        <input
          type="number"
          min={0}
          value={valueNew || ""}
          onChange={(e) => handleNewChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">{labelUsd}</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={valueUsd || ""}
          onChange={(e) => handleUsdChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
          className={inputClass}
        />
      </div>
    </div>
  );
}
