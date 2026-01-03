import { Suspense } from "react";
import DeleteAccountClient from "./DeleteAccountClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DeleteAccountClient />
    </Suspense>
  );
}