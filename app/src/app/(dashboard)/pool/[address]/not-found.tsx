"use client";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@nextui-org/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h1 className="font-bold text-4xl">404</h1>
      <p className="text-lg text-default-600">Pool not found</p>
      <Button
        as={Link}
        href="/"
        color="secondary"
        variant="bordered"
        className="border-1"
        radius="full"
      >
        Go back to marketplace
      </Button>
    </div>
  );
}
