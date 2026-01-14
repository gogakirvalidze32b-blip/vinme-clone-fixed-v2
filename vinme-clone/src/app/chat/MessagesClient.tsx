"use client";


import dynamic from "next/dynamic";

const MessagesData = dynamic(() => import("./MessagesData"), { ssr: false });

export default function MessagesClient() {
  return <MessagesData />;
}