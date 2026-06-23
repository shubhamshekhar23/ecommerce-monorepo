"use client";

import { useOrderEvents } from "../../hooks/useOrderEvents";
import styles from "./OrderTimeline.module.scss";

interface OrderTimelineProps {
  orderId: string;
}

export function OrderTimeline({ orderId }: OrderTimelineProps) {
  const { data: events, isLoading } = useOrderEvents(orderId);

  if (isLoading) return <p className={styles.loading}>Loading activity...</p>;
  if (!events?.length) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Order Activity</h2>
      <ol className={styles.list}>
        {events.map((event) => (
          <li key={event.id} className={styles.item}>
            <div className={styles.dot} />
            <div className={styles.body}>
              <p className={styles.type}>
                {event.eventType.replace(/_/g, " ")}
              </p>
              <p className={styles.description}>{event.description}</p>
              <time className={styles.time}>
                {new Date(event.createdAt).toLocaleString()}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
