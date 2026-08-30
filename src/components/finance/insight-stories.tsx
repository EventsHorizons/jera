"use client";

import { markStoryReadAction } from "@/app/actions/gamification";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Story = {
  id: string;
  title: string;
  body: string;
  kind: string;
};

export function InsightStories({ stories }: { stories: Story[] }) {
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (stories.length === 0) return null;

  const story = stories[Math.min(index, stories.length - 1)]!;

  return (
    <section className="fc-insight-panel">
      <div className="flex gap-1 px-4 pt-3">
        {stories.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full ${
              i <= index ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
      <div className="space-y-3 px-5 py-6">
        <p className="text-[11px] uppercase tracking-wider text-text-muted">
          Insight · {story.kind}
        </p>
        <h2 className="text-xl font-semibold leading-snug tracking-tight">
          {story.title}
        </h2>
        <p className="text-sm leading-relaxed text-text-secondary">{story.body}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {index < stories.length - 1 ? (
            <Button
              type="button"
              variant="secondary"
              className="bg-surface text-primary hover:bg-primary-soft"
              onClick={() => setIndex((v) => v + 1)}
            >
              Siguiente
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            className="border border-border/50 bg-transparent text-text hover:bg-surface-muted"
            onClick={() => {
              startTransition(async () => {
                const fd = new FormData();
                fd.set("id", story.id);
                await markStoryReadAction({}, fd);
                if (index < stories.length - 1) setIndex((v) => v + 1);
                else router.refresh();
              });
            }}
          >
            Entendido
          </Button>
        </div>
      </div>
    </section>
  );
}
