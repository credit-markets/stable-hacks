"use client";

import { styles } from "@/lib/styleClasses";
import KybQueueTable from "./KybQueueTable";

export default function KybQueuePage() {
  return (
    <div className="space-y-6">
      <h1 className={styles.headingLg}>KYB Queue</h1>
      <KybQueueTable />
    </div>
  );
}
