"use client";

import { useState } from "react";
import Link from "next/link";
import { MediaImage } from "@/components/motifs/MediaImage";

type Ev = {
  id: string;
  slug: string;
  title: string;
  date: string;
  location: string | null;
  category: string | null;
  status: string;
};

const RESULTS: [string, string, string, string, string, string][] = [
  ["g", "1", "Ananya Kulkarni", "Pune Rifle Club", "Women · Senior", "632.4"],
  ["s", "2", "Vikram Rana", "Delhi Shooting Academy", "Men · Senior", "631.8"],
  ["b", "3", "Meera Iyer", "Kochi Marksmen", "Women · Junior", "629.5"],
  ["", "4", "Arjun Saxena", "Jaipur Rifle Assoc.", "Men · Junior", "628.1"],
  ["", "5", "Rhea Nair", "Bengaluru Bulls-Eye", "Women · Senior", "627.6"],
  ["", "6", "Karan Mehta", "Mumbai City Club", "Men · Senior", "626.9"],
];

export function EventsTabs({ events }: { events: Ev[] }) {
  const [tab, setTab] = useState<"up" | "res" | "gal">("up");
  return (
    <>
      <div className="tabs">
        <button className={`tab${tab === "up" ? " active" : ""}`} onClick={() => setTab("up")}>
          Upcoming
        </button>
        <button className={`tab${tab === "res" ? " active" : ""}`} onClick={() => setTab("res")}>
          Results &amp; Rankings
        </button>
        <button className={`tab${tab === "gal" ? " active" : ""}`} onClick={() => setTab("gal")}>
          Gallery
        </button>
      </div>

      <div className={`tabpanel${tab === "up" ? " active" : ""}`}>
        {events.map((e) => {
          const live = e.status === "LIVE";
          return (
            <div className="evcard" key={e.id}>
              <MediaImage className="h-[150px] w-full max-[760px]:h-[170px]" alt={e.title} placeholder={e.title} />
              <div className="evcard__body">
                <div style={{ marginBottom: 8 }}>
                  {live ? (
                    <span className="chip chip--live">
                      <span className="dot" />
                      Registration Open
                    </span>
                  ) : (
                    <span className="chip">{e.category}</span>
                  )}
                </div>
                <div className="evcard__title">{e.title}</div>
                <div className="evcard__meta">
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {e.date}, 2026
                  </span>
                  {e.location && (
                    <span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {e.location}
                    </span>
                  )}
                  {e.category && (
                    <span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M6 9V2h12v7a6 6 0 01-12 0z" />
                        <path d="M9 21h6M12 15v6" />
                      </svg>
                      {e.category}
                    </span>
                  )}
                </div>
              </div>
              <div className="evcard__cta">
                <Link href={`/events/${e.slug}`} className="btn btn--primary btn--sm" style={{ justifyContent: "center" }}>
                  {live ? "Enter" : "Details"}
                </Link>
                <Link href={`/events/${e.slug}`} className="btn btn--ghost btn--sm" style={{ justifyContent: "center" }}>
                  Schedule
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`tabpanel${tab === "res" ? " active" : ""}`}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, textTransform: "uppercase", margin: "0 0 18px" }}>
          VSK Spring Open 2026 · 10m Air Rifle Final
        </h3>
        <table className="rtable">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Rank</th>
              <th>Shooter</th>
              <th>Club / City</th>
              <th>Category</th>
              <th style={{ textAlign: "right" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {RESULTS.map(([medal, rank, name, club, cat, score]) => (
              <tr key={rank}>
                <td>
                  <span className={`rank${medal ? " " + medal : ""}`}>{rank}</span>
                </td>
                <td>{name}</td>
                <td>{club}</td>
                <td>{cat}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mono-tag" style={{ marginTop: 14 }}>
          Full results and historical rankings available to registered members.
        </p>
      </div>

      <div className={`tabpanel${tab === "gal" ? " active" : ""}`}>
        <div className="gallery">
          {Array.from({ length: 8 }).map((_, i) => {
            const tall = i === 0 || i === 5;
            return (
              <MediaImage
                key={i}
                className={`w-full rounded-[14px] ${tall ? "row-span-2 h-full" : "h-[200px]"}`}
                alt={`Event photo ${i + 1}`}
                placeholder={`Event photo ${i + 1}`}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
