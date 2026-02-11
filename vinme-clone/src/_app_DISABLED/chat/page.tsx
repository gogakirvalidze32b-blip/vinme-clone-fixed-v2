"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import MessagesClient from "./MessagesClient";

export default function Page() {
  return <MessagesClient />;
}