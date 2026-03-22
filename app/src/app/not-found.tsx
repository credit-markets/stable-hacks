"use client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@nextui-org/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-4 items-center justify-center py-10 md:py-20">
        <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl">404</h1>
        <p className="text-lg text-default-600">Page not found</p>
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
    </AppLayout>
  );
}
