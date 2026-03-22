"use client";

interface ResubmissionChecklistProps {
  items: string[];
}

export default function ResubmissionChecklist({
  items,
}: ResubmissionChecklistProps) {
  if (items.length === 0) return null;

  return (
    <ul className="list-none space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-sm text-amber-800"
        >
          <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-amber-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
