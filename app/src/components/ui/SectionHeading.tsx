interface SectionHeadingProps {
  title: string;
  children?: React.ReactNode;
}

export function SectionHeading({ title, children }: SectionHeadingProps) {
  return (
    <h3 className="text-[15px] font-semibold text-text-primary mb-3 flex items-center gap-2">
      {title}
      {children}
    </h3>
  );
}
