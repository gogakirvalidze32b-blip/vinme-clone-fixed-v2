import { redirect } from "next/navigation";

export default function Home() {
  redirect("/feed"); // თუ შენთან მთავარი გვერდი სხვაა, შეცვალე მაგალითად "/login"
}
