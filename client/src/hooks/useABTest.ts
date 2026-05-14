import { useState, useEffect } from "react";

interface ABAssignment {
  variantId: string;
  value: string;
}

interface ABPageAssignments {
  [element: string]: ABAssignment;
}

// Module-level cache so multiple hooks on the same page don't re-fetch
const assignmentCache = new Map<string, Promise<ABPageAssignments>>();

function fetchAssignments(page: string): Promise<ABPageAssignments> {
  if (assignmentCache.has(page)) {
    return assignmentCache.get(page)!;
  }

  const promise = fetch(`/api/ab/assign?page=${encodeURIComponent(page)}`)
    .then((res) => {
      if (!res.ok) return {};
      return res.json();
    })
    .then((data) => {
      // API returns { assignments: { element: { variantId, value } } } or similar
      if (data && data.assignments) return data.assignments as ABPageAssignments;
      if (data && typeof data === "object" && !Array.isArray(data)) return data as ABPageAssignments;
      return {} as ABPageAssignments;
    })
    .catch(() => ({} as ABPageAssignments));

  assignmentCache.set(page, promise);
  return promise;
}

/**
 * React hook that returns the A/B test variant value for a given page and element.
 * If no test is running for that element, returns the defaultValue.
 *
 * Usage:
 *   const headline = useABTest("soulmate_landing", "headline", "Default headline text");
 */
export function useABTest(page: string, element: string, defaultValue: string): string {
  const [value, setValue] = useState<string>(defaultValue);

  useEffect(() => {
    let cancelled = false;

    fetchAssignments(page).then((assignments) => {
      if (cancelled) return;
      const assignment = assignments[element];
      if (assignment && assignment.value) {
        setValue(assignment.value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [page, element, defaultValue]);

  return value;
}

/**
 * Call this when the visitor performs the desired conversion action on a page.
 * Sends a POST to /api/ab/convert with the page identifier.
 */
export function trackABConversion(page: string): void {
  fetch("/api/ab/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page }),
  }).catch(() => {
    // Fire-and-forget, don't break the UI if tracking fails
  });
}
