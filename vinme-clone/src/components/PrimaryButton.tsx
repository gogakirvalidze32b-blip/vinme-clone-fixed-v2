import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({ className = "", type, ...props }: Props) {
  return (
    <button
      {...props}
      type={type ?? "button"}  // 👈 ეს მნიშვნელოვანია!
      className={
        "w-full rounded-full bg-white text-black py-4 font-semibold " + className
      }
    />
  );
}
