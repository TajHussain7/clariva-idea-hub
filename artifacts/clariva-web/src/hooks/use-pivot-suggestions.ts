import { useMutation } from "@tanstack/react-query";

export interface PivotSuggestion {
  title: string;
  desc: string;
  rationale: string;
}

export interface PivotSuggestionsResponse {
  pivots: PivotSuggestion[];
}

async function fetchPivotSuggestions(
  ideaId: number,
): Promise<PivotSuggestionsResponse> {
  const res = await fetch(`/api/ideas/${ideaId}/pivots`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ||
        `Request failed with status ${res.status}`,
    );
  }

  return res.json() as Promise<PivotSuggestionsResponse>;
}

export function usePivotSuggestions() {
  return useMutation<PivotSuggestionsResponse, Error, number>({
    mutationFn: fetchPivotSuggestions,
  });
}
