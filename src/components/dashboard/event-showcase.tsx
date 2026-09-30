"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  ChartColumn,
  CodeXml,
  Download,
  X,
} from "lucide-react";
import type { FeaturedEvent } from "@/types";

function downloadStandings(event: FeaturedEvent) {
  const rows = [
    ["Rank", "Team", "Members", "Solved", "Penalty (min)"],
    ...event.standings.map((s) => [
      s.rank,
      s.team,
      s.members,
      `${s.solved}/${event.problemCount}`,
      s.penalty,
    ]),
  ];
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.id}-standings.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function StandingRow({
  standing,
  total,
}: {
  standing: FeaturedEvent["standings"][number];
  total: number;
}) {
  return (
    <li className="standing-row">
      <span className="standing-rank" data-rank={standing.rank}>
        {standing.rank}
      </span>
      <span className="standing-team">
        <strong>{standing.team}</strong>
        <span>({standing.members})</span>
      </span>
      <span className="standing-score">
        {standing.solved}/{total} AC [{standing.penalty}m]
      </span>
    </li>
  );
}

export function EventShowcase({ event }: { event: FeaturedEvent }) {
  const [active, setActive] = useState(0);
  const photo = event.gallery[active];

  return (
    <article className="event-showcase" aria-labelledby="showcase-title">
      <div className="showcase-media-column">
        <figure className="showcase-stage" data-scene={photo.id}>
          {photo.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.image} alt={photo.caption} />
          ) : (
            <div
              className="showcase-scene"
              role="img"
              aria-label={photo.caption}
            >
              <div className="scene-certificate">
                <span>KNUTH</span>
                <strong>{event.title}</strong>
                <small>Contest certificate</small>
              </div>
            </div>
          )}

        </figure>

        <div className="showcase-strip">
          <div
            className="showcase-thumbs"
            role="tablist"
            aria-label="Event photos"
          >
            {event.gallery.map((item, index) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={index === active}
                aria-label={item.caption}
                className="showcase-thumb"
                data-scene={item.id}
                onClick={() => setActive(index)}
              >
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" />
                )}
              </button>
            ))}
            {event.extraPhotos > 0 && (
              <span className="showcase-thumb showcase-more">
                +{event.extraPhotos}
              </span>
            )}
          </div>
          <a
            href={event.platform.url}
            target="_blank"
            rel="noreferrer"
            className="chip chip-link"
          >
            <CodeXml size={14} className="chip-icon" />
            {event.platform.name}
          </a>
        </div>
      </div>

      <div className="showcase-details">
        <span className="showcase-series">{event.series}</span>
        <h2 id="showcase-title">{event.title}</h2>
        <p className="showcase-summary">
          {event.summary.lead} <strong>{event.title}</strong>{" "}
          {event.summary.body} <em>{event.summary.highlight}</em>{" "}
          {event.summary.tail}
        </p>

        <dl className="showcase-stats">
          {event.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>
                <strong>{stat.value}</strong>
                <span>{stat.detail}</span>
              </dd>
            </div>
          ))}
        </dl>

        {/* <h3 className="showcase-label">Top Standings</h3>
        <ol className="standing-list">
          {event.standings.slice(0, 2).map((standing) => (
            <StandingRow
              key={standing.rank}
              standing={standing}
              total={event.problemCount}
            />
          ))}
        </ol> */}

        <div className="showcase-actions">
          <a
            href={event.problemsetUrl}
            target="_blank"
            rel="noreferrer"
            className="button showcase-primary"
          >
            <BookOpen size={17} />
            View Problemset
          </a>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="button showcase-secondary">
                <ChartColumn size={17} />
                Final Standings
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-content standings-dialog">
                <Dialog.Close
                  className="icon-button dialog-close"
                  aria-label="Close standings"
                >
                  <X size={20} />
                </Dialog.Close>
                <span className="eyebrow">FINAL STANDINGS</span>
                <Dialog.Title>{event.title}</Dialog.Title>
                <Dialog.Description>
                  Ranked by problems solved, then penalty minutes.
                </Dialog.Description>
                <ol className="standing-list">
                  {event.standings.map((standing) => (
                    <StandingRow
                      key={standing.rank}
                      standing={standing}
                      total={event.problemCount}
                    />
                  ))}
                </ol>
                <p className="sample-note">
                  Sample results for the design preview.
                </p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <button
            className="button showcase-icon-button"
            aria-label="Download standings as CSV"
            onClick={() => downloadStandings(event)}
          >
            <Download size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
