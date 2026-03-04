interface GuestStatusBadgeProps {
  seated: boolean;
}

export function GuestStatusBadge({ seated }: GuestStatusBadgeProps) {
  if (seated) {
    return (
      <span className="ml-auto text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
        Seated
      </span>
    );
  }
  return null;
}
