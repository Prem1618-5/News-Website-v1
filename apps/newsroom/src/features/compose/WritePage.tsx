import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { createArticle, refreshLists } from "@/api/desk";
import { errorText } from "@/api/http";
import { useSession } from "@/state/session";

/** "Write" makes the draft straight away, so autosave works from the first word. */
export default function WritePage() {
  const navigate = useNavigate();
  const { me } = useSession();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createArticle({ primary_language: me.writingLanguage })
      .then((a) => {
        refreshLists();
        navigate(`/stories/${a.id}?new=1`, { replace: true });
      })
      .catch((e) => setError(errorText(e)));
  }, [me.writingLanguage, navigate]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center text-[14px] text-muted">
      {error ? (
        <>
          <p role="alert" className="text-bad">{error}</p>
          <Link to="/" className="font-medium text-brand hover:underline">Back to the desk</Link>
        </>
      ) : (
        <p role="status" className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Starting a new story</p>
      )}
    </main>
  );
}
