import React from "react";

type AuthBlobsProps = {
  className?: string;
  fromColor?: string;
  toColor?: string;
};

export default function AuthBlobs({
  className = "",
  fromColor = "from-white",
  toColor = "to-emerald-50",
}: AuthBlobsProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${fromColor} ${toColor}`} />

      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-teal-200/50 blur-3xl" />
      <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-emerald-100/50 blur-[90px]" />

      <div className="hidden md:block absolute left-10 bottom-10 h-24 w-24 rounded-full bg-teal-100/50 blur-2xl" />
      <div className="hidden md:block absolute right-24 top-16 h-28 w-28 rounded-full bg-emerald-100/50 blur-2xl" />
    </div>
  );
}
